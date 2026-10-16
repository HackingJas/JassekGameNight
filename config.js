/* ==========================================================================
   JASSEKS GAMENIGHT – KONFIGURATION
   --------------------------------------------------------------------------
   Hier stehen die STANDARDWERTE der App: Spieler, Spiele, Punkte, Spielplan
   und die Handicaps fürs Glücksrad.

   Fast alles davon kannst du auch direkt in der App unter „Mehr“ ändern.
   Diese Datei wird nur benutzt, wenn die App zum ersten Mal startet oder
   wenn du in der App „Alles zurücksetzen“ bzw. „Standardliste
   wiederherstellen“ antippst.

   Nach einer Änderung an dieser Datei: in sw.js die VERSION hochzählen,
   damit die installierte App die neue Fassung lädt.
   ========================================================================== */

window.GAMENIGHT_CONFIG = {

  appName: 'Jasseks GameNight',

  /* ------------------------------------------------------------------------
     REGELN
     jokersPerNight  Joker pro Spieler und Abend. Vor einem Spiel ansagen,
                     dann zählen die eigenen Punkte in diesem Spiel doppelt
                     (im Finale ×2 also sogar vierfach).
     comebackStreak  Wer so oft hintereinander Letzter wird, bekommt einmal
                     pro Abend einen Extra-Joker („Aufhol-Joker“). 0 = aus.
     ------------------------------------------------------------------------ */
  rules: {
    jokersPerNight: 1,
    comebackStreak: 3,
  },

  /* ------------------------------------------------------------------------
     SPIELER
     Namen, Emoji und Farbe lassen sich in der App ändern (Mehr → Spieler).
     ------------------------------------------------------------------------ */
  players: [
    { id: 'p1', name: 'Spieler 1', emoji: '🦊', color: '#ff5d73' },
    { id: 'p2', name: 'Spieler 2', emoji: '🐸', color: '#3ddc97' },
    { id: 'p3', name: 'Spieler 3', emoji: '🐼', color: '#4cc9f0' },
  ],

  /* ------------------------------------------------------------------------
     SPIELE
     id         eindeutiger Kurzname (keine Leerzeichen)
     name       Anzeigename
     emoji      Symbol
     unit       Wie heißt eine Einheit? („Grand Prix“, „Runde“, „Frage“ …)
     scoring    'placement' = Spieler in Zielreihenfolge antippen,
                              Punkte kommen aus `points`
                'free'      = Punkte pro Spieler frei eintragen
                              (z. B. Schätzfragen, Filme erraten)
     points     Punkte für Platz 1, 2, 3 … (nur bei 'placement')
     maxPoints  höchstmögliche Punktzahl pro Einheit (nur bei 'free';
                wird für die Anzeige „nicht mehr einzuholen“ gebraucht)
     wheelList  id einer Glücksrad-Liste (siehe unten) oder weglassen
     buzzer     true → bei diesem Spiel erscheint der Buzzer (für Quizfragen)
     mode       'hol'   → Higher or Lower (läuft komplett in der App)
                'bluff' → Bluff (läuft komplett in der App)
     hol        { rounds, lives, cards } – Runden (Best of), Leben, Karten pro Runde
     bluff      { questions, doubleLast, suggest } – Fragen pro Spiel, letzte Frage
                doppelt, Knopf „Lüge vorschlagen“
     ------------------------------------------------------------------------ */
  games: [
    { id: 'mk8',         name: 'Mario Kart 8 Deluxe', emoji: '🏎️', unit: 'Grand Prix', scoring: 'placement', points: [3, 1, 0], wheelList: 'mariokart' },
    { id: 'mkw',         name: 'Mario Kart World',    emoji: '🌍', unit: 'Grand Prix', scoring: 'placement', points: [3, 1, 0], wheelList: 'mariokart' },
    { id: 'bomberman',   name: 'Bomberman',           emoji: '💣', unit: 'Runde',      scoring: 'placement', points: [3, 1, 0] },
    { id: 'boomerangfu', name: 'Boomerang Fu',        emoji: '🪃', unit: 'Runde',      scoring: 'placement', points: [3, 1, 0] },
    { id: 'hol',         name: 'Higher or Lower',     emoji: '📈', unit: 'Spiel',      scoring: 'placement', points: [3, 1, 0], mode: 'hol', hol: { rounds: 5, lives: 2, cards: 12 } },
    { id: 'bluff',       name: 'Bluff',               emoji: '🎭', unit: 'Spiel',      scoring: 'placement', points: [3, 1, 0], mode: 'bluff', bluff: { questions: 6, doubleLast: true, suggest: true } },

    // Quizspiele mit Buzzer: Die Fragen liest jemand vor, der nicht mitspielt
    { id: 'schaetzen',   name: 'Schätzfragen',        emoji: '🤔', unit: 'Runde',      scoring: 'free', maxPoints: 10, buzzer: true },
    { id: 'filme',       name: 'Filme erraten',       emoji: '🎬', unit: 'Runde',      scoring: 'free', maxPoints: 10, buzzer: true },
  ],

  /* ------------------------------------------------------------------------
     SPIELPLAN
     Reihenfolge des Abends. `game` verweist auf die id eines Spiels.
     multiplier: 2  → dieses Spiel zählt doppelt (Finale)
     ------------------------------------------------------------------------ */
  plan: [
    { game: 'mk8' },
    { game: 'bomberman' },
    { game: 'boomerangfu' },
    { game: 'hol' },
    { game: 'mkw' },
    { game: 'bluff' },
    { game: 'bomberman' },
    { game: 'schaetzen' },
    { game: 'boomerangfu' },
    { game: 'mk8' },
    { game: 'mkw', multiplier: 2 },
  ],

  /* ------------------------------------------------------------------------
     GLÜCKSRAD
     Jede Liste ist ein eigenes Rad. Ein Spiel nutzt eine Liste über
     `wheelList`. roundLabel ist das Wort für eine Runde („Rennen“).
     title  kurzer Text, der im Rad steht (am besten unter 15 Zeichen)
     text   die ausführliche Regel
     ------------------------------------------------------------------------ */
  handicapLists: [
    {
      id: 'mariokart',
      name: 'Mario Kart',
      roundLabel: 'Rennen',
      items: [
        { id: 'stillstand',   emoji: '⏱️', title: 'Stillstand',      text: 'Bleib die ersten 15 Sekunden nach dem Start stehen.' },
        { id: 'einhand',      emoji: '✋', title: 'Einhand-Pilot',   text: 'Eine Hand bleibt das ganze Rennen hinter dem Rücken.' },
        { id: 'driftverbot',  emoji: '🚫', title: 'Driftverbot',     text: 'Kein einziger Drift – also auch keine Mini-Turbos.' },
        { id: 'itemfasten',   emoji: '🍌', title: 'Item-Fasten',     text: 'Items einsammeln ist erlaubt, benutzen ist verboten.' },
        { id: 'kartoffel',    emoji: '🥔', title: 'Heiße Kartoffel', text: 'Jedes Item muss sofort eingesetzt werden. Festhalten zur Verteidigung ist verboten.' },
        { id: 'reporter',     emoji: '🎙️', title: 'Sportreporter',   text: 'Kommentiere das ganze Rennen live. Mehr als 3 Sekunden Stille heißt: kurz vom Gas.' },
        { id: 'fremd',        emoji: '🎭', title: 'Fremdbestimmt',   text: 'Die anderen beiden wählen deinen Fahrer und dein Fahrzeug.' },
        { id: 'stopp',        emoji: '🛑', title: 'Stopp-Joker',     text: 'Zweimal pro Rennen darf ein Gegner „Stopp!“ rufen. Dann nimmst du 2 Sekunden die Hände vom Controller.' },
        { id: 'ueberkreuz',   emoji: '🔀', title: 'Überkreuz',       text: 'Fahre das ganze Rennen mit überkreuzten Armen.' },
        { id: 'flamingo',     emoji: '🦩', title: 'Flamingo',        text: 'Spiel das ganze Rennen im Stehen auf einem Bein.' },
        { id: 'blindstart',   emoji: '🙈', title: 'Blindstart',      text: 'Augen zu bis nach der ersten Kurve. Ein Gegner sagt dir, wann du sie öffnen darfst.' },
        { id: 'glueck',       emoji: '🍀', title: 'Glück gehabt',    text: 'Kein Handicap in diesem Rennen. Genieß es!' },
      ],
    },
  ],
};
