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
- **Keine PWA, kein Manifest, kein Service Worker.** Das ist Sache des
  Cockpits; eine öffentliche Landingpage braucht keine Installation. Ein
  Service Worker auf dem Apex hätte zudem Reichweite über die gesamte Domain
  inklusive `/tt-umfrage/` — genau das ist nicht gewollt.
- **Kein Formular, keine Datenerhebung.** Damit stellt sich die Frage nach
  Einwilligung und Speicherung erst gar nicht.
- **Kein Cockpit-Inhalt.** Der Fußzeilen-Link führt auf
  `cockpit.christianaust.eu` und trägt `rel="nofollow"`. Was dort liegt,
  entscheidet Cloudflare Access — die Seite hier weiß nichts darüber.

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
