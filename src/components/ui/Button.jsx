export default function Button({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }) {
  const base = 'flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 active:scale-95 select-none'
  const variants = {
    primary:   'bg-gold text-bg px-6 py-4 text-base disabled:opacity-40',
    secondary: 'bg-surface border border-border text-white px-6 py-4 text-base',
    ghost:     'text-gold px-4 py-3 text-sm',
    danger:    'bg-red-900 text-white px-6 py-4 text-base',
    outline:   'border border-gold text-gold px-6 py-4 text-base',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
