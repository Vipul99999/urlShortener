'use client'

type Option = {
  label: string
  value: string
}

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  error?: string
}

export function SelectField({ label, value, onChange, options, error }: Props) {
  return (
    <div>
      <label className="mb-2 block text-sm text-white/70">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${
          error
            ? 'border-red-500/30 bg-red-500/5 text-white'
            : 'border-white/10 bg-slate-900 text-white'
        }`}
      >
        <option value="">Select option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </div>
  )
}