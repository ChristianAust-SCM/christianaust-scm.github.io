# christianaust.eu — persönliche Ideenschmiede

Die persönliche Startseite von Christian Aust: Ideen, kleine Werkzeuge und
digitale Lösungen aus der Praxis.

**Produktion:** <https://christianaust.eu/>

---

## Abgrenzung — welche Domain wofür steht

| Domain | Rolle | Betrieb |
|---|---|---|
| `christianaust.eu` | **Diese Seite.** Persönliche Ideenschmiede, Projekte, Experimente. Öffentlich. | GitHub Pages, dieses Repo |
| `www.engpasswerk.de` | Professioneller Business-/Beratungsauftritt. | Cloudflare Pages, Repo `engpasswerk-consulting-website` |
| `app.engpasswerk.de` | EngpassWerk OS (Anwendung). | eigenes Repo |
| `cockpit.christianaust.eu` | Privates Cockpit hinter Cloudflare Access. | Cloudflare Pages, Repo `dashboard` (Christian Cockpit) |

Diese Seite ist **keine zweite EngpassWerk-Vertriebsseite**. Auf EngpassWerk
wird genau einmal und dezent verwiesen; alles Geschäftliche gehört dorthin.

---

## Technik

Eine einzige statische Datei, kein Build, kein Framework, keine externen
Schriften, keine Skripte, keine Tracker.

```
index.html              Die gesamte Landingpage: Markup + Styles inline
manifest.webmanifest    Installation als App „CA" auf dem Home-Bildschirm
assets/logo/            CA-Signet und Favicons (aus dem Cockpit-Branding übernommen)
  ca-signet-dark.png    C orange, A hell, transparent — steht direkt auf dunklem Grund
  ca-favicon-32.png     Browser-Tab
  ca-favicon-180.png    früheres Apple-Touch-Icon; bleibt liegen, weil bereits
                        angelegte Home-Bildschirm-Symbole auf diesen Pfad zeigen
  ca-favicon-512.png    große Kachel, OG-Bild und Quelle der PWA-Symbole
assets/pwa/             Installationssymbole, deckend, aus ca-favicon-512.png erzeugt
  icon-192.png          192x192
  icon-512.png          512x512
  icon-maskable-512.png 512x512, Zeichen innerhalb der Maskable-Sicherheitszone
  apple-touch-icon.png  180x180, deckend
tools/make-pwa-icons.mjs  erzeugt assets/pwa/ neu; ohne Abhaengigkeiten
tests/landing.test.mjs  Prueft die Seite gegen die Vorgaben dieses Auftrags
tests/pwa.test.mjs      Prueft Manifest, Symbole und die iPhone-Risiken
docs/ARCHITEKTUR.md     Domain- und Hostinglandschaft, PWA- und SW-Entscheidung
CNAME                   christianaust.eu — von GitHub Pages ausgewertet
```

Da alles inline liegt, lädt die Seite in einem einzigen Request (plus Signet
und Favicon). Ein Doppelklick auf `index.html` funktioniert genauso wie die
ausgelieferte Fassung — `start_url` und `scope` im Manifest stehen relativ,
damit auch das so bleibt.

### Als App auf dem iPhone

In Safari `https://christianaust.eu/` öffnen → Teilen → **„Zum Home-Bildschirm"**
→ Name `CA` bestätigen. Die Seite startet danach ohne Adressleiste, in den
Farben der Seite und mit eigenem Eintrag im App-Umschalter.

**Bewusst ohne Service Worker.** Diese Seite liegt auf der Apex-Domain; ein
Service Worker hätte von hier aus Reichweite über `/tt-umfrage/` und
`/Tisch7/` aus fremden Repositories. Offline bringt eine Visitenkarte mit vier
Verweisen nach draußen ohnehin nichts. Die ausführliche Begründung steht in
`docs/ARCHITEKTUR.md`, Abschnitt 3a.

### Symbole neu erzeugen

```bash
node tools/make-pwa-icons.mjs          # schreibt assets/pwa/
node tools/make-pwa-icons.mjs --check  # vergleicht sie mit der Quelle
```

### Lokal ansehen

```bash
python3 -m http.server 8877
# http://127.0.0.1:8877/
```

### Tests

```bash
node --test tests/*.test.mjs
```

Die Tests lesen `index.html` als Text und prüfen die Zusagen, die diese Seite
machen muss: keine CV-Rückstände, keine externen Abhängigkeiten, Cockpit nur
dezent und `nofollow`, EngpassWerk-Verweis auf die tatsächlich erreichbare
`www`-Adresse, Favicons und OG-Bild vorhanden, Safe-Area für iPhone gesetzt.

`tests/pwa.test.mjs` kommt dazu: Manifestfelder, die drei Symbolgrößen, dass
die Symboldateien echte deckende PNG in der angegebenen Größe sind, dass sie
sich Byte für Byte aus dem CA-Signet reproduzieren lassen, dass das maskable
Symbol seine Sicherheitszone einhält — und dass weiterhin kein Service Worker
im Repo liegt.

---

## Design

Dunkel, ruhig, wenige Elemente, großzügige Abstände.

- **Farben** aus dem CA-Branding: Navy `#0D1B2A` (hier als `#0B1622` eine Spur
  tiefer als Grundfläche), Orange `#E87722` als einziger Akzent.
- **Typografie** ausschließlich Systemschriften. Keine Google Fonts — kein
  externer Request, keine IP-Weitergabe, kein Layoutsprung beim Laden.
- **Kontrast** nachgerechnet: die kleinste verwendete Textfarbe `#93A6BA`
  erreicht 6,7 : 1 auf dem Grund, Orange 5,5 : 1. Beides über 4,5 : 1.
- **Bewegung** auf ein Minimum beschränkt: weiche Übergänge bei Hover, sonst
  nichts. `prefers-reduced-motion` schaltet sie vollständig ab.
- **Erster Bildschirm** (`100svh`) beantwortet drei Fragen: wer, welche Themen,
  was ist diese Seite.

Die Seite trägt bewusst **keine Navigation**, kein Foto, keine Berufshistorie
und keinen Lebenslauf.

---

## Deployment

GitHub Pages, Quelle `main` / Repo-Wurzel (`build_type: legacy`, kein Workflow).
Ein Push nach `main` ist das Deployment; nach ein bis zwei Minuten ist die
neue Fassung online. HTTPS ist erzwungen, das Zertifikat stellt GitHub aus.

> **`_headers` gibt es hier nicht.** Das ist eine Cloudflare-Pages-Datei;
> GitHub Pages wertet sie nicht aus. Sicherheits-Header lassen sich auf
> dieser Domain derzeit nicht setzen — siehe `docs/ARCHITEKTUR.md`.

### Was auf dieser Domain sonst noch hängt

Unter der Apex-Domain liegen weitere GitHub-Pages-Projekte aus **eigenen
Repositories**. Sie werden von diesem Repo weder ausgeliefert noch berührt:

- `christianaust.eu/tt-umfrage/` → Repo `tt-umfrage`
- `christianaust.eu/Tisch7/` → Repo `Tisch7` (leitet auf `tisch7.christianaust.eu`)

Ebenso unberührt bleiben die Subdomains `cockpit.`, `spielplanapp.`,
`kitchen.` und `n8n.` — sie laufen über Cloudflare, nicht über GitHub Pages.

---

## Herkunft

Bis September 2026 lag hier eine Profil- und Lebenslaufseite: Foto, Track
Record, vollständiger Werdegang und ein CV-PDF zum Download. Diese Funktion
wird nicht mehr benötigt. Der alte Stand bleibt in der Git-Historie
(`e6a3e59` und früher) und ließe sich von dort jederzeit zurückholen.
