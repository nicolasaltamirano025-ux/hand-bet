import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-surface rounded-t-2xl sm:rounded-2xl border border-border p-6 z-10 animate-slide-up max-h-[90dvh] overflow-y-auto">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg">{title}</h3>
            <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
