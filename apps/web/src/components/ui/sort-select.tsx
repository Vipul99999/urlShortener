'use client'

type Props = {
  value: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
}

export function SortSelect({ value, onChange, options }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}