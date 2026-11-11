// Générateur de visites guidées pour n'importe quel pays, à partir de sources ouvertes :
//   Wikidata (choix des lieux : capitale, patrimoine mondial, parcs, montagnes, lacs, îles…),
//   Wikipédia en français (textes, coordonnées, fréquentation des articles pour classer les lieux par notoriété),
//   Wikimedia Commons (photos libres, avec auteur et licence).
// Rien n'est inventé : chaque phrase lue vient d'un article Wikipédia (CC BY-SA), cité sous la carte de narration.
// Utilisation : const tour = await TourGen.build(infoPays, { polys, onProgress, fallbackCenter })  — voir immersion.js
(() => {
  'use strict';
  const WD = 'https://www.wikidata.org/w/api.php';
  const WP = 'https://fr.wikipedia.org/w/api.php';

  // une recherche par catégorie (Wikidata), puis tri par notoriété : la catégorie ne donne qu'un petit bonus
  const CATS = [
    { k: 'unesco', q: 'haswbstatement:P1435=Q9259', lab: 'Patrimoine mondial', bonus: 6, n: 100 },
    { k: 'tour', q: 'haswbstatement:P31=Q570116', lab: 'Site touristique', bonus: 3, n: 50 },
    { k: 'parc', q: 'haswbstatement:P31=Q46169', lab: 'Parc national', bonus: 2, n: 50 },
    { k: 'archeo', q: 'haswbstatement:P31=Q839954', lab: 'Site archéologique', bonus: 2, n: 30 },
    { k: 'mont', q: 'haswbstatement:P31=Q8502', lab: 'Montagne', bonus: 0, n: 50 },
    { k: 'volcan', q: 'haswbstatement:P31=Q8072', lab: 'Volcan', bonus: 1, n: 30 },
    { k: 'lac', q: 'haswbstatement:P31=Q23397', lab: 'Lac', bonus: 0, n: 50 },
    { k: 'chute', q: 'haswbstatement:P31=Q34038', lab: "Chute d'eau", bonus: 0, n: 30 },
    { k: 'ile', q: 'haswbstatement:P31=Q23442', lab: 'Île', bonus: 0, n: 50 },
  ];
  const WIDE = /(parc|réserve|forêt|archipel|île|îles|lac|lacs|désert|massif|récif|barrière|vallée|chemins|route|delta|baie|savane|mangrove|plateau|cordillère|glacier|lagune|golfe|côte|marais|steppe|baie)/i;
  const ORD = ['Première', 'Deuxième', 'Troisième', 'Quatrième', 'Cinquième', 'Sixième', 'Septième'];

  const cache = new Map();
  const rad = Math.PI / 180;
  const km = (a, b) => { // distance en km entre deux [lon, lat]
    const dLat = (b[1] - a[1]) * rad, dLon = (b[0] - a[0]) * rad, s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
    return 12742 * Math.asin(Math.min(1, Math.sqrt(s)));
  };
  const jget = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
  const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const plain = (html) => { try { return (new DOMParser().parseFromString(String(html || ''), 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim(); } catch (e) { return ''; } };

  // ----- texte : nettoyage pour l'affichage et pour la voix
  const cleanText = (t) => String(t || '').replace(/\[\d+\]|\[[a-z]\]/gi, '').replace(/\([^()]*\)/g, ' ').replace(/\s*\n+\s*/g, ' ').replace(/\s+([,.;:!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  const sentences = (t) => (cleanText(t).match(/[^.!?…]+[.!?…]+(?=\s|$)/g) || []).map((s) => s.trim()).filter((s) => s.length > 25);
  // la voix lit mal les unités et les symboles : on les écrit en toutes lettres
  const speechText = (t) => t
    .replace(/(\d)\s?km(?:2|²)/gi, '$1 kilomètres carrés').replace(/(\d)\s?km\b/gi, '$1 kilomètres').replace(/(\d)\s?m(?:2|²)/gi, '$1 mètres carrés')
    .replace(/(\d)\s?m\b/g, '$1 mètres').replace(/(\d)\s?%/g, '$1 pour cent').replace(/\bkm\b/gi, 'kilomètres').replace(/&/g, ' et ')
    .replace(/(\d)[  ](\d{3})/g, '$1$2').replace(/\s{2,}/g, ' ');

  // ----- Wikidata
  async function wdSearch(q, n) {
    const pages = []; for (let off = 0; off < n; off += 50) pages.push(off);
    const lists = await Promise.all(pages.map((off) => jget(`${WD}?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=${Math.min(50, n - off)}&sroffset=${off}&srnamespace=0&format=json&origin=*`).then((j) => (j.query && j.query.search || []).map((s) => s.title)).catch(() => [])));
    return lists.flat();
  }
  // fiches légères : libellé français et titre de l'article français (sans les « claims », très lourdes)
  async function wdLite(ids) {
    const out = {}; const chunks = [];
    for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
    await Promise.all(chunks.map((c) => jget(`${WD}?action=wbgetentities&ids=${c.join('|')}&props=labels|sitelinks&languages=fr|en&sitefilter=frwiki&format=json&origin=*`).then((j) => Object.assign(out, j.entities || {})).catch(() => {})));
    return out;
  }
  const labelOf = (e) => (e.labels && (e.labels.fr || e.labels.en) || {}).value || '';
  const frTitle = (e) => e && e.sitelinks && e.sitelinks.frwiki && e.sitelinks.frwiki.title;
  // capitale : valeur « préférée », sinon sans date de fin (écarte les capitales historiques)
  async function capitalId(qid) {
    try {
      const j = await jget(`${WD}?action=wbgetclaims&entity=${qid}&property=P36&format=json&origin=*`);
      const list = (j.claims && j.claims.P36) || [];
      const best = list.find((c) => c.rank === 'preferred') || list.find((c) => !(c.qualifiers && c.qualifiers.P582)) || list[0];
      const d = best && best.mainsnak && best.mainsnak.datavalue; return d && d.value && d.value.id;
    } catch (e) { return null; }
  }

  // ----- Wikipédia : coordonnées et fréquentation (30 jours) de plusieurs articles en un appel
  async function meta(titles) {
    const out = {}; const chunks = [];
    for (let i = 0; i < titles.length; i += 50) chunks.push(titles.slice(i, i + 50));
    await Promise.all(chunks.map(async (chunk) => {
      try {
        const j = await jget(`${WP}?action=query&prop=coordinates|pageviews&colimit=max&coprimary=primary&pvipdays=30&titles=${encodeURIComponent(chunk.join('|'))}&format=json&formatversion=2&origin=*`);
        const back = {}; (j.query.normalized || []).forEach((n) => { back[n.to] = n.from; });
        (j.query.pages || []).forEach((p) => {
          const c = p.coordinates && p.coordinates[0], views = Object.values(p.pageviews || {}).reduce((a, b) => a + (b || 0), 0);
          const rec = { xy: c ? [c.lon, c.lat] : null, views }; out[p.title] = rec; if (back[p.title]) out[back[p.title]] = rec;
        });
      } catch (e) {}
    }));
    return out;
  }
  // lieux cités dans l'article Wikipédia du pays : coordonnées, fréquentation et description courte, 500 articles par appel
  async function linkPool(title) {
    const rows = new Map(); let cont = null;
    for (let i = 0; i < 6; i++) {
      let u = `${WP}?action=query&generator=links&gplnamespace=0&gpllimit=500&titles=${encodeURIComponent(title)}&prop=coordinates|pageviews|description&coprimary=primary&colimit=max&pvipdays=30&format=json&formatversion=2&origin=*`;
      if (cont) Object.entries(cont).forEach(([k, v]) => { u += `&${k}=${encodeURIComponent(v)}`; });
      let j; try { j = await jget(u); } catch (e) { break; }
      ((j.query && j.query.pages) || []).forEach((p) => {
        const r = rows.get(p.pageid) || { title: p.title, views: 0, xy: null, desc: '' };
        if (p.coordinates && p.coordinates[0]) r.xy = [p.coordinates[0].lon, p.coordinates[0].lat];
        if (p.pageviews) r.views = Object.values(p.pageviews).reduce((a, b) => a + (b || 0), 0);
        if (p.description) r.desc = p.description;
        rows.set(p.pageid, r);
      });
      if (!j.continue) break; cont = j.continue;
    }
    return [...rows.values()];
  }
  // type d'un lieu cité, d'après sa description courte (sert au titre de l'étape et au cadrage)
  const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); // sans accents : les descriptions Wikidata varient
  // premier mot de la description : s'il désigne un pays, un continent, une région, un cours d'eau… ce n'est pas un lieu à survoler
  const NOT_FIRST = new Set(['pays', 'etat', 'etats', 'nation', 'republique', 'royaume', 'empire', 'continent', 'sous-continent', 'region', 'regions', 'province', 'departement', 'gouvernorat', 'district', 'comte', 'prefecture', 'subdivision', 'division', 'fleuve', 'riviere', 'affluent', 'mer', 'ocean', 'golfe', 'detroit', 'ensemble', 'ancien', 'ancienne', 'peuple', 'langue', 'groupe', 'culture', 'partie', 'zone']);
  const ADMIN = ['region', 'territoire', 'province', 'gouvernorat', 'comte', 'district', 'prefecture', 'division', 'bande de', 'canal', 'fleuve', 'riviere', 'federe', 'pays d', 'pays de', 'etat ', 'bataille', 'siege de', 'guerre', 'conflit', 'attaque', 'massacre', 'traite', 'accord', 'chaussee', 'pont ', 'autoroute', 'ligne de'];
  const KEEP = ['parc', 'reserve', 'desert', 'site'];
  const has = (d, words) => words.some((w) => d.includes(w));
  function kindOf(desc) {
    const d = norm(desc);
    if (!d) return null;
    const first = d.split(/[\s,;:(]+/)[0];
    if (NOT_FIRST.has(first)) return null;
    if (has(d, ADMIN) && !has(d, KEEP)) return null; // divisions administratives, pays voisins, cours d'eau
    const w = ' ' + d.replace(/[^a-z0-9]+/g, ' ') + ' '; // mots entiers, sans ponctuation
    const label = cap1(String(desc).split(/[,(;]/)[0]).slice(0, 36);
    if (has(w, [' capitale ', ' ville ', ' metropole ', ' commune ', ' municipalite ', ' localite ', ' agglomeration '])) return { k: 'ville', lab: 'Ville' };
    if (has(d, ['volcan'])) return { k: 'volcan', lab: 'Volcan' };
    if (has(w, [' montagne ', ' mont ', ' sommet ', ' massif ', ' chaine '])) return { k: 'mont', lab: 'Montagne' };
    if (has(w, [' lac ', ' lacs '])) return { k: 'lac', lab: 'Lac' };
    if (has(w, [' ile ', ' iles ', ' archipel ', ' atoll '])) return { k: 'ile', lab: 'Île' };
    if (has(w, [' parc ', ' reserve ', ' sanctuaire naturel '])) return { k: 'parc', lab: 'Parc national' };
    if (has(w, [' chute ', ' chutes ', ' cascade '])) return { k: 'chute', lab: "Chute d'eau" };
    if (has(w, [' desert ', ' plateau ', ' vallee ', ' canyon ', ' gorge ', ' glacier ', ' recif ', ' barriere ', ' baie ', ' plage ', ' cote '])) return { k: 'nature', lab: label };
    return { k: 'site', lab: label || 'Lieu emblématique' };
  }
  async function extracts(titles) {
    const out = {};
    const chunks = []; for (let i = 0; i < titles.length; i += 20) chunks.push(titles.slice(i, i + 20));
    await Promise.all(chunks.map(async (chunk) => {
      try {
        const j = await jget(`${WP}?action=query&prop=extracts&exintro=1&explaintext=1&exsentences=6&exlimit=max&redirects=1&titles=${encodeURIComponent(chunk.join('|'))}&format=json&formatversion=2&origin=*`);
        const map = {}; (j.query.normalized || []).forEach((n) => { map[n.from] = n.to; }); (j.query.redirects || []).forEach((r) => { map[r.from] = r.to; });
        const byTitle = {}; (j.query.pages || []).forEach((p) => { if (p.extract) byTitle[p.title] = p.extract; });
        chunk.forEach((t) => { let x = t; for (let k = 0; k < 3 && map[x]; k++) x = map[x]; if (byTitle[x]) out[t] = byTitle[x]; });
      } catch (e) {}
    }));
    return out;
  }
  // photos libres de l'article (paysage, assez grandes, licence libre), avec description, auteur et licence
  const BAD = /(flag|drapeau|map|carte|locator|location|situation|blason|armoiries|coat|logo|icon|ic[ôo]ne|plan\b|diagram|sch[ée]ma|wikidata|disambig|symbol|signature|portrait|stamp|timbre|sprite|banner|bandeau)/i;
  const EN = /\b(the|of|and|view|from|with|near|in the)\b/i;
  async function photosOf(title, label) {
    const j = await jget(`${WP}?action=query&generator=images&gimlimit=40&redirects=1&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1280&format=json&formatversion=2&origin=*`);
    const key = (label || title).toLowerCase().split(/[\s'’\-,()]+/).filter((w) => w.length >= 4);
    const list = (j.query && j.query.pages || []).map((p, i) => {
      const ii = p.imageinfo && p.imageinfo[0]; if (!ii || !/jpeg/.test(ii.mime) || ii.width < 1400 || ii.width < ii.height * 1.15 || BAD.test(p.title)) return null;
      const m = ii.extmetadata || {}, lic = plain(m.LicenseShortName && m.LicenseShortName.value);
      if (!/^(CC|Public|Domaine)/i.test(lic) || !/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(ii.thumburl || '')) return null;
      const t = p.title.toLowerCase(), hit = key.some((w) => t.includes(w)) ? 1 : 0;
      let cap = plain(m.ImageDescription && m.ImageDescription.value); if (cap.length > 110) cap = cap.slice(0, cap.lastIndexOf(' ', 107)) + '…';
      if (!cap || EN.test(cap)) cap = cap1(label || title);
      const page = /^https:\/\/(commons\.wikimedia|fr\.wikipedia)\.org\//.test(ii.descriptionurl || '') ? ii.descriptionurl : null;
      return { hit, i, url: ii.thumburl, page, cap, by: plain(m.Artist && m.Artist.value) || 'Auteur inconnu', lic };
    }).filter(Boolean);
    list.sort((a, b) => b.hit - a.hit || a.i - b.i);
    return list.slice(0, 4);
  }

  // ----- géographie : « région principale » du pays = plus grand polygone + ceux situés à moins de 2 500 km (écarte la Guyane, Hawaï, l'Alaska…)
  function regionOf(polys) {
    const boxes = (polys || []).map((p) => {
      let w = 180, e = -180, s = 90, n = -90; p[0].forEach(([x, y]) => { if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y; });
      return { w, e, s, n, c: [(w + e) / 2, (s + n) / 2], a: (e - w) * (n - s) };
    });
    if (!boxes.length) return null;
    const main = boxes.reduce((a, b) => (b.a > a.a ? b : a));
    const kept = boxes.filter((b) => b === main || km(b.c, main.c) <= 2500);
    const u = kept.reduce((a, b) => ({ w: Math.min(a.w, b.w), e: Math.max(a.e, b.e), s: Math.min(a.s, b.s), n: Math.max(a.n, b.n) }), { w: 180, e: -180, s: 90, n: -90 });
    const mg = Math.max(.03, Math.min(.4, .12 * Math.max(u.e - u.w, u.n - u.s))); // marge proportionnelle : minuscule pour un micro-État (écarte les îles voisines)
    return { bounds: [[u.w, u.s], [u.e, u.n]], center: [(u.w + u.e) / 2, (u.s + u.n) / 2], has: (lon, lat) => kept.some((b) => lon >= b.w - mg && lon <= b.e + mg && lat >= b.s - mg && lat <= b.n + mg) };
  }

  // ----- construction de la visite
  async function build(info, ctx = {}) {
    const key = 'v2:' + info.a2; if (cache.has(key)) return cache.get(key);
    const say = (m) => ctx.onProgress && ctx.onProgress(m);
    const region = regionOf(ctx.polys);
    const name = info.fr || info.name;

    say('Recherche des lieux emblématiques');
    let qid = null; try { qid = (await wdSearch('haswbstatement:P297=' + info.a2, 1))[0]; } catch (e) {}
    const capQ = qid ? await capitalId(qid) : null;
    const lists = qid ? await Promise.all(CATS.map((c) => wdSearch(`${c.q} haswbstatement:P17=${qid}`, c.n).then((ids) => ({ c, ids })))) : [];
    const catOf = {}; lists.forEach(({ c, ids }) => ids.forEach((id) => { if (!catOf[id]) catOf[id] = c; }));
    const ids = [...new Set([...Object.keys(catOf), ...(capQ ? [capQ] : []), ...(qid ? [qid] : [])])];
    const ents = ids.length ? await wdLite(ids) : {};

    say('Classement des lieux par notoriété');
    const titleOf = {}; ids.forEach((id) => { const t = frTitle(ents[id]); if (t) titleOf[id] = t; });
    const m = await meta(Object.values(titleOf));
    const mk = (id, cat) => { const t = titleOf[id]; const r = t && m[t]; if (!r || !r.xy) return null; return { id, label: labelOf(ents[id]) || t.replace(/\s*\(.*\)$/, ''), title: t, xy: r.xy, views: r.views, cat }; };
    let cands = Object.keys(catOf).map((id) => mk(id, catOf[id])).filter(Boolean);
    const countryTitle0 = titleOf[qid];
    if (countryTitle0) {
      const rows = await linkPool(countryTitle0);
      rows.forEach((r) => { if (!r.xy || r.views < 20 || !r.desc) return; const cat = kindOf(r.desc); if (!cat) return; cands.push({ id: 'L:' + r.title, label: r.title.replace(/\s*\(.*\)$/, ''), title: r.title, xy: r.xy, views: r.views, cat: { ...cat, bonus: 0 } }); });
    }
    if (region) cands = cands.filter((c) => region.has(c.xy[0], c.xy[1]));
    const seen = new Set(); cands = cands.filter((c) => { const k = c.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    cands.forEach((c) => { c.score = 20 * Math.log10(c.views + 1) + c.cat.bonus; });
    cands = cands.filter((c) => c.views >= 20).sort((a, b) => b.score - a.score);
    if (ctx.debug) ctx.debug.cands = cands.slice(0, 25).map((c) => `${c.label} [${c.cat.k}] ${c.views}`);

    // sélection : la capitale d'abord, puis les plus consultés, bien espacés, en variant les types
    const picked = [];
    const capC = capQ && mk(capQ, { k: 'capitale', lab: 'Capitale' });
    if (capC && (!region || region.has(capC.xy[0], capC.xy[1]))) picked.push(capC);
    const byCat = {};
    for (const [minV, minD] of [[500, 10], [120, 8], [20, 6]]) {
      for (const c of cands) {
        if (picked.length >= 6) break;
        if (c.views < minV || picked.some((p) => p.id === c.id || p.title === c.title)) continue;
        if ((byCat[c.cat.k] || 0) >= (c.cat.k === 'ville' ? 2 : 3)) continue;
        if (picked.some((p) => km(p.xy, c.xy) < minD)) continue;
        picked.push(c); byCat[c.cat.k] = (byCat[c.cat.k] || 0) + 1;
      }
    }
    // ordre de visite : plus proche voisin depuis la capitale (le vol reste court et fluide)
    const order = []; const left = picked.slice();
    let curP = left.find((p) => p.cat.k === 'capitale') || left[0];
    while (curP) { order.push(curP); left.splice(left.indexOf(curP), 1); const from = curP; curP = left.sort((a, b) => km(from.xy, a.xy) - km(from.xy, b.xy))[0]; }

    say('Lecture des articles Wikipédia');
    const countryTitle = titleOf[qid];
    const ex = await extracts([...order.map((p) => p.title), ...(countryTitle ? [countryTitle] : [])]);
    const places = order.filter((p) => (ex[p.title] || '').length > 80);

    say('Choix des photos');
    const shots = await Promise.all(places.map((p) => photosOf(p.title, p.label).catch(() => [])));

    // ----- étapes
    const stops = [];
    const fr = new Intl.NumberFormat('fr-FR');
    const popTxt = (p) => (p >= 1e6 ? (p / 1e6).toFixed(p >= 1e7 ? 0 : 1).replace('.', ',') + ' millions' : fr.format(Math.round(p)));
    const countryEx = sentences(countryTitle && ex[countryTitle] || '');
    const pop = info.population ? `environ ${popTxt(info.population)} d'habitants` : '';
    const area = info.area ? `${fr.format(Math.round(info.area))} km²` : '';
    const capName = capC ? capC.label : (info.capital && info.capital[0]) || '';
    const facts = []; if (capName) facts.push(['Capitale', capName]); if (info.population) facts.push(['Habitants', '≈ ' + popTxt(info.population)]); if (info.area) facts.push(['Superficie', area]);
    const n = places.length;
    const overviewText = countryEx.slice(0, 3).join(' ') || `${name}${pop ? ' compte ' + pop : ''}${area ? ' sur ' + area : ''}.`;
    const center = region ? region.center : (ctx.fallbackCenter || [0, 0]);
    stops.push({
      title: `${name} vue du ciel`, place: "Vue d'ensemble", pin: false, text: overviewText,
      say: speechText(`Bienvenue : ${name} ! ${countryEx.slice(0, 3).join(' ')}${n ? ` Suivez le vol : ${n} escale${n > 1 ? 's' : ''} pour découvrir ${name}.` : ''}`),
      facts, bounds: region ? region.bounds : null, center, zoom: 5, pitch: 30, bearing: 10, orbit: 20, fly: 6500,
      source: countryTitle ? { label: 'Wikipédia', url: 'https://fr.wikipedia.org/wiki/' + encodeURIComponent(countryTitle.replace(/ /g, '_')) } : null,
    });
    places.forEach((p, i) => {
      const ss = sentences(ex[p.title]); const photos = shots[i] || [];
      const wide = p.cat.k === 'unesco' ? WIDE.test(p.label) : ['parc', 'mont', 'volcan', 'lac', 'ile'].includes(p.cat.k);
      const zoom = p.cat.k === 'capitale' ? 11.8 : p.cat.k === 'ile' ? 9.8 : p.cat.k === 'parc' ? 9.6 : p.cat.k === 'lac' ? 10.4 : p.cat.k === 'mont' || p.cat.k === 'volcan' ? 11 : p.cat.k === 'chute' ? 12.6 : p.cat.k === 'ville' ? 12 : p.cat.k === 'nature' ? 10 : wide ? 9.6 : 13.2;
      const intro = `${ORD[i] || 'Prochaine'} escale : ${p.cat.k === 'capitale' ? 'la capitale, ' : ''}${p.label} ! ${ss[0] || ''}`;
      const bearing = (((i * 83) + 25) % 180) - 90;
      const stop = {
        title: cap1(p.label), place: p.cat.lab, pin: true, text: ss.slice(0, 3).join(' ').slice(0, 520),
        facts: [['Type', p.cat.lab]], center: p.xy, zoom, pitch: zoom > 12 ? 62 : 58, bearing, orbit: i % 2 ? -52 : 52, fly: 8000,
        source: { label: 'Wikipédia', url: 'https://fr.wikipedia.org/wiki/' + encodeURIComponent(p.title.replace(/ /g, '_')) },
      };
      if (photos.length >= 2) {
        stop.intro = speechText(intro);
        stop.shots = photos.map((ph, k) => ({ url: ph.url, page: ph.page, cap: ph.cap, by: ph.by, lic: ph.lic, say: speechText(ss[k + 1] || `Regardez cette image : ${ph.cap}.`) }));
      } else {
        stop.say = speechText(`${intro} ${ss.slice(1, 4).join(' ')}`);
        stop.shots = []; // une seule photo (ou aucune) : trop peu pour en faire une mise en scène
      }
      stops.push(stop);
    });
    stops.push({
      title: 'Fin de la visite', place: "Vue d'ensemble", pin: false,
      text: `Vous avez parcouru ${n || 'quelques'} lieu${n > 1 ? 'x' : ''} de ${name}. Explorez la carte librement, rejouez la visite ou revenez au globe.`,
      say: "Et voilà, notre vol touche à sa fin ! Merci d'avoir voyagé avec nous. Vous pouvez explorer la carte librement, rejouer la visite, ou revenir au globe.",
      facts: [], bounds: region ? region.bounds : null, center, zoom: 5.2, pitch: 22, bearing: 0, orbit: 0, fly: 8000, dwell: 8000,
    });
    const tour = { name, tag: 'Visite guidée', topoId: info.id, auto: true, start: { center, zoom: 3.2 }, stops };
    cache.set(key, tour);
    return tour;
  }

  window.TourGen = { build };
})();
