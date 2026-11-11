// Immersion : visite aérienne guidée d'un pays (imagerie satellite + relief 3D + narration)
// Chargé à la demande quand on clique sur un pays qui possède une visite. Pour en ajouter un : une entrée dans TOURS.
//   Imagerie : © Esri, Maxar, Earthstar Geographics (World Imagery) — Relief : Mapzen / AWS Terrain Tiles — Carte : MapLibre GL JS
(() => {
  'use strict';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
  const TOPO = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';
  const MAPLIBRE = 'https://unpkg.com/maplibre-gl@5/dist/maplibre-gl';

  // ---------- Contenu des visites ----------
  const TOURS = {
    DO: {
      name: 'République dominicaine', tag: 'Visite aérienne guidée', topoId: '214',
      start: { center: [-70.2, 21.6], zoom: 4.8 },
      stops: [
        { title: 'La République dominicaine vue du ciel', place: "Vue d'ensemble", pin: false,
          text: "Elle occupe les deux tiers est de l'île d'Hispaniola, qu'elle partage avec Haïti. En peu de distance, ce pays d'environ 48 700 km² réunit plages des Caraïbes, montagnes de plus de 3 000 mètres, lacs salés et forêts tropicales. Suivez le vol : neuf étapes pour la découvrir.",
          facts: [['Capitale', 'Saint-Domingue'], ['Langue', 'espagnol'], ['Habitants', '≈ 11 millions']],
          center: [-70.25, 18.95], zoom: 7.2, pitch: 35, bearing: 15, orbit: 25, fly: 6500 },
        { title: 'Saint-Domingue, la Zone coloniale', place: 'Côte sud', pin: true,
          text: "Fondée en 1496 par Bartolomé Colomb, Saint-Domingue est la plus ancienne ville européenne permanente des Amériques. Sa Zone coloniale, inscrite à l'UNESCO depuis 1990, aligne rues pavées, forteresses, la première cathédrale et les premiers hôpitaux et couvents du Nouveau Monde.",
          facts: [['Fondée en', '1496'], ['UNESCO depuis', '1990']],
          center: [-69.883, 18.473], zoom: 14.2, pitch: 62, bearing: -25, orbit: 55, fly: 8500 },
        { title: "L'île Saona", place: 'Parc national de l’Est', pin: true,
          text: "Au sud-est, l'île Saona fait partie du parc national de l'Est. Plages de sable blanc, palmiers, eaux turquoise et mangroves y sont protégées. On l'atteint en bateau, depuis le village de Bayahibe.",
          facts: [['Protection', 'parc national'], ['Accès', 'bateau depuis Bayahibe']],
          center: [-68.7, 18.15], zoom: 11.3, pitch: 58, bearing: 35, orbit: 50, fly: 8000 },
        { title: 'Punta Cana', place: 'Côte est', pin: true,
          text: "Sur la côte est, Punta Cana aligne des dizaines de kilomètres de plages bordées de cocotiers, entre mer des Caraïbes et océan Atlantique. C'est la première destination touristique du pays, avec son propre aéroport international.",
          facts: [['Plages', 'sable blanc, cocotiers'], ['Aéroport', 'international']],
          center: [-68.4, 18.57], zoom: 12.1, pitch: 60, bearing: -40, orbit: -55, fly: 7500 },
        { title: 'La péninsule de Samaná', place: 'Nord-est', pin: true,
          text: "Au nord-est, la péninsule de Samaná est couverte de collines, de cocoteraies et de cascades comme le Salto El Limón. De janvier à mars, de nombreuses baleines à bosse viennent se reproduire dans sa baie.",
          facts: [['Baleines à bosse', 'janvier – mars'], ['Cascade', 'Salto El Limón']],
          center: [-69.45, 19.22], zoom: 10.4, pitch: 58, bearing: 20, orbit: 55, fly: 8000 },
        { title: 'Cabarete et la côte nord', place: 'Puerto Plata', pin: true,
          text: "Sur la côte nord, le vent régulier fait de Cabarete l'une des capitales mondiales du kitesurf. Plus à l'ouest, un téléphérique mène de Puerto Plata au mont Isabel de Torres, à environ 800 mètres, pour une vue sur toute la baie.",
          facts: [['Sport', 'kitesurf, planche à voile'], ['Isabel de Torres', '≈ 800 m']],
          center: [-70.41, 19.755], zoom: 12.3, pitch: 62, bearing: 150, orbit: -50, fly: 8000 },
        { title: 'Le pic Duarte', place: 'Cordillère centrale', pin: true,
          text: "Au cœur du pays, la Cordillère centrale culmine au pic Duarte, à 3 098 mètres : le plus haut sommet des Caraïbes. Forêts de pins, cascades et vallées fraîches y contrastent avec la chaleur du littoral, autour de Jarabacoa et de Constanza.",
          facts: [['Altitude', '3 098 m'], ['Record', 'plus haut sommet des Caraïbes']],
          center: [-70.9986, 19.0236], zoom: 10.3, pitch: 62, bearing: 200, orbit: 60, fly: 8500 },
        { title: 'Le lac Enriquillo', place: 'Sud-ouest', pin: true,
          text: "Dans le sud-ouest, le lac Enriquillo est un lac salé situé sous le niveau de la mer : le point le plus bas des Caraïbes. Il abrite des crocodiles américains, des flamants roses et l'île Cabritos, au milieu d'un paysage semi-désertique.",
          facts: [['Altitude', '≈ −40 m'], ['Faune', 'crocodiles, flamants']],
          center: [-71.58, 18.47], zoom: 10.2, pitch: 56, bearing: 60, orbit: 55, fly: 8000 },
        { title: 'Fin de la visite', place: "Vue d'ensemble", pin: false,
          text: "Du littoral aux sommets, on passe de la mer des Caraïbes à plus de 3 000 mètres d'altitude en quelques heures de route. Vous pouvez maintenant explorer la carte librement, rejouer la visite ou revenir au globe.",
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
  };
  const svg = (name, size = 18) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const pad = (n) => String(n).padStart(2, '0');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- Chargement de MapLibre (à la demande) ----------
  let mlPromise = null;
  function loadMapLibre() {
    if (window.maplibregl) return Promise.resolve();
    if (mlPromise) return mlPromise;
    return (mlPromise = new Promise((res, rej) => {
      const css = el('link'); css.rel = 'stylesheet'; css.href = MAPLIBRE + '.css'; document.head.append(css);
      const s = el('script'); s.src = MAPLIBRE + '.js'; s.onload = res; s.onerror = () => { mlPromise = null; rej(new Error('maplibre')); }; document.head.append(s);
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

  // ---------- Visite ----------
  let active = false;

  async function start(code, opts = {}) {
    const tour = TOURS[code];
    if (!tour || active) return;
    active = true;
    document.body.classList.add('immersed');

    const stops = tour.stops, last = stops.length - 1;
    let map = null, cur = -1, seq = 0, playing = true, finished = false, voice = false, timer = null, began = false;
    const markers = [];
    const canSpeak = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

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
    const bVoice = el('button', 'imm-btn', svg('mute')); bVoice.type = 'button'; bVoice.title = 'Narration vocale (V)'; bVoice.setAttribute('aria-label', 'Activer la narration vocale');
    ctl.append(bPrev, bPlay, bNext, el('span', 'sp'));
    if (canSpeak) ctl.append(bVoice);
    const hint = el('div', 'imm-hint', 'Glissez pour explorer · molette pour zoomer · Espace : pause · Échap : quitter');
    card.append(step, title, text, facts, prog, ctl, hint);
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

    // ----- narration vocale (phrase par phrase : les longues lectures se coupent dans certains navigateurs)
    const stopSpeech = () => { if (canSpeak) try { speechSynthesis.cancel(); } catch (e) {} };
    function speak(stop, onEnd) {
      if (!canSpeak) return onEnd();
      stopSpeech();
      const parts = `${stop.title}. ${stop.text}`.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [stop.text];
      const fr = speechSynthesis.getVoices().find((v) => /^fr/i.test(v.lang));
      parts.forEach((p, i) => {
        const u = new SpeechSynthesisUtterance(p.trim()); u.lang = 'fr-FR'; u.rate = .97; if (fr) u.voice = fr;
        if (i === parts.length - 1) { u.onend = onEnd; u.onerror = onEnd; }
        speechSynthesis.speak(u);
      });
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
      renderPlay();
    }
    function renderPlay() {
      bPlay.innerHTML = finished ? `${svg('replay')}<span>Rejouer</span>` : playing ? `${svg('pause')}<span>Pause</span>` : `${svg('play')}<span>Lecture</span>`;
      bPlay.setAttribute('aria-label', finished ? 'Rejouer la visite' : playing ? 'Mettre la visite en pause' : 'Reprendre la visite');
      root.classList.toggle('paused', !playing);
      bVoice.innerHTML = svg(voice ? 'volume' : 'mute'); bVoice.classList.toggle('on', voice);
      bVoice.setAttribute('aria-label', voice ? 'Couper la narration vocale' : 'Activer la narration vocale');
    }
    const startFill = (ms) => {
      const b = segs[cur]; b.classList.remove('on'); void b.offsetWidth; b.style.setProperty('--d', ms + 'ms'); b.classList.add('on');
    };

    // ----- déroulé : vol vers l'étape, puis tour lent autour du lieu pendant la narration
    const cam = (s) => ({ center: s.center, zoom: s.zoom, pitch: s.pitch, bearing: s.bearing });
    const clearTimer = () => { if (timer) { clearTimeout(timer); timer = null; } };

    function goTo(i) {
      if (!map) return;
      cur = Math.max(0, Math.min(last, i)); finished = false; clearTimer(); stopSpeech();
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
      const s = stops[cur], ms = s.dwell || Math.min(19000, Math.max(9000, s.text.length * 52));
      if (!REDUCED && s.orbit) map.easeTo({ bearing: s.bearing + s.orbit, duration: ms, easing: (t) => t, essential: true }); // l'orbite est lente et continue
      startFill(ms);
      const next = () => { if (my !== seq || !playing) return; cur < last ? goTo(cur + 1) : finish(); };
      if (voice) { speak(s, next); timer = setTimeout(next, ms * 2.2); } // filet de sécurité si la voix se bloque
      else timer = setTimeout(next, ms);
    }
    function finish() { playing = false; finished = true; clearTimer(); stopSpeech(); renderPlay(); }
    function pause() { playing = false; seq++; clearTimer(); stopSpeech(); if (map) map.stop(); renderPlay(); }
    function togglePlay() {
      if (finished) { playing = true; goTo(0); return; }
      if (playing) pause(); else { playing = true; goTo(cur); }
    }
    function toggleVoice() {
      voice = !voice; renderPlay();
      if (!voice) { stopSpeech(); }
      if (playing && cur >= 0 && !finished) { clearTimer(); stopSpeech(); dwell(seq); }
    }

    bPlay.onclick = togglePlay; bNext.onclick = () => goTo(cur + 1); bPrev.onclick = () => goTo(cur - 1); bVoice.onclick = toggleVoice; back.onclick = quit;

    const onKey = (e) => {
      e.stopPropagation(); // le globe et la page n'écoutent plus le clavier pendant la visite
      if (e.target && e.target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
      const h = { Escape: quit, ' ': togglePlay, ArrowRight: () => goTo(cur + 1), ArrowLeft: () => goTo(cur - 1), v: () => canSpeak && toggleVoice(), V: () => canSpeak && toggleVoice() }[e.key];
      if (h) { e.preventDefault(); h(); }
    };
    window.addEventListener('keydown', onKey, true);

    function quit() {
      if (!root.isConnected || root.classList.contains('out')) return;
      seq++; clearTimer(); stopSpeech(); window.removeEventListener('keydown', onKey, true);
      root.classList.add('out');
      setTimeout(() => {
        try { markers.forEach((m) => m.mk.remove()); if (map) map.remove(); } catch (e) {}
        root.remove(); document.body.classList.remove('immersed'); active = false;
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
    map.on('error', () => {}); // une tuile manquante ne doit pas interrompre la visite

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
      const go = () => {
        if (began || !root.isConnected) return; began = true;
        load.classList.add('hide'); setTimeout(() => load.remove(), 600);
        if (!REDUCED) { root.append(intro); setTimeout(() => intro.remove(), 3500); }
        root.append(card);
        playing = !REDUCED; // pas de lecture automatique si l'utilisateur réduit les animations
        setTimeout(() => goTo(0), REDUCED ? 0 : 1800);
      };
      map.once('idle', go); setTimeout(go, 9000);
    });
  }

  window.Immersion = { has: (code) => !!TOURS[code], start };
})();
