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
    tagline: 'The Financial Order of Operations',
    description:
      'Hosts Brian Preston and Bo Hanson break down complex financial topics into actionable advice. Known for the "Financial Order of Operations" — a step-by-step framework for building wealth the right way.',
    philosophy: [
      'Follow the Financial Order of Operations (FOO)',
      'Invest 25% of net income for financial independence',
      'Build wealth steadily through index fund investing',
      'Avoid lifestyle inflation as income grows',
    ],
    url: 'https://moneyguy.com',
    tag: 'Wealth Building',
    tagColor: 'bg-green-500/10 text-green-400',
  },
  {
    name: 'Caleb Hammer',
    tagline: 'Financial Audit',
    description:
      'Caleb Hammer audits real people\'s finances live on YouTube with brutal honesty. If you need a wake-up call about your spending habits, this is the show for you. No sugar-coating — just facts.',
    philosophy: [
      'Face your financial reality head-on',
      'Stop making excuses and take accountability',
      'Cut unnecessary spending ruthlessly',
      'Build an emergency fund before anything else',
    ],
    url: 'https://www.youtube.com/@CalebHammer',
    tag: 'Reality Check',
    tagColor: 'bg-red-500/10 text-red-400',
  },
  {
    name: 'Dave Ramsey',
    tagline: 'The Baby Steps',
    description:
      'Dave Ramsey\'s "Baby Steps" method is one of the most widely followed debt-freedom frameworks in the US. Focused on getting out of debt fast using the debt snowball method and building a solid financial foundation.',
    philosophy: [
      '$1,000 starter emergency fund first',
      'Pay off all debt using the debt snowball',
      'Build a 3–6 month emergency fund',
      'Invest 15% of income into retirement',
    ],
    url: 'https://www.ramseysolutions.com',
    tag: 'Debt Freedom',
    tagColor: 'bg-blue-500/10 text-blue-400',
  },
]

export default function Resources() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resources</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Vetted financial educators to help you learn and grow
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
                Visit
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
                Key Principles
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
        LibreBudget does not endorse any specific financial advisor. Always do your own research.
      </p>
    </div>
  )
}
