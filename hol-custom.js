/* ==========================================================================
   EIGENE HIGHER-OR-LOWER-KATEGORIEN
   --------------------------------------------------------------------------
   Hier kann jemand, der nicht mitspielt, neue Kategorien eintragen.
   Sie kommen automatisch in den Vorrat, aus dem die App zufällig zieht.

   Pro Kategorie mindestens 13 Karten (1 Basis + 12 zum Einordnen).
   format: 'big'  → große Zahlen als „1,5 Mio.“ / „2,3 Mrd.“
           'int'  → normale Zahl („236“)
           'year' → Jahreszahl („1996“)
   unit:   Wort hinter der Zahl („Hörer“, „Meter“ …), darf leer sein.

   Danach in sw.js die VERSION hochzählen und neu hochladen.
   ========================================================================== */

window.GN_HOL_CUSTOM = [
  // Beispiel – zum Benutzen die beiden Schrägstriche am Zeilenanfang entfernen:
  // {
  //   id: 'bauwerke', name: 'Höhe bekannter Bauwerke', emoji: '🏗️', unit: 'Meter', format: 'int',
  //   note: 'Gesamthöhe inklusive Spitze',
  //   items: [
  //     { name: 'Burj Khalifa', emoji: '🏙️', sub: 'Dubai', value: 828 },
  //     { name: 'Eiffelturm', emoji: '🗼', sub: 'Paris', value: 330 },
  //     // … mindestens 13 Einträge
  //   ],
  // },
];
