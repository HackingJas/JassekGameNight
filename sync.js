/* ==========================================================================
   Jasseks GameNight – Live-Sync über Firebase Realtime Database
   Wird nur geladen, wenn du in der App unter Mehr → Live-Sync einen Raum
   verbindest. Ohne Sync braucht die App diese Datei nicht.

   Alle Daten eines Abends liegen unter  rooms/<Raumcode>/  in deiner
   eigenen Firebase-Datenbank.
   ========================================================================== */
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

export async function createAdapter({ url, room }) {
  const [appMod, dbMod] = await Promise.all([
    import(SDK + 'firebase-app.js'),
    import(SDK + 'firebase-database.js'),
  ]);
  const app = appMod.initializeApp(
    { databaseURL: String(url).replace(/\/+$/, '') },
    'gamenight-' + Date.now().toString(36)
  );
  const db = dbMod.getDatabase(app);
  const roomRef = dbMod.ref(db, 'rooms/' + room);
  const offs = [];

  return {
    // Einmal lesen (beim Beitreten)
    async fetchOnce() {
      const snap = await dbMod.get(roomRef);
      return snap.exists() ? snap.val() : null;
    },
    // Laufend zuhören
    subscribe(onData, onError) {
      offs.push(dbMod.onValue(roomRef, (snap) => onData(snap.val()), (err) => onError && onError(err)));
    },
    // Online/Offline-Status
    onConnection(cb) {
      offs.push(dbMod.onValue(dbMod.ref(db, '.info/connected'), (snap) => cb(snap.val() === true)));
    },
    // Abstand zwischen Handy-Uhr und Server-Uhr (für einen fairen Buzzer)
    onServerOffset(cb) {
      offs.push(dbMod.onValue(dbMod.ref(db, '.info/serverTimeOffset'), (snap) => cb(Number(snap.val()) || 0)));
    },
    // Mehrere Knoten auf einmal schreiben, z. B. { 'results/abc': '…', meta: '…' }
    update(patch) {
      return dbMod.update(roomRef, patch);
    },
    async close() {
      offs.splice(0).forEach((off) => { try { off(); } catch (e) { /* egal */ } });
      try { await appMod.deleteApp(app); } catch (e) { /* egal */ }
    },
  };
}
