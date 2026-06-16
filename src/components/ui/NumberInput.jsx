import { useState, useEffect } from 'react'

export default function NumberInput({ value, onChange, min = 0, max = 99999, label, prefix = '$', className = '' }) {
  const [local, setLocal] = useState(String(value ?? ''))

  // Sync if parent value changes externally
  useEffect(() => {
    setLocal(String(value ?? ''))
  }, [value])

  function handleChange(e) {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    setLocal(raw)
  }

  function handleBlur() {
    const num = raw => {
      const n = parseInt(raw, 10)
      if (isNaN(n)) return min
      return Math.min(max, Math.max(min, n))
    }
    const final = num(local)
    setLocal(String(final))
    onChange(final)
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <span className="text-gray-400 text-xs">{label}</span>}
      <div className="flex items-center bg-surface border border-border rounded-xl overflow-hidden focus-within:border-gold transition-colors">
        {prefix && <span className="pl-3 text-gray-400 text-sm flex-shrink-0">{prefix}</span>}
        <input
          type="text"
          inputMode="numeric"
          value={local}
          onChange={handleChange}
          onBlur={handleBlur}
          className="flex-1 bg-transparent text-white px-3 py-3 text-base text-right outline-none min-w-0"
        />
      </div>
    </div>
  )
}
