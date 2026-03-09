/**
 * OpenClaw x402 Payment Gateway v1.0 | OpenClaw x402 支付閘道 v1.0
 * HTTP 402 Payment Required — AI-Native Micropayments | AI 原生微支付
 *
 * Wraps existing MCP servers with x402 pay-per-request.
 * 將現有 MCP 伺服器包裝為 x402 按次付費模式。
 * Payments: USDC on Base (L2) via x402 protocol.
 * 支付方式：透過 x402 協議在 Base (L2) 上使用 USDC。
 * Fee: 0% protocol fee. Only Base gas (~$0.001).
 * 手續費：0% 協議費。僅需 Base 鏈 gas 費 (~$0.001)。
 *
 * Flow | 流程:
 *   1. Client requests protected endpoint | 客戶端請求受保護端點
 *   2. Gateway returns 402 with payment requirements | 閘道回傳 402 及付款要求
 *   3. Client signs USDC permit and retries with PAYMENT header | 客戶端簽署 USDC 許可並帶 PAYMENT 標頭重試
 *   4. Gateway verifies via facilitator, settles on-chain | 閘道透過促進者驗證並鏈上結算
 *   5. Gateway proxies request to origin MCP server | 閘道代理請求至原始 MCP 伺服器
 *
 * Free endpoints (no payment) | 免費端點（無需付款）: /health, /ping, /, /mcp (free-tier tools)
 * Paid endpoints | 付費端點: /pro/*, /api/v1/query, /api/v1/analyze
 */

// Your USDC receiving wallet on Base
const PAY_TO = '0xA6b4003ACdFc9A8Dc85F2C4B309347EDf8ECbBD5';

// Facilitator URL (verifies + settles payments)
const FACILITATOR_URL = 'https://x402.org/facilitator';

// Base network (mainnet for production)
const NETWORK = 'eip155:8453'; // Base mainnet
// const NETWORK = 'eip155:84532'; // Base Sepolia (testnet)

// Protected routes with pricing
const PAID_ROUTES = {
  '/pro/intel/query': {
    price: '$0.05',
    description: 'AI market intelligence query (full report) | AI 市場情報查詢（完整報告）',
    origin: 'https://openclaw-intel-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/intel/analyze': {
    price: '$0.10',
    description: 'Deep AI market analysis with DeepSeek R1 | 深度 AI 市場分析（DeepSeek R1）',
    origin: 'https://openclaw-intel-api.yagami8095.workers.dev',
    path: '/api/v1/analyze',
  },
  '/pro/fortune/reading': {
    price: '$0.02',
    description: 'AI fortune reading (premium) | AI 運勢占卜（進階版）',
    origin: 'https://openclaw-fortune-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/json/transform': {
    price: '$0.01',
    description: 'JSON transformation tool (unlimited) | JSON 轉換工具（無限次）',
    origin: 'https://json-toolkit-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/regex/engine': {
    price: '$0.01',
    description: 'Regex engine tool (unlimited) | 正則表達式引擎（無限次）',
    origin: 'https://regex-engine-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/prompt/enhance': {
    price: '$0.03',
    description: 'AI prompt enhancement | AI 提示詞增強',
    origin: 'https://prompt-enhancer-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/agentforge/compare': {
    price: '$0.05',
    description: 'AI agent comparison analysis | AI 代理比較分析',
    origin: 'https://agentforge-compare-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/color/palette': {
    price: '$0.01',
    description: 'Color palette generation | 色彩調色盤生成',
    origin: 'https://color-palette-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/timestamp/convert': {
    price: '$0.01',
    description: 'Timestamp conversion tool | 時間戳轉換工具',
    origin: 'https://timestamp-converter-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },

  // === NEW: 9 Core MCP Servers (2026-03-08) ===
  // 新增：9 個核心 MCP 伺服器
  '/pro/automation/execute': {
    price: '$0.03',
    description: 'AI workflow automation & task orchestration | AI 工作流自動化與任務編排',
    origin: 'https://openclaw-automation-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/browser/control': {
    price: '$0.05',
    description: 'AI browser automation & web scraping | AI 瀏覽器自動化與網頁擷取',
    origin: 'https://openclaw-browser-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/code/analyze': {
    price: '$0.05',
    description: 'Code analysis, review & dependency mapping | 程式碼分析、審查與依賴映射',
    origin: 'https://openclaw-code-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/market/research': {
    price: '$0.05',
    description: 'Market research & competitive intelligence | 市場研究與競爭情報',
    origin: 'https://openclaw-market-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/monitor/check': {
    price: '$0.02',
    description: 'Infrastructure monitoring & health checks | 基礎設施監控與健康檢查',
    origin: 'https://openclaw-monitor-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/ops/deploy': {
    price: '$0.03',
    description: 'DevOps automation & deployment tools | DevOps 自動化與部署工具',
    origin: 'https://openclaw-ops-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/skills/manage': {
    price: '$0.02',
    description: 'AI skill management & knowledge base | AI 技能管理與知識庫',
    origin: 'https://openclaw-skills-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/think/reason': {
    price: '$0.08',
    description: 'Deep reasoning & strategic analysis (DeepSeek R1) | 深度推理與策略分析',
    origin: 'https://openclaw-think-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/intel/mcp': {
    price: '$0.05',
    description: 'Full MCP intelligence toolkit | 完整 MCP 情報工具組',
    origin: 'https://openclaw-intel-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },

  // === NEW: MCP Health Checker Pro (2026-03-08) ===
  '/pro/mcp/check': {
    price: '$0.02',
    description: 'MCP server health check (unlimited, no rate limit) | MCP 伺服器健康檢查（無限次，無速率限制）',
    origin: 'https://openclaw-mcp-checker.yagami8095.workers.dev',
    path: '/api/check',
  },
};

// Revenue tracking
let sessionRevenue = 0;
let sessionRequests = 0;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // Free endpoints
    if (path === '/' || path === '/health') {
      return json({
        name: 'OpenClaw x402 Payment Gateway | OpenClaw x402 支付閘道',
        version: '1.0.0',
        protocol: 'x402',
        network: NETWORK,
        wallet: PAY_TO,
        routes: Object.entries(PAID_ROUTES).map(([path, r]) => ({
          path, price: r.price, description: r.description
        })),
        stats: {
          session_revenue: sessionRevenue,
          session_requests: sessionRequests,
        },
        docs: 'https://x402.org',
        status: 'operational | 運行中',
        message: 'AI-native micropayments via x402 protocol | 透過 x402 協議的 AI 原生微支付',
      });
    }

    if (path === '/ping') {
      return json({ pong: true, gateway: 'x402', ts: Date.now(), status: 'alive | 存活中' });
    }

    // Catalog of all paid endpoints (machine-readable for AI agents)
    // 所有付費端點目錄（AI 代理可讀格式）
    if (path === '/catalog' || path === '/.well-known/x402') {
      return json({
        protocol: 'x402',
        version: '1.0.0',
        name: 'OpenClaw x402 Endpoint Catalog | OpenClaw x402 端點目錄',
        network: NETWORK,
        payTo: PAY_TO,
        facilitator: FACILITATOR_URL,
        endpoints: Object.entries(PAID_ROUTES).map(([path, r]) => ({
          path,
          method: 'POST',
          price: r.price,
          currency: 'USDC',
          network: NETWORK,
          description: r.description,
        })),
      });
    }

    // Check if this is a paid route
    const route = PAID_ROUTES[path];
    if (!route) {
      return json({ error: 'Not found. See / for available endpoints. | 找不到。請查看 / 取得可用端點列表。' }, 404);
    }

    // Check for payment header
    const paymentHeader = request.headers.get('X-PAYMENT') ||
                          request.headers.get('Payment') ||
                          request.headers.get('PAYMENT-SIGNATURE');

    if (!paymentHeader) {
      // Return 402 Payment Required
      return paymentRequired(route, path);
    }

    // Verify payment via facilitator
    try {
      const verification = await verifyPayment(paymentHeader, route, path);

      if (!verification.ok) {
        return json({
          error: 'Payment verification failed | 付款驗證失敗',
          reason: verification.reason,
          retry: true,
          message: 'Please check your payment and try again. | 請檢查您的付款並重試。',
          payment_required: buildPaymentRequirements(route, path),
        }, 402);
      }

      // Payment verified! Proxy to origin
      sessionRevenue += parseFloat(route.price.replace('$', ''));
      sessionRequests++;

      const originResponse = await proxyToOrigin(request, route);

      // Add payment receipt headers
      const headers = new Headers(originResponse.headers);
      headers.set('X-Payment-Status', 'settled');
      headers.set('X-Payment-TxHash', verification.txHash || 'pending');
      headers.set('X-Payment-Amount', route.price);
      headers.set('X-Payment-Network', NETWORK);
      Object.entries(corsHeaders()).forEach(([k, v]) => headers.set(k, v));

      return new Response(originResponse.body, {
        status: originResponse.status,
        headers,
      });

    } catch (e) {
      return json({ error: 'Payment processing error | 支付處理錯誤', message: e.message }, 500);
    }
  },
};

// === 402 Response ===
function paymentRequired(route, path) {
  const requirements = buildPaymentRequirements(route, path);

  // Base64-encode the requirements for the PAYMENT-REQUIRED header
  const encoded = btoa(JSON.stringify(requirements));

  return new Response(JSON.stringify({
    error: 'Payment Required | 需要付款',
    message: `This endpoint requires ${route.price} USDC on Base. Send payment via x402 protocol. | 此端點需要 ${route.price} USDC（Base 鏈）。請透過 x402 協議付款。`,
    price: route.price,
    currency: 'USDC',
    network: NETWORK,
    payTo: PAY_TO,
    protocol: 'x402',
    how_to_pay: {
      step1: 'Sign a USDC EIP-2612 permit for the amount | 簽署對應金額的 USDC EIP-2612 許可',
      step2: 'Base64-encode the signed payload | 將簽署後的負載進行 Base64 編碼',
      step3: 'Retry this request with header: X-PAYMENT: <base64_payload> | 使用標頭 X-PAYMENT: <base64_payload> 重新發送請求',
      docs: 'https://docs.cdp.coinbase.com/x402/quickstart-for-buyers',
    },
    accepts: requirements.accepts,
    catalog: '/.well-known/x402',
  }, null, 2), {
    status: 402,
    headers: {
      'Content-Type': 'application/json',
      'PAYMENT-REQUIRED': encoded,
      'X-Payment-Protocol': 'x402',
      'X-Payment-Network': NETWORK,
      'X-Payment-Price': route.price,
      ...corsHeaders(),
    },
  });
}

function buildPaymentRequirements(route, path) {
  return {
    accepts: [{
      scheme: 'exact',
      network: NETWORK,
      maxAmountRequired: route.price,
      resource: path,
      description: route.description,
      mimeType: 'application/json',
      payTo: PAY_TO,
      extra: {
        name: 'OpenClaw x402 Gateway | OpenClaw x402 支付閘道',
        version: '1.0.0',
      },
    }],
  };
}

// === Payment Verification ===
async function verifyPayment(paymentHeader, route, path) {
  try {
    // Decode the payment payload
    let paymentData;
    try {
      paymentData = JSON.parse(atob(paymentHeader));
    } catch {
      // If not base64, try direct JSON
      try {
        paymentData = JSON.parse(paymentHeader);
      } catch {
        return { ok: false, reason: 'Invalid payment header format | 無效的付款標頭格式' };
      }
    }

    // Verify via facilitator
    const verifyResp = await fetch(`${FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment: paymentData,
        paymentRequirements: buildPaymentRequirements(route, path),
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!verifyResp.ok) {
      const err = await verifyResp.text().catch(() => 'Unknown error');
      return { ok: false, reason: `Facilitator rejected | 促進者拒絕: ${err}` };
    }

    // Settle the payment
    const settleResp = await fetch(`${FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment: paymentData,
        paymentRequirements: buildPaymentRequirements(route, path),
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!settleResp.ok) {
      return { ok: false, reason: 'Settlement failed | 結算失敗' };
    }

    const settlement = await settleResp.json().catch(() => ({}));

    return {
      ok: true,
      txHash: settlement.txHash || settlement.transactionHash || 'settled',
      payer: settlement.payer || paymentData.payload?.authorization?.from || 'unknown',
    };
  } catch (e) {
    return { ok: false, reason: `Verification error | 驗證錯誤: ${e.message}` };
  }
}

// === Proxy to Origin MCP Server ===
async function proxyToOrigin(request, route) {
  const originUrl = route.origin + route.path;

  // Forward the original request body
  const body = request.method !== 'GET' ? await request.text() : null;

  return await fetch(originUrl, {
    method: request.method === 'GET' ? 'POST' : request.method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'OpenClaw-x402-Gateway/1.0',
    },
    body: body || JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: 1,
    }),
    signal: AbortSignal.timeout(30000),
  });
}

// === CORS Headers ===
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-PAYMENT, Payment, PAYMENT-SIGNATURE',
    'Access-Control-Expose-Headers': 'PAYMENT-REQUIRED, X-Payment-Status, X-Payment-TxHash, X-Payment-Amount, X-Payment-Network',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
