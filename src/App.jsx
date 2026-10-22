
import { useEffect, useState } from 'react'
import './App.css'

const ZODIAC_SYMBOLS = {
  Widder: '♈',
  Stier: '♉',
  Zwillinge: '♊',
  Krebs: '♋',
  Löwe: '♌',
  Jungfrau: '♍',
  Waage: '♎',
  Skorpion: '♏',
  Schütze: '♐',
  Steinbock: '♑',
  Wassermann: '♒',
  Fische: '♓'
}


function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('horoscope')

  useEffect(() => {
    async function loadHoroscope() {
      try {
        const response = await fetch(
  `${import.meta.env.BASE_URL}data/horoscope.json?t=${Date.now()}`
)

        if (!response.ok) {
          throw new Error('Horoskop nicht gefunden')
        }

        const result = await response.json()
        setData(result)
      } catch {
        setError('Das Tageshoroskop konnte nicht geladen werden.')
      }
    }

    loadHoroscope()
  }, [])

  if (error) {
    return <div className="status-message">{error}</div>
  }

  if (!data) {
    return <div className="status-message">Die Sterne werden gelesen ... ✦</div>
  }

  const sections = [
    { id: 'horoscope', label: 'Heute', icon: '✦' },
    { id: 'love', label: 'Liebe', icon: '♡' },
    { id: 'career', label: 'Beruf', icon: '✧' },
    { id: 'behavior', label: 'Verhalten', icon: '☼' },
    { id: 'avoid', label: 'Vermeiden', icon: '☾' }
  ]

  const currentSection = sections.find(
    section => section.id === activeTab
  )

  const formattedDate = new Intl.DateTimeFormat('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Berlin'
  }).format(new Date(`${data.date}T12:00:00Z`))

  return (
    <main className="app">
      <div className="container">
        <header className="header">
          <span className="eyebrow">YOUR DAILY COSMIC GUIDE</span>
          <h1>Cosmic Daily <span>✦</span></h1>
          <p>Ein kleiner Blick in die Sterne.</p>
        </header>

        <section className="zodiac-card">
          <div className="zodiac-symbol">♑</div>
          <span className="zodiac-name">{data.sign}</span>
          <h2>Dein Tageshoroskop</h2>
          <p className="date">{formattedDate}</p>
        </section>

        <nav className="tabs" aria-label="Horoskop-Kategorien">
          {sections.map(section => (
            <button
              key={section.id}
              className={
                activeTab === section.id
                  ? 'tab active'
                  : 'tab'
              }
              onClick={() => setActiveTab(section.id)}
            >
              <span>{section.icon}</span>
              {section.label}
            </button>
          ))}
        </nav>

        <section className="content-card">
          <span className="section-eyebrow">
            {currentSection.icon} DEINE KOSMISCHE BOTSCHAFT
          </span>

          <h2>{currentSection.label}</h2>

          <p>{data[activeTab]}</p>
        </section>

        <section className="tip-card">
          <span>✦ TIPP DES TAGES</span>
          <p>{data.tip}</p>
        </section>

        <section className="moon-card">
          <span className="moon-symbol">☾</span>
          <div>
            <h3>{data.astronomy?.moonPhase?.name}</h3>
            <p>
              Mondbeleuchtung: {data.astronomy?.moonPhase?.illuminationPercent} %
            </p>
          </div>
        </section>

        <footer>
          Basierend auf astronomischen Daten.
          Astrologische Deutung zur Inspiration.
        </footer>
      </div>
    </main>
  )
}

export default App
