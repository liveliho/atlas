/* Atlas — scroll choreography, dependency-free.
   How it works: every frame, each scene reads where its section sits in the
   viewport (getBoundingClientRect of an untransformed wrapper), turns that
   into a 0..1 progress, eases the displayed value toward it (time-based
   lerp ≈ GSAP "scrub: 0.5"), then writes transform/opacity only. Pinning
   is plain CSS position:sticky, so there are no pin spacers to refresh
   when the project grid grows.
   Tiers: wide (≥900×600 → pinned hero + stacked showcase) and narrow
   (lighter parallax, swipe carousel). prefers-reduced-motion → nothing
   moves; the page is fully usable with this file missing entirely. */
(function () {
  "use strict";

  var doc = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (v, a, b) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  var wideMQ = matchMedia("(min-width: 900px) and (min-height: 600px)");
  var vh = innerHeight;

  /* ================= always on (also with reduced motion) ================= */

  /* top bar state + reading progress */
  var topbar = $(".topbar"), progressBar = $(".scroll-progress span");
  function chrome() {
    var y = scrollY, max = doc.scrollHeight - innerHeight;
    if (topbar) topbar.classList.toggle("scrolled", y > 24);
    if (progressBar) progressBar.style.transform = "scaleX(" + (max > 0 ? clamp(y / max, 0, 1) : 0).toFixed(4) + ")";
  }
  addEventListener("scroll", chrome, { passive: true });
  chrome();

  /* showcase dots: index into the deck (stack mode: scroll position; carousel: scrollLeft) */
  var deck = $("#deck"), cards = $$(".deck-card"), copies = $$(".deck-copy");
  var dotsEl = $("#stage-dots"), fill = $("#stage-fill"), showcase = $("#showcase");
  var N = cards.length, activeDot = -1;
  if (dotsEl) {
    dotsEl.innerHTML = cards.map(function (c, i) {
      var name = (c.querySelector(".deck-name") || {}).textContent || "";
      return '<button type="button" class="stage-dot" data-i="' + i + '" aria-label="第 ' + (i + 1) + " 个：" + name + '"></button>';
    }).join("");
  }
  var dots = $$(".stage-dot");
  function setDot(i) {
    if (i === activeDot) return;
    activeDot = i;
    dots.forEach(function (d, j) { d.classList.toggle("active", j === i); d.setAttribute("aria-current", j === i ? "true" : "false"); });
  }
  setDot(0);
  function isStacked() { return doc.classList.contains("tier-wide"); }
  if (deck) {
    deck.addEventListener("scroll", function () {
      if (isStacked()) return;
      var max = deck.scrollWidth - deck.clientWidth;
      var p = max > 0 ? deck.scrollLeft / max : 0;
      if (fill) fill.style.transform = "scaleX(" + p.toFixed(4) + ")";
      setDot(Math.round(p * (N - 1)));
    }, { passive: true });
  }
  dots.forEach(function (d, i) {
    d.addEventListener("click", function () {
      if (isStacked()) {
        var top = showcase.getBoundingClientRect().top + scrollY;
        var range = showcase.offsetHeight - innerHeight;
        scrollTo({ top: top + range * ((i + 0.5) / N) * 0.92, behavior: reduceMQ.matches ? "auto" : "smooth" });
      } else if (cards[i]) {
        deck.scrollTo({ left: cards[i].offsetLeft - deck.offsetLeft - parseFloat(getComputedStyle(deck).scrollPaddingLeft || 0), behavior: reduceMQ.matches ? "auto" : "smooth" });
      }
    });
  });

  /* anchor stabiliser: the project grid can grow (auto-load) while a smooth
     anchor scroll glides past it, which would make the jump land short.
     After a nav click, re-land on the target until its position settles;
     any manual wheel/touch cancels. */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (!id || id.length < 2) return;
      var target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      if (history.pushState) history.pushState(null, "", id === "#top" ? location.pathname + location.search : id);
      if (id === "#top") { scrollTo({ top: 0, behavior: reduceMQ.matches ? "auto" : "smooth" }); return; }
      target.scrollIntoView({ behavior: reduceMQ.matches ? "auto" : "smooth" });
      var lastTop = null, stable = 0, tries = 0, cancelled = false;
      var cancel = function () { cancelled = true; };
      addEventListener("wheel", cancel, { passive: true, once: true });
      addEventListener("touchstart", cancel, { passive: true, once: true });
      var iv = setInterval(function () {
        if (cancelled || ++tries > 24) { clearInterval(iv); return; }
        var top = target.getBoundingClientRect().top;
        var pad = parseFloat(getComputedStyle(doc).scrollPaddingTop) || 0;
        if (lastTop !== null && Math.abs(top - lastTop) < 4) {
          if (++stable >= 3) clearInterval(iv);
        } else {
          stable = 0;
          if (tries > 3 && lastTop !== null && Math.abs(top - pad) > 8) target.scrollIntoView({ behavior: "instant", block: "start" });
        }
        lastTop = target.getBoundingClientRect().top;
      }, 300);
    });
  });

  if (reduceMQ.matches) return;

  /* ================= motion ================= */
  doc.classList.add("motion-ready");
  function applyTier() {
    var wide = wideMQ.matches;
    doc.classList.toggle("tier-wide", wide);
    if (!wide) {
      /* leaving stack mode: hand the cards back to the carousel untouched */
      cards.concat(copies).forEach(function (el) { el.style.transform = ""; el.style.opacity = ""; el.style.removeProperty("--shade"); });
      if (fill) fill.style.transform = "scaleX(0)";
      setDot(0);
    }
    kick();
  }
  if (wideMQ.addEventListener) wideMQ.addEventListener("change", applyTier);

  /* ---- eased values: displayed value chases the scroll-derived target ---- */
  function Val(v) { this.cur = v; this.tgt = v; }
  Val.prototype.step = function (k) {
    var d = this.tgt - this.cur;
    if (Math.abs(d) < 0.0004) { this.cur = this.tgt; return false; }
    this.cur += d * k; return true;
  };

  var heroScene = $("#hero-scene"), hero = $("#hero"), cue = $(".scroll-cue");
  var tilesWrap = $("#hero-tiles");
  var tiles = $$(".ftile").map(function (el) {
    var cs = el.style;
    return { el: el, x: parseFloat(cs.getPropertyValue("--x")), z: parseFloat(cs.getPropertyValue("--z")) || 1 };
  });
  var auras = $$(".aura");
  var mfWrap = $("#manifesto"), mfs = $$(".mf");
  var heads = $$("[data-parallax]").map(function (el) {
    return { el: el, speed: parseFloat(el.getAttribute("data-parallax")) || 0.08, v: new Val(0), o: new Val(1) };
  });

  var vHero = new Val(0), vPage = new Val(0), vMf = new Val(0), vDeck = new Val(0);
  var vMx = new Val(0), vMy = new Val(0);
  var all = [vHero, vPage, vMf, vDeck, vMx, vMy].concat(heads.map(function (h) { return h.v; }), heads.map(function (h) { return h.o; }));

  /* ---- read phase: layout reads only ---- */
  function measure() {
    vh = innerHeight;
    var wide = isStacked();
    var max = doc.scrollHeight - vh;
    vPage.tgt = max > 0 ? clamp(scrollY / max, 0, 1) : 0;

    if (heroScene) {
      var r = heroScene.getBoundingClientRect();
      vHero.tgt = wide ? clamp(-r.top / Math.max(1, r.height - vh), 0, 1) : clamp(-r.top / (vh * 0.9), 0, 1);
    }
    if (mfWrap) {
      var m = mfWrap.getBoundingClientRect();
      var start = vh * 0.88, end = vh * 0.42;          /* light up between these two lines */
      vMf.tgt = clamp((start - m.top - m.height * 0.15) / (start - end + m.height * 0.55), 0, 1);
    }
    if (showcase && wide) {
      var s = showcase.getBoundingClientRect();
      vDeck.tgt = clamp(-s.top / Math.max(1, s.height - vh), 0, 1);
    }
    heads.forEach(function (h) {
      var r = h.el.getBoundingClientRect();
      var top = r.top - (h.applied || 0);              /* untransformed position */
      var center = top + r.height / 2;
      var speed = wide ? h.speed : h.speed * 0.5;
      h.v.tgt = clamp((center - vh / 2) * speed, -90, 90);
      h.o.tgt = smooth(vh - top, 0, vh * 0.32);
    });
  }

  /* ---- write phase ---- */
  function render() {
    var wide = isStacked();

    /* background auras: slow, opposing drift across the whole page */
    var pg = vPage.cur;
    if (auras[0]) auras[0].style.transform = "translate3d(" + (pg * 6).toFixed(2) + "vw," + (pg * -38).toFixed(2) + "vh,0)";
    if (auras[1]) auras[1].style.transform = "translate3d(" + (pg * -8).toFixed(2) + "vw," + (pg * 30).toFixed(2) + "vh,0) scale(" + (1 + pg * 0.2).toFixed(3) + ")";
    if (auras[2]) auras[2].style.transform = "translate3d(" + (pg * -10).toFixed(2) + "vw," + (pg * -56).toFixed(2) + "vh,0)";

    /* hero: copy recedes (scale down + fade), tiles fly outward at their own depth */
    var p = vHero.cur;
    if (hero) {
      if (wide) {
        var hs = 1 - p * 0.1, hy = -p * 150, ho = 1 - smooth(p, 0.22, 0.88);
        hero.style.transform = "translate3d(0," + hy.toFixed(1) + "px,0) scale(" + hs.toFixed(4) + ")";
        hero.style.opacity = ho.toFixed(3);
        hero.style.visibility = ho < 0.02 ? "hidden" : "";
      } else {
        hero.style.transform = "translate3d(0," + (p * 90).toFixed(1) + "px,0)";
        hero.style.opacity = (1 - smooth(p, 0.25, 1)).toFixed(3);
        hero.style.visibility = "";
      }
    }
    if (cue) cue.style.opacity = (1 - smooth(p, 0, 0.15)).toFixed(3);
    if (wide && tiles.length) {
      var to = 1 - smooth(p, 0.45, 0.95);
      tiles.forEach(function (t) {
        var dir = t.x < 50 ? -1 : 1;
        var tx = dir * p * 170 * t.z, ty = -p * 340 * t.z, sc = 1 + p * 0.3 * t.z;
        t.el.style.transform = "translate3d(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px,0) scale(" + sc.toFixed(3) + ")";
        t.el.style.opacity = to.toFixed(3);
      });
      if (tilesWrap) { tilesWrap.style.setProperty("--mx", vMx.cur.toFixed(4)); tilesWrap.style.setProperty("--my", vMy.cur.toFixed(4)); }
    }

    /* manifesto: phrases light up in reading order */
    if (mfs.length) {
      var n = mfs.length, dim = parseFloat(getComputedStyle(doc).getPropertyValue("--mf-dim")) || 0.18;
      mfs.forEach(function (s, i) {
        var o = clamp(vMf.cur * (n + 0.6) - i, 0, 1);
        s.style.opacity = (dim + (1 - dim) * o).toFixed(3);
      });
    }

    /* showcase stack: card i slides up over card i-1; buried cards shrink and dim */
    if (wide && N) {
      /* each step: the next card travels during the first 70% of its slot, then rests */
      var pos = clamp(vDeck.cur * 1.08 - 0.03, 0, 1) * (N - 1);
      var enters = cards.map(function (c, i) { return i === 0 ? 1 : easeInOut(clamp((pos - (i - 1)) / 0.7, 0, 1)); });
      cards.forEach(function (c, i) {
        var enter = enters[i];
        var depth = 0;
        for (var j = i + 1; j < N; j++) depth += enters[j];
        var y = (1 - enter) * 115, lift = depth * 26, sc = 1 - depth * 0.055, rx = (1 - enter) * 10;
        c.style.transform = "translate3d(0,calc(" + y.toFixed(2) + "% - " + lift.toFixed(1) + "px),0) rotateX(" + rx.toFixed(2) + "deg) scale(" + sc.toFixed(4) + ")";
        c.style.setProperty("--shade", Math.min(depth * 0.22, 0.6).toFixed(3));
        c.style.opacity = (Math.min(smooth(enter, 0, 0.25), 1 - smooth(depth, 2.2, 3))).toFixed(3);
        c.style.zIndex = String(i + 1);
      });
      /* copy for card i is shown while card i is the top of the stack */
      copies.forEach(function (c, i) {
        var nextIn = i + 1 < N ? enters[i + 1] : 0;
        c.style.opacity = smooth(enters[i] * (1 - nextIn), 0.55, 0.95).toFixed(3);
        c.style.transform = "translate3d(0," + ((1 - enters[i]) * 40 - nextIn * 40).toFixed(1) + "px,0)";
      });
      if (fill) fill.style.transform = "scaleX(" + vDeck.cur.toFixed(4) + ")";
      setDot(Math.round(pos));
    }

    /* section heads: drift slightly against the scroll and fade in */
    heads.forEach(function (h) {
      h.applied = Math.round(h.v.cur * 10) / 10;
      h.el.style.transform = "translate3d(0," + h.applied + "px,0)";
      h.el.style.opacity = h.o.cur.toFixed(3);
    });
  }

  /* ---- frame loop: runs only while something is still easing ---- */
  var running = false, last = 0;
  function frame(t) {
    var dt = last ? Math.min(t - last, 64) : 16;
    last = t;
    measure();
    var k = 1 - Math.pow(0.0012, dt / 1000);           /* ≈0.1 per 60fps frame */
    var moving = false;
    for (var i = 0; i < all.length; i++) if (all[i].step(k)) moving = true;
    render();
    if (moving) requestAnimationFrame(frame);
    else { running = false; last = 0; }
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", kick);
  addEventListener("load", kick);

  /* pointer parallax on the hero tiles (fine pointers only) */
  if (matchMedia("(hover: hover) and (pointer: fine)").matches && heroScene) {
    heroScene.addEventListener("pointermove", function (e) {
      vMx.tgt = (e.clientX / innerWidth - 0.5) * 2;
      vMy.tgt = (e.clientY / innerHeight - 0.5) * 2;
      kick();
    });
    heroScene.addEventListener("pointerleave", function () { vMx.tgt = 0; vMy.tgt = 0; kick(); });
  }

  /* ---- reveals: one-shot, batched stagger, for cards that enter the viewport ---- */
  var revealIO = new IntersectionObserver(function (entries) {
    var batch = entries.filter(function (en) { return en.isIntersecting; });
    batch.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left; });
    batch.forEach(function (en, i) {
      en.target.style.transitionDelay = Math.min(i * 45, 360) + "ms";
      en.target.classList.add("in");
      revealIO.unobserve(en.target);
      setTimeout(function () { en.target.style.transitionDelay = ""; }, 1300);
    });
  }, { rootMargin: "0px 0px -6% 0px" });
  function scan() {
    $$(".xcard, .collection-card, .method-card, #grid .card").forEach(function (el) {
      if (el.dataset.rv) return;
      el.dataset.rv = "1";
      el.classList.add("rv");
      revealIO.observe(el);
    });
  }
  scan();
  ["#grid", "#collections"].forEach(function (sel) {
    var el = $(sel);
    if (el && "MutationObserver" in window) new MutationObserver(function () { scan(); kick(); }).observe(el, { childList: true });
  });

  /* ---- stats count up once, after data has arrived and the strip is on screen ---- */
  var statsEl = $(".stats"), statsSeen = false, dataReady = !!window.__atlasReady, counted = false;
  function countUp() {
    if (counted || !statsSeen || !dataReady) return;
    counted = true;
    $$(".stat-num").forEach(function (el) {
      var target = parseInt(el.textContent.replace(/[^\d]/g, ""), 10);
      if (!target) return;
      var t0 = performance.now(), dur = 1300;
      (function tick(now) {
        var t = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(2, -10 * t);
        el.textContent = Math.round(target * (t === 1 ? 1 : e)).toLocaleString();
        if (t < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }
  if (statsEl) {
    var sIO = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { statsSeen = true; sIO.disconnect(); countUp(); }
    }, { threshold: 0.6 });
    sIO.observe(statsEl);
  }
  addEventListener("atlas:ready", function () { dataReady = true; countUp(); kick(); });

  applyTier();
})();
