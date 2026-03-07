/**
 * SEO Toolkit MCP Server
 * SEO analysis and optimization tools for content creators and marketers.
 *
 * Tools (6 free tools, 10 req/day per IP via KV rate limiting):
 *   1. analyze_seo        — Score content for SEO: keyword density, readability, heading structure, meta tag recommendations
 *   2. generate_meta_tags — Generate optimized title tag, meta description, Open Graph tags, Twitter card tags
 *   3. keyword_extract    — Extract top keywords/keyphrases using TF-IDF-like scoring, n-gram analysis
 *   4. readability_score  — Calculate multiple readability metrics: Flesch-Kincaid, Gunning Fog, SMOG, Coleman-Liau
 *   5. slug_generator     — Generate SEO-friendly URL slugs from titles (handle Unicode, transliteration, stop words)
 *   6. structured_data    — Generate JSON-LD structured data (Article, Product, FAQ, HowTo, Recipe schemas)
 *
 * Vendor: OpenClaw Intelligence
 * MCP Protocol: 2025-03-26
 */

const SERVER_INFO = { name: 'seo-toolkit', version: '1.0.0' };
const VENDOR = 'OpenClaw Intelligence';
const CAPABILITIES = { tools: {} };
const MCP_PROTOCOL_VERSION = '2025-03-26';

const RATE_LIMIT_MAX = 10;           // requests per day
const RATE_LIMIT_WINDOW = 86400;     // 24 hours in seconds

// ============================================================
// In-Memory Fallback Rate Limiter (KV Safe Mode)
// When KV is unavailable, degrade to 5 req/min/IP instead of unlimited
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
  seo_toolkit:  'https://seo-toolkit-mcp.yagami8095.workers.dev/mcp',
  json_toolkit: 'https://json-toolkit-mcp.yagami8095.workers.dev/mcp',
  regex:        'https://regex-engine-mcp.yagami8095.workers.dev/mcp',
  color:        'https://color-palette-mcp.yagami8095.workers.dev/mcp',
  prompt:       'https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp',
  timestamp:    'https://timestamp-converter-mcp.yagami8095.workers.dev/mcp',
  intel:        'https://openclaw-intel-mcp.yagami8095.workers.dev/mcp',
  fortune:      'https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp',
  moltbook:     'https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp',
  agentforge:   'https://agentforge-compare-mcp.yagami8095.workers.dev/mcp',
  store:        'https://product-store.yagami8095.workers.dev',
  fortune_api:  'https://fortune-api.yagami8095.workers.dev',
  intel_api:    'https://openclaw-intel-api.yagami8095.workers.dev',
};

// ============================================================
// Rate Limiting (KV-backed, per IP, 10 req/day)
// ============================================================

// ============================================================
// Pro API Key Validation (shared KV: prokey:{key})
// ============================================================
const PRO_DAILY_LIMIT = 1000;

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
  const key = `rl:seo:${ip}:${today}`;

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
  } catch {
    // ignore write failure
  }

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
// NLP Utilities — Syllable Counting, Sentence/Word Splitting
// ============================================================

// English stop words for slug generation and keyword extraction
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','as','is','was','are','were','be','been','being','have','has','had',
  'do','does','did','will','would','shall','should','may','might','must','can',
  'could','about','above','after','again','against','all','am','any','aren',
  'because','before','below','between','both','can','couldn','didn','doesn',
  'don','down','during','each','few','further','get','got','hadn','hasn',
  'haven','he','her','here','hers','herself','him','himself','his','how','i',
  'if','into','isn','it','its','itself','just','ll','me','more','most','mustn',
  'my','myself','needn','no','nor','not','now','off','once','only','other',
  'our','ours','ourselves','out','over','own','re','s','same','shan','she',
  'so','some','such','t','than','that','their','theirs','them','themselves',
  'then','there','these','they','this','those','through','too','under','until',
  'up','ve','very','wasn','we','weren','what','when','where','which','while',
  'who','whom','why','won','wouldn','you','your','yours','yourself','yourselves'
]);

/**
 * Count syllables in an English word using a rule-based approach.
 * Uses vowel groups, adjusts for silent-e, -le, -es, -ed endings.
 */
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 2) return word.length > 0 ? 1 : 0;

  // Special common words
  const specials = {
    'the': 1, 'he': 1, 'she': 1, 'we': 1, 'me': 1, 'be': 1,
    'are': 1, 'were': 1, 'there': 1, 'where': 1, 'here': 1,
    'come': 1, 'some': 1, 'done': 1, 'gone': 1, 'one': 1,
    'have': 1, 'give': 1, 'live': 1, 'love': 1, 'move': 1,
    'people': 2, 'every': 3, 'area': 3, 'idea': 3, 'real': 1,
    'create': 2, 'created': 3, 'creative': 3, 'creating': 3,
    'business': 2, 'businesses': 3,
  };
  if (specials[word] !== undefined) return specials[word];

  let count = 0;
  const vowels = 'aeiouy';
  let prevVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !prevVowel) {
      count++;
    }
    prevVowel = isVowel;
  }

  // Silent e at end
  if (word.endsWith('e') && !word.endsWith('le') && !word.endsWith('ce') && !word.endsWith('ge') && count > 1) {
    count--;
  }

  // -ed ending (past tense, usually silent unless preceded by t or d)
  if (word.endsWith('ed') && word.length > 3) {
    const beforeEd = word[word.length - 3];
    if (beforeEd !== 't' && beforeEd !== 'd') {
      count--;
    }
  }

  // -es ending
  if (word.endsWith('es') && word.length > 3 && !word.endsWith('ies') && !word.endsWith('ces') && !word.endsWith('ges')) {
    // usually silent
  }

  // -le ending adds a syllable if preceded by a consonant
  if (word.endsWith('le') && word.length > 2 && !vowels.includes(word[word.length - 3])) {
    // already counted by vowel group detection
  }

  return Math.max(1, count);
}

/**
 * Split text into sentences. Handles abbreviations, decimals, etc.
 */
function splitSentences(text) {
  // Replace common abbreviations to avoid false splits
  let t = text
    .replace(/Mr\./g, 'Mr\u200B')
    .replace(/Mrs\./g, 'Mrs\u200B')
    .replace(/Dr\./g, 'Dr\u200B')
    .replace(/Ms\./g, 'Ms\u200B')
    .replace(/vs\./g, 'vs\u200B')
    .replace(/etc\./g, 'etc\u200B')
    .replace(/e\.g\./g, 'eg\u200B')
    .replace(/i\.e\./g, 'ie\u200B')
    .replace(/\d+\.\d+/g, m => m.replace('.', '\u200B'));

  const sentences = t.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  return sentences.length > 0 ? sentences : [''];
}

/**
 * Split text into words (only alphabetic tokens).
 */
function splitWords(text) {
  return text.match(/[a-zA-Z]+(?:'[a-zA-Z]+)?/g) || [];
}

/**
 * Strip HTML tags from text.
 */
function stripHtml(text) {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ============================================================
// Tool 1: analyze_seo
// ============================================================

function analyzeSeo(content, keyword) {
  if (!content || typeof content !== 'string') {
    return { error: 'content parameter is required (string)' };
  }

  const text = stripHtml(content);
  const words = splitWords(text);
  const sentences = splitSentences(text);
  const wordCount = words.length;
  const sentenceCount = sentences.length;

  if (wordCount === 0) {
    return { error: 'Content has no recognizable words' };
  }

  // Syllable count
  let totalSyllables = 0;
  for (const w of words) {
    totalSyllables += countSyllables(w);
  }

  // Flesch-Kincaid Reading Ease
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = totalSyllables / wordCount;
  const fleschReadingEase = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  const fleschGradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

  // Readability interpretation
  let readabilityLabel;
  if (fleschReadingEase >= 90) readabilityLabel = 'Very Easy (5th grade)';
  else if (fleschReadingEase >= 80) readabilityLabel = 'Easy (6th grade)';
  else if (fleschReadingEase >= 70) readabilityLabel = 'Fairly Easy (7th grade)';
  else if (fleschReadingEase >= 60) readabilityLabel = 'Standard (8th-9th grade)';
  else if (fleschReadingEase >= 50) readabilityLabel = 'Fairly Difficult (10th-12th grade)';
  else if (fleschReadingEase >= 30) readabilityLabel = 'Difficult (College)';
  else readabilityLabel = 'Very Difficult (Graduate)';

  // Keyword density analysis
  let keywordAnalysis = null;
  if (keyword && typeof keyword === 'string') {
    const kw = keyword.toLowerCase().trim();
    const lowerText = text.toLowerCase();
    const kwWords = kw.split(/\s+/);
    let kwCount = 0;

    if (kwWords.length === 1) {
      // Single word keyword
      for (const w of words) {
        if (w.toLowerCase() === kw) kwCount++;
      }
    } else {
      // Multi-word keyword (phrase match)
      let idx = 0;
      while ((idx = lowerText.indexOf(kw, idx)) !== -1) {
        kwCount++;
        idx += kw.length;
      }
    }

    const density = (kwCount / wordCount) * 100;
    let densityRating;
    if (density === 0) densityRating = 'Missing - keyword not found in content';
    else if (density < 0.5) densityRating = 'Too Low - aim for 1-2%';
    else if (density <= 2.5) densityRating = 'Optimal';
    else if (density <= 4) densityRating = 'Slightly High - risk of keyword stuffing';
    else densityRating = 'Too High - keyword stuffing detected';

    keywordAnalysis = {
      keyword: kw,
      count: kwCount,
      density_percent: Math.round(density * 100) / 100,
      rating: densityRating,
    };
  }

  // Heading structure analysis (from HTML content)
  const headings = [];
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
  let hMatch;
  while ((hMatch = headingRegex.exec(content)) !== null) {
    headings.push({ level: parseInt(hMatch[1]), text: stripHtml(hMatch[2]) });
  }

  const headingIssues = [];
  if (headings.length === 0) {
    headingIssues.push('No headings found. Add H1 and H2 tags for better SEO.');
  } else {
    const h1Count = headings.filter(h => h.level === 1).length;
    if (h1Count === 0) headingIssues.push('Missing H1 tag. Every page should have exactly one H1.');
    else if (h1Count > 1) headingIssues.push(`Multiple H1 tags found (${h1Count}). Use only one H1 per page.`);

    // Check heading hierarchy
    for (let i = 1; i < headings.length; i++) {
      if (headings[i].level > headings[i - 1].level + 1) {
        headingIssues.push(`Heading hierarchy skip: H${headings[i - 1].level} -> H${headings[i].level}. Don't skip heading levels.`);
      }
    }
  }

  // Meta tag recommendations
  const metaRecommendations = [];
  if (wordCount < 300) metaRecommendations.push('Content is thin (under 300 words). Aim for 600+ words for better ranking.');
  else if (wordCount < 600) metaRecommendations.push('Content length is acceptable but could be longer. 1000+ words performs better for competitive keywords.');
  else metaRecommendations.push('Good content length for SEO.');

  if (avgWordsPerSentence > 25) metaRecommendations.push('Average sentence length is high. Aim for 15-20 words per sentence for better readability.');
  if (fleschReadingEase < 50) metaRecommendations.push('Content is difficult to read. Simplify language for broader audience.');

  const firstSentence = sentences[0] || '';
  if (keyword && !firstSentence.toLowerCase().includes(keyword.toLowerCase())) {
    metaRecommendations.push('Target keyword not found in the first sentence. Place it early for better SEO signal.');
  }

  // Overall SEO score (0-100)
  let score = 50; // base score
  // Content length
  if (wordCount >= 600) score += 10;
  else if (wordCount >= 300) score += 5;
  else score -= 10;

  // Readability
  if (fleschReadingEase >= 60 && fleschReadingEase <= 80) score += 15;
  else if (fleschReadingEase >= 50) score += 10;
  else if (fleschReadingEase >= 30) score += 5;

  // Keyword
  if (keywordAnalysis) {
    if (keywordAnalysis.density_percent >= 0.5 && keywordAnalysis.density_percent <= 2.5) score += 15;
    else if (keywordAnalysis.density_percent > 0) score += 5;
    else score -= 5;
  }

  // Headings
  if (headings.length > 0) {
    const h1Count = headings.filter(h => h.level === 1).length;
    if (h1Count === 1) score += 10;
    if (headingIssues.length === 0) score += 5;
  } else {
    score -= 5;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    seo_score: score,
    word_count: wordCount,
    sentence_count: sentenceCount,
    avg_words_per_sentence: Math.round(avgWordsPerSentence * 10) / 10,
    avg_syllables_per_word: Math.round(avgSyllablesPerWord * 100) / 100,
    readability: {
      flesch_reading_ease: Math.round(fleschReadingEase * 100) / 100,
      flesch_grade_level: Math.round(fleschGradeLevel * 10) / 10,
      label: readabilityLabel,
    },
    keyword_analysis: keywordAnalysis,
    heading_structure: {
      headings,
      issues: headingIssues,
    },
    recommendations: metaRecommendations,
    ecosystem: ECOSYSTEM,
  };
}

// ============================================================
// Tool 2: generate_meta_tags
// ============================================================

function generateMetaTags(content, title, url, image_url, site_name) {
  if (!content || typeof content !== 'string') {
    return { error: 'content parameter is required (string)' };
  }

  const text = stripHtml(content);
  const words = splitWords(text);
  const sentences = splitSentences(text);

  // Generate title tag (50-60 chars optimal)
  let metaTitle = title || '';
  if (!metaTitle) {
    // Extract from first heading or first sentence
    const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) {
      metaTitle = stripHtml(h1Match[1]);
    } else {
      metaTitle = sentences[0] || '';
    }
  }
  // Truncate to 60 chars
  if (metaTitle.length > 60) {
    metaTitle = metaTitle.slice(0, 57) + '...';
  }

  // Generate meta description (150-160 chars optimal)
  let metaDescription = '';
  // Use first 2 sentences, truncated to 155 chars
  const descSentences = sentences.slice(0, 3).join('. ');
  if (descSentences.length > 155) {
    metaDescription = descSentences.slice(0, 152) + '...';
  } else {
    metaDescription = descSentences + (descSentences.endsWith('.') ? '' : '.');
  }

  // Extract top keywords for meta keywords
  const wordFreq = {};
  for (const w of words) {
    const lower = w.toLowerCase();
    if (!STOP_WORDS.has(lower) && lower.length > 2) {
      wordFreq[lower] = (wordFreq[lower] || 0) + 1;
    }
  }
  const topKeywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([kw]) => kw);

  const canonicalUrl = url || '';
  const ogImage = image_url || '';
  const ogSiteName = site_name || '';

  return {
    title_tag: metaTitle,
    title_length: metaTitle.length,
    title_optimal: metaTitle.length >= 30 && metaTitle.length <= 60,
    meta_description: metaDescription,
    description_length: metaDescription.length,
    description_optimal: metaDescription.length >= 120 && metaDescription.length <= 160,
    meta_keywords: topKeywords.join(', '),
    open_graph: {
      'og:title': metaTitle,
      'og:description': metaDescription,
      'og:type': 'article',
      ...(canonicalUrl && { 'og:url': canonicalUrl }),
      ...(ogImage && { 'og:image': ogImage }),
      ...(ogSiteName && { 'og:site_name': ogSiteName }),
    },
    twitter_card: {
      'twitter:card': ogImage ? 'summary_large_image' : 'summary',
      'twitter:title': metaTitle,
      'twitter:description': metaDescription.length > 200 ? metaDescription.slice(0, 197) + '...' : metaDescription,
      ...(ogImage && { 'twitter:image': ogImage }),
    },
    html_snippet: [
      `<title>${escapeHtml(metaTitle)}</title>`,
      `<meta name="description" content="${escapeHtml(metaDescription)}">`,
      `<meta name="keywords" content="${escapeHtml(topKeywords.join(', '))}">`,
      `<meta property="og:title" content="${escapeHtml(metaTitle)}">`,
      `<meta property="og:description" content="${escapeHtml(metaDescription)}">`,
      `<meta property="og:type" content="article">`,
      ...(canonicalUrl ? [`<meta property="og:url" content="${escapeHtml(canonicalUrl)}">`] : []),
      ...(ogImage ? [`<meta property="og:image" content="${escapeHtml(ogImage)}">`] : []),
      ...(ogSiteName ? [`<meta property="og:site_name" content="${escapeHtml(ogSiteName)}">`] : []),
      `<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">`,
      `<meta name="twitter:title" content="${escapeHtml(metaTitle)}">`,
      `<meta name="twitter:description" content="${escapeHtml(metaDescription)}">`,
      ...(ogImage ? [`<meta name="twitter:image" content="${escapeHtml(ogImage)}">`] : []),
      ...(canonicalUrl ? [`<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`] : []),
    ].join('\n'),
    ecosystem: ECOSYSTEM,
  };
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================================
// Tool 3: keyword_extract
// ============================================================

function keywordExtract(content, max_keywords, min_word_length) {
  if (!content || typeof content !== 'string') {
    return { error: 'content parameter is required (string)' };
  }

  const maxKw = max_keywords || 20;
  const minLen = min_word_length || 3;
  const text = stripHtml(content);
  const words = splitWords(text);

  if (words.length === 0) {
    return { error: 'Content has no recognizable words' };
  }

  // Term Frequency for single words
  const tf = {};
  const totalWords = words.length;
  for (const w of words) {
    const lower = w.toLowerCase();
    if (!STOP_WORDS.has(lower) && lower.length >= minLen) {
      tf[lower] = (tf[lower] || 0) + 1;
    }
  }

  // TF-IDF-like scoring: TF * log(totalWords / df) where df approximated by tf
  // Since we have a single document, we use a frequency-based importance:
  // score = tf * (1 + log(totalWords / tf)) -- rewards moderate frequency over raw count
  const singleWordScores = {};
  for (const [term, count] of Object.entries(tf)) {
    singleWordScores[term] = count * (1 + Math.log(totalWords / count));
  }

  // N-gram extraction (bigrams and trigrams)
  const lowerWords = words.map(w => w.toLowerCase());
  const bigrams = {};
  const trigrams = {};

  for (let i = 0; i < lowerWords.length - 1; i++) {
    const w1 = lowerWords[i];
    const w2 = lowerWords[i + 1];
    if (!STOP_WORDS.has(w1) && !STOP_WORDS.has(w2) && w1.length >= minLen && w2.length >= minLen) {
      const bg = `${w1} ${w2}`;
      bigrams[bg] = (bigrams[bg] || 0) + 1;
    }
  }

  for (let i = 0; i < lowerWords.length - 2; i++) {
    const w1 = lowerWords[i];
    const w2 = lowerWords[i + 1];
    const w3 = lowerWords[i + 2];
    // For trigrams, allow middle word to be a stop word for natural phrases
    if (!STOP_WORDS.has(w1) && !STOP_WORDS.has(w3) && w1.length >= minLen && w3.length >= minLen) {
      const tg = `${w1} ${w2} ${w3}`;
      trigrams[tg] = (trigrams[tg] || 0) + 1;
    }
  }

  // Score bigrams: count * 1.5 boost (phrases are more specific)
  const bigramScores = {};
  for (const [phrase, count] of Object.entries(bigrams)) {
    if (count >= 2) { // Only include bigrams that appear 2+ times
      bigramScores[phrase] = count * 1.5 * (1 + Math.log(totalWords / count));
    }
  }

  // Score trigrams: count * 2.0 boost
  const trigramScores = {};
  for (const [phrase, count] of Object.entries(trigrams)) {
    if (count >= 2) {
      trigramScores[phrase] = count * 2.0 * (1 + Math.log(totalWords / count));
    }
  }

  // Merge all scores
  const allScores = { ...singleWordScores, ...bigramScores, ...trigramScores };

  // Normalize scores to 0-100
  const maxScore = Math.max(...Object.values(allScores), 1);
  const keywords = Object.entries(allScores)
    .map(([term, score]) => ({
      term,
      raw_score: Math.round(score * 100) / 100,
      normalized_score: Math.round((score / maxScore) * 100 * 100) / 100,
      frequency: tf[term] || bigrams[term] || trigrams[term] || 0,
      type: term.includes(' ') ? (term.split(' ').length === 3 ? 'trigram' : 'bigram') : 'unigram',
    }))
    .sort((a, b) => b.normalized_score - a.normalized_score)
    .slice(0, maxKw);

  return {
    total_words: totalWords,
    unique_terms: Object.keys(tf).length,
    keywords,
    top_5: keywords.slice(0, 5).map(k => k.term),
    ecosystem: ECOSYSTEM,
  };
}

// ============================================================
// Tool 4: readability_score
// ============================================================

function readabilityScore(content) {
  if (!content || typeof content !== 'string') {
    return { error: 'content parameter is required (string)' };
  }

  const text = stripHtml(content);
  const words = splitWords(text);
  const sentences = splitSentences(text);
  const wordCount = words.length;
  const sentenceCount = sentences.length;

  if (wordCount === 0) {
    return { error: 'Content has no recognizable words' };
  }

  // Count syllables
  let totalSyllables = 0;
  let polysyllableCount = 0; // words with 3+ syllables
  const syllableCounts = [];

  for (const w of words) {
    const sc = countSyllables(w);
    syllableCounts.push(sc);
    totalSyllables += sc;
    if (sc >= 3) polysyllableCount++;
  }

  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = totalSyllables / wordCount;

  // 1. Flesch-Kincaid Reading Ease
  // Formula: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
  const fleschReadingEase = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

  // 2. Flesch-Kincaid Grade Level
  // Formula: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
  const fleschGradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

  // 3. Gunning Fog Index
  // Formula: 0.4 * ((words/sentences) + 100 * (complex_words/words))
  // complex_words = words with 3+ syllables (excluding proper nouns, compounds, common suffixes)
  const gunningFog = 0.4 * (avgWordsPerSentence + 100 * (polysyllableCount / wordCount));

  // 4. SMOG Index
  // Formula: 3 + sqrt(polysyllable_count * (30 / sentences))
  // Requires at least 30 sentences for accuracy, but we'll compute it anyway
  const smogIndex = 3 + Math.sqrt(polysyllableCount * (30 / sentenceCount));

  // 5. Coleman-Liau Index
  // Formula: 0.0588 * L - 0.296 * S - 15.8
  // L = avg number of letters per 100 words
  // S = avg number of sentences per 100 words
  let totalLetters = 0;
  for (const w of words) {
    totalLetters += w.replace(/[^a-zA-Z]/g, '').length;
  }
  const L = (totalLetters / wordCount) * 100;
  const S = (sentenceCount / wordCount) * 100;
  const colemanLiau = 0.0588 * L - 0.296 * S - 15.8;

  // Interpretation
  let readabilityLabel;
  if (fleschReadingEase >= 90) readabilityLabel = 'Very Easy - understood by 5th graders';
  else if (fleschReadingEase >= 80) readabilityLabel = 'Easy - conversational English';
  else if (fleschReadingEase >= 70) readabilityLabel = 'Fairly Easy - understood by 7th graders';
  else if (fleschReadingEase >= 60) readabilityLabel = 'Standard - understood by 8th-9th graders';
  else if (fleschReadingEase >= 50) readabilityLabel = 'Fairly Difficult - high school level';
  else if (fleschReadingEase >= 30) readabilityLabel = 'Difficult - college level';
  else readabilityLabel = 'Very Difficult - graduate/professional level';

  // Average grade level across metrics
  const gradeLevels = [fleschGradeLevel, gunningFog, smogIndex, colemanLiau].filter(g => isFinite(g) && g > 0);
  const avgGradeLevel = gradeLevels.length > 0 ? gradeLevels.reduce((a, b) => a + b, 0) / gradeLevels.length : 0;

  return {
    metrics: {
      flesch_reading_ease: {
        score: Math.round(fleschReadingEase * 100) / 100,
        description: 'Higher = easier to read (0-100 scale)',
        interpretation: readabilityLabel,
      },
      flesch_kincaid_grade: {
        score: Math.round(fleschGradeLevel * 10) / 10,
        description: 'US grade level needed to understand the text',
      },
      gunning_fog: {
        score: Math.round(gunningFog * 10) / 10,
        description: 'Years of formal education needed to understand on first reading',
      },
      smog_index: {
        score: Math.round(smogIndex * 10) / 10,
        description: 'Years of education needed to understand (most accurate for 30+ sentences)',
        note: sentenceCount < 30 ? 'Less accurate: fewer than 30 sentences' : 'Sufficient sentence count for accuracy',
      },
      coleman_liau: {
        score: Math.round(colemanLiau * 10) / 10,
        description: 'US grade level based on characters and sentences (no syllable counting)',
      },
    },
    consensus_grade_level: Math.round(avgGradeLevel * 10) / 10,
    statistics: {
      word_count: wordCount,
      sentence_count: sentenceCount,
      total_syllables: totalSyllables,
      polysyllabic_words: polysyllableCount,
      polysyllabic_percent: Math.round((polysyllableCount / wordCount) * 100 * 10) / 10,
      avg_words_per_sentence: Math.round(avgWordsPerSentence * 10) / 10,
      avg_syllables_per_word: Math.round(avgSyllablesPerWord * 100) / 100,
      avg_letters_per_word: Math.round((totalLetters / wordCount) * 10) / 10,
    },
    ecosystem: ECOSYSTEM,
  };
}

// ============================================================
// Tool 5: slug_generator
// ============================================================

// Basic Unicode to ASCII transliteration map
const TRANSLITERATION_MAP = {
  // Latin accented
  '\u00e0': 'a', '\u00e1': 'a', '\u00e2': 'a', '\u00e3': 'a', '\u00e4': 'ae', '\u00e5': 'a',
  '\u00e6': 'ae', '\u00e7': 'c', '\u00e8': 'e', '\u00e9': 'e', '\u00ea': 'e', '\u00eb': 'e',
  '\u00ec': 'i', '\u00ed': 'i', '\u00ee': 'i', '\u00ef': 'i', '\u00f0': 'd', '\u00f1': 'n',
  '\u00f2': 'o', '\u00f3': 'o', '\u00f4': 'o', '\u00f5': 'o', '\u00f6': 'oe', '\u00f8': 'o',
  '\u00f9': 'u', '\u00fa': 'u', '\u00fb': 'u', '\u00fc': 'ue', '\u00fd': 'y', '\u00ff': 'y',
  '\u00c0': 'A', '\u00c1': 'A', '\u00c2': 'A', '\u00c3': 'A', '\u00c4': 'Ae', '\u00c5': 'A',
  '\u00c6': 'AE', '\u00c7': 'C', '\u00c8': 'E', '\u00c9': 'E', '\u00ca': 'E', '\u00cb': 'E',
  '\u00cc': 'I', '\u00cd': 'I', '\u00ce': 'I', '\u00cf': 'I', '\u00d0': 'D', '\u00d1': 'N',
  '\u00d2': 'O', '\u00d3': 'O', '\u00d4': 'O', '\u00d5': 'O', '\u00d6': 'Oe', '\u00d8': 'O',
  '\u00d9': 'U', '\u00da': 'U', '\u00db': 'U', '\u00dc': 'Ue', '\u00dd': 'Y',
  // German
  '\u00df': 'ss',
  // Polish
  '\u0142': 'l', '\u0141': 'L', '\u0105': 'a', '\u0104': 'A', '\u0119': 'e', '\u0118': 'E',
  '\u015b': 's', '\u015a': 'S', '\u017a': 'z', '\u0179': 'Z', '\u017c': 'z', '\u017b': 'Z',
  '\u0107': 'c', '\u0106': 'C', '\u0144': 'n', '\u0143': 'N',
  // Czech/Slovak
  '\u0159': 'r', '\u0158': 'R', '\u010d': 'c', '\u010c': 'C', '\u0161': 's', '\u0160': 'S',
  '\u017e': 'z', '\u017d': 'Z', '\u010f': 'd', '\u010e': 'D', '\u0165': 't', '\u0164': 'T',
  '\u0148': 'n', '\u0147': 'N',
  // Turkish
  '\u011f': 'g', '\u011e': 'G', '\u0131': 'i', '\u0130': 'I', '\u015f': 's', '\u015e': 'S',
  // Nordic
  '\u00f0': 'd', '\u00fe': 'th', '\u00de': 'Th',
};

function transliterate(str) {
  let result = '';
  for (const char of str) {
    result += TRANSLITERATION_MAP[char] || char;
  }
  return result;
}

function slugGenerator(title, options = {}) {
  if (!title || typeof title !== 'string') {
    return { error: 'title parameter is required (string)' };
  }

  const removeStopWords = options.remove_stop_words !== false; // default true
  const maxLength = options.max_length || 80;
  const separator = options.separator || '-';

  // Step 1: Transliterate Unicode
  let slug = transliterate(title);

  // Step 2: Lowercase
  slug = slug.toLowerCase();

  // Step 3: Remove non-alphanumeric (keep spaces and hyphens for now)
  slug = slug.replace(/[^a-z0-9\s-]/g, '');

  // Step 4: Split into words
  let slugWords = slug.split(/[\s-]+/).filter(w => w.length > 0);

  // Step 5: Remove stop words (optional)
  if (removeStopWords && slugWords.length > 2) {
    const filtered = slugWords.filter(w => !STOP_WORDS.has(w));
    // Keep at least 2 words
    if (filtered.length >= 2) {
      slugWords = filtered;
    }
  }

  // Step 6: Join with separator
  slug = slugWords.join(separator);

  // Step 7: Truncate to max length (don't break words)
  if (slug.length > maxLength) {
    slug = slug.slice(0, maxLength);
    const lastSep = slug.lastIndexOf(separator);
    if (lastSep > 0) {
      slug = slug.slice(0, lastSep);
    }
  }

  // Step 8: Remove trailing separator
  slug = slug.replace(new RegExp(`^${escapeRegex(separator)}+|${escapeRegex(separator)}+$`, 'g'), '');

  // Generate alternative slugs
  const alternatives = [];

  // Variant: with numbers at end for uniqueness
  alternatives.push(`${slug}${separator}guide`);
  alternatives.push(`${slug}${separator}${new Date().getFullYear()}`);

  // Variant: shorter slug (first 3-4 meaningful words)
  if (slugWords.length > 4) {
    alternatives.push(slugWords.slice(0, 4).join(separator));
  }

  return {
    slug,
    length: slug.length,
    optimal_length: slug.length >= 3 && slug.length <= 60,
    word_count: slugWords.length,
    separator,
    alternatives,
    original_title: title,
    tips: [
      slug.length > 60 ? 'Slug is long. Shorter slugs tend to rank better.' : 'Good slug length.',
      removeStopWords ? 'Stop words removed for cleaner URL.' : 'Stop words retained.',
      'Use hyphens (-) as separators. Avoid underscores for SEO.',
    ],
    ecosystem: ECOSYSTEM,
  };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// Tool 6: structured_data
// ============================================================

function structuredData(schema_type, data) {
  if (!schema_type || typeof schema_type !== 'string') {
    return { error: 'schema_type parameter is required. Valid types: Article, Product, FAQ, HowTo, Recipe' };
  }

  if (!data || typeof data !== 'object') {
    return { error: 'data parameter is required (object with schema-specific fields)' };
  }

  const type = schema_type.toLowerCase();
  let jsonLd;

  switch (type) {
    case 'article':
      jsonLd = buildArticleSchema(data);
      break;
    case 'product':
      jsonLd = buildProductSchema(data);
      break;
    case 'faq':
      jsonLd = buildFaqSchema(data);
      break;
    case 'howto':
      jsonLd = buildHowToSchema(data);
      break;
    case 'recipe':
      jsonLd = buildRecipeSchema(data);
      break;
    default:
      return { error: `Unknown schema type: "${schema_type}". Valid types: Article, Product, FAQ, HowTo, Recipe` };
  }

  if (jsonLd.error) return jsonLd;

  // Validate required fields
  const warnings = validateJsonLd(jsonLd);

  return {
    schema_type: schema_type,
    json_ld: jsonLd,
    html_snippet: `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`,
    warnings,
    validation: warnings.length === 0 ? 'Valid' : 'Has warnings - review recommended fields',
    ecosystem: ECOSYSTEM,
  };
}

function buildArticleSchema(data) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': data.type || 'Article',
  };

  if (data.headline) schema.headline = data.headline.slice(0, 110);
  if (data.description) schema.description = data.description;
  if (data.image) schema.image = Array.isArray(data.image) ? data.image : [data.image];
  if (data.date_published) schema.datePublished = data.date_published;
  if (data.date_modified) schema.dateModified = data.date_modified;
  if (data.author) {
    schema.author = Array.isArray(data.author)
      ? data.author.map(a => typeof a === 'string' ? { '@type': 'Person', name: a } : a)
      : [{ '@type': 'Person', name: data.author }];
  }
  if (data.publisher) {
    schema.publisher = {
      '@type': 'Organization',
      name: data.publisher,
      ...(data.publisher_logo ? { logo: { '@type': 'ImageObject', url: data.publisher_logo } } : {}),
    };
  }
  if (data.url) schema.mainEntityOfPage = { '@type': 'WebPage', '@id': data.url };
  if (data.word_count) schema.wordCount = data.word_count;
  if (data.keywords) schema.keywords = Array.isArray(data.keywords) ? data.keywords.join(', ') : data.keywords;

  return schema;
}

function buildProductSchema(data) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
  };

  if (data.name) schema.name = data.name;
  if (data.description) schema.description = data.description;
  if (data.image) schema.image = Array.isArray(data.image) ? data.image : [data.image];
  if (data.brand) schema.brand = { '@type': 'Brand', name: data.brand };
  if (data.sku) schema.sku = data.sku;
  if (data.mpn) schema.mpn = data.mpn;
  if (data.gtin) schema.gtin = data.gtin;

  if (data.price !== undefined) {
    schema.offers = {
      '@type': 'Offer',
      price: data.price,
      priceCurrency: data.currency || 'USD',
      availability: data.availability || 'https://schema.org/InStock',
      ...(data.url ? { url: data.url } : {}),
      ...(data.valid_until ? { priceValidUntil: data.valid_until } : {}),
    };
  }

  if (data.rating !== undefined) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: data.rating,
      reviewCount: data.review_count || 1,
      bestRating: data.best_rating || 5,
    };
  }

  if (data.reviews && Array.isArray(data.reviews)) {
    schema.review = data.reviews.map(r => ({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: r.best_rating || 5 },
      author: { '@type': 'Person', name: r.author || 'Anonymous' },
      ...(r.body ? { reviewBody: r.body } : {}),
      ...(r.date ? { datePublished: r.date } : {}),
    }));
  }

  return schema;
}

function buildFaqSchema(data) {
  if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
    return { error: 'data.questions is required: array of {question, answer} objects' };
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.questions.map(q => ({
      '@type': 'Question',
      name: q.question || q.q || '',
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer || q.a || '',
      },
    })),
  };

  return schema;
}

function buildHowToSchema(data) {
  if (!data.steps || !Array.isArray(data.steps) || data.steps.length === 0) {
    return { error: 'data.steps is required: array of step strings or {name, text, image?} objects' };
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
  };

  if (data.name) schema.name = data.name;
  if (data.description) schema.description = data.description;
  if (data.image) schema.image = data.image;
  if (data.total_time) schema.totalTime = data.total_time; // ISO 8601 duration
  if (data.estimated_cost) {
    schema.estimatedCost = {
      '@type': 'MonetaryAmount',
      currency: data.estimated_cost.currency || 'USD',
      value: data.estimated_cost.value || data.estimated_cost,
    };
  }

  if (data.supplies && Array.isArray(data.supplies)) {
    schema.supply = data.supplies.map(s => ({
      '@type': 'HowToSupply',
      name: typeof s === 'string' ? s : s.name,
    }));
  }

  if (data.tools && Array.isArray(data.tools)) {
    schema.tool = data.tools.map(t => ({
      '@type': 'HowToTool',
      name: typeof t === 'string' ? t : t.name,
    }));
  }

  schema.step = data.steps.map((step, i) => {
    if (typeof step === 'string') {
      return {
        '@type': 'HowToStep',
        position: i + 1,
        text: step,
      };
    }
    return {
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name || `Step ${i + 1}`,
      text: step.text || step.description || '',
      ...(step.image ? { image: step.image } : {}),
      ...(step.url ? { url: step.url } : {}),
    };
  });

  return schema;
}

function buildRecipeSchema(data) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
  };

  if (data.name) schema.name = data.name;
  if (data.description) schema.description = data.description;
  if (data.image) schema.image = Array.isArray(data.image) ? data.image : [data.image];
  if (data.author) schema.author = { '@type': 'Person', name: data.author };
  if (data.date_published) schema.datePublished = data.date_published;
  if (data.prep_time) schema.prepTime = data.prep_time; // ISO 8601 duration
  if (data.cook_time) schema.cookTime = data.cook_time;
  if (data.total_time) schema.totalTime = data.total_time;
  if (data.yield) schema.recipeYield = data.yield;
  if (data.category) schema.recipeCategory = data.category;
  if (data.cuisine) schema.recipeCuisine = data.cuisine;
  if (data.calories) {
    schema.nutrition = { '@type': 'NutritionInformation', calories: `${data.calories} calories` };
  }

  if (data.ingredients && Array.isArray(data.ingredients)) {
    schema.recipeIngredient = data.ingredients;
  }

  if (data.instructions && Array.isArray(data.instructions)) {
    schema.recipeInstructions = data.instructions.map((step, i) => {
      if (typeof step === 'string') {
        return { '@type': 'HowToStep', position: i + 1, text: step };
      }
      return {
        '@type': 'HowToStep',
        position: i + 1,
        name: step.name || `Step ${i + 1}`,
        text: step.text || '',
      };
    });
  }

  if (data.rating !== undefined) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: data.rating,
      reviewCount: data.review_count || 1,
    };
  }

  if (data.keywords) {
    schema.keywords = Array.isArray(data.keywords) ? data.keywords.join(', ') : data.keywords;
  }

  return schema;
}

function validateJsonLd(schema) {
  const warnings = [];
  const type = schema['@type'];

  if (!schema['@context']) warnings.push('Missing @context (should be "https://schema.org")');

  switch (type) {
    case 'Article':
    case 'BlogPosting':
    case 'NewsArticle':
      if (!schema.headline) warnings.push('Missing headline (required for Article)');
      if (!schema.image) warnings.push('Missing image (recommended for Article rich results)');
      if (!schema.datePublished) warnings.push('Missing datePublished (recommended)');
      if (!schema.author) warnings.push('Missing author (recommended)');
      break;
    case 'Product':
      if (!schema.name) warnings.push('Missing name (required for Product)');
      if (!schema.offers) warnings.push('Missing offers/price (recommended for Product rich results)');
      if (!schema.image) warnings.push('Missing image (recommended for Product)');
      break;
    case 'FAQPage':
      if (!schema.mainEntity || schema.mainEntity.length === 0) warnings.push('Missing questions (required for FAQPage)');
      break;
    case 'HowTo':
      if (!schema.name) warnings.push('Missing name (required for HowTo)');
      if (!schema.step || schema.step.length === 0) warnings.push('Missing steps (required for HowTo)');
      break;
    case 'Recipe':
      if (!schema.name) warnings.push('Missing name (required for Recipe)');
      if (!schema.recipeIngredient) warnings.push('Missing ingredients (recommended for Recipe)');
      if (!schema.recipeInstructions) warnings.push('Missing instructions (recommended for Recipe)');
      break;
  }

  return warnings;
}

// ============================================================
// MCP Tools Definitions
// ============================================================

const TOOLS = [
  {
    name: 'analyze_seo',
    description: 'Score content for SEO quality. Analyzes keyword density, readability (Flesch-Kincaid), heading structure, meta tag recommendations, word count, and sentence length. Returns an overall SEO score (0-100) with actionable recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The content to analyze (plain text or HTML)' },
        keyword: { type: 'string', description: 'Target keyword/phrase to check density for (optional)' },
      },
      required: ['content'],
    },
  },
  {
    name: 'generate_meta_tags',
    description: 'Generate optimized meta tags from content: title tag, meta description, Open Graph tags, and Twitter card tags. Returns ready-to-use HTML snippet.',
    inputSchema: {
      type: 'object',
      properties: {
        content:    { type: 'string', description: 'The page content to generate meta tags from (plain text or HTML)' },
        title:      { type: 'string', description: 'Override title (otherwise auto-generated from content)' },
        url:        { type: 'string', description: 'Canonical URL of the page' },
        image_url:  { type: 'string', description: 'URL of the primary image for OG/Twitter cards' },
        site_name:  { type: 'string', description: 'Site name for og:site_name' },
      },
      required: ['content'],
    },
  },
  {
    name: 'keyword_extract',
    description: 'Extract top keywords and keyphrases from content using TF-IDF-like scoring and n-gram analysis. Returns unigrams, bigrams, and trigrams ranked by relevance score.',
    inputSchema: {
      type: 'object',
      properties: {
        content:         { type: 'string', description: 'The content to extract keywords from' },
        max_keywords:    { type: 'integer', description: 'Maximum number of keywords to return (default 20)', default: 20 },
        min_word_length: { type: 'integer', description: 'Minimum word length to consider (default 3)', default: 3 },
      },
      required: ['content'],
    },
  },
  {
    name: 'readability_score',
    description: 'Calculate multiple readability metrics for text content: Flesch-Kincaid Reading Ease, Flesch-Kincaid Grade Level, Gunning Fog Index, SMOG Index, and Coleman-Liau Index. Uses real formulas with syllable counting.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The text content to analyze for readability' },
      },
      required: ['content'],
    },
  },
  {
    name: 'slug_generator',
    description: 'Generate SEO-friendly URL slugs from titles. Handles Unicode transliteration, stop word removal, and length optimization. Returns primary slug plus alternatives.',
    inputSchema: {
      type: 'object',
      properties: {
        title:   { type: 'string', description: 'The title or heading to convert to a URL slug' },
        options: {
          type: 'object',
          description: 'Slug generation options',
          properties: {
            remove_stop_words: { type: 'boolean', description: 'Remove common stop words (default true)', default: true },
            max_length:        { type: 'integer', description: 'Maximum slug length in characters (default 80)', default: 80 },
            separator:         { type: 'string', description: 'Word separator character (default "-")', default: '-' },
          },
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'structured_data',
    description: 'Generate JSON-LD structured data for Google rich results. Supports schema types: Article (BlogPosting, NewsArticle), Product, FAQ, HowTo, and Recipe. Returns valid schema.org JSON-LD with HTML snippet.',
    inputSchema: {
      type: 'object',
      properties: {
        schema_type: { type: 'string', enum: ['Article', 'Product', 'FAQ', 'HowTo', 'Recipe'], description: 'The schema.org type to generate' },
        data: {
          type: 'object',
          description: 'Schema-specific data fields. Article: {headline, description, author, image, date_published, publisher, url, keywords}. Product: {name, description, image, brand, price, currency, rating, review_count}. FAQ: {questions: [{question, answer}]}. HowTo: {name, description, steps: [string or {name, text}], supplies?, tools?}. Recipe: {name, description, ingredients, instructions, prep_time, cook_time, yield, cuisine}.',
        },
      },
      required: ['schema_type', 'data'],
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
      case 'analyze_seo':
        result = analyzeSeo(args?.content ?? '', args?.keyword);
        break;
      case 'generate_meta_tags':
        result = generateMetaTags(args?.content ?? '', args?.title, args?.url, args?.image_url, args?.site_name);
        break;
      case 'keyword_extract':
        result = keywordExtract(args?.content ?? '', args?.max_keywords, args?.min_word_length);
        break;
      case 'readability_score':
        result = readabilityScore(args?.content ?? '');
        break;
      case 'slug_generator':
        result = slugGenerator(args?.title ?? '', args?.options ?? {});
        break;
      case 'structured_data':
        result = structuredData(args?.schema_type ?? '', args?.data ?? {});
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

// Semantic Cache -- deterministic tool results cached in KV (24h TTL)
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

// Dynamic Upgrade Prompt -- progressive messaging based on usage
function addUpgradePrompt(response, rateLimitInfo) {
  if (!rateLimitInfo || !response?.result?.content?.[0]) return;
  if (response.result.isError) return;
  const c = response.result.content[0];
  if (c.type !== 'text' || !c.text) return;

  const used = rateLimitInfo.used || 0;
  const remaining = rateLimitInfo.remaining ?? 0;

  let msg = '';
  if (remaining <= 2 && remaining > 0) {
    msg = `\n\n-- ${remaining} call${remaining === 1 ? '' : 's'} left today. Pro $9: paypal.me/Yagami8095/9 (PayPal) | https://product-store.yagami8095.workers.dev/products/ecosystem-pro (Card/Stripe)`;
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

  // For tool calls, check rate limit once per batch
  const hasToolCall = requests.some(r => r.method === 'tools/call');
  let rateLimitInfo = null;
  if (hasToolCall) {
    rateLimitInfo = await checkRateLimit(kv, clientIp);

      // Pro key override: use higher limit
      if (_proKeyInfo && _proKeyInfo.valid) {
        rateLimitInfo = await proKeyRateLimit(kv || env?.KV, apiKey, _proKeyInfo.daily_limit);
      }

    if (!rateLimitInfo.allowed) {
      const rl = jsonRpcError(
        requests.find(r => r.method === 'tools/call')?.id ?? null,
        -32029,
        `Rate limit exceeded (${RATE_LIMIT_MAX}/day). FREE 7-day trial (100 calls/day): https://product-store.yagami8095.workers.dev/auth/login\n\nPro ($9, 1000/day): https://paypal.me/Yagami8095/9 (PayPal) | https://product-store.yagami8095.workers.dev/products/ecosystem-pro (Card/Stripe) | x402: $0.05/call USDC on Base`
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
        // No response for notifications
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

        // Semantic cache check
        const cached = await getCached(kv, 'seo', toolName, toolArgs);
        if (cached) {
          const cachedResp = jsonRpcResponse(r.id, cached);
          addUpgradePrompt(cachedResp, rateLimitInfo);
          responses.push(cachedResp);
          break;
        }

        const toolResp = await handleToolCall(r.id, r.params || {});
        addUpgradePrompt(toolResp, rateLimitInfo);

        // Cache successful results (24h)
        if (toolResp?.result && !toolResp.result.isError) {
          await setCache(kv, 'seo', toolName, toolArgs, toolResp.result);
        }

        responses.push(toolResp);
        break;
      }

      default:
        responses.push(jsonRpcError(r.id, -32601, `Method not found: ${r.method}`));
    }
  }

  const filtered = responses.filter(Boolean);
  if (filtered.length === 0) return null; // all notifications
  return isBatch ? filtered : filtered[0];
}

// ============================================================
// Landing Page
// ============================================================

function buildLandingHtml() {
  const tools = [
    { name: 'analyze_seo',      desc: 'Score content for SEO: keyword density, readability, heading structure, meta recommendations' },
    { name: 'generate_meta_tags', desc: 'Generate optimized title, meta description, Open Graph, and Twitter card tags' },
    { name: 'keyword_extract',  desc: 'Extract top keywords/keyphrases with TF-IDF scoring and n-gram analysis' },
    { name: 'readability_score', desc: 'Calculate Flesch-Kincaid, Gunning Fog, SMOG, and Coleman-Liau readability metrics' },
    { name: 'slug_generator',   desc: 'Generate SEO-friendly URL slugs with Unicode transliteration and stop word removal' },
    { name: 'structured_data',  desc: 'Generate JSON-LD structured data: Article, Product, FAQ, HowTo, Recipe schemas' },
  ];

  const toolsHtml = tools.map(t => `
        <li class="py-3 border-b border-cyan-900/50 last:border-0">
          <code class="text-cyan-400 font-semibold">${t.name}</code>
          <span class="text-gray-400 text-sm ml-2">-- ${t.desc}</span>
        </li>`).join('');

  const ecosystemHtml = Object.entries({
    'json-toolkit-mcp':       { url: ECOSYSTEM.json_toolkit,  desc: 'JSON format, validate, diff, query, transform, schema generation' },
    'regex-engine-mcp':       { url: ECOSYSTEM.regex,         desc: 'Regex testing, debugging, explanation & generation with examples' },
    'color-palette-mcp':      { url: ECOSYSTEM.color,         desc: 'Color palette generation, conversion, contrast checks & harmony' },
    'prompt-enhancer-mcp':    { url: ECOSYSTEM.prompt,        desc: 'Prompt optimization, rewriting, scoring & multilingual enhancement' },
    'timestamp-converter-mcp':{ url: ECOSYSTEM.timestamp,     desc: 'Unix/ISO timestamp conversion, timezone math & duration calc' },
    'openclaw-intel-mcp':     { url: ECOSYSTEM.intel,         desc: 'AI market intelligence -- track Claude Code, Cursor, Devin growth trends' },
    'openclaw-fortune-mcp':   { url: ECOSYSTEM.fortune,       desc: 'Daily zodiac horoscope & tarot readings for all 12 signs' },
    'moltbook-publisher-mcp': { url: ECOSYSTEM.moltbook,      desc: 'Japanese content publishing -- MD to HTML, SEO, EN to JP for note.com/Zenn/Qiita' },
    'agentforge-compare-mcp': { url: ECOSYSTEM.agentforge,    desc: 'AI coding tool comparison -- Claude Code vs Cursor vs Devin analysis' },
    'product-store':          { url: ECOSYSTEM.store,          desc: 'AI tools, templates, and intelligence products' },
  }).map(([name, info]) => `
        <li class="py-2 text-sm">
          <a href="${info.url.replace('/mcp', '')}" class="text-cyan-400 hover:underline font-medium">${name}</a>
          <span class="text-gray-500 ml-2">-- ${info.desc}</span>
        </li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Toolkit MCP -- OpenClaw Intelligence</title>
  <meta name="description" content="Free MCP server with 6 SEO tools for AI agents: content analysis, meta tag generation, keyword extraction, readability scoring, slug generation, and structured data. Works with Claude Code, Cursor, Windsurf.">
  <meta name="keywords" content="SEO tools, meta tags, keyword extraction, readability score, structured data, JSON-LD, MCP server, AI tools, Claude Code">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://seo-toolkit-mcp.yagami8095.workers.dev">
  <meta property="og:type" content="website">
  <meta property="og:title" content="SEO Toolkit MCP Server - Analyze, Optimize & Generate SEO Data | OpenClaw">
  <meta property="og:description" content="Free MCP server with 6 SEO tools for AI agents: content analysis, meta tag generation, keyword extraction, readability scoring, slug generation, and structured data.">
  <meta property="og:url" content="https://seo-toolkit-mcp.yagami8095.workers.dev">
  <meta property="og:site_name" content="OpenClaw Intelligence">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="SEO Toolkit MCP Server - Analyze, Optimize & Generate SEO Data | OpenClaw">
  <meta name="twitter:description" content="Free MCP server with 6 SEO tools for AI agents: content analysis, meta tag generation, keyword extraction, readability scoring, slug generation, and structured data.">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    pre { scrollbar-width: thin; scrollbar-color: #0891b2 #083344; }
    pre::-webkit-scrollbar { height: 6px; }
    pre::-webkit-scrollbar-track { background: #083344; }
    pre::-webkit-scrollbar-thumb { background: #0891b2; border-radius: 3px; }
  </style>

  <script type="application/ld+json">
  {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "SEO Toolkit MCP Server",
  "description": "Free MCP server with 6 SEO tools for AI agents: content analysis, meta tag generation, keyword extraction, readability scoring, slug generation, and structured data.",
  "url": "https://seo-toolkit-mcp.yagami8095.workers.dev",
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
  <header class="border-b border-cyan-900/50 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
    <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-br from-cyan-400 to-teal-600 rounded-lg flex items-center justify-center text-gray-950 font-bold text-sm">S</div>
        <span class="font-bold text-lg text-white">SEO Toolkit MCP</span>
        <span class="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">v1.0.0</span>
      </div>
      <span class="text-xs text-gray-500">by OpenClaw Intelligence</span>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-6 py-12">

    <!-- Hero -->
    <div class="mb-12 text-center">
      <div class="inline-block bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-800/50 rounded-2xl px-6 py-2 mb-6">
        <span class="text-cyan-400 text-sm font-medium">Free Tier: 10 requests/day per IP | Pro: 100/day</span>
      </div>
      <h1 class="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
        SEO Toolkit MCP Server
      </h1>
      <p class="text-gray-400 text-lg max-w-2xl mx-auto">
        6 powerful SEO tools for AI agents -- analyze content, generate meta tags, extract keywords, score readability, create slugs, and build structured data.
      </p>
    </div>

    <!-- Quick Connect -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-cyan-900/40 shadow-lg shadow-cyan-950/20">
      <h2 class="text-lg font-bold mb-1 text-white">Quick Connect</h2>
      <p class="text-gray-500 text-sm mb-4">Add to your Claude Code / Cursor / Windsurf / Cline MCP config:</p>
      <pre class="bg-gray-950 rounded-xl p-4 text-sm text-cyan-300 overflow-x-auto border border-cyan-900/30">{
  "mcpServers": {
    "seo-toolkit": {
      "url": "https://seo-toolkit-mcp.yagami8095.workers.dev/mcp",
      "type": "http"
    }
  }
}</pre>
      <p class="text-gray-600 text-xs mt-3">MCP Protocol: 2025-03-26 | Streamable HTTP | JSON-RPC 2.0 | Batch support</p>
    </div>

    <!-- Tools -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-cyan-900/40">
      <h2 class="text-lg font-bold mb-4 text-white">6 Free Tools</h2>
      <ul class="divide-y divide-cyan-900/30">
        ${toolsHtml}
      </ul>
    </div>

    <!-- Usage Examples -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-cyan-900/40">
      <h2 class="text-lg font-bold mb-4 text-white">Example Tool Calls</h2>
      <div class="space-y-4">
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-2">analyze_seo -- content analysis with keyword</p>
          <pre class="bg-gray-950 rounded-lg p-3 text-xs text-green-400 overflow-x-auto">{
  "method": "tools/call",
  "params": {
    "name": "analyze_seo",
    "arguments": {
      "content": "Learn the best SEO practices for your blog...",
      "keyword": "SEO practices"
    }
  }
}</pre>
        </div>
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-2">structured_data -- generate FAQ JSON-LD</p>
          <pre class="bg-gray-950 rounded-lg p-3 text-xs text-green-400 overflow-x-auto">{
  "method": "tools/call",
  "params": {
    "name": "structured_data",
    "arguments": {
      "schema_type": "FAQ",
      "data": {
        "questions": [
          {"question": "What is SEO?", "answer": "Search Engine Optimization..."}
        ]
      }
    }
  }
}</pre>
        </div>
      </div>
    </div>

    <!-- Rate Limits -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-cyan-900/40">
      <h2 class="text-lg font-bold mb-3 text-white">Rate Limits</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div class="bg-gray-800/50 rounded-xl p-4">
          <div class="text-2xl font-bold text-cyan-400">10</div>
          <div class="text-gray-400 mt-1">free calls / day</div>
          <div class="text-gray-600 text-xs mt-1">per IP address, resets midnight UTC</div>
        </div>
        <div class="bg-gray-800/50 rounded-xl p-4">
          <div class="text-2xl font-bold text-teal-400">100</div>
          <div class="text-gray-400 mt-1">Pro calls / day</div>
          <div class="text-gray-600 text-xs mt-1">$9/mo via Pro key</div>
        </div>
      </div>
    </div>

    <!-- Ecosystem -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-cyan-900/40">
      <h2 class="text-lg font-bold mb-4 text-white">OpenClaw MCP Ecosystem</h2>
      <ul class="divide-y divide-cyan-900/30">
        ${ecosystemHtml}
      </ul>
      <div class="mt-4 pt-4 border-t border-cyan-900/30">
        <a href="${ECOSYSTEM.store}" class="text-orange-400 hover:underline text-sm font-medium">OpenClaw Store</a>
        <span class="text-gray-500 text-sm ml-2">-- AI tools, prompts, and intelligence products</span>
      </div>
    </div>

    <!-- Health -->
    <div class="text-center">
      <a href="/health" class="text-gray-600 hover:text-cyan-400 text-sm transition-colors">Health Check /health</a>
      <span class="text-gray-800 mx-2">|</span>
      <a href="/mcp" class="text-gray-600 hover:text-cyan-400 text-sm transition-colors">MCP Endpoint /mcp</a>
    </div>

  </main>

  <footer class="border-t border-gray-900 mt-12 py-6 text-center text-gray-700 text-sm">
    SEO Toolkit MCP v1.0.0 &bull; Powered by <span class="text-cyan-800">OpenClaw Intelligence</span> &bull; Cloudflare Workers
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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, X-Forwarded-For',
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
// Edge Defense Layer -- Anti-Freeloader + Honeypot + Fingerprint
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
  const ct = request.headers.get('Content-Type') || '';
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

  // 1. Honeypot check
  if (HONEYPOT_PATHS.includes(path.toLowerCase())) {
    try {
      const raw = await kv.get(defenseKey, { type: 'json' }) || { score: 100, hits: 0, flags: [] };
      raw.score = Math.max(0, raw.score - 30);
      raw.hits++;
      raw.flags.push('honeypot:' + path);
      await kv.put(defenseKey, JSON.stringify(raw), { expirationTtl: 86400 });
    } catch { /* non-fatal */ }
    return { action: 'honeypot', status: 404 };
  }

  // 2. Payload size check
  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > PAYLOAD_MAX_BYTES) {
    return { action: 'reject', reason: 'Payload too large', status: 413 };
  }

  // 3. Check IP reputation
  try {
    const raw = await kv.get(defenseKey, { type: 'json' });
    if (raw && raw.score < 10) {
      return { action: 'block', reason: 'IP blocked due to suspicious activity', status: 403 };
    }
    if (raw && raw.score < 30) {
      return { action: 'throttle', delay: 200 };
    }
  } catch { /* KV failure -- allow */ }

  // 4. Fingerprint anomaly
  const fp = getRequestFingerprint(request);
  if (fp.isSuspicious) {
    try {
      const raw = await kv.get(defenseKey, { type: 'json' }) || { score: 100, hits: 0, flags: [] };
      if (!raw.flags.includes('suspicious-fp')) {
        raw.score = Math.max(0, raw.score - 10);
        raw.flags.push('suspicious-fp');
        await kv.put(defenseKey, JSON.stringify(raw), { expirationTtl: 86400 });
      }
    } catch { /* non-fatal */ }
  }

  return { action: 'allow' };
}

function sanitizeInput(str, maxLen = 2000) {
  if (!str) return '';
  if (typeof str !== 'string') return String(str).slice(0, maxLen);
  return str.slice(0, maxLen).replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, '');
}

// ============================================================
// FinOps Circuit Breaker -- Track daily usage, auto-degrade
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

// Attribution Tracking -- ?ref= parameter
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
    const defense = await edgeDefense(request, env, 'seo');
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
    const finops = await finopsTrack(env, 'seo-toolkit');
    if (!finops.ok) return jsonResponse({ error: finops.reason, retryAfter: 'tomorrow' }, finops.status);
    if (finops.delay) await new Promise(r => setTimeout(r, finops.delay));

    // Attribution Tracking
    await trackRef(request, env, 'seo-toolkit');

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
        "- SEO Toolkit: https://seo-toolkit-mcp.yagami8095.workers.dev/mcp",
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
        'Add to MCP config: {"url": "https://seo-toolkit-mcp.yagami8095.workers.dev/mcp"}',
        "",
        "## Pro: 9 USD, 1000 calls/day all servers",
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
        rate_limit: { free_per_day: RATE_LIMIT_MAX, pro_per_day: 100 },
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

      // Get client IP for rate limiting
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
