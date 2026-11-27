# Jasseks GameNight – Anleitung

Punkte, Spielplan und Glücksrad für eure Gaming-Olympiade. Die App läuft im Browser, lässt sich wie eine normale App auf den Home-Bildschirm legen und funktioniert auch offline.

---

## Was im Paket steckt

| Datei | Wofür |
|---|---|
| `index.html` | Die App selbst |
| `config.js` | **Deine Stellschrauben:** Spieler, Spiele, Punkte, Spielplan, Handicaps |
| `hol-data.js` | Die Higher-or-Lower-Karten (absichtlich verschlüsselt – nicht reinschauen, wenn du mitspielst) |
| `hol-custom.js` | Platz für eigene Higher-or-Lower-Kategorien |
| `bluff-data.js` | Die Bluff-Fragen (ebenfalls verschlüsselt – nicht reinschauen) |
| `bluff-custom.js` | Platz für eigene Bluff-Fragen |
| `app.js` | Die Logik (musst du normalerweise nicht anfassen) |
| `styles.css` | Das Aussehen |
| `sync.js` | Live-Sync über Firebase (nur nötig, wenn ihr ihn nutzt) |
| `sw.js` | Offline-Betrieb und Update-Hinweis |
| `manifest.webmanifest`, `icons/` | Damit sie sich wie eine App installieren lässt (den Ordner `icons` mit hochladen) |

---

## 1. Die App online stellen (einmalig, ca. 10 Minuten)

Eine installierbare Web-App braucht eine **https-Adresse**. Einfach die Datei auf dem Handy öffnen reicht nicht. Am einfachsten und kostenlos geht das mit **GitHub Pages**. Am besten machst du das am Computer.

1. Auf [github.com](https://github.com) ein kostenloses Konto anlegen (falls noch keins da ist).
2. Oben rechts auf **+** → **New repository**.
   - Name: `gamenight`
   - Sichtbarkeit: **Public**
   - **Create repository** klicken.
3. Auf der leeren Seite auf **uploading an existing file** klicken.
4. **Alle Dateien und den Ordner `icons`** aus diesem Paket ins Browserfenster ziehen (den Ordner selbst, nicht nur die Bilder darin).
5. Unten auf **Commit changes** klicken.
6. Im Repository oben auf **Settings** → links **Pages**.
   - *Source:* **Deploy from a branch**
   - *Branch:* **main** und **/ (root)** → **Save**
7. Ein bis zwei Minuten warten. Deine App ist dann erreichbar unter
   `https://DEIN-NAME.github.io/gamenight/`

> Alternative ohne GitHub: Jeder andere Hoster mit https funktioniert genauso, z. B. Netlify oder Cloudflare Pages. Einfach den ganzen Ordner hochladen.

---

## 2. Auf dem Handy installieren

**iPhone**
1. Die Adresse in **Safari** öffnen.
2. Unten auf das **Teilen-Symbol** (Quadrat mit Pfeil) tippen.
3. **Zum Home-Bildschirm** wählen.

**Android**
1. Die Adresse in **Chrome** öffnen.
2. Oben rechts auf **⋮** tippen.
3. **App installieren** bzw. **Zum Startbildschirm hinzufügen** wählen.

> **Wichtig fürs iPhone:** Die installierte App hat einen **eigenen Speicher**, getrennt von Safari. Was du vorher in Safari eingetragen hast, taucht in der App nicht auf. Also: erst installieren, dann loslegen.

Beim ersten Start fragt die App nach euren Namen. Avatare tippst du an, um sie zu wechseln. Über das **Kamera-Symbol** nimmt jeder ein eigenes Foto auf oder wählt eins aus der Galerie. Die App schneidet es quadratisch zu und verkleinert es. Später änderst du Fotos unter **Mehr → Spieler**.

---

## 3. Live-Sync einrichten (optional)

Ohne Sync funktioniert alles auf **einem Handy**, das herumgereicht wird. Mit Sync sehen alle Handys live denselben Stand, egal wer etwas einträgt, und das Glücksrad dreht sich auf allen Handys gleichzeitig.

Dafür braucht ihr eine kostenlose Datenbank bei Google Firebase. Das macht **nur eine Person, nur einmal**.

### 3a. Firebase-Datenbank anlegen

1. [console.firebase.google.com](https://console.firebase.google.com) öffnen und mit einem Google-Konto anmelden.
2. **Projekt erstellen** (bzw. *Create a project*), Name z. B. `gamenight`. Google Analytics kannst du ausschalten.
3. Im Projekt links im Menü **Realtime Database** öffnen. Es liegt unter *Build/Erstellen*, oder du nutzt die Suche oben.
   (Achtung: **nicht** „Firestore“. Es muss die *Realtime Database* sein.)
4. **Datenbank erstellen**:
   - Standort: **Belgien (europe-west1)**
   - Sicherheitsregeln: **Im gesperrten Modus starten** (*locked mode*)
5. Oben den Tab **Regeln** öffnen, alles darin löschen und das hier einfügen:

   ```json
   {
     "rules": {
       "rooms": {
         "$room": {
           ".read": "$room.length >= 10",
           ".write": "$room.length >= 10"
         }
       }
     }
   }
   ```

   Dann **Veröffentlichen** klicken.
6. Zurück zum Tab **Daten**. Ganz oben steht die **Datenbank-URL**, etwa so:
   `https://gamenight-1234-default-rtdb.europe-west1.firebasedatabase.app`
   Diese URL kopieren.

Der kostenlose Tarif (*Spark*) reicht für eure GameNights um ein Vielfaches.

### 3b. In der App verbinden

1. In der App auf **Mehr → Live-Sync** (oder oben rechts auf „Lokal“) tippen.
2. Unter *Neuen Raum eröffnen* die **Datenbank-URL** einfügen. Der Raumcode ist schon ausgefüllt.
3. **Verbinden** tippen. Oben rechts steht jetzt **Live**.
4. **Teilen** (oder *Kopieren*) tippen und den Einladungscode an die anderen schicken.

### 3c. Die anderen treten bei

1. App öffnen und auf dem Home-Bildschirm installieren (siehe Schritt 2).
2. Beim Willkommens-Bildschirm auf **Ich wurde eingeladen und habe einen Code** tippen.
   (Oder später: Mehr → Live-Sync.)
3. Den Code einfügen → **Beitreten**.
4. Die App fragt sofort **„Wer bist du?“**. Jeder tippt auf seinen Namen, der Quizmaster auf **Quizmaster**, der Fernseher auf **Fernseher oder nur zuschauen** (siehe Abschnitt 5).

**Gut zu wissen**
- Fällt das WLAN kurz aus, steht oben **Offline**. Ihr könnt einfach weiter eintragen, die App schickt alles nach, sobald die Verbindung wieder da ist.
- Wer den Raumcode kennt, kann mitlesen und mitschreiben. Für eine private GameNight ist das okay. Gebt den Code einfach nicht öffentlich weiter.
- Ändern zwei Leute **gleichzeitig dieselbe Einstellung** (z. B. beide den Spielplan), gewinnt die letzte Änderung. Ergebnisse überschreiben sich nicht gegenseitig.

---

## 4. Joker, Siegerehrung und TV-Modus

### Joker
- Jeder Spieler hat **einen Joker pro Abend**. Er wird **vor** einem Spiel angesagt: Auf der Tabelle unter „Als Nächstes“ auf den eigenen Namen tippen. Die Punkte dieses Spielers zählen dann in diesem Spiel doppelt.
- Im Finale (×2) zählt ein Joker sogar **vierfach**. Das ist die Taktik-Frage des Abends.
- **Aufhol-Joker:** Wer **dreimal hintereinander Letzter** wird, bekommt einmal pro Abend einen Extra-Joker. Die App kündigt ihn groß an.
- Ein versehentlich gesetzter Joker lässt sich durch erneutes Antippen zurücknehmen, solange das Spiel noch nicht eingetragen ist.
- Anzahl der Joker und die Länge der Pechsträhne stellst du in `config.js` unter `rules` ein.

### Tipp-Joker
- Jeder Spieler hat **einmal pro Abend** den Tipp-Joker. Vor einem Spiel tippt er geheim, **wer das Spiel gewinnt**, auch auf sich selbst.
- Liegt er richtig, bekommt er **+1 Punkt** dazu. Das gilt immer, auch im Finale. Ein geteilter Sieg zählt als richtig.
- Getippt wird auf der Tabelle unter „Als Nächstes“ in der Zeile **Tipp-Joker**: auf den eigenen Namen tippen und den Sieger wählen. Mit Live-Sync geht das nur auf dem eigenen Handy. Die anderen sehen bis zum Ende nur **„getippt ✓“**, der Fernseher nur, wie viele Tipps im Topf sind.
- **Die Tipps schließen**, sobald das Spiel startet (Higher or Lower, Bluff, Buzzer), sobald zum ersten Mal am Glücksrad gedreht wird, oder wenn jemand **Tipps schließen** tippt. Mit Quizmaster ist das sein **Wettbüro**: Er sieht alle Tipps und schließt sie.
- Beim Eintragen des Ergebnisses deckt die App die Tipps groß auf allen Handys und dem Fernseher auf.
- Mit dem normalen Joker kombinierbar. Der Joker verdoppelt den Extrapunkt aber nicht.
- Ausschalten oder ändern: `config.js` → `rules` → `tipJokers` (0 = aus).

### Rennverlauf
Auf der Tabelle zeigt eine Grafik, wie sich die Punkte über den Abend entwickelt haben. Wenn du auf die Grafik tippst, siehst du den Stand nach jedem einzelnen Spiel.

### Siegerehrung
- Nach dem letzten Spiel: **Zur Siegerehrung**. Die Plätze werden einzeln aufgedeckt, erst Platz 3, dann Platz 2, dann mit Trommelwirbel der Sieger.
- Danach verleiht die App automatisch **Abzeichen**: Seriensieger, Comeback-König, Finalheld, Joker-Profi, Orakel (Tipp-Joker richtig), Handicap-Held, Ewiger Zweiter, Glückspilz, Allrounder und Pechvogel. Ein Abzeichen gibt es nur, wenn es wirklich verdient ist.
- **Wanderpokal:** Mit **Siegerfoto aufnehmen** landet ein Foto des Siegers in der Ruhmeshalle. Bei der nächsten GameNight trägt der Titelverteidiger eine **Krone** am Avatar.

### TV-Modus
Eine große Ansicht im Querformat für den Fernseher: Tabelle, nächstes Spiel, gesetzte Joker, Handicaps und Rennverlauf.
1. Auf einem Laptop, Tablet oder im Browser des Smart-TVs die App-Adresse öffnen.
2. Mit dem Einladungscode dem Raum beitreten (siehe 3c).
3. **Mehr → TV-Modus**, dann **Vollbild**. Alternativ hängst du `#tv` an die Adresse an, z. B. `https://DEIN-NAME.github.io/gamenight/#tv`.

Mit Live-Sync passiert der Rest von allein: Dreht jemand am Handy das Glücksrad, dreht es sich groß auf dem Fernseher mit. Neue Ergebnisse und Joker werden eingeblendet, und die Siegerehrung, die du am Handy aufdeckst, läuft parallel auf dem Fernseher. Ist ein Quizmaster da, steht sein Name oben auf dem Fernseher.

> Ohne Live-Sync funktioniert der TV-Modus nur auf dem Gerät, auf dem auch eingetragen wird, z. B. ein Tablet, das per AirPlay oder Chromecast auf den Fernseher gespiegelt wird.

---

## 5. Rollen: Spieler, Quizmaster, Fernseher

Mit Live-Sync weiß jedes Gerät fest, wer es benutzt. Die App fragt danach direkt nach dem Beitreten und noch einmal, wenn ein Spiel startet und die Rolle fehlt. Ändern kannst du sie jederzeit oben rechts (Name mit Avatar) oder unter **Mehr → Dieses Gerät**.

- **Spieler:** Wer seinen Namen gewählt hat, spielt in allen Handy-Spielen direkt auf dem eigenen Handy: Karte einordnen, Lüge schreiben, abstimmen, buzzern. In den Spielen steht auf der eigenen Karte **„Du“**.
- **Quizmaster:** spielt nicht mit und steht nicht in der Tabelle. Mehr dazu gleich.
- **Fernseher oder nur zuschauen:** zeigt alles mit, ohne mitzuspielen.

Gut zu wissen:
- Im Auswahlfenster steht bei einem Namen **„anderes Handy“**, wenn schon ein anderes Gerät diesen Namen gewählt hat. Wählst du ihn trotzdem, fragt die App, ob du übernehmen willst. Das andere Handy wird dann neu gefragt. Praktisch, wenn jemand das Handy wechselt.
- **„… hat kein Handy? Hier für … tippen“** erscheint nur noch für Spieler, die wirklich kein Handy im Raum haben. Für den Notfall (Akku leer) gibt es darunter einen kleinen Link **„Handy streikt?“**.
- Wer unter **Mehr → Live-Sync** die Verbindung trennt, meldet sein Handy im Raum ab.
- **iPhone:** Safari und die installierte App speichern getrennt. Die Rolle also in der installierten App wählen.

### Der Quizmaster
Der Quizmaster leitet den **Quizblock**: Schätzfragen, Filme erraten, Higher or Lower und Bluff. Er braucht ein eigenes Handy, das dem Raum beigetreten ist.

1. Auf seinem Handy bei „Wer bist du?“ **Quizmaster** wählen. Die App fragt nach Namen, Symbol und auf Wunsch einem Foto. (Später: **Mehr → Quizmaster**.)
2. Auf der Tabelle sieht er sein **Quizmaster-Pult** mit seinem Quizblock: was gespielt ist, was jetzt dran ist, was noch kommt. Darunter das nächste Spiel mit dem Start-Knopf.
3. **Higher or Lower:** Nur der Quizmaster sieht den Wert jeder Karte und wohin sie gehört. Haben alle einsortiert, sieht er, wer richtig liegt. Die Auflösung kommt erst, wenn er **Aufdecken** tippt. Die Spieler sehen so lange „… deckt gleich auf …“.
4. **Bluff:** Nur der Quizmaster sieht die Wahrheit, die eingehenden Lügen mit Namen und beim Abstimmen, wer was gewählt hat. Er deckt **Lüge für Lüge** auf und zum Schluss die Wahrheit. Die Punkte erscheinen erst mit der Wahrheit, und erst danach geht es zur nächsten Frage.
5. **Buzzer (Schätzfragen, Filme erraten):** Der Quizmaster liest die Fragen vor, tippt **Freigeben** und wertet mit **Richtig** oder **Falsch**. Die Fragen bringt er selbst mit.
6. Ist sein Quizblock gespielt, zeigt das Pult **„Quizblock geschafft“** mit **📣 Abschluss vorlesen** (Zwischenstand) und **Als Quizmaster abmelden**. Danach schaut sein Handy nur noch zu, und Higher or Lower und Bluff decken wieder von selbst auf.

### Werkzeuge für den Quizmaster
Alle Werkzeuge funktionieren auch ohne Quizmaster. Dann darf sie jeder Spieler benutzen, und bei der Bonusfrage entscheidet der Zufall.

| Werkzeug | Mit Quizmaster | Ohne Quizmaster |
|---|---|---|
| **📣 Ansagen** | Vor dem ersten Spiel **Eröffnung vorlesen** (Spieler, Punkte, Joker, Tipp-Joker, Finale). Zu jedem Quizspiel eine Karte mit den Regeln zum Vorlesen, plus kleine Moderations-Tipps nur für ihn. Am Ende **Abschluss** mit Zwischenstand. | Jeder sieht die Karten als **Regeln**. |
| **⏱ Countdown** | Oben im Spiel: 10 bis 90 Sekunden. Läuft auf allen Handys und dem Fernseher, am Ende ein Gong. Nur er kann ihn starten. | Jeder Spieler kann ihn starten. |
| **★ Bonusfrage** | Einmal pro Spiel: Buzzer-Frage (vor dem Freigeben), Bluff-Frage (während geschrieben wird) oder Higher-or-Lower-Runde (bei der ersten Karte) zählt doppelt. | Bei Higher or Lower und Bluff lost die App eine Bonusrunde bzw. -frage aus. Beim Buzzer markiert sie der Vorleser. |
| **🎯 Wettbüro** | Sieht alle Tipp-Joker mit Ziel und schließt die Tipps vor dem Start. | Jeder kann die Tipps schließen. Sonst schließen sie beim Start von selbst. |
| **⚔️ Stechen** | Gleichstand an der Spitze eines Quizspiels: Er stellt eine Schätzfrage, die beiden tippen ihre Zahl geheim ins Handy, er trägt die richtige Zahl ein. Wer näher dran ist, gewinnt das Spiel allein. | Die Frage stellt ein Spieler, der nicht im Stechen steckt. Sind alle gleichauf, bleibt es geteilt. |

Zum Stechen: Bei Higher or Lower und Bluff erscheint der Knopf im Endstand, beim Buzzer als kleiner Link, sobald zwei vorne gleichauf liegen. Beim Buzzer bekommt der Sieger des Stechens 1 Punkt dazu. Ohne Live-Sync trägt man alle Schätzungen und die Lösung auf dem einen Handy ein.

Weitere Regeln:
- Der Quizmaster hat seine eigenen Knöpfe, aber die Spieler-Handys behalten alle Knöpfe. Jeder darf weiterhin Ergebnisse eintragen, den Spielplan ändern und so weiter.
- **Notfall:** Ist der Quizmaster mitten im Spiel weg, tippen die Spieler auf **„Quizmaster nicht da? Selbst aufdecken“**. Dann deckt die App in diesem Spiel wieder von selbst auf.
- Ob ein Quizmaster da ist, merkt die App an seinem Handy. Eine Stunde nach seiner letzten Aktion gilt er als gegangen.
- **Fairness:** Wer mitspielt, wählt nie die Rolle Quizmaster und schaut nicht auf sein Handy, denn dort stehen die Lösungen.

### Quizblock zuerst
Damit der Quizmaster nach seinem Block gehen kann, stehen die Quizspiele am Anfang des Abends: erst Schätzfragen und Filme erraten, dann Higher or Lower, zum Schluss Bluff. Danach folgen die Konsolenspiele mit dem Finale.
- Beim allerersten Start ist das der Standard-Spielplan.
- Hast du schon einen eigenen Plan, öffne **Mehr → Spielplan → Bearbeiten** und tippe auf **🎤 Quizspiele nach vorne**. Gespielte Spiele bleiben, wo sie sind, und das Finale ×2 bleibt am Ende. Fehlt ein Quizspiel im Plan (z. B. Filme erraten), hängst du es vorher unten an.
- Im Spielplan sind die Spiele mit Quizmaster mit **🎤 Quizmaster** markiert.

---

## 6. Higher or Lower, Bluff und Buzzer

Alle drei laufen mit Live-Sync auf allen Handys gleichzeitig. Jedes Handy spielt dabei als die Rolle, die es gewählt hat (siehe Abschnitt 5).

### Higher or Lower
- Im Spielplan steht es als eigenes Spiel. **Higher or Lower starten** öffnet das Spiel auf allen Handys.
- Gespielt wird **Best of 5**: 5 Runden, jede mit einer zufälligen Kategorie. An einem Abend kommt keine Kategorie doppelt dran. Kategorien, die länger nicht dran waren, kommen bevorzugt.
- Jede Runde startet mit einer Karte, deren Wert sichtbar ist. Danach werden **12 Karten** einsortiert: Wer dran ist, tippt auf die Lücke im Zeitstrahl, in die die Karte gehört.
- Alle bekommen dieselbe Karte und sind **reihum** dran. Die Antworten bleiben verdeckt, bis alle gewählt haben. Wer anfängt, wechselt mit jeder Karte.
- Jeder hat **2 Leben** pro Runde. Falsch heißt ein Leben weg, beide weg heißt raus. Wer zuletzt übrig bleibt, gewinnt die Runde. In der nächsten Runde (neue Kategorie) haben alle wieder volle Leben. Liegen alle Verbliebenen gleichzeitig falsch und würden alle rausfliegen, fliegt niemand.
- **Bonusrunde:** Eine Runde zählt doppelt. Mit Quizmaster legt er sie fest, ohne lost die App sie beim Start aus.
- Sind alle Karten durch, gewinnt, wer die meisten Leben übrig hat (bei Gleichstand teilen sich beide die Runde).
- **Endstand:** Wer die meisten Runden gewinnt, wird Erster. Bei Gleichstand entscheiden die richtigen Antworten, danach auf Wunsch ein **Stechen** (Abschnitt 5). **Ergebnis eintragen** überträgt das in die Tabelle (inklusive Joker, Tipp-Joker und Finale ×2).
- **Mit Quizmaster** wartet die Auflösung jeder Karte, bis er **Aufdecken** tippt (siehe Abschnitt 5).
- Hat jemand kein Handy dabei, kann ein anderer mit **„… hat kein Handy? Hier für … tippen“** für ihn wählen. Ohne Live-Sync läuft das Spiel auf einem Handy, das herumgereicht wird.
- Runden, Leben und Karten stellst du unter **Mehr → Spiele & Punkte → Higher or Lower** ein.

**Eigene Kategorien:** In `hol-custom.js` kann jemand, der nicht mitspielt, neue Kategorien eintragen. Das Format steht in der Datei. Danach in `sw.js` die VERSION hochzählen und neu hochladen.

### Bluff
- Im Spielplan steht es als eigenes Spiel. **Bluff starten** öffnet das Spiel auf allen Handys.
- Pro Spiel gibt es **6 Fragen**, die **letzte zählt doppelt**. Jede Frage ist ein Satz mit einer Lücke.
- **Lügen schreiben:** Jeder tippt heimlich eine erfundene, möglichst glaubwürdige Antwort ins eigene Handy. Wer aus Versehen die Wahrheit (oder etwas sehr Ähnliches) schreibt, bekommt den Hinweis „Zu nah an der Wahrheit“. Wem nichts einfällt, tippt auf **„Mir fällt nichts ein – Lüge vorschlagen“**.
- **Wählen:** Danach erscheinen alle Antworten gemischt mit der echten – in einheitlicher Schreibweise, damit man niemanden an Groß- und Kleinschreibung erkennt. Jeder tippt auf die Antwort, die er für wahr hält. Die eigene Lüge wird einem nicht angezeigt. Haben zwei dieselbe Lüge geschrieben, steht sie nur einmal da und zählt für beide.
- **Auflösung:** Erst die Lügen und wer darauf reingefallen ist, ganz zum Schluss die Wahrheit mit Link zur Quelle. Ohne Quizmaster läuft das von selbst nacheinander ab, mit Quizmaster deckt er Schritt für Schritt auf.
- **Punkte im Spiel:** Wahrheit gefunden = **2 Punkte**. Für jeden Mitspieler, der auf deine Lüge reinfällt = **1 Punkt**. Bei der letzten Frage doppelt.
- **Bonusfrage:** Eine weitere Frage zählt doppelt. Mit Quizmaster legt er sie fest, ohne lost die App sie aus (nie die letzte Frage, die zählt ja schon doppelt).
- **Endstand:** Wer die meisten Punkte hat, wird Erster. Bei Gleichstand teilen sich die Spieler den Platz, außer ein **Stechen** entscheidet. **Ergebnis eintragen** überträgt das mit 3/1/0 in die Tabelle (inklusive Joker und Finale ×2). Dazu kürt die App die **beste Lüge des Spiels**.
- Im Vorrat sind **60 Fragen** aus elf Themen. Fragen, die schon dran waren, kommen erst wieder, wenn die anderen durch sind – das reicht für rund zehn Abende.
- Hat jemand kein Handy dabei, kann ein anderer mit **„… hat kein Handy? Hier für … schreiben“** für ihn tippen. Ohne Live-Sync wird ein Handy herumgereicht, und alles bleibt verdeckt.
- Fragen pro Spiel, doppelte letzte Frage und den Vorschlags-Knopf stellst du unter **Mehr → Spiele & Punkte → Bluff** ein.

**Eigene Fragen:** In `bluff-custom.js` kann jemand, der nicht mitspielt, neue Fragen eintragen. Das Format steht in der Datei. Danach in `sw.js` die VERSION hochzählen und neu hochladen.

### Buzzer
- Bei **Schätzfragen** und **Filme erraten** zeigt die Tabelle statt „Ergebnis eintragen“ den Knopf **Buzzer öffnen**. Unter *Mehr → Spiele & Punkte* kannst du den Buzzer bei jedem Spiel ein- oder ausschalten.
- Die Spieler sehen auf ihrem Handy nur einen großen Buzzer. Der **Quizmaster** liest die Frage vor und tippt **Freigeben**.
- **Ohne Quizmaster** fragt die App: **Wer liest vor?** Wer **Ich lese vor** tippt, bekommt die Knöpfe zum Freigeben und Werten und buzzert bei diesen Fragen nicht mit. Mit **Ich übernehme** wechselt der Vorleser, mit **Vorlesen abgeben** buzzert man wieder mit.
- **Bonusfrage:** Vor dem Freigeben kann der Quizmaster (oder Vorleser) einmal pro Spiel **★ Als Bonusfrage** tippen. Dann gibt **Richtig** 2 Punkte.
- Wer zuerst drückt, erscheint riesig auf allen Handys und dem Fernseher, und es ertönt ein lauter Buzzer-Ton. Der Quizmaster sieht zusätzlich, wie knapp die anderen dahinter lagen.
- Bei **Schätzfragen** geben alle ihre Schätzung laut ab, und der Quizmaster vergibt den Punkt mit **+** beim Spieler, der am nächsten dran war. **Frage überspringen** schaltet zur nächsten Frage.
- **Richtig +1** gibt einen Punkt und schaltet zur nächsten Frage. **Falsch** sperrt diesen Spieler für die Frage, und die anderen dürfen nochmal.
- **Frühstart:** Wer vor der Freigabe drückt, ist 2 Sekunden gesperrt.
- **Ergebnis eintragen** übernimmt die Punkte in die Tabelle.
- **Fairness:** Die App gleicht die Uhren der Handys mit dem Server ab und vergleicht, *wann* gedrückt wurde, nicht wann es ankam. Eine langsamere Verbindung ist also kein Nachteil. Bei extrem knappen Duellen (unter etwa einer Zwanzigstelsekunde) kann aber auch diese Messung nicht mehr sicher unterscheiden.
- **Ohne Live-Sync** wird der Buzzer zum **Buzzer-Brett**: Ein Handy oder Tablet liegt in der Mitte, jeder hat ein Feld in seiner Farbe, und der erste Finger gewinnt.
- Tipp fürs iPhone: Stummschalter aus und Lautstärke hoch.

---

## 7. Anpassen

### In der App (empfohlen)
Unter **Mehr** kannst du alles ändern, ohne Code anzufassen:
- **Spieler:** Name, Avatar, Farbe
- **Quizmaster:** Name, Symbol, Foto
- **Spiele & Punkte:** neue Spiele anlegen, Punkte pro Platz, Wertungsart, welches Glücksrad
- **Spielplan:** Reihenfolge, Spiele anhängen oder löschen, „×2“ fürs Finale, Quizspiele nach vorne
- **Glücksrad-Listen:** Handicaps hinzufügen, bearbeiten, ein- und ausschalten, eigene Listen (z. B. für Bomberman)

**Mario-Kart-Handicaps:** Seit Version 1.4 hat das Rad 22 Handicaps. Neu dazugekommen sind Trickverbot, Ohne Abkürzung, Münzfasten, Nur nach hinten, Kopfstand, Zeigefinger, Pirat, Hinterbänkler, Boxenstopp und Ferngesteuert. Bei einer bestehenden Installation landen sie beim Update automatisch auf dem Rad. Deine eigenen und ausgeschalteten Handicaps bleiben, wie sie sind. Was dir nicht gefällt, schaltest du unter **Mehr → Glücksrad-Listen** aus.

### In `config.js`
Dort stehen die **Standardwerte**. Sie gelten beim allerersten Start und wenn du in der App **Alles zurücksetzen** bzw. **Standardliste wiederherstellen** tippst. Jeder Eintrag ist in der Datei kommentiert.

Ein neues Spiel sieht zum Beispiel so aus:

```js
{ id: 'quiz', name: 'Musikquiz', emoji: '🎵', unit: 'Runde', scoring: 'free', maxPoints: 10 },
```

- `scoring: 'placement'` → Spieler in Zielreihenfolge antippen, Punkte aus `points: [3, 1, 0]`
- `scoring: 'free'` → Punkte pro Spieler frei eintragen (Schätzfragen, Quiz …)

> **Nach jeder Änderung an den Dateien:** In `sw.js` die Zeile `const VERSION = 'gamenight-v1.5.0';` hochzählen (z. B. auf `v1.5.1`) und alles neu hochladen (siehe Abschnitt 10). Die installierte App zeigt dann **„Neue Version verfügbar“** an.

---

## 8. So wird gezählt

- **Platzierungsspiele:** Platz 1 = 3 Punkte, Platz 2 = 1 Punkt, Platz 3 = 0 Punkte (änderbar).
- **Gleichstand in einem Spiel:** Tippe nach dem Eintragen auf **„=“** zwischen zwei Plätzen. Die beiden teilen sich die Punkte (bei 3/1/0 und geteiltem 1. Platz: je 2 Punkte).
- **Finale:** Spiele mit „×2“ zählen doppelt.
- **Joker:** verdoppelt die eigenen Punkte in einem Spiel (Finale + Joker = ×4).
- **Tipp-Joker:** richtiger Sieger-Tipp = **+1 Punkt**, einmal pro Abend und Spieler. In der Ergebnisliste steht dann 🎯.
- **Bonusfrage / Bonusrunde:** zählt im Quizspiel doppelt, verändert also, wer das Spiel gewinnt.
- **Stechen in einem Quizspiel:** Der Sieger steht allein auf Platz 1, der andere rückt auf Platz 2.
- **Mario Kart:** ein Eintrag pro Grand Prix.
- **Gleichstand in der Tabelle:** Zuerst zählen die Siege, dann die 2. Plätze. Ist dann immer noch alles gleich, zeigt die App „Stechen“ an. Das Stechen trägst du als **Zusatzspiel** ein.
- **„Nicht mehr einzuholen“:** Die App rechnet mit, wie viele Punkte noch zu holen sind, und meldet, sobald der Sieg feststeht.
- **Glücksrad:** Jeder dreht pro Rennen einmal und bekommt ein anderes Handicap. Mit **Weiter: Rennen 2** startet die nächste Runde. Die Handicaps werden beim Grand-Prix-Ergebnis mitgespeichert. Daraus entsteht in der Siegerehrung die Statistik „Siege trotz Handicap“.
- **Am Ende:** **Zur Siegerehrung** → **GameNight abschließen**. Der Endstand landet in der **Ruhmeshalle**, und die nächste GameNight startet bei 0.

---

## 9. Backup und Neustart

**Mehr → Backup erstellen** sichert alles als Datei oder Text, inklusive Fotos. Mit **Backup laden** holst du es zurück, auch auf ein anderes Handy. Ein Backup vor dem Abend schadet nie.

**Nach einem Testlauf:** **Mehr → Ergebnisse zurücksetzen** löscht alle Punkte, angesagten Joker und gedrehten Handicaps des Abends, auf allen verbundenen Handys. Spieler, Fotos, Quizmaster, Spielplan, Glücksrad und Ruhmeshalle bleiben, und die Handys bleiben verbunden. Higher or Lower und Bluff merken sich trotzdem, welche Karten und Fragen schon dran waren. Am echten Abend kommen also neue.

- **GameNight abschließen** dagegen legt den Endstand in die Ruhmeshalle und startet die nächste GameNight.
- **Alles zurücksetzen** setzt Spieler, Spiele, Spielplan und Handicaps auf die Werte aus `config.js` zurück.

---

## 10. Update einspielen

So kommt eine neue Version (z. B. 1.5) in deine App, wenn sie bei GitHub Pages liegt:

1. Das neue App-Paket entpacken.
2. Bei GitHub dein Repository öffnen → **Add file** → **Upload files**.
3. **Alle Dateien und den Ordner `icons`** aus dem entpackten Ordner ins Browserfenster ziehen. Gleichnamige Dateien werden dabei ersetzt.
4. Unten auf **Commit changes** klicken.
5. Ein bis zwei Minuten warten. Unter **Actions** wird „pages build and deployment“ grün, sobald die neue Version online ist.
6. Auf **jedem** Gerät die App öffnen. Unten erscheint **„Neue Version verfügbar“** → **Aktualisieren**. Kommt der Hinweis nicht, die App ganz schließen und zweimal neu öffnen.
7. Prüfen: Unter **Mehr** steht ganz unten die Versionsnummer.

> Spielt erst, wenn **alle Geräte** die neue Version haben. Ein Handy mit alter Version kennt den Quizmaster nicht und würde bei Higher or Lower und Bluff die Lösung zu früh zeigen.
