/**
 * API Mocker MCP Server
 * Generate mock API responses, fake data, and API documentation for AI agents.
 *
 * Tools (6 tools, 15 req/day free, 150/day Pro):
 *   1. generate_mock_data    — Generate realistic fake data (names, emails, addresses, etc.)
 *   2. mock_api_response     — Generate realistic mock JSON API responses
 *   3. generate_openapi      — Generate OpenAPI 3.0 spec from natural language
 *   4. fake_database         — Generate mock database tables with realistic data
 *   5. http_status_lookup    — Look up HTTP status codes with descriptions
 *   6. api_diff              — Compare two API response structures
 *
 * Vendor: OpenClaw Intelligence
 * MCP Protocol: 2025-03-26
 */

const SERVER_INFO = { name: 'api-mocker', version: '1.0.0' };
const VENDOR = 'OpenClaw Intelligence';
const CAPABILITIES = { tools: {} };
const MCP_PROTOCOL_VERSION = '2025-03-26';

const RATE_LIMIT_MAX = 15;           // requests per day (free)
const RATE_LIMIT_WINDOW = 86400;     // 24 hours in seconds

// ============================================================
// In-Memory Fallback Rate Limiter (KV Safe Mode)
// ============================================================
const _memRL = new Map();
const MEM_RL_LIMIT = 5;
const MEM_RL_WINDOW = 60000; // 1 minute

function memoryRateLimit(ip) {
  const now = Date.now();
  const entry = _memRL.get(ip);
  if (!entry || now - entry.ts > MEM_RL_WINDOW) {
    _memRL.set(ip, { ts: now, count: 1 });
    return { allowed: true, remaining: MEM_RL_LIMIT - 1, safeMode: true };
  }
  if (entry.count >= MEM_RL_LIMIT) {
    return { allowed: false, remaining: 0, safeMode: true };
  }
  entry.count++;
  return { allowed: true, remaining: MEM_RL_LIMIT - entry.count, safeMode: true };
}

const ECOSYSTEM = {
  json_toolkit: 'https://json-toolkit-mcp.yagami8095.workers.dev/mcp',
  regex:        'https://regex-engine-mcp.yagami8095.workers.dev/mcp',
  color:        'https://color-palette-mcp.yagami8095.workers.dev/mcp',
  prompt:       'https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp',
  timestamp:    'https://timestamp-converter-mcp.yagami8095.workers.dev/mcp',
  intel:        'https://openclaw-intel-mcp.yagami8095.workers.dev/mcp',
  fortune:      'https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp',
  moltbook:     'https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp',
  agentforge:   'https://agentforge-compare-mcp.yagami8095.workers.dev/mcp',
  api_mocker:   'https://api-mocker-mcp.yagami8095.workers.dev/mcp',
  store:        'https://product-store.yagami8095.workers.dev',
  fortune_api:  'https://fortune-api.yagami8095.workers.dev',
  intel_api:    'https://openclaw-intel-api.yagami8095.workers.dev',
};

// ============================================================
// Rate Limiting (KV-backed, per IP, 15 req/day)
// ============================================================

// ============================================================
// Pro API Key Validation (shared KV: prokey:{key})
// ============================================================
const PRO_DAILY_LIMIT = 150;

async function validateProKey(kv, apiKey) {
  if (!apiKey || !kv) return null;
  try {
    const kd = await kv.get(`prokey:${apiKey}`, { type: 'json' });
    if (!kd) return null;
    if (kd.expires && new Date(kd.expires) < new Date()) return null;
    if (kd.tier === 'pro' || kd.tier === 'pro_trial') {
      return { valid: true, tier: kd.tier, daily_limit: kd.daily_limit || PRO_DAILY_LIMIT };
    }
    return null;
  } catch { return null; }
}

async function proKeyRateLimit(kv, apiKey, limit) {
  if (!kv) return { allowed: true, remaining: limit, total: limit, used: 0, pro: true };
  const today = new Date().toISOString().slice(0, 10);
  const key = `rl:pro:${apiKey.slice(0, 16)}:${today}`;
  let count = 0;
  try { const val = await kv.get(key); count = val ? parseInt(val, 10) : 0; } catch {}
  if (count >= limit) return { allowed: false, remaining: 0, total: limit, used: count, pro: true };
  try { await kv.put(key, String(count + 1), { expirationTtl: 86400 }); } catch {}
  return { allowed: true, remaining: limit - count - 1, total: limit, used: count + 1, pro: true };
}

async function checkRateLimit(kv, ip) {
  if (!kv) return memoryRateLimit(ip);

  const today = new Date().toISOString().slice(0, 10);
  const key = `rl:apimock:${ip}:${today}`;

  let count = 0;
  try {
    const val = await kv.get(key);
    count = val ? parseInt(val, 10) : 0;
  } catch {
    return memoryRateLimit(ip);
  }

  if (count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, total: RATE_LIMIT_MAX, used: count };
  }

  try {
    await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW });
  } catch {}

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX - count - 1,
    total: RATE_LIMIT_MAX,
    used: count + 1,
  };
}

// ============================================================
// JSON-RPC helpers
// ============================================================

function jsonRpcResponse(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function toolResult(data) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function toolError(message) {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

// ============================================================
// Seeded PRNG (Mulberry32) for reproducible fake data
// ============================================================

function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h;
}

function seededRng(seed) {
  const s = typeof seed === 'number' ? seed : (typeof seed === 'string' ? hashStr(seed) : Date.now());
  return mulberry32(s);
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// ============================================================
// Locale-Aware Fake Data Pools
// ============================================================

const DATA_POOLS = {
  en: {
    firstNames: ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Lisa', 'Daniel', 'Nancy', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Steven', 'Ashley', 'Andrew', 'Dorothy', 'Paul', 'Kimberly', 'Joshua', 'Emily', 'Kenneth', 'Donna'],
    lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'],
    streets: ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Elm St', 'Pine Rd', 'Washington Blvd', 'Park Ave', 'Lake Dr', 'Hill St', 'Sunset Blvd', 'Broadway', 'Church St', 'Mill Rd', 'Spring St', 'River Rd', 'Highland Ave', 'Forest Dr', 'Meadow Ln', 'Valley Rd'],
    cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'Indianapolis', 'San Francisco', 'Seattle', 'Denver', 'Nashville'],
    states: ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI', 'NJ', 'VA', 'WA', 'AZ', 'MA', 'TN', 'IN', 'MO', 'MD', 'WI'],
    zipFormats: ['#####'],
    domains: ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com', 'mail.com', 'aol.com'],
    companies: ['Acme Corp', 'Globex Inc', 'Initech', 'Umbrella Corp', 'Stark Industries', 'Wayne Enterprises', 'Cyberdyne Systems', 'Weyland-Yutani', 'Soylent Corp', 'Tyrell Corp', 'Hooli', 'Pied Piper', 'Dunder Mifflin', 'Sterling Cooper'],
    phoneFmt: '(###) ###-####',
  },
  ja: {
    firstNames: ['太郎', '花子', '一郎', '美咲', '健太', '由美', '翔太', '愛', '大輔', '陽子', '拓也', '真由美', '直樹', '恵子', '和也', '裕子', '雄大', '明日香', '隆', '千尋', '誠', '麻衣', '浩二', '彩', '慎一', '瞳', '達也', '奈々', '哲也', '桜', '勇気', '舞', '亮', '紗希', '修', '葵', '康太', '結衣', '悠斗', '凛'],
    lastNames: ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '佐々木', '松本', '井上', '木村', '林', '斎藤', '清水', '山口', '池田', '橋本', '阿部', '森', '石川', '前田', '藤田', '小川', '岡田', '後藤'],
    cities: ['東京都千代田区', '東京都渋谷区', '東京都新宿区', '東京都港区', '大阪府大阪市北区', '大阪府大阪市中央区', '京都府京都市中京区', '神奈川県横浜市中区', '愛知県名古屋市中区', '北海道札幌市中央区', '福岡県福岡市博多区', '兵庫県神戸市中央区', '宮城県仙台市青葉区', '広島県広島市中区', '埼玉県さいたま市大宮区', '千葉県千葉市中央区', '静岡県静岡市葵区', '新潟県新潟市中央区', '岡山県岡山市北区', '熊本県熊本市中央区'],
    streets: ['丸の内', '六本木', '銀座', '青山', '表参道', '恵比寿', '代官山', '中目黒', '自由が丘', '吉祥寺', '下北沢', '三軒茶屋', '赤坂', '麻布', '白金', '目黒', '品川', '大崎', '五反田', '浜松町'],
    districts: ['1丁目', '2丁目', '3丁目', '4丁目', '5丁目'],
    buildings: ['パレス', 'ハイツ', 'コーポ', 'マンション', 'レジデンス', 'タワー', 'ガーデン', 'ヒルズ'],
    domains: ['gmail.com', 'yahoo.co.jp', 'outlook.jp', 'docomo.ne.jp', 'softbank.ne.jp', 'au.com', 'icloud.com', 'nifty.com'],
    companies: ['東京商事株式会社', '日本テクノロジー株式会社', '大和産業株式会社', '富士通信株式会社', '桜井製作所', '光陽電機株式会社', '三協システム株式会社', '新日本工業株式会社', '東海物産株式会社', '太平洋商会'],
    phoneFmt: '0#0-####-####',
    zipFmt: '###-####',
  },
  zh: {
    firstNames: ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '涛', '明', '超', '秀兰', '霞', '平', '刚', '桂英', '英', '华', '建华', '文', '玲', '慧', '建国', '建军', '红', '志强', '建平', '秀珍', '桂兰', '玉兰', '婷', '雪', '倩', '颖'],
    lastNames: ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗', '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧'],
    cities: ['北京市朝阳区', '上海市浦东新区', '广州市天河区', '深圳市南山区', '杭州市西湖区', '成都市锦江区', '武汉市武昌区', '南京市玄武区', '西安市雁塔区', '重庆市渝中区', '天津市南开区', '苏州市姑苏区', '长沙市岳麓区', '郑州市金水区', '青岛市市南区', '大连市中山区', '厦门市思明区', '无锡市梁溪区', '合肥市蜀山区', '昆明市五华区'],
    streets: ['中山路', '人民路', '建设路', '解放路', '和平路', '长安街', '南京路', '北京路', '上海路', '文化路', '学院路', '科技路', '创新大道', '金融街', '商业街', '工业路', '农业路', '花园路', '湖滨路', '江南路'],
    domains: ['qq.com', '163.com', '126.com', 'sina.com', 'foxmail.com', 'gmail.com', 'outlook.com', 'yeah.net'],
    companies: ['华为技术有限公司', '阿里巴巴集团', '腾讯科技有限公司', '百度在线网络技术有限公司', '京东集团', '字节跳动有限公司', '小米科技有限公司', '美团点评集团', '网易有限公司', '中兴通讯股份有限公司'],
    phoneFmt: '1##########',
    zipFmt: '######',
  },
};

// ============================================================
// Fake Data Generators
// ============================================================

function generateUUID(rng) {
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) { uuid += '-'; }
    else if (i === 14) { uuid += '4'; }
    else if (i === 19) { uuid += hex[Math.floor(rng() * 4) + 8]; }
    else { uuid += hex[Math.floor(rng() * 16)]; }
  }
  return uuid;
}

function generatePhone(rng, fmt) {
  return fmt.replace(/#/g, () => String(randInt(rng, 0, 9)));
}

function generateZip(rng, locale) {
  if (locale === 'ja') return DATA_POOLS.ja.zipFmt.replace(/#/g, () => String(randInt(rng, 0, 9)));
  if (locale === 'zh') return DATA_POOLS.zh.zipFmt.replace(/#/g, () => String(randInt(rng, 0, 9)));
  return String(randInt(rng, 10000, 99999));
}

function generateDate(rng, minYear = 1970, maxYear = 2025) {
  const year = randInt(rng, minYear, maxYear);
  const month = randInt(rng, 1, 12);
  const day = randInt(rng, 1, 28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function generateDatetime(rng) {
  const date = generateDate(rng, 2020, 2025);
  const h = randInt(rng, 0, 23);
  const m = randInt(rng, 0, 59);
  const s = randInt(rng, 0, 59);
  return `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}Z`;
}

function generateIP(rng) {
  return `${randInt(rng, 1, 254)}.${randInt(rng, 0, 255)}.${randInt(rng, 0, 255)}.${randInt(rng, 1, 254)}`;
}

function generateCreditCard(rng) {
  // Fake Visa-like number (starts with 4, Luhn-valid structure but NOT real)
  const prefix = '4';
  let digits = prefix;
  for (let i = 1; i < 15; i++) digits += String(randInt(rng, 0, 9));
  // Compute Luhn check digit
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = parseInt(digits[i], 10);
    if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  const check = (10 - (sum % 10)) % 10;
  digits += String(check);
  return {
    number: digits.replace(/(.{4})/g, '$1 ').trim(),
    expiry: `${String(randInt(rng, 1, 12)).padStart(2, '0')}/${randInt(rng, 26, 30)}`,
    cvv: String(randInt(rng, 100, 999)),
    type: 'Visa',
    disclaimer: 'FAKE - For testing only. Not a real card number.',
  };
}

function romanize(name) {
  // Simple romanization map for common Japanese characters
  const map = {
    '太郎': 'Taro', '花子': 'Hanako', '一郎': 'Ichiro', '美咲': 'Misaki',
    '健太': 'Kenta', '由美': 'Yumi', '翔太': 'Shota', '愛': 'Ai',
    '大輔': 'Daisuke', '陽子': 'Yoko', '拓也': 'Takuya', '真由美': 'Mayumi',
    '直樹': 'Naoki', '恵子': 'Keiko', '和也': 'Kazuya', '裕子': 'Yuko',
    '雄大': 'Yudai', '明日香': 'Asuka', '隆': 'Takashi', '千尋': 'Chihiro',
    '誠': 'Makoto', '麻衣': 'Mai', '浩二': 'Koji', '彩': 'Aya',
    '慎一': 'Shinichi', '瞳': 'Hitomi', '達也': 'Tatsuya', '奈々': 'Nana',
    '哲也': 'Tetsuya', '桜': 'Sakura', '勇気': 'Yuki', '舞': 'Mai',
    '亮': 'Ryo', '紗希': 'Saki', '修': 'Osamu', '葵': 'Aoi',
    '康太': 'Kota', '結衣': 'Yui', '悠斗': 'Yuto', '凛': 'Rin',
    '佐藤': 'Sato', '鈴木': 'Suzuki', '高橋': 'Takahashi', '田中': 'Tanaka',
    '伊藤': 'Ito', '渡辺': 'Watanabe', '山本': 'Yamamoto', '中村': 'Nakamura',
    '小林': 'Kobayashi', '加藤': 'Kato', '吉田': 'Yoshida', '山田': 'Yamada',
    '佐々木': 'Sasaki', '松本': 'Matsumoto', '井上': 'Inoue', '木村': 'Kimura',
    '林': 'Hayashi', '斎藤': 'Saito', '清水': 'Shimizu', '山口': 'Yamaguchi',
    '池田': 'Ikeda', '橋本': 'Hashimoto', '阿部': 'Abe', '森': 'Mori',
    '石川': 'Ishikawa', '前田': 'Maeda', '藤田': 'Fujita', '小川': 'Ogawa',
    '岡田': 'Okada', '後藤': 'Goto',
  };
  return map[name] || name;
}

function generateName(rng, locale) {
  const pool = DATA_POOLS[locale] || DATA_POOLS.en;
  const first = pick(rng, pool.firstNames);
  const last = pick(rng, pool.lastNames);

  if (locale === 'ja') {
    return {
      first_name: first,
      last_name: last,
      full_name: `${last} ${first}`,
      romanized: `${romanize(last)} ${romanize(first)}`,
    };
  }
  if (locale === 'zh') {
    return {
      first_name: first,
      last_name: last,
      full_name: `${last}${first}`,
    };
  }
  return {
    first_name: first,
    last_name: last,
    full_name: `${first} ${last}`,
  };
}

function generateEmail(rng, locale, nameObj) {
  const pool = DATA_POOLS[locale] || DATA_POOLS.en;
  const domain = pick(rng, pool.domains);
  let local;
  if (locale === 'ja') {
    const rom = nameObj.romanized || `${romanize(nameObj.last_name)}.${romanize(nameObj.first_name)}`;
    const parts = rom.toLowerCase().split(' ');
    const formats = [
      () => `${parts[1]}.${parts[0]}`,
      () => `${parts[1]}${parts[0][0]}`,
      () => `${parts[0]}.${parts[1]}${randInt(rng, 1, 99)}`,
      () => `${parts[1]}_${parts[0]}`,
    ];
    local = pick(rng, formats)();
  } else if (locale === 'zh') {
    // Use pinyin-like lowercase
    const pinyinFirst = nameObj.first_name;
    const pinyinLast = nameObj.last_name;
    local = `user${hashStr(pinyinLast + pinyinFirst) & 0xFFFF}`;
  } else {
    const first = (nameObj.first_name || 'user').toLowerCase();
    const last = (nameObj.last_name || 'test').toLowerCase();
    const formats = [
      () => `${first}.${last}`,
      () => `${first}${last[0]}`,
      () => `${first}_${last}${randInt(rng, 1, 99)}`,
      () => `${first[0]}${last}`,
    ];
    local = pick(rng, formats)();
  }
  return `${local.replace(/[^a-z0-9._-]/g, '')}@${domain}`;
}

function generateAddress(rng, locale) {
  const pool = DATA_POOLS[locale] || DATA_POOLS.en;
  if (locale === 'ja') {
    const city = pick(rng, pool.cities);
    const street = pick(rng, pool.streets);
    const district = pick(rng, pool.districts);
    const num = `${randInt(rng, 1, 30)}-${randInt(rng, 1, 20)}`;
    const building = rng() > 0.5 ? `${pick(rng, pool.buildings)}${pick(rng, pool.streets)} ${randInt(rng, 101, 1505)}号室` : '';
    const zip = generateZip(rng, 'ja');
    return {
      zip,
      prefecture_city: city,
      street: `${street}${district}${num}`,
      building: building || undefined,
      full: `〒${zip} ${city}${street}${district}${num}${building ? ' ' + building : ''}`,
    };
  }
  if (locale === 'zh') {
    const city = pick(rng, pool.cities);
    const street = pick(rng, pool.streets);
    const num = `${randInt(rng, 1, 500)}号`;
    const zip = generateZip(rng, 'zh');
    return {
      zip,
      city,
      street: `${street}${num}`,
      full: `${city}${street}${num} (${zip})`,
    };
  }
  const num = randInt(rng, 100, 9999);
  const street = pick(rng, pool.streets);
  const city = pick(rng, pool.cities);
  const state = pick(rng, pool.states);
  const zip = generateZip(rng, 'en');
  return {
    street: `${num} ${street}`,
    city,
    state,
    zip,
    full: `${num} ${street}, ${city}, ${state} ${zip}`,
  };
}

function generateOneMockItem(rng, type, locale) {
  switch (type) {
    case 'name': return generateName(rng, locale);
    case 'email': {
      const name = generateName(rng, locale);
      return { email: generateEmail(rng, locale, name), name: name.full_name };
    }
    case 'address': return generateAddress(rng, locale);
    case 'phone': {
      const pool = DATA_POOLS[locale] || DATA_POOLS.en;
      return { phone: generatePhone(rng, pool.phoneFmt) };
    }
    case 'uuid': return { uuid: generateUUID(rng) };
    case 'date': return { date: generateDate(rng, 2020, 2025) };
    case 'datetime': return { datetime: generateDatetime(rng) };
    case 'credit_card': return generateCreditCard(rng);
    case 'ip': return { ip: generateIP(rng), version: 'IPv4' };
    case 'company': {
      const pool = DATA_POOLS[locale] || DATA_POOLS.en;
      return { company: pick(rng, pool.companies) };
    }
    case 'full_profile': {
      const name = generateName(rng, locale);
      const pool = DATA_POOLS[locale] || DATA_POOLS.en;
      return {
        id: generateUUID(rng),
        ...name,
        email: generateEmail(rng, locale, name),
        phone: generatePhone(rng, pool.phoneFmt),
        address: generateAddress(rng, locale),
        company: pick(rng, pool.companies),
        created_at: generateDatetime(rng),
      };
    }
    default:
      return { error: `Unknown type: ${type}. Valid: name, email, address, phone, uuid, date, datetime, credit_card, ip, company, full_profile` };
  }
}

// ============================================================
// Tool 1: generate_mock_data
// ============================================================

function generateMockData(type, count, locale, seed) {
  const rng = seededRng(seed || `${type}-${count}-${locale}-${Date.now()}`);
  const validTypes = ['name', 'email', 'address', 'phone', 'uuid', 'date', 'datetime', 'credit_card', 'ip', 'company', 'full_profile'];
  if (!validTypes.includes(type)) {
    return { error: `Unknown type: "${type}". Valid types: ${validTypes.join(', ')}` };
  }
  const n = Math.max(1, Math.min(50, count || 1));
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push(generateOneMockItem(rng, type, locale));
  }
  return {
    type,
    locale,
    count: n,
    seed: seed || null,
    data: n === 1 ? items[0] : items,
    ecosystem: ECOSYSTEM,
  };
}

// ============================================================
// Tool 2: mock_api_response
// ============================================================

function mockApiResponse(endpoint, method, statusCode, includeHeaders, paginate, itemCount) {
  const rng = seededRng(`${endpoint}-${method}-${statusCode}-${itemCount}`);
  const sc = statusCode || 200;
  const httpMethod = (method || 'GET').toUpperCase();
  const count = Math.max(1, Math.min(25, itemCount || 5));

  // Parse endpoint to infer resource type
  const resource = inferResource(endpoint);

  // Generate headers
  const headers = {};
  if (includeHeaders !== false) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
    headers['X-Request-Id'] = generateUUID(rng);
    headers['X-RateLimit-Limit'] = '1000';
    headers['X-RateLimit-Remaining'] = String(randInt(rng, 500, 999));
    headers['X-RateLimit-Reset'] = String(Math.floor(Date.now() / 1000) + 3600);
    headers['Cache-Control'] = 'no-cache';
    headers['Date'] = new Date().toUTCString();
  }

  // Generate response body based on status code range
  let body;
  if (sc >= 400) {
    body = generateErrorResponse(rng, sc, resource, httpMethod);
  } else if (sc === 204) {
    body = null;
  } else if (sc === 201 && (httpMethod === 'POST' || httpMethod === 'PUT')) {
    body = generateSingleResource(rng, resource);
  } else if (httpMethod === 'GET' && !endpoint.match(/\/\d+$/) && !endpoint.match(/\/[a-f0-9-]{36}$/)) {
    // List endpoint
    const items = [];
    for (let i = 0; i < count; i++) items.push(generateSingleResource(rng, resource));
    if (paginate) {
      body = {
        data: items,
        pagination: {
          page: 1,
          per_page: count,
          total: randInt(rng, count, count * 20),
          total_pages: randInt(rng, 1, 20),
          has_next: true,
          has_prev: false,
          next_url: `${endpoint}?page=2&per_page=${count}`,
        },
      };
    } else {
      body = { data: items, count: items.length };
    }
  } else {
    body = generateSingleResource(rng, resource);
  }

  return {
    status_code: sc,
    status_text: HTTP_STATUS_MAP[sc]?.text || 'Unknown',
    method: httpMethod,
    endpoint,
    headers: includeHeaders !== false ? headers : undefined,
    body,
    ecosystem: ECOSYSTEM,
  };
}

function inferResource(endpoint) {
  const path = endpoint.replace(/^https?:\/\/[^/]+/, '').replace(/\/v\d+/, '').replace(/\/$/, '');
  const segments = path.split('/').filter(Boolean);
  // Find the last non-id segment
  for (let i = segments.length - 1; i >= 0; i--) {
    if (!segments[i].match(/^\d+$/) && !segments[i].match(/^[a-f0-9-]{36}$/)) {
      return segments[i].replace(/s$/, ''); // singularize
    }
  }
  return 'item';
}

function generateSingleResource(rng, resource) {
  const id = generateUUID(rng);
  const base = {
    id,
    created_at: generateDatetime(rng),
    updated_at: generateDatetime(rng),
  };

  switch (resource.toLowerCase()) {
    case 'user':
    case 'account':
    case 'member':
    case 'profile': {
      const name = generateName(rng, 'en');
      return {
        ...base,
        ...name,
        email: generateEmail(rng, 'en', name),
        phone: generatePhone(rng, DATA_POOLS.en.phoneFmt),
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id.slice(0, 8)}`,
        role: pick(rng, ['admin', 'user', 'moderator', 'editor']),
        status: pick(rng, ['active', 'inactive', 'pending', 'suspended']),
        last_login: generateDatetime(rng),
      };
    }
    case 'product':
    case 'item': {
      const categories = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Toys', 'Food', 'Health'];
      return {
        ...base,
        name: `${pick(rng, ['Premium', 'Pro', 'Ultra', 'Basic', 'Deluxe', 'Essential'])} ${pick(rng, ['Widget', 'Gadget', 'Tool', 'Device', 'Kit', 'Set', 'Pack'])} ${randInt(rng, 100, 9999)}`,
        description: `High-quality ${resource} for everyday use. Designed with care and precision.`,
        price: parseFloat((rng() * 200 + 5).toFixed(2)),
        currency: 'USD',
        category: pick(rng, categories),
        in_stock: rng() > 0.2,
        stock_count: randInt(rng, 0, 500),
        rating: parseFloat((rng() * 3 + 2).toFixed(1)),
        review_count: randInt(rng, 0, 1500),
        sku: `SKU-${String(randInt(rng, 10000, 99999))}`,
        image_url: `https://picsum.photos/seed/${id.slice(0, 8)}/400/400`,
      };
    }
    case 'order':
    case 'transaction':
    case 'purchase': {
      const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
      return {
        ...base,
        order_number: `ORD-${String(randInt(rng, 100000, 999999))}`,
        customer_id: generateUUID(rng),
        status: pick(rng, statuses),
        total: parseFloat((rng() * 500 + 10).toFixed(2)),
        currency: 'USD',
        items_count: randInt(rng, 1, 10),
        shipping_address: generateAddress(rng, 'en'),
        payment_method: pick(rng, ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'crypto']),
      };
    }
    case 'post':
    case 'article':
    case 'blog': {
      const tags = ['technology', 'science', 'business', 'health', 'sports', 'entertainment', 'politics', 'education'];
      return {
        ...base,
        title: `${pick(rng, ['Understanding', 'Guide to', 'Introduction to', 'Deep Dive into', 'Mastering', 'The Future of'])} ${pick(rng, ['AI', 'Cloud Computing', 'Web Development', 'Data Science', 'Machine Learning', 'DevOps'])}`,
        slug: `article-${id.slice(0, 8)}`,
        excerpt: 'A comprehensive guide exploring the latest trends and best practices in modern technology.',
        author_id: generateUUID(rng),
        status: pick(rng, ['draft', 'published', 'archived']),
        tags: [pick(rng, tags), pick(rng, tags)].filter((v, i, a) => a.indexOf(v) === i),
        view_count: randInt(rng, 0, 50000),
        like_count: randInt(rng, 0, 5000),
        comment_count: randInt(rng, 0, 200),
        published_at: rng() > 0.3 ? generateDatetime(rng) : null,
      };
    }
    case 'comment':
    case 'review': {
      return {
        ...base,
        author_id: generateUUID(rng),
        resource_id: generateUUID(rng),
        body: pick(rng, [
          'Great product, highly recommend!',
          'Works as expected, good value for money.',
          'Could be better. The quality is average.',
          'Excellent service and fast delivery.',
          'Not what I expected. Returning it.',
          'Best purchase I made this year!',
          'Decent quality but overpriced.',
        ]),
        rating: randInt(rng, 1, 5),
        status: pick(rng, ['approved', 'pending', 'rejected']),
      };
    }
    default: {
      return {
        ...base,
        name: `${resource}_${id.slice(0, 8)}`,
        type: resource,
        status: pick(rng, ['active', 'inactive', 'pending']),
        metadata: {},
      };
    }
  }
}

function generateErrorResponse(rng, statusCode, resource, method) {
  const info = HTTP_STATUS_MAP[statusCode] || { text: 'Error', description: 'An error occurred' };
  const errors = {
    400: [
      { field: 'email', message: 'Invalid email format' },
      { field: 'name', message: 'Name is required and must be at least 2 characters' },
    ],
    401: null,
    403: null,
    404: null,
    409: null,
    422: [
      { field: 'price', message: 'Price must be a positive number' },
      { field: 'quantity', message: 'Quantity must be between 1 and 1000' },
    ],
    429: null,
    500: null,
  };

  const body = {
    error: {
      code: statusCode,
      type: info.text.toLowerCase().replace(/\s+/g, '_'),
      message: `${info.text}: ${info.description}`,
    },
    request_id: generateUUID(rng),
    timestamp: new Date().toISOString(),
  };

  if (errors[statusCode]) {
    body.error.details = errors[statusCode];
  }

  if (statusCode === 429) {
    body.error.retry_after = randInt(rng, 30, 300);
  }

  return body;
}

// ============================================================
// Tool 3: generate_openapi
// ============================================================

function generateOpenAPI(description, title, version) {
  const apiTitle = title || 'Generated API';
  const apiVersion = version || '1.0.0';

  // Parse endpoints from description
  const endpoints = parseEndpointsFromDescription(description);

  const spec = {
    openapi: '3.0.3',
    info: {
      title: apiTitle,
      version: apiVersion,
      description: description,
    },
    servers: [
      { url: 'https://api.example.com/v1', description: 'Production' },
      { url: 'https://staging-api.example.com/v1', description: 'Staging' },
    ],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  };

  for (const ep of endpoints) {
    if (!spec.paths[ep.path]) spec.paths[ep.path] = {};
    const operation = {
      summary: ep.summary,
      operationId: `${ep.method.toLowerCase()}${ep.path.split('/').filter(Boolean).map(s => s.replace(/[{}]/g, '').charAt(0).toUpperCase() + s.replace(/[{}]/g, '').slice(1)).join('')}`,
      tags: [ep.tag || 'default'],
      parameters: ep.parameters || [],
      responses: {},
    };

    if (ep.method === 'post' || ep.method === 'put' || ep.method === 'patch') {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: { '$ref': `#/components/schemas/${ep.schemaName}Input` },
          },
        },
      };
      // Add input schema
      spec.components.schemas[`${ep.schemaName}Input`] = ep.inputSchema || {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Example' },
          description: { type: 'string', example: 'A description' },
        },
        required: ['name'],
      };
    }

    // Success response
    const successCode = ep.method === 'post' ? '201' : ep.method === 'delete' ? '204' : '200';
    if (successCode === '204') {
      operation.responses[successCode] = { description: 'No Content' };
    } else {
      operation.responses[successCode] = {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: ep.isList
              ? {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { '$ref': `#/components/schemas/${ep.schemaName}` } },
                    pagination: { '$ref': '#/components/schemas/Pagination' },
                  },
                }
              : { '$ref': `#/components/schemas/${ep.schemaName}` },
          },
        },
      };
    }

    // Error responses
    operation.responses['400'] = { description: 'Bad Request', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } };
    operation.responses['401'] = { description: 'Unauthorized' };
    operation.responses['404'] = { description: 'Not Found' };
    operation.responses['500'] = { description: 'Internal Server Error' };

    spec.paths[ep.path][ep.method] = operation;

    // Add resource schema
    if (!spec.components.schemas[ep.schemaName]) {
      spec.components.schemas[ep.schemaName] = ep.schema || {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
        required: ['id'],
      };
    }
  }

  // Standard schemas
  spec.components.schemas.Pagination = {
    type: 'object',
    properties: {
      page: { type: 'integer', example: 1 },
      per_page: { type: 'integer', example: 20 },
      total: { type: 'integer', example: 100 },
      total_pages: { type: 'integer', example: 5 },
    },
  };
  spec.components.schemas.Error = {
    type: 'object',
    properties: {
      error: {
        type: 'object',
        properties: {
          code: { type: 'integer' },
          type: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } },
        },
      },
      request_id: { type: 'string', format: 'uuid' },
      timestamp: { type: 'string', format: 'date-time' },
    },
  };

  return {
    openapi_spec: spec,
    endpoints_count: endpoints.length,
    paths_count: Object.keys(spec.paths).length,
    schemas_count: Object.keys(spec.components.schemas).length,
    ecosystem: ECOSYSTEM,
  };
}

function parseEndpointsFromDescription(desc) {
  const endpoints = [];
  const d = desc.toLowerCase();

  // Try to extract resources from description
  const resourcePatterns = [
    /(?:manage|crud|create|list|get|update|delete)\s+(\w+)/gi,
    /(\w+)\s+(?:api|endpoint|resource|service)/gi,
    /\/(\w+)/g,
  ];

  const resources = new Set();
  for (const pattern of resourcePatterns) {
    let match;
    while ((match = pattern.exec(d)) !== null) {
      const r = match[1].toLowerCase();
      if (!['api', 'endpoint', 'resource', 'service', 'the', 'a', 'an', 'and', 'or', 'with', 'for', 'to', 'of', 'in', 'v1', 'v2'].includes(r) && r.length > 1) {
        resources.add(r);
      }
    }
  }

  if (resources.size === 0) resources.add('item');

  for (const resource of resources) {
    const singular = resource.replace(/s$/, '');
    const plural = singular + 's';
    const schemaName = singular.charAt(0).toUpperCase() + singular.slice(1);

    // Generate CRUD endpoints
    endpoints.push({
      path: `/${plural}`,
      method: 'get',
      summary: `List all ${plural}`,
      tag: plural,
      schemaName,
      isList: true,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
        { name: 'per_page', in: 'query', schema: { type: 'integer', default: 20 }, description: 'Items per page' },
        { name: 'sort', in: 'query', schema: { type: 'string', enum: ['created_at', 'updated_at', 'name'] }, description: 'Sort field' },
      ],
    });

    endpoints.push({
      path: `/${plural}/{id}`,
      method: 'get',
      summary: `Get a ${singular} by ID`,
      tag: plural,
      schemaName,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: `${schemaName} ID` },
      ],
    });

    endpoints.push({
      path: `/${plural}`,
      method: 'post',
      summary: `Create a new ${singular}`,
      tag: plural,
      schemaName,
    });

    endpoints.push({
      path: `/${plural}/{id}`,
      method: 'put',
      summary: `Update a ${singular}`,
      tag: plural,
      schemaName,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: `${schemaName} ID` },
      ],
    });

    endpoints.push({
      path: `/${plural}/{id}`,
      method: 'delete',
      summary: `Delete a ${singular}`,
      tag: plural,
      schemaName,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: `${schemaName} ID` },
      ],
    });
  }

  return endpoints;
}

// ============================================================
// Tool 4: fake_database
// ============================================================

function fakeDatabase(tableName, columns, rowCount, seed) {
  const rng = seededRng(seed || `${tableName}-${rowCount}-${Date.now()}`);
  const count = Math.max(1, Math.min(100, rowCount || 10));
  const tbl = tableName || 'records';

  // Parse column definitions
  const colDefs = parseColumns(columns);
  if (colDefs.error) return { error: colDefs.error };

  const rows = [];
  for (let i = 0; i < count; i++) {
    const row = {};
    for (const col of colDefs) {
      row[col.name] = generateColumnValue(rng, col, i);
    }
    rows.push(row);
  }

  // Generate CREATE TABLE SQL
  const sqlTypes = colDefs.map(c => `  ${c.name} ${sqlTypeFor(c.type)}${c.primary ? ' PRIMARY KEY' : ''}${c.nullable === false ? ' NOT NULL' : ''}`);
  const createSql = `CREATE TABLE ${tbl} (\n${sqlTypes.join(',\n')}\n);`;

  // Generate INSERT SQL (first 5 rows sample)
  const sampleRows = rows.slice(0, 5);
  const insertSql = sampleRows.map(row => {
    const vals = colDefs.map(c => {
      const v = row[c.name];
      if (v === null) return 'NULL';
      if (typeof v === 'number' || typeof v === 'boolean') return String(v);
      return `'${String(v).replace(/'/g, "''")}'`;
    });
    return `INSERT INTO ${tbl} (${colDefs.map(c => c.name).join(', ')}) VALUES (${vals.join(', ')});`;
  }).join('\n');

  return {
    table_name: tbl,
    columns: colDefs.map(c => ({ name: c.name, type: c.type })),
    row_count: count,
    rows,
    sql: {
      create_table: createSql,
      sample_inserts: insertSql,
    },
    ecosystem: ECOSYSTEM,
  };
}

function parseColumns(columns) {
  if (!columns || !Array.isArray(columns) || columns.length === 0) {
    // Default columns
    return [
      { name: 'id', type: 'uuid', primary: true, nullable: false },
      { name: 'name', type: 'name', nullable: false },
      { name: 'email', type: 'email', nullable: false },
      { name: 'created_at', type: 'datetime', nullable: false },
    ];
  }

  const parsed = [];
  for (const col of columns) {
    if (typeof col === 'string') {
      const parts = col.split(':').map(s => s.trim());
      parsed.push({ name: parts[0], type: parts[1] || 'string', nullable: true });
    } else if (typeof col === 'object') {
      parsed.push({
        name: col.name,
        type: col.type || 'string',
        primary: col.primary || false,
        nullable: col.nullable !== false,
      });
    }
  }
  return parsed;
}

function generateColumnValue(rng, col, rowIndex) {
  switch (col.type.toLowerCase()) {
    case 'id':
    case 'serial':
    case 'auto_increment':
      return rowIndex + 1;
    case 'uuid':
      return generateUUID(rng);
    case 'name':
    case 'full_name': {
      const n = generateName(rng, 'en');
      return n.full_name;
    }
    case 'first_name': {
      const n = generateName(rng, 'en');
      return n.first_name;
    }
    case 'last_name': {
      const n = generateName(rng, 'en');
      return n.last_name;
    }
    case 'email': {
      const n = generateName(rng, 'en');
      return generateEmail(rng, 'en', n);
    }
    case 'phone':
      return generatePhone(rng, DATA_POOLS.en.phoneFmt);
    case 'address':
      return generateAddress(rng, 'en').full;
    case 'city':
      return pick(rng, DATA_POOLS.en.cities);
    case 'state':
      return pick(rng, DATA_POOLS.en.states);
    case 'zip':
    case 'zipcode':
    case 'postal_code':
      return generateZip(rng, 'en');
    case 'country':
      return pick(rng, ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'JP', 'BR', 'IN', 'CN']);
    case 'date':
      return generateDate(rng, 2020, 2025);
    case 'datetime':
    case 'timestamp':
      return generateDatetime(rng);
    case 'boolean':
    case 'bool':
      return rng() > 0.5;
    case 'integer':
    case 'int':
      return randInt(rng, 1, 10000);
    case 'float':
    case 'double':
    case 'decimal':
    case 'number':
      return parseFloat((rng() * 1000).toFixed(2));
    case 'price':
    case 'amount':
    case 'money':
      return parseFloat((rng() * 500 + 1).toFixed(2));
    case 'percentage':
    case 'percent':
      return parseFloat((rng() * 100).toFixed(1));
    case 'url':
    case 'website':
      return `https://${pick(rng, ['example', 'test', 'demo', 'sample', 'mock'])}.${pick(rng, ['com', 'org', 'net', 'io', 'dev'])}/${generateUUID(rng).slice(0, 8)}`;
    case 'ip':
    case 'ip_address':
      return generateIP(rng);
    case 'company':
      return pick(rng, DATA_POOLS.en.companies);
    case 'status':
      return pick(rng, ['active', 'inactive', 'pending', 'suspended', 'archived']);
    case 'role':
      return pick(rng, ['admin', 'user', 'editor', 'moderator', 'viewer']);
    case 'color':
      return '#' + randInt(rng, 0, 0xFFFFFF).toString(16).padStart(6, '0');
    case 'text':
    case 'description':
    case 'bio':
      return pick(rng, [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
        'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.',
        'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.',
      ]);
    case 'string':
    default:
      return `${col.name}_${randInt(rng, 1000, 9999)}`;
  }
}

function sqlTypeFor(type) {
  const map = {
    id: 'SERIAL', serial: 'SERIAL', auto_increment: 'SERIAL',
    uuid: 'UUID', name: 'VARCHAR(255)', full_name: 'VARCHAR(255)',
    first_name: 'VARCHAR(100)', last_name: 'VARCHAR(100)',
    email: 'VARCHAR(255)', phone: 'VARCHAR(50)',
    address: 'TEXT', city: 'VARCHAR(100)', state: 'VARCHAR(50)',
    zip: 'VARCHAR(20)', zipcode: 'VARCHAR(20)', postal_code: 'VARCHAR(20)',
    country: 'VARCHAR(10)', date: 'DATE', datetime: 'TIMESTAMP',
    timestamp: 'TIMESTAMP', boolean: 'BOOLEAN', bool: 'BOOLEAN',
    integer: 'INTEGER', int: 'INTEGER', float: 'FLOAT',
    double: 'DOUBLE PRECISION', decimal: 'DECIMAL(10,2)',
    number: 'NUMERIC', price: 'DECIMAL(10,2)', amount: 'DECIMAL(10,2)',
    money: 'DECIMAL(10,2)', percentage: 'DECIMAL(5,1)', percent: 'DECIMAL(5,1)',
    url: 'TEXT', website: 'TEXT', ip: 'VARCHAR(45)', ip_address: 'VARCHAR(45)',
    company: 'VARCHAR(255)', status: 'VARCHAR(50)', role: 'VARCHAR(50)',
    color: 'VARCHAR(7)', text: 'TEXT', description: 'TEXT', bio: 'TEXT',
    string: 'VARCHAR(255)',
  };
  return map[type.toLowerCase()] || 'VARCHAR(255)';
}

// ============================================================
// Tool 5: http_status_lookup
// ============================================================

const HTTP_STATUS_MAP = {
  100: { text: 'Continue', description: 'Server received the request headers; client should proceed to send the body.', cause: 'Client sent Expect: 100-continue header.', fix: 'Proceed to send request body.' },
  101: { text: 'Switching Protocols', description: 'Server is switching protocols as requested by client.', cause: 'Client requested protocol upgrade (e.g., WebSocket).', fix: 'Handle the protocol switch accordingly.' },
  200: { text: 'OK', description: 'Request succeeded.', cause: 'Normal successful request.', fix: 'No fix needed. This is the expected success response.' },
  201: { text: 'Created', description: 'Request succeeded and a new resource was created.', cause: 'Successful POST/PUT request that created a resource.', fix: 'Check the Location header for the new resource URL.' },
  204: { text: 'No Content', description: 'Request succeeded but there is no content to return.', cause: 'Successful DELETE or PUT with no response body.', fix: 'No fix needed. Response has no body by design.' },
  301: { text: 'Moved Permanently', description: 'Resource has been permanently moved to a new URL.', cause: 'URL structure change, domain migration.', fix: 'Update your URL to the new location in the Location header.' },
  302: { text: 'Found', description: 'Resource temporarily located at a different URL.', cause: 'Temporary redirect, often after form submission.', fix: 'Follow the redirect. Use the original URL for future requests.' },
  304: { text: 'Not Modified', description: 'Resource has not been modified since last request.', cause: 'Conditional request (If-None-Match, If-Modified-Since) matched.', fix: 'Use cached version. No fix needed.' },
  400: { text: 'Bad Request', description: 'Server cannot process the request due to client error.', cause: 'Malformed request syntax, invalid parameters, missing required fields.', fix: 'Check request body format, validate all required parameters, ensure correct Content-Type header.' },
  401: { text: 'Unauthorized', description: 'Authentication is required and has failed or not been provided.', cause: 'Missing or invalid authentication token/credentials.', fix: 'Include valid Authorization header. Check if token is expired. Re-authenticate if needed.' },
  403: { text: 'Forbidden', description: 'Server understood the request but refuses to authorize it.', cause: 'Insufficient permissions, IP blocked, account suspended.', fix: 'Check user permissions/roles. Ensure API key has required scopes. Contact admin if blocked.' },
  404: { text: 'Not Found', description: 'The requested resource could not be found.', cause: 'Wrong URL, deleted resource, typo in path.', fix: 'Verify the URL path. Check if resource ID exists. Ensure API version is correct.' },
  405: { text: 'Method Not Allowed', description: 'HTTP method is not supported for this endpoint.', cause: 'Using POST on a GET-only endpoint, etc.', fix: 'Check API docs for allowed methods. Look at the Allow header in response.' },
  408: { text: 'Request Timeout', description: 'Server timed out waiting for the request.', cause: 'Slow network, large payload, server overloaded.', fix: 'Retry the request. Check network connection. Reduce payload size.' },
  409: { text: 'Conflict', description: 'Request conflicts with the current state of the resource.', cause: 'Duplicate entry, version conflict, resource already exists.', fix: 'Fetch the latest version and retry. Use unique values. Handle concurrent updates.' },
  410: { text: 'Gone', description: 'Resource is no longer available and no forwarding address is known.', cause: 'Resource permanently deleted, API version deprecated.', fix: 'Resource is permanently removed. Update to use the replacement.' },
  413: { text: 'Payload Too Large', description: 'Request body exceeds the server limit.', cause: 'File too large, request body too big.', fix: 'Reduce payload size. Use chunked upload. Compress data.' },
  415: { text: 'Unsupported Media Type', description: 'Server does not support the request content type.', cause: 'Wrong Content-Type header.', fix: 'Set Content-Type to application/json or the correct media type.' },
  422: { text: 'Unprocessable Entity', description: 'Server understands the content but cannot process the instructions.', cause: 'Validation errors, semantic errors in request data.', fix: 'Check response body for validation errors. Fix the specific fields mentioned.' },
  429: { text: 'Too Many Requests', description: 'Client has sent too many requests in a given time.', cause: 'Rate limit exceeded.', fix: 'Check Retry-After header. Implement exponential backoff. Reduce request frequency.' },
  500: { text: 'Internal Server Error', description: 'Server encountered an unexpected condition.', cause: 'Unhandled exception, database error, configuration issue.', fix: 'Retry later. If persistent, report to API provider with request_id.' },
  502: { text: 'Bad Gateway', description: 'Server received an invalid response from upstream.', cause: 'Upstream server down, network issue between servers.', fix: 'Retry after a short delay. Check if the API service is experiencing an outage.' },
  503: { text: 'Service Unavailable', description: 'Server is temporarily unable to handle the request.', cause: 'Server maintenance, overloaded, deploying.', fix: 'Check Retry-After header. Wait and retry. Check status page.' },
  504: { text: 'Gateway Timeout', description: 'Server did not receive a timely response from upstream.', cause: 'Upstream server too slow, complex query timeout.', fix: 'Retry with simpler query. Increase timeout if configurable. Check upstream health.' },
};

function httpStatusLookup(code) {
  if (!code) return { error: 'Status code is required' };
  const c = parseInt(code, 10);

  // Single code lookup
  if (HTTP_STATUS_MAP[c]) {
    const info = HTTP_STATUS_MAP[c];
    return {
      code: c,
      text: info.text,
      description: info.description,
      common_causes: info.cause,
      fix_suggestions: info.fix,
      category: getStatusCategory(c),
      ecosystem: ECOSYSTEM,
    };
  }

  // Range lookup
  if (c >= 100 && c < 600) {
    return {
      code: c,
      text: 'Non-Standard Status Code',
      description: `HTTP status ${c} is not a standard status code.`,
      category: getStatusCategory(c),
      note: 'This may be a custom status code defined by the server.',
      standard_codes_in_range: Object.keys(HTTP_STATUS_MAP)
        .map(Number)
        .filter(k => Math.floor(k / 100) === Math.floor(c / 100))
        .map(k => ({ code: k, text: HTTP_STATUS_MAP[k].text })),
      ecosystem: ECOSYSTEM,
    };
  }

  // If "all" or range requested
  if (String(code).toLowerCase() === 'all') {
    const grouped = {};
    for (const [k, v] of Object.entries(HTTP_STATUS_MAP)) {
      const cat = getStatusCategory(Number(k));
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ code: Number(k), text: v.text, description: v.description });
    }
    return { codes: grouped, total: Object.keys(HTTP_STATUS_MAP).length, ecosystem: ECOSYSTEM };
  }

  return { error: `Invalid status code: ${code}. Provide a number (100-599) or "all".` };
}

function getStatusCategory(code) {
  if (code < 200) return '1xx Informational';
  if (code < 300) return '2xx Success';
  if (code < 400) return '3xx Redirection';
  if (code < 500) return '4xx Client Error';
  return '5xx Server Error';
}

// ============================================================
// Tool 6: api_diff
// ============================================================

function apiDiff(responseA, responseB) {
  let a, b;
  try {
    a = typeof responseA === 'string' ? JSON.parse(responseA) : responseA;
  } catch (e) {
    return { error: `response_a is invalid JSON: ${e.message}` };
  }
  try {
    b = typeof responseB === 'string' ? JSON.parse(responseB) : responseB;
  } catch (e) {
    return { error: `response_b is invalid JSON: ${e.message}` };
  }

  const added = [];
  const removed = [];
  const typeChanges = [];
  const structureA = {};
  const structureB = {};

  flattenStructure(a, '', structureA);
  flattenStructure(b, '', structureB);

  const allPaths = new Set([...Object.keys(structureA), ...Object.keys(structureB)]);

  for (const path of allPaths) {
    const inA = path in structureA;
    const inB = path in structureB;

    if (inA && !inB) {
      removed.push({ path, type: structureA[path].type, sample_value: structureA[path].sample });
    } else if (!inA && inB) {
      added.push({ path, type: structureB[path].type, sample_value: structureB[path].sample });
    } else if (inA && inB && structureA[path].type !== structureB[path].type) {
      typeChanges.push({
        path,
        old_type: structureA[path].type,
        new_type: structureB[path].type,
        old_sample: structureA[path].sample,
        new_sample: structureB[path].sample,
      });
    }
  }

  const totalChanges = added.length + removed.length + typeChanges.length;

  return {
    identical_structure: totalChanges === 0,
    summary: {
      added_fields: added.length,
      removed_fields: removed.length,
      type_changes: typeChanges.length,
      total_changes: totalChanges,
      fields_in_a: Object.keys(structureA).length,
      fields_in_b: Object.keys(structureB).length,
    },
    added,
    removed,
    type_changes: typeChanges,
    breaking_changes: [...removed, ...typeChanges].map(c => ({
      path: c.path,
      reason: c.old_type ? `Type changed from ${c.old_type} to ${c.new_type}` : 'Field removed',
      severity: 'breaking',
    })),
    ecosystem: ECOSYSTEM,
  };
}

function flattenStructure(obj, prefix, result) {
  if (obj === null) {
    result[prefix || '$'] = { type: 'null', sample: null };
    return;
  }
  if (Array.isArray(obj)) {
    result[prefix || '$'] = { type: 'array', sample: `Array(${obj.length})` };
    if (obj.length > 0) {
      flattenStructure(obj[0], `${prefix}[]`, result);
    }
    return;
  }
  if (typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      flattenStructure(val, path, result);
    }
    return;
  }
  const type = typeof obj;
  const sample = type === 'string' ? (obj.length > 50 ? obj.slice(0, 50) + '...' : obj) : obj;
  result[prefix || '$'] = { type, sample };
}

// ============================================================
// MCP Tools Definitions
// ============================================================

const TOOLS = [
  {
    name: 'generate_mock_data',
    description: 'Generate realistic fake data: names, emails, addresses, phone numbers, UUIDs, dates, credit cards (fake), IP addresses, companies, or full profiles. Supports locales: en (English), ja (Japanese with real kanji names/addresses), zh (Chinese). Use seed for reproducible results.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['name', 'email', 'address', 'phone', 'uuid', 'date', 'datetime', 'credit_card', 'ip', 'company', 'full_profile'], description: 'Type of fake data to generate' },
        count: { type: 'integer', description: 'Number of items to generate (1-50, default 1)', default: 1, minimum: 1, maximum: 50 },
        locale: { type: 'string', enum: ['en', 'ja', 'zh'], description: 'Locale for data generation (default "en")', default: 'en' },
        seed: { type: 'string', description: 'Seed for reproducible output. Same seed + params = same data.' },
      },
      required: ['type'],
    },
  },
  {
    name: 'mock_api_response',
    description: 'Given an API endpoint description, generate a realistic mock JSON response with proper status codes, headers, and optional pagination. Infers resource type from the endpoint path (e.g., /users generates user objects, /products generates product objects).',
    inputSchema: {
      type: 'object',
      properties: {
        endpoint: { type: 'string', description: 'API endpoint path (e.g., "/api/v1/users", "/products/123")' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], description: 'HTTP method (default GET)', default: 'GET' },
        status_code: { type: 'integer', description: 'HTTP status code for the response (default 200)', default: 200 },
        include_headers: { type: 'boolean', description: 'Include response headers (default true)', default: true },
        paginate: { type: 'boolean', description: 'Include pagination metadata (for list endpoints)', default: false },
        item_count: { type: 'integer', description: 'Number of items in list response (1-25, default 5)', default: 5, minimum: 1, maximum: 25 },
      },
      required: ['endpoint'],
    },
  },
  {
    name: 'generate_openapi',
    description: 'Generate an OpenAPI 3.0 spec from a natural language API description. Describe what your API does and what resources it manages, and get a complete OpenAPI spec with CRUD endpoints, schemas, pagination, authentication, and error responses.',
    inputSchema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Natural language description of the API (e.g., "A REST API to manage users, products, and orders for an e-commerce platform")' },
        title: { type: 'string', description: 'API title (default "Generated API")', default: 'Generated API' },
        version: { type: 'string', description: 'API version (default "1.0.0")', default: '1.0.0' },
      },
      required: ['description'],
    },
  },
  {
    name: 'fake_database',
    description: 'Generate a mock database table with realistic data. Specify column names and types, and get back rows of fake data plus CREATE TABLE and INSERT SQL statements. Supported types: uuid, name, email, phone, address, city, state, zip, country, date, datetime, boolean, integer, float, price, percentage, url, ip, company, status, role, color, text, string.',
    inputSchema: {
      type: 'object',
      properties: {
        table_name: { type: 'string', description: 'Table name (default "records")', default: 'records' },
        columns: {
          type: 'array',
          description: 'Column definitions. Each item can be a string "name:type" (e.g., "email:email") or an object {name, type, primary?, nullable?}. If omitted, defaults to id/name/email/created_at.',
          items: {},
        },
        row_count: { type: 'integer', description: 'Number of rows to generate (1-100, default 10)', default: 10, minimum: 1, maximum: 100 },
        seed: { type: 'string', description: 'Seed for reproducible output' },
      },
    },
  },
  {
    name: 'http_status_lookup',
    description: 'Look up HTTP status codes with descriptions, common causes, and fix suggestions. Pass a specific code (e.g., 404) or "all" for a complete reference grouped by category.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { description: 'HTTP status code (number like 404) or "all" for complete list' },
      },
      required: ['code'],
    },
  },
  {
    name: 'api_diff',
    description: 'Compare two API response structures and highlight differences: added fields, removed fields, and type changes. Identifies breaking changes. Pass two JSON responses to compare.',
    inputSchema: {
      type: 'object',
      properties: {
        response_a: { type: 'string', description: 'First API response (JSON string) - the "before" version' },
        response_b: { type: 'string', description: 'Second API response (JSON string) - the "after" version' },
      },
      required: ['response_a', 'response_b'],
    },
  },
];

// ============================================================
// MCP Tool Dispatch
// ============================================================

async function handleToolCall(id, params) {
  const { name, arguments: args } = params;

  try {
    let result;
    switch (name) {
      case 'generate_mock_data':
        result = generateMockData(args?.type ?? 'name', args?.count ?? 1, args?.locale ?? 'en', args?.seed);
        break;
      case 'mock_api_response':
        result = mockApiResponse(args?.endpoint ?? '/api/items', args?.method ?? 'GET', args?.status_code ?? 200, args?.include_headers ?? true, args?.paginate ?? false, args?.item_count ?? 5);
        break;
      case 'generate_openapi':
        result = generateOpenAPI(args?.description ?? 'A REST API', args?.title ?? 'Generated API', args?.version ?? '1.0.0');
        break;
      case 'fake_database':
        result = fakeDatabase(args?.table_name ?? 'records', args?.columns, args?.row_count ?? 10, args?.seed);
        break;
      case 'http_status_lookup':
        result = httpStatusLookup(args?.code);
        break;
      case 'api_diff':
        result = apiDiff(args?.response_a ?? '{}', args?.response_b ?? '{}');
        break;
      default:
        return jsonRpcError(id, -32601, `Tool not found: ${name}`);
    }

    if (result.error) {
      return jsonRpcResponse(id, toolError(result.error));
    }
    return jsonRpcResponse(id, toolResult(result));
  } catch (e) {
    return jsonRpcResponse(id, toolError(`Internal error: ${e.message}`));
  }
}

// Semantic Cache
async function cacheHash(str) {
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getCached(kv, server, tool, args) {
  if (!kv) return null;
  try {
    const h = await cacheHash(JSON.stringify(args));
    const val = await kv.get(`cache:${server}:${tool}:${h}`);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

async function setCache(kv, server, tool, args, result, ttl = 86400) {
  if (!kv) return;
  try {
    const h = await cacheHash(JSON.stringify(args));
    await kv.put(`cache:${server}:${tool}:${h}`, JSON.stringify(result), { expirationTtl: ttl });
  } catch {}
}

// Dynamic Upgrade Prompt
function addUpgradePrompt(response, rateLimitInfo) {
  if (!rateLimitInfo || !response?.result?.content?.[0]) return;
  if (response.result.isError) return;
  const c = response.result.content[0];
  if (c.type !== 'text' || !c.text) return;

  const used = rateLimitInfo.used || 0;
  const remaining = rateLimitInfo.remaining ?? 0;

  let msg = '';
  if (remaining <= 2 && remaining > 0) {
    msg = `\n\n${remaining} call${remaining === 1 ? '' : 's'} left today. Pro $29/mo: paypal.me/Yagami8095/29 (PayPal) | https://product-store.yagami8095.workers.dev/products/ecosystem-pro (Card/Stripe)`;
  } else if (used <= 3) {
    msg = '\n\n-- powered by OpenClaw (openclaw.dev)';
  }

  if (msg) c.text += msg;
}

// ============================================================
// MCP Protocol dispatcher
// ============================================================

async function handleMcpRequest(req, kv, clientIp, _proKeyInfo, apiKey) {
  const isBatch = Array.isArray(req);
  const requests = isBatch ? req : [req];
  const responses = [];

  const hasToolCall = requests.some(r => r.method === 'tools/call');
  let rateLimitInfo = null;
  if (hasToolCall) {
    rateLimitInfo = await checkRateLimit(kv, clientIp);

    if (_proKeyInfo && _proKeyInfo.valid) {
      rateLimitInfo = await proKeyRateLimit(kv, apiKey, _proKeyInfo.daily_limit);
    }

    if (!rateLimitInfo.allowed) {
      const rl = jsonRpcError(
        requests.find(r => r.method === 'tools/call')?.id ?? null,
        -32029,
        `Rate limit exceeded (${RATE_LIMIT_MAX}/day). FREE 7-day trial (100 calls/day): https://product-store.yagami8095.workers.dev/auth/login\n\nPro ($29/mo, 50,000/month): https://paypal.me/Yagami8095/29 (PayPal) | https://product-store.yagami8095.workers.dev/products/ecosystem-pro (Card/Stripe) | x402: $0.05/call USDC on Base`
      );
      return isBatch ? [rl] : rl;
    }
  }

  for (const r of requests) {
    if (!r || typeof r !== 'object' || r.jsonrpc !== '2.0' || !r.method) {
      responses.push(jsonRpcError(r?.id ?? null, -32600, 'Invalid JSON-RPC 2.0 request'));
      continue;
    }

    switch (r.method) {
      case 'initialize':
        responses.push(jsonRpcResponse(r.id, {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: CAPABILITIES,
          serverInfo: SERVER_INFO,
          vendor: VENDOR,
        }));
        break;

      case 'notifications/initialized':
        break;

      case 'ping':
        responses.push(jsonRpcResponse(r.id, {}));
        break;

      case 'tools/list':
        responses.push(jsonRpcResponse(r.id, { tools: TOOLS }));
        break;

      case 'tools/call': {
        const toolName = r.params?.name;
        const toolArgs = r.params?.arguments || {};
        Object.keys(toolArgs).forEach(k => { if (typeof toolArgs[k] === 'string') toolArgs[k] = sanitizeInput(toolArgs[k]); });

        // Cache check (only for seeded/deterministic calls)
        const cached = await getCached(kv, 'apimock', toolName, toolArgs);
        if (cached) {
          const cachedResp = jsonRpcResponse(r.id, cached);
          addUpgradePrompt(cachedResp, rateLimitInfo);
          responses.push(cachedResp);
          break;
        }

        const toolResp = await handleToolCall(r.id, r.params || {});
        addUpgradePrompt(toolResp, rateLimitInfo);

        if (toolResp?.result && !toolResp.result.isError) {
          await setCache(kv, 'apimock', toolName, toolArgs, toolResp.result);
        }

        responses.push(toolResp);
        break;
      }

      default:
        responses.push(jsonRpcError(r.id, -32601, `Method not found: ${r.method}`));
    }
  }

  const filtered = responses.filter(Boolean);
  if (filtered.length === 0) return null;
  return isBatch ? filtered : filtered[0];
}

// ============================================================
// Landing Page
// ============================================================

function buildLandingHtml() {
  const tools = [
    { name: 'generate_mock_data',  desc: 'Generate realistic fake data: names, emails, addresses, phones, UUIDs, dates, credit cards, IPs (en/ja/zh locales)' },
    { name: 'mock_api_response',   desc: 'Generate mock JSON API responses with status codes, headers, and pagination' },
    { name: 'generate_openapi',    desc: 'Generate OpenAPI 3.0 spec from natural language API description' },
    { name: 'fake_database',       desc: 'Generate mock database tables with realistic data and SQL statements' },
    { name: 'http_status_lookup',  desc: 'Look up HTTP status codes with descriptions, causes, and fix suggestions' },
    { name: 'api_diff',            desc: 'Compare two API response structures and highlight differences' },
  ];

  const toolsHtml = tools.map(t => `
        <li class="py-3 border-b border-violet-900/50 last:border-0">
          <code class="text-violet-400 font-semibold">${t.name}</code>
          <span class="text-gray-400 text-sm ml-2">-- ${t.desc}</span>
        </li>`).join('');

  const ecosystemHtml = Object.entries({
    'json-toolkit-mcp':       { url: ECOSYSTEM.json_toolkit, desc: 'JSON format, validate, diff, query, transform, schema generation' },
    'openclaw-intel-mcp':     { url: ECOSYSTEM.intel,        desc: 'AI market intelligence -- track Claude Code, Cursor, Devin growth trends' },
    'openclaw-fortune-mcp':   { url: ECOSYSTEM.fortune,      desc: 'Daily zodiac horoscope & tarot readings for all 12 signs' },
    'moltbook-publisher-mcp': { url: ECOSYSTEM.moltbook,     desc: 'Japanese content publishing -- MD to HTML, SEO, EN to JP' },
    'agentforge-compare-mcp': { url: ECOSYSTEM.agentforge,   desc: 'AI coding tool comparison -- Claude Code vs Cursor vs Devin' },
    'regex-engine-mcp':       { url: ECOSYSTEM.regex,        desc: 'Regex testing, debugging, explanation & generation' },
    'color-palette-mcp':      { url: ECOSYSTEM.color,        desc: 'Color palette generation, conversion, contrast checks' },
    'prompt-enhancer-mcp':    { url: ECOSYSTEM.prompt,       desc: 'Prompt optimization, rewriting, scoring & multilingual enhancement' },
    'timestamp-converter-mcp':{ url: ECOSYSTEM.timestamp,    desc: 'Unix/ISO timestamp conversion, timezone math & duration calc' },
    'product-store':          { url: ECOSYSTEM.store,         desc: 'AI tools, templates, and intelligence products' },
  }).map(([name, info]) => `
        <li class="py-2 text-sm">
          <a href="${info.url.replace('/mcp', '')}" class="text-violet-400 hover:underline font-medium">${name}</a>
          <span class="text-gray-500 ml-2">-- ${info.desc}</span>
        </li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Mocker MCP -- OpenClaw Intelligence</title>
  <meta name="description" content="Free MCP server with 6 API mocking tools for AI agents: generate fake data, mock API responses, OpenAPI specs, fake databases, HTTP status lookup, and API diff. Works with Claude Code, Cursor, Windsurf.">
  <meta name="keywords" content="API mocker, mock data, fake data generator, OpenAPI generator, MCP server, AI tools, Claude Code">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://api-mocker-mcp.yagami8095.workers.dev">
  <meta property="og:type" content="website">
  <meta property="og:title" content="API Mocker MCP Server - Mock Data, API Responses & OpenAPI Specs | OpenClaw">
  <meta property="og:description" content="Free MCP server with 6 API mocking tools for AI agents: generate fake data, mock API responses, OpenAPI specs, fake databases, HTTP status lookup, and API diff.">
  <meta property="og:url" content="https://api-mocker-mcp.yagami8095.workers.dev">
  <meta property="og:site_name" content="OpenClaw Intelligence">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="API Mocker MCP Server - Mock Data, API Responses & OpenAPI Specs | OpenClaw">
  <meta name="twitter:description" content="Free MCP server with 6 API mocking tools for AI agents: generate fake data, mock API responses, OpenAPI specs, fake databases, HTTP status lookup, and API diff.">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    pre { scrollbar-width: thin; scrollbar-color: #7c3aed #1e1033; }
    pre::-webkit-scrollbar { height: 6px; }
    pre::-webkit-scrollbar-track { background: #1e1033; }
    pre::-webkit-scrollbar-thumb { background: #7c3aed; border-radius: 3px; }
  </style>

  <script type="application/ld+json">
  {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "API Mocker MCP Server",
  "description": "Free MCP server with 6 API mocking tools for AI agents: generate fake data, mock API responses, OpenAPI specs, fake databases, HTTP status lookup, and API diff.",
  "url": "https://api-mocker-mcp.yagami8095.workers.dev",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "author": {
    "@type": "Organization",
    "name": "OpenClaw Intelligence",
    "url": "https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers"
  }
}
  <\/script>
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen font-sans">

  <!-- Header -->
  <header class="border-b border-violet-900/50 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
    <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-br from-violet-400 to-purple-600 rounded-lg flex items-center justify-center text-gray-950 font-bold text-sm">&lt;/&gt;</div>
        <span class="font-bold text-lg text-white">API Mocker MCP</span>
        <span class="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">v1.0.0</span>
      </div>
      <span class="text-xs text-gray-500">by OpenClaw Intelligence</span>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-6 py-12">

    <!-- Hero -->
    <div class="mb-12 text-center">
      <div class="inline-block bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-800/50 rounded-2xl px-6 py-2 mb-6">
        <span class="text-violet-400 text-sm font-medium">Free Tier: 15 requests/day per IP</span>
      </div>
      <h1 class="text-4xl font-bold mb-4 bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
        API Mocker MCP Server
      </h1>
      <p class="text-gray-400 text-lg max-w-2xl mx-auto">
        6 powerful API mocking tools for AI agents -- generate fake data, mock API responses, OpenAPI specs, database tables, and more.
      </p>
    </div>

    <!-- Quick Connect -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-violet-900/40 shadow-lg shadow-violet-950/20">
      <h2 class="text-lg font-bold mb-1 text-white">Quick Connect</h2>
      <p class="text-gray-500 text-sm mb-4">Add to your Claude Code / Cursor / Windsurf / Cline MCP config:</p>
      <pre class="bg-gray-950 rounded-xl p-4 text-sm text-violet-300 overflow-x-auto border border-violet-900/30">{
  "mcpServers": {
    "api-mocker": {
      "url": "https://api-mocker-mcp.yagami8095.workers.dev/mcp",
      "type": "http"
    }
  }
}</pre>
      <p class="text-gray-600 text-xs mt-3">MCP Protocol: 2025-03-26 &nbsp;|&nbsp; Streamable HTTP &nbsp;|&nbsp; JSON-RPC 2.0 &nbsp;|&nbsp; Batch support</p>
    </div>

    <!-- Tools -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-violet-900/40">
      <h2 class="text-lg font-bold mb-4 text-white">6 Free Tools</h2>
      <ul class="divide-y divide-violet-900/30">
        ${toolsHtml}
      </ul>
    </div>

    <!-- Usage Examples -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-violet-900/40">
      <h2 class="text-lg font-bold mb-4 text-white">Example Tool Calls</h2>
      <div class="space-y-4">
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-2">generate_mock_data -- Japanese names</p>
          <pre class="bg-gray-950 rounded-lg p-3 text-xs text-green-400 overflow-x-auto">{
  "method": "tools/call",
  "params": {
    "name": "generate_mock_data",
    "arguments": {
      "type": "full_profile",
      "count": 3,
      "locale": "ja",
      "seed": "demo"
    }
  }
}</pre>
        </div>
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-2">mock_api_response -- paginated user list</p>
          <pre class="bg-gray-950 rounded-lg p-3 text-xs text-green-400 overflow-x-auto">{
  "method": "tools/call",
  "params": {
    "name": "mock_api_response",
    "arguments": {
      "endpoint": "/api/v1/users",
      "method": "GET",
      "paginate": true,
      "item_count": 5
    }
  }
}</pre>
        </div>
      </div>
    </div>

    <!-- Rate Limits -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-violet-900/40">
      <h2 class="text-lg font-bold mb-3 text-white">Rate Limits</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div class="bg-gray-800/50 rounded-xl p-4">
          <div class="text-2xl font-bold text-violet-400">15</div>
          <div class="text-gray-400 mt-1">tool calls / day (free)</div>
          <div class="text-gray-600 text-xs mt-1">per IP address, resets midnight UTC</div>
        </div>
        <div class="bg-gray-800/50 rounded-xl p-4">
          <div class="text-2xl font-bold text-purple-400">150</div>
          <div class="text-gray-400 mt-1">tool calls / day (Pro)</div>
          <div class="text-gray-600 text-xs mt-1">$29/month via PayPal or Stripe</div>
        </div>
      </div>
    </div>

    <!-- Ecosystem -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-violet-900/40">
      <h2 class="text-lg font-bold mb-4 text-white">OpenClaw MCP Ecosystem</h2>
      <ul class="divide-y divide-violet-900/30">
        ${ecosystemHtml}
      </ul>
      <div class="mt-4 pt-4 border-t border-violet-900/30">
        <a href="${ECOSYSTEM.store}" class="text-orange-400 hover:underline text-sm font-medium">OpenClaw Store</a>
        <span class="text-gray-500 text-sm ml-2">-- AI tools, prompts, and intelligence products</span>
      </div>
    </div>

    <!-- Health -->
    <div class="text-center">
      <a href="/health" class="text-gray-600 hover:text-violet-400 text-sm transition-colors">Health Check /health</a>
      <span class="text-gray-800 mx-2">|</span>
      <a href="/mcp" class="text-gray-600 hover:text-violet-400 text-sm transition-colors">MCP Endpoint /mcp</a>
    </div>

  </main>

  <footer class="border-t border-gray-900 mt-12 py-6 text-center text-gray-700 text-sm">
    API Mocker MCP v1.0.0 &nbsp;&bull;&nbsp; Powered by <span class="text-violet-800">OpenClaw Intelligence</span> &nbsp;&bull;&nbsp; Cloudflare Workers
  </footer>

</body>
</html>`;
}

// ============================================================
// CORS Headers
// ============================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, X-Forwarded-For, X-API-Key',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, X-RateLimit-Remaining, X-RateLimit-Limit',
};

function corsResponse(body, status = 200, extra = {}) {
  return new Response(body, {
    status,
    headers: { ...CORS_HEADERS, ...extra },
  });
}

function jsonResponse(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', ...extra },
  });
}

// ============================================================
// Edge Defense Layer
// ============================================================

const HONEYPOT_PATHS = ['/admin', '/wp-login.php', '/.env', '/config.json', '/.git/config', '/wp-admin', '/phpinfo.php'];
const PAYLOAD_MAX_BYTES = 51200; // 50KB

async function sha256Short(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getRequestFingerprint(request) {
  const ua = request.headers.get('User-Agent') || '';
  const lang = request.headers.get('Accept-Language') || '';
  const isSuspicious = (/^(curl|wget|python|httpie|go-http|java)/i.test(ua) && lang.length > 5);
  return { ua: ua.slice(0, 80), lang: lang.slice(0, 20), isSuspicious };
}

async function edgeDefense(request, env, serverPrefix) {
  const kv = env.KV;
  if (!kv) return { action: 'allow' };

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256Short(ip + '-openclaw-defense');
  const today = new Date().toISOString().slice(0, 10);
  const defenseKey = `defense:${ipHash}:${today}`;
  const path = new URL(request.url).pathname;

  if (HONEYPOT_PATHS.includes(path.toLowerCase())) {
    try {
      const raw = await kv.get(defenseKey, { type: 'json' }) || { score: 100, hits: 0, flags: [] };
      raw.score = Math.max(0, raw.score - 30);
      raw.hits++;
      raw.flags.push('honeypot:' + path);
      await kv.put(defenseKey, JSON.stringify(raw), { expirationTtl: 86400 });
    } catch {}
    return { action: 'honeypot', status: 404 };
  }

  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > PAYLOAD_MAX_BYTES) {
    return { action: 'reject', reason: 'Payload too large', status: 413 };
  }

  try {
    const raw = await kv.get(defenseKey, { type: 'json' });
    if (raw && raw.score < 10) {
      return { action: 'block', reason: 'IP blocked due to suspicious activity', status: 403 };
    }
    if (raw && raw.score < 30) {
      return { action: 'throttle', delay: 200 };
    }
  } catch {}

  const fp = getRequestFingerprint(request);
  if (fp.isSuspicious) {
    try {
      const raw = await kv.get(defenseKey, { type: 'json' }) || { score: 100, hits: 0, flags: [] };
      if (!raw.flags.includes('suspicious-fp')) {
        raw.score = Math.max(0, raw.score - 10);
        raw.flags.push('suspicious-fp');
        await kv.put(defenseKey, JSON.stringify(raw), { expirationTtl: 86400 });
      }
    } catch {}
  }

  return { action: 'allow' };
}

function sanitizeInput(str, maxLen = 5000) {
  if (!str) return '';
  if (typeof str !== 'string') return String(str).slice(0, maxLen);
  return str.slice(0, maxLen).replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, '');
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
    if (raw.total >= FINOPS_DAILY_STOP) return { ok: false, reason: 'Daily capacity reached. Try again tomorrow.', status: 503 };
    if (raw.total >= FINOPS_DAILY_SLOW) return { ok: true, delay: 500 };
    if (raw.total >= FINOPS_DAILY_WARN) return { ok: true, warn: true };
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

// Attribution Tracking
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
    await kv.put(key, String(count + 1), { expirationTtl: 2592000 });
  } catch {}
}

// ============================================================
// Main Worker Export
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Preflight
    if (method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    // Edge Defense Layer
    const defense = await edgeDefense(request, env, 'apimock');
    if (defense.action === 'honeypot') {
      return new Response('Not Found', { status: 404 });
    }
    if (defense.action === 'reject' || defense.action === 'block') {
      return jsonResponse({ error: defense.reason }, defense.status);
    }
    if (defense.action === 'throttle' && defense.delay) {
      await new Promise(r => setTimeout(r, defense.delay));
    }

    // FinOps Circuit Breaker
    const finops = await finopsTrack(env, 'api-mocker');
    if (!finops.ok) return jsonResponse({ error: finops.reason, retryAfter: 'tomorrow' }, finops.status);
    if (finops.delay) await new Promise(r => setTimeout(r, finops.delay));

    // Attribution Tracking
    await trackRef(request, env, 'api-mocker');

    // Landing page
    if ((path === '/' || path === '/index.html') && method === 'GET') {
      return new Response(buildLandingHtml(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // llms.txt for AI discoverability
    if (path === '/llms.txt' || path === '/.well-known/llms.txt') {
      const t = [
        "# OpenClaw MCP Servers",
        "> 10 free remote MCP servers with 55+ tools for AI agents.",
        "",
        "## Servers",
        "- API Mocker: https://api-mocker-mcp.yagami8095.workers.dev/mcp",
        "- JSON Toolkit: https://json-toolkit-mcp.yagami8095.workers.dev/mcp",
        "- Regex Engine: https://regex-engine-mcp.yagami8095.workers.dev/mcp",
        "- Color Palette: https://color-palette-mcp.yagami8095.workers.dev/mcp",
        "- Timestamp Converter: https://timestamp-converter-mcp.yagami8095.workers.dev/mcp",
        "- Prompt Enhancer: https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp",
        "- OpenClaw Intel: https://openclaw-intel-mcp.yagami8095.workers.dev/mcp",
        "- Fortune: https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp",
        "- MoltBook Publisher: https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp",
        "- AgentForge Compare: https://agentforge-compare-mcp.yagami8095.workers.dev/mcp",
        "",
        "## Quick Start",
        'Add to MCP config: {"url": "https://api-mocker-mcp.yagami8095.workers.dev/mcp"}',
        "",
        "## Pro: 9 USD, 150 calls/day all servers",
        "https://product-store.yagami8095.workers.dev/products/ecosystem-pro",
      ];
      return new Response(t.join("\n"), {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Health check
    if (path === '/health' && method === 'GET') {
      return jsonResponse({
        status: 'ok',
        server: SERVER_INFO.name,
        version: SERVER_INFO.version,
        vendor: VENDOR,
        protocol: MCP_PROTOCOL_VERSION,
        tools: TOOLS.map(t => t.name),
        rate_limit: { free_per_day: RATE_LIMIT_MAX, pro_per_day: PRO_DAILY_LIMIT },
        timestamp: new Date().toISOString(),
      });
    }

    // MCP endpoint -- GET returns server info
    if (path === '/mcp' && method === 'GET') {
      return jsonResponse({
        server: SERVER_INFO,
        vendor: VENDOR,
        protocol: MCP_PROTOCOL_VERSION,
        endpoint: '/mcp',
        method: 'POST',
        content_type: 'application/json',
        tools: TOOLS.map(t => ({ name: t.name, description: t.description })),
        ecosystem: ECOSYSTEM,
      });
    }

    // MCP endpoint -- POST handles JSON-RPC
    if (path === '/mcp' && method === 'POST') {
      const contentType = request.headers.get('Content-Type') || '';
      if (!contentType.includes('application/json')) {
        return jsonResponse(
          jsonRpcError(null, -32700, 'Content-Type must be application/json'),
          400
        );
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse(jsonRpcError(null, -32700, 'Parse error: invalid JSON body'), 400);
      }

      const clientIp =
        request.headers.get('CF-Connecting-IP') ||
        request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
        'unknown';

      // Pro API Key validation
      const apiKey = request.headers.get('X-API-Key');
      const kv = env?.KV ?? null;
      let _proKeyInfo = null;
      if (apiKey && kv) {
        _proKeyInfo = await validateProKey(kv, apiKey);
      }

      const response = await handleMcpRequest(body, kv, clientIp, _proKeyInfo, apiKey);

      if (response === null) {
        return corsResponse('', 204);
      }

      // x402: Detect rate limit -> HTTP 402 with payment headers
      const first = Array.isArray(response) ? response[0] : response;
      const isRateLimited = first?.error?.code === -32029;
      const httpStatus = isRateLimited ? 402 : 200;
      const headers = { ...CORS_HEADERS, 'Content-Type': 'application/json' };
      if (isRateLimited) {
        headers['X-Payment-Required'] = 'true';
        headers['X-Payment-Network'] = 'base';
        headers['X-Payment-Currency'] = 'USDC';
        headers['X-Payment-Amount'] = '0.05';
        headers['X-Payment-Address'] = '0x72aa56DAe3819c75C545c57778cc404092d60731';
      }

      return new Response(JSON.stringify(response), { status: httpStatus, headers });
    }

    // MCP endpoint -- DELETE (session termination, MCP spec)
    if (path === '/mcp' && method === 'DELETE') {
      return corsResponse('', 204);
    }

    // 404
    return jsonResponse(
      { error: 'Not found', hint: 'MCP endpoint: POST /mcp | Server info: GET /mcp | Health: GET /health' },
      404
    );
  },
};
