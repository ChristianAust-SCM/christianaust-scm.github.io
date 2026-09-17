/*
 * Prüft die Landingpage gegen die Zusagen, die sie macht.
 * Ausführen: node --test tests/
 */

import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const html = await readFile(new URL('index.html', root), 'utf8')

async function exists (path) {
  try { await access(new URL(path, root)); return true } catch { return false }
}

test('die CV-Seite ist restlos verschwunden', async () => {
  // Überschriften, Rollenbezeichnung und Bewerbungsadresse des alten Standes
  for (const rest of [
    'Lebenslauf', 'Werdegang', 'Track Record', 'Kernkompetenzen',
    'Taskforce Manager', 'bewerbung.c.aust', 'CV_Christian_Aust.pdf',
    'Berufserfahrung', 'download-btn'
  ]) {
    assert.ok(!html.includes(rest), `"${rest}" steht noch in index.html`)
  }

  // Das eingebettete Bewerbungsfoto lag als base64-JPEG im Markup
  assert.ok(!html.includes('data:image/jpeg;base64'), 'Das eingebettete Foto ist noch da')

  assert.equal(await exists('CV_Christian_Aust.pdf'), false, 'Das CV-PDF liegt noch im Repo')
})

test('der erste Bildschirm beantwortet wer, welche Themen, was ist das', () => {
  const hero = html.slice(html.indexOf('<section class="hero'), html.indexOf('id="bereiche"'))

  assert.match(hero, /Christian&nbsp;Aust/)
  assert.match(hero, /Ideen\. Prozesse\./)
  assert.match(hero, /SCM/)
  assert.match(hero, /Engpassmanagement/)
  assert.match(hero, /Digitale Prozesse/)
  assert.match(hero, /Automatisierung/)
  assert.match(hero, /Hier sammle ich/)
  assert.match(html, /\.hero\s*\{[^}]*min-height:\s*100svh/)
})

test('die vier inhaltlichen Bereiche stehen auf der Seite', () => {
  assert.match(html, /<h2>SCM &amp; Operations<\/h2>/)
  assert.match(html, /<h2>Digital &amp; Automation<\/h2>/)
  assert.match(html, /<h2>Lab · Ideenschmiede<\/h2>/)
  assert.match(html, /In Vorbereitung/)          // Lab ist heute nur Teaser
  assert.match(html, /EngpassWerk Consulting/)
})

test('EngpassWerk wird einmal, dezent und auf die erreichbare Adresse verwiesen', () => {
  const links = html.match(/https:\/\/www\.engpasswerk\.de/g) || []
  assert.equal(links.length, 1, 'EngpassWerk soll genau einmal verlinkt sein')

  // Die Apex-Adresse https://engpasswerk.de beantwortet TLS nicht — nur www nutzen
  assert.ok(!/href="https:\/\/engpasswerk\.de/.test(html))

  // Kein Vertriebsvokabular: das gehört auf engpasswerk.de, nicht hierher
  for (const wort of ['Angebot', 'Beratungspaket', 'Kontaktformular', 'Jetzt buchen', 'Referenzen']) {
    assert.ok(!html.includes(wort), `Vertriebsbegriff "${wort}" gehört nicht auf diese Seite`)
  }
})

test('das Cockpit bleibt dezent, mit Schloss und ohne Indexierung', () => {
  const cockpit = html.match(/<a href="https:\/\/cockpit\.christianaust\.eu"[\s\S]*?<\/a>/)
  assert.ok(cockpit, 'Cockpit-Link fehlt')

  const markup = cockpit[0]
  assert.match(markup, /rel="noopener nofollow"/)
  assert.match(markup, /<rect x="3" y="11"/)     // Schlosskörper des Inline-SVG
  assert.match(markup, />\s*Cockpit\s*<\/a>/)

  // Nur in der Fußzeile, nicht im Hero oder in den Bereichskarten
  assert.ok(html.indexOf('cockpit.christianaust.eu') > html.indexOf('<footer'))
  assert.equal((html.match(/cockpit\.christianaust\.eu/g) || []).length, 1)
})

test('die Seite lädt nichts von fremden Servern und führt kein Skript aus', () => {
  assert.ok(!/<script/i.test(html), 'Kein JavaScript auf dieser Seite')
  assert.ok(!/fonts\.googleapis|fonts\.gstatic|cdn\.|unpkg|jsdelivr/i.test(html))

  // Jedes src/href auf eine Ressource zeigt auf die eigene Domain
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1])
  const fremd = refs.filter(r => /^https?:\/\//.test(r) && !r.startsWith('https://christianaust.eu'))
  const erlaubt = ['https://www.engpasswerk.de', 'https://www.linkedin.com/in/austchristian', 'https://cockpit.christianaust.eu']
  for (const url of fremd) {
    assert.ok(erlaubt.includes(url), `Unerwarteter externer Verweis: ${url}`)
  }
})

test('alle referenzierten Dateien liegen auch im Repo', async () => {
  const lokal = [...html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)].map(m => m[1])
  assert.ok(lokal.length >= 4, 'Signet und Favicons werden erwartet')
  for (const pfad of new Set(lokal)) {
    assert.equal(await exists(pfad), true, `Datei fehlt: ${pfad}`)
  }
})

test('Metadaten, Favicons und Vorschaubild sind gesetzt', () => {
  assert.match(html, /<html lang="de">/)
  assert.match(html, /<link rel="canonical" href="https:\/\/christianaust\.eu\/">/)
  assert.match(html, /<meta name="robots" content="index, follow">/)
  assert.match(html, /<meta name="description" content="[^"]{80,}">/)
  assert.match(html, /<meta property="og:image" content="https:\/\/christianaust\.eu\/assets\/logo\/ca-favicon-512\.png">/)
  assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="assets\/logo\/ca-favicon-180\.png">/)
  assert.match(html, /<meta name="theme-color" content="#0B1622">/)
})

test('iPhone: Safe-Area und skalierbarer Zoom', () => {
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/)
  assert.ok(!/user-scalable=no|maximum-scale=1/.test(html), 'Zoom darf nicht gesperrt sein')

  assert.match(html, /padding-left:\s*max\(var\(--gutter\), env\(safe-area-inset-left\)\)/)
  assert.match(html, /padding-right:\s*max\(var\(--gutter\), env\(safe-area-inset-right\)\)/)
  assert.match(html, /env\(safe-area-inset-bottom\)/)
})

test('Bewegung ist abschaltbar und das Raster bricht auf eine Spalte um', () => {
  assert.match(html, /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,160}transition: none !important/)
  assert.match(html, /grid-template-columns: repeat\(auto-fit, minmax\(258px, 1fr\)\)/)
})

test('kein Manifest, kein Service Worker — das bleibt Sache des Cockpits', async () => {
  assert.ok(!/rel="manifest"/.test(html))
  assert.ok(!/serviceWorker/.test(html))
  assert.equal(await exists('manifest.webmanifest'), false)
  assert.equal(await exists('sw.js'), false)
})

test('das Deployment-Ziel der Domain bleibt unangetastet', async () => {
  const cname = (await readFile(new URL('CNAME', root), 'utf8')).trim()
  assert.equal(cname, 'christianaust.eu')
})
