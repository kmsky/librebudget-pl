import { Card } from '../components/ui/Card'

interface Resource {
  name: string
  tagline: string
  description: string
  philosophy: string[]
  url: string
  tag: string
  tagColor: string
}

const RESOURCES: Resource[] = [
  {
    name: 'The Money Guy Show',
    tagline: 'Finansowa kolejność działań',
    description:
      'Prowadzący Brian Preston i Bo Hanson tłumaczą złożone tematy finansowe na konkretne, praktyczne porady. Znani z „Financial Order of Operations” — krok po kroku opisanego schematu mądrego budowania majątku.',
    philosophy: [
      'Trzymaj się finansowej kolejności działań (FOO)',
      'Inwestuj 25% dochodu netto, by osiągnąć niezależność finansową',
      'Buduj majątek systematycznie, inwestując w fundusze indeksowe',
      'Unikaj inflacji stylu życia w miarę wzrostu dochodów',
    ],
    url: 'https://moneyguy.com',
    tag: 'Budowanie majątku',
    tagColor: 'bg-green-500/10 text-green-400',
  },
  {
    name: 'Caleb Hammer',
    tagline: 'Audyt finansowy',
    description:
      'Caleb Hammer brutalnie szczerze audytuje finanse prawdziwych osób na żywo na YouTube. Jeśli potrzebujesz otrzeźwienia w kwestii swoich nawyków wydawania, to program dla Ciebie. Bez owijania w bawełnę — same fakty.',
    philosophy: [
      'Spójrz prawdzie o swoich finansach prosto w oczy',
      'Przestań się tłumaczyć i weź odpowiedzialność',
      'Bezwzględnie tnij zbędne wydatki',
      'Najpierw zbuduj fundusz awaryjny',
    ],
    url: 'https://www.youtube.com/@CalebHammer',
    tag: 'Zderzenie z rzeczywistością',
    tagColor: 'bg-red-500/10 text-red-400',
  },
  {
    name: 'Dave Ramsey',
    tagline: 'Małe kroki (Baby Steps)',
    description:
      'Metoda „Baby Steps” Dave\'a Ramseya to jeden z najpopularniejszych w USA schematów wychodzenia z długów. Skupia się na szybkim spłaceniu długów metodą kuli śnieżnej i zbudowaniu solidnych podstaw finansowych.',
    philosophy: [
      'Najpierw mały fundusz awaryjny na start (równowartość ok. 1000 zł)',
      'Spłać wszystkie długi metodą kuli śnieżnej',
      'Zbuduj fundusz awaryjny na 3–6 miesięcy',
      'Inwestuj 15% dochodu z myślą o emeryturze',
    ],
    url: 'https://www.ramseysolutions.com',
    tag: 'Wolność od długów',
    tagColor: 'bg-blue-500/10 text-blue-400',
  },
]

export default function Resources() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Materiały</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Sprawdzeni edukatorzy finansowi, którzy pomogą Ci się uczyć i rozwijać
        </p>
      </div>

      <div className="space-y-4">
        {RESOURCES.map((r) => (
          <Card key={r.name}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-slate-100">{r.name}</h2>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.tagColor}`}>
                    {r.tag}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{r.tagline}</p>
              </div>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Odwiedź
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed mb-3">{r.description}</p>

            <div className="border-t border-slate-800 pt-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Najważniejsze zasady
              </p>
              <ul className="space-y-1">
                {r.philosophy.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="mt-0.5 text-green-500 shrink-0">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      <p className="text-center text-xs text-slate-600 pb-2">
        LibreBudget nie promuje żadnego konkretnego doradcy finansowego. Zawsze weryfikuj informacje samodzielnie.
      </p>
    </div>
  )
}
