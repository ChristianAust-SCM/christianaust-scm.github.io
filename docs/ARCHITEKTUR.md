# Architektur — christianaust.eu

Stand: 17.09.2026. Nachgemessen, nicht angenommen: alle Angaben stammen aus
`dig`, den ausgelieferten HTTP-Headern und der GitHub-Pages-API.

---

## 1 · Wer liefert was aus

DNS für die Zone `christianaust.eu` liegt bei Cloudflare
(`tia.ns.cloudflare.com`, `hans.ns.cloudflare.com`). Ausgeliefert wird
trotzdem an zwei völlig getrennten Stellen:

| Name | Ziel | Proxy | Herkunft |
|---|---|---|---|
| `christianaust.eu` (Apex) | `185.199.108–111.153` | **aus** (DNS-only) | GitHub Pages, Repo `christianaust-scm.github.io` |
| `tisch7.` | CNAME auf `christianaust-scm.github.io` | aus | GitHub Pages, Repo `Tisch7` |
| `cockpit.` | Cloudflare | **an** | Cloudflare Pages + **Cloudflare Access** |
| `spielplanapp.` | Cloudflare | an | Cloudflare Pages |
| `n8n.` | Cloudflare | an | eigener Dienst |
| `kitchen.` | `217.250.171.252` | aus | eigener Host |
| `www.` | — | — | **existiert nicht** (siehe offene Punkte) |

Die wichtigste Konsequenz: **Apex und Cockpit teilen sich nichts außer der
Zone.** Eine Änderung in diesem Repo kann `cockpit.christianaust.eu` nicht
erreichen — anderes Repo, anderer Hoster, eigener DNS-Eintrag, eigene
Access-Policy. Umgekehrt genauso.

### Pfade unterhalb der Apex-Domain

GitHub Pages veröffentlicht Projekt-Repos unter dem Pfad des Repo-Namens auf
derselben Domain. Deshalb liegen unter `christianaust.eu` zusätzlich:

- `/tt-umfrage/` → Repo `tt-umfrage` (HTTP 200)
- `/Tisch7/` → Repo `Tisch7`, leitet per 301 auf `tisch7.christianaust.eu`

Diese Pfade werden **nicht** von diesem Repo ausgeliefert. Dieses Repo
bestimmt ausschließlich `/` und alles, was hier als Datei liegt. Ein Umbau
der Startseite berührt sie nicht.

---

## 2 · Auslieferung dieses Repos

```
GitHub Pages · build_type "legacy" · Quelle: main, Pfad /
HTTPS erzwungen · Zertifikat von GitHub, gültig bis 16.11.2026 (auto-renew)
```

Es gibt keinen Build, keinen Workflow, keinen Ausgabeordner. Was im Repo
liegt, wird ausgeliefert. Ein Push nach `main` ist das Deployment.

**Kein `_headers`, kein `_redirects`, keine Worker-Regeln.** Beides sind
Cloudflare-Pages-Mechanismen; GitHub Pages kennt sie nicht. Folge:
`Content-Security-Policy`, `X-Frame-Options` und `Referrer-Policy` sind auf
dieser Domain heute nicht setzbar. Für eine reine Textseite ohne Skripte,
ohne Formulare und ohne Fremdressourcen ist das vertretbar — es ist aber der
Grund, warum die Seite bewusst ohne JavaScript auskommt.

---

## 3 · Was diese Seite bewusst nicht tut

- **Kein JavaScript.** Nichts auf der Seite braucht es.
- **Keine externen Ressourcen.** Keine Google Fonts, kein CDN, kein Analytics,
  kein Einbettungs-Widget. Jeder Request bleibt auf der eigenen Domain.
- **Kein Service Worker.** Siehe Abschnitt 3a — der Punkt ist wichtig genug
  für einen eigenen Abschnitt. (Bis September 2026 stand hier „keine PWA, kein
  Manifest, kein Service Worker". Das Manifest ist inzwischen da; der Service
  Worker bleibt weg, und zwar aus einem eigenen Grund.)
- **Kein Formular, keine Datenerhebung.** Damit stellt sich die Frage nach
  Einwilligung und Speicherung erst gar nicht.
- **Kein Cockpit-Inhalt.** Der Fußzeilen-Link führt auf
  `cockpit.christianaust.eu` und trägt `rel="nofollow"`. Was dort liegt,
  entscheidet Cloudflare Access — die Seite hier weiß nichts darüber.

---

## 3a · Installation als App — und warum ohne Service Worker

Seit September 2026 lässt sich die Seite auf dem iPhone als eigene App „CA"
ablegen. Dafür liegen im Repo `manifest.webmanifest` und vier deckende Symbole
unter `assets/pwa/`. Mehr ist es nicht.

### Was ein Manifest tut — und was nicht

| | Manifest | Service Worker |
|---|---|---|
| Wirkung | beschreibt Name, Symbol, Startadresse und Fensterart | fängt **jeden** Request im Scope ab und beantwortet ihn notfalls aus einem eigenen Cache |
| Reichweite auf dem Apex | nur der Start; `scope` beeinflusst, welche Navigationen im App-Fenster bleiben | die gesamte Domain unterhalb seines Pfads |
| Bleibt nach Deinstallation | nichts | registriert, bis er ausdrücklich abgemeldet wird |

Das ist der ganze Unterschied und zugleich die ganze Entscheidung.

### Die vier Fragen, gegen die geprüft wurde

1. **Sind die Inhalte öffentlich?** Ja, restlos. Die Seite trägt
   `robots: index, follow` und enthält nichts, was nicht jeder sehen dürfte.
   Ein Cache brächte hier also kein Vertraulichkeitsproblem — anders als beim
   Cockpit, wo es genau darum ging.
2. **Gibt es sensible Inhalte?** Nein. Kein Formular, keine Anmeldung, keine
   Datenerhebung.
3. **Hätte Offline-Nutzung echten Mehrwert?** Nein. Die Seite ist eine
   Visitenkarte mit vier Verweisen nach draußen. Offline wären genau diese
   Verweise tot — der einzige Grund, sie zu öffnen, fiele weg.
4. **Wie hoch ist das Risiko veralteter Inhalte?** Spürbar. Die Seite ist eine
   einzige Datei; ein Cache-First-Service-Worker würde exakt den einen
   Inhalt festhalten, der sich ändert.

**Der Ausschlag gibt aber Punkt 5, der in keiner Standardliste steht:** diese
Seite liegt auf der **Apex-Domain**. Ein Service Worker, der von `/` aus
registriert wird, hat Reichweite über alles, was unter `christianaust.eu`
hängt — auch über `/tt-umfrage/` und `/Tisch7/`, die aus **fremden
Repositories** kommen und von diesem Repo weder ausgeliefert noch gepflegt
werden. Ein Fehler hier legte Projekte lahm, die mit dieser Seite nichts zu
tun haben, und ein einmal registrierter Worker verschwindet nicht dadurch,
dass man die Datei löscht.

> **Entscheidung: bewusst kein Service Worker.** Nicht als Aufschub, sondern
> als Ergebnis. Er bringt hier nichts und riskiert etwas.

Sollte die Frage später doch aufkommen — etwa für eine echte Offline-Anwendung
unter `tools.` oder `lab.` —, gehört sie **auf eine Subdomain**, nicht auf den
Apex. Dort ist die Reichweite von Natur aus begrenzt. Das ist auch der Grund,
warum in Abschnitt 4 für alle Ausbaustufen Cloudflare Pages empfohlen wird.

### Was die App-Fassung bewusst NICHT tut

- **Keine Gestaltungsänderung.** Das Layout, die Farben, die Typografie und
  die Inhalte sind unverändert. Geändert wurden ausschließlich mobile Risiken:
  Safe Area im Hero, die Mindesthöhe des Hero im Querformat und die Höhe der
  vier Tippziele.
- **Kein JavaScript.** Auch nicht für die Installation — die läuft
  vollständig über `<link rel="manifest">` und die Apple-Meta-Angaben.
- **Keine Splash-Screen-Matrix.** Apple-Launch-Images gäbe es in einem Dutzend
  gerätespezifischer Größen, die bei jedem neuen iPhone nachzupflegen wären.
  Ohne sie zeigt iOS den `background_color` — hier derselbe Ton wie der Grund
  der Seite, also ein ruhiger Start statt eines weißen Blitzes.
- **Keine Benachrichtigungen, kein Web Push.** Die Seite hat nichts zu melden.

### Nachgemessen

`manifest.webmanifest` wird von GitHub Pages als
`application/manifest+json` ausgeliefert. Nicht angenommen, sondern an einem
real dort gehosteten Beispiel geprüft:
`mdn.github.io/pwa-examples/a2hs/manifest.webmanifest` antwortet mit HTTP 200
und genau diesem Content-Type, `server: GitHub.com`.

---

## 4 · Spätere Ausbaustufen (heute nicht eingerichtet)

Angedacht, ausdrücklich **nicht** Teil des aktuellen Standes. Die Startseite
ist so gebaut, dass jede dieser Varianten sich anfügen lässt, ohne sie
umzuschreiben — die drei Bereichskarten sind bereits die natürlichen
Einstiegspunkte.

| Kandidat | Gedacht für | Was zu klären wäre |
|---|---|---|
| `lab.christianaust.eu` | Experimente, kleine Projekte | Eigenes Repo oder Unterordner? Cloudflare Pages wäre naheliegend, weil dort Header und Redirects steuerbar sind. |
| `tools.christianaust.eu` | Kleine Werkzeuge zum Benutzen | Braucht vermutlich Logik und damit ein anderes Hostingmodell als GitHub Pages. |
| `share.christianaust.eu` | Geteilte Dateien, Ansichten | Zugriffsmodell zuerst: öffentlich, per Link, oder hinter Access? |
| `go.christianaust.eu` | Kurzlinks | Sinnvoll erst mit Redirect-Regeln, also über Cloudflare. |

Empfehlung für den Tag, an dem eine davon kommt: **nicht auf GitHub Pages**,
sondern Cloudflare Pages — dort sind `_headers`, `_redirects` und Access
verfügbar, und die Zone liegt ohnehin schon bei Cloudflare. Die Apex-Domain
sollte dabei so lange auf GitHub Pages bleiben, wie `/tt-umfrage/` und
`/Tisch7/` von dort kommen; ein Umzug des Apex würde diese Pfade brechen.

---

## 5 · Offene Punkte

1. **`www.christianaust.eu` existiert nicht.** Wer `www.` tippt, landet im
   Nichts. Ein CNAME auf `christianaust-scm.github.io` (DNS-only) würde das
   beheben; GitHub Pages bedient beide Namen unter demselben Zertifikat.
   Bewusst nicht heute angelegt — Auftrag war: keine neuen DNS-Einträge.
2. **Keine Sicherheits-Header** (siehe Abschnitt 2). Nur mit einem
   Hosterwechsel des Apex lösbar, der wegen der Projektpfade nichts ist, was
   man nebenbei macht.
3. **Impressum / Datenschutz.** Die Seite erhebt keine Daten und ist rein
   privat; auf ein Impressum wurde deshalb verzichtet. Sie verweist aber auf
   einen gewerblichen Auftritt. Ob das an der Schwelle zur Impressumspflicht
   kratzt, ist eine Frage für den Steuerberater oder Anwalt, nicht für einen
   Commit. Die schnellste Absicherung wäre ein Fußzeilenlink auf das
   bestehende Impressum von `www.engpasswerk.de`.
