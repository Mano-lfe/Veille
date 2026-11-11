// Immersion : visite guidée d'un pays (imagerie satellite + relief 3D + photos réelles + narration vocale)
// Chargé à la demande quand on clique sur un pays qui possède une visite. Pour en ajouter un : une entrée dans TOURS.
//   Imagerie : © Esri, Maxar, Earthstar Geographics (World Imagery) — Relief : Mapzen / AWS Terrain Tiles — Carte : MapLibre GL JS
//   Photos : Wikimedia Commons (licences libres, auteur et licence affichés sur chaque photo)
(() => {
  'use strict';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
  const TOPO = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';
  const MAPLIBRE = 'https://unpkg.com/maplibre-gl@5/dist/maplibre-gl';
  const COMMONS = 'https://commons.wikimedia.org/w/api.php';

  // ---------- Contenu des visites ----------
  // text  : texte affiché sur la carte de narration
  // say   : texte dit à voix haute pour une étape sans photos
  // intro : première partie dite à voix haute (pendant le vol) ; chaque photo a ensuite sa phrase (say), dite quand elle vient au centre
  // photos: fichiers Wikimedia Commons (f), légende (cap) et phrase de la voix (say)
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
          intro: "Première escale : Saint-Domingue ! Fondée en quatorze cent quatre-vingt-seize par Bartolomé Colomb, c'est la plus ancienne ville européenne des Amériques. Regardez : le fleuve Ozama, le port, et au cœur de la ville, la Zone coloniale, classée à l'UNESCO depuis mille neuf cent quatre-vingt-dix. Venez, descendons dans ses rues !",
          facts: [['Fondée en', '1496'], ['UNESCO depuis', '1990']],
          photos: [
            { f: 'File:Calle El Conde CCSD 03 2019 5088.jpg', cap: 'Calle El Conde, la grande rue piétonne de la Zone coloniale', say: "Voici la Calle El Conde, la grande rue piétonne de la Zone coloniale. Les terrasses, l'ambiance, les passants... c'est ici que bat le cœur du quartier." },
            { f: 'File:DOM Santo Domingo, Ciudad Colonial, Calle El Conde 0037.jpg', cap: 'Les boutiques de la Calle El Conde', say: "Un peu plus loin, ses boutiques et ses façades colorées, où l'on flâne de vitrine en vitrine." },
            { f: 'File:Calle las Damas, Santo Domingo, Zona Colonial.jpg', cap: 'Calle Las Damas, rue historique de la Zone coloniale', say: "Et voici la Calle Las Damas, l'une des plus anciennes rues du Nouveau Monde, bordée de maisons de pierre." },
            { f: 'File:Catedral Primada CCSD 09 2018 1234.jpg', cap: 'La cathédrale primada de América', say: "Enfin, la cathédrale primada de América : la première cathédrale des Amériques. Ici, l'histoire du Nouveau Monde s'est écrite, pierre après pierre." }],
          center: [-69.883, 18.473], zoom: 14.2, pitch: 62, bearing: -25, orbit: 55, fly: 8500 },
        { title: "L'île Saona", place: 'Parc national de l’Est', pin: true,
          text: "Au sud-est, l'île Saona fait partie du parc national de l'Est. Plages de sable blanc, palmiers, eaux turquoise et mangroves y sont protégées. On l'atteint en bateau, depuis le village de Bayahibe.",
          intro: "Cap sur le sud-est, direction l'île Saona ! Ici, tout est protégé : c'est le parc national de l'Est. On y arrive en bateau, depuis le petit village de Bayahibe. Venez, on pose pied à terre !",
          facts: [['Protection', 'parc national'], ['Accès', 'bateau depuis Bayahibe']],
          photos: [
            { f: 'File:SAONA PLAYA.jpg', cap: "Plage de l'île Saona", say: "Regardez cette plage : le sable clair, les palmiers qui se penchent sur l'eau, la mer turquoise." },
            { f: 'File:Saona Island Beach.jpg', cap: 'Sable blanc et eaux turquoise', say: "Des transats, une mer calme et chaude : le décor idéal pour ne rien faire !" },
            { f: 'File:Saona Beach (60473824).jpeg', cap: 'Palmiers au bord de la plage', say: "Et partout, des cocotiers à perte de vue. Une carte postale, sans aucune retouche !" }],
          center: [-68.7, 18.15], zoom: 11.3, pitch: 58, bearing: 35, orbit: 50, fly: 8000 },
        { title: 'Punta Cana', place: 'Côte est', pin: true,
          text: "Sur la côte est, Punta Cana aligne des dizaines de kilomètres de plages bordées de cocotiers, entre mer des Caraïbes et océan Atlantique. C'est la première destination touristique du pays, avec son propre aéroport international.",
          intro: "Et voici Punta Cana, sur la côte est ! Des dizaines de kilomètres de plages bordées de cocotiers, la mer des Caraïbes d'un côté, l'océan Atlantique de l'autre. C'est la première destination touristique du pays, avec son propre aéroport international.",
          facts: [['Plages', 'sable blanc, cocotiers'], ['Aéroport', 'international']],
          photos: [
            { f: 'File:Playa Bavaro 142.jpg', cap: 'La plage de Bávaro', say: "Sur la plage de Bávaro, on voit passer les voiliers qui partent en excursion en mer." },
            { f: 'File:Bavaro Beach 045.jpg', cap: 'Cocotiers et paillotes à Bávaro', say: "Des cocotiers, des paillotes, du sable fin : tout est fait pour la détente." },
            { f: 'File:2024 - Bávaro Beach - 44.jpg', cap: 'Les eaux turquoise de Bávaro', say: "Et cette eau turquoise... Ça donne envie de poser ses valises, non ?" }],
          center: [-68.4, 18.57], zoom: 12.1, pitch: 60, bearing: -40, orbit: -55, fly: 7500 },
        { title: 'La péninsule de Samaná', place: 'Nord-est', pin: true,
          text: "Au nord-est, la péninsule de Samaná est couverte de collines, de cocoteraies et de cascades comme le Salto El Limón. De janvier à mars, de nombreuses baleines à bosse viennent se reproduire dans sa baie.",
          intro: "Direction le nord-est, la péninsule de Samaná ! Des collines vertes, des cocoteraies et, de janvier à mars, de nombreuses baleines à bosse qui viennent se reproduire dans la baie !",
          facts: [['Baleines à bosse', 'janvier – mars'], ['Cascade', 'Salto El Limón']],
          photos: [
            { f: 'File:El Limon.JPG', cap: 'La cascade du Salto El Limón', say: "Voici la cascade du Salto El Limón, qui se jette dans un bassin au cœur de la forêt." },
            { f: 'File:Salto el Limón (14503942108).jpg', cap: 'Sur le sentier du Salto El Limón', say: "On y accède à cheval ou à pied, par un sentier qui traverse la végétation." },
            { f: 'File:DOM Las Terrenas, Playa Las Terrenas 0054.jpg', cap: 'La plage de Las Terrenas', say: "Et pour finir, la plage de Las Terrenas, avec ses barques de pêcheurs tirées sur le sable." }],
          center: [-69.45, 19.22], zoom: 10.4, pitch: 58, bearing: 20, orbit: 55, fly: 8000 },
        { title: 'Cabarete et la côte nord', place: 'Puerto Plata', pin: true,
          text: "Sur la côte nord, le vent régulier fait de Cabarete l'une des capitales mondiales du kitesurf. Plus à l'ouest, un téléphérique mène de Puerto Plata au mont Isabel de Torres, à environ 800 mètres, pour une vue sur toute la baie.",
          intro: "Sur la côte nord, voici Cabarete ! Le vent y est régulier, ce qui en fait l'une des capitales mondiales du kitesurf et de la planche à voile. Un peu plus à l'ouest, un téléphérique monte de Puerto Plata jusqu'au mont Isabel de Torres, à environ huit cents mètres.",
          facts: [['Sport', 'kitesurf, planche à voile'], ['Isabel de Torres', '≈ 800 m']],
          photos: [
            { f: 'File:The Surfboards (8422914814).jpg', cap: 'Planches de surf à Cabarete', say: "Des planches de surf alignées : ici, on vit au rythme du vent et des vagues." },
            { f: 'File:Cabarete, Dominican Republic (8644953576).jpg', cap: 'La plage de Cabarete', say: "La plage de Cabarete, avec ses palmiers et sa mer d'un bleu limpide." },
            { f: 'File:Доминиканская Республика - panoramio (4).jpg', cap: 'Une paillote sur la plage de la côte nord', say: "Et une paillote au bord de l'eau, pour faire une pause entre deux sessions." }],
          center: [-70.41, 19.755], zoom: 12.3, pitch: 62, bearing: 150, orbit: -50, fly: 8000 },
        { title: 'Le pic Duarte', place: 'Cordillère centrale', pin: true,
          text: "Au cœur du pays, la Cordillère centrale culmine au pic Duarte, à 3 098 mètres : le plus haut sommet des Caraïbes. Forêts de pins, cascades et vallées fraîches y contrastent avec la chaleur du littoral, autour de Jarabacoa et de Constanza.",
          intro: "On grimpe maintenant au cœur du pays, dans la Cordillère centrale ! Voici le pic Duarte : trois mille quatre-vingt-dix-huit mètres, le plus haut sommet des Caraïbes ! Des forêts de pins, des cascades, des vallées fraîches, autour de Jarabacoa et de Constanza.",
          facts: [['Altitude', '3 098 m'], ['Record', 'plus haut sommet des Caraïbes']],
          photos: [
            { f: 'File:Pinus occidentalis on Pico Duarte.jpg', cap: 'Pins sur les pentes du pic Duarte', say: "Regardez ces pins : on est bien loin de la chaleur du littoral." },
            { f: 'File:Compartición 2010 - panoramio.jpg', cap: 'La forêt de pins de Compartición, sur le sentier du pic Duarte', say: "Voici Compartición, sur le sentier qui mène au sommet, au milieu de la forêt de pins." },
            { f: 'File:Celestus marcanoi habitat.jpg', cap: 'Paysage de montagne dans la Cordillère centrale', say: "Et plus loin, de grandes prairies d'altitude, où l'air est frais et le calme total." }],
          center: [-70.9986, 19.0236], zoom: 10.3, pitch: 62, bearing: 200, orbit: 60, fly: 8500 },
        { title: 'Le lac Enriquillo', place: 'Sud-ouest', pin: true,
          text: "Dans le sud-ouest, le lac Enriquillo est un lac salé situé sous le niveau de la mer : le point le plus bas des Caraïbes. Il abrite des crocodiles américains, des flamants roses et l'île Cabritos, au milieu d'un paysage semi-désertique.",
          intro: "Dernière grande escale, dans le sud-ouest : le lac Enriquillo ! Un lac salé situé sous le niveau de la mer, à environ quarante mètres en dessous : c'est le point le plus bas des Caraïbes !",
          facts: [['Altitude', '≈ −40 m'], ['Faune', 'crocodiles, flamants']],
          photos: [
            { f: 'File:Lago Enriquillo.jpg', cap: 'Le lac Enriquillo en fin de journée', say: "Le lac à la tombée du jour : la lumière sur l'eau, et les montagnes au loin." },
            { f: 'File:Mirador Lago Enriquillo.jpg', cap: 'Le mirador du lac Enriquillo', say: "Depuis ce mirador, la vue s'étend à perte de vue, dans un paysage presque désertique." },
            { f: 'File:Cabritos 2011 12 13Feb 221.JPG', cap: "Un iguane sur l'île Cabritos", say: "Et sur l'île Cabritos, au milieu du lac, vivent des iguanes, des crocodiles américains et des flamants roses. Un monde à part." }],
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
      if (s.shots) return; // visites générées : photos déjà choisies par le générateur
      s.shots = (s.photos || []).map((p) => {
        const ii = info[p.f]; if (!ii || !/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(ii.thumburl || '')) return null;
        const m = ii.extmetadata || {}, page = /^https:\/\/commons\.wikimedia\.org\//.test(ii.descriptionurl || '') ? ii.descriptionurl : null;
        return { url: ii.thumburl, page, cap: p.cap, say: p.say, by: plain(m.Artist && m.Artist.value) || 'Auteur inconnu', lic: plain(m.LicenseShortName && m.LicenseShortName.value) || 'Licence libre' };
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
  let active = false, currentMap = null, currentTour = null;

  // Pays sans visite écrite à la main : on la génère à partir de Wikidata / Wikipédia / Commons (voir tourgen.js), avec un écran d'attente
  async function prepare(code, opts) {
    const c = opts.country, name = c.fr || c.name;
    const pre = el('div', 'imm');
    const box = el('div', 'imm-load', '<div class="bar"></div><div class="msg"></div>');
    const stop = el('button', 'imm-btn main', 'Annuler'); stop.type = 'button'; box.append(stop); pre.append(box);
    const msg = box.querySelector('.msg'); msg.textContent = `Préparation de la visite · ${name}`;
    let cancelled = false; const cancel = () => { cancelled = true; };
    stop.onclick = cancel;
    const key = (e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); cancel(); } };
    window.addEventListener('keydown', key, true);
    document.body.append(pre); stop.focus({ preventScroll: true });
    const done = () => { window.removeEventListener('keydown', key, true); pre.remove(); };
    try {
      let polys = null; try { polys = await loadBoundary(c.id); } catch (e) {}
      const tour = await Promise.race([
        window.TourGen.build(c, { polys, fallbackCenter: opts.center, onProgress: (m) => { msg.textContent = `${m} · ${name}`; } }),
        new Promise((_, rej) => { const t = setInterval(() => { if (cancelled) { clearInterval(t); rej(new Error('annulé')); } }, 200); }),
      ]);
      if (cancelled) { done(); return null; }
      done(); return tour;
    } catch (e) {
      if (cancelled) { done(); return null; }
      msg.textContent = `Impossible de préparer la visite de ${name}. Vérifiez la connexion.`; box.classList.add('err'); stop.textContent = 'Retour au globe';
      await new Promise((res) => { stop.onclick = res; const k2 = (ev) => { if (ev.key === 'Escape') res(); }; window.addEventListener('keydown', k2, true); });
      done(); return null;
    }
  }

  async function start(code, opts = {}) {
    if (active) return;
    let tour = opts.planet ? (window.PLANET_TOURS || {})[code] : TOURS[code];
    if (!tour && !(opts.country && window.TourGen)) return;
    active = true;
    document.body.classList.add(tour && tour.planet ? 'planeting' : 'immersed');
    if (!tour) {
      tour = await prepare(code, opts);
      if (!tour) { document.body.classList.remove('immersed'); active = false; if (opts.onExit) opts.onExit(); return; }
    }

    currentTour = tour;
    const stops = tour.stops, last = stops.length - 1;
    let map = null, cur = -1, seq = 0, playing = true, finished = false, timer = null, safety = null, began = false;
    let voiceOn = canSpeak && store.get('veille.voiceOn', true), rate = store.get('veille.rate', 1.08), voiceName = store.get('veille.voice', null);
    let speechToken = 0, gapTimer = null, fieldTimer = null;
    const markers = [];

    // ----- interface
    const isPlanet = !!tour.planet;
    const root = el('div', 'imm' + (isPlanet ? ' planet' : '')); root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', `${tour.tag} — ${tour.name}`);
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
    const bSet = el('button', 'imm-btn', svg('sliders')); bSet.type = 'button'; bSet.title = 'Réglages de la voix'; bSet.setAttribute('aria-label', 'Réglages de la voix'); bSet.setAttribute('aria-expanded', 'false');
    const bVoice = el('button', 'imm-btn', svg('mute')); bVoice.type = 'button'; bVoice.title = 'Narration vocale (V)';
    ctl.append(bPrev, bPlay, bNext, el('span', 'sp'));
    if (canSpeak) ctl.append(bSet, bVoice);
    const hint = el('div', 'imm-hint', 'Glissez pour explorer · molette pour zoomer · Espace : pause · Échap : quitter');

    // réglages de la voix
    const pop = el('div', 'imm-pop'); pop.hidden = true;
    const selVoice = el('select'); selVoice.setAttribute('aria-label', 'Voix');
    const rngRate = el('input'); rngRate.type = 'range'; rngRate.min = '.9'; rngRate.max = '1.35'; rngRate.step = '.05'; rngRate.setAttribute('aria-label', 'Rythme de la voix');
    const rateOut = el('output'); const bTest = el('button', 'imm-btn small', 'Écouter un extrait'); bTest.type = 'button';
    pop.append(el('label', null, 'Voix'), selVoice, el('label', null, 'Rythme'), el('div', 'row'), bTest);
    pop.querySelector('.row').append(rngRate, rateOut);
    const srcEl = el('a', 'imm-src'); srcEl.target = '_blank'; srcEl.rel = 'noopener noreferrer'; srcEl.hidden = true; // source du texte (visites générées)
    card.append(step, title, text, srcEl, facts, prog, ctl, hint, pop);

    // les photos éparpillées sur l'écran
    const field = el('div', 'imm-photos');

    const intro = el('div', 'imm-intro', `<span>${esc(tour.tag)}</span><h2>${esc(tour.name)}</h2>`);
    const load = el('div', 'imm-load', '<div class="bar"></div><div class="msg">Chargement de l’imagerie satellite</div>');
    root.append(mapEl, field, top, load);
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
    const estSpeechMs = (t) => Math.round((t.length * 64 / rate) + sentencesOf(t).length * 260 + 600);

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

    // ----- photos : éparpillées aux quatre coins ; celle dont parle la voix vient en grand au centre, puis retourne à sa place
    let phEls = [];
    function clearField(fade) {
      if (fieldTimer) { clearTimeout(fieldTimer); fieldTimer = null; }
      const old = phEls; phEls = []; field.classList.remove('has-focus');
      if (!old.length) return;
      if (fade) { old.forEach((a) => a.classList.remove('in')); fieldTimer = setTimeout(() => old.forEach((a) => a.remove()), 450); }
      else old.forEach((a) => a.remove());
    }
    function buildField(s) {
      clearField(false);
      (s.shots || []).slice(0, 4).forEach((p, i) => {
        const a = el('a', `imm-ph slot${i}`); a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.href = p.page || '#'; a.title = 'Voir la photo sur Wikimedia Commons';
        const im = el('img'); im.alt = p.cap; im.decoding = 'async'; im.src = p.url;
        const cp = el('div', 'cp'); const b = el('b'); b.textContent = p.cap; const sm = el('small'); sm.textContent = `Photo : ${p.by} · ${p.lic}`; cp.append(b, sm);
        a.append(im, cp); field.append(a); phEls.push(a);
        setTimeout(() => a.classList.add('in'), 250 + i * 320); // elles arrivent l'une après l'autre
      });
    }
    // déplacement par transformation (translation + échelle) : fluide, sans recalcul de mise en page
    function focusPhoto(i) {
      const a = phEls[i]; if (!a) return;
      const vw = innerWidth, vh = innerHeight, small = vw < 880;
      const w = a.offsetWidth, h = a.offsetHeight, cx = a.offsetLeft + w / 2, cy = a.offsetTop + h / 2;
      const tw = small ? vw * .92 : Math.min(vw * .56, 780), sc = tw / w;
      const tx = (small ? vw * .5 : vw * .56) - cx, ty = (small ? vh * .34 : vh * .45) - cy;
      a.style.setProperty('--tf', `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(0deg) scale(${sc.toFixed(3)})`);
      a.classList.add('focus'); field.classList.add('has-focus');
    }
    function unfocusPhoto(i) {
      const a = phEls[i]; if (!a) return;
      a.style.removeProperty('--tf'); a.classList.remove('focus');
      if (!phEls.some((x) => x.classList.contains('focus'))) field.classList.remove('has-focus');
    }

    // ----- affichage de l'étape courante
    function renderCard() {
      const s = stops[cur];
      step.innerHTML = `<span><b>${pad(cur + 1)}</b> / ${pad(stops.length)} · ${esc(s.place)}</span>` + (isPlanet ? '' : `<span>${Math.abs(s.center[1]).toFixed(2)}° N · ${Math.abs(s.center[0]).toFixed(2)}° O</span>`);
      title.textContent = s.title; text.textContent = s.text;
      if (s.source && /^https:\/\/fr\.wikipedia\.org\//.test(s.source.url)) { srcEl.hidden = false; srcEl.href = s.source.url; srcEl.textContent = `Texte : ${s.source.label} (CC BY-SA)`; } else srcEl.hidden = true;
      facts.innerHTML = s.facts.map(([k, v]) => `<li><b>${esc(k)}</b> ${esc(v)}</li>`).join('');
      facts.style.display = s.facts.length ? '' : 'none';
      segs.forEach((b, i) => { b.classList.toggle('done', i < cur); b.classList.remove('on'); });
      markers.forEach((m) => m.el.classList.toggle('on', m.i === cur));
      bPrev.disabled = cur === 0; bPrev.style.opacity = cur === 0 ? .4 : 1;
      bNext.disabled = cur === last; bNext.style.opacity = cur === last ? .4 : 1;
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

    // ----- déroulé : vol vers l'étape, puis tour lent autour du lieu pendant la narration
    const cam = (s) => ({ center: s.center, zoom: s.zoom, pitch: s.pitch, bearing: s.bearing });
    const clearTimer = () => { if (timer) { clearTimeout(timer); timer = null; } if (safety) { clearTimeout(safety); safety = null; } };

    function goTo(i) {
      if (!map && !isPlanet) return;
      cur = Math.max(0, Math.min(last, i)); finished = false; clearTimer(); stopSpeech(); clearField(true);
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
      if (isPlanet) setTimeout(begin, 500);
      else if (REDUCED) { map.jumpTo(cam(s)); arrived(); }
      else { map.flyTo({ ...cam(s), duration: s.fly || 7000, curve: 1.5, essential: true }); map.once('moveend', arrived); }
    }

    // Une étape = une suite de « séquences » : l'accroche (photos éparpillées), puis une séquence par photo (elle vient au centre pendant que
    // la voix en parle, puis retourne à sa place). Sans voix, chaque séquence dure un temps fixe.
    function dwell(my) {
      if (!playing || my !== seq) return;
      const s = stops[cur], shots = s.shots || [], talk = voiceOn;
      let plan;
      if (shots.length) {
        plan = [{ say: s.intro, ms: Math.min(9000, Math.max(6000, s.intro.length * 40)), idx: null }, ...shots.map((p, i) => ({ say: p.say, ms: 5500, idx: i }))];
        buildField(s);
      } else if (s.photos && s.photos.length) { // photos indisponibles : on dit tout le texte d'un seul tenant
        const all = [s.intro, ...s.photos.map((p) => p.say)].join(' ');
        plan = [{ say: all, ms: Math.min(24000, Math.max(12000, all.length * 40)), idx: null }];
      } else {
        const t = s.say || s.text;
        plan = [{ say: t, ms: s.dwell || Math.min(19000, Math.max(9000, s.text.length * 52)), idx: null }];
      }
      const dur = (g) => (talk ? estSpeechMs(g.say) : g.ms) + 700;
      const total = plan.reduce((a, g) => a + dur(g), 0) + 900;
      if (!REDUCED && s.orbit) map.easeTo({ bearing: s.bearing + s.orbit, duration: total, easing: (t) => t, essential: true }); // l'orbite est lente et continue
      startFill(total);
      const next = () => { if (my !== seq || !playing) return; cur < last ? goTo(cur + 1) : finish(); };
      let i = 0;
      const run = () => {
        if (my !== seq || !playing) return;
        if (i >= plan.length) { timer = setTimeout(next, 900); return; }
        const g = plan[i++];
        if (g.idx != null) focusPhoto(g.idx);
        const done = () => {
          if (my !== seq) return;
          if (g.idx != null) unfocusPhoto(g.idx);
          timer = setTimeout(run, g.idx != null ? 700 : 350); // la photo retourne à sa place, puis la suivante vient
        };
        if (voiceOn) speak(g.say, done, () => { voiceOn = false; renderPlay(); timer = setTimeout(done, g.ms); });
        else timer = setTimeout(done, g.ms);
      };
      run();
      safety = setTimeout(next, total * 2 + 8000); // filet de sécurité si la voix se bloque
    }
    function finish() { playing = false; finished = true; clearTimer(); stopSpeech(); renderPlay(); }
    function pause() { playing = false; seq++; clearTimer(); stopSpeech(); if (map) map.stop(); phEls.forEach((_, i) => unfocusPhoto(i)); renderPlay(); }
    function togglePlay() {
      if (finished) { playing = true; goTo(0); return; }
      if (playing) pause(); else { playing = true; goTo(cur); }
    }
    function toggleVoice() {
      voiceOn = !voiceOn; store.set('veille.voiceOn', voiceOn); renderPlay();
      stopSpeech();
      if (playing && cur >= 0 && !finished) { clearTimer(); phEls.forEach((_, i) => unfocusPhoto(i)); setTimeout(() => dwell(seq), 120); }
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
      seq++; clearTimer(); stopSpeech(); clearField(false); window.removeEventListener('keydown', onKey, true);
      if (canSpeak) speechSynthesis.onvoiceschanged = null;
      root.classList.add('out');
      setTimeout(() => {
        try { markers.forEach((m) => m.mk.remove()); if (map) map.remove(); } catch (e) {}
        root.remove(); document.body.classList.remove('immersed', 'planeting'); active = false; currentMap = null;
        if (opts.onExit) opts.onExit();
      }, 320);
    }

    // ----- planète : pas de carte, la planète du globe reste visible derrière la visite
    if (isPlanet) {
      mapEl.remove(); load.remove(); hint.textContent = 'Espace : pause · Échap : quitter';
      root.append(card);
      await Promise.race([photosReady, new Promise((r) => setTimeout(r, 3500))]);
      playing = !REDUCED;
      setTimeout(() => goTo(0), REDUCED ? 0 : 600);
      return;
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
      // cadrage automatique du pays pour les visites générées (la carte de narration occupe la gauche, ou le bas sur téléphone)
      stops.forEach((s) => {
        if (!s.bounds) return;
        try {
          const small = innerWidth < 880, cf = map.cameraForBounds(s.bounds, { padding: small ? { top: 70, left: 16, right: 16, bottom: innerHeight * .62 } : { top: 80, left: 520, right: 70, bottom: 70 }, maxZoom: 9.5 });
          if (cf) { s.center = [cf.center.lng, cf.center.lat]; s.zoom = Math.max(2.5, cf.zoom); }
        } catch (e) {}
      });
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
        root.append(card);
        await Promise.race([photosReady, new Promise((r) => setTimeout(r, 3500))]); // les photos sont en général prêtes depuis longtemps
        playing = !REDUCED; // pas de lecture automatique si l'utilisateur réduit les animations
        setTimeout(() => goTo(0), REDUCED ? 0 : 1500);
      };
      map.once('idle', go); setTimeout(go, 9000);
    });
  }

  window.Immersion = { has: (code) => !!TOURS[code], start, map: () => currentMap, tour: () => currentTour }; // map() : utile pour diagnostiquer
})();
