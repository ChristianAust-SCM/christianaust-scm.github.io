#!/usr/bin/env node
/*
 * PWA-Icons aus dem vorhandenen CA-Signet erzeugen
 * ===============================================
 * Erzeugt die vier Installationssymbole aus `assets/logo/ca-favicon-512.png`.
 * Diese Quelldatei ist die Favicon-Fassung des CA-Signets: orangefarbenes „C",
 * navyfarbenes „A", auf weißer, abgerundeter Fläche. Sie ist bereits die
 * Identität, die christianaust.eu heute im Browser-Tab und auf dem
 * Home-Bildschirm zeigt — sie wird hier nicht neu erfunden, nur passend
 * ausgegeben.
 *
 * Warum dieses Skript überhaupt im Repo liegt: Icons sind Binärdateien. Ohne
 * den Erzeugungsweg lässt sich später weder nachvollziehen, wie sie entstanden
 * sind, noch eine Größe ergänzen. Das Skript hat deshalb bewusst KEINE
 * Abhängigkeit — weder ImageMagick noch Pillow noch ein npm-Paket. Es liest
 * und schreibt PNG mit `node:zlib` und sonst nichts.
 *
 * Aufruf:  node tools/make-pwa-icons.mjs [--check]
 *
 *   ohne Argument   schreibt die Dateien nach assets/pwa/
 *   --check         erzeugt sie nur im Speicher und vergleicht sie mit den
 *                   abgelegten Dateien (Byte für Byte). Damit lässt sich
 *                   prüfen, ob die Binärdateien noch zu ihrer Quelle passen.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { deflateSync, inflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const QUELLE = 'assets/logo/ca-favicon-512.png'

/* Weiß wie die Kachel der Quelldatei — die Ecken werden damit deckend. */
const GRUND = [255, 255, 255]

/* ── PNG lesen ───────────────────────────────────────────────────────────── */

const SIGNATUR = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

/**
 * Liest ein 8-Bit-RGBA-PNG ohne Interlacing.
 * Mehr wird hier nicht gebraucht, also wird auch nicht mehr unterstützt —
 * alles Weitere würde ungetesteter Code bleiben.
 */
function decode (datei) {
  if (!datei.subarray(0, 8).equals(SIGNATUR)) throw new Error('Keine PNG-Signatur')

  let kopf = null
  const teile = []
  for (let i = 8; i < datei.length;) {
    const laenge = datei.readUInt32BE(i)
    const typ = datei.toString('ascii', i + 4, i + 8)
    const rumpf = datei.subarray(i + 8, i + 8 + laenge)
    if (typ === 'IHDR') {
      kopf = {
        breite: rumpf.readUInt32BE(0),
        hoehe: rumpf.readUInt32BE(4),
        tiefe: rumpf[8],
        farbtyp: rumpf[9],
        interlace: rumpf[12]
      }
    } else if (typ === 'IDAT') {
      teile.push(rumpf)
    }
    i += 12 + laenge
  }
  if (!kopf) throw new Error('IHDR fehlt')
  if (kopf.tiefe !== 8 || kopf.farbtyp !== 6 || kopf.interlace !== 0) {
    throw new Error(`Nur 8-Bit-RGBA ohne Interlacing wird gelesen (tiefe=${kopf.tiefe}, farbtyp=${kopf.farbtyp}, interlace=${kopf.interlace})`)
  }

  const roh = inflateSync(Buffer.concat(teile))
  const { breite, hoehe } = kopf
  const zeile = breite * 4
  const bild = Buffer.alloc(hoehe * zeile)
  let vorige = Buffer.alloc(zeile)

  for (let y = 0, pos = 0; y < hoehe; y++) {
    const filter = roh[pos++]
    const aktuell = Buffer.from(roh.subarray(pos, pos + zeile))
    pos += zeile
    entfiltern(filter, aktuell, vorige, zeile)
    aktuell.copy(bild, y * zeile)
    vorige = aktuell
  }

  return { breite, hoehe, bild }
}

/** Kehrt einen der fünf PNG-Zeilenfilter um. Arbeitet auf `zeile` in-place. */
function entfiltern (filter, zeile, vorige, laenge) {
  for (let x = 0; x < laenge; x++) {
    const a = x >= 4 ? zeile[x - 4] : 0
    const b = vorige[x]
    const c = x >= 4 ? vorige[x - 4] : 0
    let zusatz = 0
    if (filter === 1) zusatz = a
    else if (filter === 2) zusatz = b
    else if (filter === 3) zusatz = (a + b) >> 1
    else if (filter === 4) zusatz = paeth(a, b, c)
    else if (filter !== 0) throw new Error(`Unbekannter Zeilenfilter ${filter}`)
    zeile[x] = (zeile[x] + zusatz) & 255
  }
}

function paeth (a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

/* ── PNG schreiben ───────────────────────────────────────────────────────── */

/**
 * Schreibt ein deckendes 8-Bit-RGB-PNG (Farbtyp 2).
 *
 * Deckend und ohne Alphakanal ist Absicht: iOS legt ein Home-Screen-Symbol auf
 * Schwarz, wenn es durchscheinend ist, und schneidet es anschließend selbst
 * rund zu. Eine eigene transparente Rundung ergäbe dort nur eine dunkle Kante.
 */
function encode (breite, hoehe, rgb) {
  const zeile = breite * 3
  const roh = Buffer.alloc(hoehe * (zeile + 1))
  const vorige = Buffer.alloc(zeile)
  const kandidat = Buffer.alloc(zeile)

  for (let y = 0; y < hoehe; y++) {
    const quelle = rgb.subarray(y * zeile, (y + 1) * zeile)
    // Adaptive Filterwahl nach der üblichen Heuristik: die Zeile mit der
    // kleinsten Summe der Beträge komprimiert erfahrungsgemäß am besten.
    let besterFilter = 0
    let bestesMass = Infinity
    let besteZeile = null
    for (const filter of [0, 1, 2, 3, 4]) {
      filtern(filter, quelle, vorige, zeile, kandidat)
      let mass = 0
      for (let x = 0; x < zeile; x++) mass += kandidat[x] < 128 ? kandidat[x] : 256 - kandidat[x]
      if (mass < bestesMass) {
        bestesMass = mass
        besterFilter = filter
        besteZeile = Buffer.from(kandidat)
      }
    }
    roh[y * (zeile + 1)] = besterFilter
    besteZeile.copy(roh, y * (zeile + 1) + 1)
    quelle.copy(vorige)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(breite, 0)
  ihdr.writeUInt32BE(hoehe, 4)
  ihdr[8] = 8    // Bittiefe
  ihdr[9] = 2    // Farbtyp: Truecolor ohne Alpha
  ihdr[10] = 0   // Kompression: deflate
  ihdr[11] = 0   // Filtermethode: adaptiv
  ihdr[12] = 0   // kein Interlacing

  return Buffer.concat([
    SIGNATUR,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(roh, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function filtern (filter, quelle, vorige, laenge, ziel) {
  for (let x = 0; x < laenge; x++) {
    const a = x >= 3 ? quelle[x - 3] : 0
    const b = vorige[x]
    const c = x >= 3 ? vorige[x - 3] : 0
    let abzug = 0
    if (filter === 1) abzug = a
    else if (filter === 2) abzug = b
    else if (filter === 3) abzug = (a + b) >> 1
    else if (filter === 4) abzug = paeth(a, b, c)
    ziel[x] = (quelle[x] - abzug) & 255
  }
}

function chunk (typ, rumpf) {
  const kopf = Buffer.alloc(8)
  kopf.writeUInt32BE(rumpf.length, 0)
  kopf.write(typ, 4, 'ascii')
  const schwanz = Buffer.alloc(4)
  schwanz.writeUInt32BE(crc32(Buffer.concat([kopf.subarray(4), rumpf])), 0)
  return Buffer.concat([kopf, rumpf, schwanz])
}

const CRC_TABELLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32 (buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABELLE[(c ^ buf[i]) & 255] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

/* ── Bildoperationen ─────────────────────────────────────────────────────── */

/**
 * Flächenmittelung auf eine neue Größe.
 *
 * Kein bilineares Abtasten: beim Verkleinern um mehr als das Doppelte —
 * 512 auf 192 ist Faktor 2,67 — überspringt bilinear ganze Pixelreihen und
 * lässt dünne Linien ausfransen. Die Mittelung über die tatsächlich
 * abgedeckte Quellfläche behandelt jedes Quellpixel, unabhängig vom Faktor.
 *
 * Gerechnet wird mit vormultipliziertem Alpha, sonst zögen vollständig
 * durchsichtige Pixel ihre (beliebige) Farbe in den Mittelwert.
 */
function skalieren (bild, breite, hoehe, neueBreite, neueHoehe) {
  const ziel = Buffer.alloc(neueBreite * neueHoehe * 4)
  const xSchritt = breite / neueBreite
  const ySchritt = hoehe / neueHoehe

  for (let y = 0; y < neueHoehe; y++) {
    const y0 = y * ySchritt
    const y1 = (y + 1) * ySchritt
    for (let x = 0; x < neueBreite; x++) {
      const x0 = x * xSchritt
      const x1 = (x + 1) * xSchritt

      let r = 0, g = 0, b = 0, a = 0, gewichtSumme = 0
      for (let sy = Math.floor(y0); sy < Math.min(Math.ceil(y1), hoehe); sy++) {
        const yAnteil = Math.min(y1, sy + 1) - Math.max(y0, sy)
        if (yAnteil <= 0) continue
        for (let sx = Math.floor(x0); sx < Math.min(Math.ceil(x1), breite); sx++) {
          const xAnteil = Math.min(x1, sx + 1) - Math.max(x0, sx)
          if (xAnteil <= 0) continue
          const gewicht = yAnteil * xAnteil
          const i = (sy * breite + sx) * 4
          const alpha = bild[i + 3] / 255
          r += bild[i] * alpha * gewicht
          g += bild[i + 1] * alpha * gewicht
          b += bild[i + 2] * alpha * gewicht
          a += bild[i + 3] * gewicht
          gewichtSumme += gewicht
        }
      }

      const j = (y * neueBreite + x) * 4
      if (gewichtSumme === 0) continue
      const alphaMittel = a / gewichtSumme
      const entmultiplizieren = alphaMittel > 0 ? 255 / alphaMittel : 0
      ziel[j] = runde(r / gewichtSumme * entmultiplizieren)
      ziel[j + 1] = runde(g / gewichtSumme * entmultiplizieren)
      ziel[j + 2] = runde(b / gewichtSumme * entmultiplizieren)
      ziel[j + 3] = runde(alphaMittel)
    }
  }
  return ziel
}

function runde (v) { return Math.max(0, Math.min(255, Math.round(v))) }

/**
 * Legt ein RGBA-Bild mittig auf eine deckende Fläche und gibt reines RGB
 * zurück. `rand` ist der Abstand in Zielpixeln auf jeder Seite.
 */
function aufGrund (bild, breite, hoehe, kante, rand) {
  const rgb = Buffer.alloc(kante * kante * 3)
  for (let i = 0; i < kante * kante; i++) {
    rgb[i * 3] = GRUND[0]
    rgb[i * 3 + 1] = GRUND[1]
    rgb[i * 3 + 2] = GRUND[2]
  }
  const versatzX = rand + Math.round((kante - 2 * rand - breite) / 2)
  const versatzY = rand + Math.round((kante - 2 * rand - hoehe) / 2)

  for (let y = 0; y < hoehe; y++) {
    const zy = y + versatzY
    if (zy < 0 || zy >= kante) continue
    for (let x = 0; x < breite; x++) {
      const zx = x + versatzX
      if (zx < 0 || zx >= kante) continue
      const q = (y * breite + x) * 4
      const alpha = bild[q + 3] / 255
      if (alpha === 0) continue
      const z = (zy * kante + zx) * 3
      for (let k = 0; k < 3; k++) {
        rgb[z + k] = runde(bild[q + k] * alpha + rgb[z + k] * (1 - alpha))
      }
    }
  }
  return rgb
}

/* ── Die vier Ausgaben ───────────────────────────────────────────────────── */

/**
 * Das kleinste Rechteck, das alles enthält, was nicht die weiße Kachel ist.
 *
 * Gebraucht für das `maskable`-Symbol: dessen Sicherheitszone bezieht sich auf
 * das SICHTBARE Zeichen, nicht auf die Leinwand. Wer die ganze Quelldatei
 * kleinrechnet, verkleinert deren vorhandenen Rand gleich mit und landet bei
 * einem Zeichen, das verloren in der Mitte steht.
 */
function tintenRahmen (bild, breite, hoehe) {
  let x0 = breite, y0 = hoehe, x1 = -1, y1 = -1
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const i = (y * breite + x) * 4
      if (bild[i + 3] < 8) continue
      // „Fast weiß" zählt als Kachel, nicht als Zeichen — sonst fängt der
      // Rahmen die Antialiasing-Kante der abgerundeten Fläche ein.
      if (bild[i] > 238 && bild[i + 1] > 238 && bild[i + 2] > 238) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) throw new Error('Kein Zeichen gefunden — ist die Quelldatei leer?')
  return { x0, y0, breite: x1 - x0 + 1, hoehe: y1 - y0 + 1 }
}

/*
 * Maskable-Maßstab.
 *
 * Android schneidet ein `maskable`-Symbol beliebig zu; verlässlich sichtbar
 * bleibt nur der eingeschriebene Kreis mit 80 % Durchmesser, hier also Radius
 * 0,4 · 512 = 204,8 px. Damit kein Eckpunkt des Zeichens aus diesem Kreis
 * ragt, muss dessen halbe Diagonale in den Radius passen. Daraus ergibt sich
 * der Maßstab — gemessen, nicht geschätzt:
 *
 *     maßstab = radius / √((tinte.breite/2)² + (tinte.hoehe/2)²)
 *
 * Für das CA-Signet (Tinte 392 × 265 px) sind das rund 0,865, die Quelle wird
 * also auf etwa 443 px gebracht statt auf die 290 px, die ein quadratisch
 * gedachter Rand ergäbe. Das Zeichen bleibt vollständig geschützt und füllt
 * die Kachel trotzdem sichtbar aus.
 */
function maskableKante (quelle) {
  const tinte = tintenRahmen(quelle.bild, quelle.breite, quelle.hoehe)
  const radius = 512 * 0.4
  const halbeDiagonale = Math.hypot(tinte.breite / 2, tinte.hoehe / 2)
  const massstab = radius / halbeDiagonale
  // Abrunden statt runden: lieber ein Pixel zu klein als einen Pixel außerhalb.
  return Math.floor(quelle.breite * massstab)
}

function ausgaben (quelle) {
  const { breite, hoehe, bild } = quelle
  const MASKABLE_KANTE = maskableKante(quelle)
  return [
    {
      pfad: 'assets/pwa/icon-192.png',
      kante: 192,
      erzeugen: () => aufGrund(skalieren(bild, breite, hoehe, 192, 192), 192, 192, 192, 0)
    },
    {
      pfad: 'assets/pwa/icon-512.png',
      kante: 512,
      erzeugen: () => aufGrund(bild, breite, hoehe, 512, 0)
    },
    {
      pfad: 'assets/pwa/icon-maskable-512.png',
      kante: 512,
      erzeugen: () => {
        const k = MASKABLE_KANTE
        return aufGrund(skalieren(bild, breite, hoehe, k, k), k, k, 512, 0)
      }
    },
    {
      pfad: 'assets/pwa/apple-touch-icon.png',
      kante: 180,
      erzeugen: () => aufGrund(skalieren(bild, breite, hoehe, 180, 180), 180, 180, 180, 0)
    }
  ]
}

/* ── Ablauf ──────────────────────────────────────────────────────────────── */

const nurPruefen = process.argv.includes('--check')
const quelle = decode(await readFile(join(ROOT, QUELLE)))

if (quelle.breite !== 512 || quelle.hoehe !== 512) {
  throw new Error(`${QUELLE} ist ${quelle.breite}×${quelle.hoehe}, erwartet 512×512`)
}

await mkdir(join(ROOT, 'assets/pwa'), { recursive: true })

let abweichungen = 0
for (const ausgabe of ausgaben(quelle)) {
  const datei = encode(ausgabe.kante, ausgabe.kante, ausgabe.erzeugen())
  if (nurPruefen) {
    let gleich = false
    try {
      gleich = (await readFile(join(ROOT, ausgabe.pfad))).equals(datei)
    } catch { gleich = false }
    console.log(`${gleich ? 'gleich   ' : 'ABWEICHEND'} ${ausgabe.pfad}`)
    if (!gleich) abweichungen++
  } else {
    await writeFile(join(ROOT, ausgabe.pfad), datei)
    console.log(`geschrieben ${ausgabe.pfad} — ${ausgabe.kante}×${ausgabe.kante}, ${datei.length} Byte`)
  }
}

if (nurPruefen && abweichungen > 0) {
  console.error(`\n${abweichungen} Datei(en) weichen von der Quelle ab. Neu erzeugen mit: node tools/make-pwa-icons.mjs`)
  process.exitCode = 1
}
