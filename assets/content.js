/* Atlas content for the AI 导航 / 社区 / 阅读 views — data only, rendered by app.js.
   icon: file in assets/icons/ (local SVG, no CDN); letter + color: fallback tile.
   official:true marks a tagline quoted from the product's own site. */
window.ATLAS_CONTENT = (function () {
  "use strict";

  /* ---------------- AI 导航 ---------------- */
  var NAV_GROUPS = [
    {
      title: "对话助手",
      note: "日常问答、写作、推理的主力聊天 AI",
      items: [
        { icon: "openai", name: "ChatGPT", org: "OpenAI", url: "https://chatgpt.com", letter: "C", color: "#10a37f", slogan: "全球最流行的 AI 对话助手，能聊、能写、能编程、能看图。" },
        { icon: "claude", name: "Claude", org: "Anthropic", url: "https://claude.ai", letter: "C", color: "#d97757", slogan: "以安全和长文本见长的 AI 助手，写代码与读长文档尤其稳。" },
        { icon: "gemini", name: "Gemini", org: "Google", url: "https://gemini.google.com", letter: "G", color: "#4796e3", slogan: "Google 的多模态 AI 助手，与搜索、办公全家桶深度打通。" },
        { icon: "copilot", name: "Copilot", org: "Microsoft", url: "https://copilot.microsoft.com", letter: "C", color: "#185abd", slogan: "微软的 AI 副驾驶，融在 Windows、Office 与 Edge 里。" },
        { icon: "grok", name: "Grok", org: "xAI", url: "https://grok.com", letter: "G", color: "#000000", slogan: "马斯克 xAI 的助手，主打实时联网与「最大限度求真」。" },
        { icon: "meta", name: "Meta AI", org: "Meta", url: "https://www.meta.ai", letter: "M", color: "#0082fb", slogan: "Meta 的免费 AI 助手，住在 WhatsApp、Instagram 与 Facebook 里。" },
        { icon: "mistral", name: "Le Chat", org: "Mistral AI", url: "https://chat.mistral.ai", letter: "M", color: "#ff7000", slogan: "欧洲 Mistral 的对话助手，响应快、风格干练。" },
        { icon: "poe", name: "Poe", org: "Quora", url: "https://poe.com", letter: "P", color: "#5d5cde", slogan: "一个入口聊遍各家模型，还能自己搭聊天机器人。" },
        { icon: "deepseek", name: "DeepSeek", org: "深度求索", url: "https://chat.deepseek.com", letter: "D", color: "#4d6bfe", slogan: "国产开源强模型，深度思考模式让推理过程一目了然。" },
        { icon: "doubao", name: "豆包", org: "字节跳动", url: "https://www.doubao.com", letter: "豆", color: "#325ae4", slogan: "字节跳动的 AI 助手，语音对话自然，贴近日常使用。" },
        { icon: "qwen", name: "通义千问", org: "阿里巴巴", url: "https://tongyi.aliyun.com", letter: "通", color: "#615ced", slogan: "阿里的全能助手，长文档、会议纪要与办公场景是强项。" },
        { icon: "kimi", name: "Kimi", org: "月之暗面", url: "https://www.kimi.com", letter: "K", color: "#161616", slogan: "以超长上下文出圈，整本书、整套资料一次读完。" },
        { icon: "wenxin", name: "文心一言", org: "百度", url: "https://yiyan.baidu.com", letter: "文", color: "#306eff", slogan: "百度的对话助手，中文理解与搜索生态结合紧密。" },
        { icon: "chatglm", name: "智谱清言", org: "智谱 AI", url: "https://chatglm.cn", letter: "智", color: "#2e5cff", slogan: "清华系 GLM 大模型的官方助手，兼顾对话与智能体。" },
        { icon: "yuanbao", name: "腾讯元宝", org: "腾讯", url: "https://yuanbao.tencent.com", letter: "元", color: "#0052d9", slogan: "腾讯的 AI 助手，深度整合微信与腾讯文档生态。" },
        { icon: "spark", name: "讯飞星火", org: "科大讯飞", url: "https://xinghuo.xfyun.cn", letter: "星", color: "#0b5fff", slogan: "科大讯飞的助手，语音交互与教育办公场景积累深厚。" },
        { icon: "hailuo", name: "海螺 AI", org: "MiniMax", url: "https://hailuoai.com", letter: "海", color: "#f23f42", slogan: "MiniMax 的助手产品，长文本与多模态创作都拿手。" },
        { icon: "baichuan", name: "百川", org: "百川智能", url: "https://www.baichuan-ai.com", letter: "百", color: "#ff6a00", slogan: "搜狗创始人王小川创立，主打搜索增强的 AI 助手。" },
        { icon: "stepfun", name: "跃问", org: "阶跃星辰", url: "https://yuewen.cn", letter: "跃", color: "#5b4dff", slogan: "阶跃星辰的助手，智能搜索、识图与文件处理一站完成。" },
        { icon: "yi", name: "Yi 零一万物", org: "零一万物", url: "https://www.01.ai", letter: "Y", color: "#00a870", slogan: "李开复创办的零一万物及其 Yi 系列大模型。" }
      ]
    },
    {
      title: "创意生成",
      note: "图像、视频、音乐与声音",
      items: [
        { icon: "midjourney", name: "Midjourney", org: "Midjourney", url: "https://www.midjourney.com", letter: "M", color: "#000000", slogan: "AI 绘画的代表作，出图质感与美学一直是标杆。" },
        { icon: "runway", name: "Runway", org: "Runway", url: "https://runwayml.com", letter: "R", color: "#111111", slogan: "专业级 AI 视频生成与剪辑，Gen 系列模型出自这里。" },
        { icon: "luma", name: "Luma Dream Machine", org: "Luma AI", url: "https://lumalabs.ai", letter: "L", color: "#7c5cff", slogan: "文字或图片一键成片，运镜自然的 AI 视频工具。" },
        { icon: "suno", name: "Suno", org: "Suno", url: "https://suno.com", letter: "S", color: "#000000", slogan: "输入一句描述，生成带人声的完整歌曲。" },
        { icon: "elevenlabs", name: "ElevenLabs", org: "ElevenLabs", url: "https://elevenlabs.io", letter: "E", color: "#000000", slogan: "最像真人的 AI 语音：配音、克隆声音与有声书。" },
        { icon: "kling", name: "可灵 AI", org: "快手", url: "https://klingai.com", letter: "可", color: "#00c853", slogan: "快手的视频生成大模型，长时长与大幅运动见长。" },
        { icon: "jimeng", name: "即梦 AI", org: "字节跳动", url: "https://jimeng.jianying.com", letter: "即", color: "#7d4dff", slogan: "剪映出品的 AI 创作平台，图片与视频生成上手快。" }
      ]
    },
    {
      title: "编程助手",
      note: "写代码、改代码、懂整个仓库",
      items: [
        { icon: "cursor", name: "Cursor", org: "Anysphere", url: "https://cursor.com", letter: "C", color: "#000000", slogan: "为 AI 而生的代码编辑器，和它结对编程。" },
        { icon: "githubcopilot", name: "GitHub Copilot", org: "GitHub · Microsoft", url: "https://github.com/features/copilot", letter: "G", color: "#6e40c9", slogan: "住在编辑器里的 AI 结对程序员，补全、对话、改代码。" }
      ]
    },
    {
      title: "搜索与知识",
      note: "带出处地查资料、做研究、管理模型",
      items: [
        { icon: "perplexity", name: "Perplexity", org: "Perplexity AI", url: "https://www.perplexity.ai", letter: "P", color: "#20808d", slogan: "Ask anything.", official: true },
        { icon: "notebooklm", name: "NotebookLM", org: "Google", url: "https://notebooklm.google.com", letter: "N", color: "#f9ab00", slogan: "把你的资料喂给它，变成能问答、能听的研究笔记。" },
        { icon: "huggingface", name: "Hugging Face", org: "Hugging Face", url: "https://huggingface.co", letter: "H", color: "#ff9d00", slogan: "全球最大的开源模型与数据集社区，AI 界的 GitHub。" }
      ]
    }
  ];

  /* ---------------- forums & communities ---------------- */
  var FORUM_GROUPS = [
    {
      title: "海外社区",
      note: "英文为主，研究与开发者密度最高",
      items: [
        { icon: "huggingface", name: "Hugging Face 论坛", type: "论坛", url: "https://discuss.huggingface.co", letter: "H", color: "#ff9d00", desc: "开源模型社区的官方论坛，报错求助与新模型讨论的第一站。" },
        { icon: "openai", name: "OpenAI 社区", type: "论坛", url: "https://community.openai.com", letter: "O", color: "#10a37f", desc: "ChatGPT 与 API 开发者社区，官方团队也在这里答疑。" },
        { icon: "reddit", name: "r/LocalLLaMA", type: "Reddit", url: "https://www.reddit.com/r/LocalLLaMA", letter: "R", color: "#ff4500", desc: "本地跑大模型的人都在这：显卡、量化、部署经验贴极多。" },
        { icon: "reddit", name: "r/MachineLearning", type: "Reddit", url: "https://www.reddit.com/r/MachineLearning", letter: "R", color: "#ff4500", desc: "偏学术的机器学习社区，新论文解读与研究讨论。" },
        { icon: "ycombinator", name: "Hacker News", type: "资讯社区", url: "https://news.ycombinator.com", letter: "Y", color: "#ff6600", desc: "YC 的技术新闻站，AI 新发布常在这里第一时间发酵。" },
        { icon: "kaggle", name: "Kaggle 社区", type: "竞赛社区", url: "https://www.kaggle.com/discussions", letter: "K", color: "#20beff", desc: "数据科学竞赛之家，讨论区满是实战笔记与方案复盘。" },
        { icon: "google", name: "Google AI Developers Forum", type: "论坛", url: "https://discuss.ai.google.dev", letter: "G", color: "#4285f4", desc: "Gemini API 与 AI Studio 的官方开发者论坛。" },
        { icon: "langchain", name: "LangChain 论坛", type: "论坛", url: "https://forum.langchain.com", letter: "L", color: "#1c3c3c", desc: "LangChain / LangGraph 官方论坛，做 Agent 的问题来这里搜。" },
        { icon: "discord", name: "EleutherAI Discord", type: "Discord", url: "https://discord.gg/eleutherai", letter: "D", color: "#5865f2", desc: "开源研究组织 EleutherAI 的大本营，从 Discord 里长出来的实验室。" }
      ]
    },
    {
      title: "国内社区",
      note: "中文讨论、教程与资讯",
      items: [
        { name: "Linux DO", type: "论坛", url: "https://linux.do", letter: "L", color: "#0f766e", desc: "近两年最活跃的技术社区之一，AI 工具与羊毛信息更新极快。" },
        { icon: "modelscope", name: "ModelScope 魔搭社区", type: "模型社区", url: "https://www.modelscope.cn/community", letter: "M", color: "#624aff", desc: "阿里达摩院的开源模型社区，国产模型的发布与体验中心。" },
        { name: "WaytoAGI", type: "知识社区", url: "https://www.waytoagi.com", letter: "W", color: "#ff5c38", desc: "「通往 AGI 之路」共创知识库，AI 学习路径与资源整理得很全。" },
        { name: "Datawhale", type: "学习社区", url: "https://www.datawhale.cn", letter: "D", color: "#2563eb", desc: "开源学习组织，组队学习与免费教程是招牌，适合系统入门。" },
        { icon: "csdn", name: "CSDN · AI 社区", type: "技术社区", url: "https://ai.csdn.net", letter: "C", color: "#fc5531", desc: "老牌中文开发者社区的 AI 专区，实操教程量大管饱。" },
        { icon: "juejin", name: "掘金 · AI 专区", type: "技术社区", url: "https://juejin.cn/ai", letter: "掘", color: "#1e80ff", desc: "掘金的 AI 内容专区，前端与应用层 AI 文章更新勤。" },
        { icon: "zhihu", name: "知乎 · 人工智能话题", type: "问答社区", url: "https://www.zhihu.com/topic/19551275", letter: "知", color: "#0066ff", desc: "中文 AI 讨论的深度阵地，行业人士的长答值得慢慢读。" },
        { icon: "v2ex", name: "V2EX", type: "论坛", url: "https://www.v2ex.com", letter: "V", color: "#334155", desc: "创意工作者社区，AI 产品分享与独立开发者讨论很活跃。" },
        { name: "机器之心", type: "资讯社区", url: "https://www.jiqizhixin.com", letter: "机", color: "#d92323", desc: "国内头部 AI 媒体，论文解读与行业动态的中文首选。" }
      ]
    }
  ];

  /* ---------------- reading: blogs ---------------- */
  var BLOGS = [
    { icon: "openai", title: "OpenAI Blog", source: "OpenAI 官方", kind: "博客", url: "https://openai.com/blog", letter: "O", color: "#10a37f", desc: "新模型与产品发布的第一手来源，GPT 系列的每一次更新都在这里官宣。" },
    { icon: "openai", title: "Introducing ChatGPT", source: "OpenAI · 文章", kind: "文章", url: "https://openai.com/index/chatgpt/", letter: "O", color: "#10a37f", desc: "2022 年 11 月发布 ChatGPT 的原始博文，一个时代的起点，值得回看。" },
    { icon: "anthropic", title: "Anthropic Research", source: "Anthropic 官方", kind: "博客", url: "https://www.anthropic.com/research", letter: "A", color: "#d97757", desc: "Claude 背后的研究博客，可解释性与 AI 安全文章质量极高。" },
    { icon: "anthropic", title: "Building Effective Agents", source: "Anthropic · 文章", kind: "文章", url: "https://www.anthropic.com/research/building-effective-agents", letter: "A", color: "#d97757", desc: "做 Agent 必读：工作流与自主智能体的区别、几种经典模式，务实不炒作。" },
    { icon: "deepmind", title: "Google DeepMind Blog", source: "Google DeepMind 官方", kind: "博客", url: "https://deepmind.google/discover/blog/", letter: "D", color: "#4796e3", desc: "Gemini、AlphaFold 等突破的官方解读，前沿研究的风向标。" },
    { icon: "huggingface", title: "Hugging Face Blog", source: "Hugging Face 官方", kind: "博客", url: "https://huggingface.co/blog", letter: "H", color: "#ff9d00", desc: "开源社区的教程与模型发布阵地，从扩散模型到微调实战都有。" },
    { icon: "meta", title: "Meta AI Blog", source: "Meta 官方", kind: "博客", url: "https://ai.meta.com/blog/", letter: "M", color: "#0082fb", desc: "Llama 系列与 Meta 研究成果的官方发布地。" },
    { title: "LLM Powered Autonomous Agents", source: "Lil'Log · 文章", kind: "文章", url: "https://lilianweng.github.io/posts/2023-06-23-agent/", letter: "L", color: "#7c5cff", desc: "翁荔的 Agent 综述长文：规划、记忆、工具使用一次讲透，被引用无数次。" },
    { title: "Attention? Attention!", source: "Lil'Log · 文章", kind: "文章", url: "https://lilianweng.github.io/posts/2018-06-24-attention/", letter: "L", color: "#7c5cff", desc: "理解 Transformer 之前先读这篇：把注意力机制的来龙去脉讲得最清楚的文章之一。" },
    { title: "The Illustrated Transformer", source: "Jay Alammar · 文章", kind: "文章", url: "https://jalammar.github.io/illustrated-transformer/", letter: "J", color: "#f59e0b", desc: "用大量配图拆解 Transformer，新手友好的图解经典，后续还有图解 GPT-2。" },
    { title: "Simon Willison's Weblog", source: "Simon Willison · 个人博客", kind: "博客", url: "https://simonwillison.net/", letter: "S", color: "#0ea5e9", desc: "更新极勤的个人博客，LLM 工具与应用的一线观察，几乎日更。" },
    { title: "A Recipe for Training Neural Networks", source: "Andrej Karpathy · 文章", kind: "文章", url: "https://karpathy.github.io/2019/04/25/recipe/", letter: "K", color: "#111827", desc: "Karpathy 的调参心法长文；他的 nanoGPT 仓库则是手写 GPT 的最佳教材。" },
    { title: "机器之心", source: "机器之心 · 媒体", kind: "博客", url: "https://www.jiqizhixin.com", letter: "机", color: "#d92323", desc: "国内头部 AI 媒体，论文解读与大厂动态跟得最紧。" },
    { title: "量子位", source: "量子位 · 媒体", kind: "博客", url: "https://www.qbitai.com", letter: "量", color: "#00b578", desc: "风格更活泼的 AI 科技媒体，热点追踪与人物故事见长。" }
  ];

  /* ---------------- reading: landmark papers ---------------- */
  var PAPERS = [
    { title: "Attention Is All You Need", authors: "Vaswani 等 · Google", year: 2017, arxiv: "1706.03762", why: "提出 Transformer 架构，今天几乎所有大模型的地基。" },
    { title: "BERT: Pre-training of Deep Bidirectional Transformers", authors: "Devlin 等 · Google", year: 2018, arxiv: "1810.04805", why: "确立「预训练 + 微调」范式，NLP 从此换代。" },
    { title: "Language Models are Few-Shot Learners (GPT-3)", authors: "Brown 等 · OpenAI", year: 2020, arxiv: "2005.14165", why: "1750 亿参数证明规模的力量，提示词代替微调的开端。" },
    { title: "Denoising Diffusion Probabilistic Models (DDPM)", authors: "Ho 等 · UC Berkeley", year: 2020, arxiv: "2006.11239", why: "扩散模型的奠基作，后来的 AI 绘画浪潮源于此。" },
    { title: "Retrieval-Augmented Generation (RAG)", authors: "Lewis 等 · Meta", year: 2020, arxiv: "2005.11401", why: "给模型外挂知识库，RAG 架构的出处，企业落地的主流方案。" },
    { title: "Scaling Laws for Neural Language Models", authors: "Kaplan 等 · OpenAI", year: 2020, arxiv: "2001.08361", why: "算清参数、数据、算力之间的账，大模型竞赛的预算公式。" },
    { title: "Training Language Models to Follow Instructions with Human Feedback (InstructGPT)", authors: "Ouyang 等 · OpenAI", year: 2022, arxiv: "2203.02155", why: "RLHF 让模型学会听人话，ChatGPT 的直接前身。" },
    { title: "Chain-of-Thought Prompting Elicits Reasoning in LLMs", authors: "Wei 等 · Google", year: 2022, arxiv: "2201.11903", why: "一句「一步步想」解锁推理能力，思维链的出处。" },
    { title: "LoRA: Low-Rank Adaptation of Large Language Models", authors: "Hu 等 · Microsoft", year: 2021, arxiv: "2106.09685", why: "只训一小部分参数就能微调大模型，个人玩家微调的标配。" },
    { title: "ReAct: Synergizing Reasoning and Acting in Language Models", authors: "Yao 等 · Princeton / Google", year: 2022, arxiv: "2210.03629", why: "边想边行动的循环，AI Agent 的经典框架。" },
    { title: "LLaMA: Open and Efficient Foundation Language Models", authors: "Touvron 等 · Meta", year: 2023, arxiv: "2302.13971", why: "开源大模型的引爆点，整个开源生态自此起飞。" },
    { title: "Direct Preference Optimization (DPO)", authors: "Rafailov 等 · Stanford", year: 2023, arxiv: "2305.18290", why: "不用训奖励模型也能做对齐，RLHF 的简化替代方案。" }
  ];

  /* ---------------- reading: knowledge cards ---------------- */
  var KNOW = [
    { title: "大语言模型（LLM）", text: "在海量文本上训练出的神经网络，本事是「根据前文预测下一个词」。预测得足够准时，它顺带学会了写作、翻译、推理和写代码——ChatGPT、Claude 们背后的本体都是它。" },
    { title: "Token（词元）", text: "模型眼里的最小文字单位，不完全等于字或词：一句中文通常一个字约 1 个 token，英文一个词常被拆成 1-2 个。计费、上下文长度都按 token 算，100 万 token 约等于 150 万汉字。" },
    { title: "上下文窗口", text: "模型一次能「看到」的 token 总量，包括你的问题、之前的对话和它的回复。窗口越大，一次能读的资料越多；超了窗口，早先的内容就会被挤掉、被「忘掉」。" },
    { title: "温度与采样", text: "生成时模型其实在多个候选词之间按概率抽签。温度低（接近 0）时总选最稳的那个，回答确定但死板；温度高时更敢选冷门词，更有创意也更容易胡说。写代码调低，写文案调高。" },
    { title: "提示词工程", text: "把需求说清楚的手艺：交代背景、给定格式、举几个例子、让它一步步想。不是玄学咒语，而是把「你以为它懂的」都写进提示里——多数答非所问，是问得不够清楚。" },
    { title: "RAG（检索增强生成）", text: "先从你的资料库里检索相关段落，再连同问题一起喂给模型作答。这样模型能用上最新和私有的知识，还能给出处，是企业知识库问答的主流做法，也能减少胡编。" },
    { title: "微调（Fine-tuning）", text: "拿你自己的数据在已训练好的模型上再练一小段，让它学会固定语气、格式或专业话术。它擅长改变「怎么说」，不擅长灌输新知识——补知识更适合用 RAG。" },
    { title: "LoRA", text: "微调的轻量版：冻结原模型，只训练一小块新增的低秩矩阵。显存和成本降到几分之一，效果接近全量微调，还能像插件一样随时插拔、切换不同 LoRA。" },
    { title: "向量与嵌入（Embedding）", text: "把文字、图片变成一串数字坐标，意思越接近的，坐标离得越近。语义搜索、推荐和 RAG 的检索全靠它：找的不再是关键词相同的，而是「意思最像的」。" },
    { title: "AI Agent（智能体）", text: "能自己拆解任务、调用工具（搜索、代码、接口）、看结果再决定下一步的 AI 系统。和一问一答的聊天机器人相比，它更像能独立跑完一整个活的实习生——但也要有人盯着验收。" },
    { title: "MCP（模型上下文协议）", text: "Anthropic 提出的开放协议，给 AI 接外部工具和数据的「USB 接口」：数据库、浏览器、文件系统按同一标准封装，任何支持 MCP 的 AI 都能即插即用，不用各家重复造轮子。" },
    { title: "幻觉（Hallucination）", text: "模型一本正经地编造不存在的事实、文献或链接。因为它的目标是「说得像」，不是「说得对」。关键事实务必溯源核对，让它给出处、用 RAG 接可靠资料能明显缓解。" },
    { title: "RLHF 与对齐", text: "用人类打分来训练模型：人更喜欢哪个回答，模型就往哪个方向靠。这一套「基于人类反馈的强化学习」让原始模型从只会续写，变成懂礼貌、守规矩、能对话的样子。" },
    { title: "多模态", text: "模型不止处理文字，还能看图、听声音、生成视频。拍照问答、语音对话、图生视频都是多模态能力；现在的旗舰模型基本都是原生多模态，而不是外挂插件拼出来的。" }
  ];

  return { nav: NAV_GROUPS, forums: FORUM_GROUPS, blogs: BLOGS, papers: PAPERS, know: KNOW };
})();
