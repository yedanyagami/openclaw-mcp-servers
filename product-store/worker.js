/**
 * product-store Worker — Digital Product Store with PayPal + Stripe + GitHub OAuth
 * Cloudflare Workers + D1 + KV
 *
 * ENV VARS (set via wrangler secret):
 *   PAYPAL_BUSINESS_EMAIL  - PayPal business email for Buy Now buttons
 *   STRIPE_SECRET_KEY      - Stripe secret key for Checkout Sessions
 *   STRIPE_WEBHOOK_SECRET  - Stripe webhook signing secret
 *   GITHUB_CLIENT_ID       - GitHub OAuth App client ID
 *   GITHUB_CLIENT_SECRET   - GitHub OAuth App client secret
 *
 * OAuth Flow:
 *   GET /auth/login       → redirect to GitHub OAuth
 *   GET /auth/callback    → exchange code for token → issue Pro API key
 *   GET /auth/status      → check if user has Pro key (via KV)
 */

// ============================================================
// PRODUCT CATALOG
// ============================================================
const PRODUCTS = {
  'prompt-collection-50': {
    id: 'prompt-collection-50',
    name: '50 Battle-Tested AI Prompts | 【保存版】實戰 AI 提示詞 50 選',
    tagline: 'ChatGPT / Claude / DeepSeek compatible — copy & paste ready | ChatGPT / Claude / DeepSeek 對應 — 複製貼上即可使用',
    description: '5 categories x 10 prompts: Coding, Business, Writing, Data Analysis, Productivity. Ready-to-use prompt template collection. | 編碼、商業、寫作、數據分析、生產力 5 大類別各 10 個。可立即使用的提示詞模板集。',
    features: [
      '🟢 Coding (10) — Bug fix, review, testing, API design, CI/CD | 編碼（10 個）— 除錯、審查、測試、API 設計、CI/CD',
      '🔵 Business (10) — Competitor analysis, persona, pricing, OKR | 商業（10 個）— 競品分析、人物誌、定價策略、OKR',
      '🟠 Writing (10) — SEO, social media, sales, technical docs | 寫作（10 個）— SEO、社群媒體、銷售、技術文件',
      '🟣 Data Analysis (10) — CSV analysis, A/B testing, ML, anomaly detection | 數據分析（10 個）— CSV 分析、A/B 測試、ML、異常偵測',
      '🔴 Productivity (10) — Task management, learning, decision-making, goal setting | 生產力（10 個）— 任務管理、學習、決策、目標設定',
    ],
    price_usd: 29,
    price_jpy: 4480,
    currency: 'USD',
    format: 'HTML/PDF',
    file_key: 'products/prompt-collection-50',
    badge: 'BEST SELLER',
    emoji: '🚀',
    stripe_link: 'https://buy.stripe.com/00w6oA3Ene3874AfGv3sI04',
  },
  'automation-guide': {
    id: 'automation-guide',
    name: 'How to Build a 24/7 AI System | 【完全保存版】打造 24 小時運作的 AI 系統',
    tagline: 'Claude Code x OpenClaw — Hands-on guide from zero | Claude Code x OpenClaw — 從零開始的實作指南',
    description: 'From environment setup to Cron jobs, Telegram integration, and Cloudflare Workers. Build a 24/7 AI system for under $8/month. | 從環境建置到 Cron 排程、Telegram 整合、Cloudflare Workers。每月不到 $8 打造全天候 AI 系統。',
    features: [
      '🛠️ Environment Setup — WSL + OpenClaw in 30 min | 環境建置 — WSL + OpenClaw 30 分鐘完成',
      '🤖 Cron Automation — Data collection, reports, monitoring | Cron 自動化 — 資訊收集、報告、監控',
      '📱 Telegram Integration — Control from anywhere | Telegram 整合 — 隨時隨地操作',
      '☁️ Cloudflare Workers — API, DB, Storage | Cloudflare Workers — API、資料庫、儲存',
      '🔧 Troubleshooting — Real errors and solutions | 疑難排解 — 實際錯誤與解決方法',
    ],
    price_usd: 24,
    price_jpy: 3480,
    currency: 'USD',
    format: 'HTML/PDF',
    file_key: 'products/automation-guide',
    badge: 'NEW',
    emoji: '⚡',
    stripe_link: 'https://buy.stripe.com/eVq00cgr9aQWagM51R3sI00',
  },
  'side-income-roadmap': {
    id: 'side-income-roadmap',
    name: 'AI Side Income Roadmap — $1K/mo | 【2026 最新】AI 副業月入 $1,000 路線圖',
    tagline: '4 Phases x Practical Templates | 4 階段 x 實戰模板',
    description: 'Real AI side income strategies: paid articles, prompt sales, automation services, and API sales — 4 revenue pillars. | AI 副業的真實面與具體變現方法：付費文章、提示詞銷售、自動化代理、API 銷售四大支柱。',
    features: [
      '📊 Latest 2026 AI side income market data | 2026 年 AI 副業市場最新數據',
      '🗺️ 4-phase roadmap (from $0 to $1K/mo) | 4 階段路線圖（$0 → $1,000/月）',
      '💰 Pricing and sales strategy templates | 定價與銷售策略模板',
      '⚡ Cut work time by 6x with automation | 自動化將工作時間縮短為 1/6',
      '📋 3-point checklist for content that sells | 暢銷內容的 3 大條件清單',
    ],
    price_usd: 19,
    price_jpy: 2980,
    currency: 'USD',
    format: 'HTML/PDF',
    file_key: 'products/side-income-roadmap',
    badge: 'HOT',
    emoji: '💰',
    stripe_link: 'https://buy.stripe.com/eVq5kw2Aj5wCcoU8e33sI05',
  },
  'intel-api-pro': {
    id: 'intel-api-pro',
    name: 'OpenClaw Intel Pro API Key | OpenClaw 情報專業版 API 金鑰',
    tagline: 'Full AI market intelligence for your agent or app — $14/mo | 為你的 AI 代理或應用提供完整市場情報 — $14/月',
    description: 'Unlock full AI agent market reports, 1000 API calls/day, and priority access to new intelligence tools. Works with any MCP client (Claude Code, Cursor, Windsurf, Cline) or direct REST API. | 解鎖完整 AI 代理市場報告、每日 1000 次 API 呼叫、優先存取新情報工具。支援任何 MCP 用戶端或 REST API。',
    features: [
      '📊 Full market intelligence reports (not just summaries) | 完整市場情報報告（非僅摘要）',
      '🔑 1000 API calls per day (vs 10 free) | 每日 1000 次 API 呼叫（免費版 10 次）',
      '⚡ Priority access to new intelligence tools | 優先存取新情報工具',
      '🤖 Works with MCP clients + REST API | 支援 MCP 用戶端 + REST API',
      '📧 Email support | 電子郵件支援',
    ],
    price_usd: 14,
    price_jpy: 2100,
    currency: 'USD',
    format: 'API_KEY',
    type: 'api_key',
    badge: 'PRO',
    emoji: '🔑',
    stripe_link: 'https://buy.stripe.com/14A6oAcaT7EKbkQ65V3sI02',
  },
  'mcp-starter-kit': {
    id: 'mcp-starter-kit',
    name: 'MCP Server Starter Kit | MCP 伺服器開發入門套件',
    tagline: 'Build & deploy your own MCP server in 30 minutes | 30 分鐘內建置並部署你自己的 MCP 伺服器',
    description: 'Complete development kit for building production-ready MCP servers on Cloudflare Workers. Includes battle-tested templates, JSON-RPC 2.0 skeleton, D1 database integration, PayPal monetization flow, and deployment scripts. | 在 Cloudflare Workers 上建置正式環境 MCP 伺服器的完整開發套件。包含實戰模板、JSON-RPC 2.0 骨架、D1 資料庫整合、PayPal 變現流程及部署腳本。',
    features: [
      '📦 Production-ready Worker template (JSON-RPC 2.0 + MCP 2025-03-26) | 正式環境 Worker 模板（JSON-RPC 2.0 + MCP 2025-03-26）',
      '🗄️ D1 database integration with migration scripts | D1 資料庫整合含遷移腳本',
      '💰 Built-in monetization: PayPal checkout + API key generation | 內建變現：PayPal 結帳 + API 金鑰產生',
      '🚀 One-command deploy: wrangler deploy → live in 30 seconds | 一鍵部署：wrangler deploy → 30 秒上線',
      '📖 Step-by-step guide (EN/ZH) with real deployment examples | 逐步指南（英文/中文）含真實部署範例',
      '🔧 Cross-promo & upgradeSignal patterns for AI-native marketing | 交叉推廣與升級訊號模式，AI 原生行銷',
    ],
    price_usd: 39,
    price_jpy: 5800,
    currency: 'USD',
    format: 'ZIP',
    file_key: 'products/mcp-starter-kit',
    badge: 'NEW',
    emoji: '🛠️',
    stripe_link: 'https://buy.stripe.com/3cIcMYdeXbV0bkQbqf3sI01',
  },
  'ecosystem-pro': {
    id: 'ecosystem-pro',
    name: 'OpenClaw Ecosystem Pro | OpenClaw 生態系專業版',
    tagline: 'All 9 MCP servers, 1000 calls/day — $14/mo (50% cheaper than competitors) | 全部 9 個 MCP 伺服器，每日 1000 次呼叫 — $14/月（比競品便宜 50%）',
    description: 'Unlock the full OpenClaw MCP ecosystem. 49 tools across 9 Cloudflare Workers edge servers. Pro API key with 1000 calls/day per server (vs 10 free). Half the price of Composio ($29) and Glama ($26). | 解鎖完整 OpenClaw MCP 生態系。跨 9 個 Cloudflare Workers 邊緣伺服器的 49 個工具。專業版 API 金鑰每伺服器每日 1000 次呼叫（免費版 10 次）。價格僅為 Composio ($29) 和 Glama ($26) 的一半。',
    features: [
      '🔓 All 9 MCP servers unlocked (49 tools) | 全部 9 個 MCP 伺服器解鎖（49 個工具）',
      '📊 1000 calls/day per server (vs 10 free) | 每伺服器每日 1000 次呼叫（免費版 10 次）',
      '⚡ Edge-deployed on Cloudflare Workers (<50ms) | 部署於 Cloudflare Workers 邊緣節點（<50ms）',
      '🔑 Single Pro API key works across all servers | 單一專業版 API 金鑰通用所有伺服器',
      '💰 $14/mo — 50% cheaper than Composio, Glama, Arcade | $14/月 — 比 Composio、Glama、Arcade 便宜 50%',
      '🤖 Works with Claude Code, Cursor, Windsurf, Cline | 支援 Claude Code、Cursor、Windsurf、Cline',
    ],
    price_usd: 14,
    price_jpy: 2100,
    currency: 'USD',
    format: 'API_KEY',
    type: 'api_key',
    badge: 'MOST POPULAR',
    emoji: '🦞',
    stripe_link: 'https://buy.stripe.com/6oUaEQ5Mv0ci4Ws2TJ3sI06',
  },
  'intel-annual-pass': {
    id: 'intel-annual-pass',
    name: 'OpenClaw Intel Pro Annual Pass | OpenClaw 情報專業版年票',
    tagline: '12 months of full AI market intelligence — save 30% vs monthly | 12 個月完整 AI 市場情報 — 比月付省 30%',
    description: '12-month premium access to OpenClaw Intel. Unlimited API calls, full market reports, priority access to new tools, and exclusive monthly deep-dive analysis. Best value for serious AI developers and analysts. | 12 個月 OpenClaw Intel 高級存取權。無限 API 呼叫、完整市場報告、優先存取新工具、每月獨家深度分析。專業 AI 開發者和分析師的最佳選擇。',
    features: [
      '📊 Unlimited full market intelligence reports (no daily cap) | 無限完整市場情報報告（無每日上限）',
      '🔑 12-month Pro API key (auto-renew optional) | 12 個月專業版 API 金鑰（可選自動續約）',
      '📈 Monthly deep-dive analysis: trends, threats, opportunities | 每月深度分析：趨勢、威脅、機會',
      '⚡ Priority access to new MCP tools (MoltBook, AgentForge, etc.) | 優先存取新 MCP 工具',
      '📧 Priority email support | 優先電子郵件支援',
      '💾 Full report archive access (6+ months of historical data) | 完整報告存檔存取（6 個月以上歷史資料）',
    ],
    price_usd: 119,
    price_jpy: 17800,
    currency: 'USD',
    format: 'API_KEY',
    type: 'subscription',
    badge: 'BEST VALUE',
    emoji: '🏆',
    stripe_link: 'https://buy.stripe.com/cNi14gej1bV0coU2TJ3sI03',
  },
  'enterprise-bundle': {
    id: 'enterprise-bundle',
    name: 'OpenClaw Enterprise Bundle | OpenClaw 企業版套裝',
    tagline: 'Enterprise-grade MCP access. 10x Pro limit. Priority routing. | 企業級 MCP 存取。10 倍專業版上限。優先路由。',
    description: 'Enterprise-grade MCP access. 10x the Pro limit. Priority routing. Dedicated support. All 49 MCP tools with custom API endpoint prefix, 10,000 calls/day, and quarterly market intelligence reports. | 企業級 MCP 存取。10 倍專業版上限。優先路由。專屬支援。全部 49 個 MCP 工具，自訂 API 端點前綴，每日 10,000 次呼叫，季度市場情報報告。',
    features: [
      '🔓 All 49 MCP tools unlocked across 9 Cloudflare edge servers | 全部 49 個 MCP 工具跨 9 個 Cloudflare 邊緣伺服器解鎖',
      '⚡ Priority routing — your requests jump the queue | 優先路由 — 你的請求插隊處理',
      '🔑 10,000 API calls/day (10x Pro limit) | 每日 10,000 次 API 呼叫（10 倍專業版上限）',
      '🌐 Custom API endpoint prefix for your organization | 為你的組織自訂 API 端點前綴',
      '📧 Email support within 24h — dedicated response lane | 24 小時內電子郵件支援 — 專屬回覆通道',
      '📊 Quarterly market intelligence report (deep-dive, exclusive) | 季度市場情報報告（深度分析、獨家）',
    ],
    price_usd: 99,
    price_jpy: 14800,
    currency: 'USD',
    format: 'API_KEY',
    type: 'subscription',
    billing: 'monthly',
    badge: 'ENTERPRISE',
    emoji: '🏢',
  },
  'agent-builder-kit': {
    id: 'agent-builder-kit',
    name: 'AI Agent Builder Kit | AI 代理建置套件',
    tagline: 'Build and deploy your own MCP server in 2 hours | 2 小時內建置並部署你自己的 MCP 伺服器',
    description: 'Complete template and code for building MCP servers on Cloudflare Workers. Includes boilerplate with auth, rate limiting, landing page, and a step-by-step guide from zero to deployed on Smithery. | 在 Cloudflare Workers 上建置 MCP 伺服器的完整模板與程式碼。包含驗證、速率限制、著陸頁及從零到 Smithery 上架的逐步指南。',
    features: [
      '📦 Complete Cloudflare Worker MCP boilerplate (JSON-RPC 2.0, MCP 2025-03-26) | 完整 Cloudflare Worker MCP 樣板程式',
      '🔐 Auth built-in — API key validation, rate limiting, Pro tier logic | 內建驗證 — API 金鑰驗證、速率限制、專業版邏輯',
      '🌐 Landing page template — conversion-optimized, dark mode, mobile-ready | 著陸頁模板 — 轉換率優化、深色模式、行動裝置適配',
      '🚀 Smithery publishing guide — get listed and discovered in 30 minutes | Smithery 發布指南 — 30 分鐘內上架曝光',
      '💰 Monetization flow — PayPal + Stripe checkout out of the box | 變現流程 — 開箱即用 PayPal + Stripe 結帳',
      '📖 Step-by-step guide: zero to deployed in under 2 hours | 逐步指南：從零到部署不到 2 小時',
    ],
    price_usd: 69,
    price_jpy: 9800,
    currency: 'USD',
    format: 'ZIP',
    file_key: 'products/agent-builder-kit',
    badge: 'HOT',
    emoji: '🤖',
  },
  'mcp-audit-report': {
    id: 'mcp-audit-report',
    name: 'MCP Server Audit Report | MCP 伺服器審計報告',
    tagline: 'Professional code audit for your MCP server | 為你的 MCP 伺服器提供專業程式碼審計',
    description: 'Deep analysis of any MCP server\'s code quality, security, and performance. Powered by DeepSeek R1 chain-of-thought reasoning. Delivered as a structured PDF report within 24 hours. | 深度分析任何 MCP 伺服器的程式碼品質、安全性與效能。由 DeepSeek R1 思維鏈推理驅動。24 小時內交付結構化 PDF 報告。',
    features: [
      '🔍 Full security audit — auth flaws, injection risks, secrets exposure | 完整安全審計 — 驗證漏洞、注入風險、密鑰暴露',
      '⚡ Performance analysis — latency hotspots, cold start optimization | 效能分析 — 延遲熱點、冷啟動優化',
      '📋 Code quality report — structure, error handling, edge cases | 程式碼品質報告 — 結構、錯誤處理、邊界情況',
      '🛡️ Best practices checklist — MCP 2025-03-26 compliance | 最佳實踐清單 — MCP 2025-03-26 合規',
      '🤖 Powered by DeepSeek R1 chain-of-thought (700B reasoning model) | 由 DeepSeek R1 思維鏈驅動（700B 推理模型）',
      '📄 Delivered as structured PDF report within 24 hours | 24 小時內交付結構化 PDF 報告',
    ],
    price_usd: 99,
    price_jpy: 14800,
    currency: 'USD',
    format: 'SERVICE',
    type: 'service',
    badge: 'NEW',
    emoji: '🔎',
  },
  'api-gateway-pro': {
    id: 'api-gateway-pro',
    name: 'OpenClaw API Gateway Pro | OpenClaw API 閘道專業版',
    tagline: 'REST API access to all 49 tools. No MCP client needed. | 以 REST API 存取全部 49 個工具，無需 MCP 用戶端。',
    description: 'Single API key to access all 49 OpenClaw tools via clean REST endpoints — no MCP client required. Supports webhook notifications and works with any language or framework. | 單一 API 金鑰透過簡潔 REST 端點存取全部 49 個 OpenClaw 工具 — 無需 MCP 用戶端。支援 Webhook 通知，適用任何程式語言或框架。',
    features: [
      '🌐 REST endpoints for all 49 tools — simple JSON in, JSON out | 全部 49 個工具的 REST 端點 — 簡單 JSON 輸入/輸出',
      '🔑 One API key, one endpoint pattern, zero MCP config | 一個 API 金鑰、一個端點模式、零 MCP 設定',
      '🔔 Webhook notifications — push results to your URL | Webhook 通知 — 將結果推送到你的 URL',
      '⚡ Edge-deployed on Cloudflare Workers (<50ms global latency) | 部署於 Cloudflare Workers 邊緣節點（全球延遲 <50ms）',
      '📊 Usage dashboard — calls/day, errors, top tools | 使用儀表板 — 每日呼叫、錯誤、熱門工具',
      '🤖 Works with Python, Node.js, curl, or any HTTP client | 支援 Python、Node.js、curl 或任何 HTTP 用戶端',
    ],
    price_usd: 14,
    price_jpy: 2100,
    currency: 'USD',
    format: 'API_KEY',
    type: 'subscription',
    billing: 'monthly',
    badge: 'NEW',
    emoji: '🌐',
  },
  'revenue-automation-masterclass': {
    id: 'revenue-automation-masterclass',
    name: 'Revenue Automation Masterclass | 營收自動化大師班',
    tagline: 'The complete playbook for autonomous AI revenue systems. $0 to $10K/month. | 打造自主 AI 營收系統的完整攻略。從 $0 到 $10K/月。',
    description: 'Complete video course and playbook on building automated revenue with AI agents. Covers MCP servers, Cloudflare Workers, autonomous agents, and Telegram bots. Includes all source code. | 完整影片課程與攻略手冊，教你用 AI 代理打造自動化營收。涵蓋 MCP 伺服器、Cloudflare Workers、自主代理及 Telegram 機器人。包含所有原始碼。',
    features: [
      '🎬 Full video course — 8 modules, 4+ hours of hands-on content | 完整影片課程 — 8 個模組、4 小時以上實作內容',
      '📖 Playbook PDF — step-by-step from zero to $10K/month revenue | 攻略手冊 PDF — 從零到 $10K/月營收的逐步指南',
      '💻 All source code included — OpenClaw Workers, agent configs, Telegram bots | 包含所有原始碼 — OpenClaw Workers、代理設定、Telegram 機器人',
      '🤖 Autonomous agent setup — YEDAN-style 24/7 revenue systems | 自主代理設定 — YEDAN 風格 24/7 營收系統',
      '☁️ Cloudflare Workers monetization — MCP servers that earn while you sleep | Cloudflare Workers 變現 — 讓 MCP 伺服器在你睡覺時賺錢',
      '📱 Telegram bot integration — alerts, commands, revenue tracking | Telegram 機器人整合 — 警報、指令、營收追蹤',
    ],
    price_usd: 199,
    price_jpy: 29800,
    currency: 'USD',
    format: 'ZIP',
    file_key: 'products/revenue-automation-masterclass',
    badge: 'FLAGSHIP',
    emoji: '💎',
  },
  'ooda-system-blueprint': {
    id: 'ooda-system-blueprint',
    name: 'OODA Autonomous Intelligence System Blueprint | OODA 自主情報系統藍圖',
    tagline: 'Build a military-grade OODA loop with 6 AI workers — $0/month hosting | 用 6 個 AI 工作者建置軍事級 OODA 迴圈 — 每月 $0 託管',
    description: 'The exact architecture behind OpenClaw\'s autonomous intelligence empire. 6 Cloudflare Workers running 24/7 on free tier. Production code + deployment scripts included. | OpenClaw 自主情報帝國的完整架構。6 個 Cloudflare Workers 在免費方案上 24/7 運行。包含正式環境程式碼與部署腳本。',
    features: [
      '🏗️ Complete OODA architecture — Observe, Orient, Decide, Act, Feedback | 完整 OODA 架構 — 觀察、定向、決策、行動、反饋',
      '⚡ 6 Worker source code — Orchestrator, Intel Ops, Executor, Health, Revenue, Content | 6 個 Worker 原始碼 — 協調器、情報作戰、執行器、健康、營收、內容',
      '🔍 Real-time intel from 5 free APIs — GitHub, HackerNews, npm, HuggingFace, Smithery | 從 5 個免費 API 即時收集情報',
      '🧠 DeepSeek V3 AI analysis pipeline — auto-score and route intel to tasks | DeepSeek V3 AI 分析管線 — 自動評分並將情報轉為任務',
      '📱 Telegram bot integration — instant alerts for high-value opportunities | Telegram 機器人整合 — 高價值機會即時警報',
      '🚀 One-command deploy script — all 6 workers live in under 5 minutes | 一鍵部署腳本 — 6 個 Workers 5 分鐘內上線',
    ],
    price_usd: 79,
    price_jpy: 11800,
    currency: 'USD',
    format: 'ZIP',
    file_key: 'products/ooda-system-blueprint',
    badge: 'HOT',
    emoji: '🎯',
  },
  'ai-fleet-deployment': {
    id: 'ai-fleet-deployment',
    name: 'AI Fleet Deployment Kit | AI 艦隊部署套件',
    tagline: 'Deploy 6 autonomous AI workers on Cloudflare — free tier, zero DevOps | 在 Cloudflare 上部署 6 個自主 AI 工作者 — 免費方案、零 DevOps',
    description: 'Skip months of trial and error. Production-tested Cloudflare Worker templates for an autonomous AI fleet: health monitoring, revenue tracking, content generation, task execution, and market intelligence. All on free tier. | 跳過數月的摸索。正式環境驗證的 Cloudflare Worker 模板，打造自主 AI 艦隊：健康監控、營收追蹤、內容生成、任務執行與市場情報。全部在免費方案上運行。',
    features: [
      '☁️ 6 production Worker templates — tested at scale, battle-hardened | 6 個正式環境 Worker 模板 — 經過大規模測試、久經考驗',
      '🗄️ D1 database schemas — fleet_tasks, intel_feed, revenue_ledger, metrics | D1 資料庫結構 — fleet_tasks、intel_feed、revenue_ledger、metrics',
      '🔄 Cron scheduling — 2min to 30min intervals, fully autonomous | Cron 排程 — 2 分鐘到 30 分鐘間隔、完全自主',
      '🛡️ Self-healing patterns — auto-restart, error escalation, SLA tracking | 自我修復模式 — 自動重啟、錯誤升級、SLA 追蹤',
      '💰 Revenue sentinel — auto-detect orders, track income, daily reports | 營收哨兵 — 自動偵測訂單、追蹤收入、每日報告',
      '📊 Fleet dashboard API — JSON endpoints for monitoring all workers | 艦隊儀表板 API — 用於監控所有 Workers 的 JSON 端點',
    ],
    price_usd: 59,
    price_jpy: 8800,
    currency: 'USD',
    format: 'ZIP',
    file_key: 'products/ai-fleet-deployment',
    badge: 'NEW',
    emoji: '🛸',
  },
  'claude-code-pro-toolkit': {
    id: 'claude-code-pro-toolkit',
    name: 'Claude Code Pro Toolkit | Claude Code 專業版工具包',
    tagline: 'Power-user toolkit: custom hooks, skills, agents, and plugins | 進階使用者工具包：自訂鉤子、技能、代理與外掛',
    description: 'Everything you need to 10x your Claude Code productivity. Includes 20+ hooks, 15+ custom skills, agent configurations, and plugin templates. Based on 500+ hours of production usage. | 讓 Claude Code 生產力提升 10 倍的一切所需。包含 20+ 鉤子、15+ 自訂技能、代理設定及外掛模板。基於 500+ 小時正式環境使用經驗。',
    features: [
      '🪝 20+ production hooks — pre-commit validation, security checks, auto-formatting | 20+ 正式環境鉤子 — 提交前驗證、安全檢查、自動格式化',
      '⚡ 15+ custom skills — /deploy, /review-pr, /commit, /test-all, and more | 15+ 自訂技能 — /deploy、/review-pr、/commit、/test-all 等',
      '🤖 Agent configs — autonomous coding agents with guardrails | 代理設定 — 具有防護欄的自主程式設計代理',
      '🔌 Plugin templates — create and distribute your own Claude Code extensions | 外掛模板 — 建立並散佈你自己的 Claude Code 擴充',
      '📋 CLAUDE.md templates — project memory that actually works | CLAUDE.md 模板 — 真正有效的專案記憶',
      '📖 Power-user guide — keyboard shortcuts, context management, parallel agents | 進階使用者指南 — 鍵盤快捷鍵、上下文管理、平行代理',
    ],
    price_usd: 39,
    price_jpy: 5800,
    currency: 'USD',
    format: 'ZIP',
    file_key: 'products/claude-code-pro-toolkit',
    badge: 'NEW',
    emoji: '🔧',
  },
};

// ============================================================
// HELPERS
// ============================================================
function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) result += chars[arr[i] % chars.length];
  return result;
}

function generateOrderId() {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return `ORD-${ts}-${generateToken(6).toUpperCase()}`;
}

function generateApiKey() {
  return `oc_pro_${generateToken(40)}`;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-cache', ...CORS },
  });
}

// ============================================================
// HTML TEMPLATES
// ============================================================
function baseHTML(title, body, extra = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} | OpenClaw Store</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', -apple-system, sans-serif; background: #0a0a0a; color: #e0e0e0; line-height: 1.7; }
  a { color: #6c9fff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .container { max-width: 960px; margin: 0 auto; padding: 20px; }
  .nav { background: rgba(15,15,15,0.95); backdrop-filter: blur(10px); border-bottom: 1px solid #222; padding: 16px 0; position: sticky; top: 0; z-index: 100; }
  .nav .container { display: flex; justify-content: space-between; align-items: center; }
  .nav-brand { font-size: 1.3rem; font-weight: bold; color: #fff; }
  .nav-brand span { color: #ff6b35; }
  .hero { text-align: center; padding: 60px 20px 40px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); }
  .hero h1 { font-size: 2.2rem; margin-bottom: 16px; color: #fff; }
  .hero p { font-size: 1.1rem; color: #aaa; max-width: 600px; margin: 0 auto; }
  .badge { display: inline-block; background: linear-gradient(135deg, #ff6b35, #ff4500); color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; letter-spacing: 1px; margin-bottom: 12px; }
  .product-card { background: #151515; border: 1px solid #2a2a2a; border-radius: 16px; padding: 32px; margin: 24px 0; transition: border-color 0.3s; }
  .product-card:hover { border-color: #ff6b35; }
  .product-title { font-size: 1.5rem; color: #fff; margin-bottom: 8px; }
  .product-tagline { color: #888; margin-bottom: 16px; }
  .product-features { list-style: none; padding: 0; margin: 16px 0; }
  .product-features li { padding: 8px 0; border-bottom: 1px solid #1e1e1e; font-size: 0.95rem; }
  .price-box { display: flex; align-items: center; gap: 16px; margin: 24px 0; flex-wrap: wrap; }
  .price-main { font-size: 2.5rem; font-weight: bold; color: #ff6b35; }
  .price-alt { font-size: 1.1rem; color: #666; }
  .btn { display: inline-block; padding: 14px 32px; border-radius: 10px; font-size: 1rem; font-weight: bold; cursor: pointer; border: none; text-align: center; transition: all 0.3s; text-decoration: none; }
  .btn-paypal { background: #0070ba; color: #fff; }
  .btn-paypal:hover { background: #005ea6; text-decoration: none; }
  .btn-stripe { background: #635bff; color: #fff; }
  .btn-stripe:hover { background: #5147e5; text-decoration: none; }
  .btn-download { background: linear-gradient(135deg, #00c853, #00e676); color: #000; font-size: 1.2rem; padding: 18px 40px; }
  .btn-download:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,200,83,0.3); text-decoration: none; }
  .payment-buttons { display: flex; gap: 16px; flex-wrap: wrap; margin: 24px 0; }
  .guarantee { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center; }
  .guarantee h3 { color: #4caf50; margin-bottom: 8px; }
  .footer { text-align: center; padding: 40px 20px; color: #555; font-size: 0.85rem; border-top: 1px solid #1e1e1e; margin-top: 60px; }
  .success-box { background: linear-gradient(135deg, #1b5e20, #2e7d32); border-radius: 16px; padding: 40px; text-align: center; margin: 40px 0; }
  .success-box h1 { color: #fff; font-size: 2rem; margin-bottom: 16px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin: 32px 0; }
  .stat { background: #1a1a1a; border-radius: 12px; padding: 20px; text-align: center; }
  .stat-num { font-size: 2rem; font-weight: bold; color: #ff6b35; }
  .stat-label { font-size: 0.8rem; color: #888; margin-top: 4px; }
  .testimonial { background: #151515; border-left: 3px solid #ff6b35; border-radius: 0 12px 12px 0; padding: 20px; margin: 16px 0; font-style: italic; }
  @media (max-width: 600px) { .hero h1 { font-size: 1.6rem; } .price-main { font-size: 2rem; } .payment-buttons { flex-direction: column; } .btn { width: 100%; } }
  ${extra}
</style>
</head>
<body>
<nav class="nav"><div class="container"><a href="/" class="nav-brand">🦊 Open<span>Claw</span> Store</a><a href="https://note.com/yedanyagami" style="color:#888;">note.com</a></div></nav>
${body}
<footer class="footer">
<div style="margin-bottom:16px;">
  <span style="display:inline-block; background:#1a1a1a; border:1px solid #333; padding:4px 10px; border-radius:6px; font-size:0.7rem; color:#888; margin:2px;">🅿️ PayPal</span>
  <span style="display:inline-block; background:#1a1a1a; border:1px solid #333; padding:4px 10px; border-radius:6px; font-size:0.7rem; color:#888; margin:2px;">💳 Card</span>
  <span style="display:inline-block; background:#1a1a1a; border:1px solid #333; padding:4px 10px; border-radius:6px; font-size:0.7rem; color:#888; margin:2px;">₿ Crypto</span>
  <span style="display:inline-block; background:#1a1a1a; border:1px solid #333; padding:4px 10px; border-radius:6px; font-size:0.7rem; color:#888; margin:2px;">🔒 SSL Secured | SSL 安全加密</span>
</div>
<p style="margin-bottom:12px;">
  <a href="https://openclaw-intel-mcp.yagami8095.workers.dev/mcp">📊 Intel MCP</a> &middot;
  <a href="https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp">🔮 Fortune MCP</a> &middot;
  <a href="https://openclaw-intel-api.yagami8095.workers.dev">🔑 Intel API</a> &middot;
  <a href="https://note.com/yedanyagami">📝 note.com</a>
</p>
<p>&copy; 2026 OpenClaw Intelligence</p>
<p style="color:#444; font-size:0.75rem; margin-top:6px;">Taichung, Taiwan | 台灣台中 &middot; Yagami8095@gmail.com</p>
<p style="color:#333; font-size:0.65rem; margin-top:4px;">Powered by Cloudflare Workers | 由 Cloudflare Workers 驅動 &middot; MCP Protocol 2025-03-26</p>
</footer>
</body>
</html>`;
}

function catalogPage(env) {
  const productCards = Object.values(PRODUCTS).map(p => {
    const isApi = p.type === 'api_key';
    return `
    <div class="product-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <span class="badge">${p.badge}</span>
        <span style="font-size:0.7rem; color:#666;">${isApi ? 'Instant API Key | 即時 API 金鑰' : 'Instant Download | 即時下載'} &middot; ${p.format}</span>
      </div>
      <h2 class="product-title">${p.emoji} ${p.name}</h2>
      <p class="product-tagline">${p.tagline}</p>
      <div class="price-box">
        <span class="price-main">$${p.price_usd}</span>
        <span class="price-alt">(\u00A5${p.price_jpy.toLocaleString()})</span>
      </div>
      <p style="color:#aaa; margin-bottom:16px;">${p.description}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <a href="/products/${p.id}" class="btn btn-stripe">View Details | 查看詳情 &rarr;</a>
        ${p.stripe_link ? `<a href="${p.stripe_link}" class="btn" style="background:#ff4500;color:#fff;text-decoration:none;font-size:0.85rem;padding:10px 16px;" target="_blank">Buy Now &rarr;</a>` : ''}
        <div style="display:flex; gap:4px; flex-wrap:wrap;">
          <span style="font-size:0.65rem; color:#555; background:#111; padding:2px 8px; border-radius:4px;">PayPal</span>
          <span style="font-size:0.65rem; color:#555; background:#111; padding:2px 8px; border-radius:4px;">Crypto</span>
          <span style="font-size:0.65rem; color:#555; background:#111; padding:2px 8px; border-radius:4px;">Card</span>
        </div>
      </div>
    </div>`;
  }).join('');

  return baseHTML('AI Digital Products & MCP Intelligence Tools | AI 數位產品與 MCP 情報工具', `
    <div class="hero">
      <h1>🧠 AI Intelligence Tools & Digital Arsenal | AI 情報工具與數位軍火庫</h1>
      <p>MCP-native market intelligence, battle-tested AI prompts, and automation templates.<br>
      Built for AI agents. Used by developers. Powered by Cloudflare.</p>
      <p style="color:#888; font-size:0.85rem; margin-top:8px;">MCP 原生市場情報、實戰 AI 提示詞、自動化模板 — 為 AI 代理而生<br>
      MCP対応マーケットインテリジェンス・実戦AIプロンプト・自動化テンプレート</p>
      <div style="margin-top:24px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
        <span style="background:rgba(255,107,53,0.15); border:1px solid rgba(255,107,53,0.3); padding:6px 14px; border-radius:8px; font-size:0.8rem; color:#ff6b35;">🔌 MCP Protocol | MCP 協議</span>
        <span style="background:rgba(255,107,53,0.15); border:1px solid rgba(255,107,53,0.3); padding:6px 14px; border-radius:8px; font-size:0.8rem; color:#ff6b35;">⚡ Instant Delivery | 即時交付</span>
        <span style="background:rgba(255,107,53,0.15); border:1px solid rgba(255,107,53,0.3); padding:6px 14px; border-radius:8px; font-size:0.8rem; color:#ff6b35;">🔒 Multi-Payment | 多元支付</span>
      </div>
    </div>
    <div class="container">
      <div class="stats">
        <div class="stat"><div class="stat-num">9</div><div class="stat-label">MCP Servers | MCP 伺服器</div></div>
        <div class="stat"><div class="stat-num">49</div><div class="stat-label">AI Tools | AI 工具</div></div>
        <div class="stat"><div class="stat-num">15</div><div class="stat-label">Products | 產品</div></div>
        <div class="stat"><div class="stat-num">24/7</div><div class="stat-label">Always On | 永不停歇</div></div>
      </div>
      <div style="background:linear-gradient(135deg,#ff1744,#d500f9);border-radius:12px;padding:24px;margin:24px 0;text-align:center;border:2px solid #ff1744;position:relative;overflow:hidden;animation:pulse 2s infinite;">
        <style>@keyframes pulse{0%,100%{box-shadow:0 0 20px rgba(255,23,68,0.3)}50%{box-shadow:0 0 40px rgba(255,23,68,0.6)}}</style>
        <div style="position:absolute;top:10px;right:-30px;background:#fff;color:#ff1744;padding:4px 40px;font-size:0.75rem;font-weight:bold;transform:rotate(45deg);letter-spacing:2px;">FLASH SALE</div>
        <p style="color:rgba(255,255,255,0.8);font-size:0.8rem;letter-spacing:3px;margin-bottom:8px;">50% CHEAPER THAN COMPETITORS | 比競品便宜 50%</p>
        <h2 style="color:#fff;margin-bottom:8px;font-size:1.6rem;">All 49 AI Tools — $14/mo (Half of Composio & Glama) | 全部 49 個 AI 工具 — $14/月（競品一半）</h2>
        <p style="color:rgba(255,255,255,0.9);margin-bottom:16px;font-size:1rem;">9 MCP servers. 1000 calls/day. Composio charges $29. Glama charges $26. We charge $14.<br><span style="font-size:0.9rem;">9 個 MCP 伺服器。每日 1000 次呼叫。Composio 收 $29、Glama 收 $26、我們只收 $14。</span></p>
        <div style="display:flex;gap:16px;justify-content:center;align-items:center;flex-wrap:wrap;margin-bottom:16px;">
          <div style="background:rgba(0,0,0,0.3);padding:12px 20px;border-radius:8px;">
            <span style="text-decoration:line-through;color:rgba(255,255,255,0.5);font-size:1.1rem;">$29/mo</span>
            <span style="color:#FFD700;font-size:1.8rem;font-weight:bold;margin-left:8px;">$14/mo</span>
          </div>
          <span style="color:#FFD700;font-size:0.9rem;font-weight:bold;">Save 50% vs competitors | 比競品省 50%</span>
        </div>
        <a href="/products/ecosystem-pro" class="btn" style="background:#FFD700;color:#1a1a2e;font-size:1.1rem;padding:14px 40px;text-decoration:none;display:inline-block;border-radius:8px;font-weight:bold;box-shadow:0 4px 15px rgba(255,215,0,0.4);">Get Pro Now | 立即獲取 &rarr;</a>
        <p style="color:rgba(255,255,255,0.5);font-size:0.7rem;margin-top:12px;">Works with Claude Code, Cursor, Windsurf, Cline | 支援 Claude Code、Cursor、Windsurf、Cline</p>
      </div>

      <div style="background:linear-gradient(135deg,#FFD700,#FF8C00);border-radius:12px;padding:20px;margin:24px 0;text-align:center;border:2px solid #FFD700;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-5px;right:-5px;background:#ff0000;color:#fff;padding:4px 20px;font-size:0.75rem;font-weight:bold;transform:rotate(45deg);transform-origin:center;letter-spacing:1px;">BEST DEAL</div>
        <h2 style="color:#1a1a2e;margin-bottom:8px;font-size:1.4rem;">Enterprise Bundle $99 — Save 82% | 企業套裝 $99 — 節省 82%</h2>
        <p style="color:#333;margin-bottom:12px;font-size:0.95rem;">All 15 products + All 9 MCP servers + 10,000 calls/day. Worth $544 individually.<br><span style="font-size:0.85rem;color:#555;">全部 15 個產品 + 全部 9 個 MCP 伺服器 + 每日 10,000 次呼叫。單買價值 $544。</span></p>
        <a href="/products/enterprise-bundle" class="btn" style="background:#1a1a2e;color:#FFD700;font-size:1rem;padding:12px 36px;text-decoration:none;display:inline-block;border-radius:8px;font-weight:bold;">Get Enterprise Bundle | 立即購買 &rarr;</a>
        <p style="color:#555;font-size:0.7rem;margin-top:8px;">Trusted by AI developers worldwide | 全球 AI 開發者信賴</p>
      </div>
      <div style="background:linear-gradient(135deg,#ff6b35,#ff4500);border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
        <h2 style="color:#fff;margin-bottom:12px;">Try All 49 Tools Free for 7 Days</h2>
        <p style="color:rgba(255,255,255,0.9);margin-bottom:8px;">Sign in with GitHub. 100 calls/day across all 9 servers. No credit card required.</p>
        <p style="color:rgba(255,255,255,0.7);font-size:0.85rem;margin-bottom:16px;">GitHub 登入即可免費試用 49 個工具 7 天 | GitHubログインで49ツール7日間無料</p>
        <a href="/auth/login" class="btn" style="background:#fff;color:#ff4500;font-size:1.1rem;padding:16px 40px;text-decoration:none;display:inline-block;border-radius:8px;font-weight:bold;">Start Free Trial &rarr;</a>
      </div>

      <div style="background:#0d1117; border:1px solid #30363d; border-radius:12px; padding:32px; margin:24px 0;">
        <h3 style="color:#fff; margin-bottom:8px; text-align:center; font-size:1.4rem;">Compare Plans | 方案比較</h3>
        <p style="color:#888; text-align:center; font-size:0.85rem; margin-bottom:24px;">Choose the plan that fits your workflow | 選擇適合你工作流程的方案</p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
          <div style="background:#151515; border:1px solid #2a2a2a; border-radius:12px; padding:24px; text-align:center;">
            <p style="color:#888; font-size:0.75rem; letter-spacing:2px; margin-bottom:4px;">FREE</p>
            <p style="color:#fff; font-size:2rem; font-weight:bold;">$0</p>
            <p style="color:#666; font-size:0.8rem; margin-bottom:16px;">forever | 永久</p>
            <div style="text-align:left; font-size:0.85rem; color:#aaa; line-height:2;">
              <p>&#10003; 9 MCP servers</p>
              <p>&#10003; 49 tools</p>
              <p>&#10003; 10 calls/day</p>
              <p style="color:#555;">&#10007; Priority routing</p>
              <p style="color:#555;">&#10007; Support</p>
            </div>
            <a href="https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers" class="btn" style="background:#333;color:#fff;text-decoration:none;display:block;margin-top:16px;padding:10px;border-radius:8px;font-size:0.85rem;" target="_blank">Get Started</a>
          </div>
          <div style="background:#1a1a2e; border:2px solid #ff6b35; border-radius:12px; padding:24px; text-align:center; position:relative;">
            <div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#ff6b35;color:#fff;padding:2px 16px;border-radius:12px;font-size:0.7rem;font-weight:bold;">MOST POPULAR</div>
            <p style="color:#ff6b35; font-size:0.75rem; letter-spacing:2px; margin-bottom:4px;">PRO</p>
            <p style="color:#fff; font-size:2rem; font-weight:bold;">$14</p>
            <p style="color:#666; font-size:0.8rem; margin-bottom:16px;">/month | 每月</p>
            <div style="text-align:left; font-size:0.85rem; color:#aaa; line-height:2;">
              <p style="color:#4caf50;">&#10003; 9 MCP servers</p>
              <p style="color:#4caf50;">&#10003; 49 tools</p>
              <p style="color:#4caf50;">&#10003; <b style="color:#ff6b35;">1,000</b> calls/day</p>
              <p style="color:#4caf50;">&#10003; Single API key</p>
              <p style="color:#555;">&#10007; Priority routing</p>
            </div>
            <a href="/products/ecosystem-pro" class="btn" style="background:#ff6b35;color:#fff;text-decoration:none;display:block;margin-top:16px;padding:10px;border-radius:8px;font-size:0.85rem;font-weight:bold;">Get Pro &rarr;</a>
          </div>
          <div style="background:#151515; border:1px solid #FFD700; border-radius:12px; padding:24px; text-align:center;">
            <p style="color:#FFD700; font-size:0.75rem; letter-spacing:2px; margin-bottom:4px;">ENTERPRISE</p>
            <p style="color:#fff; font-size:2rem; font-weight:bold;">$99</p>
            <p style="color:#666; font-size:0.8rem; margin-bottom:16px;">/month | 每月</p>
            <div style="text-align:left; font-size:0.85rem; color:#aaa; line-height:2;">
              <p style="color:#4caf50;">&#10003; All 49 tools</p>
              <p style="color:#4caf50;">&#10003; <b style="color:#FFD700;">10,000</b> calls/day</p>
              <p style="color:#4caf50;">&#10003; Priority routing</p>
              <p style="color:#4caf50;">&#10003; Custom endpoint</p>
              <p style="color:#4caf50;">&#10003; 24h email support</p>
            </div>
            <a href="/products/enterprise-bundle" class="btn" style="background:#FFD700;color:#1a1a2e;text-decoration:none;display:block;margin-top:16px;padding:10px;border-radius:8px;font-size:0.85rem;font-weight:bold;">Contact Sales</a>
          </div>
        </div>
      </div>

      <div style="background:#0d1117; border:1px solid #30363d; border-radius:12px; padding:24px; margin:24px 0;">
        <h3 style="color:#fff; margin-bottom:16px; text-align:center;">🔌 Free MCP Servers — Connect in Seconds | 免費 MCP 伺服器 — 秒速連接</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
          <div style="background:#151515; border:1px solid #2a2a2a; border-radius:8px; padding:16px;">
            <p style="color:#ff6b35; font-weight:bold;">📊 OpenClaw Intel</p>
            <p style="color:#888; font-size:0.85rem; margin:8px 0;">AI market intelligence — GitHub stars, releases, growth trends. | AI 市場情報 — GitHub 星數、版本、成長趨勢。</p>
            <code style="background:#000; display:block; padding:8px; border-radius:4px; font-size:0.7rem; color:#4caf50; word-break:break-all; margin-top:8px;">https://openclaw-intel-mcp.yagami8095.workers.dev/mcp</code>
          </div>
          <div style="background:#151515; border:1px solid #2a2a2a; border-radius:8px; padding:16px;">
            <p style="color:#9c27b0; font-weight:bold;">🔮 OpenClaw Fortune</p>
            <p style="color:#888; font-size:0.85rem; margin:8px 0;">Daily zodiac horoscope + tarot readings for all 12 signs. | 每日星座運勢 + 塔羅牌占卜，12 星座全覆蓋。</p>
            <code style="background:#000; display:block; padding:8px; border-radius:4px; font-size:0.7rem; color:#4caf50; word-break:break-all; margin-top:8px;">https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp</code>
          </div>
          <div style="background:#151515; border:1px solid #2a2a2a; border-radius:8px; padding:16px;">
            <p style="color:#2196f3; font-weight:bold;">🧰 JSON Toolkit</p>
            <p style="color:#888; font-size:0.85rem; margin:8px 0;">Format, validate, diff, query, transform JSON. | JSON 格式化、驗證、差異比較、查詢、轉換。</p>
            <code style="background:#000; display:block; padding:8px; border-radius:4px; font-size:0.7rem; color:#4caf50; word-break:break-all; margin-top:8px;">https://json-toolkit-mcp.yagami8095.workers.dev/mcp</code>
          </div>
          <div style="background:#151515; border:1px solid #2a2a2a; border-radius:8px; padding:16px;">
            <p style="color:#4caf50; font-weight:bold;">🔤 Regex Engine</p>
            <p style="color:#888; font-size:0.85rem; margin:8px 0;">Test, explain, build regex from English. | 測試、解釋、從自然語言建立正規表達式。</p>
            <code style="background:#000; display:block; padding:8px; border-radius:4px; font-size:0.7rem; color:#4caf50; word-break:break-all; margin-top:8px;">https://regex-engine-mcp.yagami8095.workers.dev/mcp</code>
          </div>
          <div style="background:#151515; border:1px solid #2a2a2a; border-radius:8px; padding:16px;">
            <p style="color:#e91e63; font-weight:bold;">🎨 Color Palette</p>
            <p style="color:#888; font-size:0.85rem; margin:8px 0;">WCAG contrast, harmonies, gradients, Tailwind. | WCAG 對比度、配色、漸層、Tailwind。</p>
            <code style="background:#000; display:block; padding:8px; border-radius:4px; font-size:0.7rem; color:#4caf50; word-break:break-all; margin-top:8px;">https://color-palette-mcp.yagami8095.workers.dev/mcp</code>
          </div>
          <div style="background:#151515; border:1px solid #2a2a2a; border-radius:8px; padding:16px;">
            <p style="color:#ff9800; font-weight:bold;">⏰ Timestamp</p>
            <p style="color:#888; font-size:0.85rem; margin:8px 0;">Unix/ISO convert, timezone, cron parse. | Unix/ISO 轉換、時區、Cron 解析。</p>
            <code style="background:#000; display:block; padding:8px; border-radius:4px; font-size:0.7rem; color:#4caf50; word-break:break-all; margin-top:8px;">https://timestamp-converter-mcp.yagami8095.workers.dev/mcp</code>
          </div>
          <div style="background:#151515; border:1px solid #2a2a2a; border-radius:8px; padding:16px;">
            <p style="color:#00bcd4; font-weight:bold;">✨ Prompt Enhancer</p>
            <p style="color:#888; font-size:0.85rem; margin:8px 0;">Optimize, score, convert AI prompts. | AI 提示詞優化、評分、格式轉換。</p>
            <code style="background:#000; display:block; padding:8px; border-radius:4px; font-size:0.7rem; color:#4caf50; word-break:break-all; margin-top:8px;">https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp</code>
          </div>
          <div style="background:#151515; border:1px solid #2a2a2a; border-radius:8px; padding:16px;">
            <p style="color:#795548; font-weight:bold;">📖 MoltBook Publisher</p>
            <p style="color:#888; font-size:0.85rem; margin:8px 0;">MD to HTML, SEO meta, translation, outlines. | Markdown 轉 HTML、SEO 優化、翻譯、大綱。</p>
            <code style="background:#000; display:block; padding:8px; border-radius:4px; font-size:0.7rem; color:#4caf50; word-break:break-all; margin-top:8px;">https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp</code>
          </div>
          <div style="background:#151515; border:1px solid #2a2a2a; border-radius:8px; padding:16px;">
            <p style="color:#607d8b; font-weight:bold;">🤖 AgentForge Compare</p>
            <p style="color:#888; font-size:0.85rem; margin:8px 0;">Side-by-side AI tool comparison. | AI 工具並排比較。</p>
            <code style="background:#000; display:block; padding:8px; border-radius:4px; font-size:0.7rem; color:#4caf50; word-break:break-all; margin-top:8px;">https://agentforge-compare-mcp.yagami8095.workers.dev/mcp</code>
          </div>
        </div>
        <p style="text-align:center; margin-top:16px; font-size:0.8rem; color:#666;">Works with Claude Code, Cursor, Windsurf, Cline — just add the URL to your MCP config<br>
        支援 Claude Code、Cursor、Windsurf、Cline — 只需加入 URL | Claude Code・Cursor・Windsurf・Cline対応</p>
      </div>

      ${productCards}

      <div style="text-align:center; margin:40px 0 20px; padding:24px; background:#151515; border-radius:12px; border:1px solid #2a2a2a;">
        <p style="color:#888; font-size:0.85rem;">🔒 Secure payments via PayPal, credit card, USDC, and bank transfer</p>
        <p style="color:#555; font-size:0.75rem; margin-top:4px;">All products include instant delivery. Digital goods — no shipping required.</p>
        <p style="color:#555; font-size:0.75rem;">安全支付：PayPal、信用卡、USDC、銀行轉帳 | 即時配送 | 安全な決済：PayPal・クレジットカード・USDC・銀行振込 | 即時配信</p>
      </div>
    </div>
  `);
}

function productPage(product, env) {
  const hasPaypal = !!env.PAYPAL_BUSINESS_EMAIL;
  const hasStripe = !!env.STRIPE_SECRET_KEY;
  const baseUrl = 'https://product-store.yagami8095.workers.dev';
  const isApiKey = product.type === 'api_key';

  const paypalBtn = hasPaypal ? `
    <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top" style="display:inline;">
      <input type="hidden" name="cmd" value="_xclick">
      <input type="hidden" name="business" value="${env.PAYPAL_BUSINESS_EMAIL}">
      <input type="hidden" name="item_name" value="${product.name}">
      <input type="hidden" name="item_number" value="${product.id}">
      <input type="hidden" name="amount" value="${product.price_usd}.00">
      <input type="hidden" name="currency_code" value="USD">
      <input type="hidden" name="return" value="${baseUrl}/success?product=${product.id}&method=paypal">
      <input type="hidden" name="cancel_return" value="${baseUrl}/products/${product.id}">
      <input type="hidden" name="notify_url" value="${baseUrl}/webhooks/paypal">
      <input type="hidden" name="no_shipping" value="1">
      <input type="hidden" name="no_note" value="1">
      <button type="submit" class="btn btn-paypal">🅿️ PayPal — $${product.price_usd}</button>
    </form>` : '';

  const stripeBtn = product.stripe_link ? `
    <a href="${product.stripe_link}" class="btn btn-stripe" target="_blank" style="text-decoration:none;">💳 Card / Apple Pay / Google Pay — \u00A5${product.price_jpy.toLocaleString()}</a>` : (hasStripe ? `
    <form action="/checkout/stripe" method="post" style="display:inline;">
      <input type="hidden" name="product_id" value="${product.id}">
      <button type="submit" class="btn btn-stripe">💳 Card — $${product.price_usd}</button>
    </form>` : '');

  const cryptoSection = `
    <div style="background:#1a1a2e; border:1px solid #555; border-radius:12px; padding:20px; margin:16px 0;">
      <p style="color:#fff; font-weight:bold; margin-bottom:12px;">💎 USDC Payment (Base L2)</p>
      <p style="color:#888; font-size:0.85rem; margin-bottom:8px;">Send USDC on Base network to:</p>
      <code style="display:block; background:#0d1117; color:#58a6ff; padding:10px; border-radius:6px; font-size:0.8rem; word-break:break-all; margin-bottom:8px;">0x72aa56DAe3819c75C545c57778cc404092d60731</code>
      <p style="color:#666; font-size:0.75rem;">Send exact amount in USDC. Email yagami8095@gmail.com with tx hash for instant delivery.</p>
    </div>
    <div style="background:#1a2e1a; border:1px solid #555; border-radius:12px; padding:20px; margin:16px 0;">
      <p style="color:#fff; font-weight:bold; margin-bottom:12px;">🏦 Bank Transfer (Taiwan)</p>
      <p style="color:#888; font-size:0.85rem;">Mega Bank (兆豐國際商業銀行) — 大里分行</p>
      <p style="color:#888; font-size:0.85rem;">Account: <code style="color:#3fb950;">24110234810</code></p>
      <p style="color:#888; font-size:0.85rem;">SWIFT: <code style="color:#3fb950;">ICBCTWTP017</code></p>
      <p style="color:#666; font-size:0.75rem; margin-top:8px;">Email yagami8095@gmail.com with transfer receipt for delivery.</p>
    </div>`;

  const paypalMeFallback = `
    <a href="https://paypal.me/Yagami8095/${product.price_usd}" class="btn btn-paypal" target="_blank" style="background:#003087;">🅿️ PayPal.me — $${product.price_usd}</a>`;

  const featuresList = product.features.map(f => `<li>${f}</li>`).join('');
  const deliveryLabel = isApiKey ? 'Instant API Key | 即時 API 金鑰' : 'Instant Download | 即時下載';

  return baseHTML(product.name, `
    <div class="container" style="padding-top:40px;">
      <a href="/" style="color:#888;">&larr; Back to Store | 返回商店</a>
      <div class="product-card" style="margin-top:20px; border-color:#ff6b35;">
        <span class="badge">${product.badge}</span>
        <h1 class="product-title" style="font-size:1.8rem;">${product.emoji} ${product.name}</h1>
        <p class="product-tagline">${product.tagline}</p>

        <div class="price-box">
          <span class="price-main">$${product.price_usd}</span>
          <span class="price-alt">(\u00A5${product.price_jpy.toLocaleString()})</span>
          <span style="background:#2e7d32; color:#fff; padding:4px 12px; border-radius:8px; font-size:0.8rem;">${deliveryLabel}</span>
        </div>

        <p style="color:#ccc; font-size:1.05rem; margin:20px 0;">${product.description}</p>

        <h3 style="color:#fff; margin:24px 0 12px;">📦 ${isApiKey ? 'What You Get | 你將獲得' : 'What\'s Included | 收錄內容'}</h3>
        <ul class="product-features">${featuresList}</ul>

        <!-- Payment Methods -->
        <div style="margin-top:32px;">
          <h3 style="color:#fff; margin-bottom:16px;">💰 Choose Payment Method | 選擇付款方式</h3>
          <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
            <span style="background:#1a1a1a; border:1px solid #333; padding:4px 12px; border-radius:6px; font-size:0.75rem; color:#aaa;">🅿️ PayPal</span>
            ${hasStripe ? '<span style="background:#1a1a1a; border:1px solid #333; padding:4px 12px; border-radius:6px; font-size:0.75rem; color:#aaa;">💳 Card</span>' : ''}
            <span style="background:#1a1a1a; border:1px solid #333; padding:4px 12px; border-radius:6px; font-size:0.75rem; color:#aaa;">₿ Crypto</span>
            <span style="background:#1a1a1a; border:1px solid #333; padding:4px 12px; border-radius:6px; font-size:0.75rem; color:#aaa;">🔒 Secure | 安全</span>
          </div>
          <div class="payment-buttons">
            ${paypalBtn}
            ${stripeBtn}
            ${paypalMeFallback}
          </div>
          ${cryptoSection}
        </div>
      </div>

      <div class="guarantee">
        <h3>✅ Guarantee | 保證</h3>
        <p>${isApiKey ? 'Instant API key delivery after payment. 1000 calls/day. Works with any MCP client. | 付款後即時交付 API 金鑰。每日 1000 次呼叫。支援任何 MCP 用戶端。' : 'Instant download after purchase. Copy & paste ready. | 購買後即可下載。複製貼上即可使用。'}</p>
        <p style="color:#888; margin-top:8px; font-size:0.85rem;">${isApiKey ? 'Questions? Email Yagami8095@gmail.com | 有問題？Email Yagami8095@gmail.com' : 'Digital product — no refunds. Contact us if unsatisfied. | 數位商品不可退款。如有不滿請聯繫我們。'}</p>
      </div>

      <div class="testimonial">
        <p>${isApiKey
          ? '"OpenClaw Intel gives me real-time data on AI tool adoption. Essential for staying ahead of the market." | 「OpenClaw Intel 給我 AI 工具採用的即時數據，是保持市場領先的必備工具。」'
          : '"This prompt collection dramatically improved my daily workflow. The code review and SEO prompts are game-changers." | 「這個提示詞集大幅改善了我的日常工作效率。程式碼審查和 SEO 提示詞堪稱神器。」'}</p>
        <p style="color:#ff6b35; margin-top:8px; font-style:normal;">${isApiKey ? '— AI Developer | AI 開發者' : '— AI Engineer T.K. | AI 工程師 T.K.'}</p>
      </div>

      <div style="background:#0d1117; border:1px solid #30363d; border-radius:12px; padding:24px; margin:24px 0;">
        <h3 style="color:#fff; margin-bottom:12px;">🎯 Perfect For | 適合對象</h3>
        <ul style="list-style:none; padding:0;">
          ${isApiKey ? `
          <li style="padding:6px 0;">✅ AI developers building competitive intelligence into their apps | 將競爭情報整合進應用的 AI 開發者</li>
          <li style="padding:6px 0;">✅ Teams tracking AI tool adoption (GitHub stars, releases, growth) | 追蹤 AI 工具採用情況的團隊</li>
          <li style="padding:6px 0;">✅ Researchers monitoring the AI agent ecosystem in real-time | 即時監控 AI 代理生態系的研究者</li>
          <li style="padding:6px 0;">✅ Anyone using Claude Code, Cursor, Windsurf, or Cline who wants market data | 使用 Claude Code、Cursor 等工具且需要市場數據的人</li>
          ` : `
          <li style="padding:6px 0;">✅ Want to leverage AI at work but don't know how to write prompts | 想在工作中運用 AI 但不知如何撰寫提示詞</li>
          <li style="padding:6px 0;">✅ Using ChatGPT/Claude but want to be more efficient | 正在使用 ChatGPT/Claude 但想更有效率</li>
          <li style="padding:6px 0;">✅ Engineers, marketers, and writers seeking productivity gains | 工程師、行銷人員、寫手追求生產力提升</li>
          <li style="padding:6px 0;">✅ Need practical, battle-tested prompts for real work | 需要實戰型、經過驗證的提示詞</li>
          `}
        </ul>
      </div>
    </div>
  `);
}

function successPage(product, downloadToken) {
  return baseHTML('Purchase Complete | 購買完成', `
    <div class="container" style="padding-top:40px;">
      <div class="success-box">
        <div style="font-size:4rem; margin-bottom:16px;">🎉</div>
        <h1>Thank You for Your Purchase! | 感謝您的購買！</h1>
        <p style="color:#c8e6c9; margin-top:12px;">Your download for "${product.name}" is ready. | 「${product.name}」已準備好下載。</p>
      </div>

      <div style="text-align:center; margin:32px 0;">
        <a href="/download/${downloadToken}" class="btn btn-download">📥 Download Now | 立即下載</a>
        <p style="color:#888; margin-top:12px; font-size:0.85rem;">Download link is valid for 24 hours. | 下載連結 24 小時內有效。</p>
      </div>

      <div class="product-card" style="text-align:center;">
        <h3 style="color:#fff; margin-bottom:16px;">📣 Want More AI Tips? | 想要更多 AI 技巧？</h3>
        <p style="margin-bottom:16px;">Daily AI tips, latest tool updates, and practical techniques. | 每日 AI 技巧、最新工具資訊及實用技術。</p>
        <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
          <a href="https://note.com/yedanyagami" class="btn" style="background:#4caf50; color:#fff;" target="_blank">📝 Follow on note.com | 追蹤 note.com</a>
          <a href="https://fortune-api.yagami8095.workers.dev" class="btn" style="background:#9c27b0; color:#fff;" target="_blank">🔮 Daily Fortune | 每日占卜</a>
        </div>
      </div>
    </div>
  `);
}

function apiKeySuccessPage(product, apiKey) {
  return baseHTML('API Key Provisioned | API 金鑰已發放', `
    <div class="container" style="padding-top:40px;">
      <div class="success-box">
        <div style="font-size:4rem; margin-bottom:16px;">🔑</div>
        <h1>Your Pro API Key is Ready! | 你的專業版 API 金鑰已就緒！</h1>
        <p style="color:#c8e6c9; margin-top:12px;">OpenClaw Intel Pro — full market intelligence unlocked. | OpenClaw 情報專業版 — 完整市場情報已解鎖。</p>
      </div>

      <div class="product-card" style="border-color:#ff6b35;">
        <h3 style="color:#fff; margin-bottom:12px;">Your API Key | 你的 API 金鑰</h3>
        <div style="background:#000; border:2px solid #ff6b35; border-radius:8px; padding:16px; margin:12px 0; word-break:break-all; font-family:monospace; font-size:1.1rem; color:#4caf50;">
          ${apiKey}
        </div>
        <p style="color:#ff6b35; font-size:0.85rem; margin-top:8px;">⚠️ Save this key now! It will not be shown again. | 立即儲存此金鑰！將不會再次顯示。</p>

        <h3 style="color:#fff; margin:24px 0 12px;">Quick Setup — MCP Client | 快速設定 — MCP 用戶端</h3>
        <pre style="background:#0d1117; border:1px solid #30363d; border-radius:8px; padding:16px; overflow-x:auto; color:#c9d1d9; font-size:0.85rem;">{
  "mcpServers": {
    "openclaw-intel": {
      "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp",
      "headers": { "Authorization": "Bearer ${apiKey}" }
    }
  }
}</pre>

        <h3 style="color:#fff; margin:24px 0 12px;">Quick Setup — REST API | 快速設定 — REST API</h3>
        <pre style="background:#0d1117; border:1px solid #30363d; border-radius:8px; padding:16px; overflow-x:auto; color:#c9d1d9; font-size:0.85rem;">curl https://openclaw-intel-api.yagami8095.workers.dev/api/reports/latest \\
  -H "Authorization: Bearer ${apiKey}"</pre>

        <div style="margin-top:24px;">
          <h3 style="color:#fff; margin-bottom:12px;">What You Get | 你將獲得</h3>
          <ul class="product-features">
            <li>📊 Full market intelligence reports (not just summaries) | 完整市場情報報告（非僅摘要）</li>
            <li>🔑 1000 API calls per day | 每日 1000 次 API 呼叫</li>
            <li>⚡ Priority access to new tools | 優先存取新工具</li>
            <li>🤖 Works with Claude Code, Cursor, Windsurf, Cline | 支援 Claude Code、Cursor、Windsurf、Cline</li>
          </ul>
        </div>
      </div>

      <div class="product-card" style="text-align:center;">
        <h3 style="color:#fff; margin-bottom:16px;">Also Try | 也試試看</h3>
        <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
          <a href="https://openclaw-fortune-mcp.yagami8095.workers.dev" class="btn" style="background:#9c27b0; color:#fff;" target="_blank">🔮 Fortune MCP</a>
          <a href="https://openclaw-intel-mcp.yagami8095.workers.dev" class="btn" style="background:#1565c0; color:#fff;" target="_blank">📊 Intel MCP</a>
          <a href="https://note.com/yedanyagami" class="btn" style="background:#4caf50; color:#fff;" target="_blank">📝 note.com</a>
        </div>
      </div>
    </div>
  `);
}

function notFoundPage() {
  return baseHTML('404', `
    <div class="container" style="text-align:center; padding:80px 20px;">
      <h1 style="font-size:4rem; color:#ff6b35;">404</h1>
      <p style="color:#888; margin:16px 0;">Page not found. | 找不到您要的頁面。</p>
      <a href="/" class="btn btn-stripe">Back to Store | 返回商店</a>
    </div>
  `);
}

// ============================================================
// ROUTE HANDLERS
// ============================================================

async function handleCatalog(env) {
  return htmlResponse(catalogPage(env));
}

async function handleProduct(productId, env) {
  const product = PRODUCTS[productId];
  if (!product) return htmlResponse(notFoundPage(), 404);
  return htmlResponse(productPage(product, env));
}

async function handleStripeCheckout(request, env) {
  if (!env.STRIPE_SECRET_KEY) {
    return jsonResponse({ error: 'Stripe not configured | Stripe 未設定' }, 500);
  }

  const formData = await request.formData();
  const productId = formData.get('product_id');
  const product = PRODUCTS[productId];
  if (!product) return jsonResponse({ error: 'Product not found | 找不到產品' }, 404);

  const baseUrl = new URL(request.url).origin;
  const orderId = generateOrderId();

  // Create Stripe Checkout Session via API
  const params = new URLSearchParams();
  params.append('payment_method_types[]', 'card');
  params.append('line_items[0][price_data][currency]', 'usd');
  params.append('line_items[0][price_data][product_data][name]', product.name);
  params.append('line_items[0][price_data][product_data][description]', product.description);
  params.append('line_items[0][price_data][unit_amount]', String(product.price_usd * 100));
  params.append('line_items[0][quantity]', '1');
  params.append('mode', 'payment');
  params.append('success_url', `${baseUrl}/success?product=${productId}&method=stripe&session_id={CHECKOUT_SESSION_ID}&order=${orderId}`);
  params.append('cancel_url', `${baseUrl}/products/${productId}`);
  params.append('metadata[order_id]', orderId);
  params.append('metadata[product_id]', productId);

  // Idempotency: prevent duplicate checkout sessions for same order
  const idempotencyKey = `checkout_${orderId}`;

  const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': idempotencyKey,
    },
    body: params,
  });

  const session = await resp.json();
  if (session.error) {
    return jsonResponse({ error: session.error.message }, 400);
  }

  // Record order
  try {
    await env.DB.prepare(
      'INSERT INTO orders (order_id, product_id, product_name, amount, currency, payment_method, payment_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(orderId, productId, product.name, product.price_usd * 100, 'USD', 'stripe', session.id, 'pending').run();
  } catch (e) { /* non-fatal */ }

  // Redirect to Stripe Checkout
  return Response.redirect(session.url, 303);
}

async function handleSuccess(request, env) {
  const url = new URL(request.url);
  const productId = url.searchParams.get('product');
  const method = url.searchParams.get('method');
  const sessionId = url.searchParams.get('session_id');
  const orderId = url.searchParams.get('order') || generateOrderId();

  const product = PRODUCTS[productId];
  if (!product) return htmlResponse(notFoundPage(), 404);

  // Idempotency: check if this order was already processed
  try {
    const existing = await env.DB.prepare(
      "SELECT order_id, status, download_token FROM orders WHERE order_id = ? AND status = 'paid'"
    ).bind(orderId).first();
    if (existing && existing.download_token) {
      // Already processed — return existing token instead of creating duplicate
      if (product.type === 'api_key') {
        return htmlResponse(apiKeySuccessPage(product, existing.download_token));
      }
      return htmlResponse(successPage(product, existing.download_token));
    }
  } catch { /* non-fatal, proceed normally */ }

  // Verify Stripe payment if applicable
  let verified = false;
  if (method === 'stripe' && sessionId && env.STRIPE_SECRET_KEY) {
    try {
      const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` },
      });
      const session = await resp.json();
      if (session.payment_status === 'paid') {
        verified = true;
      }
    } catch (e) { /* continue anyway for UX */ }
  }

  // For PayPal, we trust the redirect (IPN will verify async)
  if (method === 'paypal') {
    verified = true; // Will be verified by IPN webhook
  }

  // API Key product — provision key instead of download token
  if (product.type === 'api_key') {
    const apiKey = generateApiKey();

    // Insert API key into D1
    try {
      await env.DB.prepare(
        "INSERT INTO api_keys (key, tier, status, daily_limit, created_at) VALUES (?, 'pro', 'active', 1000, datetime('now'))"
      ).bind(apiKey).run();
    } catch (e) { /* table might not exist yet, non-fatal */ }

    // Record order with API key reference
    try {
      await env.DB.prepare(
        'INSERT OR REPLACE INTO orders (order_id, product_id, product_name, amount, currency, payment_method, payment_id, status, download_token, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
      ).bind(orderId, productId, product.name, product.price_usd * 100, 'USD', method || 'direct', sessionId || '', verified ? 'paid' : 'pending', apiKey).run();
    } catch (e) { /* non-fatal */ }


    // Store Pro key in shared KV for cross-worker validation
    try {
      await env.KV.put(`prokey:${apiKey}`, JSON.stringify({
        tier: 'pro',
        daily_limit: 1000,
        product_id: productId,
        created: new Date().toISOString(),
      }), { expirationTtl: 365 * 86400 }); // 1 year
    } catch (_) { /* non-fatal — D1 is source of truth */ }

        return htmlResponse(apiKeySuccessPage(product, apiKey));
  }

  // Generate download token (for digital products)
  const downloadToken = generateToken(48);
  const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  // Store token in KV
  await env.KV.put(`download:${downloadToken}`, JSON.stringify({
    product_id: productId,
    order_id: orderId,
    created_at: new Date().toISOString(),
    expires_at: new Date(expiry).toISOString(),
    download_count: 0,
    max_downloads: 5,
  }), { expirationTtl: 86400 });

  // Update order in D1
  try {
    await env.DB.prepare(
      'INSERT OR REPLACE INTO orders (order_id, product_id, product_name, amount, currency, payment_method, payment_id, status, download_token, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
    ).bind(orderId, productId, product.name, product.price_usd * 100, 'USD', method || 'direct', sessionId || '', verified ? 'paid' : 'pending', downloadToken).run();
  } catch (e) { /* non-fatal */ }

  return htmlResponse(successPage(product, downloadToken));
}

async function handleDownload(token, env) {
  // Verify token
  const tokenData = await env.KV.get(`download:${token}`, { type: 'json' });
  if (!tokenData) {
    return htmlResponse(baseHTML('Invalid Link | 連結無效', `
      <div class="container" style="text-align:center; padding:80px 20px;">
        <h1 style="color:#ff6b35;">⏰ Download Link Invalid | 下載連結無效</h1>
        <p style="color:#888; margin:16px 0;">The link has expired or is invalid. | 連結已過期或無效。</p>
        <p style="color:#888;">Please purchase again from the store. | 請從商店重新購買。</p>
        <a href="/" class="btn btn-stripe" style="margin-top:20px;">Back to Store | 返回商店</a>
      </div>
    `), 403);
  }

  // Check download limit
  if (tokenData.download_count >= tokenData.max_downloads) {
    return htmlResponse(baseHTML('Download Limit Reached | 下載次數已達上限', `
      <div class="container" style="text-align:center; padding:80px 20px;">
        <h1 style="color:#ff6b35;">📥 Download Limit Reached | 下載次數已達上限</h1>
        <p style="color:#888; margin:16px 0;">Maximum ${tokenData.max_downloads} downloads allowed. | 最多可下載 ${tokenData.max_downloads} 次。</p>
        <p style="color:#888;">Contact Yagami8095@gmail.com if you need help. | 如需協助請聯繫 Yagami8095@gmail.com。</p>
      </div>
    `), 403);
  }

  // Get product content from KV
  const product = PRODUCTS[tokenData.product_id];
  if (!product) return htmlResponse(notFoundPage(), 404);

  let content = await env.KV.get(product.file_key);

  if (!content) {
    // Fallback: generate content on-the-fly
    content = generatePromptCollectionHTML();
  }

  // Increment download count
  tokenData.download_count += 1;
  const remaining = Math.max(0, (new Date(tokenData.expires_at).getTime() - Date.now()) / 1000);
  await env.KV.put(`download:${token}`, JSON.stringify(tokenData), { expirationTtl: Math.ceil(remaining) });

  // Serve the file
  return new Response(content, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="AI_Prompt_Collection_50.html"`,
      'Cache-Control': 'no-store',
    },
  });
}

async function handlePayPalIPN(request, env) {
  // PayPal Instant Payment Notification handler (hardened v2)
  const body = await request.text();
  const params = new URLSearchParams(body);
  const txnId = params.get('txn_id') || 'unknown';
  const today = new Date().toISOString().split('T')[0];
  const logKey = `ipn_log:${today}:${txnId}`;

  // Helper: log IPN event to KV for debugging
  const logIPN = async (status, detail) => {
    try {
      const entry = JSON.stringify({
        status,
        detail,
        txn_id: txnId,
        item: params.get('item_number'),
        gross: params.get('mc_gross'),
        payer: params.get('payer_email'),
        ts: new Date().toISOString(),
      });
      await env.KV.put(logKey, entry, { expirationTtl: 90 * 86400 });
    } catch (_) { /* best-effort logging */ }
  };

  // 1. Verify with PayPal
  let verifyResult;
  try {
    const verifyResp = await fetch('https://ipnpb.paypal.com/cgi-bin/webscr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `cmd=_notify-validate&${body}`,
    });
    verifyResult = await verifyResp.text();
  } catch (e) {
    await logIPN('error', `PayPal verify fetch failed: ${e.message}`);
    return new Response('OK', { status: 200 });
  }

  if (verifyResult !== 'VERIFIED') {
    await logIPN('rejected', `PayPal verify returned: ${verifyResult}`);
    return new Response('OK', { status: 200 });
  }

  const paymentStatus = params.get('payment_status');
  const itemNumber = params.get('item_number');
  const mcGross = parseFloat(params.get('mc_gross') || '0');
  const mcCurrency = params.get('mc_currency') || 'USD';

  if (paymentStatus !== 'Completed') {
    await logIPN('skipped', `payment_status=${paymentStatus}`);
    return new Response('OK', { status: 200 });
  }

  // 2. Txn dedup — prevent double-processing
  const txnKey = `paypal_txn:${txnId}`;
  const existingTxn = await env.KV.get(txnKey);
  if (existingTxn) {
    await logIPN('dedup', 'Transaction already processed');
    return new Response('OK', { status: 200 });
  }

  // 3. Amount validation — verify payment matches product price
  const product = PRODUCTS[itemNumber];
  if (product) {
    const expectedUSD = product.price_usd;
    const expectedJPY = product.price_jpy;
    const isValidAmount =
      (mcCurrency === 'USD' && mcGross >= expectedUSD) ||
      (mcCurrency === 'JPY' && mcGross >= expectedJPY);
    if (!isValidAmount) {
      await logIPN('amount_mismatch', `Expected $${expectedUSD}/¥${expectedJPY}, got ${mcGross} ${mcCurrency}`);
      return new Response('OK', { status: 200 });
    }
  }
  // If product not found in PRODUCTS, still process (may be a custom payment)

  // 4. Mark txn as processed (365-day TTL)
  await env.KV.put(txnKey, JSON.stringify({ item: itemNumber, amount: mcGross, currency: mcCurrency, ts: new Date().toISOString() }), { expirationTtl: 365 * 86400 });

  // 5. Update order in DB
  try {
    await env.DB.prepare(
      "UPDATE orders SET status = 'paid', payment_id = ?, paid_at = datetime('now') WHERE product_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
    ).bind(txnId, itemNumber).run();
  } catch (e) {
    await logIPN('db_error', `DB update failed: ${e.message}`);
    return new Response('OK', { status: 200 });
  }

  // 5b. If this is an API key product, activate the key in KV for cross-worker auth
  if (product && product.type === 'api_key') {
    try {
      // Find the most recent order's API key for this product
      const orderRow = await env.DB.prepare(
        "SELECT download_token FROM orders WHERE product_id = ? AND status = 'paid' ORDER BY paid_at DESC LIMIT 1"
      ).bind(itemNumber).first();
      if (orderRow?.download_token) {
        await env.KV.put(`prokey:${orderRow.download_token}`, JSON.stringify({
          tier: 'pro',
          daily_limit: 1000,
          product_id: itemNumber,
          payment_id: txnId,
          created: new Date().toISOString(),
        }), { expirationTtl: 365 * 86400 });
      }
    } catch (_) { /* non-fatal */ }
  }

  // 6. First payment detection — milestone flag
  const firstPayment = await env.KV.get('revenue:first_payment');
  if (!firstPayment) {
    await env.KV.put('revenue:first_payment', JSON.stringify({
      txn_id: txnId,
      amount: mcGross,
      currency: mcCurrency,
      product: itemNumber,
      payer: params.get('payer_email'),
      ts: new Date().toISOString(),
    }));
  }

  await logIPN('success', `Payment processed: ${mcGross} ${mcCurrency} for ${itemNumber}`);
  return new Response('OK', { status: 200 });
}

async function verifyStripeSignature(body, sig, secret) {
  if (!sig || !secret) return false;
  const parts = Object.fromEntries(sig.split(',').map(p => { const [k, v] = p.split('='); return [k, v]; }));
  const timestamp = parts['t'];
  const v1 = parts['v1'];
  if (!timestamp || !v1) return false;
  // Reject if timestamp is older than 5 minutes (replay protection)
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;
  const payload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expected = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === v1;
}

async function handleStripeWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response('No webhook secret | 缺少 Webhook 密鑰', { status: 400 });

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  // Verify Stripe webhook signature (HMAC-SHA256)
  const valid = await verifyStripeSignature(body, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    return new Response('Invalid signature', { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch (e) {
    return new Response('Invalid JSON | 無效的 JSON', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.order_id;
    const productId = session.metadata?.product_id;
    if (orderId) {
      try {
        await env.DB.prepare(
          "UPDATE orders SET status = 'paid', paid_at = datetime('now') WHERE order_id = ?"
        ).bind(orderId).run();
      } catch (e) { /* log */ }

      // Auto-provision API key for intel-api-pro if not already done via success redirect
      if (productId === 'intel-api-pro') {
        try {
          const existing = await env.DB.prepare(
            "SELECT download_token FROM orders WHERE order_id = ?"
          ).bind(orderId).first();
          if (existing?.download_token && existing.download_token.startsWith('oc_pro_')) {
            // Key already provisioned via success redirect, ensure it's active
            await env.DB.prepare(
              "UPDATE api_keys SET status = 'active' WHERE key = ?"
            ).bind(existing.download_token).run();
          }
        } catch (e) { /* non-fatal */ }
      }
    }
  }

  return new Response('OK', { status: 200 });
}

async function handleAPIOrders(request, env) {
  const orders = await env.DB.prepare(
    'SELECT * FROM orders ORDER BY created_at DESC LIMIT 50'
  ).all();
  return jsonResponse({ orders: orders.results, count: orders.results.length });
}

// ============================================================
// INLINE PRODUCT CONTENT (Prompt Collection)
// ============================================================
function generatePromptCollectionHTML() {
  // This generates the prompt collection content inline
  // Used as fallback when KV doesn't have the content
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>50 Battle-Tested AI Prompts | 實戰 AI 提示詞 50 選</title>
<style>
  @page { margin: 20mm; }
  body { font-family: 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #333; line-height: 1.7; background: #fff; }
  h1 { text-align: center; font-size: 2rem; margin-bottom: 8px; }
  .subtitle { text-align: center; color: #666; margin-bottom: 40px; }
</style>
</head>
<body>
<h1>🚀 50 Battle-Tested AI Prompts | 實戰 AI 提示詞 50 選</h1>
<p class="subtitle">ChatGPT / Claude / DeepSeek compatible — copy & paste ready | 複製貼上即可使用的實踐模板集</p>
<p style="text-align:center; color:#999;">This product is for authorized purchasers only. Redistribution prohibited. | 本產品僅限正式購買者閱覽，禁止再散佈。</p>
<p style="text-align:center; color:#999;">&copy; 2026 OpenClaw Intelligence</p>
<hr style="margin:40px 0;">
<p style="text-align:center;">Loading content... Please wait. | 內容載入中…請稍候。</p>
<p style="text-align:center;">If issues persist: Yagami8095@gmail.com | 如問題持續：Yagami8095@gmail.com</p>
</body>
</html>`;
}

// ============================================================
// Edge Defense Layer
// ============================================================

const HONEYPOT_PATHS = ['/admin', '/wp-login.php', '/.env', '/config.json', '/.git/config', '/wp-admin', '/phpinfo.php'];

async function sha256Short(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function edgeDefense(request, env) {
  const kv = env.KV;
  if (!kv) return { action: 'allow' };
  const path = new URL(request.url).pathname.toLowerCase();

  if (HONEYPOT_PATHS.includes(path)) {
    try {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const ipHash = await sha256Short(ip + '-openclaw-defense');
      const today = new Date().toISOString().slice(0, 10);
      const defenseKey = `defense:${ipHash}:${today}`;
      const raw = await kv.get(defenseKey, { type: 'json' }) || { score: 100, hits: 0, flags: [] };
      raw.score = Math.max(0, raw.score - 30);
      raw.hits++;
      raw.flags.push('honeypot:' + path);
      await kv.put(defenseKey, JSON.stringify(raw), { expirationTtl: 86400 });
    } catch {}
    return { action: 'honeypot' };
  }

  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ipHash = await sha256Short(ip + '-openclaw-defense');
    const today = new Date().toISOString().slice(0, 10);
    const raw = await kv.get(`defense:${ipHash}:${today}`, { type: 'json' });
    if (raw && raw.score < 10) return { action: 'block' };
  } catch {}

  return { action: 'allow' };
}

// ============================================================
// FinOps Circuit Breaker
// ============================================================

const FINOPS_DAILY_WARN = 50000;
const FINOPS_DAILY_SLOW = 80000;
const FINOPS_DAILY_STOP = 95000;

async function finopsTrack(env, serverName) {
  const kv = env.KV;
  if (!kv) return { ok: true };
  const today = new Date().toISOString().slice(0, 10);
  const key = `finops:${today}`;
  try {
    const raw = await kv.get(key, { type: 'json' }) || { total: 0, by: {} };
    raw.total++;
    raw.by[serverName] = (raw.by[serverName] || 0) + 1;
    kv.put(key, JSON.stringify(raw), { expirationTtl: 172800 });
    if (raw.total >= FINOPS_DAILY_STOP) return { ok: false, reason: 'Daily capacity reached. Try again tomorrow. | 每日容量已滿。請明天再試。', status: 503 };
    if (raw.total >= FINOPS_DAILY_SLOW) return { ok: true, delay: 500 };
    if (raw.total >= FINOPS_DAILY_WARN) return { ok: true, warn: true };
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

// Attribution Tracking — ?ref= parameter
async function trackRef(request, env, serverName) {
  const kv = env.KV;
  if (!kv) return;
  const ref = new URL(request.url).searchParams.get('ref');
  if (!ref) return;
  const source = ref.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!source) return;
  const today = new Date().toISOString().slice(0, 10);
  const key = `ref:${source}:${serverName}:${today}`;
  try {
    const count = parseInt(await kv.get(key) || '0', 10);
    await kv.put(key, String(count + 1), { expirationTtl: 2592000 }); // 30 days
  } catch {}
}

// ============================================================
// GitHub OAuth Pro Authentication
// ============================================================
const OAUTH_SCOPES = 'read:user user:email';
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';

// GET /auth/login → redirect to GitHub
function handleOAuthLogin(env, url) {
  if (!env.GITHUB_CLIENT_ID) {
    return jsonResponse({ error: 'OAuth not configured | OAuth 未設定' }, 500);
  }
  const ref = url.searchParams.get('ref') || 'direct';
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${url.origin}/auth/callback`,
    scope: OAUTH_SCOPES,
    state,
  });
  // Track trial attribution
  const refCookie = `oauth_ref=${ref}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
  const stateCookie = `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
  return new Response(null, {
    status: 302,
    headers: [
      ['Location', `${GITHUB_AUTH_URL}?${params}`],
      ['Set-Cookie', stateCookie],
      ['Set-Cookie', refCookie],
    ],
  });
}

// GET /auth/callback → exchange code → generate Pro key → show result
async function handleOAuthCallback(request, env, url) {
  const code = url.searchParams.get('code');
  if (!code) {
    return jsonResponse({ error: 'Missing authorization code | 缺少授權碼' }, 400);
  }

  // Exchange code for access token
  const tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error) {
    return jsonResponse({ error: tokenData.error, description: tokenData.error_description }, 400);
  }

  const accessToken = tokenData.access_token;

  // Get GitHub user info
  const userRes = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'OpenClaw-ProductStore/1.0',
      Accept: 'application/json',
    },
  });
  const user = await userRes.json();

  // Generate Pro API key
  const proKey = `ocpro_${crypto.randomUUID().replace(/-/g, '')}`;
  const keyData = {
    key: proKey,
    github_id: user.id,
    github_login: user.login,
    github_name: user.name || user.login,
    tier: 'pro_trial',
    daily_limit: 100,
    created: new Date().toISOString(),
    expires: new Date(Date.now() + 7 * 86400000).toISOString(), // 7 day trial
  };

  // Store in KV
  if (env.KV) {
    await env.KV.put(`prokey:${proKey}`, JSON.stringify(keyData), { expirationTtl: 7 * 86400 });
    await env.KV.put(`github:${user.id}`, proKey, { expirationTtl: 7 * 86400 });
    // Track trial attribution from ref cookie
    try {
      const cookieHeader = request.headers.get('cookie') || '';
      const cookies = cookieHeader.split(';').map(c => c.trim());
      const refCookie = cookies.find(c => c.startsWith('oauth_ref='));
      const ref = refCookie ? refCookie.split('=')[1] : 'direct';
      const today = new Date().toISOString().split('T')[0];
      const countKey = `ref:trial:${ref}:${today}`;
      await env.KV.put(countKey, String(parseInt(await env.KV.get(countKey) || '0') + 1), { expirationTtl: 30 * 86400 });
    } catch (_) { /* attribution tracking is best-effort */ }
  }

  // Return success page
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OpenClaw Pro — Activated | OpenClaw 專業版 — 已啟用</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px}
.card{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:32px;max-width:520px;width:100%}
h1{color:#ff6b35;font-size:1.5em;margin-bottom:16px}
.key-box{background:#0d1117;border:1px solid #ff6b35;border-radius:8px;padding:16px;margin:16px 0;font-family:monospace;font-size:0.9em;word-break:break-all;color:#fff;cursor:pointer}
.key-box:hover{background:#161b22}
.info{color:#888;font-size:0.85em;line-height:1.6;margin-top:12px}
.badge{display:inline-block;background:#ff6b35;color:#000;padding:2px 8px;border-radius:4px;font-size:0.75em;font-weight:bold}
.user{display:flex;align-items:center;gap:12px;margin:16px 0;padding:12px;background:#161b22;border-radius:8px}
.user img{width:40px;height:40px;border-radius:50%}
.usage{margin-top:16px;font-size:0.85em;color:#aaa}
code{background:#222;padding:2px 6px;border-radius:3px;font-size:0.85em}
</style></head>
<body>
<div class="card">
  <h1>OpenClaw Pro <span class="badge">7-DAY TRIAL</span></h1>
  <div class="user">
    <img src="${user.avatar_url}" alt="${user.login}">
    <div><strong>${user.name || user.login}</strong><br><span style="color:#888">@${user.login}</span></div>
  </div>
  <p>Your Pro API key (click to copy): | 你的專業版 API 金鑰（點擊複製）：</p>
  <div class="key-box" onclick="navigator.clipboard.writeText(this.textContent.trim()).then(()=>this.style.borderColor='#0f0')">${proKey}</div>
  <div class="usage">
    <strong>Usage | 使用方式:</strong> Add header <code>X-API-Key: ${proKey}</code> to any OpenClaw MCP request. | 將此標頭加入任何 OpenClaw MCP 請求。<br>
    <strong>Limit | 限制:</strong> 100 calls/day (vs 10-50 free) | 每日 100 次呼叫（免費版 10-50 次）<br>
    <strong>Expires | 到期:</strong> ${keyData.expires.split('T')[0]}<br>
    <strong>Upgrade | 升級:</strong> <a href="https://paypal.me/Yagami8095/9" style="color:#ff6b35">Pay $9 for unlimited Pro | 支付 $9 升級為無限專業版</a>
  </div>
  <div class="info">
    After trial, upgrade to permanent Pro ($9 one-time) for 1000 calls/day across all 9 MCP servers. | 試用結束後，升級為永久專業版（一次性 $9）即可每日 1000 次呼叫跨全部 9 個 MCP 伺服器。<br>
    Servers | 伺服器: json-toolkit, regex-engine, color-palette, timestamp-converter, prompt-enhancer, agentforge, moltbook, fortune, intel
  </div>
</div>
</body></html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// GET /auth/status → check Pro key status
async function handleOAuthStatus(request, env) {
  const apiKey = request.headers.get('X-API-Key') || new URL(request.url).searchParams.get('key');
  if (!apiKey) {
    return jsonResponse({ error: 'Provide X-API-Key header or ?key= param | 請提供 X-API-Key 標頭或 ?key= 參數', authenticated: false }, 401);
  }

  if (!env.KV) {
    return jsonResponse({ error: 'KV not available | KV 不可用', authenticated: false }, 503);
  }

  const raw = await env.KV.get(`prokey:${apiKey}`);
  if (!raw) {
    return jsonResponse({ error: 'Invalid or expired key | 無效或已過期的金鑰', authenticated: false }, 401);
  }

  const data = JSON.parse(raw);
  return jsonResponse({
    authenticated: true,
    github_login: data.github_login,
    tier: data.tier,
    daily_limit: data.daily_limit,
    expires: data.expires,
    created: data.created,
  });
}

// ============================================================
// MAIN ROUTER
// ============================================================

// ============================================================
// 特定商取引法に基づく表記 (Specified Commercial Transactions Act)
// ============================================================
function handleTokushoho() {
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>特定商取引法に基づく表記 | OpenClaw</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Hiragino Kaku Gothic ProN', 'メイリオ', sans-serif; background: #0a0a0a; color: #e0e0e0; line-height: 1.8; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 1.5rem; margin-bottom: 30px; color: #fff; border-bottom: 2px solid #f97316; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #333; }
    th { width: 200px; background: #1a1a2e; color: #f97316; font-weight: 600; vertical-align: top; }
    td { background: #111; }
    a { color: #f97316; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 0.85rem; }
    .back { display: inline-block; margin-bottom: 20px; color: #f97316; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/" class="back">&larr; ストアに戻る</a>
    <h1>特定商取引法に基づく表記</h1>
    <table>
      <tr><th>販売業者</th><td>OpenClaw (個人事業)</td></tr>
      <tr><th>運営責任者</th><td>Yagami</td></tr>
      <tr><th>所在地</th><td>請求があった場合、遅滞なく開示いたします。</td></tr>
      <tr><th>電話番号</th><td>請求があった場合、遅滞なく開示いたします。</td></tr>
      <tr><th>メールアドレス</th><td>yedanyagamiai@gmail.com</td></tr>
      <tr><th>販売URL</th><td><a href="https://product-store.yagami8095.workers.dev">https://product-store.yagami8095.workers.dev</a></td></tr>
      <tr><th>販売価格</th><td>各商品ページに記載の価格（税込）<br>
        ・MCP Server Pro: $9/月 (約1,400円)<br>
        ・MCP Server Enterprise: $29/月 (約4,500円)<br>
        ・デジタル商品: 各商品ページ参照</td></tr>
      <tr><th>商品代金以外の必要料金</th><td>なし（インターネット接続料金はお客様負担）</td></tr>
      <tr><th>支払方法</th><td>クレジットカード（Visa, Mastercard, AMEX, JCB）、Apple Pay、Google Pay<br>※Stripe決済を利用</td></tr>
      <tr><th>支払時期</th><td>サブスクリプション：毎月自動課金<br>単品購入：購入時に即時決済</td></tr>
      <tr><th>商品の引渡し時期</th><td>デジタル商品：決済完了後、即時ダウンロード/APIアクセス可能<br>API サブスクリプション：決済完了後、即時利用開始</td></tr>
      <tr><th>返品・キャンセル</th><td>デジタル商品の性質上、購入後の返品・返金は原則としてお受けしておりません。<br>サブスクリプション：次回更新日の前日までにキャンセル可能。日割り返金はありません。<br>ただし、商品に重大な欠陥がある場合は個別に対応いたします。</td></tr>
      <tr><th>動作環境</th><td>MCP対応クライアント（Claude Desktop, Cursor, VS Code等）<br>インターネット接続環境</td></tr>
      <tr><th>特別条件</th><td>未成年者の購入には保護者の同意が必要です。</td></tr>
    </table>
    <div class="footer">
      <p>&copy; 2026 OpenClaw. All rights reserved.</p>
      <p>Last updated: March 2026</p>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Edge Defense
    const defense = await edgeDefense(request, env);
    if (defense.action === 'honeypot') return new Response('Not Found', { status: 404 });
    if (defense.action === 'block') return new Response(JSON.stringify({ error: 'Access denied | 存取被拒' }), { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } });

    // FinOps Circuit Breaker
    const finops = await finopsTrack(env, 'product-store');
    if (!finops.ok) return new Response(JSON.stringify({ error: finops.reason }), { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } });
    if (finops.delay) await new Promise(r => setTimeout(r, finops.delay));

    // Attribution Tracking
    await trackRef(request, env, 'product-store');

    try {
      // Routes
      if (path === '/' && method === 'GET') {
        return handleCatalog(env);
      }

      // === GitHub OAuth Pro Authentication ===
      if (path === '/auth/login' && method === 'GET') {
        return handleOAuthLogin(env, url);
      }
      if (path === '/auth/callback' && method === 'GET') {
        return handleOAuthCallback(request, env, url);
      }
      if (path === '/auth/status' && method === 'GET') {
        return handleOAuthStatus(request, env);
      }

      // Quick-buy routes — direct redirect to PayPal
      if (path === '/buy/pro' && method === 'GET') {
        return new Response(null, {
          status: 302,
          headers: { ...CORS, 'Location': 'https://paypal.me/Yagami8095/9' }
        });
      }

      if (path.startsWith('/products/') && method === 'GET') {
        const productId = path.split('/products/')[1].replace(/\/$/, '');
        return handleProduct(productId, env);
      }

      if (path === '/checkout/stripe' && method === 'POST') {
        return handleStripeCheckout(request, env);
      }

      if (path === '/success' && method === 'GET') {
        return handleSuccess(request, env);
      }

      if (path.startsWith('/download/') && method === 'GET') {
        const token = path.split('/download/')[1];
        return handleDownload(token, env);
      }

      if (path === '/webhooks/paypal' && method === 'POST') {
        return handlePayPalIPN(request, env);
      }

      if (path === '/webhooks/stripe' && method === 'POST') {
        return handleStripeWebhook(request, env);
      }

      if (path === '/api/orders' && method === 'GET') {
        return handleAPIOrders(request, env);
      }


      if (path === '/tokushoho' && method === 'GET') {
        return handleTokushoho();
      }

      if (path === '/api/health' && method === 'GET') {
        return jsonResponse({
          status: 'ok',
          products: Object.keys(PRODUCTS).length,
          payments: {
            paypal: !!env.PAYPAL_BUSINESS_EMAIL,
            stripe: !!env.STRIPE_SECRET_KEY,
            crypto: true,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // === AI-NATIVE ENDPOINTS ===
      // These endpoints are designed for AI agents to discover, evaluate, and purchase products programmatically.

      // Product catalog API — machine-readable product list for AI agents
      if (path === '/api/products' && method === 'GET') {
        const catalog = Object.values(PRODUCTS).map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price_usd: p.price_usd,
          type: p.type || 'digital_download',
          format: p.format,
          features: p.features,
          purchase_url: `https://product-store.yagami8095.workers.dev/products/${p.id}`,
          payment_methods: ['paypal', 'crypto', ...(env.STRIPE_SECRET_KEY ? ['card'] : [])],
        }));
        return jsonResponse({
          store: 'OpenClaw Digital Store | OpenClaw 數位商店',
          products: catalog,
          payment_options: {
            paypal: { available: true, type: 'instant' },
            crypto: { available: false, type: 'coming_soon', note: 'Crypto payments coming soon. Use PayPal for now. | 加密貨幣支付即將推出。目前請使用 PayPal。' },
            card: { available: !!env.STRIPE_SECRET_KEY, type: 'instant' },
          },
          mcp_servers: {
            intel: 'https://openclaw-intel-mcp.yagami8095.workers.dev/mcp',
            fortune: 'https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp',
          },
          support: 'Yagami8095@gmail.com',
        });
      }

      // Provision API — for future automated key provisioning after payment verification
      if (path === '/api/provision' && method === 'POST') {
        try {
          const body = await request.json();
          const { product_id, payment_method, payment_id, email } = body;

          const provisionableProducts = ['intel-api-pro', 'ecosystem-pro', 'enterprise-bundle', 'api-gateway-pro'];
          if (!provisionableProducts.includes(product_id)) {
            return jsonResponse({ error: `Only these products support API provisioning | 僅以下產品支援 API 發放: ${provisionableProducts.join(', ')}`, available: provisionableProducts }, 400);
          }

          if (!payment_method || !payment_id) {
            return jsonResponse({
              error: 'payment_method and payment_id required | 需要 payment_method 和 payment_id',
              accepted_methods: ['paypal_txn', 'crypto_txhash'],
              example: { product_id: 'intel-api-pro', payment_method: 'paypal_txn', payment_id: 'TXN_ID_HERE', email: 'your@email.com' },
              note: 'Payment will be verified before key provisioning. For instant provisioning, use the PayPal checkout flow at /products/intel-api-pro | 付款將在金鑰發放前驗證。如需即時發放，請使用 /products/intel-api-pro 的 PayPal 結帳流程。',
            }, 400);
          }

          // Record the provision request — manual verification needed for crypto/PayPal txns
          const apiKey = generateApiKey();
          const orderId = generateOrderId();

          await env.DB.prepare(
            "INSERT INTO api_keys (key, tier, status, daily_limit, owner_email, payment_method, payment_id, created_at) VALUES (?, 'pro', 'pending_verification', 1000, ?, ?, ?, datetime('now'))"
          ).bind(apiKey, email || null, payment_method, payment_id).run();

          const productNames = { 'intel-api-pro': 'OpenClaw Intel Pro API Key', 'ecosystem-pro': 'OpenClaw Ecosystem Pro (All 9 MCP Servers)' };
          const productAmounts = { 'intel-api-pro': 1400, 'ecosystem-pro': 1400 };

          await env.DB.prepare(
            "INSERT INTO orders (order_id, product_id, product_name, amount, currency, payment_method, payment_id, status, download_token) VALUES (?, ?, ?, ?, 'USD', ?, ?, 'pending_verification', ?)"
          ).bind(orderId, product_id, productNames[product_id] || product_id, productAmounts[product_id] || 900, payment_method, payment_id, apiKey).run();

          return jsonResponse({
            status: 'pending_verification',
            message: 'Payment recorded. Your API key will be activated after payment verification (usually within 24 hours for crypto, instant for PayPal redirect flow). | 付款已記錄。您的 API 金鑰將在付款驗證後啟用（加密貨幣通常 24 小時內，PayPal 重導流程則即時）。',
            order_id: orderId,
            key_preview: apiKey.slice(0, 12) + '...',
            tip: `For INSTANT key provisioning, use the PayPal checkout at https://product-store.yagami8095.workers.dev/products/${product_id} | 如需即時金鑰發放，請使用 PayPal 結帳`,
            support: 'Yagami8095@gmail.com',
          });
        } catch (e) {
          return jsonResponse({ error: e.message }, 500);
        }
      }

      // llms.txt for AI discoverability
      if (path === '/llms.txt' || path === '/.well-known/llms.txt') {
        return new Response(`# OpenClaw MCP Servers

> 9 free remote MCP servers with 49 tools for AI agents. Built on Cloudflare Workers.

## Servers
- JSON Toolkit: https://json-toolkit-mcp.yagami8095.workers.dev/mcp (validate, format, diff, query, transform, schema)
- Regex Engine: https://regex-engine-mcp.yagami8095.workers.dev/mcp (test, extract, replace, explain, generate)
- Color Palette: https://color-palette-mcp.yagami8095.workers.dev/mcp (convert, palette, contrast)
- Timestamp Converter: https://timestamp-converter-mcp.yagami8095.workers.dev/mcp (format, timezone, cron, duration)
- Prompt Enhancer: https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp (optimize, analyze, rewrite, system)
- OpenClaw Intel: https://openclaw-intel-mcp.yagami8095.workers.dev/mcp (market intelligence, comparison)
- Fortune: https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp (horoscope, tarot, fortune)
- MoltBook Publisher: https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp (publish, manage content)
- AgentForge Compare: https://agentforge-compare-mcp.yagami8095.workers.dev/mcp (model benchmarks)

## Quick Start
Add to MCP config: {"url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp"}

## Pro: $9/month, 1000 calls/day all servers
https://product-store.yagami8095.workers.dev/products/ecosystem-pro

## Source: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers`, {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS }
        });
      }

      // 特定商取引法に基づく表示 (Japanese Specified Commercial Transactions Act)
      if (path === '/tokushoho' || path === '/legal' || path === '/legal/tokushoho') {
        return htmlResponse(baseHTML('Legal Disclosure | 特定商取引法に基づく表示 | OpenClaw', `
<div style="max-width:800px;margin:60px auto;padding:20px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#e0e0e0;">
<h1 style="font-size:28px;margin-bottom:30px;border-bottom:2px solid #6c5ce7;padding-bottom:15px;">Legal Disclosure | 特定商取引法に基づく表示</h1>
<p style="color:#888;margin-bottom:30px;">Disclosure under the Act on Specified Commercial Transactions (Japan) | 依日本特定商取引法之揭露</p>
<table style="width:100%;border-collapse:collapse;">
<tr style="border-bottom:1px solid #333;"><td style="padding:15px 10px;font-weight:bold;width:200px;vertical-align:top;">Seller | 販売業者 | 銷售業者</td><td style="padding:15px 10px;">OpenClaw (Sole Proprietorship | 個人事業)</td></tr>
<tr style="border-bottom:1px solid #333;"><td style="padding:15px 10px;font-weight:bold;vertical-align:top;">Operator | 運営責任者 | 營運負責人</td><td style="padding:15px 10px;">陳 芷謄</td></tr>
<tr style="border-bottom:1px solid #333;"><td style="padding:15px 10px;font-weight:bold;vertical-align:top;">Address | 所在地 | 地址</td><td style="padding:15px 10px;">〒340-0023 Saitama, Japan | 埼玉県草加市谷塚町</td></tr>
<tr style="border-bottom:1px solid #333;"><td style="padding:15px 10px;font-weight:bold;vertical-align:top;">Contact | 連絡先 | 聯繫方式</td><td style="padding:15px 10px;">Email: yedanyagamiai@gmail.com</td></tr>
<tr style="border-bottom:1px solid #333;"><td style="padding:15px 10px;font-weight:bold;vertical-align:top;">Pricing | 販売価格 | 售價</td><td style="padding:15px 10px;">Listed on each product page (tax included) | 各商品ページに記載（税込表示） | 標示於各產品頁面（含稅）</td></tr>
<tr style="border-bottom:1px solid #333;"><td style="padding:15px 10px;font-weight:bold;vertical-align:top;">Additional Fees | 商品代金以外の費用 | 額外費用</td><td style="padding:15px 10px;">None (digital product, no shipping) | なし（デジタル商品のため送料不要） | 無（數位商品，無需運費）</td></tr>
<tr style="border-bottom:1px solid #333;"><td style="padding:15px 10px;font-weight:bold;vertical-align:top;">Payment Methods | 支払方法 | 付款方式</td><td style="padding:15px 10px;">PayPal / Credit Card (via Stripe) / Crypto (USDC on Base) | PayPal / クレジットカード（Stripe経由）/ 暗号通貨 | PayPal / 信用卡（透過 Stripe）/ 加密貨幣（USDC on Base）</td></tr>
<tr style="border-bottom:1px solid #333;"><td style="padding:15px 10px;font-weight:bold;vertical-align:top;">Payment Timing | 支払時期 | 付款時間</td><td style="padding:15px 10px;">Instant payment at checkout | 注文時に即時決済 | 下單時即時付款</td></tr>
<tr style="border-bottom:1px solid #333;"><td style="padding:15px 10px;font-weight:bold;vertical-align:top;">Delivery | 商品の引渡時期 | 交付時間</td><td style="padding:15px 10px;">Instant download after payment (API keys issued immediately) | 決済完了後、即時ダウンロード可能 | 付款完成後即可下載（API 金鑰即時發放）</td></tr>
<tr style="border-bottom:1px solid #333;"><td style="padding:15px 10px;font-weight:bold;vertical-align:top;">Returns & Cancellations | 返品・キャンセル | 退貨與取消</td><td style="padding:15px 10px;">Due to the nature of digital products, returns/refunds are generally not accepted. Contact us within 7 days if there is a critical defect. | デジタル商品のため返品・返金は原則不可。重大な欠陥は7日以内にご連絡ください。 | 因數位商品性質，原則不接受退貨退款。如有重大瑕疵請於 7 日內聯繫。</td></tr>
<tr style="border-bottom:1px solid #333;"><td style="padding:15px 10px;font-weight:bold;vertical-align:top;">Requirements | 動作環境 | 系統需求</td><td style="padding:15px 10px;">Internet connection, modern web browser | インターネット接続環境、Webブラウザ | 網路連線、現代網頁瀏覽器</td></tr>
</table>
<p style="margin-top:40px;color:#888;font-size:13px;">Last updated | 最後更新: 2026-03-07 | <a href="/" style="color:#6c5ce7;">Back to Store | 返回商店</a></p>
</div>`));
      }

      return htmlResponse(notFoundPage(), 404);
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  },
};
