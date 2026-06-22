import { AVATAR_ICONS } from './avatarIcons'

export default function AvatarPicker({ current, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-bg border-t border-border rounded-t-2xl px-5 pt-4 animate-slide-up"
        style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
        <h3 className="text-white font-bold text-lg text-center mb-5">Elige tu ícono</h3>
        <div className="grid grid-cols-4 gap-3 mb-2">
          {AVATAR_ICONS.map(icon => (
            <button
              key={icon.id}
              onClick={() => onSelect(icon.id)}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${icon.bg} ${current === icon.id ? 'border-2 border-gold' : 'border-2 border-transparent'}`}
            >
              {icon.emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
