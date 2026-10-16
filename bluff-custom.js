/* ==========================================================================
   EIGENE BLUFF-FRAGEN
   --------------------------------------------------------------------------
   Hier kann jemand, der nicht mitspielt, neue Fragen eintragen.
   Sie kommen automatisch in den Vorrat, aus dem die App zufällig zieht.

   q     Satz mit genau einer Lücke: ____ (vier Unterstriche)
   a     die echte Antwort (kurz, 1–3 Wörter)
   alt   andere Schreibweisen, die auch als Wahrheit zählen (darf leer sein).
         Schreibt jemand so etwas als Lüge, sagt die App „zu nah an der Wahrheit“.
   lies  falsche, aber glaubwürdige Antworten für den Knopf „Lüge vorschlagen“
   src   Link zur Quelle (wird nach der Auflösung angezeigt, darf leer sein)
   cat   Thema (wird über der Frage angezeigt)

   Danach in sw.js die VERSION hochzählen und neu hochladen.
   ========================================================================== */

window.GN_BLUFF_CUSTOM = [
  // Beispiel – zum Benutzen die Schrägstriche am Zeilenanfang entfernen:
  // {
  //   id: 'eiffelturm', cat: 'Geschichte',
  //   q: 'Der Eiffelturm wurde ursprünglich für die ____ gebaut.',
  //   a: 'Weltausstellung', alt: ['Weltausstellung 1889', 'Expo'],
  //   lies: ['Olympischen Spiele', 'Krönung des Königs', 'Hochzeit des Bürgermeisters'],
  //   src: 'https://de.wikipedia.org/wiki/Eiffelturm',
  // },
];
