export function BudgetToggle({
  value,
  onChange,
  label = "Zalicz jako tegomiesięczną wpłatę na oszczędności",
  hint = "Wyłącz, jeśli te pieniądze już wcześniej istniały i tylko je tu zapisujesz.",
}: {
  value: boolean
  onChange: (v: boolean) => void
  label?: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-3 space-y-1">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-300">{label}</span>
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
            value ? 'bg-blue-500' : 'bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
              value ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      <p className="text-xs text-slate-500">{hint}</p>
    </div>
  )
}
