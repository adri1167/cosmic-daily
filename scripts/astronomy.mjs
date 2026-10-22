console.log('🌙 Cosmic Daily – Astronomie-Skript gestartet!')
import * as Astronomy from 'astronomy-engine'



const SIGNS = [
  'Widder', 'Stier', 'Zwillinge', 'Krebs',
  'Löwe', 'Jungfrau', 'Waage', 'Skorpion',
  'Schütze', 'Steinbock', 'Wassermann', 'Fische'
]

function normalize(degrees) {
  return ((degrees % 360) + 360) % 360
}

function zodiacPosition(longitude) {
  const degrees = normalize(longitude)

  return {
    sign: SIGNS[Math.floor(degrees / 30)],
    degrees: Number((degrees % 30).toFixed(2)),
    longitude: Number(degrees.toFixed(2))
  }
}

function planetLongitude(body, date) {
  const vector = Astronomy.GeoVector(body, date, true)
  return Astronomy.Ecliptic(vector).elon
}

function getMoonPhase(angle) {
  if (angle < 22.5 || angle >= 337.5)
    return 'Neumond'

  if (angle < 67.5)
    return 'Zunehmende Sichel'

  if (angle < 112.5)
    return 'Erstes Viertel'

  if (angle < 157.5)
    return 'Zunehmender Mond'

  if (angle < 202.5)
    return 'Vollmond'

  if (angle < 247.5)
    return 'Abnehmender Mond'

  if (angle < 292.5)
    return 'Letztes Viertel'

  return 'Abnehmende Sichel'
}

export function getAstronomyData(date = new Date()) {
  const sun = Astronomy.SunPosition(date).elon
  const moon = Astronomy.EclipticGeoMoon(date).lon
  const moonAngle = Astronomy.MoonPhase(date)

  const planets = {
    Sonne: zodiacPosition(sun),
    Mond: zodiacPosition(moon),
    Merkur: zodiacPosition(
      planetLongitude(Astronomy.Body.Mercury, date)
    ),
    Venus: zodiacPosition(
      planetLongitude(Astronomy.Body.Venus, date)
    ),
    Mars: zodiacPosition(
      planetLongitude(Astronomy.Body.Mars, date)
    ),
    Jupiter: zodiacPosition(
      planetLongitude(Astronomy.Body.Jupiter, date)
    ),
    Saturn: zodiacPosition(
      planetLongitude(Astronomy.Body.Saturn, date)
    )
  }

  // Winkelbeziehungen zwischen Himmelskörpern
  const aspects = []
  const names = Object.keys(planets)

  const definitions = [
    { name: 'Konjunktion', angle: 0 },
    { name: 'Sextil', angle: 60 },
    { name: 'Quadrat', angle: 90 },
    { name: 'Trigon', angle: 120 },
    { name: 'Opposition', angle: 180 }
  ]

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = planets[names[i]].longitude
      const b = planets[names[j]].longitude

      const difference = Math.abs(a - b)
      const separation = Math.min(
        difference,
        360 - difference
      )

      for (const aspect of definitions) {
        const orb = Math.abs(separation - aspect.angle)

        // 5 Grad Toleranz für unsere astrologische Deutung
        if (orb <= 5) {
          aspects.push({
            between: [names[i], names[j]],
            aspect: aspect.name,
            separation: Number(separation.toFixed(2)),
            orb: Number(orb.toFixed(2))
          })
          break
        }
      }
    }
  }

  return {
    calculatedAtUTC: date.toISOString(),
    zodiacSystem: 'tropical',
    planets,
    moonPhase: {
      name: getMoonPhase(moonAngle),
      angle: Number(moonAngle.toFixed(2)),
      illuminationPercent: Number(
        (50 * (1 - Math.cos(moonAngle * Math.PI / 180)))
          .toFixed(1)
      )
    },
    aspects
  }
}


