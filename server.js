// Agent de veille — IA & Tech, Politique, Religion
// Zéro dépendance. Lance:  node server.js   puis ouvre http://localhost:3000
// Les articles viennent uniquement des flux RSS officiels des médias listés ci-dessous :
// rien n'est généré ni inventé, chaque info renvoie vers l'article original.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const REFRESH_MS = 3 * 60 * 1000; // actualisation toutes les 3 minutes
const MAX_PER_CATEGORY = 150;
const MAX_AGE_DAYS = 3;

const SOURCES = {
  tech: [
    { name: 'Numerama', url: 'https://www.numerama.com/feed/' },
    { name: 'Le Monde Pixels', url: 'https://www.lemonde.fr/pixels/rss_full.xml' },
    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
    { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
    { name: 'TechCrunch IA', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
    { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/' },
  ],
  politique: [
    { name: 'Le Monde Politique', url: 'https://www.lemonde.fr/politique/rss_full.xml' },
    { name: 'franceinfo Politique', url: 'https://www.francetvinfo.fr/politique.rss' },
    { name: 'France 24', url: 'https://www.france24.com/fr/rss' },
    { name: 'Le Figaro Politique', url: 'https://www.lefigaro.fr/rss/figaro_politique.xml' },
    { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  ],
  religion: [
    { name: 'Vatican News', url: 'https://www.vaticannews.va/fr.rss.xml' },
    { name: 'Le Monde Religions', url: 'https://www.lemonde.fr/religions/rss_full.xml' },
    { name: 'Aleteia', url: 'https://fr.aleteia.org/feed/' },
    { name: 'Religion News Service', url: 'https://religionnews.com/feed/' },
  ],
};

// ---------- Parsing RSS / Atom ----------
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', laquo: '«', raquo: '»' };
function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
function clean(s) {
  if (!s) return '';
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  s = decode(s);
  s = s.replace(/<[^>]*>/g, ' ');
  s = decode(s).replace(/\s+/g, ' ').trim();
  return s;
}
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1] : '';
}
function parseFeed(xml, source, category) {
  const items = [];
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  for (const b of blocks) {
    const title = clean(tag(b, 'title'));
    let link = clean(tag(b, 'link'));
    if (!link) {
      const m = b.match(/<link[^>]*href=["']([^"']+)["']/i);
      if (m) link = decode(m[1]);
    }
    const dateStr = clean(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date'));
    const t = Date.parse(dateStr);
    let summary = clean(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content:encoded') || tag(b, 'content'));
    if (summary.length > 280) summary = summary.slice(0, 277).replace(/\s+\S*$/, '') + '…';
    if (!title || !/^https?:\/\//i.test(link) || isNaN(t)) continue;
    if (t > Date.now() + 3600e3) continue; // dates futures aberrantes
    items.push({ id: link, title, link, summary, source, category, time: t });
  }
  return items;
}

// ---------- Collecte ----------
const state = { items: {}, status: {}, updatedAt: null };

async function fetchSource(category, src) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(src.url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (VeilleBot; lecteur RSS personnel)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const xml = await res.text();
    const items = parseFeed(xml, src.name, category);
    state.status[src.name] = { ok: true, count: items.length, at: Date.now() };
    return items;
  } catch (e) {
    state.status[src.name] = { ok: false, error: String(e.message || e), at: Date.now() };
    return [];
  } finally {
    clearTimeout(timer);
  }
}

const clients = new Set();
async function refresh() {
  const cutoff = Date.now() - MAX_AGE_DAYS * 86400e3;
  let newCount = 0;
  for (const category of Object.keys(SOURCES)) {
    const lists = await Promise.all(SOURCES[category].map((s) => fetchSource(category, s)));
    const map = new Map();
    for (const it of lists.flat()) if (it.time >= cutoff) map.set(it.id, it);
    const prev = new Set((state.items[category] || []).map((i) => i.id));
    for (const id of map.keys()) if (!prev.has(id)) newCount++;
    state.items[category] = [...map.values()].sort((a, b) => b.time - a.time).slice(0, MAX_PER_CATEGORY);
  }
  state.updatedAt = Date.now();
  console.log(`[${new Date().toLocaleTimeString('fr-FR')}] actualisé — ${newCount} nouveaux articles`);
  for (const res of clients) res.write(`event: update\ndata: ${JSON.stringify({ updatedAt: state.updatedAt })}\n\n`);
}

// ---------- Données géographiques (cache 24 h) ----------
// Contours : world-atlas (Natural Earth) · Fiches : world-countries (mledoze) · Population : Banque mondiale
const geoCache = { world: null, countries: null, at: 0 };
async function getJSON(url) {
  const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'VeilleBot' } });
  if (!r.ok) throw new Error(url + ' HTTP ' + r.status);
  return r.json();
}
async function loadGeo() {
  if (geoCache.world && Date.now() - geoCache.at < 864e5) return geoCache;
  const [world, list, pop] = await Promise.all([
    getJSON('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'),
    getJSON('https://cdn.jsdelivr.net/npm/world-countries@5/countries.json'),
    getJSON('https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&mrnev=1&per_page=400').catch(() => null),
  ]);
  const popBy = {};
  for (const p of (pop && pop[1]) || []) if (p.value) popBy[p.countryiso3code] = { v: p.value, y: p.date };
  const countries = list.map((c) => ({
    id: c.ccn3, a2: c.cca2, a3: c.cca3,
    name: c.name.common, fr: c.translations?.fra?.common || c.name.common, official: c.translations?.fra?.official || c.name.official,
    capital: c.capital || [], region: c.region, subregion: c.subregion, area: c.area,
    languages: Object.keys(c.languages || {}),
    currencies: Object.entries(c.currencies || {}).map(([code, x]) => ({ code, symbol: x.symbol || '' })),
    population: popBy[c.cca3]?.v || null, popYear: popBy[c.cca3]?.y || null,
    borders: (c.borders || []).length, landlocked: !!c.landlocked,
  }));
  Object.assign(geoCache, { world, countries, at: Date.now() });
  return geoCache;
}

// ---------- Nouvelles par pays (Google Actualités, flux RSS, cache 5 min) ----------
const HL = { fra:'fr', eng:'en', spa:'es', por:'pt', ara:'ar', deu:'de', ita:'it', rus:'ru', jpn:'ja', kor:'ko', zho:'zh-CN', nld:'nl', tur:'tr', hin:'hi', pol:'pl', ukr:'uk', swe:'sv', nor:'no', nob:'no', fin:'fi', dan:'da', ell:'el', heb:'he', vie:'vi', tha:'th', ind:'id', ron:'ro', hun:'hu', ces:'cs', bul:'bg', srp:'sr', hrv:'hr', slk:'sk', lit:'lt', lav:'lv', est:'et', cat:'ca', ben:'bn', urd:'ur', fas:'fa', msa:'ms', zsm:'ms', swa:'sw' };
const newsCache = new Map();
async function gnews(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (VeilleBot)' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const xml = await r.text();
  const out = [];
  for (const b of xml.match(/<item>[\s\S]*?<\/item>/gi) || []) {
    let title = clean(tag(b, 'title')); const source = clean(tag(b, 'source')), link = clean(tag(b, 'link')), t = Date.parse(clean(tag(b, 'pubDate')));
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
    if (title && /^https?:\/\//i.test(link) && !isNaN(t)) out.push({ title, source: source || 'Google Actualités', link, time: t });
    if (out.length >= 14) break;
  }
  return out;
}
async function countryNews(code, q, langs) {
  const key = code + '|' + q; const hit = newsCache.get(key);
  if (hit && Date.now() - hit.at < 300000) return hit.data;
  const fr = await gnews(`https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:3d')}&hl=fr&gl=FR&ceid=FR:fr`).catch(() => []);
  let local = [], localLang = 'en';
  const tries = [...new Set([...(langs.map((l) => HL[l]).filter(Boolean)).slice(0, 2), 'en'])];
  for (const hl of tries) {
    const ceid = `${code}:${hl === 'pt' ? 'pt-419' : hl}`;
    local = await gnews(`https://news.google.com/rss?hl=${hl === 'pt' ? 'pt-BR' : hl}&gl=${code}&ceid=${ceid}`).catch(() => []);
    if (local.length) { localLang = hl; break; }
  }
  const data = { fr, local, localLang };
  newsCache.set(key, { at: Date.now(), data });
  return data;
}

// ---------- Serveur HTTP ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/country-news') {
    const code = (url.searchParams.get('code') || '').toUpperCase(), q = (url.searchParams.get('q') || '').slice(0, 80);
    const langs = (url.searchParams.get('langs') || '').split(',').filter((l) => /^[a-z]{3}$/.test(l)).slice(0, 4);
    if (!/^[A-Z]{2}$/.test(code) || !q) { res.writeHead(400); return res.end('bad request'); }
    try {
      const d = await countryNews(code, q, langs);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(d));
    } catch (e) { res.writeHead(502); return res.end('error'); }
  }
  if (url.pathname === '/api/geo') {
    try {
      const g = await loadGeo();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
      return res.end(JSON.stringify({ world: g.world, countries: g.countries }));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: String(e.message || e) }));
    }
  }
  if (url.pathname === '/api/news') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(state));
  }
  if (url.pathname === '/api/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 5000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
  }
  res.writeHead(404);
  res.end('Not found');
});
setInterval(() => clients.forEach((r) => r.write(': ping\n\n')), 25000);

server.listen(PORT, () => {
  console.log(`Veille en ligne : http://localhost:${PORT}`);
  refresh().catch(console.error);
  setInterval(() => refresh().catch(console.error), REFRESH_MS);
});
