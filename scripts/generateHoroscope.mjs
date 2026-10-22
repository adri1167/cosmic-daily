
import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'
import { getAstronomyData } from './astronomy.mjs'
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  throw new Error(
    'GEMINI_API_KEY fehlt. Bitte prüfe deine .env-Datei.'
  )
}

const ai = new GoogleGenAI({ apiKey })

const VALID_SIGNS = [
  'Widder', 'Stier', 'Zwillinge', 'Krebs',
  'Löwe', 'Jungfrau', 'Waage', 'Skorpion',
  'Schütze', 'Steinbock', 'Wassermann', 'Fische'
]

const requestedSign = process.argv[2] || 'Waage'

const zodiacSign = VALID_SIGNS.find(
  sign => sign.toLowerCase() === requestedSign.toLowerCase()
)

if (!zodiacSign) {
  throw new Error(
    `Ungültiges Sternzeichen: ${requestedSign}`
  )
}

// Always use the date in Germany
const today = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date())

// Calculate planetary positions for 06:00 Berlin time.
// This correctly handles daylight saving time.
function getBerlinOffset(dateString) {
  // Determine Berlin offset for noon on the chosen day
  const approximateDate = new Date(`${dateString}T12:00:00Z`)

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    timeZoneName: 'shortOffset'
  }).formatToParts(approximateDate)

  const zone = parts.find(p => p.type === 'timeZoneName')?.value

  return zone === 'GMT+2' ? '+02:00' : '+01:00'
}

const offset = getBerlinOffset(today)

const calculationDate = new Date(
  `${today}T06:00:00${offset}`
)

const astronomy = getAstronomyData(calculationDate)

console.log('🌙 Cosmic Daily gestartet')
console.log(`📅 Datum: ${today}`)
console.log(`♎ Sternzeichen: ${zodiacSign}`)
console.log('🪐 Astronomische Daten berechnet')

const prompt = `
Du bist ein professioneller, kreativer Autor
für westliche Tagesastrologie.

Erstelle ein einzigartiges Tageshoroskop
für das Sternzeichen ${zodiacSign}
für den ${today}.

WICHTIG:
Deine astrologischen Interpretationen müssen sich
auf die folgenden tatsächlich berechneten
astronomischen Positionen stützen.

ASTRONOMISCHE DATEN:
${JSON.stringify(astronomy, null, 2)}

REGELN:
1. Erfinde keine Planetenpositionen, Mondphasen
   oder astrologischen Aspekte.
2. Interpretiere die angegebenen Positionen
   nach der westlichen tropischen Astrologie.
3. Stelle astrologische Deutungen nicht als
   wissenschaftlich gesicherte Vorhersagen dar.
4. Beziehe mindestens zwei konkrete vorhandene
   Planetenkonstellationen in deine Interpretation ein.
5. Die Texte sollen jeden Tag originell,
   abwechslungsreich und persönlich klingen.
6. Schreibe natürliches, modernes Deutsch.
7. Keine Panikmache, Diagnosen oder garantierten
   Aussagen über Gesundheit, Geld oder Beziehungen.
8. Formuliere konkrete, hilfreiche Tagesimpulse.
9. Wiederhole dich nicht unnötig.

ERSTELLE FOLGENDE ABSCHNITTE:

horoscope:
80 bis 110 Wörter.
Deine allgemeine astrologische Tagesinterpretation.

love:
40 bis 60 Wörter über Liebe, Beziehungen
und zwischenmenschliche Kommunikation.

career:
40 bis 60 Wörter über Beruf, Motivation
und persönliche Ziele.

behavior:
40 bis 60 Wörter darüber, wie man sich
heute am besten verhalten könnte.

avoid:
20 bis 40 Wörter darüber, was man
heute eher vermeiden sollte.

tip:
Ein kurzer, konkreter und motivierender
Tipp für den heutigen Tag.

Gib ausschließlich ein gültiges JSON-Objekt
mit folgenden Schlüsseln zurück:

{
  "horoscope": "...",
  "love": "...",
  "career": "...",
  "behavior": "...",
  "avoid": "...",
  "tip": "..."
}
`

// Retry temporary API errors with exponential backoff
async function generateWithRetry(maxAttempts = 5) {
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash'

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(
        `🤖 Gemini (${model}) Versuch ${attempt}/${maxAttempts}`
      )

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      })

      if (!response.text) {
        throw new Error('Die API hat keinen Text zurückgegeben.')
      }

      return JSON.parse(response.text)

    } catch (error) {
      const status = Number(error.status)

      const retryable = [
        408, 429, 500, 502, 503, 504
      ].includes(status)

      if (!retryable || attempt === maxAttempts) {
        console.error(
          '❌ Generierung fehlgeschlagen:',
          error.message
        )
        throw error
      }

      const baseDelay = Math.min(
        2000 * (2 ** (attempt - 1)),
        30000
      )

      const delay = baseDelay + Math.floor(
        Math.random() * 1000
      )

      console.log(
        `⚠️ API-Fehler ${status}. ` +
        `Neuer Versuch in ${Math.ceil(delay / 1000)} Sekunden.`
      )

      await new Promise(resolve =>
        setTimeout(resolve, delay)
      )
    }
  }
}

const horoscope = await generateWithRetry()

// Validate generated content
const requiredFields = [
  'horoscope',
  'love',
  'career',
  'behavior',
  'avoid',
  'tip'
]

for (const field of requiredFields) {
  if (
    typeof horoscope[field] !== 'string' ||
    !horoscope[field].trim()
  ) {
    throw new Error(
      `Ungültiger KI-Inhalt: Feld "${field}" fehlt.`
    )
  }
}

const output = {
  date: today,
  sign: zodiacSign,
  generatedAt: new Date().toISOString(),
  astronomy,
  ...Object.fromEntries(
    requiredFields.map(field => [
      field,
      horoscope[field].trim()
    ])
  )
}

// Always save relative to the project directory
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectDir = path.resolve(scriptDir, '..')
const outputDir = path.join(projectDir, 'public', 'data')

await mkdir(outputDir, { recursive: true })

const outputFile = path.join(outputDir, 'horoscope.json')

// A successful response replaces the previous file.
// If all retries fail, the previous file remains intact.
await writeFile(
  outputFile,
  JSON.stringify(output, null, 2),
  'utf8'
)

console.log('✅ Horoskop erfolgreich generiert!')
console.log(`📁 Gespeichert: ${outputFile}`)
console.log('')
console.log('🔮 TAGESHOROSKOP:')
console.log(horoscope.horoscope)
console.log('')
console.log('💡 TIPP DES TAGES:')
console.log(horoscope.tip)
