/* ==========================================================================
   JASSEKS GAMENIGHT – APP
   Inhalte (Spieler, Spiele, Punkte, Spielplan, Handicaps) stehen in
   config.js. Diese Datei ist die „Maschine“ dahinter.

   Aufbau:
     1. Hilfsfunktionen          6. Ansichten (Tabelle, Spielplan, Rad, Mehr)
     2. Spielstand & Speicher    7. Ergebnis-Eingabe
     3. Punkte-Logik             8. Glücksrad
     4. Live-Sync                9. Einstellungen & Editoren
     5. Sheets, Dialoge, Toast  10. Siegerehrung, Sound, PWA, Start
     6b. Fotos, Joker, Abzeichen, Rennverlauf, TV-Modus
     6c. Higher or Lower & Buzzer
   ========================================================================== */
(function () {
  'use strict';

  const CFG = window.GAMENIGHT_CONFIG || {};
  const PREVIEW = !!window.GN_PREVIEW;
  const APP_VERSION = '1.3.0';
  const K_STATE = 'jgn.state.v1';
  const K_LOCAL = 'jgn.local.v1';
  const K_PENDING = 'jgn.pending.v1';
  const SWATCHES = ['#ff5d73', '#3ddc97', '#4cc9f0', '#c77dff', '#ff9f1c', '#f15bb5', '#a3e635', '#ffd166'];
  const EMOJIS = ['🦊', '🐸', '🐼', '🐯', '🦄', '🐙', '🐵', '🦖', '🐧', '🐨', '🦁', '🐲', '👾', '🤖', '👻', '🎃', '🍄', '⭐', '🔥', '⚡', '🍕', '🌮', '🚀', '👑'];
  const WHEEL_COLORS = ['#ff5d73', '#ffc93c', '#3ddc97', '#4cc9f0', '#c77dff', '#ff9f1c'];
  const RULES = Object.assign({ jokersPerNight: 1, comebackStreak: 3 }, CFG.rules || {});

  /* ======================================================================
     1. HILFSFUNKTIONEN
     ====================================================================== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const fmtPts = (n) => round2(n).toLocaleString('de-DE', { maximumFractionDigits: 2 });
  const plural = (n, one, many) => (n === 1 ? one : many);
  const mod = (a, n) => ((a % n) + n) % n;
  const parseNum = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
  const reducedMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function fmtDate(ts) {
    try { return new Date(ts).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; }
  }
  function randInt(n) {
    if (window.crypto && crypto.getRandomValues) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
    return Math.floor(Math.random() * n);
  }
  function lsGet(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }
  function withTimeout(promise, ms) {
    return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  }
  function debounce(fn, ms) {
    let t = null;
    const d = (...args) => { clearTimeout(t); t = setTimeout(() => { t = null; fn(...args); }, ms); };
    d.flush = (...args) => { if (t) { clearTimeout(t); t = null; fn(...args); } };
    return d;
  }

  const svgIcon = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const ICON = {
    trophy: svgIcon('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v1a3 3 0 0 0 3 3"/><path d="M16 6h3v1a3 3 0 0 1-3 3"/><path d="M12 13v3"/><path d="M9.5 16.5h5V20h-5z"/>'),
    plan: svgIcon('<path d="M5 21V4"/><path d="M5 4h13l-2.5 4.5L18 13H5"/>'),
    wheel: svgIcon('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v7M12 14v7M3 12h7M14 12h7M5.6 5.6l5 5M13.4 13.4l5 5M18.4 5.6l-5 5M10.6 13.4l-5 5"/>'),
    more: svgIcon('<path d="M4 7h9"/><path d="M17 7h3"/><circle cx="15" cy="7" r="2"/><path d="M4 17h3"/><path d="M11 17h9"/><circle cx="9" cy="17" r="2"/>'),
    chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
    x: svgIcon('<path d="M6 6l12 12M18 6 6 18"/>'),
    up: svgIcon('<path d="m6 15 6-6 6 6"/>'),
    down: svgIcon('<path d="m6 9 6 6 6-6"/>'),
    trash: svgIcon('<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>'),
    camera: svgIcon('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  };
  const TABS = [
    { id: 'board', label: 'Tabelle', icon: ICON.trophy },
    { id: 'plan', label: 'Spielplan', icon: ICON.plan },
    { id: 'wheel', label: 'Glücksrad', icon: ICON.wheel },
    { id: 'more', label: 'Mehr', icon: ICON.more },
  ];

  /* ======================================================================
     2. SPIELSTAND & SPEICHER
     Der komplette Abend steckt in `state`. Er wird bei jeder Änderung in
     localStorage gesichert. Geräte-Einstellungen (Tab, Ton, Sync-Zugang)
     stehen getrennt in `local` und werden nie geteilt.
     ====================================================================== */
  let state;
  let local;
  const ui = {
    sheets: [], stage: null, spinning: false, renderQueued: false, revealHold: null,
    spinFor: null, wheelListId: null, wheelAngle: 0, lastSpinSeen: null, shownPts: {},
    ignorePop: 0, syncSheet: null, lastAddGame: null,
    cer: null, known: null, booting: true, noise: null, dismissedStage: null,
    gameOpen: null, gameSeen: null, bzSeen: null, holSel: null, holProxy: null, holReady: null, bzEarly: {}, bzFx: null,
    bluffSeen: null, blQ: null, blSel: null, blProxy: null, blReady: null, blWarn: null, blDraft: null, blSug: {}, blRv: null,
  };

  function normalizePlayer(p, i) {
    p = p || {};
    return {
      id: String(p.id || 'p' + uid()),
      name: String(p.name || 'Spieler ' + (i + 1)).slice(0, 20),
      emoji: p.emoji || EMOJIS[i % EMOJIS.length],
      color: p.color || SWATCHES[i % SWATCHES.length],
    };
  }
  function normalizeGame(g) {
    g = g || {};
    return {
      id: String(g.id || uid()),
      name: String(g.name || 'Neues Spiel'),
      emoji: g.emoji || '🎮',
      unit: String(g.unit || 'Runde'),
      scoring: g.scoring === 'free' ? 'free' : 'placement',
      points: Array.isArray(g.points) ? g.points.map((n) => parseNum(n)) : [3, 1, 0],
      maxPoints: g.maxPoints == null || g.maxPoints === '' ? null : parseNum(g.maxPoints),
      wheelList: g.wheelList || null,
      mode: g.mode === 'hol' || g.mode === 'bluff' ? g.mode : null,
      buzzer: !!g.buzzer,
      hol: g.mode === 'hol' ? Object.assign({ rounds: 5, lives: 2, cards: 12 }, g.hol || {}) : null,
      bluff: g.mode === 'bluff' ? Object.assign({ questions: 6, doubleLast: true, suggest: true }, g.bluff || {}) : null,
    };
  }
  function normalizeItem(it) {
    it = it || {};
    return { id: String(it.id || uid()), emoji: it.emoji || '🎲', title: String(it.title || 'Handicap'), text: String(it.text || ''), active: it.active !== false };
  }
  function normalizeList(l) {
    l = l || {};
    return { id: String(l.id || uid()), name: String(l.name || 'Liste'), roundLabel: String(l.roundLabel || 'Runde'), items: (Array.isArray(l.items) ? l.items : []).map(normalizeItem) };
  }
  const defaultLists = () => (CFG.handicapLists || []).map(normalizeList);
  const emptyWheel = () => ({ race: 1, current: {}, log: [], lastSpin: null });
  const newSession = (n) => ({ id: uid(), number: n, name: 'GameNight #' + n, startedAt: Date.now() });

  function buildDefaults() {
    const players = (CFG.players || []).map(normalizePlayer);
    const games = (CFG.games || []).map(normalizeGame);
    const plan = (CFG.plan || [])
      .filter((s) => games.some((g) => g.id === s.game))
      .map((s) => ({ id: uid(), gameId: s.game, multiplier: s.multiplier === 2 ? 2 : 1 }));
    return { schema: 3, players, games, handicapLists: defaultLists(), plan, results: [], wheel: emptyWheel(), session: newSession(1), archive: [], media: {}, jokerCalls: {}, stage: null, live: {}, holPlays: {}, bluffPlays: {} };
  }

  // Bringt gespeicherte oder empfangene Daten in die aktuelle Form.
  function migrate(s) {
    if (!s || typeof s !== 'object') return buildDefaults();
    const out = { schema: 3 };
    out.players = Array.isArray(s.players) && s.players.length ? s.players.map(normalizePlayer) : (CFG.players || []).map(normalizePlayer);
    out.games = Array.isArray(s.games) ? s.games.map(normalizeGame) : (CFG.games || []).map(normalizeGame);
    // Version 1.2: neue Spiele aus config.js (Higher or Lower) ergänzen, Buzzer für Quizspiele einschalten
    if ((Number(s.schema) || 1) < 2 && Array.isArray(s.games)) {
      (CFG.games || []).forEach((cg) => {
        const have = out.games.find((g) => g.id === cg.id);
        if (!have) out.games.push(normalizeGame(cg));
        else if (cg.buzzer && !have.buzzer) have.buzzer = true;
      });
    }
    // Version 1.3: Bluff ergänzen
    if ((Number(s.schema) || 1) < 3 && Array.isArray(s.games) && !out.games.some((g) => g.mode === 'bluff')) {
      (CFG.games || []).filter((cg) => cg.mode === 'bluff' && !out.games.some((g) => g.id === cg.id)).forEach((cg) => out.games.push(normalizeGame(cg)));
    }
    out.handicapLists = Array.isArray(s.handicapLists) ? s.handicapLists.map(normalizeList) : defaultLists();
    out.plan = Array.isArray(s.plan)
      ? s.plan.filter((x) => x && x.gameId).map((x) => ({ id: String(x.id || uid()), gameId: String(x.gameId), multiplier: x.multiplier === 2 ? 2 : 1 }))
      : buildDefaults().plan;
    out.results = (Array.isArray(s.results) ? s.results : []).filter((r) => r && r.id && Array.isArray(r.entries));
    out.results.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    const w = s.wheel && typeof s.wheel === 'object' ? s.wheel : {};
    out.wheel = {
      race: Number(w.race) > 0 ? Number(w.race) : 1,
      current: w.current && typeof w.current === 'object' ? w.current : {},
      log: Array.isArray(w.log) ? w.log : [],
      lastSpin: w.lastSpin || null,
    };
    out.session = s.session && s.session.name ? s.session : newSession(1);
    out.archive = Array.isArray(s.archive) ? s.archive : [];
    out.media = {};
    if (s.media && typeof s.media === 'object') {
      for (const k in s.media) if (typeof s.media[k] === 'string' && s.media[k].indexOf('data:image/') === 0) out.media[k] = s.media[k];
    }
    out.jokerCalls = {};
    if (s.jokerCalls && typeof s.jokerCalls === 'object') {
      for (const k in s.jokerCalls) if (Array.isArray(s.jokerCalls[k]) && s.jokerCalls[k].length) out.jokerCalls[k] = s.jokerCalls[k].map(String);
    }
    out.stage = s.stage && typeof s.stage === 'object' && s.stage.id
      ? { id: String(s.stage.id), step: Number(s.stage.step) || 0, open: !!s.stage.open, at: Number(s.stage.at) || 0 }
      : null;
    out.live = {};
    if (s.live && typeof s.live === 'object') {
      for (const k in s.live) if (s.live[k] && typeof s.live[k] === 'object') out.live[k] = s.live[k];
    }
    out.holPlays = {};
    if (s.holPlays && typeof s.holPlays === 'object') {
      for (const k in s.holPlays) if (Number(s.holPlays[k]) > 0) out.holPlays[k] = Number(s.holPlays[k]);
    }
    out.bluffPlays = {};
    if (s.bluffPlays && typeof s.bluffPlays === 'object') {
      for (const k in s.bluffPlays) if (Number(s.bluffPlays[k]) > 0) out.bluffPlays[k] = Number(s.bluffPlays[k]);
    }
    return out;
  }

  function loadAll() {
    local = Object.assign(
      { tab: 'board', sound: true, wake: true, onboarded: false, sync: null },
      lsGet(K_LOCAL, {}) || {}
    );
    if (!TABS.some((t) => t.id === local.tab)) local.tab = 'board';
    const saved = lsGet(K_STATE, null);
    state = saved ? migrate(saved) : buildDefaults();
  }
  const saveState = () => lsSet(K_STATE, state);
  const saveLocal = () => lsSet(K_LOCAL, local);

  // Jede Änderung am Spielstand läuft hierüber: ändern, sichern, teilen, neu zeichnen.
  function commit(mutator, opts = {}) {
    const before = Sync.active() ? toNodes(state) : null;
    mutator(state);
    saveState();
    if (before) Sync.markChanged(before, toNodes(state));
    snapshotKnown();
    if (opts.render !== false) render();
  }

  const playerById = (id) => state.players.find((p) => p.id === id) || null;
  const gameById = (id) => state.games.find((g) => g.id === id) || null;
  const listById = (id) => state.handicapLists.find((l) => l.id === id) || null;

  /* ======================================================================
     3. PUNKTE-LOGIK
     ====================================================================== */

  // Platzierung: `order` = Spieler-IDs in Zielreihenfolge,
  // `ties[i]` = Platz i und i+1 sind gleichauf. Gleichstand → Durchschnitt.
  function placementGroups(order, ties) {
    const groups = [];
    let i = 0;
    while (i < order.length) {
      let j = i;
      while (j < order.length - 1 && ties[j]) j++;
      groups.push({ start: i, end: j, ids: order.slice(i, j + 1) });
      i = j + 1;
    }
    return groups;
  }
  function scorePlacement(points, order, ties, mult) {
    const entries = [];
    for (const g of placementGroups(order, ties || [])) {
      let sum = 0;
      for (let k = g.start; k <= g.end; k++) sum += parseNum(points[k]);
      const avg = sum / (g.end - g.start + 1);
      for (const id of g.ids) entries.push({ playerId: id, place: g.start + 1, points: round2(avg * mult) });
    }
    return entries;
  }
  // Freie Punkte: Platz ergibt sich aus der Punktzahl (für Siege-Statistik).
  function scoreFree(raw, playerIds, mult) {
    return playerIds.map((id) => {
      const v = parseNum(raw[id]);
      const place = 1 + playerIds.filter((o) => parseNum(raw[o]) > v).length;
      return { playerId: id, place, raw: v, points: round2(v * mult) };
    });
  }

  function slotList() {
    const bySlot = {};
    for (const r of state.results) if (r.slotId) bySlot[r.slotId] = r;
    const counts = {};
    return state.plan.map((s, i) => {
      const g = gameById(s.gameId);
      counts[s.gameId] = (counts[s.gameId] || 0) + 1;
      return { id: s.id, gameId: s.gameId, multiplier: s.multiplier, index: i, n: counts[s.gameId], game: g, result: bySlot[s.id] || null, label: (g ? g.unit : 'Spiel') + ' ' + counts[s.gameId] };
    });
  }
  const currentSlot = () => slotList().find((s) => !s.result) || null;
  function extraResults() {
    const ids = new Set(state.plan.map((s) => s.id));
    return state.results.filter((r) => !r.slotId || !ids.has(r.slotId));
  }

  // Tabelle: Punkte, dann Siege, dann 2. Plätze.
  function standings(results = state.results) {
    const rows = state.players.map((p, i) => ({ id: p.id, p, order: i, points: 0, wins: 0, seconds: 0, played: 0, placeSum: 0, hcWins: 0, jokerBonus: 0 }));
    const by = Object.fromEntries(rows.map((r) => [r.id, r]));
    for (const r of results) {
      for (const e of r.entries) {
        const row = by[e.playerId];
        if (!row) continue;
        row.points += Number(e.points) || 0;
        row.played++;
        row.placeSum += e.place;
        if (e.joker) row.jokerBonus = round2(row.jokerBonus + (Number(e.points) || 0) / 2);
        if (e.place === 1) {
          row.wins++;
          if ((r.handicaps || []).some((h) => h.playerId === e.playerId)) row.hcWins++;
        }
        if (e.place === 2) row.seconds++;
      }
    }
    rows.forEach((r) => { r.points = round2(r.points); });
    rows.sort((a, b) => b.points - a.points || b.wins - a.wins || b.seconds - a.seconds || a.order - b.order);
    rows.forEach((r, i) => {
      const prev = rows[i - 1];
      r.rank = prev && prev.points === r.points && prev.wins === r.wins && prev.seconds === r.seconds ? prev.rank : i + 1;
    });
    return rows;
  }

  function slotMax(game, mult) {
    if (!game) return 0;
    if (game.scoring === 'free') return game.maxPoints == null ? null : game.maxPoints * mult;
    const pts = game.points.slice(0, Math.max(1, state.players.length)).map(parseNum);
    return Math.max(0, ...pts) * mult;
  }
  function remaining() {
    let sum = 0, unknown = false, count = 0;
    for (const s of slotList()) {
      if (s.result) continue;
      count++;
      const m = slotMax(s.game, s.multiplier);
      if (m == null) unknown = true; else sum += m;
    }
    return { sum: round2(sum), unknown, count };
  }
  function boardStatus(rows) {
    const rem = remaining();
    const hasResults = state.results.length > 0;
    const finished = state.plan.length > 0 && rem.count === 0;
    const topTie = rows.length > 1 && rows[0].rank === rows[1].rank;
    let clinched = false;
    if (!finished && hasResults && !rem.unknown && rows.length > 1 && !topTie) {
      clinched = rows.slice(1).every((r) => r.points + rem.sum < rows[0].points);
    }
    return { rem, finished, topTie, clinched, hasResults };
  }
  function rankTrend() {
    if (state.results.length < 2) return {};
    const sorted = [...state.results].sort((a, b) => a.ts - b.ts);
    const prev = Object.fromEntries(standings(sorted.slice(0, -1)).map((r) => [r.id, r.rank]));
    return Object.fromEntries(standings().map((r) => [r.id, (prev[r.id] || r.rank) - r.rank]));
  }
  function breakdownData() {
    const map = new Map();
    for (const r of state.results) {
      const g = gameById(r.gameId);
      if (!map.has(r.gameId)) map.set(r.gameId, { gameId: r.gameId, name: g ? g.name : r.gameName, emoji: g ? g.emoji : r.emoji, pts: {}, count: 0 });
      const row = map.get(r.gameId);
      row.count++;
      for (const e of r.entries) row.pts[e.playerId] = round2((row.pts[e.playerId] || 0) + (Number(e.points) || 0));
    }
    return [...map.values()];
  }

  /* ======================================================================
     4. LIVE-SYNC
     Der Spielstand wird in „Knoten“ zerlegt: config (Spieler, Spiele,
     Plan, Listen), meta (Glücksrad) und je Ergebnis ein eigener Knoten.
     Lokale Änderungen werden als „pending“ gemerkt, bis der Server sie
     bestätigt hat – so geht auch offline nichts verloren.
     Die eigentliche Verbindung (Firebase) steckt in sync.js.
     ====================================================================== */
  const CONFIG_KEYS = ['schema', 'players', 'games', 'handicapLists', 'plan', 'session', 'archive', 'holPlays', 'bluffPlays'];
  function toNodes(st) {
    const cfg = {};
    CONFIG_KEYS.forEach((k) => { cfg[k] = st[k]; });
    const n = { config: JSON.stringify(cfg), meta: JSON.stringify({ wheel: st.wheel, jokerCalls: st.jokerCalls, stage: st.stage }) };
    for (const r of st.results) n['results/' + r.id] = JSON.stringify(r);
    for (const k in st.media) if (st.media[k]) n['media/' + k] = st.media[k];
    for (const k in st.live) if (st.live[k]) n['live/' + k] = JSON.stringify(st.live[k]);
    return n;
  }
  function flattenRemote(val) {
    const out = {};
    if (!val || typeof val !== 'object') return out;
    if (typeof val.config === 'string') out.config = val.config;
    if (typeof val.meta === 'string') out.meta = val.meta;
    if (val.results && typeof val.results === 'object') {
      for (const id in val.results) if (typeof val.results[id] === 'string') out['results/' + id] = val.results[id];
    }
    if (val.media && typeof val.media === 'object') {
      for (const k in val.media) if (typeof val.media[k] === 'string') out['media/' + k] = val.media[k];
    }
    if (val.live && typeof val.live === 'object') {
      for (const k in val.live) if (typeof val.live[k] === 'string') out['live/' + k] = val.live[k];
    }
    return out;
  }
  function fromNodes(n) {
    if (!n.config) return null;
    let cfg;
    let meta = {};
    try { cfg = JSON.parse(n.config); } catch (e) { return null; }
    try { meta = n.meta ? JSON.parse(n.meta) : {}; } catch (e) { meta = {}; }
    const results = [];
    const media = {};
    const liveObj = {};
    for (const k in n) {
      if (k.indexOf('results/') === 0) { try { results.push(JSON.parse(n[k])); } catch (e) { /* kaputter Knoten wird ignoriert */ } }
      if (k.indexOf('media/') === 0) media[k.slice(6)] = n[k];
      if (k.indexOf('live/') === 0) { try { liveObj[k.slice(5)] = JSON.parse(n[k]); } catch (e) { /* egal */ } }
    }
    return migrate(Object.assign({}, cfg, { wheel: meta.wheel, jokerCalls: meta.jokerCalls, stage: meta.stage, results, media, live: liveObj }));
  }
  function friendlyError(e) {
    const msg = String((e && (e.code || e.message)) || e || '');
    if (/permission/i.test(msg)) return 'Zugriff verweigert. Prüfe die Regeln der Datenbank (siehe Anleitung).';
    if (/timeout/i.test(msg)) return 'Keine Antwort von der Datenbank. Stimmt die URL, und bist du online?';
    if (/url|parse/i.test(msg)) return 'Die Datenbank-URL ist ungültig.';
    return 'Sync-Fehler: ' + msg;
  }

  const Sync = {
    adapter: null, status: 'off', error: '', pending: new Set(), inflight: {}, gen: 0, offset: 0,
    active() { return !PREVIEW && !!(local && local.sync && local.sync.enabled); },
    loadPending() { this.pending = new Set(lsGet(K_PENDING, []) || []); },
    savePending() { lsSet(K_PENDING, [...this.pending]); },
    setStatus(s, err) {
      this.status = s;
      this.error = err || '';
      renderSyncPill();
      if (ui.syncSheet && !ui.syncSheet.closed) ui.syncSheet.refresh();
    },
    markChanged(before, after) {
      let any = false;
      for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (before[k] !== after[k]) { this.pending.add(k); any = true; }
      }
      if (any) { this.savePending(); this.flush(); }
    },
    flush() {
      const a = this.adapter;
      if (!a || !this.pending.size) return;
      const nodes = toNodes(state);
      const patch = {};
      let count = 0;
      for (const k of this.pending) {
        const v = k in nodes ? nodes[k] : null;
        if (this.inflight[k] === v) continue;
        patch[k] = v;
        this.inflight[k] = v;
        count++;
      }
      if (!count) return;
      const gen = this.gen;
      let p;
      try { p = a.update(patch); } catch (e) { p = Promise.reject(e); }
      Promise.resolve(p).then(() => {
        if (gen !== this.gen) return;
        const now = toNodes(state);
        for (const k in patch) {
          const cur = k in now ? now[k] : null;
          if (cur === patch[k]) this.pending.delete(k);
          if (this.inflight[k] === patch[k]) delete this.inflight[k];
        }
        this.savePending();
      }, (err) => {
        if (gen !== this.gen) return;
        for (const k in patch) if (this.inflight[k] === patch[k]) delete this.inflight[k];
        this.setStatus('error', friendlyError(err));
      });
    },
    onRemote(val) {
      const remote = flattenRemote(val);
      const mine = toNodes(state);
      if (!remote.config && !this.pending.has('config')) {
        // Raum ist leer (z. B. gerade erst angelegt): eigenen Stand hochladen.
        Object.keys(mine).forEach((k) => this.pending.add(k));
        this.savePending();
        this.flush();
        return;
      }
      const merged = {};
      for (const k of new Set([...Object.keys(remote), ...Object.keys(mine)])) {
        const v = this.pending.has(k) ? mine[k] : remote[k];
        if (v != null) merged[k] = v;
      }
      let changed = false;
      for (const k of new Set([...Object.keys(merged), ...Object.keys(mine)])) {
        if (merged[k] !== mine[k]) { changed = true; break; }
      }
      if (changed) {
        const next = fromNodes(merged);
        if (next) { state = next; saveState(); onRemoteState(); }
      }
      if (this.pending.size) this.flush();
    },
    async start({ url, room, interactive = false }) {
      await this.stop();
      const gen = this.gen;
      this.setStatus('connecting');
      let mod;
      try {
        mod = await import(window.GN_SYNC_MODULE || './sync.js');
      } catch (e) {
        if (gen === this.gen) this.setStatus('error', 'Das Sync-Modul konnte nicht geladen werden. Prüfe die Internetverbindung.');
        return false;
      }
      let adapter;
      try {
        adapter = await mod.createAdapter({ url, room });
      } catch (e) {
        if (gen === this.gen) this.setStatus('error', friendlyError(e));
        return false;
      }
      if (gen !== this.gen) { adapter.close(); return false; }
      if (interactive) {
        let remote;
        try {
          remote = flattenRemote(await withTimeout(adapter.fetchOnce(), 12000));
        } catch (e) {
          adapter.close();
          if (gen === this.gen) this.setStatus('error', friendlyError(e));
          return false;
        }
        if (remote.config) {
          if (state.results.length) {
            const ok = await confirmSheet({
              title: 'Raum hat schon einen Spielstand',
              text: 'Wenn du beitrittst, wird der Stand auf diesem Handy durch den Stand im Raum ersetzt.',
              ok: 'Beitreten',
            });
            if (!ok || gen !== this.gen) { adapter.close(); if (gen === this.gen) this.setStatus('off'); return false; }
          }
          this.pending.clear();
          const next = fromNodes(remote);
          if (next) { state = next; saveState(); ui.shownPts = {}; }
        } else {
          this.pending = new Set(Object.keys(toNodes(state)));
        }
        this.savePending();
        local.sync = { url, room, enabled: true };
        local.onboarded = true;
        saveLocal();
      }
      this.adapter = adapter;
      this.inflight = {};
      if (adapter.onServerOffset) adapter.onServerOffset((o) => { if (gen === this.gen) this.offset = Number(o) || 0; });
      adapter.onConnection((ok) => {
        if (gen !== this.gen) return;
        this.setStatus(ok ? 'live' : 'offline');
        if (ok) this.flush();
      });
      adapter.subscribe(
        (val) => { if (gen === this.gen) this.onRemote(val); },
        (err) => { if (gen === this.gen) this.setStatus('error', friendlyError(err)); }
      );
      this.flush();
      render();
      return true;
    },
    async stop() {
      this.gen++;
      const a = this.adapter;
      this.adapter = null;
      this.inflight = {};
      if (a) { try { await a.close(); } catch (e) { /* egal */ } }
    },
    async leave() {
      await this.stop();
      local.sync = null;
      saveLocal();
      this.pending.clear();
      this.savePending();
      this.setStatus('off');
      render();
    },
  };

  function onRemoteState() {
    announceRemoteChanges();
    if (ui.spinning && local.tab === 'wheel' && !local.tv) ui.renderQueued = true;
    else render();
    maybeAnimateRemoteSpin();
    followStage();
  }
  function syncStatusText() {
    if (PREVIEW) return 'Nur in der installierten App';
    if (!Sync.active()) return 'Aus – Spielstand nur auf diesem Handy';
    return { connecting: 'Verbinde …', live: 'Live verbunden', offline: 'Offline – Änderungen werden nachgeschickt', error: 'Fehler beim Sync', off: 'Aus' }[Sync.status] || 'Verbinde …';
  }
  const ROOM_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
  function genRoom() {
    let s = 'gn-';
    for (let i = 0; i < 8; i++) s += ROOM_CHARS[randInt(ROOM_CHARS.length)];
    return s;
  }
  function inviteCode() {
    if (!local.sync) return '';
    const json = JSON.stringify({ u: local.sync.url, r: local.sync.room });
    return 'GN1.' + btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function parseInvite(text) {
    const m = String(text || '').match(/GN1\.([A-Za-z0-9_-]+)/);
    if (!m) return null;
    try {
      let b = m[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      const o = JSON.parse(atob(b));
      return o && o.u && o.r ? { url: String(o.u), room: String(o.r) } : null;
    } catch (e) { return null; }
  }
  const validUrl = (u) => !!window.GN_SYNC_MODULE || /^https:\/\/[a-z0-9.-]+\.(firebaseio\.com|firebasedatabase\.app)\/?$/i.test(String(u).trim());
  const validRoom = (r) => /^[a-z0-9-]{10,40}$/i.test(String(r).trim());

  /* ======================================================================
     5. SHEETS, DIALOGE, TOAST
     ====================================================================== */
  // Zurück-Taste (Android) schließt offene Sheets – nur in der echten App.
  let USE_HISTORY = false;
  try { USE_HISTORY = !PREVIEW && window.top === window.self; } catch (e) { USE_HISTORY = false; }
  let histHeld = false;
  function holdHistory() {
    if (!USE_HISTORY || histHeld) return;
    try { history.pushState({ gn: 1 }, ''); histHeld = true; } catch (e) { /* egal */ }
  }
  function releaseHistoryIfIdle() {
    if (!USE_HISTORY) return;
    setTimeout(() => {
      if (histHeld && !ui.sheets.length && !ui.stage) { histHeld = false; ui.ignorePop++; history.back(); }
    }, 0);
  }
  window.addEventListener('popstate', () => {
    if (ui.ignorePop > 0) { ui.ignorePop--; return; }
    if (!histHeld) return;
    histHeld = false;
    [...ui.sheets].reverse().forEach((s) => s.close(true));
    if (ui.stage) closeCeremony({ fromPop: true });
  });

  function openSheet(opts) {
    const layer = document.createElement('div');
    layer.className = 'layer';
    layer.innerHTML = `<div class="backdrop" data-close></div><section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(opts.title)}"><div class="grab"></div><header class="sheet-head"><h2>${esc(opts.title)}</h2><button class="icon-btn" type="button" data-close aria-label="Schließen">${ICON.x}</button></header><div class="sheet-body"></div></section>`;
    $('#sheets').appendChild(layer);
    const body = layer.querySelector('.sheet-body');
    const api = {
      layer, body, closed: false,
      refresh() { const top = body.scrollTop; body.innerHTML = opts.body(api); body.scrollTop = top; },
      close(fromPop) {
        if (api.closed) return;
        api.closed = true;
        ui.sheets = ui.sheets.filter((s) => s !== api);
        document.body.classList.toggle('has-sheet', ui.sheets.length > 0);
        layer.classList.add('closing');
        setTimeout(() => layer.remove(), reducedMotion() ? 0 : 200);
        if (opts.onClose) opts.onClose(api);
        if (!fromPop) releaseHistoryIfIdle();
      },
    };
    layer.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-close]')) { api.close(); return; }
      const t = ev.target.closest('[data-s]');
      if (t && !t.disabled && opts.on) opts.on(t.dataset.s, t, ev, api);
    });
    layer.addEventListener('input', (ev) => { if (opts.onInput) opts.onInput(ev.target, ev, api); });
    layer.addEventListener('change', (ev) => { if (opts.onChange) opts.onChange(ev.target, ev, api); });
    ui.sheets.push(api);
    document.body.classList.add('has-sheet');
    api.refresh();
    holdHistory();
    return api;
  }

  function confirmSheet({ title, text, ok = 'OK', cancel = 'Abbrechen', danger = false }) {
    return new Promise((resolve) => {
      openSheet({
        title,
        body: () => `<p class="sheet-text">${esc(text)}</p><div class="sheet-actions"><button class="btn ghost" type="button" data-s="no">${esc(cancel)}</button><button class="btn ${danger ? 'danger' : 'primary'}" type="button" data-s="yes">${esc(ok)}</button></div>`,
        on: (a, el, ev, api) => { resolve(a === 'yes'); api.close(); },
        onClose: () => resolve(false),
      });
    });
  }

  let toastTimer = null;
  function toast(msg, action, ms = 4500) {
    const el = $('#toast');
    el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
    if (action) el.querySelector('button').onclick = () => { hideToast(); action.fn(); };
    el.classList.add('show');
    clearTimeout(toastTimer);
    if (ms) toastTimer = setTimeout(hideToast, ms);
  }
  function hideToast() { $('#toast').classList.remove('show'); }

  async function copyText(text, fallbackEl) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Kopiert');
    } catch (e) {
      if (fallbackEl) { fallbackEl.focus(); fallbackEl.select(); }
      toast('Text ist markiert – jetzt kopieren');
    }
  }

  /* ======================================================================
     6. ANSICHTEN
     ====================================================================== */
  function brandMark() {
    const segs = WHEEL_COLORS.map((c, i) => {
      const a0 = (i * 60 - 90) * Math.PI / 180, a1 = ((i + 1) * 60 - 90) * Math.PI / 180;
      return `<path d="M17 18 L${(17 + 14 * Math.cos(a0)).toFixed(2)} ${(18 + 14 * Math.sin(a0)).toFixed(2)} A14 14 0 0 1 ${(17 + 14 * Math.cos(a1)).toFixed(2)} ${(18 + 14 * Math.sin(a1)).toFixed(2)} Z" fill="${c}"/>`;
    }).join('');
    return `<svg class="brand-mark" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="18" r="15.5" fill="#100d2c" stroke="#ffc93c" stroke-width="1.5"/>${segs}<circle cx="17" cy="18" r="4" fill="#16123a" stroke="#ffc93c" stroke-width="1.5"/><path d="M12.5 1.5h9L17 8z" fill="#ffc93c" stroke="#16123a" stroke-width="1"/></svg>`;
  }

  function buildShell() {
    const app = $('#app');
    app.innerHTML = `<header class="topbar"><div class="brand">${brandMark()}<div><div class="brand-name">${esc(CFG.appName || 'GameNight')}</div><div class="brand-sub" id="brand-sub"></div></div></div><button class="sync-pill" id="sync-pill" type="button" data-act="openSync"><span class="dot"></span><span class="lbl"></span></button></header><main class="view" id="view"></main><nav class="tabbar" aria-label="Hauptnavigation">${TABS.map((t) => `<button class="tab" type="button" data-act="tab" data-tab="${t.id}">${t.icon}<span>${t.label}</span></button>`).join('')}</nav>`;
    app.dataset.ready = '1';
  }

  function renderSyncPill() {
    const pill = $('#sync-pill');
    if (!pill) return;
    let cls = 'off', label = 'Lokal';
    if (PREVIEW) label = 'Vorschau';
    else if (Sync.active()) {
      cls = Sync.status;
      label = { connecting: 'Verbinde', live: 'Live', offline: 'Offline', error: 'Fehler' }[Sync.status] || 'Verbinde';
    }
    pill.className = 'sync-pill ' + cls;
    pill.querySelector('.lbl').textContent = label;
    pill.setAttribute('aria-label', 'Live-Sync: ' + syncStatusText());
  }

  function render() {
    if (!$('#app').dataset.ready) buildShell();
    document.body.classList.toggle('tv-mode', !!local.tv);
    renderSyncPill();
    if (ui.spinning && local.tab === 'wheel' && !local.tv) { ui.renderQueued = true; return; }
    ui.renderQueued = false;
    $('#brand-sub').textContent = state.session.name + ' · ' + fmtDate(state.session.startedAt);
    document.querySelectorAll('.tab').forEach((b) => {
      if (b.dataset.tab === local.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    const view = $('#view');
    const flip = captureFlip(view);
    const mode = local.tv ? 'tv' : local.tab;
    let html;
    if (mode === 'tv') html = viewTV();
    else if (mode === 'plan') html = viewPlan();
    else if (mode === 'wheel') html = viewWheel();
    else if (mode === 'more') html = viewMore();
    else html = viewBoard();
    view.innerHTML = html;
    if (flip.tab === mode) playFlip(view, flip);
    view.dataset.tab = mode;
    if (mode === 'board' || mode === 'tv') runCountUps(view);
    wireCharts(view);
    checkComebacks();
    gameSync();
    renderGame();
  }

  // Sanftes Umsortieren der Tabelle, wenn sich Plätze ändern.
  function captureFlip(view) {
    const m = {};
    view.querySelectorAll('[data-flip]').forEach((el) => { m[el.dataset.flip] = el.getBoundingClientRect().top; });
    return { tab: view.dataset.tab, m };
  }
  function playFlip(view, flip) {
    if (reducedMotion() || !Element.prototype.animate) return;
    view.querySelectorAll('[data-flip]').forEach((el) => {
      const old = flip.m[el.dataset.flip];
      if (old == null) return;
      const dy = old - el.getBoundingClientRect().top;
      if (Math.abs(dy) > 2) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.2,.9,.25,1)' });
    });
  }
  function runCountUps(view) {
    view.querySelectorAll('[data-count]').forEach((el) => {
      const id = el.dataset.count;
      const to = parseFloat(el.dataset.to);
      const from = ui.shownPts[id];
      ui.shownPts[id] = to;
      if (from == null || from === to || reducedMotion()) return;
      const num = el.querySelector('.num');
      const ints = Number.isInteger(from) && Number.isInteger(to);
      const t0 = performance.now(), dur = 750;
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        const v = from + (to - from) * (1 - Math.pow(1 - t, 3));
        num.textContent = fmtPts(ints ? Math.round(v) : Math.round(v * 10) / 10);
        if (t < 1) requestAnimationFrame(step); else num.textContent = fmtPts(to);
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- Tabelle ---------- */
  function viewBoard() {
    const rows = standings();
    const bs = boardStatus(rows);
    const trend = rankTrend();
    const slots = slotList();
    const cur = slots.find((s) => !s.result) || null;
    const parts = [trackHtml(slots, bs)];
    if (live('hol') && ui.gameOpen !== 'hol') parts.push('<button class="banner live" type="button" data-act="gameOpen" data-k="hol"><span class="b-emoji" aria-hidden="true">📈</span><span><b>Higher or Lower läuft</b> – zurück ins Spiel</span></button>');
    if (live('bluff') && ui.gameOpen !== 'bluff') parts.push('<button class="banner live" type="button" data-act="gameOpen" data-k="bluff"><span class="b-emoji" aria-hidden="true">🎭</span><span><b>Bluff läuft</b> – zurück ins Spiel</span></button>');
    if (live('bz') && ui.gameOpen !== 'bz') parts.push('<button class="banner live" type="button" data-act="gameOpen" data-k="bz"><span class="b-emoji" aria-hidden="true">🔔</span><span><b>Der Buzzer ist offen</b> – zurück zum Buzzer</span></button>');
    if (bs.finished && bs.hasResults) {
      parts.push(`<div class="banner"><span class="b-emoji" aria-hidden="true">🏁</span><span>${bs.topTie ? 'Alle Spiele gespielt – und Gleichstand an der Spitze!' : 'Alle Spiele gespielt. Zeit für die Siegerehrung!'}</span></div>`);
    } else if (bs.clinched) {
      parts.push(`<div class="banner"><span class="b-emoji" aria-hidden="true">🏆</span><span><b>${esc(rows[0].p.name)}</b> ist nicht mehr einzuholen.</span></div>`);
    }
    parts.push(`<ol class="standings" aria-label="Tabelle">${rows.map((r) => posCard(r, rows, bs, trend)).join('')}</ol>`);
    parts.push(nextHtml(cur, bs, slots));
    const chart = chartHtml();
    if (chart) parts.push(`<section class="card"><div class="eyebrow">Rennverlauf</div>${chart}</section>`);
    parts.push(breakdownHtml());
    return parts.join('');
  }

  function trackHtml(slots, bs) {
    if (!slots.length) return '';
    const done = slots.filter((s) => s.result).length;
    const cur = slots.find((s) => !s.result);
    const left = done === slots.length ? `<b>${done} von ${done}</b> gespielt` : `<b>Spiel ${done + 1}</b> von ${slots.length}`;
    const right = bs.rem.count === 0 ? 'Alles entschieden' : bs.rem.unknown ? `noch ${bs.rem.count} ${plural(bs.rem.count, 'Spiel', 'Spiele')}` : `noch ${fmtPts(bs.rem.sum)} Punkte möglich`;
    const ticks = slots.map((s) => {
      let cls = 'tick';
      let style = '';
      let title = `${s.index + 1}. ${s.game ? s.game.name : 'Spiel'} · ${s.label}`;
      if (s.result) {
        const winners = s.result.entries.filter((e) => e.place === 1).map((e) => playerById(e.playerId)).filter(Boolean);
        cls += ' done';
        if (winners.length > 1) { cls += ' split'; style = `--tc:${winners[0].color};--tc2:${winners[1].color}`; } else if (winners[0]) style = `--tc:${winners[0].color}`;
        if (winners.length) title += ' – gewonnen von ' + winners.map((w) => w.name).join(' & ');
      } else if (cur && s.id === cur.id) cls += ' now';
      if (s.multiplier > 1) cls += ' x2';
      return `<span class="${cls}" style="${esc(style)}" title="${esc(title)}"></span>`;
    }).join('');
    return `<section class="track" aria-label="Fortschritt des Abends"><div class="track-head"><span>${left}</span><span>${right}</span></div><div class="track-bar">${ticks}<span class="flag" aria-hidden="true"></span></div></section>`;
  }

  function posCard(r, rows, bs, trend) {
    const p = r.p;
    const has = bs.hasResults;
    const t = trend[r.id] || 0;
    let gap = '&nbsp;';
    if (has) {
      if (r.rank === 1) {
        const tied = rows.filter((x) => x.rank === 1).length > 1;
        const next = rows.find((x) => x.rank !== 1);
        const lead = next ? round2(r.points - next.points) : 0;
        gap = tied ? 'gleichauf' : !next ? '' : lead > 0 ? `${fmtPts(lead)} vorne` : 'punktgleich';
      } else {
        const behind = round2(rows[0].points - r.points);
        gap = behind > 0 ? `−${fmtPts(behind)}` : 'punktgleich';
      }
    }
    const meta = has && r.played
      ? `${r.wins} ${plural(r.wins, 'Sieg', 'Siege')} · Ø Platz ${fmtPts(Math.round((r.placeSum / r.played) * 10) / 10)}`
      : 'Noch kein Spiel';
    return `<li class="pos-card${has && r.rank === 1 ? ' lead' : ''}${t ? ' has-trend' : ''}" data-flip="row-${esc(p.id)}" style="--pc:${esc(p.color)}">
      <div class="pos${has && r.rank <= 3 ? ' pos-' + r.rank : ''}">${has ? r.rank + '.' : '–'}</div>
      ${avatar(p)}
      <div class="who"><div class="name">${esc(p.name)}</div><div class="meta">${meta}</div></div>
      <div class="score"><div class="pts" data-count="${esc(p.id)}" data-to="${r.points}"><span class="num">${fmtPts(r.points)}</span><small>Pkt</small></div><div class="gap">${gap}</div></div>
      ${t ? `<span class="trend ${t > 0 ? 'up' : 'down'}" aria-label="${t > 0 ? 'aufgestiegen' : 'abgerutscht'} um ${Math.abs(t)}">${t > 0 ? '▲' : '▼'}${Math.abs(t)}</span>` : ''}
    </li>`;
  }

  function nextHtml(cur, bs, slots) {
    if (!slots.length) {
      return `<section class="empty-state"><div class="big" aria-hidden="true">📋</div><div>Noch kein Spielplan. Leg fest, was ihr heute spielt.</div><button class="btn primary" type="button" data-act="editPlan">Spielplan erstellen</button></section>`;
    }
    if (!cur) {
      return `<section class="next"><div class="eyebrow">Ende der GameNight</div><div class="next-title"><span class="g-emoji" aria-hidden="true">🏆</span><div><div class="t">${bs.topTie ? 'Gleichstand!' : 'Siegerehrung'}</div><div class="s">${bs.topTie ? 'Ein Stechen entscheidet. Trag es als Zusatzspiel ein.' : 'Alle Spiele sind gespielt.'}</div></div></div><div class="next-actions">${bs.topTie ? '<button class="btn primary" type="button" data-act="extraResult">Stechen eintragen</button>' : ''}<button class="btn ${bs.topTie ? 'ghost' : 'primary'}" type="button" data-act="ceremony">Zur Siegerehrung</button></div></section>`;
    }
    const g = cur.game || { emoji: '❓', name: 'Gelöschtes Spiel' };
    const hasWheel = !!(g.wheelList && listById(g.wheelList));
    return `<section class="next" aria-label="Als Nächstes">
      <div class="eyebrow">Als Nächstes · Spiel ${cur.index + 1}</div>
      <div class="next-title"><span class="g-emoji" aria-hidden="true">${esc(g.emoji)}</span><div style="min-width:0"><div class="t">${esc(g.name)}</div><div class="s">${esc(cur.label)}${cur.multiplier > 1 ? ' &nbsp;<span class="badge">Finale ×2</span>' : ''}</div></div></div>
      <div class="next-actions">${nextActions(cur, g, hasWheel)}</div>
      ${jokerChips(cur)}
    </section>`;
  }

  function breakdownHtml() {
    const data = breakdownData();
    if (!data.length) return '';
    const ps = state.players;
    const totals = {};
    const body = data.map((d) => {
      const max = Math.max(...ps.map((p) => d.pts[p.id] || 0));
      return `<tr><td>${esc(d.emoji)} ${esc(d.name)} <span class="muted small">×${d.count}</span></td>${ps.map((p) => {
        const v = d.pts[p.id] || 0;
        totals[p.id] = (totals[p.id] || 0) + v;
        return `<td class="${v === max && max > 0 ? 'best' : ''}">${fmtPts(v)}</td>`;
      }).join('')}</tr>`;
    }).join('');
    return `<section class="card"><div class="eyebrow">Punkte nach Disziplin</div><div class="table-wrap"><table class="breakdown"><thead><tr><th><span class="visually-hidden">Spiel</span></th>${ps.map((p) => `<th title="${esc(p.name)}" aria-label="${esc(p.name)}">${face(p)}</th>`).join('')}</tr></thead><tbody>${body}</tbody><tfoot><tr><td>Gesamt</td>${ps.map((p) => `<td>${fmtPts(totals[p.id] || 0)}</td>`).join('')}</tr></tfoot></table></div></section>`;
  }

  /* ---------- Spielplan ---------- */
  function viewPlan() {
    const slots = slotList();
    const cur = slots.find((s) => !s.result) || null;
    const extras = extraResults();
    const done = slots.filter((s) => s.result).length;
    const head = `<div class="view-head"><div><h1 class="h1">Spielplan</h1><div class="sub">${slots.length} ${plural(slots.length, 'Spiel', 'Spiele')} · ${done} gespielt${slots.some((s) => s.multiplier > 1) ? ' · Finale zählt doppelt' : ''}</div></div><button class="btn small ghost" type="button" data-act="editPlan">Bearbeiten</button></div>`;
    const list = slots.length
      ? `<ol class="plan-list">${slots.map((s) => slotRow(s, cur)).join('')}</ol>`
      : `<section class="empty-state"><div class="big" aria-hidden="true">📋</div><div>Der Spielplan ist leer.</div><button class="btn primary" type="button" data-act="editPlan">Spiele hinzufügen</button></section>`;
    const extra = extras.length
      ? `<div class="group"><div class="eyebrow">Zusatzspiele</div><ol class="plan-list">${extras.map(extraRow).join('')}</ol></div>`
      : '';
    return head + list + extra + '<button class="btn ghost block" type="button" data-act="extraResult">+ Zusatzspiel eintragen</button>';
  }
  function resultMini(r) {
    return [...r.entries].sort((a, b) => a.place - b.place || b.points - a.points).map((e) => {
      const p = playerById(e.playerId);
      return p ? `<span class="chip-pts" title="${esc(p.name)}: ${fmtPts(e.points)}">${face(p)}${fmtPts(e.points)}${e.joker ? '🃏' : ''}</span>` : '';
    }).join('');
  }
  function slotRow(s, cur) {
    const g = s.game || { emoji: '❓', name: 'Gelöschtes Spiel' };
    const isNow = !!(cur && cur.id === s.id);
    const hc = s.result && s.result.handicaps && s.result.handicaps.length;
    const sub = esc(s.label) + (s.multiplier > 1 ? ' · Finale ×2' : '') + (hc ? ` · ${hc} Handicaps` : '');
    const right = s.result ? resultMini(s.result) : isNow ? '<span class="badge">Jetzt</span>' : '';
    return `<li><button class="slot${isNow ? ' now' : ''}${!s.result && !isNow ? ' later' : ''}" type="button" data-act="${s.result ? 'editResult' : s.game && s.game.mode === 'hol' ? 'holStart' : s.game && s.game.mode === 'bluff' ? 'bluffStart' : 'enterResult'}" data-slot="${esc(s.id)}"><span class="idx">${s.index + 1}</span><span class="g-emoji" aria-hidden="true">${esc(g.emoji)}</span><span class="main"><b>${esc(g.name)}</b><small>${sub}</small></span><span class="res">${right}</span></button></li>`;
  }
  function extraRow(r) {
    const g = gameById(r.gameId);
    return `<li><button class="slot" type="button" data-act="editResult" data-result="${esc(r.id)}"><span class="idx">+</span><span class="g-emoji" aria-hidden="true">${esc(g ? g.emoji : r.emoji)}</span><span class="main"><b>${esc(g ? g.name : r.gameName)}</b><small>Zusatzspiel</small></span><span class="res">${resultMini(r)}</span></button></li>`;
  }

  /* ---------- Mehr ---------- */
  const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  function rowBtn(act, label, value, sub, extraCls) {
    return `<button class="row${extraCls ? ' ' + extraCls : ''}" type="button" data-act="${act}"><span class="r-label">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>${value ? `<span class="r-val">${esc(value)}</span>` : ''}${ICON.chev}</button>`;
  }
  function switchRow(key, label, sub, on) {
    return `<label class="row" for="sw-${key}"><span class="r-label">${esc(label)}<small>${esc(sub)}</small></span><span class="switch"><input type="checkbox" id="sw-${key}" data-local="${key}"${on ? ' checked' : ''}><span></span></span></label>`;
  }
  function viewMore() {
    const lists = state.handicapLists.length;
    return `<div class="view-head"><div><h1 class="h1">Mehr</h1><div class="sub">Einstellungen, Sync und Daten</div></div></div>
    <section class="group"><div class="eyebrow">GameNight</div><div class="rows">
      ${rowBtn('editSession', 'Name des Abends', state.session.name)}
      ${rowBtn('finishNight', 'GameNight abschließen', '', 'Endstand archivieren und bei 0 neu starten')}
      ${rowBtn('hallOfFame', 'Ruhmeshalle', state.archive.length ? state.archive.length + ' ' + plural(state.archive.length, 'Abend', 'Abende') : 'noch leer')}
    </div></section>
    <section class="group"><div class="eyebrow">Einrichten</div><div class="rows">
      ${rowBtn('editPlayers', 'Spieler', state.players.map((p) => p.emoji).join(' '))}
      ${rowBtn('editGames', 'Spiele & Punkte', state.games.length + ' ' + plural(state.games.length, 'Spiel', 'Spiele'))}
      ${rowBtn('editPlan', 'Spielplan', state.plan.length + ' ' + plural(state.plan.length, 'Spiel', 'Spiele'))}
      ${rowBtn('editLists', 'Glücksrad-Listen', lists + ' ' + plural(lists, 'Liste', 'Listen'))}
    </div></section>
    <section class="group"><div class="eyebrow">Live-Sync</div><div class="rows">
      ${rowBtn('openSync', 'Handys verbinden', '', syncStatusText())}
      ${rowBtn('whoAmI', 'Dieses Gerät', roleLabel(), 'Wer spielt hier? Wichtig für Higher or Lower und den Buzzer')}
    </div></section>
    <section class="group"><div class="eyebrow">App</div><div class="rows">
      ${switchRow('sound', 'Sounds', 'Ticken und Fanfare beim Glücksrad', local.sound)}
      ${switchRow('wake', 'Bildschirm anlassen', 'Das Handy geht während der GameNight nicht aus', local.wake)}
      ${rowBtn('tvStart', 'TV-Modus', '', 'Große Ansicht für Fernseher oder Tablet')}
      ${isStandalone() ? '' : rowBtn('installHelp', 'Als App installieren', '', 'Auf den Home-Bildschirm legen')}
    </div></section>
    <section class="group"><div class="eyebrow">Daten</div><div class="rows">
      ${rowBtn('exportData', 'Backup erstellen', '')}
      ${rowBtn('importData', 'Backup laden', '')}
      ${rowBtn('resetAll', 'Alles zurücksetzen', '', '', 'danger')}
    </div></section>
    <p class="foot">Jasseks GameNight ${APP_VERSION}${PREVIEW ? ' · Vorschau' : ''} · ${Sync.active() ? 'Spielstand wird live geteilt' : 'Spielstand liegt auf diesem Gerät'}</p>`;
  }

  /* ======================================================================
     6b. FOTOS, JOKER, ABZEICHEN, RENNVERLAUF, TV-MODUS
     ====================================================================== */
  const short = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));

  /* ---------- Fotos ---------- */
  const photoOf = (pid) => (state.media && state.media['p_' + pid]) || null;
  // Titelverteidiger = Sieger der zuletzt abgeschlossenen GameNight
  function championIds() {
    const last = state.archive[0];
    if (!last || !Array.isArray(last.standings)) return [];
    return last.standings.filter((s) => s.rank === 1 && s.id).map((s) => s.id);
  }
  function avatar(p, cls = '', opts = {}) {
    if (!p) return '';
    const photo = photoOf(p.id);
    const crown = opts.crown !== false && championIds().includes(p.id) ? '<span class="crown" title="Titelverteidiger">👑</span>' : '';
    return `<span class="avatar${cls ? ' ' + cls : ''}" style="--pc:${esc(p.color)}" aria-hidden="true">${photo ? `<img src="${esc(photo)}" alt="">` : esc(p.emoji)}${crown}</span>`;
  }
  function face(p) {
    if (!p) return '';
    const photo = photoOf(p.id);
    return photo ? `<img class="face" src="${esc(photo)}" alt="${esc(p.name)}">` : esc(p.emoji);
  }
  // Foto verkleinern (und auf Wunsch quadratisch zuschneiden), Ergebnis als JPEG-Daten-URL
  function imageToDataUrl(file, max, square) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth, h = img.naturalHeight;
          if (!w || !h) throw new Error('image');
          let sx = 0, sy = 0, sw = w, sh = h;
          if (square) { const s = Math.min(w, h); sx = (w - s) / 2; sy = (h - s) * 0.35; sw = s; sh = s; }
          const scale = Math.min(1, max / Math.max(sw, sh));
          const cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(sw * scale));
          cv.height = Math.max(1, Math.round(sh * scale));
          const ctx = cv.getContext('2d');
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
          URL.revokeObjectURL(url);
          resolve(cv.toDataURL('image/jpeg', 0.82));
        } catch (e) { URL.revokeObjectURL(url); reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }
  // Öffnet die Foto-Auswahl. Auf dem Handy bietet das System Kamera und Galerie an.
  function pickImage({ max = 256, square = true } = {}, done) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.addEventListener('change', async () => {
      const f = input.files && input.files[0];
      input.remove();
      if (!f) return;
      try { done(await imageToDataUrl(f, max, square)); } catch (e) { toast('Das Bild konnte nicht gelesen werden.'); }
    });
    document.body.appendChild(input);
    input.click();
  }

  /* ---------- Joker ---------- */
  function lastPlaceIds(r) {
    const places = r.entries.map((e) => e.place);
    if (places.length < 2) return [];
    const worst = Math.max(...places);
    if (worst === Math.min(...places)) return [];
    return r.entries.filter((e) => e.place === worst).map((e) => e.playerId);
  }
  // Wer `comebackStreak`-mal in Folge Letzter war, bekommt einmal pro Abend einen Extra-Joker.
  function comebackInfo() {
    const n = Number(RULES.comebackStreak) || 0;
    const earned = {};
    if (n < 1) return earned;
    const streak = {};
    for (const r of [...state.results].sort((a, b) => a.ts - b.ts)) {
      const losers = lastPlaceIds(r);
      for (const e of r.entries) {
        const pid = e.playerId;
        streak[pid] = losers.includes(pid) ? (streak[pid] || 0) + 1 : 0;
        if (streak[pid] >= n && !earned[pid]) earned[pid] = r.id;
      }
    }
    return earned;
  }
  function jokerStatus(pid, { slotId = null, resultId = null } = {}) {
    const comeback = !!comebackInfo()[pid];
    const budget = (Number(RULES.jokersPerNight) || 0) + (comeback ? 1 : 0);
    let used = 0;
    const done = new Set();
    for (const r of state.results) {
      if (r.slotId) done.add(r.slotId);
      if (r.id !== resultId && (r.jokers || []).includes(pid)) used++;
    }
    for (const sid in state.jokerCalls) {
      if (sid === slotId || done.has(sid)) continue;
      if (state.jokerCalls[sid].includes(pid)) used++;
    }
    return { budget, used, left: Math.max(0, budget - used), comeback };
  }
  function jokerLabel(js) {
    if (!js.left) return 'verbraucht';
    if (js.left > 1) return `${js.left} Joker`;
    return js.comeback && js.used >= (Number(RULES.jokersPerNight) || 0) ? 'Aufhol-Joker' : '1 Joker';
  }
  function applyJokers(entries, jokers) {
    if (!jokers || !jokers.length) return entries;
    return entries.map((e) => (jokers.includes(e.playerId) ? Object.assign({}, e, { points: round2(e.points * 2), joker: true }) : e));
  }
  function toggleJokerCall(slotId, pid) {
    const p = playerById(pid);
    if (!p || !state.plan.some((s) => s.id === slotId)) return;
    const calls = state.jokerCalls[slotId] || [];
    if (calls.includes(pid)) {
      commit((st) => {
        const c = (st.jokerCalls[slotId] || []).filter((x) => x !== pid);
        if (c.length) st.jokerCalls[slotId] = c; else delete st.jokerCalls[slotId];
      });
      toast(`Joker von ${p.name} zurückgenommen`);
      return;
    }
    if (jokerStatus(pid, { slotId }).left <= 0) { toast(`${p.name} hat keinen Joker mehr.`); return; }
    commit((st) => { st.jokerCalls[slotId] = (st.jokerCalls[slotId] || []).concat(pid); });
    initAudio();
    jokerSound();
    toast(`🃏 ${p.name} setzt den Joker – Punkte ×2!`);
  }
  function jokerChips(slot) {
    if (!(Number(RULES.jokersPerNight) > 0) && !(Number(RULES.comebackStreak) > 0)) return '';
    const calls = state.jokerCalls[slot.id] || [];
    const chips = state.players.map((p) => {
      const on = calls.includes(p.id);
      const js = jokerStatus(p.id, { slotId: slot.id });
      return `<button class="jk${on ? ' on' : ''}${js.comeback && js.left && !on ? ' cb' : ''}" type="button" data-act="joker" data-slot="${esc(slot.id)}" data-pid="${esc(p.id)}" aria-pressed="${on}"${!on && !js.left ? ' disabled' : ''}>${avatar(p, 'xs', { crown: false })}<span class="jk-t"><b>${esc(p.name)}</b><small>${on ? '×2 gesetzt' : jokerLabel(js)}</small></span></button>`;
    }).join('');
    return `<div class="joker-row"><div class="eyebrow">Joker vor dem Spiel ansagen</div><div class="jk-chips">${chips}</div></div>`;
  }
  function sheetJokerRow(draft, slot, existing) {
    const chips = state.players.map((p) => {
      const on = draft.jokers.includes(p.id);
      const js = jokerStatus(p.id, { slotId: slot.id, resultId: existing ? existing.id : null });
      return `<button class="jk${on ? ' on' : ''}" type="button" data-s="joker" data-pid="${esc(p.id)}" aria-pressed="${on}"${!on && !js.left ? ' disabled' : ''}>${avatar(p, 'xs', { crown: false })}<span class="jk-t"><b>${esc(p.name)}</b><small>${on ? '×2 gesetzt' : js.left ? 'Joker frei' : 'kein Joker'}</small></span></button>`;
    }).join('');
    return `<div class="joker-row"><div class="eyebrow">Joker</div><div class="jk-chips">${chips}</div></div>`;
  }

  /* ---------- Ansagen (Aufhol-Joker, Joker von anderen Handys) ---------- */
  function showCard({ p, lead, emoji, title, text, button = 'Alles klar', auto = 0 }) {
    document.querySelectorAll('.reveal').forEach((r) => r.remove());
    const el = document.createElement('div');
    el.className = 'reveal' + (local.tv ? ' tv-reveal' : '');
    el.innerHTML = `<div class="backdrop" data-x></div><div class="reveal-card" role="dialog" aria-modal="true" aria-label="${esc(title)}" style="--pc:${esc(p ? p.color : '#ffc93c')}">${p ? `<div class="who-line">${avatar(p, 'xs', { crown: false })}${esc(lead || p.name)}</div>` : ''}<div class="big" aria-hidden="true">${esc(emoji)}</div><div class="title">${esc(title)}</div><div class="text">${esc(text)}</div><button class="btn primary" type="button" data-x>${esc(button)}</button></div>`;
    el.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) el.remove(); });
    document.body.appendChild(el);
    if (auto) setTimeout(() => el.remove(), auto);
    const b = el.querySelector('button');
    if (b && !local.tv) b.focus({ preventScroll: true });
  }
  function checkComebacks() {
    const info = comebackInfo();
    const sid = state.session.id;
    const seenMap = local.seenComeback || {};
    const seen = seenMap[sid] || [];
    const fresh = Object.keys(info).filter((pid) => !seen.includes(pid) && playerById(pid));
    if (!fresh.length) return;
    local.seenComeback = { [sid]: seen.concat(fresh) };
    saveLocal();
    // Nach dem letzten Spiel bringt ein Aufhol-Joker nichts mehr – dann keine Ansage.
    if (ui.booting || remaining().count === 0) return;
    fresh.forEach((pid, i) => setTimeout(() => {
      const p = playerById(pid);
      if (!p) return;
      showCard({
        p, lead: `${p.name} bekommt`, emoji: '🃏', title: 'Aufhol-Joker!',
        text: `${RULES.comebackStreak}-mal in Folge Letzter – dafür gibt es einen Extra-Joker. Vor einem Spiel ansagen, dann zählen die Punkte doppelt.`,
        button: 'Aufholjagd starten', auto: local.tv ? 8000 : 0,
      });
      initAudio();
      jokerSound();
    }, 700 + i * 400));
  }
  const callKeys = () => Object.keys(state.jokerCalls).reduce((all, sid) => all.concat(state.jokerCalls[sid].map((pid) => sid + ':' + pid)), []);
  function snapshotKnown() {
    ui.known = { calls: new Set(callKeys()), results: new Set(state.results.map((r) => r.id)) };
  }
  function announceRemoteChanges() {
    const prev = ui.known || { calls: new Set(callKeys()), results: new Set(state.results.map((r) => r.id)) };
    const newCalls = callKeys().filter((k) => !prev.calls.has(k));
    const newResults = state.results.filter((r) => !prev.results.has(r.id));
    snapshotKnown();
    const slots = slotList();
    newCalls.forEach((k) => {
      const [sid, pid] = k.split(':');
      const p = playerById(pid);
      const slot = slots.find((s) => s.id === sid);
      if (!p || (slot && slot.result)) return;
      const msg = `${p.name} setzt den Joker${slot && slot.game ? ' für ' + slot.game.name : ''}!`;
      if (local.tv) tvBanner('🃏', msg, p); else toast('🃏 ' + msg);
      jokerSound();
    });
    if (local.tv) {
      newResults.forEach((r) => {
        const winners = r.entries.filter((e) => e.place === 1).map((e) => playerById(e.playerId)).filter(Boolean);
        if (winners.length) tvBanner('🏁', `${r.gameName}: ${winners.map((w) => w.name).join(' & ')} ${winners.length > 1 ? 'gewinnen' : 'gewinnt'}`, winners[0]);
      });
    }
  }

  /* ---------- Abzeichen ---------- */
  function timeline() {
    const sorted = [...state.results].sort((a, b) => a.ts - b.ts);
    const pts = {};
    state.players.forEach((p) => { pts[p.id] = 0; });
    const steps = [{ result: null, pts: Object.assign({}, pts) }];
    for (const r of sorted) {
      for (const e of r.entries) if (e.playerId in pts) pts[e.playerId] = round2(pts[e.playerId] + (Number(e.points) || 0));
      steps.push({ result: r, pts: Object.assign({}, pts) });
    }
    return steps;
  }
  function computeBadges() {
    const ps = state.players;
    if (!state.results.length || ps.length < 2) return [];
    const sorted = [...state.results].sort((a, b) => a.ts - b.ts);
    const v = {};
    ps.forEach((p) => { v[p.id] = { streak: 0, bestStreak: 0, seconds: 0, lasts: 0, hcWins: 0, lucky: 0, jokerBonus: 0, games: new Set(), finale: false, closed: 0 }; });
    const allGames = new Set();
    for (const r of sorted) {
      allGames.add(r.gameId);
      const losers = lastPlaceIds(r);
      const places = r.entries.map((e) => e.place);
      const allTied = Math.max(...places) === Math.min(...places);
      for (const e of r.entries) {
        const s = v[e.playerId];
        if (!s) continue;
        if (e.place === 1 && !allTied) { s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak); } else s.streak = 0;
        if (e.place === 2 && !allTied) s.seconds++;
        if (losers.includes(e.playerId)) s.lasts++;
        const hc = (r.handicaps || []).filter((h) => h.playerId === e.playerId);
        if (e.place === 1 && !allTied && hc.length) s.hcWins++;
        s.lucky += hc.filter((h) => h.itemId === 'glueck' || h.title === 'Glück gehabt').length;
        if (e.joker) s.jokerBonus = Math.max(s.jokerBonus, round2((Number(e.points) || 0) / 2));
        if ((Number(e.points) || 0) > 0) s.games.add(r.gameId);
        if (r.multiplier > 1 && e.place === 1 && !allTied) s.finale = true;
      }
    }
    const tl = timeline();
    const fin = tl[tl.length - 1].pts;
    const finLead = Math.max(...ps.map((q) => fin[q.id]));
    ps.forEach((p) => {
      let maxDef = 0;
      tl.forEach((st) => { maxDef = Math.max(maxDef, Math.max(...ps.map((q) => st.pts[q.id])) - st.pts[p.id]); });
      v[p.id].closed = round2(maxDef - (finLead - fin[p.id]));
    });
    const best = (key, min) => {
      const max = Math.max(...ps.map((p) => v[p.id][key]));
      return max >= min ? ps.filter((p) => v[p.id][key] === max).map((p) => p.id) : [];
    };
    const out = [];
    const add = (id, emoji, title, pids, text) => { if (pids.length && pids.length < ps.length) out.push({ id, emoji, title, pids, text }); };
    let ids = best('bestStreak', 3);
    if (ids.length) add('serie', '🔥', 'Seriensieger', ids, `${v[ids[0]].bestStreak} Siege in Folge`);
    ids = best('closed', 3);
    if (ids.length) add('comeback', '🚀', 'Comeback-König', ids, `${fmtPts(v[ids[0]].closed)} Punkte Rückstand aufgeholt`);
    add('finale', '⭐', 'Finalheld', ps.filter((p) => v[p.id].finale).map((p) => p.id), 'hat das Finale gewonnen');
    ids = best('jokerBonus', 2);
    if (ids.length) add('joker', '🃏', 'Joker-Profi', ids, `+${fmtPts(v[ids[0]].jokerBonus)} Punkte durch einen Joker`);
    ids = best('hcWins', 1);
    if (ids.length) add('handicap', '💪', 'Handicap-Held', ids, `${v[ids[0]].hcWins}× gewonnen trotz Handicap`);
    ids = best('seconds', 3);
    if (ids.length) add('zweiter', '🥈', 'Ewiger Zweiter', ids, `${v[ids[0]].seconds}× Platz 2`);
    ids = best('lucky', 1);
    if (ids.length) add('glueck', '🍀', 'Glückspilz', ids, `${v[ids[0]].lucky}× „Glück gehabt“ gedreht`);
    if (allGames.size >= 3) add('allround', '🎯', 'Allrounder', ps.filter((p) => v[p.id].games.size === allGames.size).map((p) => p.id), 'in jeder Disziplin gepunktet');
    ids = best('lasts', 3);
    if (ids.length) add('pech', '🐢', 'Pechvogel', ids, `${v[ids[0]].lasts}× Letzter – Kopf hoch!`);
    return out;
  }
  const badgeCard = (b) => `<div class="badge-card"><div class="b-emoji" aria-hidden="true">${esc(b.emoji)}</div><div class="b-title">${esc(b.title)}</div><div class="b-who">${b.pids.map((pid) => { const p = playerById(pid); return p ? `<span class="b-p">${avatar(p, 'xs', { crown: false })}${esc(p.name)}</span>` : ''; }).join('')}</div><div class="b-text">${esc(b.text)}</div></div>`;

  /* ---------- Rennverlauf (Punkte-Kurve) ---------- */
  function niceStep(raw) {
    if (raw <= 1) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / pow;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
  }
  function chartHtml({ tall = false } = {}) {
    const tl = timeline();
    if (tl.length < 3) return '';
    const ps = state.players;
    const W = tall ? 560 : 360, H = tall ? 300 : 220, L = 30, R = tall ? 104 : 82, T = 14, B = 30;
    const n = tl.length - 1;
    const maxPts = Math.max(1, ...tl.map((s) => Math.max(...ps.map((p) => s.pts[p.id] || 0))));
    const step = niceStep(maxPts / 4);
    const yMax = Math.ceil(maxPts / step) * step;
    const X = (i) => L + (i / n) * (W - L - R);
    const Y = (val) => T + (1 - val / yMax) * (H - T - B);
    let g = '';
    tl.forEach((s, i) => {
      if (i && s.result && s.result.multiplier > 1) {
        g += `<rect x="${X(i - 1).toFixed(1)}" y="${T}" width="${(X(i) - X(i - 1)).toFixed(1)}" height="${H - T - B}" class="ch-x2"/><text x="${((X(i - 1) + X(i)) / 2).toFixed(1)}" y="${T + 10}" class="ch-x2t" text-anchor="middle">×2</text>`;
      }
    });
    for (let val = 0; val <= yMax + 1e-9; val += step) {
      g += `<line x1="${L}" x2="${W - R}" y1="${Y(val).toFixed(1)}" y2="${Y(val).toFixed(1)}" class="ch-grid"/><text x="${L - 7}" y="${Y(val).toFixed(1)}" class="ch-tick" text-anchor="end" dominant-baseline="central">${fmtPts(val)}</text>`;
    }
    const every = n > 12 ? Math.ceil(n / 12) : 1;
    for (let i = 1; i <= n; i++) {
      if (i % every && i !== n) continue;
      const r = tl[i].result;
      const gm = gameById(r.gameId);
      g += `<text x="${X(i).toFixed(1)}" y="${H - B + 17}" class="ch-x" text-anchor="middle">${esc(gm ? gm.emoji : r.emoji)}</text>`;
    }
    const ends = [];
    ps.forEach((p) => {
      const pts = tl.map((s, i) => `${X(i).toFixed(1)},${Y(s.pts[p.id] || 0).toFixed(1)}`).join(' ');
      g += `<polyline points="${pts}" fill="none" stroke="${esc(p.color)}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
      const val = tl[n].pts[p.id] || 0;
      ends.push({ p, val, y: Y(val) });
    });
    ends.forEach((e) => { g += `<circle cx="${X(n).toFixed(1)}" cy="${e.y.toFixed(1)}" r="4.5" fill="${esc(e.p.color)}" class="ch-dot"/>`; });
    const lab = [...ends].sort((a, b) => a.y - b.y);
    const gap = tall ? 18 : 15;
    lab.forEach((e, i) => { e.ly = i && e.y - lab[i - 1].ly < gap ? lab[i - 1].ly + gap : e.y; });
    const over = lab.length ? lab[lab.length - 1].ly - (H - B) : 0;
    if (over > 0) lab.forEach((e) => { e.ly -= over; });
    const lx = X(n) + 12;
    lab.forEach((e) => {
      if (Math.abs(e.ly - e.y) > 2) g += `<line x1="${(X(n) + 5).toFixed(1)}" y1="${e.y.toFixed(1)}" x2="${(lx - 3).toFixed(1)}" y2="${e.ly.toFixed(1)}" class="ch-leader"/>`;
      g += `<text x="${lx.toFixed(1)}" y="${e.ly.toFixed(1)}" class="ch-end" dominant-baseline="central">${esc(short(e.p.name, tall ? 10 : 8))} <tspan class="ch-endv">${fmtPts(e.val)}</tspan></text>`;
    });
    g += `<line class="ch-xhair" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/>`;
    const legend = ps.map((p) => `<span class="lg"><i style="background:${esc(p.color)}"></i>${face(p)} ${esc(p.name)}</span>`).join('');
    return `<div class="chart${tall ? ' tall' : ''}" data-w="${W}" data-l="${L}" data-r="${R}" data-n="${n}"><div class="legend">${legend}</div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Punkteverlauf über ${n} Spiele">${g}</svg><div class="chart-tip" hidden></div></div>`;
  }
  // Antippen bzw. Überfahren zeigt den Stand nach jedem Spiel.
  function wireCharts(root) {
    root.querySelectorAll('.chart').forEach((c) => {
      if (c.dataset.wired) return;
      c.dataset.wired = '1';
      const svg = c.querySelector('svg');
      const tip = c.querySelector('.chart-tip');
      const xh = c.querySelector('.ch-xhair');
      const W = Number(c.dataset.w), L = Number(c.dataset.l), R = Number(c.dataset.r), n = Number(c.dataset.n);
      let hideTimer = null;
      const hide = () => { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); };
      const show = (ev) => {
        const rect = svg.getBoundingClientRect();
        const rx = ((ev.clientX - rect.left) / rect.width) * W;
        const idx = Math.max(0, Math.min(n, Math.round(((rx - L) / (W - L - R)) * n)));
        const x = L + (idx / n) * (W - L - R);
        xh.setAttribute('x1', x); xh.setAttribute('x2', x); xh.setAttribute('visibility', 'visible');
        const s = timeline()[idx];
        if (!s) return;
        const r = s.result;
        const gm = r ? gameById(r.gameId) : null;
        const head = r ? `Nach Spiel ${idx} · ${esc(gm ? gm.emoji : r.emoji)} ${esc(gm ? gm.name : r.gameName)}${r.multiplier > 1 ? ' ×2' : ''}` : 'Start';
        const list = [...state.players].sort((a, b) => (s.pts[b.id] || 0) - (s.pts[a.id] || 0))
          .map((p) => `<div class="tip-row"><i style="background:${esc(p.color)}"></i>${face(p)} ${esc(p.name)}<b>${fmtPts(s.pts[p.id] || 0)}</b></div>`).join('');
        tip.innerHTML = `<div class="tip-head">${head}</div>${list}`;
        tip.hidden = false;
        const cr = c.getBoundingClientRect();
        const px = (x / W) * rect.width + (rect.left - cr.left);
        const tw = tip.offsetWidth;
        let left = px + 12;
        if (left + tw > cr.width) left = px - tw - 12;
        tip.style.left = Math.max(0, left) + 'px';
        tip.style.top = (rect.top - cr.top + 6) + 'px';
        clearTimeout(hideTimer);
        if (ev.pointerType !== 'mouse') hideTimer = setTimeout(hide, 4000);
      };
      svg.addEventListener('pointerdown', show);
      svg.addEventListener('pointermove', show);
      svg.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse') hide(); });
    });
  }

  /* ---------- TV-Modus ---------- */
  function viewTV() {
    const rows = standings();
    const bs = boardStatus(rows);
    const trend = rankTrend();
    const slots = slotList();
    const cur = slots.find((s) => !s.result) || null;
    const last = state.results.length ? [...state.results].sort((a, b) => b.ts - a.ts)[0] : null;
    let banner = '';
    if (bs.finished && bs.hasResults) banner = '<div class="banner"><span class="b-emoji" aria-hidden="true">🏁</span><span>Alle Spiele gespielt. Gleich ist Siegerehrung!</span></div>';
    else if (bs.clinched) banner = `<div class="banner"><span class="b-emoji" aria-hidden="true">🏆</span><span><b>${esc(rows[0].p.name)}</b> ist nicht mehr einzuholen.</span></div>`;
    let next = '';
    if (cur) {
      const g = cur.game || { emoji: '❓', name: 'Gelöschtes Spiel' };
      const calls = (state.jokerCalls[cur.id] || []).map(playerById).filter(Boolean);
      const hc = state.players.filter((p) => state.wheel.current[p.id]);
      next = `<section class="tv-card tv-next"><div class="eyebrow">Als Nächstes · Spiel ${cur.index + 1} von ${slots.length}</div><div class="next-title"><span class="g-emoji" aria-hidden="true">${esc(g.emoji)}</span><div style="min-width:0"><div class="t">${esc(g.name)}</div><div class="s">${esc(cur.label)}${cur.multiplier > 1 ? ' &nbsp;<span class="badge">Finale ×2</span>' : ''}</div></div></div>${calls.length ? `<div class="tv-calls">${calls.map((p) => `<span class="tv-call">${avatar(p, 'xs', { crown: false })}${esc(p.name)} setzt den Joker</span>`).join('')}</div>` : ''}${hc.length ? `<div class="hc-list">${hc.map((p) => { const a = state.wheel.current[p.id]; return `<div class="hc-row" style="--pc:${esc(p.color)}">${avatar(p, 'sm', { crown: false })}<div><div class="hc-t">${esc(p.name)}: ${esc(a.emoji)} ${esc(a.title)}</div><div class="hc-x">${esc(a.text)}</div></div></div>`; }).join('')}</div>` : ''}</section>`;
    } else if (slots.length) {
      next = '<section class="tv-card tv-next"><div class="eyebrow">Ende der GameNight</div><div class="next-title"><span class="g-emoji" aria-hidden="true">🏆</span><div class="t">Siegerehrung</div></div></section>';
    }
    const lastGame = last ? gameById(last.gameId) : null;
    const lastHtml = last ? `<section class="tv-card tv-last"><div class="eyebrow">Zuletzt gespielt</div><div class="tv-last-line"><span>${esc(lastGame ? lastGame.emoji : last.emoji)} ${esc(lastGame ? lastGame.name : last.gameName)}</span><span class="res">${resultMini(last)}</span></div></section>` : '';
    const chart = chartHtml({ tall: true });
    return `<div class="tv-wrap"><header class="tv-head">${brandMark()}<div class="tv-title"><div class="tv-app">${esc(CFG.appName || 'GameNight')}</div><div class="tv-sub">${esc(state.session.name)}</div></div><div class="tv-tools"><button class="btn small ghost" type="button" data-act="tvFull">Vollbild</button><button class="btn small ghost" type="button" data-act="tvExit">TV-Modus beenden</button></div></header>
      <div class="tv-grid"><section class="tv-left">${trackHtml(slots, bs)}${banner}<ol class="standings" aria-label="Tabelle">${rows.map((r) => posCard(r, rows, bs, trend)).join('')}</ol></section>
      <section class="tv-right">${next}${chart ? `<section class="tv-card"><div class="eyebrow">Rennverlauf</div>${chart}</section>` : ''}${lastHtml}</section></div>
      ${!Sync.active() && !PREVIEW ? '<p class="foot">Tipp: Mit Live-Sync aktualisiert sich diese Ansicht automatisch, während ihr auf den Handys eintragt.</p>' : ''}</div>`;
  }
  function tvBanner(emoji, text, p) {
    let box = document.getElementById('tv-banners');
    if (!box) { box = document.createElement('div'); box.id = 'tv-banners'; box.className = 'tv-banners'; document.body.appendChild(box); }
    const el = document.createElement('div');
    el.className = 'tv-banner';
    el.innerHTML = `${p ? avatar(p, 'sm', { crown: false }) : ''}<span aria-hidden="true">${esc(emoji)}</span><span>${esc(text)}</span>`;
    box.appendChild(el);
    setTimeout(() => el.remove(), 5500);
  }
  // Ein Handy dreht das Glücksrad: der Fernseher zeigt es groß.
  function tvSpin(ls, list, item) {
    document.querySelectorAll('.tv-wheel').forEach((e) => e.remove());
    const p = playerById(ls.playerId);
    const items = list.items.filter((i) => i.active);
    ui.revealHold = ls.playerId;
    const el = document.createElement('div');
    el.className = 'tv-wheel';
    el.innerHTML = `<div class="tv-wheel-inner"><div class="tv-wheel-who">${avatar(p, '', { crown: false })}<span>${esc(p ? p.name : '')} dreht …</span></div><div class="wheel-stage" id="wheel-stage">${pointerSvg()}${wheelSvg(list, items)}<span class="hub" id="hub" aria-hidden="true">DREH!</span></div></div>`;
    document.body.appendChild(el);
    animateWheel(list.id, item.id, () => {
      ui.revealHold = null;
      landSound();
      showReveal(ls.playerId, item);
      setTimeout(() => el.remove(), 7000);
    });
  }
  // Der Fernseher folgt der Siegerehrung, die ein Handy steuert.
  function followStage() {
    if (!local.tv) return;
    const s = state.stage;
    const live = s && s.open && Date.now() - (s.at || 0) < 3 * 3600 * 1000 && s.id !== ui.dismissedStage;
    if (live) {
      if (!ui.stage || !ui.cer || ui.cer.id !== s.id) {
        openCeremony({ follow: true, id: s.id });
        if (!ui.cer) return;
        ui.cer.shown = Math.max(0, s.step - 1);
        ui.cer.step = ui.cer.shown;
        renderCeremony();
      }
      if (s.step > ui.cer.step) {
        ui.cer.step = s.step;
        if (!ui.cer.busy) playRevealStep(ui.cer.shown + 1);
      }
    } else if (ui.stage && ui.cer && ui.cer.follow) closeCeremony();
  }

  /* ======================================================================
     6c. HIGHER OR LOWER & BUZZER
     Beide Spiele laufen live über alle Handys. Jeder Spieler schreibt nur
     in seinen eigenen Knoten (live/holA_<id>, live/bzP_<id>), dadurch
     überschreiben sich gleichzeitige Eingaben nie gegenseitig. Der
     Spielstand selbst wird auf jedem Gerät aus diesen Eingaben berechnet.
     ====================================================================== */

  /* ---------- Wer nutzt dieses Gerät? ---------- */
  const myId = () => (local.me && playerById(local.me) ? local.me : null);
  const isHost = () => local.me === 'host';
  function roleLabel() {
    const p = myId() ? playerById(local.me) : null;
    if (p) return p.name;
    if (local.me === 'host') return 'Spielleiter';
    if (local.me === 'watch') return 'Zuschauer';
    return 'noch nicht festgelegt';
  }
  function openWhoAmI(after) {
    openSheet({
      title: 'Wer nutzt dieses Gerät?',
      body: () => `<p class="sheet-text">Damit Higher or Lower und der Buzzer wissen, wer auf diesem Handy spielt.</p>
        <div class="who-grid">${state.players.map((p) => `<button class="who-btn" type="button" data-s="me" data-v="${esc(p.id)}" aria-pressed="${local.me === p.id}" style="--pc:${esc(p.color)}">${avatar(p, '', { crown: false })}<span>${esc(p.name)}</span></button>`).join('')}</div>
        <div class="rows"><button class="row" type="button" data-s="me" data-v="host"><span class="r-label">Spielleiter<small>Liest die Fragen vor und gibt den Buzzer frei</small></span>${local.me === 'host' ? '<span class="r-val">✓</span>' : ''}</button><button class="row" type="button" data-s="me" data-v="watch"><span class="r-label">Nur zuschauen<small>Zum Beispiel der Fernseher</small></span>${local.me === 'watch' ? '<span class="r-val">✓</span>' : ''}</button></div>`,
      on: (a, el, ev, api) => {
        if (a !== 'me') return;
        local.me = el.dataset.v;
        saveLocal();
        api.close();
        render();
        if (after) after();
      },
    });
  }
  const serverNow = () => Date.now() + (Number(Sync.offset) || 0);
  const live = (k) => (state.live && state.live[k]) || null;
  const clampInt = (v, a, b, d) => { const n = Math.round(Number(v)); return isFinite(n) && n >= a && n <= b ? n : d; };
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  const hearts = (n, max) => `<span class="hearts" aria-label="${n} von ${max} Leben">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}">♥</i>`).join('')}</span>`;

  /* ---------- Higher or Lower: Karten ---------- */
  // Die mitgelieferten Karten und Fragen sind leicht verschlüsselt (gegen versehentliches Spoilern).
  function unscramble(b64) {
    const bin = atob(b64);
    const key = 'gamenight';
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    return new TextDecoder().decode(bytes);
  }
  let HOL_CATS = null;
  function holCategories() {
    if (HOL_CATS) return HOL_CATS;
    let base = [];
    try {
      if (window.GN_HOL_DATA) base = JSON.parse(unscramble(window.GN_HOL_DATA));
    } catch (e) { base = []; }
    const custom = Array.isArray(window.GN_HOL_CUSTOM) ? window.GN_HOL_CUSTOM : [];
    HOL_CATS = base.concat(custom)
      .filter((c) => c && c.id && Array.isArray(c.items))
      .map((c) => ({
        id: String(c.id), name: String(c.name || c.id), emoji: c.emoji || '🃏', unit: c.unit || '', format: c.format || 'int', note: c.note || '',
        items: c.items.map((it, i) => ({ id: String(it.id || c.id + '-' + (i + 1)), name: String(it.name || '?'), emoji: it.emoji || c.emoji || '🃏', sub: it.sub || '', value: Number(it.value) }))
          .filter((it) => isFinite(it.value)),
      }))
      .filter((c) => c.items.length >= 5);
    return HOL_CATS;
  }
  const holCat = (id) => holCategories().find((c) => c.id === id) || null;
  const holItem = (cat, id) => (cat ? cat.items.find((i) => i.id === id) || null : null);
  function holValue(cat, v) {
    let s;
    if (cat.format === 'year') s = String(Math.round(v));
    else if (cat.format === 'big') {
      if (v >= 1e9) s = (v / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' Mrd.';
      else if (v >= 1e6) s = (v / 1e6).toLocaleString('de-DE', { maximumFractionDigits: v >= 1e7 ? 1 : 2 }) + ' Mio.';
      else s = Math.round(v).toLocaleString('de-DE');
    } else s = Number(v).toLocaleString('de-DE', { maximumFractionDigits: 2 });
    return cat.unit ? s + ' ' + cat.unit : s;
  }
  function holSettings(game) {
    const h = (game && game.hol) || {};
    return { rounds: clampInt(h.rounds, 1, 9, 5), lives: clampInt(h.lives, 1, 5, 2), cards: clampInt(h.cards, 3, 20, 12) };
  }
  // Zufällige Kategorien: erst solche, die an diesem Abend noch nicht dran waren,
  // davon bevorzugt die, die insgesamt am seltensten gespielt wurden.
  function holPickCategories(n) {
    const cats = holCategories();
    const used = new Set(state.session.holUsed || []);
    const plays = state.holPlays || {};
    const pick = [];
    const takeFrom = (list) => {
      const groups = {};
      list.forEach((c) => { const k = plays[c.id] || 0; (groups[k] = groups[k] || []).push(c); });
      Object.keys(groups).map(Number).sort((a, b) => a - b)
        .forEach((k) => shuffle(groups[k]).forEach((c) => { if (pick.length < n && !pick.includes(c.id)) pick.push(c.id); }));
    };
    takeFrom(cats.filter((c) => !used.has(c.id)));
    if (pick.length < n) takeFrom(cats);
    return pick;
  }
  function holDeck(catId, cardsN) {
    const cat = holCat(catId);
    const items = shuffle(cat.items).slice(0, Math.min(cat.items.length, cardsN + 1));
    const sorted = items.slice().sort((a, b) => a.value - b.value);
    const base = sorted[Math.floor((sorted.length - 1) / 2)];
    return { cat: catId, base: base.id, cards: shuffle(items.filter((i) => i.id !== base.id)).map((i) => i.id) };
  }
  function holStart(slotId) {
    const slot = slotList().find((s) => s.id === slotId) || null;
    const game = slot && slot.game ? slot.game : state.games.find((g) => g.mode === 'hol') || null;
    const running = live('hol');
    if (running) { ui.gameOpen = 'hol'; render(); return; }
    if (!holCategories().length) { toast('Keine Higher-or-Lower-Karten gefunden (hol-data.js fehlt).'); return; }
    if (Sync.active() && !local.me) { openWhoAmI(() => holStart(slotId)); return; }
    const s = holSettings(game);
    const cats = holPickCategories(s.rounds);
    const rounds = cats.map((c) => holDeck(c, s.cards));
    const id = 'h' + uid();
    commit((st) => {
      Object.keys(st.live).forEach((k) => { if (k.indexOf('holA_') === 0) delete st.live[k]; });
      st.live.hol = { id, slotId: slot ? slot.id : null, gameId: game ? game.id : null, status: 'play', rounds, r: 0, c: 0, lives: s.lives, players: st.players.map((p) => p.id), startedAt: Date.now() };
      st.session.holUsed = (st.session.holUsed || []).concat(cats);
      cats.forEach((c) => { st.holPlays[c] = (st.holPlays[c] || 0) + 1; });
    }, { render: false });
    ui.gameOpen = 'hol';
    ui.gameSeen = id;
    ui.holSel = null;
    ui.holProxy = null;
    render();
  }
  function holAnswers(hol) {
    const out = {};
    hol.players.forEach((pid) => { const a = live('holA_' + pid); out[pid] = a && a.id === hol.id && a.a ? a.a : {}; });
    return out;
  }
  // Lücke g im aufsteigend sortierten Zeitstrahl: 0 = unter allem, n = über allem
  function holFits(tl, g, v) {
    const lo = g > 0 ? tl[g - 1].value : -Infinity;
    const hi = g < tl.length ? tl[g].value : Infinity;
    return lo <= v && v <= hi;
  }
  function holInsert(tl, card) {
    const i = tl.findIndex((x) => x.value > card.value);
    if (i < 0) tl.push(card); else tl.splice(i, 0, card);
  }
  function describeGap(tl, g) {
    if (!tl.length) return '';
    if (g >= tl.length) return `höher als ${tl[tl.length - 1].name}`;
    if (g <= 0) return `niedriger als ${tl[0].name}`;
    return `zwischen ${tl[g - 1].name} und ${tl[g].name}`;
  }
  // Rechnet den kompletten Spielstand aus den Antworten nach.
  function holDerive(hol) {
    const ans = holAnswers(hol);
    const players = hol.players.filter((pid) => playerById(pid));
    const stats = {};
    players.forEach((pid) => { stats[pid] = { wins: 0, correct: 0 }; });
    const rounds = [];
    let cur = null;
    const lastRound = Math.min(hol.r, hol.rounds.length - 1);
    for (let ri = 0; ri <= lastRound; ri++) {
      const deck = hol.rounds[ri];
      const cat = holCat(deck.cat);
      if (!cat) { rounds.push({ ri, cat: null, ended: true, winners: [] }); continue; }
      const baseItem = holItem(cat, deck.base);
      const timeline = baseItem ? [baseItem] : [];
      const lives = {};
      players.forEach((pid) => { lives[pid] = hol.lives; });
      const isCurrent = ri === hol.r;
      let ended = false;
      let winners = [];
      for (let ci = 0; ci < deck.cards.length; ci++) {
        if (isCurrent && ci > hol.c) break;
        const card = holItem(cat, deck.cards[ci]);
        if (!card) continue;
        const active = players.filter((pid) => lives[pid] > 0);
        const key = ri + ':' + ci;
        const answered = active.filter((pid) => ans[pid][key] != null);
        const info = { ri, ci, card, cat, deck, active, answered, livesBefore: Object.assign({}, lives), timelineBefore: timeline.slice() };
        if (answered.length < active.length) {
          cur = Object.assign(info, { revealed: false, lives: Object.assign({}, lives), timeline: timeline.slice() });
          break;
        }
        const res = {};
        const wrong = [];
        active.forEach((pid) => {
          const g = Number(ans[pid][key]);
          const ok = holFits(timeline, g, card.value);
          res[pid] = { gap: g, ok };
          if (ok) stats[pid].correct++; else wrong.push(pid);
        });
        // Würden alle Verbliebenen gleichzeitig rausfliegen, fliegt niemand.
        const wipeout = wrong.length > 0 && wrong.length === active.length && active.every((pid) => lives[pid] <= 1);
        if (!wipeout) wrong.forEach((pid) => { lives[pid] -= 1; });
        holInsert(timeline, card);
        const still = players.filter((pid) => lives[pid] > 0);
        if (still.length <= 1 || ci === deck.cards.length - 1) {
          ended = true;
          const maxL = Math.max(0, ...still.map((pid) => lives[pid]));
          winners = still.filter((pid) => lives[pid] === maxL);
        }
        if (isCurrent && ci === hol.c) {
          cur = Object.assign(info, { revealed: true, res, wrong, wipeout, lives: Object.assign({}, lives), timeline: timeline.slice(), ended, winners: winners.slice() });
        }
        if (ended) break;
      }
      if (ended) winners.forEach((pid) => { stats[pid].wins++; });
      rounds.push({ ri, cat, ended, winners });
    }
    return { players, stats, rounds, cur };
  }
  // Reihum: Wer anfängt, wechselt mit jeder Karte.
  function holTurn(cur) {
    const act = cur ? cur.active : [];
    if (!act.length) return { order: [], next: null };
    const off = (cur.ri + cur.ci) % act.length;
    const order = act.slice(off).concat(act.slice(0, off));
    return { order, next: order.find((pid) => !cur.answered.includes(pid)) || null };
  }
  function holStandings(d) {
    const rows = d.players.map((pid, i) => ({ pid, wins: d.stats[pid].wins, correct: d.stats[pid].correct, i }));
    rows.sort((a, b) => b.wins - a.wins || b.correct - a.correct || a.i - b.i);
    rows.forEach((r, k) => { const p = rows[k - 1]; r.place = p && p.wins === r.wins && p.correct === r.correct ? p.place : k + 1; });
    return rows;
  }
  function holSubmit(pid, gap) {
    const hol = live('hol');
    if (!hol || !playerById(pid)) return;
    const key = hol.r + ':' + hol.c;
    commit((st) => {
      const prev = st.live['holA_' + pid];
      const a = prev && prev.id === hol.id && prev.a ? Object.assign({}, prev.a) : {};
      if (a[key] != null) return;
      a[key] = Number(gap);
      st.live['holA_' + pid] = { id: hol.id, a };
    }, { render: false });
    ui.holSel = null;
    ui.holProxy = null;
    render();
  }
  function holNext() {
    const hol = live('hol');
    if (!hol) return;
    const cur = holDerive(hol).cur;
    if (!cur || !cur.revealed) return;
    commit((st) => {
      const h = st.live.hol;
      if (!h || h.id !== hol.id || h.r !== hol.r || h.c !== hol.c) return; // jemand war schneller
      if (cur.ended) {
        if (h.r >= h.rounds.length - 1) h.status = 'done';
        else { h.r += 1; h.c = 0; }
      } else h.c += 1;
    }, { render: false });
    ui.holSel = null;
    render();
  }
  function holClear() {
    commit((st) => { Object.keys(st.live).forEach((k) => { if (k === 'hol' || k.indexOf('holA_') === 0) delete st.live[k]; }); }, { render: false });
    ui.gameOpen = null;
    render();
  }
  function holSaveResult() {
    const hol = live('hol');
    if (!hol) return;
    const rows = holStandings(holDerive(hol));
    const order = rows.map((r) => r.pid);
    const ties = rows.slice(1).map((r, k) => r.place === rows[k].place);
    state.players.forEach((p) => { if (!order.includes(p.id)) { order.push(p.id); ties.push(false); } });
    const slot = slotList().find((s) => s.id === hol.slotId) || null;
    const gameId = (slot && slot.gameId) || hol.gameId;
    if (!gameId || !gameById(gameId)) { toast('Das Spiel gibt es nicht mehr.'); return; }
    const existing = slot ? state.results.find((r) => r.slotId === slot.id) || null : null;
    const draft = { gameId, mult: slot ? slot.multiplier : 1, order, ties, raw: {}, jokers: slot ? (state.jokerCalls[slot.id] || []).slice() : [] };
    if (!saveResult(draft, slot, existing)) return;
    holClear();
  }

  function holLineHtml(cur, selectable) {
    const tl = cur.revealed ? cur.timeline : cur.timelineBefore;
    const cat = cur.cat;
    const baseId = cur.deck.base;
    const item = (it) => `<li class="tl-item${cur.revealed && it.id === cur.card.id ? ' new' : ''}${it.id === baseId ? ' base' : ''}"><span class="e" aria-hidden="true">${esc(it.emoji)}</span><span class="n">${esc(it.name)}${it.id === baseId ? ' <small>Start</small>' : ''}</span><span class="v">${esc(holValue(cat, it.value))}</span></li>`;
    const gap = (g) => (selectable
      ? `<li class="gap-li"><button class="tl-gap${ui.holSel === g ? ' on' : ''}" type="button" data-g="gap" data-i="${g}" aria-pressed="${ui.holSel === g}" aria-label="${esc(describeGap(tl, g))}">${ui.holSel === g ? '✓ Hier einordnen' : '+ hier'}</button></li>`
      : '');
    let html = '';
    if (local.tv) {
      for (let g = 0; g <= tl.length; g++) { html += gap(g); if (g < tl.length) html += item(tl[g]); }
      return `<div class="tl-wrap h"><div class="tl-axis" aria-hidden="true"><span>Niedrig</span><i></i><span>Hoch</span></div><ol class="hol-line">${html}</ol></div>`;
    }
    for (let g = tl.length; g >= 0; g--) { html += gap(g); if (g > 0) html += item(tl[g - 1]); }
    return `<div class="tl-wrap"><div class="tl-end">▲ Höher</div><ol class="hol-line">${html}</ol><div class="tl-end">▼ Niedriger</div></div>`;
  }
  function gameHead(inner, extra = '') {
    return `<header class="g-head"><button class="icon-btn" type="button" data-g="min" aria-label="Zurück zur Tabelle">${ICON.x}</button><div class="g-titles">${inner}</div>${extra}</header>`;
  }
  function holHtml(hol) {
    const d = holDerive(hol);
    const total = hol.rounds.length;
    if (hol.status === 'done') return holFinalHtml(hol, d);
    const cur = d.cur;
    if (!cur) return gameHead('<div class="g-title">Higher or Lower</div>') + '<p class="sheet-text">Die Karten konnten nicht geladen werden.</p><button class="link-btn g-abort" type="button" data-g="abort">Spiel abbrechen</button>';
    const cat = cur.cat;
    const turn = holTurn(cur);
    const me = myId();
    const syncing = Sync.active();
    const nextP = playerById(turn.next);
    let canAct = false;
    if (!cur.revealed && nextP) {
      if (!syncing) canAct = ui.holReady === `${hol.id}:${cur.ri}:${cur.ci}:${turn.next}`;
      else canAct = me === turn.next || ui.holProxy === turn.next;
    }
    const strip = d.players.map((pid) => {
      const p = playerById(pid);
      const lv = cur.lives[pid];
      const wasActive = cur.active.includes(pid);
      let st;
      if (!wasActive) st = '<span class="st out">raus</span>';
      else if (cur.revealed) st = cur.res[pid].ok ? '<span class="st ok">richtig</span>' : `<span class="st bad">falsch${lv === 0 ? ' · raus' : ''}</span>`;
      else if (cur.answered.includes(pid)) st = '<span class="st ok">✓ gewählt</span>';
      else if (pid === turn.next) st = '<span class="st now">ist dran</span>';
      else st = '<span class="st">wartet</span>';
      return `<div class="hp${pid === turn.next && !cur.revealed ? ' now' : ''}${lv === 0 ? ' out' : ''}${pid === me ? ' me' : ''}" style="--pc:${esc(p.color)}"${pid === me ? ' title="Das bist du"' : ''}>${avatar(p, 'sm', { crown: false })}<div class="hp-t"><b>${esc(p.name)}</b><span class="hp-m">${hearts(lv, hol.lives)}<span class="hp-w" title="gewonnene Runden">🏆${d.stats[pid].wins}</span></span>${st}</div></div>`;
    }).join('');
    const card = cur.card;
    const cardHtml = `<section class="hol-card${cur.revealed ? ' revealed' : ''}"><div class="hc-k">Karte ${cur.ci + 1} von ${cur.deck.cards.length}</div><div class="hc-e" aria-hidden="true">${esc(card.emoji)}</div><div class="hc-n">${esc(card.name)}</div>${card.sub ? `<div class="hc-s">${esc(card.sub)}</div>` : ''}<div class="hc-v${cur.revealed ? '' : ' q'}">${cur.revealed ? esc(holValue(cat, card.value)) : '?'}</div></section>`;
    let prompt = '';
    let foot = '';
    if (cur.revealed) {
      const rows = cur.active.map((pid) => {
        const p = playerById(pid);
        const r = cur.res[pid];
        return `<div class="rv-row ${r.ok ? 'ok' : 'bad'}">${avatar(p, 'xs', { crown: false })}<b>${esc(p.name)}</b><span class="rv-g">${esc(describeGap(cur.timelineBefore, r.gap))}</span><span class="rv-m">${r.ok ? '✓' : cur.wipeout ? '✗' : '✗ −1 ♥'}</span></div>`;
      }).join('');
      let msg = cur.wipeout ? '<p class="rv-msg">Alle lagen falsch – deshalb fliegt diesmal niemand raus.</p>' : '';
      if (cur.ended) {
        const w = cur.winners.map(playerById).filter(Boolean);
        msg += `<p class="rv-win">${w.length > 1 ? 'Runde geteilt: ' + w.map((x) => esc(x.name)).join(' & ') : '🏆 Runde an ' + esc(w[0] ? w[0].name : '–') + '!'}</p>`;
      }
      prompt = `<section class="rv" aria-live="polite">${rows}${msg}</section>`;
      const label = cur.ended ? (cur.ri >= total - 1 ? 'Zum Endstand' : 'Nächste Runde') : 'Nächste Karte';
      foot = `<button class="btn primary block" type="button" data-g="next">${label}</button>`;
    } else if (canAct) {
      const who = syncing && me === turn.next ? 'Du bist dran!' : `${esc(nextP.name)} ist dran.`;
      prompt = `<p class="g-prompt"><b>${who}</b> Tippe auf die Lücke, in die die Karte gehört.</p>`;
      foot = `<button class="btn primary block" type="button" data-g="confirm"${ui.holSel == null ? ' disabled' : ''}>Festlegen</button>`;
    } else if (!syncing && nextP) {
      prompt = `<div class="handoff" style="--pc:${esc(nextP.color)}">${avatar(nextP, 'lg', { crown: false })}<p>Gib das Handy an <b>${esc(nextP.name)}</b>. Die anderen schauen weg.</p><button class="btn primary" type="button" data-g="ready">Ich bin ${esc(nextP.name)} – los</button></div>`;
    } else if (nextP) {
      prompt = `<p class="g-prompt wait">${avatar(nextP, 'xs', { crown: false })}<b>${esc(nextP.name)}</b> ist dran …</p>${local.tv ? '' : `<button class="link-btn g-proxy" type="button" data-g="proxy">${esc(nextP.name)} hat kein Handy? Hier für ${esc(nextP.name)} tippen</button>`}`;
    }
    return gameHead(`<div class="eyebrow">Higher or Lower · Runde ${cur.ri + 1} von ${total}</div><div class="g-title">${esc(cat.emoji)} ${esc(cat.name)}</div>${cat.note ? `<div class="g-note">${esc(cat.note)}</div>` : ''}`)
      + `<div class="hol-players">${strip}</div><div class="hol-main">${cardHtml}<div class="hol-side">${prompt}${holLineHtml(cur, canAct)}</div></div>`
      + (foot ? `<div class="g-foot">${foot}</div>` : '')
      + (local.tv ? '' : '<button class="link-btn g-abort" type="button" data-g="abort">Spiel abbrechen</button>');
  }
  function holFinalHtml(hol, d) {
    const rows = holStandings(d);
    const firsts = rows.filter((r) => r.place === 1);
    const title = firsts.length === 1 ? `${esc(playerById(firsts[0].pid).name)} gewinnt!` : 'Gleichstand an der Spitze!';
    const list = rows.map((r) => {
      const p = playerById(r.pid);
      return `<div class="fin-row" style="--pc:${esc(p.color)}"><span class="pl">${r.place}.</span>${avatar(p, 'sm', { crown: false })}<b>${esc(p.name)}</b><span class="muted">${r.wins} ${plural(r.wins, 'Runde', 'Runden')} · ${r.correct} richtig</span></div>`;
    }).join('');
    const rounds = d.rounds.map((r) => `<div class="fin-round"><span>${r.cat ? esc(r.cat.emoji + ' ' + r.cat.name) : 'Runde ' + (r.ri + 1)}</span><b>${r.winners.map(playerById).filter(Boolean).map((p) => esc(p.name)).join(' & ') || '–'}</b></div>`).join('');
    const slot = slotList().find((s) => s.id === hol.slotId);
    const canSave = !!(slot || (hol.gameId && gameById(hol.gameId)));
    return gameHead(`<div class="eyebrow">Higher or Lower · Endstand</div><div class="g-title">${title}</div>`)
      + `<section class="fin">${list}</section><section class="fin-rounds"><div class="eyebrow">Rundensieger</div>${rounds}</section>`
      + (local.tv ? '' : `<div class="g-foot">${canSave ? `<button class="btn primary block" type="button" data-g="save">${slot && slot.result ? 'Ergebnis aktualisieren' : 'Ergebnis eintragen'}</button>` : ''}<button class="btn ghost block" type="button" data-g="end">Schließen ohne Eintragen</button></div>`);
  }

  /* ---------- Buzzer ---------- */
  function buzzStart(slotId) {
    const slot = slotList().find((s) => s.id === slotId) || null;
    const game = slot && slot.game ? slot.game : state.games.find((g) => g.buzzer) || null;
    if (Sync.active() && !local.me) { openWhoAmI(() => buzzStart(slotId)); return; }
    if (!live('bz')) {
      const id = 'b' + uid();
      commit((st) => {
        Object.keys(st.live).forEach((k) => { if (k.indexOf('bzP_') === 0) delete st.live[k]; });
        st.live.bz = { id, slotId: slot ? slot.id : null, gameId: game ? game.id : null, q: 1, qid: id + ':1', open: false, openedAt: 0, winner: null, order: [], locked: [], scores: {} };
      }, { render: false });
      ui.bzSeen = id;
    }
    ui.gameOpen = 'bz';
    render();
  }
  const buzzOf = (pid) => live('bzP_' + pid);
  function validBuzzes(bz) {
    return state.players
      .map((p) => ({ pid: p.id, b: buzzOf(p.id) }))
      .filter((x) => x.b && x.b.q === bz.qid && x.b.o === bz.openedAt && !bz.locked.includes(x.pid))
      .sort((a, b) => a.b.t - b.b.t);
  }
  function buzzPress() {
    const bz = live('bz');
    const me = myId();
    if (!bz || !me) return;
    audioCtx();
    if (bz.winner || bz.locked.includes(me) || (ui.bzEarly[me] || 0) > Date.now()) return;
    if (!bz.open) {
      ui.bzEarly[me] = Date.now() + 2000;
      renderGame();
      setTimeout(renderGame, 2050);
      return;
    }
    const prev = buzzOf(me);
    if (prev && prev.q === bz.qid && prev.o === bz.openedAt) return;
    const t = serverNow();
    commit((st) => { st.live['bzP_' + me] = { q: bz.qid, o: bz.openedAt, t }; }, { render: false });
    if (navigator.vibrate) { try { navigator.vibrate(25); } catch (e) { /* egal */ } }
    render();
  }
  // Ein-Gerät-Modus: alle tippen auf denselben Bildschirm, der erste Finger gewinnt.
  function buzzBoardPress(pid) {
    const bz = live('bz');
    const p = playerById(pid);
    if (!bz || !p) return;
    audioCtx();
    if (bz.winner || bz.locked.includes(pid) || (ui.bzEarly[pid] || 0) > Date.now()) return;
    if (!bz.open) {
      ui.bzEarly[pid] = Date.now() + 2000;
      toast(`Frühstart von ${p.name} – 2 Sekunden gesperrt`);
      renderGame();
      setTimeout(renderGame, 2050);
      return;
    }
    commit((st) => { const b = st.live.bz; if (!b || b.winner || !b.open) return; b.winner = pid; b.open = false; b.order = [pid]; }, { render: false });
    render();
  }
  // Nur der Spielleiter entscheidet, wer zuerst war: nach der ersten Meldung wartet
  // er kurz, ob noch ein früherer Druck (langsamere Verbindung) eintrifft.
  let bzTimer = null;
  function buzzerHostCheck(bz) {
    if (!Sync.active() || !isHost() || !bz.open || bz.winner || bzTimer) return;
    if (!validBuzzes(bz).length) return;
    bzTimer = setTimeout(() => {
      bzTimer = null;
      const cur = live('bz');
      if (!cur || cur.id !== bz.id || cur.qid !== bz.qid || cur.openedAt !== bz.openedAt || cur.winner || !cur.open) return;
      const v = validBuzzes(cur);
      if (!v.length) return;
      commit((st) => { const b = st.live.bz; if (!b || b.winner) return; b.winner = v[0].pid; b.open = false; b.order = v.map((x) => x.pid); }, { render: false });
      render();
    }, 400);
  }
  function buzzerFx(bz) {
    const key = bz && bz.winner ? `${bz.qid}:${bz.openedAt}:${bz.winner}` : null;
    if (key === ui.bzFx) return;
    ui.bzFx = key;
    if (!key || ui.booting) return;
    buzzSound();
    if (navigator.vibrate) { try { navigator.vibrate([90, 40, 140]); } catch (e) { /* egal */ } }
  }
  function bzMutate(fn) { commit((st) => { if (st.live.bz) fn(st.live.bz, st); }, { render: false }); render(); }
  function bzNextQ(b) { b.q += 1; b.qid = b.id + ':' + b.q; b.open = false; b.openedAt = 0; b.winner = null; b.order = []; b.locked = []; }
  const bzOpen = () => { audioCtx(); bzMutate((b) => { b.open = true; b.openedAt = serverNow(); b.winner = null; b.order = []; }); };
  const bzRight = () => bzMutate((b) => { if (!b.winner) return; b.scores[b.winner] = (b.scores[b.winner] || 0) + 1; bzNextQ(b); });
  const bzWrong = () => bzMutate((b, st) => {
    if (!b.winner) return;
    b.locked = b.locked.concat(b.winner);
    b.winner = null;
    b.order = [];
    if (b.locked.length >= st.players.length) bzNextQ(b);
    else { b.open = true; b.openedAt = serverNow(); }
  });
  const bzSkip = () => bzMutate((b) => bzNextQ(b));
  const bzScore = (pid, d) => bzMutate((b) => { b.scores[pid] = Math.max(0, (b.scores[pid] || 0) + d); });
  function bzClear() {
    commit((st) => { Object.keys(st.live).forEach((k) => { if (k === 'bz' || k.indexOf('bzP_') === 0) delete st.live[k]; }); }, { render: false });
    ui.gameOpen = null;
    render();
  }
  function bzSave() {
    const bz = live('bz');
    if (!bz) return;
    const slot = slotList().find((s) => s.id === bz.slotId) || null;
    const game = gameById((slot && slot.gameId) || bz.gameId);
    if (!game) { toast('Das Spiel gibt es nicht mehr.'); return; }
    const pids = state.players.map((p) => p.id);
    const raw = {};
    pids.forEach((pid) => { raw[pid] = bz.scores[pid] || 0; });
    const jokers = slot ? (state.jokerCalls[slot.id] || []).slice() : [];
    let draft;
    if (game.scoring === 'free') draft = { gameId: game.id, mult: slot ? slot.multiplier : 1, order: [], ties: [], raw, jokers };
    else {
      const order = pids.slice().sort((a, b) => raw[b] - raw[a]);
      draft = { gameId: game.id, mult: slot ? slot.multiplier : 1, order, ties: order.slice(1).map((pid, i) => raw[pid] === raw[order[i]]), raw: {}, jokers };
    }
    const existing = slot ? state.results.find((r) => r.slotId === slot.id) || null : null;
    if (!saveResult(draft, slot, existing)) return;
    bzClear();
  }
  function buzzHtml(bz) {
    const syncing = Sync.active();
    const me = myId();
    const host = !syncing || isHost();
    const game = gameById(bz.gameId);
    const winner = bz.winner ? playerById(bz.winner) : null;
    const head = gameHead(`<div class="eyebrow">Buzzer${game ? ' · ' + esc(game.name) : ''}</div><div class="g-title">Frage ${bz.q}</div>`,
      syncing && !local.tv ? `<button class="link-btn role-btn" type="button" data-g="role">${esc(roleLabel())}</button>` : '');
    let orderHtml = '';
    if (winner && bz.order && bz.order.length > 1) {
      const t0 = (buzzOf(bz.winner) || {}).t || 0;
      orderHtml = `<div class="bz-order">${bz.order.slice(1).map((pid) => {
        const p = playerById(pid);
        const dt = (((buzzOf(pid) || {}).t || t0) - t0) / 1000;
        return p ? `<span>${esc(p.name)} +${dt.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s</span>` : '';
      }).join('')}</div>`;
    }
    const winHtml = winner ? `<div class="bz-win" style="--pc:${esc(winner.color)}">${avatar(winner, 'xl', { crown: false })}<div class="bz-wn">${esc(winner.name)}</div><div class="bz-ws">${me === winner.id ? 'Du warst am schnellsten!' : 'war am schnellsten'}</div>${orderHtml}</div>` : '';
    const scores = `<div class="bz-scores">${state.players.map((p) => `<div class="bz-sc" style="--pc:${esc(p.color)}">${avatar(p, 'xs', { crown: false })}<span class="nm">${esc(p.name)}</span><b>${bz.scores[p.id] || 0}</b>${host && !local.tv ? `<button class="icon-btn" type="button" data-g="sc" data-pid="${esc(p.id)}" data-d="-1" aria-label="Punkt abziehen">−</button><button class="icon-btn" type="button" data-g="sc" data-pid="${esc(p.id)}" data-d="1" aria-label="Punkt geben">+</button>` : ''}</div>`).join('')}</div>`;
    const hostCtl = () => {
      let ctl;
      if (winner) ctl = '<button class="btn primary" type="button" data-g="bz-right">Richtig +1</button><button class="btn danger" type="button" data-g="bz-wrong">Falsch</button>';
      else if (bz.open) ctl = '<button class="btn ghost" type="button" data-g="bz-skip">Keiner weiß es – nächste Frage</button>';
      else ctl = '<button class="btn primary bz-go" type="button" data-g="bz-open">Freigeben</button><button class="btn ghost" type="button" data-g="bz-skip">Frage überspringen</button>';
      return `<div class="bz-ctl">${ctl}</div>`;
    };
    const statusLine = bz.open ? '<div class="bz-status open">Buzzer ist offen …</div>'
      : `<div class="bz-status">${bz.locked.length ? '' : 'Frage vorlesen, dann freigeben'}</div>`;
    const foot = `<div class="g-foot two"><button class="btn primary" type="button" data-g="bz-save">Ergebnis eintragen</button><button class="btn ghost" type="button" data-g="bz-end">Beenden</button></div>`;
    if (!syncing) {
      const tiles = state.players.map((p) => {
        const early = (ui.bzEarly[p.id] || 0) > Date.now();
        return `<button class="bz-tile${bz.winner === p.id ? ' win' : ''}${bz.locked.includes(p.id) || early ? ' locked' : ''}${bz.open ? ' open' : ''}" type="button" data-g="tile" data-pid="${esc(p.id)}" style="--pc:${esc(p.color)}">${avatar(p, 'lg', { crown: false })}<span>${esc(p.name)}</span>${early ? '<small>Frühstart!</small>' : bz.locked.includes(p.id) ? '<small>gesperrt</small>' : ''}</button>`;
      }).join('');
      return head + (winHtml || statusLine) + `<div class="bz-tiles">${tiles}</div>` + hostCtl() + scores + foot;
    }
    if (me) {
      const early = (ui.bzEarly[me] || 0) > Date.now();
      const mine = buzzOf(me);
      const pressed = mine && mine.q === bz.qid && mine.o === bz.openedAt && bz.open;
      let cls = 'wait', label = 'BUZZ', sub = 'Warte auf die Freigabe …';
      if (bz.locked.includes(me)) { cls = 'locked'; label = 'Gesperrt'; sub = 'Du hattest diese Frage falsch.'; }
      else if (early) { cls = 'locked'; label = 'Frühstart!'; sub = '2 Sekunden gesperrt'; }
      else if (pressed) { cls = 'pressed'; label = 'Gedrückt!'; sub = 'Mal sehen, ob du der Schnellste warst …'; }
      else if (bz.open) { cls = 'open'; label = 'BUZZ!'; sub = 'Jetzt drücken!'; }
      const p = playerById(me);
      return head + (winHtml || `<div class="bz-zone"><button class="bz-btn ${cls}" type="button" data-g="buzz" style="--pc:${esc(p.color)}">${label}</button><p class="bz-sub">${sub}</p></div>`) + scores;
    }
    if (host && !local.tv) return head + (winHtml || statusLine) + hostCtl() + scores + foot;
    return head + (winHtml || statusLine) + scores
      + (local.tv ? '' : '<p class="note" style="text-align:center">Dieses Gerät schaut nur zu. Oben rechts kannst du einen Spieler oder den Spielleiter wählen.</p>');
  }

  /* ---------- Bluff ----------
     Jeder schreibt heimlich eine Lüge in seinen eigenen Knoten live/blA_<id>
     ({ id, l: { Frage: Text }, v: { Frage: gewählte Antwort } }). Antwortliste,
     Punkte und Phase werden auf jedem Gerät gleich daraus berechnet. */
  let BLUFF_QS = null;
  function bluffQuestions() {
    if (BLUFF_QS) return BLUFF_QS;
    let base = [];
    try {
      if (window.GN_BLUFF_DATA) base = JSON.parse(unscramble(window.GN_BLUFF_DATA));
    } catch (e) { base = []; }
    const custom = (Array.isArray(window.GN_BLUFF_CUSTOM) ? window.GN_BLUFF_CUSTOM : [])
      .map((c, i) => Object.assign({ id: 'eigene-' + (i + 1), cat: 'Eigene Fragen' }, c));
    const seen = new Set();
    BLUFF_QS = base.concat(custom)
      .filter((c) => c && typeof c.q === 'string' && c.q.split('____').length === 2 && c.a)
      .map((c) => ({
        id: String(c.id), cat: String(c.cat || 'Bluff'), q: String(c.q).trim(), a: String(c.a).trim(),
        alt: Array.isArray(c.alt) ? c.alt.map(String) : [],
        lies: Array.isArray(c.lies) ? c.lies.map(String).filter((x) => x.trim()) : [],
        src: typeof c.src === 'string' && /^https?:\/\//.test(c.src) ? c.src : '',
      }))
      .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
    return BLUFF_QS;
  }
  const bluffQ = (id) => bluffQuestions().find((c) => c.id === id) || null;
  function bluffSettings(game) {
    const b = (game && game.bluff) || {};
    return { questions: clampInt(b.questions, 1, 12, 6), doubleLast: b.doubleLast !== false, suggest: b.suggest !== false };
  }
  const BLUFF_TRUTH = 2; // Punkte, wenn man die Wahrheit findet
  const BLUFF_FOOL = 1;  // Punkte pro Mitspieler, der auf die eigene Lüge reinfällt

  // Einheitliche Schreibweise, damit man eine Lüge nicht an Kleinigkeiten erkennt
  function bluffFmt(s) {
    let t = String(s || '').replace(/\s+/g, ' ').trim().replace(/[.!?,;:]+$/, '').trim();
    if (t) t = t.charAt(0).toLocaleUpperCase('de-DE') + t.slice(1);
    return t.slice(0, 40);
  }
  function bluffNorm(s) {
    return String(s || '').toLocaleLowerCase('de-DE')
      .replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\b(der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines)\b/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function editDistance(a, b) {
    const m = a.length, n = b.length;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const row = [i];
      for (let j = 1; j <= n; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = row;
    }
    return prev[n];
  }
  // Hat jemand aus Versehen (fast) die Wahrheit geschrieben?
  function bluffTooClose(text, q) {
    const nc = bluffNorm(text).replace(/ /g, '');
    if (!nc || !q) return false;
    return [q.a].concat(q.alt || []).some((x) => {
      const tc = bluffNorm(x).replace(/ /g, '');
      if (!tc) return false;
      if (nc === tc) return true;
      if (tc.length >= 4 && nc.includes(tc)) return true;
      if (nc.length >= 4 && tc.includes(nc) && nc.length >= tc.length * 0.6) return true;
      const tol = tc.length >= 8 ? 2 : tc.length >= 5 ? 1 : 0;
      return tol > 0 && Math.abs(nc.length - tc.length) <= tol && editDistance(nc, tc) <= tol;
    });
  }
  // Fragen, die am seltensten dran waren, möglichst aus verschiedenen Themen
  function bluffPick(n) {
    const plays = state.bluffPlays || {};
    const sorted = shuffle(bluffQuestions()).sort((a, b) => (plays[a.id] || 0) - (plays[b.id] || 0));
    if (!sorted.length) return [];
    const min = plays[sorted[0].id] || 0;
    const pick = [];
    const cats = new Set();
    sorted.forEach((q) => { if (pick.length < n && (plays[q.id] || 0) === min && !cats.has(q.cat)) { pick.push(q.id); cats.add(q.cat); } });
    sorted.forEach((q) => { if (pick.length < n && !pick.includes(q.id)) pick.push(q.id); });
    return shuffle(pick);
  }
  function bluffResetUi() { ui.blSel = null; ui.blProxy = null; ui.blReady = null; ui.blWarn = null; }
  function bluffStart(slotId) {
    const slot = slotList().find((s) => s.id === slotId) || null;
    const game = slot && slot.game ? slot.game : state.games.find((g) => g.mode === 'bluff') || null;
    if (live('bluff')) { ui.gameOpen = 'bluff'; render(); return; }
    if (!bluffQuestions().length) { toast('Keine Bluff-Fragen gefunden (bluff-data.js fehlt).'); return; }
    if (Sync.active() && !local.me) { openWhoAmI(() => bluffStart(slotId)); return; }
    const s = bluffSettings(game);
    const qs = bluffPick(s.questions);
    const id = 'f' + uid();
    commit((st) => {
      Object.keys(st.live).forEach((k) => { if (k.indexOf('blA_') === 0) delete st.live[k]; });
      st.live.bluff = { id, slotId: slot ? slot.id : null, gameId: game ? game.id : null, status: 'play', qs, i: 0, players: st.players.map((p) => p.id), dbl: s.doubleLast, sug: s.suggest, startedAt: Date.now() };
      st.bluffPlays[qs[0]] = (st.bluffPlays[qs[0]] || 0) + 1;
    }, { render: false });
    ui.gameOpen = 'bluff';
    ui.bluffSeen = id;
    bluffResetUi();
    render();
  }
  function bluffAnswers(bl) {
    const out = {};
    bl.players.forEach((pid) => {
      const a = live('blA_' + pid);
      out[pid] = a && a.id === bl.id ? { l: a.l || {}, v: a.v || {} } : { l: {}, v: {} };
    });
    return out;
  }
  // Gleiche „zufällige“ Reihenfolge auf allen Geräten
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // Rechnet den kompletten Spielstand aus den Antworten nach.
  function bluffDerive(bl) {
    const ans = bluffAnswers(bl);
    const players = bl.players.filter((pid) => playerById(pid));
    const totals = {};
    const stats = {};
    players.forEach((pid) => { totals[pid] = 0; stats[pid] = { truth: 0, fooled: 0 }; });
    const done = [];
    let cur = null;
    const last = Math.min(bl.i, bl.qs.length - 1);
    for (let qi = 0; qi <= last; qi++) {
      const q = bluffQ(bl.qs[qi]);
      const mult = bl.dbl && bl.qs.length > 1 && qi === bl.qs.length - 1 ? 2 : 1;
      const gains = {};
      players.forEach((pid) => { gains[pid] = 0; });
      if (!q) {
        if (qi === bl.i) cur = { qi, q: null, mult, phase: 'reveal', options: [], votes: {}, gains, writing: [], voting: [], lies: {} };
        continue;
      }
      const lies = {};
      players.forEach((pid) => { const t = ans[pid].l[qi]; if (typeof t === 'string' && bluffNorm(t)) lies[pid] = bluffFmt(t); });
      const writing = players.filter((pid) => lies[pid] == null);
      let options = [];
      const votes = {};
      let voting = [];
      if (!writing.length) {
        const groups = {};
        players.forEach((pid) => {
          const k = bluffNorm(lies[pid]);
          if (!groups[k]) groups[k] = { key: 'L' + pid, text: lies[pid], authors: [], truth: false };
          groups[k].authors.push(pid);
        });
        options = Object.keys(groups).map((k) => groups[k]).concat([{ key: 'T', text: bluffFmt(q.a), authors: [], truth: true }]);
        options.sort((a, b) => hashStr(bl.id + ':' + qi + ':' + a.key) - hashStr(bl.id + ':' + qi + ':' + b.key));
        players.forEach((pid) => {
          const v = ans[pid].v[qi];
          const o = options.find((x) => x.key === v);
          if (o && !o.authors.includes(pid)) votes[pid] = v;
        });
        voting = players.filter((pid) => votes[pid] == null);
      }
      const phase = writing.length ? 'write' : voting.length ? 'vote' : 'reveal';
      if (phase === 'reveal') {
        players.forEach((pid) => {
          const o = options.find((x) => x.key === votes[pid]);
          if (!o) return;
          if (o.truth) { gains[pid] += BLUFF_TRUTH * mult; stats[pid].truth++; }
          else o.authors.forEach((a) => { gains[a] += BLUFF_FOOL * mult; stats[a].fooled++; });
        });
        players.forEach((pid) => { totals[pid] += gains[pid]; });
        done.push({ qi, q, options, votes });
      }
      if (qi === bl.i) cur = { qi, q, mult, phase, options, votes, gains, writing, voting, lies };
    }
    return { players, totals, stats, done, cur };
  }
  function bluffStandings(d) {
    const rows = d.players.map((pid, i) => ({ pid, pts: d.totals[pid], truth: d.stats[pid].truth, fooled: d.stats[pid].fooled, i }));
    rows.sort((a, b) => b.pts - a.pts || a.i - b.i);
    rows.forEach((r, k) => { const p = rows[k - 1]; r.place = p && p.pts === r.pts ? p.place : k + 1; });
    return rows;
  }
  // Wer ist beim Herumreichen als Nächstes dran? Die Reihenfolge wechselt mit jeder Frage.
  function bluffOrder(d) {
    const ps = d.players;
    if (!ps.length || !d.cur) return [];
    const off = d.cur.qi % ps.length;
    return ps.slice(off).concat(ps.slice(0, off));
  }
  function bluffMutateMine(pid, fn) {
    const bl = live('bluff');
    if (!bl || !playerById(pid)) return false;
    let changed = false;
    commit((st) => {
      const prev = st.live['blA_' + pid];
      const base = prev && prev.id === bl.id ? prev : { id: bl.id, l: {}, v: {} };
      const next = { id: bl.id, l: Object.assign({}, base.l || {}), v: Object.assign({}, base.v || {}) };
      if (fn(next) === false) return;
      st.live['blA_' + pid] = next;
      changed = true;
    }, { render: false });
    return changed;
  }
  function bluffWrite(pid, text) {
    const bl = live('bluff');
    if (!bl) return false;
    const qi = bl.i;
    const q = bluffQ(bl.qs[qi]);
    const t = bluffFmt(text);
    if (!bluffNorm(t)) { ui.blWarn = 'Schreib zuerst eine Antwort.'; renderGame(); return false; }
    if (bluffTooClose(t, q)) { ui.blWarn = 'Zu nah an der Wahrheit! Denk dir etwas anderes aus.'; renderGame(); return false; }
    bluffMutateMine(pid, (n) => { if (n.l[qi] != null) return false; n.l[qi] = t; return true; });
    ui.blWarn = null;
    ui.blProxy = null;
    ui.blReady = null;
    ui.blDraft = null;
    render();
    return true;
  }
  function bluffVote(pid, key) {
    const bl = live('bluff');
    if (!bl || !key) return false;
    const d = bluffDerive(bl);
    const o = d.cur && d.cur.phase === 'vote' ? d.cur.options.find((x) => x.key === key) : null;
    if (!o || o.authors.includes(pid)) return false;
    const qi = bl.i;
    bluffMutateMine(pid, (n) => { if (n.v[qi] != null) return false; n.v[qi] = key; return true; });
    ui.blSel = null;
    ui.blProxy = null;
    ui.blReady = null;
    render();
    return true;
  }
  function bluffSuggest(pid) {
    const bl = live('bluff');
    if (!bl) return '';
    const d = bluffDerive(bl);
    const q = d.cur && d.cur.q;
    if (!q || !q.lies.length) return '';
    const taken = Object.keys(d.cur.lies).filter((x) => x !== pid).map((x) => bluffNorm(d.cur.lies[x]));
    const key = `${bl.id}:${bl.i}:${pid}`;
    const start = Math.max(0, bl.players.indexOf(pid));
    let n = ui.blSug[key] == null ? 0 : ui.blSug[key] + 1;
    for (let k = 0; k < q.lies.length; k++, n++) {
      const cand = q.lies[(start + n) % q.lies.length];
      if (!taken.includes(bluffNorm(cand)) && !bluffTooClose(cand, q)) { ui.blSug[key] = n; return bluffFmt(cand); }
    }
    return '';
  }
  function bluffNext() {
    const bl = live('bluff');
    if (!bl) return;
    const cur = bluffDerive(bl).cur;
    if (!cur || cur.phase !== 'reveal') return;
    commit((st) => {
      const b = st.live.bluff;
      if (!b || b.id !== bl.id || b.i !== bl.i) return; // jemand war schneller
      if (b.i >= b.qs.length - 1) b.status = 'done';
      else {
        b.i += 1;
        const nq = b.qs[b.i];
        st.bluffPlays[nq] = (st.bluffPlays[nq] || 0) + 1;
      }
    }, { render: false });
    bluffResetUi();
    render();
  }
  function bluffClear() {
    commit((st) => { Object.keys(st.live).forEach((k) => { if (k === 'bluff' || k.indexOf('blA_') === 0) delete st.live[k]; }); }, { render: false });
    ui.gameOpen = null;
    render();
  }
  function bluffSaveResult() {
    const bl = live('bluff');
    if (!bl) return;
    const rows = bluffStandings(bluffDerive(bl));
    const order = rows.map((r) => r.pid);
    const ties = rows.slice(1).map((r, k) => r.place === rows[k].place);
    state.players.forEach((p) => { if (!order.includes(p.id)) { order.push(p.id); ties.push(false); } });
    const slot = slotList().find((s) => s.id === bl.slotId) || null;
    const gameId = (slot && slot.gameId) || bl.gameId;
    if (!gameId || !gameById(gameId)) { toast('Das Spiel gibt es nicht mehr.'); return; }
    const existing = slot ? state.results.find((r) => r.slotId === slot.id) || null : null;
    const draft = { gameId, mult: slot ? slot.multiplier : 1, order, ties, raw: {}, jokers: slot ? (state.jokerCalls[slot.id] || []).slice() : [] };
    if (!saveResult(draft, slot, existing)) return;
    bluffClear();
  }
  // Beste Lüge des Spiels: die, auf die die meisten reingefallen sind
  function bluffBestLie(d) {
    let best = null;
    d.done.forEach((r) => r.options.forEach((o) => {
      if (o.truth) return;
      const n = Object.keys(r.votes).filter((pid) => r.votes[pid] === o.key).length;
      if (n > 0 && (!best || n > best.n)) best = { o, n };
    }));
    return best;
  }

  const nameList = (ids) => ids.map(playerById).filter(Boolean).map((p) => esc(p.name)).join(' & ');
  function bluffSentence(q, fill) {
    const [a, b] = q.q.split('____');
    return `${esc(a)}<span class="bl-blank${fill ? ' fill' : ''}">${fill ? esc(bluffFmt(q.a)) : '<span class="sr">Lücke</span>'}</span>${esc(b)}`;
  }
  // Baut die Bluff-Ansicht in drei Teilen: oben, Eingabefeld, unten.
  // Das Eingabefeld bleibt beim Neuzeichnen erhalten, damit Tippen nicht unterbrochen wird.
  function bluffView(bl) {
    const d = bluffDerive(bl);
    const total = bl.qs.length;
    if (bl.status === 'done') return { a: bluffFinalHtml(bl, d), composer: null, b: '' };
    const cur = d.cur;
    if (!cur || !cur.q) {
      return {
        a: gameHead('<div class="g-title">Bluff</div>') + '<p class="sheet-text">Diese Frage gibt es nicht mehr.</p>',
        composer: null,
        b: (cur ? '<div class="g-foot"><button class="btn primary block" type="button" data-g="bl-next">Weiter</button></div>' : '') + '<button class="link-btn g-abort" type="button" data-g="bl-abort">Spiel abbrechen</button>',
      };
    }
    const q = cur.q;
    const me = myId();
    const syncing = Sync.active();
    const order = bluffOrder(d);
    const pending = cur.phase === 'write' ? cur.writing : cur.phase === 'vote' ? cur.voting : [];
    const nextP = playerById(order.find((pid) => pending.includes(pid)));
    // Wer tippt auf diesem Gerät gerade?
    let actor = null;
    if (cur.phase !== 'reveal') {
      if (!syncing) {
        if (nextP && ui.blReady === `${bl.id}:${cur.qi}:${cur.phase}:${nextP.id}`) actor = nextP.id;
      } else if (ui.blProxy && pending.includes(ui.blProxy)) actor = ui.blProxy;
      else if (me && pending.includes(me)) actor = me;
    }
    // Während der Auflösung bleiben die Punkte verdeckt, bis die Wahrheit aufgedeckt ist.
    const rvPending = cur.phase === 'reveal' && (() => { const c = bluffRvClock(bl, cur); return c.elapsed < c.truthAt; })();
    const strip = d.players.map((pid) => {
      const p = playerById(pid);
      let st;
      if (cur.phase === 'write') st = cur.writing.includes(pid) ? '<span class="st now">schreibt …</span>' : '<span class="st ok">✓ fertig</span>';
      else if (cur.phase === 'vote') st = cur.voting.includes(pid) ? '<span class="st now">wählt …</span>' : '<span class="st ok">✓ gewählt</span>';
      else if (rvPending) st = '<span class="st">…</span>';
      else st = cur.gains[pid] ? `<span class="st ok">+${cur.gains[pid]}</span>` : '<span class="st">±0</span>';
      const pts = rvPending ? d.totals[pid] - cur.gains[pid] : d.totals[pid];
      return `<div class="hp${pid === me ? ' me' : ''}${actor === pid ? ' now' : ''}" style="--pc:${esc(p.color)}"${pid === me ? ' title="Das bist du"' : ''}>${avatar(p, 'sm', { crown: false })}<div class="hp-t"><b>${esc(p.name)}</b><span class="hp-m"><span class="bl-pts">${fmtPts(pts)} P.</span></span>${st}</div></div>`;
    }).join('');
    const card = `<section class="bl-card${cur.phase === 'reveal' ? ' mini' : ''}"><div class="hc-k">Frage ${cur.qi + 1} von ${total}${cur.mult > 1 ? ' · <span class="bl-x2">zählt doppelt</span>' : ''}</div><div class="bl-cat">${esc(q.cat)}</div><p class="bl-q">${bluffSentence(q, false)}</p></section>`;
    const head = gameHead(`<div class="eyebrow">Bluff · Frage ${cur.qi + 1} von ${total}</div><div class="g-title">${cur.phase === 'write' ? 'Erfinde eine Antwort' : cur.phase === 'vote' ? 'Was ist die Wahrheit?' : 'Auflösung'}</div>`,
      syncing && !local.tv ? `<button class="link-btn role-btn" type="button" data-g="role">${esc(roleLabel())}</button>` : '');
    const a = head + `<div class="hol-players bl-players">${strip}</div>` + card;
    let composer = null;
    let b = '';
    const abort = local.tv ? '' : '<button class="link-btn g-abort" type="button" data-g="bl-abort">Spiel abbrechen</button>';
    const proxyLinks = (verb) => (local.tv || !syncing ? '' : pending.filter((pid) => pid !== me && pid !== actor).map((pid) => {
      const p = playerById(pid);
      return `<button class="link-btn g-proxy" type="button" data-g="bl-proxy" data-pid="${esc(pid)}">${esc(p.name)} hat kein Handy? Hier für ${esc(p.name)} ${verb}</button>`;
    }).join(''));
    const handoff = (p, what) => `<div class="handoff" style="--pc:${esc(p.color)}">${avatar(p, 'lg', { crown: false })}<p>Gib das Handy an <b>${esc(p.name)}</b>. Die anderen schauen weg.</p><p class="note">${what}</p><button class="btn primary" type="button" data-g="bl-ready">Ich bin ${esc(p.name)} – los</button></div>`;
    const waiting = (list, verb) => `<p class="g-prompt wait">${list.map((pid) => avatar(playerById(pid), 'xs', { crown: false })).join('')}<span>Warte auf <b>${nameList(list)}</b> – ${verb} noch.</span></p>`;

    if (cur.phase === 'write') {
      if (actor) {
        const p = playerById(actor);
        const key = `${bl.id}:${cur.qi}:${actor}`;
        const draft = ui.blDraft && ui.blDraft.key === key ? ui.blDraft.text : '';
        const forOther = syncing && actor !== me;
        composer = {
          key,
          html: `<section class="bl-compose" data-key="${esc(key)}" data-pid="${esc(actor)}" style="--pc:${esc(p.color)}">
            <label class="bl-lab" for="bl-in">${forOther ? `Lüge für <b>${esc(p.name)}</b>` : syncing ? 'Deine Lüge' : `<b>${esc(p.name)}</b>, deine Lüge`}</label>
            <input id="bl-in" class="input bl-in" type="text" maxlength="40" autocomplete="off" autocapitalize="sentences" enterkeyhint="send" placeholder="Deine erfundene Antwort" value="${esc(draft)}">
            <p class="bl-warn" role="alert">${esc(ui.blWarn || '')}</p>
            <button class="btn primary block" type="button" data-g="bl-send">Abschicken</button>
            ${bl.sug ? '<button class="link-btn bl-sug" type="button" data-g="bl-suggest">Mir fällt nichts ein – Lüge vorschlagen</button>' : ''}
          </section>`,
        };
        b = proxyLinks('schreiben') + abort;
      } else if (!syncing && nextP) {
        b = handoff(nextP, 'Du schreibst eine erfundene Antwort, die die anderen für wahr halten sollen.') + abort;
      } else {
        b = (cur.writing.length ? waiting(cur.writing, cur.writing.length > 1 ? 'sie schreiben' : 'schreibt') : '') + proxyLinks('schreiben') + abort;
      }
    } else if (cur.phase === 'vote') {
      const optHtml = (o, opts) => {
        const sel = opts.sel === o.key;
        const tag = opts.own ? '<small>deine Lüge</small>' : opts.mine ? '<small>dein Tipp</small>' : '';
        return opts.pick
          ? `<button class="bl-opt${sel ? ' on' : ''}" type="button" data-g="bl-pick" data-k="${esc(o.key)}" aria-pressed="${sel}">${esc(o.text)}</button>`
          : `<div class="bl-opt ro${opts.own ? ' own' : ''}${opts.mine ? ' on' : ''}">${esc(o.text)}${tag}</div>`;
      };
      if (actor) {
        const p = playerById(actor);
        const opts = cur.options.filter((o) => !o.authors.includes(actor));
        b = `<p class="g-prompt"><b>${syncing && actor === me ? 'Welche Antwort ist echt?' : esc(p.name) + ', welche Antwort ist echt?'}</b>${syncing && actor !== me ? ' (für ' + esc(p.name) + ')' : ''}</p>
          <div class="bl-opts" role="group" aria-label="Antworten">${opts.map((o) => optHtml(o, { pick: true, sel: ui.blSel })).join('')}</div>
          <div class="g-foot"><button class="btn primary block" type="button" data-g="bl-vote" data-pid="${esc(actor)}"${ui.blSel ? '' : ' disabled'}>Festlegen</button></div>` + proxyLinks('wählen') + abort;
      } else if (!syncing && nextP) {
        b = handoff(nextP, 'Du tippst auf die Antwort, die du für wahr hältst.') + abort;
      } else {
        const mineVote = me ? cur.votes[me] : null;
        const list = cur.options.map((o) => optHtml(o, { own: !!me && o.authors.includes(me), mine: !!mineVote && mineVote === o.key })).join('');
        b = `<div class="bl-opts">${list}</div>` + (cur.voting.length ? waiting(cur.voting, cur.voting.length > 1 ? 'sie wählen' : 'wählt') : '') + proxyLinks('wählen') + abort;
      }
    } else {
      b = bluffRevealHtml(bl, d) + abort;
    }
    return { a, composer, b };
  }
  // Uhr für die Auflösung: läuft auf jedem Gerät ab dem Moment, in dem es die Auflösung zeigt.
  function bluffRvClock(bl, cur) {
    const key = `${bl.id}:${cur.qi}`;
    const lies = cur.options.filter((o) => !o.truth).length;
    const truthAt = 0.4 + lies * 1.5 + 0.5;
    if (!ui.blRv || ui.blRv.key !== key) {
      ui.blRv = { key, start: Date.now() };
      // Kleiner Tusch, wenn die Wahrheit aufgedeckt wird
      if (!ui.booting) [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.24, 'triangle', 0.08, truthAt + i * 0.09));
      setTimeout(() => {
        if (!ui.blRv || ui.blRv.key !== key || ui.gameOpen !== 'bluff') return;
        renderGame();
        const t = document.querySelector('#game .bl-rv.truth');
        if (t && t.scrollIntoView) t.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, truthAt * 1000 + 650);
    }
    return { key, truthAt, elapsed: (Date.now() - ui.blRv.start) / 1000 };
  }
  // Auflösung: erst die Lügen (die mit den wenigsten Stimmen zuerst), zum Schluss die Wahrheit
  function bluffRevealHtml(bl, d) {
    const cur = d.cur;
    const q = cur.q;
    const { elapsed } = bluffRvClock(bl, cur);
    const delay = (t) => `animation-delay:${(t - elapsed).toFixed(2)}s`;
    const voters = (k) => d.players.filter((pid) => cur.votes[pid] === k);
    const chips = (ids, plus) => ids.map((pid) => { const p = playerById(pid); return `<span class="bl-chip" style="--pc:${esc(p.color)}">${avatar(p, 'xs', { crown: false })}${esc(p.name)}${plus ? ` <b>+${plus}</b>` : ''}</span>`; }).join('');
    const lies = cur.options.filter((o) => !o.truth).sort((x, y) => voters(x.key).length - voters(y.key).length);
    let t = 0.4;
    const cards = lies.map((o) => {
      const v = voters(o.key);
      const pts = BLUFF_FOOL * cur.mult * v.length;
      const html = `<div class="bl-rv lie" style="${delay(t)}">
        <div class="bl-rv-t">„${esc(o.text)}“</div>
        <div class="bl-rv-who">${v.length ? chips(v) + `<span>${v.length > 1 ? 'sind' : 'ist'} drauf reingefallen</span>` : '<span>Keiner ist drauf reingefallen</span>'}</div>
        <div class="bl-rv-by">Gelogen von ${chips(o.authors)}${pts ? ` <b class="bl-plus">+${pts}${o.authors.length > 1 ? ' für jeden' : ''}</b>` : ''}</div>
      </div>`;
      t += 1.5;
      return html;
    }).join('');
    const truth = cur.options.find((o) => o.truth);
    const finders = truth ? voters('T') : [];
    t += 0.5;
    const truthHtml = `<div class="bl-rv truth" style="${delay(t)}">
      <div class="bl-rv-k">Die Wahrheit</div>
      <div class="bl-rv-t">${esc(bluffFmt(q.a))}</div>
      <p class="bl-rv-s">${bluffSentence(q, true)}</p>
      <div class="bl-rv-who">${finders.length ? chips(finders, BLUFF_TRUTH * cur.mult) : '<span>Keiner hat die Wahrheit gefunden!</span>'}</div>
      ${q.src ? `<a class="bl-src" href="${esc(q.src)}" target="_blank" rel="noopener">Quelle</a>` : ''}
    </div>`;
    const lastQ = cur.qi >= bl.qs.length - 1;
    const foot = local.tv ? '' : `<div class="g-foot bl-late" style="${delay(t + 0.6)}"><button class="btn primary block" type="button" data-g="bl-next">${lastQ ? 'Zum Endstand' : 'Nächste Frage'}</button></div>`;
    return `<section class="bl-rvs" aria-live="polite">${cards}${truthHtml}</section>${foot}`;
  }
  function bluffFinalHtml(bl, d) {
    const rows = bluffStandings(d);
    const firsts = rows.filter((r) => r.place === 1);
    const title = firsts.length === 1 ? `${esc(playerById(firsts[0].pid).name)} gewinnt!` : 'Gleichstand an der Spitze!';
    const list = rows.map((r) => {
      const p = playerById(r.pid);
      return `<div class="fin-row" style="--pc:${esc(p.color)}"><span class="pl">${r.place}.</span>${avatar(p, 'sm', { crown: false })}<b>${esc(p.name)}</b><span class="muted">${fmtPts(r.pts)} ${plural(r.pts, 'Punkt', 'Punkte')} · ${r.truth}× Wahrheit erkannt · ${r.fooled}× andere reingelegt</span></div>`;
    }).join('');
    const best = bluffBestLie(d);
    const bestHtml = best ? `<section class="bl-best"><div class="eyebrow">Beste Lüge des Spiels</div><p class="bl-best-t">„${esc(best.o.text)}“</p><p class="bl-best-s">von ${nameList(best.o.authors)} · ${best.o.authors.length > 1 ? 'haben' : 'hat'} ${best.n === 1 ? 'einen Mitspieler' : best.n + ' Mitspieler'} reingelegt</p></section>` : '';
    const slot = slotList().find((s) => s.id === bl.slotId);
    const canSave = !!(slot || (bl.gameId && gameById(bl.gameId)));
    return gameHead(`<div class="eyebrow">Bluff · Endstand</div><div class="g-title">${title}</div>`)
      + `<section class="fin">${list}</section>${bestHtml}`
      + (local.tv ? '' : `<div class="g-foot">${canSave ? `<button class="btn primary block" type="button" data-g="bl-save">${slot && slot.result ? 'Ergebnis aktualisieren' : 'Ergebnis eintragen'}</button>` : ''}<button class="btn ghost block" type="button" data-g="bl-end">Schließen ohne Eintragen</button></div>`);
  }
  function renderBluff(el, bl) {
    const v = bluffView(bl);
    const old = el.querySelector('.bl-compose');
    const partA = el.querySelector('.bl-a');
    const partB = el.querySelector('.bl-b');
    if (v.composer && old && old.dataset.key === v.composer.key && partA && partB) {
      // Nur oben und unten neu zeichnen – das Eingabefeld (mit Tastatur) bleibt, wie es ist.
      partA.innerHTML = v.a;
      partB.innerHTML = v.b;
      const w = old.querySelector('.bl-warn');
      if (w) w.textContent = ui.blWarn || '';
      return;
    }
    const top = el.scrollTop;
    el.innerHTML = `<div class="game-inner bl-inner"><div class="bl-a">${v.a}</div>${v.composer ? v.composer.html : ''}<div class="bl-b">${v.b}</div></div>`;
    el.scrollTop = top;
  }
  function onBluffInput(e) {
    const inp = e.target;
    if (!inp || inp.id !== 'bl-in') return;
    const box = inp.closest('.bl-compose');
    ui.blDraft = { key: box ? box.dataset.key : '', text: inp.value };
    if (ui.blWarn) {
      ui.blWarn = null;
      const w = box && box.querySelector('.bl-warn');
      if (w) w.textContent = '';
    }
  }
  function onBluffKey(e) {
    if (e.key !== 'Enter' || !e.target || e.target.id !== 'bl-in') return;
    e.preventDefault();
    const box = e.target.closest('.bl-compose');
    if (box) bluffWrite(box.dataset.pid, e.target.value);
  }
  async function onBluffClick(a, b) {
    const bl = live('bluff');
    if (!bl) return;
    if (a === 'bl-send') {
      const box = b.closest('.bl-compose');
      const inp = box && box.querySelector('#bl-in');
      if (box && inp) bluffWrite(box.dataset.pid, inp.value);
      return;
    }
    if (a === 'bl-suggest') {
      const box = b.closest('.bl-compose');
      const inp = box && box.querySelector('#bl-in');
      if (!box || !inp) return;
      const s = bluffSuggest(box.dataset.pid);
      if (!s) { toast('Für diese Frage gibt es keine Vorschläge mehr.'); return; }
      inp.value = s;
      ui.blDraft = { key: box.dataset.key, text: s };
      ui.blWarn = null;
      const w = box.querySelector('.bl-warn');
      if (w) w.textContent = '';
      return;
    }
    if (a === 'bl-pick') { ui.blSel = b.dataset.k; renderGame(); return; }
    if (a === 'bl-vote') { bluffVote(b.dataset.pid, ui.blSel); return; }
    if (a === 'bl-ready') {
      const d = bluffDerive(bl);
      const cur = d.cur;
      const pending = cur.phase === 'write' ? cur.writing : cur.voting;
      const next = bluffOrder(d).find((pid) => pending.includes(pid));
      if (!next) return;
      ui.blReady = `${bl.id}:${cur.qi}:${cur.phase}:${next}`;
      ui.blSel = null;
      ui.blWarn = null;
      renderGame();
      return;
    }
    if (a === 'bl-proxy') {
      const p = playerById(b.dataset.pid);
      if (!p) return;
      const phase = bluffDerive(bl).cur.phase;
      const ok = await confirmSheet({ title: `Für ${p.name} tippen?`, text: phase === 'write' ? `Nur wenn ${p.name} kein Handy dabei hat. ${p.name} sagt dir die Lüge leise ins Ohr.` : `Nur wenn ${p.name} kein Handy dabei hat. ${p.name} sagt dir, welche Antwort er für echt hält.`, ok: `Für ${p.name} tippen` });
      if (ok) { ui.blProxy = p.id; ui.blSel = null; ui.blWarn = null; renderGame(); }
      return;
    }
    if (a === 'bl-next') { bluffNext(); return; }
    if (a === 'bl-save') { bluffSaveResult(); return; }
    if (a === 'bl-end' || a === 'bl-abort') {
      const ok = await confirmSheet({ title: a === 'bl-abort' ? 'Spiel abbrechen?' : 'Ohne Ergebnis schließen?', text: 'Bluff wird auf allen Handys beendet. Es werden keine Punkte eingetragen.', ok: a === 'bl-abort' ? 'Spiel abbrechen' : 'Schließen', cancel: 'Zurück', danger: true });
      if (ok) bluffClear();
    }
  }

  /* ---------- Spiel-Ansicht (über allem außer Sheets) ---------- */
  function gameSync() {
    const hol = live('hol');
    if (hol && hol.status === 'play' && hol.id !== ui.gameSeen) { ui.gameSeen = hol.id; ui.gameOpen = 'hol'; ui.holSel = null; ui.holProxy = null; }
    const bz = live('bz');
    if (bz && bz.id !== ui.bzSeen) { ui.bzSeen = bz.id; ui.gameOpen = 'bz'; }
    const bl = live('bluff');
    if (bl && bl.status === 'play' && bl.id !== ui.bluffSeen) { ui.bluffSeen = bl.id; ui.gameOpen = 'bluff'; bluffResetUi(); }
    if (bl && ui.blQ !== bl.id + ':' + bl.i) { ui.blQ = bl.id + ':' + bl.i; bluffResetUi(); }
    if (ui.gameOpen === 'bluff' && !bl) ui.gameOpen = null;
    if (ui.gameOpen === 'hol' && !hol) ui.gameOpen = null;
    if (ui.gameOpen === 'bz' && !bz) ui.gameOpen = null;
    if (bz) { buzzerHostCheck(bz); buzzerFx(bz); }
  }
  function renderGame() {
    let el = document.getElementById('game');
    const kind = ui.gameOpen === 'hol' && live('hol') ? 'hol' : ui.gameOpen === 'bz' && live('bz') ? 'bz' : ui.gameOpen === 'bluff' && live('bluff') ? 'bluff' : null;
    if (!kind) {
      if (el) el.remove();
      document.body.classList.remove('has-game');
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'game';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.addEventListener('click', onGameClick);
      el.addEventListener('pointerdown', onGamePointer);
      el.addEventListener('input', onBluffInput);
      el.addEventListener('keydown', onBluffKey);
      document.body.appendChild(el);
      document.body.classList.add('has-game');
    }
    el.className = 'game ' + kind + (local.tv ? ' tv' : '');
    el.setAttribute('aria-label', kind === 'hol' ? 'Higher or Lower' : kind === 'bluff' ? 'Bluff' : 'Buzzer');
    if (kind === 'bluff') { renderBluff(el, live('bluff')); return; }
    const top = el.scrollTop;
    el.innerHTML = `<div class="game-inner">${kind === 'hol' ? holHtml(live('hol')) : buzzHtml(live('bz'))}</div>`;
    el.scrollTop = top;
  }
  function onGamePointer(e) {
    const b = e.target.closest('[data-g="buzz"], [data-g="tile"]');
    if (!b) return;
    e.preventDefault();
    if (b.dataset.g === 'buzz') buzzPress(); else buzzBoardPress(b.dataset.pid);
  }
  async function onGameClick(e) {
    const b = e.target.closest('[data-g]');
    if (!b || b.disabled) return;
    const a = b.dataset.g;
    if (a === 'buzz' || a === 'tile') return;
    if (a === 'min') { ui.gameOpen = null; render(); return; }
    if (a === 'role') { openWhoAmI(); return; }
    if (a.indexOf('bl-') === 0) { onBluffClick(a, b); return; }
    const hol = live('hol');
    if (a === 'gap') { ui.holSel = Number(b.dataset.i); renderGame(); return; }
    if (a === 'confirm' && hol) {
      const t = holTurn(holDerive(hol).cur);
      if (t.next && ui.holSel != null) holSubmit(t.next, ui.holSel);
      return;
    }
    if (a === 'ready' && hol) {
      const d = holDerive(hol);
      const t = holTurn(d.cur);
      ui.holReady = `${hol.id}:${d.cur.ri}:${d.cur.ci}:${t.next}`;
      ui.holSel = null;
      renderGame();
      return;
    }
    if (a === 'proxy' && hol) {
      const t = holTurn(holDerive(hol).cur);
      const p = playerById(t.next);
      if (!p) return;
      const ok = await confirmSheet({ title: `Für ${p.name} tippen?`, text: `Nur wenn ${p.name} kein Handy dabei hat. ${p.name} sagt dir, wo die Karte hingehört.`, ok: `Für ${p.name} tippen` });
      if (ok) { ui.holProxy = p.id; ui.holSel = null; renderGame(); }
      return;
    }
    if (a === 'next') { holNext(); return; }
    if (a === 'save') { holSaveResult(); return; }
    if (a === 'end' || a === 'abort') {
      const ok = await confirmSheet({ title: a === 'abort' ? 'Spiel abbrechen?' : 'Ohne Ergebnis schließen?', text: 'Higher or Lower wird auf allen Handys beendet. Es werden keine Punkte eingetragen.', ok: a === 'abort' ? 'Spiel abbrechen' : 'Schließen', cancel: 'Zurück', danger: true });
      if (ok) holClear();
      return;
    }
    if (a === 'bz-open') bzOpen();
    if (a === 'bz-right') bzRight();
    if (a === 'bz-wrong') bzWrong();
    if (a === 'bz-skip') bzSkip();
    if (a === 'sc') bzScore(b.dataset.pid, Number(b.dataset.d));
    if (a === 'bz-save') bzSave();
    if (a === 'bz-end') {
      const ok = await confirmSheet({ title: 'Buzzer beenden?', text: 'Die Buzzer-Punkte werden nicht eingetragen.', ok: 'Beenden', cancel: 'Zurück', danger: true });
      if (ok) bzClear();
    }
  }
  // Lauter Buzzer-Ton (spielt auch, wenn die App-Sounds aus sind)
  function audioCtx() {
    try {
      if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); }
      if (actx && actx.state === 'suspended') actx.resume();
    } catch (e) { actx = null; }
    return actx;
  }
  function buzzSound() {
    const ctx = audioCtx();
    if (!ctx) return;
    try {
      const t = ctx.currentTime;
      const dur = 0.8;
      const out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(0.9, t + 0.015);
      out.gain.setValueAtTime(0.9, t + dur - 0.12);
      out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = (i / 255) * 2 - 1; curve[i] = Math.tanh(4 * x); }
      shaper.curve = curve;
      shaper.connect(out);
      out.connect(ctx.destination);
      [[98, 'sawtooth'], [147, 'square'], [196.5, 'sawtooth']].forEach(([f, type]) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(f, t);
        o.connect(shaper);
        o.start(t);
        o.stop(t + dur + 0.02);
      });
    } catch (e) { /* egal */ }
  }

  function nextActions(cur, g, hasWheel) {
    const sid = esc(cur.id);
    if (g.mode === 'hol') {
      const running = live('hol');
      const label = running ? (running.status === 'play' ? 'Weiterspielen' : 'Zum Endstand') : 'Higher or Lower starten';
      return `<button class="btn primary" type="button" data-act="holStart" data-slot="${sid}">${label}</button><button class="btn ghost" type="button" data-act="enterResult" data-slot="${sid}">Von Hand eintragen</button>`;
    }
    if (g.mode === 'bluff') {
      const running = live('bluff');
      const label = running ? (running.status === 'play' ? 'Weiterspielen' : 'Zum Endstand') : 'Bluff starten';
      return `<button class="btn primary" type="button" data-act="bluffStart" data-slot="${sid}">${label}</button><button class="btn ghost" type="button" data-act="enterResult" data-slot="${sid}">Von Hand eintragen</button>`;
    }
    if (g.buzzer) {
      return `<button class="btn primary" type="button" data-act="buzzStart" data-slot="${sid}">${live('bz') ? 'Zum Buzzer' : 'Buzzer öffnen'}</button><button class="btn ghost" type="button" data-act="enterResult" data-slot="${sid}">Ergebnis eintragen</button>`;
    }
    return `<button class="btn primary" type="button" data-act="enterResult" data-slot="${sid}">Ergebnis eintragen</button>${hasWheel ? '<button class="btn ghost" type="button" data-act="tab" data-tab="wheel">Glücksrad</button>' : ''}`;
  }

  /* ======================================================================
     7. ERGEBNIS-EINGABE
     ====================================================================== */
  function openResultSheet({ slotId = null, resultId = null, extra = false } = {}) {
    let existing = null;
    if (resultId) existing = state.results.find((r) => r.id === resultId) || null;
    else if (slotId) existing = state.results.find((r) => r.slotId === slotId) || null;
    const slot = extra ? null : slotList().find((s) => s.id === (slotId || (existing && existing.slotId))) || null;
    const cur = currentSlot();
    const firstGame = slot ? slot.gameId : existing ? existing.gameId : (cur && cur.gameId) || (state.games[0] && state.games[0].id);
    if (!firstGame) { toast('Lege zuerst ein Spiel an (Mehr → Spiele & Punkte).'); return; }
    const pids = state.players.map((p) => p.id);
    const draft = {
      gameId: firstGame,
      mult: existing ? existing.multiplier || 1 : slot ? slot.multiplier : 1,
      order: [], ties: [], raw: {},
      jokers: existing ? (existing.jokers || []).slice() : slot ? (state.jokerCalls[slot.id] || []).slice() : [],
    };
    if (existing && existing.input) {
      if (existing.input.order) {
        draft.order = existing.input.order.filter((id) => pids.includes(id));
        draft.ties = (existing.input.ties || []).slice(0, Math.max(0, draft.order.length - 1));
      }
      if (existing.input.raw) draft.raw = Object.assign({}, existing.input.raw);
    }
    const title = existing ? 'Ergebnis bearbeiten' : slot ? 'Ergebnis eintragen' : 'Zusatzspiel';
    openSheet({
      title,
      body: () => resultBody(draft, slot, existing),
      onChange: (el, ev, api) => {
        if (el.id === 'rs-game') { draft.gameId = el.value; draft.order = []; draft.ties = []; api.refresh(); }
      },
      onInput: (el) => {
        if (el.dataset.raw) draft.raw[el.dataset.raw] = parseNum(el.value);
      },
      on: async (a, el, ev, api) => {
        const players = state.players;
        if (a === 'pick') {
          const pid = el.dataset.pid;
          const idx = draft.order.indexOf(pid);
          if (idx >= 0) { draft.order.splice(idx, 1); draft.ties = []; } else {
            draft.order.push(pid);
            if (draft.order.length === players.length - 1) {
              const last = players.find((p) => !draft.order.includes(p.id));
              if (last) draft.order.push(last.id);
            }
          }
          api.refresh();
        } else if (a === 'tie') {
          const i = Number(el.dataset.i);
          draft.ties[i] = !draft.ties[i];
          api.refresh();
        } else if (a === 'joker') {
          const pid = el.dataset.pid;
          draft.jokers = draft.jokers.includes(pid) ? draft.jokers.filter((x) => x !== pid) : draft.jokers.concat(pid);
          api.refresh();
        } else if (a === 'reset') {
          draft.order = []; draft.ties = [];
          api.refresh();
        } else if (a === 'inc' || a === 'dec') {
          const pid = el.dataset.pid;
          const v = Math.max(0, parseNum(draft.raw[pid]) + (a === 'inc' ? 1 : -1));
          draft.raw[pid] = v;
          const inp = api.body.querySelector(`[data-raw="${pid}"]`);
          if (inp) inp.value = fmtPts(v);
        } else if (a === 'save') {
          if (saveResult(draft, slot, existing)) api.close();
        } else if (a === 'delete') {
          const ok = await confirmSheet({ title: 'Ergebnis löschen?', text: 'Die Punkte dieses Spiels werden aus der Tabelle entfernt.', ok: 'Löschen', danger: true });
          if (ok) { deleteResult(existing); api.close(); }
        }
      },
    });
  }

  function resultBody(draft, slot, existing) {
    const g = gameById(draft.gameId) || normalizeGame({ name: existing ? existing.gameName : 'Unbekanntes Spiel', emoji: existing ? existing.emoji : '❓', scoring: existing ? existing.scoring : 'placement' });
    const sub = slot ? `${slot.label}${draft.mult > 1 ? ' · Finale ×2' : ''}` : 'Zusatzspiel · zählt wie ein normales Spiel';
    let html = '';
    if (!slot) {
      html += `<label class="field"><span>Spiel</span><select class="input" id="rs-game">${state.games.map((x) => `<option value="${esc(x.id)}"${x.id === draft.gameId ? ' selected' : ''}>${esc(x.emoji)} ${esc(x.name)}</option>`).join('')}</select></label>`;
    }
    html += `<div class="rs-head"><span class="g-emoji" aria-hidden="true">${esc(g.emoji)}</span><div style="min-width:0"><div class="t">${esc(g.name)}</div><div class="s">${esc(sub)}</div></div></div>`;
    if (slot) html += sheetJokerRow(draft, slot, existing);
    html += g.scoring === 'free' ? freeBody(draft, g) : placementBody(draft, g);
    const hc = existing ? existing.handicaps || [] : state.wheel.log.filter((l) => (l.slotId || null) === (slot ? slot.id : null));
    if (hc.length) {
      html += `<div class="hc-note"><b>Handicaps:</b> ${hc.map((h) => { const p = playerById(h.playerId); return p ? `${face(p)} ${esc(h.emoji)} ${esc(h.title)}` : ''; }).filter(Boolean).join(' · ')}</div>`;
    }
    const complete = g.scoring === 'free' || draft.order.length === state.players.length;
    html += `<div class="sheet-actions">${g.scoring !== 'free' ? `<button class="btn ghost" type="button" data-s="reset"${draft.order.length ? '' : ' disabled'}>Zurücksetzen</button>` : ''}<button class="btn primary" type="button" data-s="save"${complete ? '' : ' disabled'}>Speichern</button></div>`;
    if (existing) html += '<button class="link-btn danger" type="button" data-s="delete">Ergebnis löschen</button>';
    return html;
  }

  function placementBody(draft, g) {
    const players = state.players;
    const entries = draft.order.length ? applyJokers(scorePlacement(g.points, draft.order, draft.ties, draft.mult), draft.jokers) : [];
    const byId = Object.fromEntries(entries.map((e) => [e.playerId, e]));
    const hint = draft.order.length < players.length
      ? `Tippe, wer auf <b>Platz ${draft.order.length + 1}</b> gelandet ist.`
      : 'Fertig! Gleichstand? Tippe auf „=“ zwischen zwei Plätzen.';
    let html = `<p class="sheet-text" aria-live="polite">${hint}</p><div class="pick-grid">${players.map((p) => {
      const placed = draft.order.includes(p.id);
      const e = byId[p.id];
      return `<button class="pick${placed ? ' placed' : ''}" type="button" data-s="pick" data-pid="${esc(p.id)}" style="--pc:${esc(p.color)}" aria-pressed="${placed}">${placed && e ? `<span class="place-badge">${e.place}.</span>` : ''}${avatar(p)}<span class="nm">${esc(p.name)}</span></button>`;
    }).join('')}</div>`;
    const rows = [];
    for (let i = 0; i < players.length; i++) {
      const pid = draft.order[i];
      if (i > 0) {
        if (pid && draft.order[i - 1]) {
          rows.push(`<li class="tie-wrap"><button class="tie-btn" type="button" data-s="tie" data-i="${i - 1}" aria-pressed="${!!draft.ties[i - 1]}">= ${draft.ties[i - 1] ? 'Gleichstand' : 'gleichauf?'}</button></li>`);
        } else rows.push('<li class="tie-wrap" aria-hidden="true" style="height:8px;padding:0"></li>');
      }
      if (pid) {
        const p = playerById(pid);
        const e = byId[pid];
        rows.push(`<li class="rank-row" style="--pc:${esc(p.color)}"><span class="pl">${e.place}.</span>${avatar(p, 'sm')}<span class="nm">${esc(p.name)}</span><span class="gain">+${fmtPts(e.points)}${e.joker ? ' 🃏' : ''}</span></li>`);
      } else {
        rows.push(`<li class="rank-row empty"><span class="pl">${i + 1}.</span><span></span><span class="nm">…</span><span></span></li>`);
      }
    }
    return html + `<ol class="ranking" aria-label="Zielreihenfolge">${rows.join('')}</ol>`;
  }

  function freeBody(draft, g) {
    return `<p class="sheet-text">Trag ein, wie viele Punkte jeder geholt hat${g.maxPoints != null ? ` (höchstens ${fmtPts(g.maxPoints)})` : ''}.${draft.mult > 1 ? ' Finale: Die Punkte zählen doppelt.' : ''}</p><div class="free-list">${state.players.map((p) => {
      const v = parseNum(draft.raw[p.id]);
      return `<div class="free-row" style="--pc:${esc(p.color)}">${avatar(p, 'sm')}<span class="nm">${esc(p.name)}</span><span class="stepper"><button class="icon-btn" type="button" data-s="dec" data-pid="${esc(p.id)}" aria-label="Ein Punkt weniger für ${esc(p.name)}">−</button><input class="input" inputmode="decimal" id="raw-${esc(p.id)}" data-raw="${esc(p.id)}" value="${esc(fmtPts(v))}" aria-label="Punkte für ${esc(p.name)}"><button class="icon-btn" type="button" data-s="inc" data-pid="${esc(p.id)}" aria-label="Ein Punkt mehr für ${esc(p.name)}">+</button></span></div>`;
    }).join('')}</div>`;
  }

  function saveResult(draft, slot, existing) {
    const g = gameById(draft.gameId);
    if (!g) { toast('Dieses Spiel gibt es nicht mehr.'); return false; }
    const pids = state.players.map((p) => p.id);
    if (g.scoring !== 'free' && draft.order.length !== pids.length) return false;
    const jokers = slot ? draft.jokers.filter((pid) => pids.includes(pid)) : [];
    const entries = applyJokers(g.scoring === 'free'
      ? scoreFree(draft.raw, pids, draft.mult)
      : scorePlacement(g.points, draft.order, draft.ties, draft.mult), jokers);
    // Pro Spielplan-Platz gibt es genau ein Ergebnis – auch wenn zwei Handys gleichzeitig eintragen.
    const id = existing ? existing.id : slot ? 'r_' + slot.id : 'x_' + uid();
    const prevResult = state.results.find((r) => r.id === id) || null;
    const prevWheel = clone(state.wheel);
    const prevCalls = clone(state.jokerCalls);
    const slotKey = slot ? slot.id : null;
    const isNew = !existing;
    if (isNew) { local.tab = 'board'; saveLocal(); }
    commit((st) => {
      let handicaps = existing ? existing.handicaps || [] : [];
      if (isNew) {
        handicaps = st.wheel.log.filter((l) => (l.slotId || null) === slotKey).map((l) => ({ playerId: l.playerId, race: l.race, itemId: l.itemId, emoji: l.emoji, title: l.title }));
        if (handicaps.length || slotKey) {
          st.wheel.log = st.wheel.log.filter((l) => (l.slotId || null) !== slotKey);
          st.wheel.current = {};
          st.wheel.race = 1;
        }
      }
      const res = {
        id, slotId: slotKey, gameId: g.id, gameName: g.name, emoji: g.emoji, unit: g.unit,
        scoring: g.scoring, multiplier: draft.mult, ts: existing ? existing.ts : Date.now(),
        input: g.scoring === 'free' ? { raw: Object.assign({}, draft.raw) } : { order: draft.order.slice(), ties: draft.ties.slice(0, draft.order.length - 1).map(Boolean) },
        entries, handicaps, jokers,
      };
      st.results = st.results.filter((r) => r.id !== id && !(slotKey && r.slotId === slotKey)).concat(res);
      st.results.sort((a, b) => a.ts - b.ts);
      if (slotKey) delete st.jokerCalls[slotKey];
    });
    if (isNew) window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
    toast(existing ? 'Ergebnis geändert' : 'Ergebnis gespeichert', {
      label: 'Rückgängig',
      fn: () => commit((st) => {
        st.results = st.results.filter((r) => r.id !== id);
        if (prevResult) st.results.push(prevResult);
        st.results.sort((a, b) => a.ts - b.ts);
        if (isNew) { st.wheel = prevWheel; st.jokerCalls = prevCalls; }
      }),
    }, 6000);
    return true;
  }

  function deleteResult(res) {
    if (!res) return;
    commit((st) => { st.results = st.results.filter((r) => r.id !== res.id); });
    toast('Ergebnis gelöscht', {
      label: 'Rückgängig',
      fn: () => commit((st) => { st.results = st.results.filter((r) => r.id !== res.id).concat(res).sort((a, b) => a.ts - b.ts); }),
    }, 6000);
  }

  /* ======================================================================
     8. GLÜCKSRAD
     Jeder Spieler dreht pro Rennen einmal. Das Ergebnis wird sofort
     gespeichert (damit verbundene Handys mitdrehen) und erst nach der
     Animation aufgedeckt.
     ====================================================================== */
  function activeWheelList() {
    const lists = state.handicapLists;
    if (!lists.length) return null;
    const cur = currentSlot();
    const preferred = ui.wheelListId || (cur && cur.game && cur.game.wheelList);
    return listById(preferred) || lists[0];
  }
  function resolveSpinFor() {
    if (ui.spinFor && playerById(ui.spinFor)) return ui.spinFor;
    const open = state.players.find((p) => !state.wheel.current[p.id]);
    return open ? open.id : state.players[0] ? state.players[0].id : null;
  }
  function polar(deg, r) {
    const rad = (deg * Math.PI) / 180;
    return { x: 160 + r * Math.sin(rad), y: 160 - r * Math.cos(rad) };
  }
  function segLabel(it, mid, n) {
    const R = 147;
    const fs = n > 10 ? 10.5 : n > 7 ? 11.5 : 13;
    const title = it.title.length > 18 ? it.title.slice(0, 17) + '…' : it.title;
    const maxLen = R * 0.80 - R * 0.27;
    const fit = title.length * fs * 0.56 > maxLen ? ` textLength="${maxLen.toFixed(1)}" lengthAdjust="spacingAndGlyphs"` : '';
    return `<g transform="rotate(${mid.toFixed(2)} 160 160)"><text x="160" y="${(160 - R * 0.885).toFixed(1)}" font-size="${n > 10 ? 15 : 18}" text-anchor="middle" dominant-baseline="central">${esc(it.emoji)}</text><text transform="rotate(-90 160 160)" x="${(160 + R * 0.27).toFixed(1)}" y="160" font-size="${fs}" font-weight="800" fill="#1a1338" dominant-baseline="central" font-family="Figtree, system-ui, sans-serif"${fit}>${esc(title)}</text></g>`;
  }
  function wheelSvg(list, items) {
    const R = 147;
    const n = items.length;
    const taken = new Set(Object.entries(state.wheel.current)
      .filter(([pid, v]) => v && v.listId === list.id && pid !== ui.revealHold)
      .map(([, v]) => v.itemId));
    let segs = '';
    if (!n) segs = `<circle cx="160" cy="160" r="${R}" fill="#2b2563"/>`;
    else if (n === 1) segs = `<circle cx="160" cy="160" r="${R}" fill="${WHEEL_COLORS[0]}"/>${segLabel(items[0], 0, 1)}`;
    else {
      for (let i = 0; i < n; i++) {
        const a0 = (i * 360) / n, a1 = ((i + 1) * 360) / n;
        const p0 = polar(a0, R), p1 = polar(a1, R);
        let color = WHEEL_COLORS[i % WHEEL_COLORS.length];
        if (i === n - 1 && n % WHEEL_COLORS.length === 1) color = WHEEL_COLORS[2];
        segs += `<g${taken.has(items[i].id) ? ' opacity="0.38"' : ''}><path d="M160,160 L${p0.x.toFixed(2)},${p0.y.toFixed(2)} A${R},${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p1.x.toFixed(2)},${p1.y.toFixed(2)} Z" fill="${color}" stroke="#16123a" stroke-width="2"/>${segLabel(items[i], (a0 + a1) / 2, n)}</g>`;
      }
    }
    let bulbs = '';
    for (let i = 0; i < 28; i++) {
      const p = polar((i * 360) / 28, 153.5);
      bulbs += `<circle class="bulb${i % 2 ? ' alt' : ''}" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="2.4"/>`;
    }
    return `<svg viewBox="0 0 320 320" role="img" aria-label="Glücksrad mit ${n} Handicaps"><circle cx="160" cy="160" r="159" fill="#221c58" stroke="#ffc93c" stroke-width="2"/><g id="wheel-rot" transform="rotate(${ui.wheelAngle.toFixed(2)} 160 160)">${segs}</g>${bulbs}</svg>`;
  }
  const pointerSvg = () => '<svg class="pointer" id="pointer" viewBox="0 0 40 48" aria-hidden="true"><path d="M20 46 L5.5 13 A15.5 15.5 0 1 1 34.5 13 Z" fill="#ffc93c" stroke="#16123a" stroke-width="3" stroke-linejoin="round"/><circle cx="20" cy="15" r="5.5" fill="#16123a"/></svg>';

  function viewWheel() {
    const list = activeWheelList();
    if (!list) {
      return `<div class="view-head"><div><h1 class="h1">Glücksrad</h1></div></div><section class="empty-state"><div class="big" aria-hidden="true">🎡</div><div>Es gibt noch keine Glücksrad-Liste.</div><button class="btn primary" type="button" data-act="newList">Liste anlegen</button></section>`;
    }
    const items = list.items.filter((i) => i.active);
    const W = state.wheel;
    const cur = currentSlot();
    const ctx = cur && cur.game ? `${cur.game.name} · ${cur.label}` : 'Freies Drehen';
    const spinFor = resolveSpinFor();
    const label = list.roundLabel;
    const chips = state.players.map((p) => {
      const a = W.current[p.id];
      const hold = ui.revealHold === p.id;
      const txt = hold ? 'dreht …' : a ? `${a.emoji} ${a.title}` : 'noch offen';
      return `<button class="sp" type="button" data-act="spinFor" data-pid="${esc(p.id)}" aria-pressed="${spinFor === p.id}" style="--pc:${esc(p.color)}">${avatar(p, 'sm')}<span class="nm">${esc(p.name)}</span><span class="as${a && !hold ? ' set' : ''}">${esc(txt)}</span></button>`;
    }).join('');
    const listChips = state.handicapLists.length > 1
      ? `<div class="list-chips" role="group" aria-label="Liste wählen">${state.handicapLists.map((l) => `<button type="button" data-act="pickList" data-list="${esc(l.id)}" aria-pressed="${l.id === list.id}">${esc(l.name)}</button>`).join('')}</div>`
      : '';
    const allSet = state.players.every((p) => W.current[p.id]) && !ui.revealHold;
    const spinner = playerById(spinFor);
    const hint = !items.length
      ? 'Diese Liste hat keine aktiven Handicaps.'
      : allSet
        ? `Alle haben ihr Handicap für ${esc(label)} ${W.race}. Viel Spaß!`
        : `<b>${esc(spinner ? spinner.name : '')}</b> ist dran. Tippe auf DREH!`;
    const assigned = state.players.filter((p) => W.current[p.id] && ui.revealHold !== p.id);
    const hcList = assigned.length
      ? `<div class="group"><div class="eyebrow">Handicaps · ${esc(label)} ${W.race}</div><div class="hc-list">${assigned.map((p) => {
        const a = W.current[p.id];
        return `<div class="hc-row" style="--pc:${esc(p.color)}">${avatar(p, 'sm')}<div><div class="hc-t">${esc(p.name)}: ${esc(a.emoji)} ${esc(a.title)}</div><div class="hc-x">${esc(a.text)}</div></div></div>`;
      }).join('')}</div></div>`
      : '';
    return `<div class="wheel-head"><div><div class="eyebrow">${esc(ctx)}</div><h1 class="h1">${esc(label)} ${W.race}</h1></div><button class="btn small ghost" type="button" data-act="nextRace">Weiter: ${esc(label)} ${W.race + 1}</button></div>
      ${listChips}
      <div class="spin-players" role="group" aria-label="Wer dreht?">${chips}</div>
      <div class="wheel-stage" id="wheel-stage">${pointerSvg()}${wheelSvg(list, items)}<button class="hub" id="hub" type="button" data-act="spin"${items.length ? '' : ' disabled'} aria-label="Glücksrad drehen">DREH!</button></div>
      <p class="wheel-hint" id="wheel-hint" aria-live="polite">${hint}</p>
      ${hcList}
      <div class="inline-actions"><button class="btn small ghost" type="button" data-act="editList" data-list="${esc(list.id)}">Liste bearbeiten</button><span class="muted small" style="align-self:center">${items.length} ${plural(items.length, 'Handicap', 'Handicaps')} aktiv</span></div>`;
  }

  function doSpin() {
    if (ui.spinning) return;
    const list = activeWheelList();
    if (!list) return;
    const items = list.items.filter((i) => i.active);
    if (!items.length) { toast('Diese Liste hat keine aktiven Handicaps.'); return; }
    const pid = resolveSpinFor();
    if (!pid) return;
    const W = state.wheel;
    // Jeder bekommt pro Rennen ein anderes Handicap, solange die Liste reicht.
    const takenIds = Object.entries(W.current).filter(([k, v]) => k !== pid && v && v.listId === list.id).map(([, v]) => v.itemId);
    let pool = items.filter((i) => !takenIds.includes(i.id));
    if (!pool.length) pool = items;
    const pick = pool[randInt(pool.length)];
    const slot = currentSlot();
    const spinId = uid();
    initAudio();
    ui.revealHold = pid;
    ui.lastSpinSeen = spinId;
    ui.wheelListId = list.id;
    commit((st) => {
      const w = st.wheel;
      const slotId = slot ? slot.id : null;
      w.log = w.log.filter((l) => !(l.playerId === pid && l.race === w.race && (l.slotId || null) === slotId));
      w.log.push({ id: uid(), slotId, race: w.race, playerId: pid, listId: list.id, itemId: pick.id, emoji: pick.emoji, title: pick.title, text: pick.text, ts: Date.now() });
      w.current[pid] = { listId: list.id, itemId: pick.id, emoji: pick.emoji, title: pick.title, text: pick.text };
      w.lastSpin = { id: spinId, playerId: pid, listId: list.id, itemId: pick.id, at: Date.now() };
    }, { render: false });
    const chip = document.querySelector(`.sp[data-pid="${pid}"] .as`);
    if (chip) { chip.textContent = 'dreht …'; chip.classList.remove('set'); }
    const hintEl = $('#wheel-hint');
    if (hintEl) hintEl.textContent = 'Das Rad dreht …';
    animateWheel(list.id, pick.id, () => {
      ui.revealHold = null;
      ui.spinFor = null;
      landSound();
      render();
      showReveal(pid, pick);
    });
  }

  function animateWheel(listId, itemId, onDone) {
    const rot = document.getElementById('wheel-rot');
    const stage = document.getElementById('wheel-stage');
    const list = listById(listId);
    const items = list ? list.items.filter((i) => i.active) : [];
    const idx = items.findIndex((i) => i.id === itemId);
    if (!rot || idx < 0) { onDone(); return; }
    const seg = 360 / items.length;
    const start = ui.wheelAngle;
    const target = mod(360 - (idx * seg + seg / 2 + (Math.random() - 0.5) * seg * 0.7), 360);
    const turns = reducedMotion() ? 1 : 5 + randInt(2);
    let end = start - mod(start, 360) + turns * 360 + target;
    if (end - start < turns * 360) end += 360;
    const dur = reducedMotion() ? 700 : 4600 + randInt(900);
    const pointer = document.getElementById('pointer');
    const hub = document.getElementById('hub');
    ui.spinning = true;
    if (stage) stage.classList.add('spinning');
    if (hub) hub.disabled = true;
    let last = Math.floor(start / seg);
    const t0 = performance.now();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      ui.wheelAngle = mod(end, 360);
      ui.spinning = false;
      if (stage) stage.classList.remove('spinning');
      onDone();
    };
    const frame = (now) => {
      if (!document.body.contains(rot)) { finish(); return; }
      const t = Math.min(1, (now - t0) / dur);
      const ang = start + (end - start) * (1 - Math.pow(1 - t, 4));
      rot.setAttribute('transform', `rotate(${ang.toFixed(2)} 160 160)`);
      const cur = Math.floor(ang / seg);
      if (cur !== last) {
        last = cur;
        tickSound();
        if (pointer) { pointer.classList.remove('flick'); void pointer.getBoundingClientRect(); pointer.classList.add('flick'); }
      }
      if (t < 1) requestAnimationFrame(frame); else finish();
    };
    requestAnimationFrame(frame);
  }

  function showReveal(pid, item) {
    const p = playerById(pid);
    if (!p) return;
    const next = state.players.find((x) => !state.wheel.current[x.id]);
    showCard({ p, lead: `${p.name} bekommt`, emoji: item.emoji, title: item.title, text: item.text, button: next ? `Weiter: ${next.name} dreht` : 'Alles klar', auto: local.tv ? 7000 : 0 });
  }

  // Ein anderes Handy hat gedreht: hier mitdrehen und aufdecken.
  function maybeAnimateRemoteSpin() {
    const ls = state.wheel.lastSpin;
    if (!ls || ls.id === ui.lastSpinSeen) return;
    ui.lastSpinSeen = ls.id;
    if (Date.now() - (ls.at || 0) > 60000) return;
    if (ui.spinning) return;
    const list = listById(ls.listId);
    const item = list && list.items.find((i) => i.id === ls.itemId);
    if (!item) return;
    if (local.tv) { tvSpin(ls, list, item); return; }
    if (local.tab !== 'wheel') return;
    ui.wheelListId = ls.listId;
    ui.revealHold = ls.playerId;
    render();
    animateWheel(ls.listId, ls.itemId, () => {
      ui.revealHold = null;
      landSound();
      render();
      showReveal(ls.playerId, item);
    });
  }

  /* ======================================================================
     9. EINSTELLUNGEN & EDITOREN
     ====================================================================== */
  function openPlayers() {
    const s = openSheet({
      title: 'Spieler',
      body: () => {
        const locked = state.results.length > 0;
        return `<div class="rows">${state.players.map((p) => `<button class="row" type="button" data-s="edit" data-pid="${esc(p.id)}">${avatar(p, 'sm')}<span class="r-label">${esc(p.name)}</span>${ICON.chev}</button>`).join('')}</div>
        ${state.players.length < 6 ? `<button class="btn ghost" type="button" data-s="add"${locked ? ' disabled' : ''}>+ Spieler hinzufügen</button>` : ''}
        <p class="note">${locked ? 'Spieler hinzufügen oder entfernen geht nur, solange in dieser GameNight noch keine Ergebnisse stehen.' : 'Die App ist für 3 Spieler gebaut, funktioniert aber mit 2 bis 6.'}</p>`;
      },
      on: (a, el) => {
        if (a === 'edit') openPlayerForm(el.dataset.pid, s);
        if (a === 'add') openPlayerForm(null, s);
      },
    });
  }
  function openPlayerForm(pid, parent) {
    const existing = pid ? playerById(pid) : null;
    const others = state.players.filter((p) => p.id !== pid);
    const draft = existing ? clone(existing) : {
      id: 'p' + uid(), name: '',
      emoji: EMOJIS.find((e) => !others.some((p) => p.emoji === e)) || '🙂',
      color: SWATCHES.find((c) => !others.some((p) => p.color === c)) || SWATCHES[0],
    };
    draft.photo = existing ? photoOf(existing.id) : null;
    openSheet({
      title: existing ? 'Spieler bearbeiten' : 'Neuer Spieler',
      body: () => `<div class="photo-row"><span class="avatar lg" style="--pc:${esc(draft.color)}" aria-hidden="true">${draft.photo ? `<img src="${esc(draft.photo)}" alt="">` : esc(draft.emoji)}</span><div class="photo-btns"><button class="btn ghost small" type="button" data-s="photo">${draft.photo ? 'Anderes Foto' : 'Foto aufnehmen oder wählen'}</button>${draft.photo ? '<button class="link-btn danger" type="button" data-s="nophoto">Foto entfernen</button>' : ''}</div></div>
        <label class="field"><span>Name</span><input class="input" id="pf-name" maxlength="16" value="${esc(draft.name)}" placeholder="Name" autocomplete="off"></label>
        <div class="field"><span class="label">${draft.photo ? 'Emoji (erscheint, wenn kein Foto da ist)' : 'Avatar'}</span><div class="emoji-grid">${EMOJIS.map((e) => `<button type="button" data-s="emoji" data-v="${e}" aria-pressed="${draft.emoji === e}" aria-label="Avatar ${e}">${e}</button>`).join('')}</div></div>
        <label class="field"><span>…oder eigenes Emoji</span><input class="input" id="pf-emoji" maxlength="8" value="${EMOJIS.includes(draft.emoji) ? '' : esc(draft.emoji)}" placeholder="z. B. 🐻" autocomplete="off"></label>
        <div class="field"><span class="label">Farbe</span><div class="swatches">${SWATCHES.map((c) => `<button type="button" data-s="color" data-v="${c}" style="--sw:${c}" aria-pressed="${draft.color === c}" aria-label="Farbe ${c}"></button>`).join('')}</div></div>
        <div class="sheet-actions">${existing && state.players.length > 2 && !state.results.length ? '<button class="btn ghost" type="button" data-s="remove">Entfernen</button>' : ''}<button class="btn primary" type="button" data-s="save">Speichern</button></div>`,
      onInput: (el) => {
        if (el.id === 'pf-name') draft.name = el.value;
        if (el.id === 'pf-emoji' && el.value.trim()) draft.emoji = el.value.trim();
      },
      on: async (a, el, ev, api) => {
        if (a === 'emoji') { draft.emoji = el.dataset.v; api.refresh(); }
        if (a === 'color') { draft.color = el.dataset.v; api.refresh(); }
        if (a === 'photo') pickImage({ max: 256, square: true }, (data) => { draft.photo = data; if (!api.closed) api.refresh(); });
        if (a === 'nophoto') { draft.photo = null; api.refresh(); }
        if (a === 'save') {
          const name = draft.name.trim() || (existing ? existing.name : 'Spieler ' + (state.players.length + 1));
          commit((st) => {
            const i = st.players.findIndex((p) => p.id === draft.id);
            const np = normalizePlayer(Object.assign({}, draft, { name }), i < 0 ? st.players.length : i);
            delete np.photo;
            if (i >= 0) st.players[i] = np; else st.players.push(np);
            if (draft.photo) st.media['p_' + draft.id] = draft.photo; else delete st.media['p_' + draft.id];
          });
          api.close();
          if (parent && !parent.closed) parent.refresh();
        }
        if (a === 'remove') {
          const ok = await confirmSheet({ title: `${draft.name || 'Spieler'} entfernen?`, text: 'Der Spieler verschwindet aus Tabelle und Glücksrad.', ok: 'Entfernen', danger: true });
          if (!ok) return;
          commit((st) => {
            st.players = st.players.filter((p) => p.id !== draft.id);
            delete st.wheel.current[draft.id];
            delete st.media['p_' + draft.id];
          });
          api.close();
          if (parent && !parent.closed) parent.refresh();
        }
      },
    });
  }

  function gameSummary(g) {
    if (g.scoring === 'free') return 'Freie Punkte' + (g.maxPoints != null ? ` · max ${fmtPts(g.maxPoints)}` : '');
    return 'Plätze: ' + g.points.slice(0, state.players.length).map(fmtPts).join(' / ');
  }
  function openGames() {
    const s = openSheet({
      title: 'Spiele & Punkte',
      body: () => `<div class="rows">${state.games.map((g) => `<button class="row" type="button" data-s="edit" data-gid="${esc(g.id)}"><span style="font-size:24px;width:34px;text-align:center" aria-hidden="true">${esc(g.emoji)}</span><span class="r-label">${esc(g.name)}<small>${esc(gameSummary(g))}</small></span>${ICON.chev}</button>`).join('')}</div>
        <button class="btn ghost" type="button" data-s="add">+ Neues Spiel</button>`,
      on: (a, el) => {
        if (a === 'edit') openGameForm(el.dataset.gid, s);
        if (a === 'add') openGameForm(null, s);
      },
    });
  }
  function openGameForm(gid, parent) {
    const existing = gid ? gameById(gid) : null;
    const n = state.players.length;
    const draft = existing ? clone(existing) : normalizeGame({ id: 'g' + uid(), name: '', emoji: '🎮', unit: 'Runde', scoring: 'placement', points: [3, 1, 0] });
    while (draft.points.length < n) draft.points.push(0);
    openSheet({
      title: existing ? 'Spiel bearbeiten' : 'Neues Spiel',
      body: () => `<label class="field"><span>Name</span><input class="input" id="gf-name" value="${esc(draft.name)}" placeholder="z. B. Schätzfragen" autocomplete="off"></label>
        <div class="grid2"><label class="field"><span>Emoji</span><input class="input" id="gf-emoji" maxlength="8" value="${esc(draft.emoji)}"></label><label class="field"><span>Eine Einheit heißt</span><input class="input" id="gf-unit" value="${esc(draft.unit)}" placeholder="Runde, Grand Prix …"></label></div>
        <div class="field"><span class="label">Wertung</span><div class="seg" role="group" aria-label="Wertung"><button type="button" data-s="scoring" data-v="placement" aria-pressed="${draft.scoring === 'placement'}">Platzierung</button><button type="button" data-s="scoring" data-v="free" aria-pressed="${draft.scoring === 'free'}">Freie Punkte</button></div></div>
        ${draft.scoring === 'placement'
          ? `<div class="field"><span class="label">Punkte pro Platz</span><div class="grid-pts">${Array.from({ length: n }, (_, i) => `<label class="field"><span>Platz ${i + 1}</span><input class="input" inputmode="decimal" data-place="${i}" value="${esc(fmtPts(draft.points[i]))}"></label>`).join('')}</div></div>`
          : `<label class="field"><span>Höchstens erreichbare Punkte pro ${esc(draft.unit || 'Runde')}</span><input class="input" inputmode="decimal" id="gf-max" value="${draft.maxPoints == null ? '' : esc(fmtPts(draft.maxPoints))}" placeholder="leer lassen, wenn offen"></label><p class="note">Wird für die Anzeige „nicht mehr einzuholen“ gebraucht.</p>`}
        <label class="field"><span>Glücksrad</span><select class="input" id="gf-wheel"><option value="">Kein Glücksrad</option>${state.handicapLists.map((l) => `<option value="${esc(l.id)}"${l.id === draft.wheelList ? ' selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label>
        ${draft.mode === 'hol'
          ? `<div class="field"><span class="label">Higher or Lower</span><div class="grid-pts"><label class="field"><span>Runden</span><input class="input" inputmode="numeric" data-hol="rounds" value="${esc(draft.hol.rounds)}"></label><label class="field"><span>Leben</span><input class="input" inputmode="numeric" data-hol="lives" value="${esc(draft.hol.lives)}"></label><label class="field"><span>Karten</span><input class="input" inputmode="numeric" data-hol="cards" value="${esc(draft.hol.cards)}"></label></div><p class="note">Wer die meisten Runden gewinnt, wird Erster. Jede Runde zieht eine zufällige Kategorie, an einem Abend keine doppelt.</p></div>`
          : draft.mode === 'bluff'
            ? `<div class="field"><span class="label">Bluff</span><label class="field"><span>Fragen pro Spiel</span><input class="input" inputmode="numeric" data-bluff="questions" value="${esc(draft.bluff.questions)}"></label></div>
              <div class="rows"><label class="row" for="gf-bl-dbl"><span class="r-label">Letzte Frage zählt doppelt</span><span class="switch"><input type="checkbox" id="gf-bl-dbl"${draft.bluff.doubleLast ? ' checked' : ''}><span></span></span></label><label class="row" for="gf-bl-sug"><span class="r-label">„Lüge vorschlagen“ erlauben<small>Hilft, wenn jemandem nichts einfällt</small></span><span class="switch"><input type="checkbox" id="gf-bl-sug"${draft.bluff.suggest ? ' checked' : ''}><span></span></span></label></div>
              <p class="note">Wahrheit gefunden: ${BLUFF_TRUTH} Punkte. Jeder, der auf deine Lüge reinfällt: ${BLUFF_FOOL} Punkt. Wer am Ende die meisten Punkte hat, wird Erster. Fragenvorrat: ${bluffQuestions().length}, davon ${bluffQuestions().filter((q) => !(state.bluffPlays || {})[q.id]).length} noch nie gespielt.</p>`
            : `<div class="rows"><label class="row" for="gf-buzzer"><span class="r-label">Buzzer<small>Zeigt bei diesem Spiel den Buzzer für Quizfragen</small></span><span class="switch"><input type="checkbox" id="gf-buzzer"${draft.buzzer ? ' checked' : ''}><span></span></span></label></div>`}
        <p class="note">Änderungen gelten für neue Ergebnisse. Schon eingetragene Spiele behalten ihre Punkte.</p>
        <div class="sheet-actions">${existing ? '<button class="btn ghost" type="button" data-s="delete">Löschen</button>' : ''}<button class="btn primary" type="button" data-s="save">Speichern</button></div>`,
      onInput: (el) => {
        if (el.id === 'gf-name') draft.name = el.value;
        if (el.id === 'gf-emoji') draft.emoji = el.value.trim() || '🎮';
        if (el.id === 'gf-unit') draft.unit = el.value;
        if (el.id === 'gf-max') draft.maxPoints = el.value.trim() === '' ? null : parseNum(el.value);
        if (el.dataset.place != null) draft.points[Number(el.dataset.place)] = parseNum(el.value);
        if (el.dataset.hol && draft.hol) draft.hol[el.dataset.hol] = Number(el.value);
        if (el.dataset.bluff && draft.bluff) draft.bluff[el.dataset.bluff] = Number(el.value);
      },
      onChange: (el) => {
        if (el.id === 'gf-wheel') draft.wheelList = el.value || null;
        if (el.id === 'gf-buzzer') draft.buzzer = el.checked;
        if (el.id === 'gf-bl-dbl' && draft.bluff) draft.bluff.doubleLast = el.checked;
        if (el.id === 'gf-bl-sug' && draft.bluff) draft.bluff.suggest = el.checked;
      },
      on: async (a, el, ev, api) => {
        if (a === 'scoring') { draft.scoring = el.dataset.v; api.refresh(); }
        if (a === 'save') {
          if (!draft.name.trim()) { toast('Gib dem Spiel einen Namen.'); return; }
          draft.name = draft.name.trim();
          draft.unit = (draft.unit || '').trim() || 'Runde';
          commit((st) => {
            const i = st.games.findIndex((g) => g.id === draft.id);
            const ng = normalizeGame(draft);
            if (i >= 0) st.games[i] = ng; else st.games.push(ng);
          });
          api.close();
          if (parent && !parent.closed) parent.refresh();
        }
        if (a === 'delete') {
          if (state.plan.some((s) => s.gameId === draft.id)) { toast('Das Spiel steht noch im Spielplan. Entferne es zuerst dort.'); return; }
          const ok = await confirmSheet({ title: `${draft.name} löschen?`, text: 'Schon gespielte Ergebnisse bleiben in der Tabelle.', ok: 'Löschen', danger: true });
          if (!ok) return;
          commit((st) => { st.games = st.games.filter((g) => g.id !== draft.id); });
          api.close();
          if (parent && !parent.closed) parent.refresh();
        }
      },
    });
  }

  function openPlanEditor() {
    if (!state.games.length) { toast('Lege zuerst ein Spiel an (Mehr → Spiele & Punkte).'); return; }
    const gameOptions = (sel) => state.games.map((g) => `<option value="${esc(g.id)}"${g.id === sel ? ' selected' : ''}>${esc(g.emoji)} ${esc(g.name)}</option>`).join('');
    openSheet({
      title: 'Spielplan bearbeiten',
      body: () => {
        const slots = slotList();
        const addSel = ui.lastAddGame && gameById(ui.lastAddGame) ? ui.lastAddGame : state.games[0].id;
        return `<p class="sheet-text">Die Reihenfolge eures Abends. „×2“ heißt doppelte Punkte. Gespielte Spiele lassen sich nicht mehr tauschen oder löschen.</p>
        ${slots.length ? `<ol class="pe-list">${slots.map((sl, i) => `<li class="pe-row"><span class="idx">${i + 1}</span><select class="input" data-in="slotGame" data-slot="${esc(sl.id)}" aria-label="Spiel ${i + 1}"${sl.result ? ' disabled' : ''}>${gameOptions(sl.gameId)}</select><span class="tools"><button type="button" class="x2-btn" data-s="x2" data-slot="${esc(sl.id)}" aria-pressed="${sl.multiplier > 1}" aria-label="Doppelte Punkte"${sl.result ? ' disabled' : ''}>×2</button><button type="button" class="icon-btn" data-s="up" data-slot="${esc(sl.id)}" aria-label="Nach oben"${i === 0 ? ' disabled' : ''}>${ICON.up}</button><button type="button" class="icon-btn" data-s="down" data-slot="${esc(sl.id)}" aria-label="Nach unten"${i === slots.length - 1 ? ' disabled' : ''}>${ICON.down}</button><button type="button" class="icon-btn" data-s="del" data-slot="${esc(sl.id)}" aria-label="Entfernen"${sl.result ? ' disabled' : ''}>${ICON.trash}</button></span></li>`).join('')}</ol>` : '<div class="empty-state">Noch keine Spiele im Plan.</div>'}
        <div class="field"><span class="label">Spiel anhängen</span><div class="pe-add"><select class="input" id="pe-add" aria-label="Spiel zum Anhängen">${gameOptions(addSel)}</select><button class="btn primary" type="button" data-s="add">Anhängen</button></div></div>`;
      },
      onChange: (el, ev, api) => {
        if (el.dataset.in === 'slotGame') {
          commit((st) => { const sl = st.plan.find((x) => x.id === el.dataset.slot); if (sl) sl.gameId = el.value; });
          api.refresh();
        }
        if (el.id === 'pe-add') ui.lastAddGame = el.value;
      },
      on: (a, el, ev, api) => {
        const id = el.dataset.slot;
        if (a === 'add') {
          const gid = (api.body.querySelector('#pe-add') || {}).value || state.games[0].id;
          ui.lastAddGame = gid;
          commit((st) => { st.plan.push({ id: uid(), gameId: gid, multiplier: 1 }); });
        }
        if (a === 'x2') commit((st) => { const sl = st.plan.find((x) => x.id === id); if (sl) sl.multiplier = sl.multiplier > 1 ? 1 : 2; });
        if (a === 'up' || a === 'down') {
          commit((st) => {
            const i = st.plan.findIndex((x) => x.id === id);
            const j = a === 'up' ? i - 1 : i + 1;
            if (i < 0 || j < 0 || j >= st.plan.length) return;
            const tmp = st.plan[i]; st.plan[i] = st.plan[j]; st.plan[j] = tmp;
          });
        }
        if (a === 'del') commit((st) => { st.plan = st.plan.filter((x) => x.id !== id); });
        api.refresh();
      },
    });
  }

  function openListsOverview() {
    const s = openSheet({
      title: 'Glücksrad-Listen',
      body: () => `<p class="sheet-text">Jede Liste ist ein eigenes Rad. Unter „Spiele & Punkte“ legst du fest, welches Spiel welches Rad benutzt.</p>
        <div class="rows">${state.handicapLists.map((l) => `<button class="row" type="button" data-s="edit" data-list="${esc(l.id)}"><span class="r-label">${esc(l.name)}<small>${l.items.filter((i) => i.active).length} von ${l.items.length} aktiv · genutzt von ${esc(state.games.filter((g) => g.wheelList === l.id).map((g) => g.name).join(', ') || 'keinem Spiel')}</small></span>${ICON.chev}</button>`).join('')}</div>
        <button class="btn ghost" type="button" data-s="new">+ Neue Liste</button>`,
      on: (a, el) => {
        if (a === 'edit') openListEditor(el.dataset.list, s);
        if (a === 'new') newList(s);
      },
    });
  }
  function newList(parent) {
    const id = 'l' + uid();
    commit((st) => { st.handicapLists.push({ id, name: 'Neue Liste', roundLabel: 'Runde', items: [] }); });
    if (parent && !parent.closed) parent.refresh();
    openListEditor(id, parent);
  }
  function openListEditor(listId, parent) {
    if (!listById(listId)) return;
    const defaults = defaultLists().find((l) => l.id === listId);
    const saveMeta = debounce((field, value) => {
      commit((st) => { const l = st.handicapLists.find((x) => x.id === listId); if (l) l[field] = value; });
    }, 500);
    openSheet({
      title: 'Liste bearbeiten',
      body: () => {
        const l = listById(listId);
        if (!l) return '<p class="sheet-text">Diese Liste gibt es nicht mehr.</p>';
        return `<div class="grid2"><label class="field"><span>Name</span><input class="input" id="le-name" value="${esc(l.name)}" autocomplete="off"></label><label class="field"><span>Eine Runde heißt</span><input class="input" id="le-round" value="${esc(l.roundLabel)}" placeholder="Rennen, Runde …"></label></div>
        ${l.items.length ? `<div class="rows">${l.items.map((it) => `<div class="row" style="padding:0 14px 0 0"><button class="item-row${it.active ? '' : ' off'}" type="button" data-s="item" data-item="${esc(it.id)}"><span class="e" aria-hidden="true">${esc(it.emoji)}</span><span style="min-width:0"><span class="t">${esc(it.title)}</span><span class="x">${esc(it.text)}</span></span></button><span class="switch"><input type="checkbox" data-in="active" data-item="${esc(it.id)}" aria-label="${esc(it.title)} aktiv"${it.active ? ' checked' : ''}><span></span></span></div>`).join('')}</div>` : '<div class="empty-state">Noch keine Handicaps in dieser Liste.</div>'}
        <button class="btn primary" type="button" data-s="add">+ Handicap hinzufügen</button>
        <p class="note">Ausgeschaltete Handicaps bleiben gespeichert, landen aber nicht auf dem Rad.</p>
        <div class="sheet-actions end">${defaults ? '<button class="link-btn" type="button" data-s="restore">Standardliste wiederherstellen</button>' : '<span></span>'}<button class="link-btn danger" type="button" data-s="deleteList">Liste löschen</button></div>`;
      },
      onInput: (el) => {
        if (el.id === 'le-name') saveMeta('name', el.value.trim() || 'Liste');
        if (el.id === 'le-round') saveMeta('roundLabel', el.value.trim() || 'Runde');
      },
      onChange: (el) => {
        if (el.dataset.in === 'active') {
          commit((st) => {
            const l = st.handicapLists.find((x) => x.id === listId);
            const it = l && l.items.find((x) => x.id === el.dataset.item);
            if (it) it.active = el.checked;
          });
          const row = el.closest('.row');
          const btn = row && row.querySelector('.item-row');
          if (btn) btn.classList.toggle('off', !el.checked);
        }
      },
      onClose: () => { saveMeta.flush(); if (parent && !parent.closed) parent.refresh(); },
      on: async (a, el, ev, api) => {
        if (a === 'item') openItemForm(listId, el.dataset.item, api);
        if (a === 'add') openItemForm(listId, null, api);
        if (a === 'restore') {
          const ok = await confirmSheet({ title: 'Standardliste wiederherstellen?', text: 'Die Handicaps dieser Liste werden durch die aus config.js ersetzt. Eigene Einträge gehen verloren.', ok: 'Wiederherstellen', danger: true });
          if (!ok) return;
          commit((st) => { const l = st.handicapLists.find((x) => x.id === listId); if (l) l.items = clone(defaults.items); });
          api.refresh();
        }
        if (a === 'deleteList') {
          const ok = await confirmSheet({ title: 'Liste löschen?', text: 'Spiele, die dieses Rad nutzen, haben danach kein Glücksrad mehr.', ok: 'Löschen', danger: true });
          if (!ok) return;
          commit((st) => {
            st.handicapLists = st.handicapLists.filter((x) => x.id !== listId);
            st.games.forEach((g) => { if (g.wheelList === listId) g.wheelList = null; });
          });
          if (ui.wheelListId === listId) ui.wheelListId = null;
          api.close();
        }
      },
    });
  }
  function openItemForm(listId, itemId, parent) {
    const l = listById(listId);
    if (!l) return;
    const existing = itemId ? l.items.find((i) => i.id === itemId) : null;
    const draft = existing ? clone(existing) : { id: 'h' + uid(), emoji: '🎲', title: '', text: '', active: true };
    openSheet({
      title: existing ? 'Handicap bearbeiten' : 'Neues Handicap',
      body: () => `<div class="grid2" style="grid-template-columns:90px minmax(0,1fr)"><label class="field"><span>Emoji</span><input class="input" id="if-emoji" maxlength="8" value="${esc(draft.emoji)}"></label><label class="field"><span>Kurzer Titel</span><input class="input" id="if-title" maxlength="22" value="${esc(draft.title)}" placeholder="steht im Rad" autocomplete="off"></label></div>
        <label class="field"><span>Regel</span><textarea class="input" id="if-text" rows="3" placeholder="Was genau muss man tun?">${esc(draft.text)}</textarea></label>
        <p class="note">Kurze Titel (bis etwa 15 Zeichen) passen am besten ins Rad.</p>
        <div class="sheet-actions">${existing ? '<button class="btn ghost" type="button" data-s="delete">Löschen</button>' : ''}<button class="btn primary" type="button" data-s="save">Speichern</button></div>`,
      onInput: (el) => {
        if (el.id === 'if-emoji') draft.emoji = el.value.trim() || '🎲';
        if (el.id === 'if-title') draft.title = el.value;
        if (el.id === 'if-text') draft.text = el.value;
      },
      on: (a, el, ev, api) => {
        if (a === 'save') {
          if (!draft.title.trim()) { toast('Gib dem Handicap einen Titel.'); return; }
          draft.title = draft.title.trim();
          draft.text = draft.text.trim();
          commit((st) => {
            const list = st.handicapLists.find((x) => x.id === listId);
            if (!list) return;
            const i = list.items.findIndex((x) => x.id === draft.id);
            if (i >= 0) list.items[i] = normalizeItem(draft); else list.items.push(normalizeItem(draft));
          });
          api.close();
          if (parent && !parent.closed) parent.refresh();
        }
        if (a === 'delete') {
          commit((st) => { const list = st.handicapLists.find((x) => x.id === listId); if (list) list.items = list.items.filter((x) => x.id !== draft.id); });
          api.close();
          if (parent && !parent.closed) parent.refresh();
          toast('Handicap gelöscht');
        }
      },
    });
  }

  function editSession() {
    let name = state.session.name;
    openSheet({
      title: 'Name des Abends',
      body: () => `<label class="field"><span>Name</span><input class="input" id="se-name" maxlength="40" value="${esc(name)}" autocomplete="off"></label><button class="btn primary" type="button" data-s="save">Speichern</button>`,
      onInput: (el) => { if (el.id === 'se-name') name = el.value; },
      on: (a, el, ev, api) => {
        if (a !== 'save') return;
        commit((st) => { st.session.name = name.trim() || st.session.name; });
        api.close();
      },
    });
  }

  async function finishNight() {
    if (!state.results.length) { toast('Es gibt noch keine Ergebnisse zum Archivieren.'); return; }
    const ok = await confirmSheet({
      title: 'GameNight abschließen?',
      text: `Der Endstand von „${state.session.name}“ kommt in die Ruhmeshalle. Danach startet eine neue GameNight bei 0 Punkten. Spieler, Spiele und Spielplan bleiben.`,
      ok: 'Abschließen',
    });
    if (!ok) return;
    const rows = standings();
    const badges = computeBadges().map((b) => ({ emoji: b.emoji, title: b.title, text: b.text, names: b.pids.map((pid) => (playerById(pid) || {}).name).filter(Boolean) }));
    const photoKey = state.media['w_' + state.session.id] ? 'w_' + state.session.id : null;
    commit((st) => {
      st.archive.unshift({
        id: uid(), name: st.session.name, startedAt: st.session.startedAt, endedAt: Date.now(), games: st.results.length,
        standings: rows.map((r) => ({ id: r.id, name: r.p.name, emoji: r.p.emoji, color: r.p.color, points: r.points, wins: r.wins, rank: r.rank })),
        badges, photoKey,
      });
      st.results = [];
      st.wheel = emptyWheel();
      st.jokerCalls = {};
      st.stage = null;
      st.live = {};
      st.session = newSession((Number(st.session.number) || st.archive.length) + 1);
    }, { render: false });
    ui.shownPts = {};
    if (ui.stage) closeCeremony();
    local.tab = 'board';
    saveLocal();
    render();
    toast('Neue GameNight gestartet');
  }

  function hallOfFame() {
    openSheet({
      title: 'Ruhmeshalle',
      body: () => state.archive.length
        ? `<div class="hof">${state.archive.map((a) => {
          const winners = a.standings.filter((s) => s.rank === 1);
          const photo = a.photoKey && state.media[a.photoKey];
          return `<div class="hof-row">${photo ? `<img class="hof-photo" src="${esc(photo)}" alt="Siegerfoto ${esc(a.name)}">` : ''}<div class="top"><span>${esc(a.name)}</span><span class="muted">${esc(fmtDate(a.endedAt || a.startedAt))}</span></div><div>👑 ${winners.map((w) => `${esc(w.emoji)} <b>${esc(w.name)}</b>`).join(' & ')} ${winners.length > 1 ? 'teilen sich den Sieg' : 'gewinnt'}</div><div class="line">${a.standings.map((s) => `<span>${s.rank}. ${esc(s.emoji)} ${esc(s.name)} · ${fmtPts(s.points)} Pkt</span>`).join('')}</div>${(a.badges || []).length ? `<div class="line">${a.badges.map((b) => `<span>${esc(b.emoji)} ${esc(b.title)}: ${esc((b.names || []).join(' & '))}</span>`).join('')}</div>` : ''}</div>`;
        }).join('')}</div>`
        : '<div class="empty-state"><div class="big" aria-hidden="true">🏛️</div><div>Noch leer. Nach jeder GameNight landet hier der Endstand, mit Siegerfoto und Abzeichen.</div></div>',
    });
  }

  function openSyncSheet(prefill = {}) {
    if (PREVIEW) {
      openSheet({
        title: 'Live-Sync',
        body: () => `<p class="sheet-text">Live-Sync verbindet die Handys aller Mitspieler, damit jeder denselben Spielstand sieht.</p><p class="sheet-text">In dieser Vorschau ist er ausgeschaltet. Er funktioniert in der installierten App, die du selbst hostest. Wie das geht, steht in der Anleitung (README) im App-Paket.</p>`,
      });
      return;
    }
    const draft = {
      url: (local.sync && local.sync.url) || '',
      room: (local.sync && local.sync.room) || genRoom(),
      invite: prefill.invite || '',
    };
    const s = openSheet({
      title: 'Live-Sync',
      body: () => {
        const status = `<div class="status-line ${Sync.active() ? esc(Sync.status) : 'off'}"><span class="dot"></span><span>${esc(syncStatusText())}</span></div>${Sync.error ? `<p class="note" style="color:var(--bad)">${esc(Sync.error)}</p>` : ''}`;
        if (Sync.active()) {
          return `${status}
          <div class="field"><span class="label">Raumcode</span><div class="code">${esc(local.sync.room)}</div></div>
          <p class="sheet-text">Schick den Einladungscode an die anderen. Sie installieren die App, öffnen Mehr → Live-Sync und fügen den Code ein.</p>
          <label class="field"><span>Einladungscode</span><textarea class="input code" id="inv-code" rows="3" readonly>${esc(inviteCode())}</textarea></label>
          <div class="sheet-actions"><button class="btn ghost" type="button" data-s="copy">Kopieren</button>${navigator.share ? '<button class="btn primary" type="button" data-s="share">Teilen</button>' : ''}</div>
          <button class="link-btn danger" type="button" data-s="leave">Verbindung trennen</button>`;
        }
        return `<p class="sheet-text">Mit Live-Sync sehen alle Handys denselben Spielstand, egal wer etwas einträgt. Ohne Sync funktioniert die App ganz normal auf einem Spielleiter-Handy.</p>
        ${status}
        <div class="group"><div class="eyebrow">Eingeladen worden?</div>
          <label class="field"><span>Einladungscode einfügen</span><textarea class="input code" id="sy-invite" rows="3" placeholder="GN1.…" autocapitalize="off" autocorrect="off" spellcheck="false">${esc(draft.invite)}</textarea></label>
          <button class="btn primary" type="button" data-s="join">Beitreten</button></div>
        <div class="group"><div class="eyebrow">Neuen Raum eröffnen</div>
          <ol class="steps"><li>Einmalig eine kostenlose <b>Firebase Realtime Database</b> anlegen. Die Anleitung im App-Paket zeigt jeden Schritt (ca. 10 Minuten).</li><li>Die Datenbank-URL hier einfügen und verbinden.</li><li>Den Einladungscode an die anderen schicken.</li></ol>
          <label class="field"><span>Datenbank-URL</span><input class="input" id="sy-url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://…firebasedatabase.app" value="${esc(draft.url)}"></label>
          <label class="field"><span>Raumcode</span><input class="input code" id="sy-room" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(draft.room)}"></label>
          <button class="btn ghost" type="button" data-s="create">Verbinden</button></div>`;
      },
      onInput: (el) => {
        if (el.id === 'sy-url') draft.url = el.value.trim();
        if (el.id === 'sy-room') draft.room = el.value.trim();
        if (el.id === 'sy-invite') draft.invite = el.value;
      },
      on: async (a, el, ev, api) => {
        if (a === 'copy') copyText(inviteCode(), api.body.querySelector('#inv-code'));
        if (a === 'share') {
          const code = inviteCode();
          const appUrl = location.href.split('#')[0];
          try {
            await navigator.share({ title: 'Jasseks GameNight', text: `Komm in meine GameNight!\n1. Öffne ${appUrl} und füge die App zum Home-Bildschirm hinzu.\n2. Öffne die App → Mehr → Live-Sync → Einladungscode einfügen:\n${code}` });
          } catch (e) { /* abgebrochen */ }
        }
        if (a === 'leave') {
          const ok = await confirmSheet({ title: 'Verbindung trennen?', text: 'Dieses Handy behält den aktuellen Stand, bekommt aber keine Änderungen mehr.', ok: 'Trennen', danger: true });
          if (ok) { await Sync.leave(); api.refresh(); toast('Live-Sync getrennt'); }
        }
        if (a === 'join') {
          const inv = parseInvite(draft.invite);
          if (!inv) { toast('Der Einladungscode ist ungültig.'); return; }
          const ok = await Sync.start({ url: inv.url, room: inv.room, interactive: true });
          if (!api.closed) api.refresh();
          if (ok) toast('Verbunden');
        }
        if (a === 'create') {
          if (!validUrl(draft.url)) { toast('Die Datenbank-URL sieht nicht richtig aus.'); return; }
          if (!validRoom(draft.room)) { toast('Der Raumcode braucht 10 bis 40 Zeichen (Buchstaben, Zahlen, Bindestrich).'); return; }
          const ok = await Sync.start({ url: draft.url.replace(/\/+$/, ''), room: draft.room.toLowerCase(), interactive: true });
          if (!api.closed) api.refresh();
          if (ok) toast('Verbunden – jetzt die Einladung teilen');
        }
      },
      onClose: () => { ui.syncSheet = null; },
    });
    ui.syncSheet = s;
  }

  function exportData() {
    const json = JSON.stringify({ app: 'jasseks-gamenight', version: APP_VERSION, exportedAt: new Date().toISOString(), state }, null, 2);
    const fname = 'gamenight-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    openSheet({
      title: 'Backup erstellen',
      body: () => `<p class="sheet-text">Das Backup enthält Spieler, Spiele, Spielplan, Handicaps, Ergebnisse und die Ruhmeshalle.</p>
        <div class="sheet-actions">${PREVIEW ? '' : '<button class="btn primary" type="button" data-s="file">Als Datei sichern</button>'}<button class="btn ${PREVIEW ? 'primary' : 'ghost'}" type="button" data-s="copy">Text kopieren</button></div>
        <label class="field"><span>Backup als Text</span><textarea class="input code" id="ex-text" rows="6" readonly>${esc(json)}</textarea></label>`,
      on: async (a, el, ev, api) => {
        if (a === 'copy') copyText(json, api.body.querySelector('#ex-text'));
        if (a === 'file') {
          const blob = new Blob([json], { type: 'application/json' });
          let file = null;
          try { file = new File([blob], fname, { type: 'application/json' }); } catch (e) { file = null; }
          if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
            try { await navigator.share({ files: [file], title: 'GameNight-Backup' }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fname;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 3000);
          toast('Backup gesichert');
        }
      },
    });
  }

  function importData() {
    let text = '';
    openSheet({
      title: 'Backup laden',
      body: () => `<p class="sheet-text">Wähle eine Backup-Datei oder füge den Backup-Text ein. Der aktuelle Stand wird dabei ersetzt.</p>
        <label class="field"><span>Datei</span><input class="input" type="file" id="im-file" accept="application/json,.json"></label>
        <label class="field"><span>…oder Text einfügen</span><textarea class="input code" id="im-text" rows="5" placeholder="{ … }"></textarea></label>
        <button class="btn primary" type="button" data-s="load">Laden</button>`,
      onInput: (el) => { if (el.id === 'im-text') text = el.value; },
      onChange: async (el, ev, api) => {
        if (el.id === 'im-file' && el.files && el.files[0]) {
          try { text = await el.files[0].text(); } catch (e) { text = ''; }
          const ta = api.body.querySelector('#im-text');
          if (ta) ta.value = text;
        }
      },
      on: async (a, el, ev, api) => {
        if (a !== 'load') return;
        let data;
        try { data = JSON.parse(text); } catch (e) { toast('Das ist kein gültiges Backup.'); return; }
        const st = data && data.state ? data.state : data;
        if (!st || !Array.isArray(st.players) || !Array.isArray(st.games)) { toast('Das ist kein gültiges Backup.'); return; }
        const ok = await confirmSheet({ title: 'Backup laden?', text: 'Der aktuelle Spielstand wird ersetzt' + (Sync.active() ? ', auch auf allen verbundenen Handys.' : '.'), ok: 'Laden', danger: true });
        if (!ok) return;
        const next = migrate(st);
        ui.shownPts = {};
        commit((s2) => { Object.keys(s2).forEach((k) => delete s2[k]); Object.assign(s2, next); });
        api.close();
        toast('Backup geladen');
      },
    });
  }

  async function resetAll() {
    const ok = await confirmSheet({
      title: 'Alles zurücksetzen?',
      text: 'Spieler, Spiele, Spielplan, Handicaps und Ergebnisse gehen zurück auf die Standardwerte aus config.js. Die Ruhmeshalle bleibt.',
      ok: 'Zurücksetzen', danger: true,
    });
    if (!ok) return;
    const fresh = buildDefaults();
    fresh.archive = state.archive;
    fresh.media = {};
    Object.keys(state.media).forEach((k) => { if (k.indexOf('w_') === 0) fresh.media[k] = state.media[k]; });
    ui.shownPts = {};
    ui.wheelListId = null;
    commit((st) => { Object.keys(st).forEach((k) => delete st[k]); Object.assign(st, fresh); });
    local.onboarded = false;
    saveLocal();
    toast('Zurückgesetzt');
    setTimeout(openOnboarding, 300);
  }

  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
  function installHelp() {
    if (deferredInstall) {
      const ev = deferredInstall;
      deferredInstall = null;
      ev.prompt();
      return;
    }
    openSheet({
      title: 'Als App installieren',
      body: () => PREVIEW
        ? '<p class="sheet-text">Diese Vorschau läuft in Claude. Damit die App auf dem Home-Bildschirm landet, lädst du das App-Paket auf einen kostenlosen Hoster wie GitHub Pages. Die Anleitung (README) im Paket zeigt jeden Schritt.</p>'
        : `<div class="group"><div class="eyebrow">iPhone</div><ol class="steps"><li>Die App in <b>Safari</b> öffnen.</li><li>Unten auf das <b>Teilen-Symbol</b> tippen.</li><li><b>Zum Home-Bildschirm</b> wählen.</li></ol></div>
           <div class="group"><div class="eyebrow">Android</div><ol class="steps"><li>Die App in <b>Chrome</b> öffnen.</li><li>Oben rechts auf <b>⋮</b> tippen.</li><li><b>App installieren</b> oder <b>Zum Startbildschirm hinzufügen</b> wählen.</li></ol></div>
           <p class="note">Wichtig auf dem iPhone: Die installierte App hat einen eigenen Speicher. Was du vorher in Safari eingetragen hast, ist dort nicht zu sehen. Am besten erst installieren, dann loslegen.</p>`,
    });
  }

  function openOnboarding() {
    if (ui.sheets.length) return;
    const names = state.players.map((p) => (/^Spieler \d+$/.test(p.name) ? '' : p.name));
    const emo = state.players.map((p) => p.emoji);
    const photos = state.players.map((p) => photoOf(p.id));
    openSheet({
      title: 'Willkommen!',
      body: () => `<p class="sheet-text">Wer spielt heute mit? Tippe auf einen Avatar, um ihn zu wechseln, oder auf die Kamera für ein eigenes Foto.</p>
        <div class="free-list">${state.players.map((p, i) => `<div class="free-row ob-row" style="--pc:${esc(p.color)}"><button type="button" class="avatar" data-s="emo" data-i="${i}" style="--pc:${esc(p.color)};border:0;padding:0" aria-label="Avatar von Spieler ${i + 1} wechseln">${photos[i] ? `<img src="${esc(photos[i])}" alt="">` : esc(emo[i])}</button><input class="input" id="ob-${i}" data-i="${i}" maxlength="16" placeholder="Spieler ${i + 1}" value="${esc(names[i])}" autocomplete="off" aria-label="Name von Spieler ${i + 1}"><button type="button" class="icon-btn" data-s="ophoto" data-i="${i}" aria-label="Foto für Spieler ${i + 1}">${ICON.camera}</button></div>`).join('')}</div>
        <button class="btn primary block" type="button" data-s="go">Los geht's</button>
        ${PREVIEW ? '' : '<button class="link-btn" type="button" data-s="invite">Ich wurde eingeladen und habe einen Code</button>'}
        <p class="note">Spiele, Punkte, Spielplan und Handicaps kannst du jederzeit unter „Mehr“ anpassen.</p>`,
      onInput: (el) => { if (el.dataset.i != null && el.tagName === 'INPUT') names[Number(el.dataset.i)] = el.value; },
      on: (a, el, ev, api) => {
        if (a === 'emo') {
          const i = Number(el.dataset.i);
          if (photos[i]) { photos[i] = null; api.refresh(); return; }
          const used = emo.filter((_, j) => j !== i);
          let k = EMOJIS.indexOf(emo[i]);
          do { k = (k + 1) % EMOJIS.length; } while (used.includes(EMOJIS[k]));
          emo[i] = EMOJIS[k];
          api.refresh();
        }
        if (a === 'ophoto') {
          const i = Number(el.dataset.i);
          pickImage({ max: 256, square: true }, (data) => { photos[i] = data; if (!api.closed) api.refresh(); });
        }
        if (a === 'go') {
          commit((st) => st.players.forEach((p, i) => {
            if (names[i] && names[i].trim()) p.name = names[i].trim().slice(0, 16);
            if (emo[i]) p.emoji = emo[i];
            if (photos[i]) st.media['p_' + p.id] = photos[i]; else delete st.media['p_' + p.id];
          }));
          local.onboarded = true;
          saveLocal();
          api.close();
        }
        if (a === 'invite') {
          local.onboarded = true;
          saveLocal();
          api.close();
          openSyncSheet();
        }
      },
      onClose: () => { local.onboarded = true; saveLocal(); },
    });
  }

  /* ======================================================================
     10. SIEGEREHRUNG, SOUND, PWA, START
     ====================================================================== */
  // Plätze von hinten nach vorn gruppieren (Gleichstand = gemeinsam aufdecken)
  function revealGroups(rows) {
    const groups = [];
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      const g = groups[groups.length - 1];
      if (g && g.rank === r.rank) g.rows.push(r); else groups.push({ rank: r.rank, rows: [r] });
    }
    return groups;
  }
  const ceremonyGroups = () => revealGroups(standings().slice(0, 3));

  function openCeremony(opts = {}) {
    if (!state.results.length) { toast('Es gibt noch keine Ergebnisse.'); return; }
    if (ui.stage) closeCeremony({ keepStage: true, fromPop: true });
    const el = document.createElement('div');
    el.className = 'stage' + (local.tv ? ' tv' : '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Siegerehrung');
    el.innerHTML = '<div class="stage-inner"></div>';
    el.addEventListener('click', onStageClick);
    document.body.appendChild(el);
    ui.stage = el;
    ui.cer = { id: opts.id || uid(), step: 0, shown: 0, busy: false, follow: !!opts.follow, just: [], fresh: true };
    if (!opts.follow) {
      holdHistory();
      initAudio();
      const id = ui.cer.id;
      commit((st) => { st.stage = { id, step: 0, open: true, at: Date.now() }; }, { render: false });
    }
    renderCeremony();
  }
  function closeCeremony(opts = {}) {
    if (!ui.stage) return;
    ui.stage.remove();
    ui.stage = null;
    const c = ui.cer;
    ui.cer = null;
    const leader = c && !c.follow;
    if (leader && !opts.keepStage && state.stage && state.stage.open && state.stage.id === c.id) {
      commit((st) => { if (st.stage) st.stage.open = false; }, { render: false });
    }
    if (leader && !opts.fromPop) releaseHistoryIfIdle();
  }
  function renderCeremony() {
    if (!ui.stage || !ui.cer) return;
    ui.stage.classList.toggle('busy', ui.cer.busy);
    const inner = ui.stage.querySelector('.stage-inner');
    inner.innerHTML = ceremonyHtml();
    wireCharts(inner);
    ui.cer.just = [];
    ui.cer.fresh = false;
  }
  function statsRows(rows) {
    const bd = breakdownData();
    return rows.map((r) => {
      const facts = [`${r.wins} ${plural(r.wins, 'Sieg', 'Siege')}`];
      if (r.played) facts.push(`Ø Platz ${fmtPts(Math.round((r.placeSum / r.played) * 10) / 10)}`);
      let best = null;
      bd.forEach((d) => { const val = d.pts[r.id] || 0; if (val > 0 && (!best || val > best.val)) best = { val, d }; });
      if (best) facts.push(`stärkste Disziplin: ${best.d.emoji} ${best.d.name}`);
      if (r.jokerBonus) facts.push(`+${fmtPts(r.jokerBonus)} durch Joker`);
      if (r.hcWins) facts.push(`${r.hcWins} ${plural(r.hcWins, 'Sieg', 'Siege')} trotz Handicap`);
      return `<div class="stat-row" style="--pc:${esc(r.p.color)}">${avatar(r.p, 'sm', { crown: false })}<div><div class="nm">${r.rank}. ${esc(r.p.name)} · ${fmtPts(r.points)} Punkte</div><div class="facts">${esc(facts.join(' · '))}</div></div></div>`;
    }).join('');
  }
  function ceremonyHtml() {
    const c = ui.cer;
    const rows = standings();
    const top = rows.slice(0, 3);
    const groups = revealGroups(top);
    const shown = Math.min(c.shown, groups.length);
    const done = shown >= groups.length;
    const open = new Set();
    groups.slice(0, shown).forEach((g) => g.rows.forEach((r) => open.add(r.id)));
    const winners = rows.filter((r) => r.rank === 1);
    const nextG = groups[shown];
    let title;
    if (done) title = winners.length > 1 ? 'Gleichstand an der Spitze!' : `${esc(winners[0].p.name)} gewinnt!`;
    else if (c.busy) title = nextG && nextG.rank === 1 ? 'Und der Sieg geht an …' : 'Trommelwirbel …';
    else title = shown === 0 ? 'Siegerehrung' : 'Wer holt den Sieg?';
    const pod = (r, pos) => {
      if (!r) return '<div></div>';
      const isOpen = open.has(r.id);
      const h = isOpen ? Math.min(3, r.rank) : pos + 1;
      const body = isOpen
        ? `${avatar(r.p, '', { crown: false })}<span class="nm">${esc(r.p.name)}</span><span class="pp">${fmtPts(r.points)}</span>`
        : '<span class="avatar mystery" aria-hidden="true">?</span><span class="nm">&nbsp;</span><span class="pp">&nbsp;</span>';
      return `<div class="pod p${pos + 1}${isOpen ? ' open' : ''}${c.just.includes(r.id) ? ' just' : ''}" style="--pc:${isOpen ? esc(r.p.color) : 'var(--rail)'}">${body}<div class="block-pod h${h}${isOpen ? '' : ' hidden'}${c.fresh ? ' grow' : ''}">${isOpen ? r.rank : '?'}</div></div>`;
    };
    let html = `<div class="eyebrow">${esc(state.session.name)} · Endstand</div><h1 class="stage-title" aria-live="polite">${title}</h1><div class="podium">${pod(top[1], 1)}${pod(top[0], 0)}${pod(top[2], 2)}</div>`;
    if (!done) {
      if (c.follow) html += '<p class="muted">Gleich wird aufgedeckt …</p><button class="link-btn" type="button" data-st="close">Schließen</button>';
      else {
        const label = nextG.rank === 1 ? 'Sieger aufdecken' : `Platz ${nextG.rank} aufdecken`;
        html += `<div class="stage-actions"><button class="btn primary" type="button" data-st="reveal"${c.busy ? ' disabled' : ''}>${label}</button><button class="btn ghost" type="button" data-st="close">Zurück zur Tabelle</button></div>`;
      }
      return html;
    }
    const badges = computeBadges();
    if (badges.length) html += `<section class="cer-sec"><div class="eyebrow">Abzeichen</div><div class="badges">${badges.map(badgeCard).join('')}</div></section>`;
    const chart = chartHtml({ tall: !!local.tv });
    if (chart) html += `<section class="cer-sec"><div class="eyebrow">Rennverlauf</div><div class="chart-box">${chart}</div></section>`;
    html += `<section class="cer-sec"><div class="eyebrow">Alle Ergebnisse</div><div class="stats">${statsRows(rows)}</div></section>`;
    const photo = state.media['w_' + state.session.id];
    if (c.follow) {
      if (photo) html += `<section class="champ-photo"><img src="${esc(photo)}" alt="Siegerfoto"></section>`;
      html += '<button class="link-btn" type="button" data-st="close">Schließen</button>';
      return html;
    }
    html += `<section class="champ-photo">${photo ? `<img src="${esc(photo)}" alt="Siegerfoto">` : ''}<button class="btn ghost" type="button" data-st="photo">${photo ? 'Anderes Siegerfoto wählen' : 'Siegerfoto aufnehmen'}</button><p class="note">Das Siegerfoto kommt mit dem Endstand in die Ruhmeshalle. Der Sieger trägt bei der nächsten GameNight die Krone.</p></section>`;
    html += `<div class="stage-actions">${winners.length > 1 ? '<button class="btn primary" type="button" data-st="tiebreak">Stechen eintragen</button>' : ''}<button class="btn ${winners.length > 1 ? 'ghost' : 'primary'}" type="button" data-st="finish">GameNight abschließen</button><button class="btn ghost" type="button" data-st="close">Zurück zur Tabelle</button></div>`;
    return html;
  }
  function ceremonyReveal() {
    const c = ui.cer;
    if (!c || c.busy || c.follow) return;
    const total = ceremonyGroups().length;
    if (c.step >= total) return;
    c.step += 1;
    const step = c.step;
    commit((st) => { st.stage = { id: c.id, step, open: true, at: Date.now() }; }, { render: false });
    initAudio();
    playRevealStep(step);
  }
  function playRevealStep(step) {
    const c = ui.cer;
    if (!c) return;
    const groups = ceremonyGroups();
    const g = groups[step - 1];
    if (!g) return;
    c.busy = true;
    renderCeremony();
    const win = g.rank === 1;
    const dur = reducedMotion() ? 300 : win ? 2600 : 1200;
    drumroll(dur / 1000);
    setTimeout(() => {
      if (ui.cer !== c) return;
      c.busy = false;
      c.shown = Math.max(c.shown, step);
      c.just = g.rows.map((r) => r.id);
      renderCeremony();
      if (c.shown >= groups.length) {
        fanfare();
        confetti(ui.stage, standings().filter((r) => r.rank === 1).map((r) => r.p.color).concat(['#ffc93c', '#ffffff']));
      } else revealSound();
      if (c.step > c.shown) setTimeout(() => playRevealStep(c.shown + 1), 400);
    }, dur);
  }
  function onStageClick(e) {
    const b = e.target.closest('[data-st]');
    if (!b || b.disabled) return;
    const a = b.dataset.st;
    if (a === 'reveal') ceremonyReveal();
    if (a === 'close') { if (ui.cer && ui.cer.follow) ui.dismissedStage = ui.cer.id; closeCeremony(); }
    if (a === 'finish') finishNight();
    if (a === 'tiebreak') { closeCeremony(); openResultSheet({ extra: true }); }
    if (a === 'photo') {
      pickImage({ max: 720, square: false }, (data) => {
        commit((st) => { st.media['w_' + st.session.id] = data; }, { render: false });
        renderCeremony();
        toast('Siegerfoto gespeichert');
      });
    }
  }

  function confetti(host, colors) {
    if (reducedMotion()) return;
    const cv = document.createElement('canvas');
    host.appendChild(cv);
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth, H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.scale(dpr, dpr);
    const parts = Array.from({ length: 170 }, () => ({
      x: Math.random() * W, y: -20 - Math.random() * H * 0.6,
      vx: (Math.random() - 0.5) * 2.4, vy: 1.5 + Math.random() * 3,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const t0 = performance.now();
    const step = (now) => {
      if (!cv.isConnected) return;
      const age = now - t0;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = age > 4500 ? Math.max(0, 1 - (age - 4500) / 1000) : 1;
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.035; p.vx *= 0.995; p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
        ctx.restore();
      }
      if (age < 5500) requestAnimationFrame(step); else cv.remove();
    };
    requestAnimationFrame(step);
  }

  // Sound (nur nach einer Berührung möglich – so wollen es die Browser)
  let actx = null;
  function initAudio() {
    if (!local.sound) return;
    try {
      if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); }
      if (actx && actx.state === 'suspended') actx.resume();
    } catch (e) { actx = null; }
  }
  function tone(freq, dur, type, vol, delay = 0) {
    if (!actx || !local.sound) return;
    try {
      const t = actx.currentTime + delay;
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(actx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) { /* egal */ }
  }
  function tickSound() {
    tone(1500, 0.03, 'square', 0.03);
    if (navigator.vibrate) { try { navigator.vibrate(3); } catch (e) { /* egal */ } }
  }
  const landSound = () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.2, 'triangle', 0.07, i * 0.08));
  const fanfare = () => [392, 523.25, 659.25, 783.99, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i === 6 ? 0.6 : 0.16, 'triangle', 0.08, i * 0.13));
  const jokerSound = () => [659.25, 987.77, 1318.5].forEach((f, i) => tone(f, 0.12, 'square', 0.04, i * 0.08));
  const revealSound = () => [523.25, 783.99].forEach((f, i) => tone(f, 0.22, 'triangle', 0.08, i * 0.1));
  function noiseHit(delay, vol, dur, freq) {
    if (!actx || !local.sound) return;
    try {
      if (!ui.noise) {
        const len = Math.floor(actx.sampleRate * 0.3);
        ui.noise = actx.createBuffer(1, len, actx.sampleRate);
        const d = ui.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      const t = actx.currentTime + delay;
      const src = actx.createBufferSource();
      src.buffer = ui.noise;
      const f = actx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      const g = actx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(actx.destination);
      src.start(t);
      src.stop(t + dur + 0.02);
    } catch (e) { /* egal */ }
  }
  // Trommelwirbel, der lauter wird, mit Becken am Schluss
  function drumroll(sec) {
    for (let t = 0; t < sec; t += 0.045) noiseHit(t, 0.08 + 0.3 * (t / sec), 0.07, 650);
    noiseHit(sec, 0.5, 0.7, 4200);
  }

  // Bildschirm anlassen
  let wakeLock = null;
  async function requestWake() {
    if (!local.wake || wakeLock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (e) { wakeLock = null; }
  }
  function releaseWake() {
    if (wakeLock) { try { wakeLock.release(); } catch (e) { /* egal */ } wakeLock = null; }
  }

  // Service Worker: Offline-Betrieb und Update-Hinweis
  function registerSW() {
    if (PREVIEW || !('serviceWorker' in navigator) || location.protocol === 'file:') return;
    const hadController = !!navigator.serviceWorker.controller;
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      location.reload();
    });
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const offer = (w) => toast('Neue Version verfügbar', { label: 'Aktualisieren', fn: () => w.postMessage('skipWaiting') }, 0);
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
      });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => { /* ohne Service Worker läuft die App trotzdem */ });
  }

  const ACTIONS = {
    tab: (el) => {
      if (local.tab === el.dataset.tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      local.tab = el.dataset.tab;
      saveLocal();
      render();
      window.scrollTo(0, 0);
    },
    enterResult: (el) => openResultSheet({ slotId: el.dataset.slot }),
    editResult: (el) => openResultSheet({ slotId: el.dataset.slot || null, resultId: el.dataset.result || null }),
    extraResult: () => openResultSheet({ extra: true }),
    editPlan: openPlanEditor,
    ceremony: openCeremony,
    openSync: () => openSyncSheet(),
    spin: doSpin,
    spinFor: (el) => { if (ui.spinning) return; ui.spinFor = el.dataset.pid; render(); },
    nextRace: () => { if (ui.spinning) return; ui.spinFor = null; commit((st) => { st.wheel.race += 1; st.wheel.current = {}; }); },
    pickList: (el) => { if (ui.spinning) return; ui.wheelListId = el.dataset.list; render(); },
    editList: (el) => openListEditor(el.dataset.list),
    newList: () => newList(null),
    editSession, finishNight, hallOfFame, installHelp, exportData, importData, resetAll,
    editPlayers: openPlayers,
    editGames: openGames,
    editLists: openListsOverview,
    joker: (el) => toggleJokerCall(el.dataset.slot, el.dataset.pid),
    holStart: (el) => holStart(el.dataset.slot),
    bluffStart: (el) => bluffStart(el.dataset.slot),
    buzzStart: (el) => buzzStart(el.dataset.slot),
    gameOpen: (el) => { ui.gameOpen = el.dataset.k; render(); },
    whoAmI: () => openWhoAmI(),
    tvStart: () => {
      local.tv = true;
      if (!local.me) local.me = 'watch';
      saveLocal();
      hideToast();
      initAudio();
      requestWake();
      render();
      window.scrollTo(0, 0);
      followStage();
    },
    tvExit: () => {
      local.tv = false;
      saveLocal();
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      if (ui.stage && ui.cer && ui.cer.follow) closeCeremony();
      render();
    },
    tvFull: () => {
      initAudio();
      requestWake();
      const d = document.documentElement;
      if (d.requestFullscreen) d.requestFullscreen().catch(() => toast('Vollbild geht auf diesem Gerät nicht.'));
      else toast('Vollbild geht auf diesem Gerät nicht.');
    },
  };

  function init() {
    loadAll();
    Sync.loadPending();
    ['sheets', 'toast'].forEach((id) => {
      if (!document.getElementById(id)) { const d = document.createElement('div'); d.id = id; if (id === 'toast') d.setAttribute('role', 'status'); document.body.appendChild(d); }
    });
    ui.lastSpinSeen = state.wheel.lastSpin ? state.wheel.lastSpin.id : null;
    if ((location.hash || '') === '#tv') { local.tv = true; if (!local.me) local.me = 'watch'; saveLocal(); }
    // iPhone: Buzzer auch bei Stummschalter hörbar machen (wo unterstützt)
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* egal */ }

    document.addEventListener('click', (ev) => {
      const el = ev.target.closest('[data-act]');
      if (!el || el.closest('.layer') || el.disabled) return;
      const fn = ACTIONS[el.dataset.act];
      if (fn) { ev.preventDefault(); fn(el, ev); }
    });
    document.addEventListener('change', (ev) => {
      const el = ev.target;
      if (!el.dataset || !el.dataset.local) return;
      local[el.dataset.local] = el.checked;
      saveLocal();
      if (el.dataset.local === 'wake') { if (el.checked) requestWake(); else releaseWake(); }
      if (el.dataset.local === 'sound' && el.checked) { initAudio(); tickSound(); }
    });
    document.addEventListener('pointerdown', () => {
      initAudio();
      requestWake();
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    }, { once: true });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') requestWake(); });
    window.addEventListener('storage', (e) => {
      if (e.key === K_STATE && e.newValue) { try { state = migrate(JSON.parse(e.newValue)); render(); } catch (err) { /* egal */ } }
    });

    render();
    snapshotKnown();
    ui.booting = false;
    followStage();
    if (Sync.active()) Sync.start({ url: local.sync.url, room: local.sync.room });
    registerSW();
    requestWake();

    const hash = location.hash || '';
    if (!PREVIEW && hash.indexOf('#join=') === 0) {
      const code = decodeURIComponent(hash.slice(6));
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* egal */ }
      setTimeout(() => openSyncSheet({ invite: code }), 350);
    } else if (!local.onboarded && !state.results.length && !local.tv) {
      setTimeout(openOnboarding, 400);
    }
  }

  // Für Tests und Neugierige: window.GameNight
  window.GameNight = {
    get state() { return state; },
    scorePlacement, scoreFree, standings: () => standings(), toNodes, fromNodes, flattenRemote, parseInvite, inviteCode, Sync,
    comebackInfo, computeBadges, jokerStatus, timeline,
    holCategories: () => holCategories(), live: (k) => live(k),
    holDerive: () => (live('hol') ? holDerive(live('hol')) : null),
    holTurn: () => (live('hol') ? holTurn(holDerive(live('hol')).cur) : null),
    _holAnswer: (pid, gap) => holSubmit(pid, gap), _holNext: () => holNext(),
    bluffCount: () => bluffQuestions().length,
    // Prüft den Fragenvorrat, ohne Inhalte preiszugeben
    _bluffCheck: () => bluffQuestions().map((q) => ({ id: q.id, cat: q.cat, lies: q.lies.length, liesTooClose: q.lies.filter((l) => bluffTooClose(l, q)).length, liesSame: new Set(q.lies.map(bluffNorm)).size !== q.lies.length, truthFlagged: bluffTooClose(q.a, q), src: !!q.src })),
    bluffDerive: () => (live('bluff') ? bluffDerive(live('bluff')) : null),
    bluffTooClose: (t, id) => bluffTooClose(t, bluffQ(id)),
    _bluffWrite: (pid, t) => bluffWrite(pid, t), _bluffVote: (pid, k) => bluffVote(pid, k), _bluffNext: () => bluffNext(),
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
