'use client'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  error?: string
  disabled?: boolean
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  disabled
}: Props) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium tracking-[0.02em] text-white/72">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:ring-2 focus:ring-cyan-300/20 ${
          error
            ? 'border-red-500/30 bg-red-500/5 text-white placeholder:text-red-200/30'
            : 'border-white/10 bg-slate-950/90 text-white placeholder:text-white/30'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      />
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </div>
  )
}
