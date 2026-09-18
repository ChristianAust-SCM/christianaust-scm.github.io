# Abnahmebericht: christianaust.eu als iPhone-PWA

- **Stand:** 18. September 2026
- **Worktree:** `/home/christian/projekte/christianaust-eu-pwa`
- **Branch:** `feat/iphone-pwa`
- **Basis:** `main` = `origin/main` = **`5f8c68b`** — und das ist auch der Stand, der live steht (`index.html` der Produktion war beim Prüfbeginn byteweise identisch mit dem lokalen `main`)
- **Commits:** `54f0ce9`, `8a2be76`, `94350e0`, `0ede75b`
- **Scope:** nur lokale Implementierung und Prüfung. Kein Push, kein Merge, kein Deploy, keine DNS-, Access-, Secret- oder Systemänderung.

## Empfehlung

> **Technisch abnahmefähig: JA — für die abschließende Prüfung auf einem echten iPhone.**

„JA" heißt: lokal ist alles grün und synthetisch nachgemessen. Es heißt **nicht**,
dass ein echtes iPhone, echtes WebKit oder der Installationsdialog von Safari
geprüft worden wären. Das bleibt offen (siehe „Grenzen").

---

## 1 · Was hinzugekommen ist

### Manifest

| Feld | Wert | Warum so |
|---|---|---|
| `name` | `Christian Aust` | Der volle Name, wie im Auftrag |
| `short_name` | `CA` | Kurzname, wie im Auftrag |
| `start_url` | `./` | relativ — die lokale Vorschau und ein Doppelklick auf `index.html` funktionieren weiter |
| `scope` | `./` | dasselbe; entspricht `/` auf der Produktionsdomain |
| `display` | `standalone` | eigenes Fenster, keine Safari-Leiste |
| `theme_color` | `#0B1622` | der Grund der Seite |
| `background_color` | `#0B1622` | ebenfalls. Ein heller Wert hätte beim Start kurz **weiß aufgeblitzt**, bevor die dunkle Seite erscheint |
| `lang` / `dir` | `de-DE` / `ltr` | |
| `orientation` | `any` | Hoch- und Querformat sind beide geprüft |

**Dateiendung nachgemessen, nicht angenommen:** GitHub Pages liefert
`.webmanifest` mit `Content-Type: application/manifest+json` aus. Geprüft an
einem real dort gehosteten Beispiel — `mdn.github.io/pwa-examples/a2hs/manifest.webmanifest`
antwortet mit HTTP 200, genau diesem Content-Type und `server: GitHub.com`.
Ein Ausweichen auf `manifest.json` war deshalb nicht nötig.

### Angaben im Dokument

```html
<link rel="manifest" href="manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="CA">
<link rel="apple-touch-icon" sizes="180x180" href="assets/pwa/apple-touch-icon.png">
```

Zwei Entscheidungen darin sind nicht selbstverständlich:

- **`apple-mobile-web-app-title` steht auf `CA`, nicht auf dem vollen Namen.**
  iOS schneidet den Titel unter dem Symbol nach wenigen Zeichen ab;
  „Christian Aust" stünde dort als „Christian A…". Als angenehmer Nebeneffekt
  sind „CA" und „CA Cockpit" auf demselben Home-Bildschirm klar unterscheidbar.
- **`black-translucent` statt `black`.** Auf einer dunklen Seite ist das der
  einzige Modus, der keine fremdfarbige Leiste über den Inhalt legt — der Grund
  der Seite läuft bis unter die Statusleiste durch. Im Gegenzug muss die Safe
  Area im CSS eingerechnet werden; genau das ist geschehen.

Kein `<link rel="manifest" crossorigin="use-credentials">` wie beim Cockpit:
diese Seite ist öffentlich, es gibt keine Sitzung, die der Manifest-Abruf
mitsenden müsste.

### Symbole

Alle vier aus `assets/logo/ca-favicon-512.png` erzeugt — derselben Datei, die
heute schon Favicon und OG-Bild dieser Seite ist. Die Identität wurde also
nicht neu erfunden, nur passend ausgegeben. **Bewusst nicht die navyfarbenen
Symbole der Cockpit-PWA:** die beiden Apps sollen auf dem Home-Bildschirm
unterscheidbar bleiben.

| Datei | Größe | Farbtyp |
|---|---|---|
| `assets/pwa/icon-192.png` | 192×192 | 2 (deckend) |
| `assets/pwa/icon-512.png` | 512×512 | 2 (deckend) |
| `assets/pwa/icon-maskable-512.png` | 512×512 | 2 (deckend) |
| `assets/pwa/apple-touch-icon.png` | 180×180 | 2 (deckend) |

**Deckend ist Absicht.** iOS legt ein durchscheinendes Home-Screen-Symbol auf
Schwarz und rundet es anschließend selbst ab; die bisherige Datei
`assets/logo/ca-favicon-180.png` hatte durchsichtige Ecken und konnte dort eine
dunkle Kante zeigen. Diese Datei **bleibt trotzdem im Repo** — bereits angelegte
Home-Bildschirm-Symbole zeigen auf ihren Pfad.

Zwei Werte sind gerechnet, nicht geschätzt:

- **Maskable-Maßstab.** Android schneidet maskable Symbole beliebig zu;
  verlässlich sichtbar bleibt nur der eingeschriebene Kreis mit 80 % Durchmesser
  (Radius 204,8 px). Die Tinten-Bounding-Box des CA-Signets misst 392 × 265 px;
  damit kein Eckpunkt aus dem Kreis ragt, muss die halbe Diagonale in den Radius
  passen → Maßstab **0,865**. Ein quadratisch gedachter Rand hätte 0,566 ergeben
  und das Zeichen verloren in der Mitte stehen lassen. Ein Test zählt nach:
  **0 Bildpunkte außerhalb der Zone**, und das Zeichen füllt den geschützten
  Kreis zu über 20 %.
- **Verkleinerung über Flächenmittelung**, nicht bilinear. 512 auf 192 ist
  Faktor 2,67; bilineares Abtasten überspringt dabei ganze Pixelreihen und lässt
  die dünnen Linien des Signets ausfransen.

Das Werkzeug `tools/make-pwa-icons.mjs` liegt mit im Repo und hat **keine
Abhängigkeit** — weder ImageMagick noch Pillow (auf diesem Server ohnehin nicht
vorhanden) noch ein npm-Paket. Gelesen und geschrieben wird mit `node:zlib`.
`--check` vergleicht die abgelegten Dateien Byte für Byte mit dem, was die
Quelle hergibt; ein Test ruft genau das auf.

Keine Apple-Launch-Image-Matrix: die gäbe es in einem Dutzend gerätespezifischer
Größen, die bei jedem neuen iPhone nachzupflegen wären. Ohne sie zeigt iOS den
`background_color` — hier derselbe Ton wie der Grund der Seite.

---

## 2 · Änderungen am Layout

**Das Design der Seite ist unverändert.** Keine neue Gestaltung, keine neuen
Inhalte, keine Navigation, weiterhin kein JavaScript und keine fremden Server.
Geändert wurden ausschließlich drei mobile Risiken:

| Was | Vorher | Jetzt | Grund |
|---|---|---|---|
| Hero, oberer Abstand | `clamp(56px, 12vh, 120px)` | `+ env(safe-area-inset-top, 0px)` | Mit `black-translucent` läuft der Inhalt unter die Statusleiste; ohne Zuschlag stünde das Signet unter der Dynamic Island |
| Hero im Querformat | `min-height: 100svh` immer | unter 500px Höhe `min-height: auto` | Bei 390px Höhe bleiben abzüglich der Innenabstände rund 286px für einen Block, der aufrecht über 400px braucht — der Bildschirm wäre voll Weißraum ohne Hinweis, dass darunter Inhalt kommt |
| Tippziele | 28px (Werk) / 23px (Fuß) | beide 44px | Die vier Links sind die einzigen Tippziele der Seite |

Bei den Werk-Verweisen wechselte die Unterstreichung dabei von `border-bottom`
auf `text-decoration`: ein Rahmen sitzt am unteren Rand der Box und wäre bei
44px Höhe vom Text weggerutscht. Optisch ist es dieselbe Linie.

**`100svh` bleibt `100svh`**, es wurde nicht auf `dvh` umgestellt. `svh` ist die
kleine Viewporthöhe, also die mit eingeblendeter Safari-Leiste: der Hero behält
damit beim Scrollen seine Höhe, statt beim Ein- und Ausfahren der Leiste zu
springen. Im Standalone-Fenster gibt es keine Leiste — dort sind `svh`, `lvh`
und `dvh` ohnehin derselbe Wert.

---

## 3 · Service-Worker-Entscheidung

> **Bewusst kein Service Worker.** Nicht als Aufschub, sondern als Ergebnis.

Die vier Fragen des Auftrags, einzeln beantwortet:

1. **Sind die Inhalte öffentlich?** Ja, restlos. `robots: index, follow`, nichts
   Vertrauliches. Ein Cache wäre hier also **kein** Vertraulichkeitsproblem —
   anders als beim Cockpit, wo genau das der Grund war.
2. **Gibt es sensible Inhalte?** Nein. Kein Formular, keine Anmeldung, keine
   Datenerhebung.
3. **Hätte Offline-Nutzung echten Mehrwert?** Nein. Die Seite ist eine
   Visitenkarte mit vier Verweisen nach draußen. Offline wären genau diese
   Verweise tot — der einzige Grund, sie zu öffnen, fiele weg.
4. **Wie hoch ist das Risiko veralteter Inhalte?** Spürbar. Es gibt genau eine
   Datei; ein Cache-First-Worker würde exakt den einen Inhalt festhalten, der
   sich ändert.

**Ausschlaggebend ist ein fünfter Punkt, der in keiner Standardliste steht:**
Diese Seite liegt auf der **Apex-Domain**. Ein von `/` registrierter Service
Worker hätte Reichweite über alles, was unter `christianaust.eu` hängt — auch
über `/tt-umfrage/` und `/Tisch7/`, die aus **fremden Repositories** kommen und
von hier weder ausgeliefert noch gepflegt werden. Ein Fehler dort legte Projekte
lahm, die mit dieser Seite nichts zu tun haben, und ein einmal registrierter
Worker verschwindet nicht dadurch, dass man die Datei löscht.

Ein Manifest hat diese Reichweite nicht. Es beschreibt nur, wie der Start
aussieht; `scope` bestimmt lediglich, welche Navigationen im App-Fenster
bleiben, und fängt keine Requests ab.

Käme später eine echte Offline-Anwendung, gehört sie auf eine **Subdomain**
(`lab.`, `tools.`), nicht auf den Apex. Das deckt sich mit der Empfehlung in
`docs/ARCHITEKTUR.md` Abschnitt 4, für alle Ausbaustufen Cloudflare Pages zu
nehmen. **Es ist kein Service-Worker-Konzept vorbereitet worden, weil es hier
keinen Anwendungsfall gibt** — die Frage wäre erst auf einer Subdomain neu zu
stellen.

---

## 4 · Tests

`node --test tests/*.test.mjs` — **25/25 grün** (14 aus `landing.test.mjs`,
11 neu aus `pwa.test.mjs`).

Entwickelt in RED→GREEN-Zyklen:

1. Manifest-, Symbol- und iOS-Meta-Tests zuerst rot (7 von 11), danach
   `manifest.webmanifest` und die Kopfangaben ergänzt.
2. Safe-Area- und Querformat-Tests rot, danach das CSS minimal angepasst.
3. Tippziel-Test **nach** der synthetischen Messung nachgeschärft (28px gefunden),
   erneut rot, danach behoben.

### Zwei Alttests wurden nachgezogen

Das ist eine Entscheidungsänderung, keine Testreparatur, und steht so auch im
Test:

- `kein Manifest, kein Service Worker — das bleibt Sache des Cockpits` heißt
  jetzt `ein Manifest ja, ein Service Worker nein`. Die erste Zusage gilt nicht
  mehr, die zweite unverändert — aus einem **eigenen** Grund (Apex-Reichweite),
  nicht mehr mit Verweis aufs Cockpit.
- Die Apple-Touch-Icon-Zusage zeigt auf den neuen deckenden Pfad. Ergänzt wurde
  eine Zusage, dass die alte Datei liegen bleibt.

### Was `tests/pwa.test.mjs` absichert

Manifestfelder · die drei Symbolgrößen und ihre `purpose` · dass alle
Icon-Pfade ins eigene Repo zeigen und existieren · echte PNG-Signatur, Maße und
Deckung (Farbtyp 2) · Byte-für-Byte-Reproduzierbarkeit aus dem CA-Signet · die
Maskable-Sicherheitszone · **kein Service Worker irgendwo im Repo**, auch nicht
als Manifesteintrag · kein Skript, keine fremden Server · Safe-Area-Regeln ·
Querformat-Regel · 44px Tippziele · kein gesperrter Zoom.

Weiter geprüft: `node --check` über das Werkzeug, Manifest mit JSON-Parser
geladen, `git diff --check` sauber, gezielter Secretscan über die Commits —
keine Treffer.

---

## 5 · Lokale Vorschau

```bash
cd /home/christian/projekte/christianaust-eu-pwa
python3 -m http.server 8877 --bind 127.0.0.1
# http://127.0.0.1:8877/
```

| Route | HTTP | Content-Type |
|---|---:|---|
| `/` | 200 | `text/html` |
| `/manifest.webmanifest` | 200 | `application/manifest+json` |
| `/assets/pwa/icon-192.png` | 200 | `image/png` |
| `/assets/pwa/icon-512.png` | 200 | `image/png` |
| `/assets/pwa/icon-maskable-512.png` | 200 | `image/png` |
| `/assets/pwa/apple-touch-icon.png` | 200 | `image/png` |

---

## 6 · Synthetische iPhone-Matrix

Chromium mit Touch- und Coarse-Pointer-Emulation, `deviceScaleFactor` 3.
Weil Chromium `env(safe-area-inset-*)` immer als 0 liefert, wurde **jede
Ansicht zweimal** geladen: einmal normal und einmal mit einem Stylesheet, das
dieselben Regeln mit den echten iPhone-Werten nachbildet (oben 59, unten 34
im Hochformat; seitlich 59 im Querformat). Das prüft nicht WebKit, aber es
prüft die Rechnung.

| Viewport | Lage | Modus | H-Überlauf | Hero | Signet oben | unter Island? | kleinstes Tippziel | Fehler |
|---|---|---|---:|---:|---:|---|---:|---:|
| 390×844 | Hoch | ohne Inset | 0px | 844 | 223 | nein | 44px | 0 |
| 390×844 | Hoch | mit Inset | 0px | 844 | 253 | nein | 44px | 0 |
| 430×932 | Hoch | ohne Inset | 0px | 932 | 263 | nein | 44px | 0 |
| 430×932 | Hoch | mit Inset | 0px | 932 | 293 | nein | 44px | 0 |
| 844×390 | Quer | ohne Inset | 0px | 461 | 35 | n. z. | 44px | 0 |
| 844×390 | Quer | mit Inset | 0px | 482 | 56 | n. z. | 44px | 0 |
| 932×430 | Quer | ohne Inset | 0px | 481 | 39 | n. z. | 44px | 0 |
| 932×430 | Quer | mit Inset | 0px | 498 | 56 | n. z. | 44px | 0 |

„Hero 461/482/498" im Querformat zeigt, dass die Mindesthöhe dort greift: ohne
die neue Regel wäre der Hero exakt so hoch wie das Fenster (390 bzw. 430) und
der Inhalt darunter unsichtbar geblieben. Seitlich wurde `max(--gutter, 59px)`
verifiziert — die Werk-Blöcke beginnen im Querformat bei x = 59.

Zusätzlich im simulierten Standalone-Fenster (`navigator.standalone`,
`display-mode: standalone`):

- Start über `manifest.start_url` landet auf `/` — im `scope`
- Reload nach `#bereiche` bleibt im Scope
- Drehen ins Querformat und zurück: kein horizontaler Überlauf
- Vier Links verlassen den Scope (ldm, engpasswerk, LinkedIn, Cockpit) — alle
  bewusst extern, keiner davon gehört ins App-Fenster
- Interner Sprung `#bereiche` und Browser-Zurück führen sauber auf `/`

Screenshots und Rohwerte liegen **unversioniert** unter
`/home/christian/pwa-abnahme-christianaust-eu/` (`results.json`,
`dogfooding.txt`).

### Grenzen der synthetischen Prüfung

Chromium ist nicht WebKit. **Nicht** echt geprüft wurden:

- physische Notch/Dynamic Island und die realen `safe-area-inset-*`-Werte
- der Safari-Dialog „Zum Home-Bildschirm" samt angezeigtem Namen und Symbol
- die Darstellung im App-Umschalter und beim Kaltstart
- iOS-Bildschirmtastatur, Dynamic Type, echte Rotation
- das tatsächliche Verhalten externer Links aus dem Standalone-Fenster
  (iOS öffnet sie je nach Version in Safari oder in einem In-App-Browser)
- ob GitHub Pages das Manifest auch unter **dieser** Domain korrekt ausliefert
  (am Verhalten von `mdn.github.io` belegt, aber nicht an `christianaust.eu`,
  weil dafür deployt werden müsste)

---

## 7 · Sicherheit

Unverändert: keine Secrets, keine Tokens, keine Access-Konfiguration, kein DNS,
keine externen Dienste, keine Tracker, kein JavaScript. Die Seite lädt
weiterhin ausschließlich von der eigenen Domain; ein Test zählt das nach.

Der Verweis ins Cockpit bleibt, wie er war: ein gewöhnlicher Link mit
`rel="noopener nofollow"`, Schloss-Symbol und dem Titel „Privater Bereich,
durch Cloudflare Access geschützt". **Access wird weder umgangen noch
dupliziert** — es wurde für diese Prüfung bewusst nicht dorthin navigiert und
nichts angemeldet.

Sicherheits-Header sind auf GitHub Pages weiterhin nicht setzbar (`_headers`
ist ein Cloudflare-Pages-Mechanismus). Daran ändert die PWA-Fassung nichts;
sie ist auch der Grund, warum die Seite ohne Skript auskommt.

---

## 8 · Abnahmeschritte auf dem echten iPhone

1. `https://christianaust.eu/` in Safari öffnen.
2. Teilen → **„Zum Home-Bildschirm"**. Im Dialog kontrollieren: Name steht auf
   **`CA`**, Symbol ist das CA-Signet auf weißer Kachel.
3. Hinzufügen und vom Home-Bildschirm starten. Erwartet: keine Adressleiste,
   dunkler Start ohne weißes Aufblitzen, eigener Eintrag im App-Umschalter.
4. Im Hochformat prüfen: Signet und Name stehen **unter** der Dynamic Island,
   nichts wird verdeckt.
5. Ins Querformat drehen: der Hero füllt nicht mehr den ganzen Bildschirm, die
   Bereichskarten sind ohne langes Scrollen erreichbar, seitlich bleibt neben
   der Notch Abstand.
6. Die vier Links einzeln antippen — sie sollen sich sicher treffen lassen.
   Erwartet: sie öffnen Safari bzw. den In-App-Browser, nicht das App-Fenster.
7. Seite neu laden und zurücknavigieren.
8. App vollständig beenden und erneut starten.
9. Gegenprobe zur Unterscheidbarkeit: „CA" und „CA Cockpit" nebeneinander auf
   dem Home-Bildschirm ansehen.
