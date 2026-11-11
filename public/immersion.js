// Immersion : visite guidée d'un pays (imagerie satellite + relief 3D + photos réelles au sol + narration vocale)
// Chargé à la demande quand on clique sur un pays qui possède une visite. Pour en ajouter un : une entrée dans TOURS.
//   Imagerie : © Esri, Maxar, Earthstar Geographics (World Imagery) — Relief : Mapzen / AWS Terrain Tiles — Carte : MapLibre GL JS
//   Photos : Wikimedia Commons (licences libres, auteur et licence affichés sous chaque photo)
(() => {
  'use strict';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
  const TOPO = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';
  const MAPLIBRE = 'https://unpkg.com/maplibre-gl@5/dist/maplibre-gl';
  const COMMONS = 'https://commons.wikimedia.org/w/api.php';

  // ---------- Contenu des visites ----------
  // text : texte affiché à l'écran · say : texte dit à voix haute (plus vivant, chiffres écrits en toutes lettres)
  // photos : fichiers Wikimedia Commons (f) et légende (cap) · street : point de départ pour Google Street View
  const TOURS = {
    DO: {
      name: 'République dominicaine', tag: 'Visite guidée', topoId: '214',
      start: { center: [-70.2, 21.6], zoom: 4.8 },
      stops: [
        { title: 'La République dominicaine vue du ciel', place: "Vue d'ensemble", pin: false,
          text: "Elle occupe les deux tiers est de l'île d'Hispaniola, qu'elle partage avec Haïti. En peu de distance, ce pays d'environ 48 700 km² réunit plages des Caraïbes, montagnes de plus de 3 000 mètres, lacs salés et forêts tropicales. Suivez le vol : neuf étapes pour la découvrir.",
          say: "Bienvenue en République dominicaine ! Regardez cette île d'Hispaniola vue d'en haut : le pays en occupe les deux tiers est, le reste appartient à Haïti. Près de quarante-neuf mille kilomètres carrés, et pourtant on y trouve tout ! Des plages de rêve, des montagnes qui dépassent trois mille mètres, des lacs salés, des forêts tropicales. Alors accrochez-vous : on décolle pour neuf étapes !",
          facts: [['Capitale', 'Saint-Domingue'], ['Langue', 'espagnol'], ['Habitants', '≈ 11 millions']],
          center: [-70.25, 18.95], zoom: 7.2, pitch: 35, bearing: 15, orbit: 25, fly: 6500 },
        { title: 'Saint-Domingue, la Zone coloniale', place: 'Côte sud', pin: true,
          text: "Fondée en 1496 par Bartolomé Colomb, Saint-Domingue est la plus ancienne ville européenne permanente des Amériques. Sa Zone coloniale, inscrite à l'UNESCO depuis 1990, aligne rues pavées, forteresses, la première cathédrale et les premiers hôpitaux et couvents du Nouveau Monde.",
          say: "Première escale : Saint-Domingue ! Fondée en quatorze cent quatre-vingt-seize par Bartolomé Colomb, c'est la plus ancienne ville européenne des Amériques. Posons-nous au sol, en plein cœur de la Zone coloniale, classée à l'UNESCO depuis mille neuf cent quatre-vingt-dix. Imaginez la Calle El Conde, sa grande rue piétonne, ses terrasses, ses boutiques, ses façades colorées. Quelques pas plus loin, la Calle Las Damas, puis la cathédrale primada, la première cathédrale des Amériques. Ici, c'est l'histoire du Nouveau Monde qui se raconte, pierre après pierre.",
          facts: [['Fondée en', '1496'], ['UNESCO depuis', '1990']],
          photos: [
            { f: 'File:Calle El Conde CCSD 03 2019 5088.jpg', cap: 'Calle El Conde, la grande rue piétonne de la Zone coloniale' },
            { f: 'File:DOM Santo Domingo, Ciudad Colonial, Calle El Conde 0037.jpg', cap: 'Les boutiques de la Calle El Conde' },
            { f: 'File:Calle las Damas, Santo Domingo, Zona Colonial.jpg', cap: 'Calle Las Damas, rue historique de la Zone coloniale' },
            { f: 'File:Catedral Primada CCSD 09 2018 1234.jpg', cap: "La cathédrale primada de América" }],
          street: { lat: 18.47299, lng: -69.88391, heading: 270, label: 'Parque Colón, au bout de la Calle El Conde' },
          center: [-69.883, 18.473], zoom: 14.2, pitch: 62, bearing: -25, orbit: 55, fly: 8500 },
        { title: "L'île Saona", place: 'Parc national de l’Est', pin: true,
          text: "Au sud-est, l'île Saona fait partie du parc national de l'Est. Plages de sable blanc, palmiers, eaux turquoise et mangroves y sont protégées. On l'atteint en bateau, depuis le village de Bayahibe.",
          say: "Cap sur le sud-est, direction l'île Saona ! Ici, tout est protégé : c'est le parc national de l'Est. Du sable blanc, des palmiers qui se penchent sur l'eau, des eaux turquoise, des mangroves... On y arrive en bateau, depuis le petit village de Bayahibe. Imaginez : les pieds dans l'eau chaude, et rien d'autre à faire que profiter !",
          facts: [['Protection', 'parc national'], ['Accès', 'bateau depuis Bayahibe']],
          photos: [
            { f: 'File:SAONA PLAYA.jpg', cap: "Plage de l'île Saona" },
            { f: 'File:Saona Island Beach.jpg', cap: 'Sable blanc et eaux turquoise' },
            { f: 'File:Saona Beach (60473824).jpeg', cap: 'Palmiers au bord de la plage' }],
          center: [-68.7, 18.15], zoom: 11.3, pitch: 58, bearing: 35, orbit: 50, fly: 8000 },
        { title: 'Punta Cana', place: 'Côte est', pin: true,
          text: "Sur la côte est, Punta Cana aligne des dizaines de kilomètres de plages bordées de cocotiers, entre mer des Caraïbes et océan Atlantique. C'est la première destination touristique du pays, avec son propre aéroport international.",
          say: "Et voici Punta Cana, sur la côte est ! Des dizaines de kilomètres de plages bordées de cocotiers, la mer des Caraïbes d'un côté, l'océan Atlantique de l'autre. C'est la première destination touristique du pays, avec son propre aéroport international. Regardez ces eaux turquoise, ce sable clair : ça donne envie de poser ses valises, non ?",
          facts: [['Plages', 'sable blanc, cocotiers'], ['Aéroport', 'international']],
          photos: [
            { f: 'File:Playa Bavaro 142.jpg', cap: 'La plage de Bávaro' },
            { f: 'File:Bavaro Beach 045.jpg', cap: 'Cocotiers et paillotes à Bávaro' },
            { f: 'File:2024 - Bávaro Beach - 44.jpg', cap: 'Les eaux turquoise de Bávaro' }],
          street: { lat: 18.56, lng: -68.372, heading: 0, label: 'Punta Cana' },
          center: [-68.4, 18.57], zoom: 12.1, pitch: 60, bearing: -40, orbit: -55, fly: 7500 },
        { title: 'La péninsule de Samaná', place: 'Nord-est', pin: true,
          text: "Au nord-est, la péninsule de Samaná est couverte de collines, de cocoteraies et de cascades comme le Salto El Limón. De janvier à mars, de nombreuses baleines à bosse viennent se reproduire dans sa baie.",
          say: "Direction le nord-est, la péninsule de Samaná ! Des collines vertes, des cocoteraies, des cascades comme le Salto El Limón, que l'on rejoint à cheval ou à pied par un sentier. Et de janvier à mars, c'est le grand spectacle : de nombreuses baleines à bosse viennent se reproduire dans la baie de Samaná !",
          facts: [['Baleines à bosse', 'janvier – mars'], ['Cascade', 'Salto El Limón']],
          photos: [
            { f: 'File:El Limon.JPG', cap: 'La cascade du Salto El Limón' },
            { f: 'File:Salto el Limón (14503942108).jpg', cap: 'Sur le sentier du Salto El Limón' },
            { f: 'File:DOM Las Terrenas, Playa Las Terrenas 0054.jpg', cap: 'La plage de Las Terrenas' }],
          street: { lat: 19.20284, lng: -69.33548, heading: 0, label: 'Le Malecón de Samaná' },
          center: [-69.45, 19.22], zoom: 10.4, pitch: 58, bearing: 20, orbit: 55, fly: 8000 },
        { title: 'Cabarete et la côte nord', place: 'Puerto Plata', pin: true,
          text: "Sur la côte nord, le vent régulier fait de Cabarete l'une des capitales mondiales du kitesurf. Plus à l'ouest, un téléphérique mène de Puerto Plata au mont Isabel de Torres, à environ 800 mètres, pour une vue sur toute la baie.",
          say: "Sur la côte nord, voici Cabarete ! Le vent y est régulier, ce qui en fait l'une des capitales mondiales du kitesurf et de la planche à voile. Les planches alignées sur le sable, l'ambiance décontractée... Et un peu plus à l'ouest, un téléphérique monte de Puerto Plata jusqu'au mont Isabel de Torres, à environ huit cents mètres, pour une vue superbe sur toute la baie.",
          facts: [['Sport', 'kitesurf, planche à voile'], ['Isabel de Torres', '≈ 800 m']],
          photos: [
            { f: 'File:The Surfboards (8422914814).jpg', cap: 'Planches de surf à Cabarete' },
            { f: 'File:Cabarete, Dominican Republic (8644953576).jpg', cap: 'La plage de Cabarete' },
            { f: 'File:Доминиканская Республика - panoramio (4).jpg', cap: 'Une paillote sur la plage de la côte nord' }],
          street: { lat: 19.7519, lng: -70.4103, heading: 0, label: 'Cabarete' },
          center: [-70.41, 19.755], zoom: 12.3, pitch: 62, bearing: 150, orbit: -50, fly: 8000 },
        { title: 'Le pic Duarte', place: 'Cordillère centrale', pin: true,
          text: "Au cœur du pays, la Cordillère centrale culmine au pic Duarte, à 3 098 mètres : le plus haut sommet des Caraïbes. Forêts de pins, cascades et vallées fraîches y contrastent avec la chaleur du littoral, autour de Jarabacoa et de Constanza.",
          say: "On grimpe maintenant au cœur du pays, dans la Cordillère centrale ! Voici le pic Duarte : trois mille quatre-vingt-dix-huit mètres, le plus haut sommet des Caraïbes ! Ici, des forêts de pins, des cascades, des vallées fraîches, autour de Jarabacoa et de Constanza. Un tout autre visage de la République dominicaine : l'air frais de la montagne, à deux pas de la chaleur du littoral.",
          facts: [['Altitude', '3 098 m'], ['Record', 'plus haut sommet des Caraïbes']],
          photos: [
            { f: 'File:Pinus occidentalis on Pico Duarte.jpg', cap: 'Pins sur les pentes du pic Duarte' },
            { f: 'File:Compartición 2010 - panoramio.jpg', cap: 'La forêt de pins de Compartición, sur le sentier du pic Duarte' },
            { f: 'File:Celestus marcanoi habitat.jpg', cap: 'Paysage de montagne dans la Cordillère centrale' }],
          center: [-70.9986, 19.0236], zoom: 10.3, pitch: 62, bearing: 200, orbit: 60, fly: 8500 },
        { title: 'Le lac Enriquillo', place: 'Sud-ouest', pin: true,
          text: "Dans le sud-ouest, le lac Enriquillo est un lac salé situé sous le niveau de la mer : le point le plus bas des Caraïbes. Il abrite des crocodiles américains, des flamants roses et l'île Cabritos, au milieu d'un paysage semi-désertique.",
          say: "Dernière grande escale, dans le sud-ouest : le lac Enriquillo ! Un lac salé situé sous le niveau de la mer, à environ quarante mètres en dessous : c'est le point le plus bas des Caraïbes ! Sur l'île Cabritos, au milieu du lac, vivent des crocodiles américains, des iguanes et des flamants roses, dans un paysage presque désertique. Un monde à part.",
          facts: [['Altitude', '≈ −40 m'], ['Faune', 'crocodiles, flamants']],
          photos: [
            { f: 'File:Lago Enriquillo.jpg', cap: 'Le lac Enriquillo en fin de journée' },
            { f: 'File:Mirador Lago Enriquillo.jpg', cap: 'Le mirador du lac Enriquillo' },
            { f: 'File:Cabritos 2011 12 13Feb 221.JPG', cap: "Un iguane sur l'île Cabritos" }],
          center: [-71.58, 18.47], zoom: 10.2, pitch: 56, bearing: 60, orbit: 55, fly: 8000 },
        { title: 'Fin de la visite', place: "Vue d'ensemble", pin: false,
          text: "Du littoral aux sommets, on passe de la mer des Caraïbes à plus de 3 000 mètres d'altitude en quelques heures de route. Vous pouvez maintenant explorer la carte librement, rejouer la visite ou revenir au globe.",
          say: "Et voilà, notre vol touche à sa fin ! En quelques minutes, nous sommes passés de la mer des Caraïbes à plus de trois mille mètres d'altitude, des ruelles coloniales aux plages et aux lacs salés. Vous pouvez maintenant explorer la carte librement, rejouer la visite, ou revenir au globe. Merci d'avoir voyagé avec nous !",
          facts: [],
          center: [-70.25, 18.95], zoom: 7.4, pitch: 22, bearing: 0, orbit: 0, fly: 8000, dwell: 9000 },
      ],
    },
  };

  const ICON = {
    back: '<path d="m15 18-6-6 6-6"/>', next: '<path d="m9 18 6-6-6-6"/>',
    play: '<polygon points="7 4 20 12 7 20 7 4" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none"/>',
    volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/>',
    mute: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>',
    replay: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    street: '<circle cx="12" cy="5" r="2"/><path d="m9 22 1-7-2-3 4-3 4 3-2 3 1 7"/><path d="M5 12l4-3"/><path d="M19 12l-4-3"/>',
    ext: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  };
  const svg = (name, size = 18) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const pad = (n) => String(n).padStart(2, '0');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  // ---------- Chargement de MapLibre (à la demande) ----------
  let mlPromise = null;
  function loadMapLibre() {
    if (window.maplibregl) return Promise.resolve();
    if (mlPromise) return mlPromise;
    const fail = (rej) => () => { mlPromise = null; rej(new Error('maplibre')); };
    return (mlPromise = new Promise((res, rej) => {
      // on attend la feuille de style ET le script : la carte mesure son conteneur à sa création
      let n = 0; const one = () => { if (++n === 2) res(); };
      const css = el('link'); css.rel = 'stylesheet'; css.href = MAPLIBRE + '.css'; css.onload = one; css.onerror = fail(rej); document.head.append(css);
      const s = el('script'); s.src = MAPLIBRE + '.js'; s.onload = one; s.onerror = fail(rej); document.head.append(s);
    }));
  }

  // ---------- Contour du pays (topologie 50 m décodée à la main) ----------
  const boundaryCache = {};
  async function loadBoundary(id) {
    if (boundaryCache[id]) return boundaryCache[id];
    const topo = await (await fetch(TOPO)).json();
    const geom = topo.objects.countries.geometries.find((g) => String(g.id) === id);
    if (!geom) throw new Error('pays introuvable');
    const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
    const arcs = topo.arcs.map((a) => { let x = 0, y = 0; return a.map((p) => { x += p[0]; y += p[1]; return [x * sx + tx, y * sy + ty]; }); });
    const ring = (idx) => { const pts = []; for (const i of idx) { const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i]; for (let k = pts.length ? 1 : 0; k < a.length; k++) pts.push(a[k]); } return pts; };
    const polys = (geom.type === 'Polygon' ? [geom.arcs] : geom.arcs).map((p) => p.map(ring));
    return (boundaryCache[id] = polys);
  }

  // ---------- Photos réelles (Wikimedia Commons) : miniatures 1280 px, auteur et licence ----------
  const plain = (html) => { try { return (new DOMParser().parseFromString(String(html || ''), 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim(); } catch (e) { return ''; } };
  async function loadPhotos(tour) {
    if (tour._photos) return tour._photos;
    const titles = [...new Set(tour.stops.flatMap((s) => (s.photos || []).map((p) => p.f)))];
    const info = {};
    for (let i = 0; i < titles.length; i += 40) {
      const u = `${COMMONS}?action=query&titles=${encodeURIComponent(titles.slice(i, i + 40).join('|'))}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1280&format=json&formatversion=2&origin=*`;
      const j = await (await fetch(u)).json();
      const norm = {}; (j.query.normalized || []).forEach((n) => { norm[n.from] = n.to; });
      (j.query.pages || []).forEach((p) => { const ii = p.imageinfo && p.imageinfo[0]; if (ii) info[p.title] = ii; });
      titles.slice(i, i + 40).forEach((t) => { const ii = info[norm[t] || t]; if (ii) info[t] = ii; });
    }
    tour.stops.forEach((s) => {
      s.shots = (s.photos || []).map((p) => {
        const ii = info[p.f]; if (!ii || !/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(ii.thumburl || '')) return null;
        const m = ii.extmetadata || {}, page = /^https:\/\/commons\.wikimedia\.org\//.test(ii.descriptionurl || '') ? ii.descriptionurl : null;
        return { url: ii.thumburl, page, cap: p.cap, by: plain(m.Artist && m.Artist.value) || 'Auteur inconnu', lic: plain(m.LicenseShortName && m.LicenseShortName.value) || 'Licence libre' };
      }).filter(Boolean);
    });
    return (tour._photos = true);
  }

  // ---------- Voix : choix de la meilleure voix française, rythme vivant, réglages ----------
  const canSpeak = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const frVoices = () => (canSpeak ? speechSynthesis.getVoices().filter((v) => /^fr/i.test(v.lang)) : []);
  // les voix « naturelles » (Edge, Chrome, macOS premium) sont bien plus expressives que les voix locales de base
  const voiceScore = (v) => {
    let s = 0; const n = v.name;
    if (/natural|neural|online/i.test(n)) s += 100;
    if (/google/i.test(n)) s += 60;
    if (/premium|enhanced|améliorée|siri/i.test(n)) s += 55;
    if (/denise|henri|eloise|vivienne|remy|brigitte|thomas|amélie|audrey|aurélie|marie|julie/i.test(n)) s += 20;
    if (/^fr[-_]FR/i.test(v.lang)) s += 10;
    if (v.localService === false) s += 5;
    return s;
  };
  const rankedVoices = () => frVoices().sort((a, b) => voiceScore(b) - voiceScore(a));
  const sentencesOf = (t) => (t.match(/[^.!?…]+[.!?…]+["»)]*\s*|[^.!?…]+$/g) || [t]).map((s) => s.trim()).filter(Boolean);

  // ---------- Visite ----------
  let active = false, currentMap = null;

  async function start(code, opts = {}) {
    const tour = TOURS[code];
    if (!tour || active) return;
    active = true;
    document.body.classList.add('immersed');

    const stops = tour.stops, last = stops.length - 1;
    let map = null, cur = -1, seq = 0, playing = true, finished = false, timer = null, began = false;
    let voiceOn = canSpeak && store.get('veille.voiceOn', true), rate = store.get('veille.rate', 1.08), voiceName = store.get('veille.voice', null);
    let speechToken = 0, gapTimer = null, photoTimer = null, photoIdx = 0;
    const markers = [];

    // ----- interface
    const root = el('div', 'imm'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', `${tour.tag} — ${tour.name}`);
    const mapEl = el('div', 'imm-map');
    const top = el('div', 'imm-top');
    const back = el('button', 'imm-back', `${svg('back')}<span>Quitter la visite</span>`); back.type = 'button';
    top.append(back, el('div', 'imm-tag', `<i></i>${esc(tour.tag)} · ${esc(tour.name)}`));
    const card = el('div', 'imm-card'); card.setAttribute('aria-live', 'polite');
    const step = el('div', 'imm-step'), title = el('h3'), text = el('p'), facts = el('ul', 'imm-facts');
    const prog = el('div', 'imm-prog'); const segs = stops.map((s, i) => { const b = el('button', null, '<i></i>'); b.type = 'button'; b.title = `${i + 1}. ${s.title}`; b.setAttribute('aria-label', `Étape ${i + 1} : ${s.title}`); b.onclick = () => goTo(i); prog.append(b); return b; });
    const ctl = el('div', 'imm-ctl');
    const bPrev = el('button', 'imm-btn', svg('back')); bPrev.type = 'button'; bPrev.title = 'Étape précédente (←)'; bPrev.setAttribute('aria-label', 'Étape précédente');
    const bPlay = el('button', 'imm-btn main'); bPlay.type = 'button';
    const bNext = el('button', 'imm-btn', svg('next')); bNext.type = 'button'; bNext.title = 'Étape suivante (→)'; bNext.setAttribute('aria-label', 'Étape suivante');
    const bStreet = el('a', 'imm-btn street'); bStreet.target = '_blank'; bStreet.rel = 'noopener noreferrer'; bStreet.style.display = 'none';
    const bSet = el('button', 'imm-btn', svg('sliders')); bSet.type = 'button'; bSet.title = 'Réglages de la voix'; bSet.setAttribute('aria-label', 'Réglages de la voix'); bSet.setAttribute('aria-expanded', 'false');
    const bVoice = el('button', 'imm-btn', svg('mute')); bVoice.type = 'button'; bVoice.title = 'Narration vocale (V)';
    ctl.append(bPrev, bPlay, bNext, el('span', 'sp'), bStreet);
    if (canSpeak) ctl.append(bSet, bVoice);
    const hint = el('div', 'imm-hint', 'Glissez pour explorer · molette pour zoomer · Espace : pause · Échap : quitter');

    // réglages de la voix
    const pop = el('div', 'imm-pop'); pop.hidden = true;
    const selVoice = el('select'); selVoice.setAttribute('aria-label', 'Voix');
    const rngRate = el('input'); rngRate.type = 'range'; rngRate.min = '.9'; rngRate.max = '1.35'; rngRate.step = '.05'; rngRate.setAttribute('aria-label', 'Rythme de la voix');
    const rateOut = el('output'); const bTest = el('button', 'imm-btn small', 'Écouter un extrait'); bTest.type = 'button';
    pop.append(el('label', null, 'Voix'), selVoice, el('label', null, 'Rythme'), el('div', 'row'), bTest);
    pop.querySelector('.row').append(rngRate, rateOut);
    card.append(step, title, text, facts, prog, ctl, hint, pop);

    // photos réelles du lieu
    const photo = el('div', 'imm-photo'); photo.hidden = true;
    const phLink = el('a', 'ph-img'); phLink.target = '_blank'; phLink.rel = 'noopener noreferrer';
    const phImg = el('img'); phImg.alt = ''; phImg.decoding = 'async'; phLink.append(phImg);
    const phCap = el('div', 'ph-cap'), phBy = el('div', 'ph-by'), phDots = el('div', 'ph-dots');
    photo.append(phLink, phCap, phBy, phDots);

    const intro = el('div', 'imm-intro', `<span>${esc(tour.tag)}</span><h2>${esc(tour.name)}</h2>`);
    const load = el('div', 'imm-load', '<div class="bar"></div><div class="msg">Chargement de l’imagerie satellite</div>');
    root.append(mapEl, top, load);
    document.body.append(root);
    back.focus({ preventScroll: true });

    const setLoad = (msg, err) => { load.querySelector('.msg').textContent = msg; load.classList.toggle('err', !!err); };
    const fail = (msg) => {
      setLoad(msg, true);
      const b = el('button', 'imm-btn main', 'Retour au globe'); b.type = 'button'; b.onclick = quit; load.append(b);
    };

    // les photos se chargent en parallèle de la carte ; une panne ne bloque jamais la visite
    const photosReady = loadPhotos(tour).catch(() => {});

    // ----- voix
    const stopSpeech = () => { speechToken++; if (gapTimer) { clearTimeout(gapTimer); gapTimer = null; } if (canSpeak) try { speechSynthesis.cancel(); } catch (e) {} };
    const pickVoice = () => { const l = rankedVoices(); return (voiceName && l.find((v) => v.name === voiceName)) || l[0] || null; };
    // phrase par phrase : on varie le rythme et la hauteur (exclamations, questions, accroche) et on respire entre les phrases
    function speak(textToSay, onEnd, onBlocked) {
      stopSpeech();
      const my = speechToken, parts = sentencesOf(textToSay), v = pickVoice(); let i = 0;
      const next = () => {
        if (my !== speechToken) return;
        if (i >= parts.length) return onEnd && onEnd();
        const p = parts[i], excl = /!/.test(p), ques = /\?/.test(p), first = i === 0, u = new SpeechSynthesisUtterance(p);
        u.lang = v ? v.lang : 'fr-FR'; if (v) u.voice = v;
        u.rate = Math.max(.7, Math.min(1.6, rate * (excl ? 1.04 : 1) * (first ? 1.03 : 1)));
        u.pitch = Math.max(.6, Math.min(1.8, 1.04 + (excl ? .14 : 0) + (ques ? .1 : 0) + (first ? .06 : 0) + (i % 2 ? -.02 : .03)));
        u.onend = () => { if (my !== speechToken) return; i++; gapTimer = setTimeout(next, excl || ques ? 150 : 260); };
        u.onerror = (e) => {
          if (my !== speechToken) return;
          if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
          if (e && e.error === 'not-allowed') return onBlocked && onBlocked(); // le navigateur refuse de parler sans geste de l'utilisateur
          i++; next();
        };
        try { speechSynthesis.speak(u); } catch (e) { onBlocked && onBlocked(); }
      };
      next();
    }
    const estSpeechMs = (t) => Math.round((t.length * 64 / rate) + sentencesOf(t).length * 260 + 800);

    function fillVoiceList() {
      const list = rankedVoices(), cur = pickVoice();
      selVoice.innerHTML = '';
      if (!list.length) { selVoice.append(new Option('Aucune voix française trouvée', '')); selVoice.disabled = true; return; }
      selVoice.disabled = false;
      list.forEach((v, i) => selVoice.append(new Option(`${v.name}${i === 0 ? ' · recommandée' : ''}`, v.name)));
      if (cur) selVoice.value = cur.name;
    }
    if (canSpeak) { fillVoiceList(); speechSynthesis.onvoiceschanged = fillVoiceList; }
    rngRate.value = String(rate); rateOut.textContent = `× ${rate.toFixed(2).replace('.', ',')}`;
    selVoice.onchange = () => { voiceName = selVoice.value || null; store.set('veille.voice', voiceName); };
    rngRate.oninput = () => { rate = +rngRate.value; rateOut.textContent = `× ${rate.toFixed(2).replace('.', ',')}`; store.set('veille.rate', rate); };
    bTest.onclick = () => speak("Voici le ton de la visite. Prêt à décoller ?", null, null);
    bSet.onclick = () => { pop.hidden = !pop.hidden; bSet.setAttribute('aria-expanded', String(!pop.hidden)); bSet.classList.toggle('on', !pop.hidden); };

    // ----- photos
    function hidePhotos() { if (photoTimer) { clearInterval(photoTimer); photoTimer = null; } photo.classList.remove('show'); photo.hidden = true; }
    function showPhoto(s, i) {
      const p = s.shots[i]; photoIdx = i;
      phImg.classList.remove('in');
      const done = () => { phImg.classList.add('in'); };
      setTimeout(() => {
        phImg.onload = done; phImg.onerror = done; phImg.src = p.url; if (phImg.complete) done();
        phLink.href = p.page || '#'; phLink.title = 'Voir la photo sur Wikimedia Commons';
        phCap.textContent = p.cap; phBy.textContent = `Photo : ${p.by} · ${p.lic} · Wikimedia Commons`;
        [...phDots.children].forEach((d, k) => d.classList.toggle('on', k === i));
      }, 160);
    }
    function showPhotos(s, totalMs) {
      hidePhotos();
      const shots = s.shots || []; if (!shots.length) return;
      phDots.innerHTML = shots.map(() => '<i></i>').join('');
      photo.hidden = false; void photo.offsetWidth; photo.classList.add('show');
      showPhoto(s, 0);
      shots.forEach((p) => { const im = new Image(); im.src = p.url; }); // préchargement
      if (shots.length > 1) {
        const every = Math.max(4500, Math.round(totalMs / shots.length));
        photoTimer = setInterval(() => showPhoto(s, (photoIdx + 1) % shots.length), every);
      }
    }

    // ----- affichage de l'étape courante
    function renderCard() {
      const s = stops[cur];
      step.innerHTML = `<span><b>${pad(cur + 1)}</b> / ${pad(stops.length)} · ${esc(s.place)}</span><span>${Math.abs(s.center[1]).toFixed(2)}° N · ${Math.abs(s.center[0]).toFixed(2)}° O</span>`;
      title.textContent = s.title; text.textContent = s.text;
      facts.innerHTML = s.facts.map(([k, v]) => `<li><b>${esc(k)}</b> ${esc(v)}</li>`).join('');
      facts.style.display = s.facts.length ? '' : 'none';
      segs.forEach((b, i) => { b.classList.toggle('done', i < cur); b.classList.remove('on'); });
      markers.forEach((m) => m.el.classList.toggle('on', m.i === cur));
      bPrev.disabled = cur === 0; bPrev.style.opacity = cur === 0 ? .4 : 1;
      bNext.disabled = cur === last; bNext.style.opacity = cur === last ? .4 : 1;
      if (s.street) {
        bStreet.href = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${s.street.lat},${s.street.lng}&heading=${s.street.heading || 0}&pitch=0&fov=100`;
        bStreet.innerHTML = `${svg('street')}<span>Dans la rue</span>${svg('ext', 14)}`;
        bStreet.title = `Marcher dans la rue avec Google Street View (${s.street.label}) — s'ouvre dans un nouvel onglet`;
        bStreet.setAttribute('aria-label', bStreet.title); bStreet.style.display = '';
      } else bStreet.style.display = 'none';
      renderPlay();
    }
    function renderPlay() {
      bPlay.innerHTML = finished ? `${svg('replay')}<span>Rejouer</span>` : playing ? `${svg('pause')}<span>Pause</span>` : `${svg('play')}<span>Lecture</span>`;
      bPlay.setAttribute('aria-label', finished ? 'Rejouer la visite' : playing ? 'Mettre la visite en pause' : 'Reprendre la visite');
      root.classList.toggle('paused', !playing);
      bVoice.innerHTML = svg(voiceOn ? 'volume' : 'mute'); bVoice.classList.toggle('on', voiceOn);
      bVoice.setAttribute('aria-label', voiceOn ? 'Couper la narration vocale' : 'Activer la narration vocale');
    }
    const startFill = (ms) => {
      const b = segs[cur]; b.classList.remove('on'); void b.offsetWidth; b.style.setProperty('--d', ms + 'ms'); b.classList.add('on');
    };

    // ----- déroulé : vol vers l'étape, puis tour lent autour du lieu pendant la narration et les photos
    const cam = (s) => ({ center: s.center, zoom: s.zoom, pitch: s.pitch, bearing: s.bearing });
    const clearTimer = () => { if (timer) { clearTimeout(timer); timer = null; } };

    function goTo(i) {
      if (!map) return;
      cur = Math.max(0, Math.min(last, i)); finished = false; clearTimer(); stopSpeech(); hidePhotos();
      const my = ++seq, s = stops[cur];
      renderCard();
      // la narration ne démarre que lorsque l'imagerie du lieu est affichée (au plus 5 s d'attente, pour ne jamais bloquer la visite)
      let started = false;
      const begin = () => { if (started || my !== seq) return; started = true; dwell(my); };
      const arrived = () => {
        if (my !== seq) return;
        if (map.areTilesLoaded()) return begin();
        map.once('idle', begin); setTimeout(begin, 5000);
      };
      if (REDUCED) { map.jumpTo(cam(s)); arrived(); }
      else { map.flyTo({ ...cam(s), duration: s.fly || 7000, curve: 1.5, essential: true }); map.once('moveend', arrived); }
    }
    function dwell(my) {
      if (!playing || my !== seq) return;
      const s = stops[cur], talk = voiceOn && s.say;
      // avec la voix, tout (orbite, photos, barre de progression) se cale sur la durée estimée de la lecture
      const ms = s.dwell && !talk ? s.dwell : talk ? Math.min(60000, estSpeechMs(s.say)) : Math.min(19000, Math.max(9000, s.text.length * 52));
      if (!REDUCED && s.orbit) map.easeTo({ bearing: s.bearing + s.orbit, duration: ms, easing: (t) => t, essential: true }); // l'orbite est lente et continue
      startFill(ms); showPhotos(s, ms);
      const next = () => { if (my !== seq || !playing) return; cur < last ? goTo(cur + 1) : finish(); };
      if (talk) {
        const done = () => { clearTimer(); timer = setTimeout(next, 900); }; // petite respiration avant de repartir
        speak(s.say, done, () => { voiceOn = false; renderPlay(); clearTimer(); timer = setTimeout(next, ms); });
        timer = setTimeout(next, ms * 1.8 + 5000); // filet de sécurité si la voix se bloque
      } else timer = setTimeout(next, ms);
    }
    function finish() { playing = false; finished = true; clearTimer(); stopSpeech(); renderPlay(); }
    function pause() { playing = false; seq++; clearTimer(); stopSpeech(); if (map) map.stop(); renderPlay(); }
    function togglePlay() {
      if (finished) { playing = true; goTo(0); return; }
      if (playing) pause(); else { playing = true; goTo(cur); }
    }
    function toggleVoice() {
      voiceOn = !voiceOn; store.set('veille.voiceOn', voiceOn); renderPlay();
      stopSpeech();
      if (playing && cur >= 0 && !finished) { clearTimer(); setTimeout(() => dwell(seq), 120); }
    }

    bPlay.onclick = togglePlay; bNext.onclick = () => goTo(cur + 1); bPrev.onclick = () => goTo(cur - 1); bVoice.onclick = toggleVoice; back.onclick = quit;

    const onKey = (e) => {
      e.stopPropagation(); // le globe et la page n'écoutent plus le clavier pendant la visite
      if (e.target && /^(BUTTON|SELECT|INPUT|A)$/.test(e.target.tagName) && (e.key === ' ' || e.key === 'Enter')) return;
      const h = { Escape: () => { if (!pop.hidden) { pop.hidden = true; bSet.setAttribute('aria-expanded', 'false'); } else quit(); }, ' ': togglePlay, ArrowRight: () => goTo(cur + 1), ArrowLeft: () => goTo(cur - 1), v: () => canSpeak && toggleVoice(), V: () => canSpeak && toggleVoice() }[e.key];
      if (h) { e.preventDefault(); h(); }
    };
    window.addEventListener('keydown', onKey, true);

    function quit() {
      if (!root.isConnected || root.classList.contains('out')) return;
      seq++; clearTimer(); stopSpeech(); hidePhotos(); window.removeEventListener('keydown', onKey, true);
      if (canSpeak) speechSynthesis.onvoiceschanged = null;
      root.classList.add('out');
      setTimeout(() => {
        try { markers.forEach((m) => m.mk.remove()); if (map) map.remove(); } catch (e) {}
        root.remove(); document.body.classList.remove('immersed'); active = false; currentMap = null;
        if (opts.onExit) opts.onExit();
      }, 320);
    }

    // ----- carte
    try { await loadMapLibre(); } catch (e) { return fail('Impossible de charger la carte 3D. Vérifiez la connexion.'); }
    if (!root.isConnected) return;
    const maplibregl = window.maplibregl;
    try {
      map = new maplibregl.Map({
        container: mapEl, center: tour.start.center, zoom: tour.start.zoom, pitch: 0, bearing: 0,
        minZoom: 3.5, maxZoom: 16.5, maxPitch: 80, attributionControl: false, fadeDuration: 200, pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        style: {
          version: 8,
          sources: {
            sat: { type: 'raster', tiles: [SAT], tileSize: 256, maxzoom: 18, attribution: 'Imagerie © Esri, Maxar, Earthstar Geographics' },
            dem: { type: 'raster-dem', tiles: [DEM], encoding: 'terrarium', tileSize: 256, maxzoom: 13, attribution: 'Relief © Mapzen, AWS Terrain Tiles' },
            demhs: { type: 'raster-dem', tiles: [DEM], encoding: 'terrarium', tileSize: 256, maxzoom: 13 },
          },
          layers: [
            { id: 'bg', type: 'background', paint: { 'background-color': '#020617' } },
            { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-saturation': .18, 'raster-contrast': .06, 'raster-brightness-min': .07, 'raster-brightness-max': 1 } },
            { id: 'hs', type: 'hillshade', source: 'demhs', paint: { 'hillshade-exaggeration': .32, 'hillshade-shadow-color': 'rgba(0,0,0,.45)', 'hillshade-highlight-color': 'rgba(255,255,255,.2)', 'hillshade-accent-color': 'rgba(0,0,0,.12)' } },
          ],
        },
      });
    } catch (e) { return fail('Votre navigateur ne gère pas la carte 3D (WebGL requis).'); }
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showZoom: false }), 'top-right');
    currentMap = map;
    // une tuile manquante ne doit pas interrompre la visite ; mais si AUCUNE image satellite n'arrive, on le dit clairement
    let satOk = 0, satErr = 0;
    map.on('data', (e) => { if (e.sourceId === 'sat' && e.tile) satOk++; });
    map.on('error', (e) => { if (e && e.sourceId === 'sat') satErr++; });
    setTimeout(() => {
      if (!root.isConnected || satOk > 0 || !satErr) return;
      root.append(el('div', 'imm-warn', "L'imagerie satellite n'a pas pu être chargée. Vérifiez la connexion, un bloqueur de contenu ou un pare-feu qui bloquerait server.arcgisonline.com."));
    }, 10000);

    // l'utilisateur prend la main : la visite se met en pause
    // (MapLibre émet aussi ces événements pour nos propres vols : seul un geste réel, qui porte un originalEvent, compte)
    const userPause = (e) => { if (e && e.originalEvent && playing && cur >= 0) pause(); };
    ['dragstart', 'rotatestart', 'pitchstart', 'zoomstart'].forEach((ev) => map.on(ev, userPause));

    map.on('load', () => {
      try { map.setTerrain({ source: 'dem', exaggeration: 1.5 }); } catch (e) {}
      // sans cela, avec le relief activé, MapLibre rappelle la caméra vers le sol pendant les vols (le zoom et l'inclinaison restent bloqués)
      if (map.setCenterClampedToGround) map.setCenterClampedToGround(false);
      try { if (map.setSky) map.setSky({ 'sky-color': '#4f86c6', 'sky-horizon-blend': .6, 'horizon-color': '#d6e4f3', 'horizon-fog-blend': .7, 'fog-color': '#c3d4e8', 'fog-ground-blend': .25, 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 11, 0] }); } catch (e) {}
      // repères numérotés
      stops.forEach((s, i) => {
        if (!s.pin) return;
        const pin = el('div', 'imm-pin', `${i}<span class="l">${esc(s.title)}</span>`); pin.setAttribute('role', 'button'); pin.setAttribute('aria-label', `Aller à l'étape ${i + 1} : ${s.title}`); pin.tabIndex = 0;
        pin.onclick = (ev) => { ev.stopPropagation(); goTo(i); };
        pin.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.stopPropagation(); goTo(i); } };
        markers.push({ i, el: pin, mk: new maplibregl.Marker({ element: pin, anchor: 'center' }).setLngLat(s.center).addTo(map) });
      });
      // contour du pays et assombrissement du reste du monde, visibles de loin seulement
      loadBoundary(tour.topoId).then((polys) => {
        if (!map) return;
        const box = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
        map.addSource('mask', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [box, ...polys.map((p) => p[0])] } } });
        map.addLayer({ id: 'mask', type: 'fill', source: 'mask', paint: { 'fill-color': '#020617', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 5, .6, 8, .4, 9.8, 0] } });
        map.addSource('border', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'MultiLineString', coordinates: polys.flatMap((p) => p) } } });
        map.addLayer({ id: 'border', type: 'line', source: 'border', paint: { 'line-color': '#ff4e00', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.5, 9, 2.6], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 5, .95, 10.5, 0] } });
      }).catch(() => {});
      // quand l'imagerie de départ est affichée, on lève l'écran de chargement et on décolle
      const go = async () => {
        if (began || !root.isConnected) return; began = true;
        load.classList.add('hide'); setTimeout(() => load.remove(), 600);
        if (!REDUCED) { root.append(intro); setTimeout(() => intro.remove(), 3500); }
        root.append(card, photo);
        await Promise.race([photosReady, new Promise((r) => setTimeout(r, 2500))]); // les photos sont en général prêtes depuis longtemps
        playing = !REDUCED; // pas de lecture automatique si l'utilisateur réduit les animations
        setTimeout(() => goTo(0), REDUCED ? 0 : 1500);
      };
      map.once('idle', go); setTimeout(go, 9000);
    });
  }

  window.Immersion = { has: (code) => !!TOURS[code], start, map: () => currentMap }; // map() : utile pour diagnostiquer
})();
