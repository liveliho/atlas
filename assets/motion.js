/* Atlas — cinematic scroll layer (GSAP + ScrollTrigger).
   Progressive enhancement only: without GSAP / with reduced motion the page
   is fully visible and functional (no CSS pre-hiding anywhere).
   Tiers via gsap.matchMedia: desktop = full choreography incl. pinned stage;
   mobile = lighter parallax + reveals, no pin (stage becomes a static list);
   reduced motion = no scrub/pin at all. */
(function () {
  "use strict";

  /* ---------- Top 5 万星精选 (snapshot of data/projects.json ranking, 2026-10-31) ---------- */
  var TOP5 = [
    { full: "codecrafters-io/build-your-own-x", name: "build-your-own-x", owner: "codecrafters-io",
      stars: "★ 557k", meta: "⑂ 52k · Markdown",
      desc: "Master programming by recreating your favorite technologies from scratch.",
      blurb: "「自己动手重造轮子」——从零复刻你熟悉的技术，是 GitHub 上最受欢迎的学习仓库。" },
    { full: "sindresorhus/awesome", name: "awesome", owner: "sindresorhus",
      stars: "★ 527k", meta: "⑂ 37k",
      desc: "Awesome lists about all kinds of interesting topics — the list of lists.",
      blurb: "一切 Awesome 清单的源头：各领域精选资源列表的「清单之清单」。" },
    { full: "public-apis/public-apis", name: "public-apis", owner: "public-apis",
      stars: "★ 493k", meta: "⑂ 55k · Python",
      desc: "A collective list of free APIs.",
      blurb: "免费 API 大全——开发练手、做产品找接口的第一站。" },
    { full: "freeCodeCamp/freeCodeCamp", name: "freeCodeCamp", owner: "freeCodeCamp",
      stars: "★ 458k", meta: "⑂ 48k · TypeScript",
      desc: "freeCodeCamp.org's open-source codebase and curriculum. Learn math, programming, and computer science for free.",
      blurb: "免费学编程的开源课程与社区，全球最知名的编程自学平台之一。" },
    { full: "morluto/rea", name: "rea", owner: "morluto",
      stars: "★ 409k", meta: "⑂ 102k · TypeScript",
      desc: "Reverse engineer anything with agents, from app behavior down to native binaries.",
      blurb: "用 AI Agent 做逆向工程的新锐工具，近期冲入全站 Star 前五。" }
  ];

  /* ---------- showcase: static list fallback (mobile / reduced / no-pin) ---------- */
  var listEl = document.getElementById("showcase-list");
  if (listEl) {
    listEl.innerHTML = TOP5.map(function (p, i) {
      return '<a class="xcard" href="https://github.com/' + p.full + '" target="_blank" rel="noopener">' +
        '<span class="icon-box"><img src="https://github.com/' + p.owner + '.png?size=96" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.add(\'no-icon\')">' +
        '<span class="icon-letter" style="background:#0071e3">' + p.name.charAt(0).toUpperCase() + "</span></span>" +
        '<span class="xcard-main"><span class="xcard-name">' + p.full + '</span>' +
        '<span class="xcard-org">' + p.stars + " · " + p.meta.replace("⑂ ", "Fork ") + "</span>" +
        '<p class="xcard-slogan">' + p.blurb + "</p></span></a>";
    }).join("");
  }

  /* ---------- showcase stage state ---------- */
  var current = -1;
  var dotsEl = document.getElementById("stage-dots");
  var dots = [];
  if (dotsEl) {
    dotsEl.innerHTML = TOP5.map(function (p, i) {
      return '<button type="button" class="stage-dot" data-i="' + i + '" aria-label="第 ' + (i + 1) + " 个：" + p.full + '"></button>';
    }).join("");
    dots = Array.prototype.slice.call(dotsEl.querySelectorAll(".stage-dot"));
  }
  var reducedMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  function swap(i, animate) {
    if (i === current) return;
    current = i;
    var p = TOP5[i];
    var card = document.getElementById("stage-card");
    if (!card) return;
    card.href = "https://github.com/" + p.full;
    document.getElementById("stage-avatar").src = "https://github.com/" + p.owner + ".png?size=96";
    document.getElementById("stage-repo").textContent = p.name;
    document.getElementById("stage-owner").textContent = p.owner;
    document.getElementById("stage-stars").textContent = p.stars;
    document.getElementById("stage-desc").textContent = p.desc;
    document.getElementById("stage-meta").textContent = p.meta;
    document.getElementById("stage-idx").textContent = "0" + (i + 1);
    document.getElementById("stage-name").textContent = p.full;
    document.getElementById("stage-blurb").textContent = p.blurb;
    dots.forEach(function (d, j) { d.classList.toggle("active", j === i); });
    if (animate && window.gsap && !reducedMQ.matches) {
      gsap.fromTo(["#stage-card", ".stage-copy"],
        { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.07, ease: "power3.out", overwrite: true, clearProps: "transform" });
    }
  }
  swap(0, false);

  /* ---------- topbar scrolled state (works with or without GSAP) ---------- */
  var topbar = document.querySelector(".topbar");
  if (topbar) {
    var onScroll = function () { topbar.classList.toggle("scrolled", window.scrollY > 40); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- anchor stabiliser ----------
     The project grid auto-loads while you glide past it, which pushes the
     sections below it further down mid-jump; a native anchor jump then lands
     short. After a nav click, watch the target: if layout growth moves it,
     re-land instantly until it settles. Any manual wheel/touch cancels. */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (!id || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (history.pushState) history.pushState(null, "", id);
      target.scrollIntoView({ behavior: "smooth" });
      var lastTop = null, stable = 0, tries = 0, cancelled = false;
      var cancel = function () { cancelled = true; };
      window.addEventListener("wheel", cancel, { passive: true, once: true });
      window.addEventListener("touchstart", cancel, { passive: true, once: true });
      var iv = setInterval(function () {
        if (cancelled) { clearInterval(iv); return; }
        tries++;
        var top = target.getBoundingClientRect().top;
        var margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
        if (lastTop !== null && Math.abs(top - lastTop) < 4) {
          stable++;
        } else {
          stable = 0;
          if (tries > 3 && lastTop !== null && Math.abs(top - margin) > 8) {
            target.scrollIntoView({ behavior: "instant", block: "start" });
            top = target.getBoundingClientRect().top;
          }
        }
        lastTop = top;
        if (stable >= 3 || tries > 24) clearInterval(iv);
      }, 300);
    });
  });

  /* ---------- everything below needs GSAP + ScrollTrigger ---------- */
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add("motion-on");
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* split section titles into chars for editorial staggered reveals */
  function splitChars(sel) {
    document.querySelectorAll(sel).forEach(function (h) {
      var text = h.textContent;
      h.setAttribute("aria-label", text);
      h.innerHTML = text.split("").map(function (c) {
        return '<span class="ch" aria-hidden="true">' + (c === " " ? "&nbsp;" : c) + "</span>";
      }).join("");
    });
  }
  splitChars(".band-head h2, .method h2, .showcase-title");

  /* dynamic project cards: batch entrance that survives app.js re-renders */
  var cardTriggers = [];
  function killCardTriggers() {
    cardTriggers.forEach(function (t) { t.kill(); });
    cardTriggers = [];
  }
  function setupDynamicCards() {
    var cards = gsap.utils.toArray("#grid .card");
    if (!cards.length) return;
    killCardTriggers();
    gsap.set(cards, { opacity: 0, y: 18 });
    cardTriggers = ScrollTrigger.batch(cards, {
      start: "top 96%",
      once: true,
      onEnter: function (els) {
        gsap.to(els, { opacity: 1, y: 0, duration: 0.5, stagger: 0.03, ease: "power3.out", overwrite: true, clearProps: "transform" });
      }
    });
  }
  function setupStaticCards() {
    var els = gsap.utils.toArray(".xcard, .method-card");
    if (!els.length) return;
    gsap.set(els, { opacity: 0, y: 22 });
    ScrollTrigger.batch(els, {
      start: "top 94%",
      once: true,
      onEnter: function (b) {
        gsap.to(b, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: "power3.out", overwrite: true, clearProps: "transform" });
      }
    });
  }
  function reveals() {
    gsap.utils.toArray(".band-head .kicker, .band-sub, .method-sub, .sub-head, .group-title, .showcase-sub").forEach(function (el) {
      gsap.from(el, {
        y: 28, autoAlpha: 0, duration: 0.85, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true }
      });
    });
    gsap.utils.toArray(".band-head h2, .method h2, .showcase-title").forEach(function (h) {
      var chars = h.querySelectorAll(".ch");
      if (!chars.length) return;
      gsap.from(chars, {
        yPercent: 65, autoAlpha: 0, duration: 0.7, stagger: 0.03, ease: "power3.out",
        scrollTrigger: { trigger: h, start: "top 88%", once: true }
      });
    });
  }
  function heroScrub(s) {
    var st = { trigger: ".hero", start: "top top", end: "+=900", scrub: 0.5 };
    var tl = gsap.timeline({ scrollTrigger: st });
    tl.to(".aura-a", { yPercent: 16 * s, xPercent: 5, ease: "none" }, 0)
      .to(".aura-b", { yPercent: -10 * s, xPercent: -6, ease: "none" }, 0)
      .to(".aura-c", { yPercent: -18 * s, ease: "none" }, 0)
      .to(".hero .kicker", { y: -30 * s, autoAlpha: 0, ease: "none" }, 0)
      .to(".hero h1", { y: -56 * s, scale: 0.95, autoAlpha: 0.15, ease: "none" }, 0)
      .to(".hero-desc", { y: -44 * s, autoAlpha: 0.25, ease: "none" }, 0)
      .to(".stats", { y: -30 * s, autoAlpha: 0.35, ease: "none" }, 0)
      .to(".hero-search", { y: -20 * s, autoAlpha: 0.5, ease: "none" }, 0)
      .to(".brand-mark", { rotation: 90 * s, scale: 1.07, ease: "none" }, 0);
    return tl;
  }
  function themeShifts() {
    var colors = { explore: "#c7e3ff", "ai-nav": "#d8ccff", community: "#ffd9ec", reading: "#c9f0e0", method: "#ffe9c9" };
    Object.keys(colors).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      ScrollTrigger.create({
        trigger: el, start: "top 55%", end: "bottom 55%",
        onToggle: function (self) {
          if (self.isActive) {
            gsap.to(".aura-a", {
              background: "radial-gradient(circle, " + colors[id] + " 0%, transparent 65%)",
              duration: 1.2, ease: "power2.out", overwrite: "auto"
            });
          }
        }
      });
    });
  }
  function pinScene() {
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#showcase", start: "top top+=64", end: "+=150%",
        pin: true, scrub: 0.5, anticipatePin: 1,
        onUpdate: function (self) {
          swap(Math.min(4, Math.round(self.progress * 4)), true);
        }
      }
    });
    tl.to(".stage-progress-fill", { scaleX: 1, ease: "none", duration: 1 }, 0)
      .fromTo(".stage-card", { rotationY: -4 }, { rotationY: 4, ease: "none", duration: 1 }, 0);
    dots.forEach(function (d, i) {
      d.addEventListener("click", function () {
        var st = tl.scrollTrigger;
        if (st) window.scrollTo({ top: st.start + (st.end - st.start) * (i / 4), behavior: "smooth" });
      });
    });
    return tl;
  }

  var tier = null;
  var mm = gsap.matchMedia();
  mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", function () {
    tier = "desktop";
    heroScrub(1);
    pinScene();
    reveals();
    setupStaticCards();
    themeShifts();
    return function () { tier = null; killCardTriggers(); };
  });
  mm.add("(max-width: 767.5px) and (prefers-reduced-motion: no-preference)", function () {
    tier = "mobile";
    heroScrub(0.55);
    reveals();
    setupStaticCards();
    themeShifts();
    return function () { tier = null; killCardTriggers(); };
  });

  /* app.js re-renders #grid on data load / filter / auto-load: re-batch + refresh */
  var grid = document.getElementById("grid");
  var refreshTimer = null;
  if (grid && "MutationObserver" in window) {
    new MutationObserver(function () {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(function () {
        if (tier) setupDynamicCards();
        ScrollTrigger.refresh();
      }, 60);
    }).observe(grid, { childList: true });
  }
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
