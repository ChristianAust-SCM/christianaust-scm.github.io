/*
 * Prüft die Installierbarkeit als iPhone-App — und die Grenzen, die dabei
 * bewusst eingehalten werden.
 *
 * Diese Seite liegt auf der Apex-Domain. Was hier ausgeliefert wird, wirkt
 * potenziell auf alles, was sonst noch unter christianaust.eu hängt
 * (`/tt-umfrage/`, `/Tisch7/`). Deshalb prüft diese Datei nicht nur, dass die
 * PWA-Angaben da sind, sondern auch, dass die Seite sich nicht mehr nimmt als
 * nötig: kein Service Worker, keine fremden Server, keine Sperre für Zoom.
 *
 * Ausführen: node --test tests/*.test.mjs
 */

import assert from 'node:assert/strict'
import { readFile, access, readdir } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { inflateSync } from 'node:zlib'
import { promisify } from 'node:util'
import test from 'node:test'

const run = promisify(execFile)
const root = new URL('../', import.meta.url)
const html = await readFile(new URL('index.html', root), 'utf8')

async function exists (path) {
  try { await access(new URL(path, root)); return true } catch { return false }
}

/* ── Manifest ─────────────────────────────────────────────────────────────── */

test('das Manifest beschreibt eine eigenständige App namens „Christian Aust“', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', root), 'utf8'))

  assert.equal(manifest.name, 'Christian Aust')
  assert.equal(manifest.short_name, 'CA')
  assert.equal(manifest.lang, 'de-DE')
  assert.equal(manifest.display, 'standalone')

  // Relativ, nicht absolut: so funktioniert die Datei auch in der lokalen
  // Vorschau und bei einem Doppelklick auf index.html.
  assert.equal(manifest.start_url, './')
  assert.equal(manifest.scope, './')

  /*
   * Beide Farben sind der Grund der Seite. Ein heller background_color würde
   * beim Start kurz weiß aufblitzen, bevor die dunkle Seite erscheint.
   */
  assert.equal(manifest.theme_color, '#0B1622')
  assert.equal(manifest.background_color, '#0B1622')

  // Der Name gehört nicht dem Cockpit — die beiden Apps dürfen nicht
  // verwechselbar auf demselben Home-Bildschirm liegen.
  assert.ok(!/Cockpit/i.test(JSON.stringify(manifest)), 'Das Manifest soll nicht vom Cockpit sprechen')
})

test('das Manifest benennt die drei Installationssymbole', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', root), 'utf8'))
  const icons = manifest.icons || []

  const finde = (src) => icons.find((i) => i.src === src)

  const klein = finde('assets/pwa/icon-192.png')
  assert.ok(klein, 'icon-192 fehlt im Manifest')
  assert.equal(klein.sizes, '192x192')
  assert.equal(klein.type, 'image/png')
  assert.equal(klein.purpose, 'any')

  const gross = finde('assets/pwa/icon-512.png')
  assert.ok(gross, 'icon-512 fehlt im Manifest')
  assert.equal(gross.sizes, '512x512')
  assert.equal(gross.type, 'image/png')
  assert.equal(gross.purpose, 'any')

  const maske = finde('assets/pwa/icon-maskable-512.png')
  assert.ok(maske, 'maskable fehlt im Manifest')
  assert.equal(maske.sizes, '512x512')
  assert.equal(maske.purpose, 'maskable')

  // Alle Pfade zeigen ins eigene Repo, keiner auf einen fremden Server.
  for (const icon of icons) {
    assert.ok(!/^https?:/.test(icon.src), `Fremder Icon-Verweis: ${icon.src}`)
    assert.equal(await exists(icon.src), true, `Icon fehlt im Repo: ${icon.src}`)
  }
})

/* ── Verknüpfung im Dokument ──────────────────────────────────────────────── */

test('die Seite verweist auf das Manifest und sagt iOS, wie sie starten soll', () => {
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/)

  assert.match(html, /<meta name="apple-mobile-web-app-capable" content="yes">/)
  assert.match(html, /<meta name="mobile-web-app-capable" content="yes">/)

  /*
   * black-translucent statt black: der Grund der Seite läuft dann bis unter
   * die Statusleiste durch. Auf einer dunklen Seite ist das der einzige
   * Modus, der keine fremdfarbige Leiste über den Inhalt legt — er verlangt
   * im Gegenzug, dass die Safe Area im CSS berücksichtigt wird.
   */
  assert.match(html, /<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">/)

  // Kurzname, weil iOS den Titel unter dem Symbol nach wenigen Zeichen
  // abschneidet. „Christian Aust“ stünde dort als „Christian A…“.
  assert.match(html, /<meta name="apple-mobile-web-app-title" content="CA">/)

  assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="assets\/pwa\/apple-touch-icon\.png">/)
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/)
})

/* ── Die Symboldateien selbst ─────────────────────────────────────────────── */

test('die Symboldateien sind echte, deckende PNG in der angegebenen Größe', async () => {
  const erwartet = new Map([
    ['assets/pwa/icon-192.png', 192],
    ['assets/pwa/icon-512.png', 512],
    ['assets/pwa/icon-maskable-512.png', 512],
    ['assets/pwa/apple-touch-icon.png', 180]
  ])

  for (const [pfad, kante] of erwartet) {
    const png = await readFile(new URL(pfad, root))
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${pfad}: keine PNG-Signatur`)
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [kante, kante], `${pfad}: falsche Größe`)

    /*
     * Farbtyp 2 = Truecolor ohne Alphakanal. iOS legt ein durchscheinendes
     * Home-Screen-Symbol auf Schwarz und rundet es anschließend selbst ab —
     * eine eigene transparente Rundung ergäbe dort eine dunkle Kante.
     */
    assert.equal(png[25], 2, `${pfad}: soll deckend sein (Farbtyp 2), ist Farbtyp ${png[25]}`)
  }
})

test('die Symbole lassen sich reproduzierbar aus dem CA-Signet erzeugen', async () => {
  // Binärdateien ohne nachvollziehbaren Weg sind nicht prüfbar. Das Werkzeug
  // erzeugt sie erneut im Speicher und vergleicht Byte für Byte.
  const { stdout } = await run(process.execPath, ['tools/make-pwa-icons.mjs', '--check'],
    { cwd: new URL('.', root).pathname })
  assert.ok(!/ABWEICHEND/.test(stdout), `Symbole passen nicht mehr zur Quelle:\n${stdout}`)
})

test('das maskable Symbol hält seine Sicherheitszone ein', async () => {
  /*
   * Android schneidet ein maskable Symbol beliebig zu. Verlässlich sichtbar
   * bleibt nur der eingeschriebene Kreis mit 80 % Durchmesser. Geprüft wird
   * deshalb: liegt jedes Pixel, das nicht der weiße Grund ist, innerhalb
   * dieses Kreises?
   */
  const png = await readFile(new URL('assets/pwa/icon-maskable-512.png', root))
  const bild = rgbDecode(png)
  const mitte = bild.kante / 2
  const radius = bild.kante * 0.4

  let aussen = 0
  let innenTinte = 0
  for (let y = 0; y < bild.kante; y++) {
    for (let x = 0; x < bild.kante; x++) {
      const i = (y * bild.kante + x) * 3
      const weiss = bild.rgb[i] > 238 && bild.rgb[i + 1] > 238 && bild.rgb[i + 2] > 238
      if (weiss) continue
      const abstand = Math.hypot(x + 0.5 - mitte, y + 0.5 - mitte)
      if (abstand > radius) aussen++
      else innenTinte++
    }
  }

  assert.equal(aussen, 0, `${aussen} Bildpunkte des Zeichens liegen außerhalb der Sicherheitszone`)

  /*
   * Gegenprobe: ein Zeichen, das die Zone einhält, weil es winzig ist, wäre
   * kein gutes Symbol. Es soll den geschützten Kreis auch ausfüllen.
   */
  const kreisFlaeche = Math.PI * radius * radius
  assert.ok(innenTinte / kreisFlaeche > 0.2,
    `Das Zeichen füllt nur ${(innenTinte / kreisFlaeche * 100).toFixed(1)} % des geschützten Kreises`)
})

/* ── Grenzen ──────────────────────────────────────────────────────────────── */

test('kein Service Worker — nirgends im Repo', async () => {
  /*
   * Die bewusste Entscheidung, dokumentiert in docs/ARCHITEKTUR.md: ein
   * Service Worker auf dem Apex hätte Reichweite über die gesamte Domain,
   * also auch über /tt-umfrage/ und /Tisch7/ aus fremden Repositories. Ein
   * Manifest hat diese Reichweite nicht — es beschreibt nur den Start.
   */
  assert.ok(!/serviceWorker|navigator\s*\.\s*serviceWorker/.test(html))
  assert.equal(await exists('sw.js'), false)
  assert.equal(await exists('service-worker.js'), false)

  const wurzel = await readdir(new URL('.', root))
  for (const name of wurzel) {
    assert.ok(!/^(sw|service-worker)\b/.test(name), `Unerwartete Datei im Wurzelverzeichnis: ${name}`)
  }

  const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', root), 'utf8'))
  assert.ok(!('serviceworker' in manifest), 'Das Manifest soll keinen Service Worker anmelden')
})

test('die Seite bleibt ohne Skript und ohne fremde Server', () => {
  // Die PWA-Fassung ändert daran nichts — das war der Kern dieser Seite.
  assert.ok(!/<script/i.test(html), 'Kein JavaScript auf dieser Seite')
  assert.ok(!/fonts\.googleapis|fonts\.gstatic|cdn\.|unpkg|jsdelivr/i.test(html))
})

/* ── iPhone-Layout ────────────────────────────────────────────────────────── */

test('der Inhalt weicht der Notch aus, auch im Standalone-Fenster', () => {
  // Mit black-translucent läuft der Inhalt unter die Statusleiste. Der Hero
  // muss den oberen Sicherheitsabstand deshalb selbst einrechnen.
  assert.match(html, /padding-top:\s*calc\(clamp\(56px, 12vh, 120px\) \+ env\(safe-area-inset-top, 0px\)\)/)

  // Seitlich und unten war das schon vorher gelöst — hier festgehalten, damit
  // es nicht unbemerkt verloren geht.
  assert.match(html, /padding-left:\s*max\(var\(--gutter\), env\(safe-area-inset-left\)\)/)
  assert.match(html, /padding-right:\s*max\(var\(--gutter\), env\(safe-area-inset-right\)\)/)
  assert.match(html, /padding-bottom:\s*max\(clamp\(22px, 4vh, 32px\), env\(safe-area-inset-bottom\)\)/)
})

test('Querformat: der Hero darf die Höhe nicht erzwingen', () => {
  /*
   * 844×390 und 932×430 sind die Querformate der aktuellen iPhones. Ein Hero
   * mit 100svh Mindesthöhe plus festen Innenabständen füllt dort den ganzen
   * Bildschirm mit Weißraum — der Inhalt darunter wäre nicht erkennbar.
   * Bei geringer Höhe fällt die Mindesthöhe deshalb weg.
   */
  assert.match(html, /@media \(max-height: 500px\) and \(orientation: landscape\)/)
  assert.match(html, /@media \(max-height: 500px\) and \(orientation: landscape\)[\s\S]{0,400}min-height:\s*auto/)
})

test('Tippziele und Zoom bleiben iPhone-tauglich', () => {
  // Safari zoomt beim Fokus in Felder unter 16px. Felder gibt es hier keine —
  // dieser Test hält fest, dass das so bleibt.
  assert.ok(!/<input|<textarea|<select/i.test(html), 'Neue Formularfelder brauchen 16px Schriftgröße')

  // Kein gesperrter Zoom: das ist eine Zugänglichkeitsfrage, keine Stilfrage.
  assert.ok(!/user-scalable=no|maximum-scale=1/.test(html))

  // Die Links in der Fußzeile sind die kleinsten Tippziele der Seite.
  assert.match(html, /footer a \{[^}]*min-height:\s*44px/s)
})

/* ── Hilfsmittel ──────────────────────────────────────────────────────────── */

/** Liest ein 8-Bit-RGB-PNG ohne Interlacing (Farbtyp 2). */
function rgbDecode (datei) {
  const kante = datei.readUInt32BE(16)
  assert.equal(datei.readUInt32BE(20), kante, 'Nur quadratische Symbole werden geprüft')
  assert.equal(datei[24], 8)
  assert.equal(datei[25], 2)

  const teile = []
  for (let i = 8; i < datei.length;) {
    const laenge = datei.readUInt32BE(i)
    if (datei.toString('ascii', i + 4, i + 8) === 'IDAT') teile.push(datei.subarray(i + 8, i + 8 + laenge))
    i += 12 + laenge
  }

  const roh = inflateSync(Buffer.concat(teile))
  const zeile = kante * 3
  const rgb = Buffer.alloc(kante * zeile)
  let vorige = Buffer.alloc(zeile)

  const paeth = (a, b, c) => {
    const p = a + b - c
    const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c)
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
  }

  for (let y = 0, pos = 0; y < kante; y++) {
    const filter = roh[pos++]
    const aktuell = Buffer.from(roh.subarray(pos, pos + zeile))
    pos += zeile
    for (let x = 0; x < zeile; x++) {
      const a = x >= 3 ? aktuell[x - 3] : 0
      const b = vorige[x]
      const c = x >= 3 ? vorige[x - 3] : 0
      let zusatz = 0
      if (filter === 1) zusatz = a
      else if (filter === 2) zusatz = b
      else if (filter === 3) zusatz = (a + b) >> 1
      else if (filter === 4) zusatz = paeth(a, b, c)
      aktuell[x] = (aktuell[x] + zusatz) & 255
    }
    aktuell.copy(rgb, y * zeile)
    vorige = aktuell
  }

  return { kante, rgb }
}
