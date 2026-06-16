import { useState } from 'react'
import { COURSES, MANUAL_COURSE_TEMPLATE } from '../../data/courses'
import Button from '../../components/ui/Button'
import { useNavigate } from 'react-router-dom'

export default function Step1Field({ field, setField, startingHole, setStartingHole, next }) {
  const nav = useNavigate()
  const [showManual, setShowManual] = useState(false)
  const [manual, setManual] = useState(MANUAL_COURSE_TEMPLATE)
  const [editingCourse, setEditingCourse] = useState(null)

  function selectCourse(c) {
    setField(JSON.parse(JSON.stringify(c)))
    setShowManual(false)
    setEditingCourse(null)
  }

  function handleManualChange(f, val) {
    setManual(m => ({ ...m, [f]: val }))
  }

  function handleHoleChange(idx, key, val) {
    setManual(m => {
      const holes = [...m.holes]
      holes[idx] = { ...holes[idx], [key]: Number(val) }
      return { ...m, holes }
    })
  }

  function handleEditHoleChange(idx, key, val) {
    setField(f => {
      const holes = [...f.holes]
      holes[idx] = { ...holes[idx], [key]: Number(val) }
      return { ...f, holes }
    })
  }

  // Resolve SI based on current starting hole
  function getSI(h) {
    return startingHole === 10 && h.si10 != null ? h.si10 : h.si
  }

  return (
    <div className="flex flex-col px-5 pt-10 pb-8 gap-6">
      <button onClick={() => nav('/')} className="text-gray-400 text-sm self-start">← Cancelar</button>
      <div>
        <h1 className="text-white text-2xl font-black">Selecciona el Campo</h1>
        <p className="text-gray-400 text-sm mt-1">Paso 1 de 5</p>
      </div>

      {/* Starting hole selector — at the top so SI is correct when reviewing the field */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <p className="text-white font-semibold text-sm">¿Por qué hoyo salen?</p>
        <div className="flex gap-3">
          {[{ hole: 1, label: 'Hoyo 1', sub: 'Front nine primero' }, { hole: 10, label: 'Hoyo 10', sub: 'Back nine primero' }].map(opt => (
            <button
              key={opt.hole}
              onClick={() => setStartingHole(opt.hole)}
              className={`flex-1 rounded-xl border py-3 text-center transition-colors ${startingHole === opt.hole ? 'border-gold bg-gold/10' : 'border-border'}`}
            >
              <p className={`font-black text-xl ${startingHole === opt.hole ? 'text-gold' : 'text-white'}`}>{opt.label}</p>
              <p className="text-gray-400 text-xs mt-0.5">{opt.sub}</p>
            </button>
          ))}
        </div>
        <p className="text-gray-500 text-xs">Solo aplica para rondas de 18 hoyos. El SI se ajusta automáticamente.</p>
      </div>

      <div className="flex flex-col gap-2">
        {COURSES.map(c => (
          <div key={c.id} className={`rounded-xl border transition-colors ${field?.id === c.id ? 'border-gold' : 'border-border'}`}>
            <button
              onClick={() => selectCourse(c)}
              className="w-full text-left px-4 py-4 flex justify-between items-center"
            >
              <div>
                <p className={`font-semibold text-base ${field?.id === c.id ? 'text-gold' : 'text-white'}`}>{c.name}</p>
                <p className="text-gray-400 text-xs">{c.city}</p>
              </div>
              {field?.id === c.id && <span className="text-gold text-xl">✓</span>}
            </button>
            {field?.id === c.id && (
              <div className="px-4 pb-4">
                <button
                  onClick={() => setEditingCourse(editingCourse === c.id ? null : c.id)}
                  className="text-gold text-xs underline"
                >
                  {editingCourse === c.id ? 'Ocultar hoyos' : 'Editar SI / Par por hoyo'}
                </button>
                {editingCourse === c.id && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs text-white">
                      <thead>
                        <tr className="text-gray-400">
                          <th className="text-left pb-2">Hoyo</th>
                          <th className="pb-2">Par</th>
                          <th className="pb-2">SI {startingHole === 10 && field?.holes?.some(h => h.si10) ? '(desde H10)' : ''}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {field.holes.map((h, i) => (
                          <tr key={h.n} className="border-t border-border">
                            <td className="py-1 text-gray-400">{h.n}</td>
                            <td className="py-1 text-center">
                              <select
                                value={h.par}
                                onChange={e => handleEditHoleChange(i, 'par', e.target.value)}
                                className="bg-surface border border-border rounded px-1 py-0.5 text-white text-xs w-12"
                              >
                                <option>3</option><option>4</option><option>5</option>
                              </select>
                            </td>
                            <td className="py-1 text-center">
                              <input
                                type="number"
                                value={getSI(h)}
                                onChange={e => handleEditHoleChange(i, startingHole === 10 && h.si10 != null ? 'si10' : 'si', e.target.value)}
                                className="bg-surface border border-border rounded px-1 py-0.5 text-white text-xs w-12 text-center"
                                min={1} max={18}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <button
          onClick={() => { setShowManual(true); setField(null) }}
          className={`rounded-xl border px-4 py-4 text-left transition-colors ${showManual ? 'border-gold' : 'border-border'}`}
        >
          <p className={`font-semibold text-base ${showManual ? 'text-gold' : 'text-white'}`}>+ Campo Manual</p>
          <p className="text-gray-400 text-xs">Ingresa nombre, par y SI por hoyo</p>
        </button>
      </div>

      {showManual && (
        <div className="flex flex-col gap-4 bg-surface border border-border rounded-xl p-4">
          <input
            placeholder="Nombre del campo"
            value={manual.name}
            onChange={e => handleManualChange('name', e.target.value)}
            className="bg-bg border border-border rounded-xl px-4 py-3 text-white outline-none focus:border-gold"
          />
          <p className="text-gray-400 text-xs">Configura par y SI de cada hoyo:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-white">
              <thead>
                <tr className="text-gray-400 text-center">
                  <th className="text-left pb-2">Hoyo</th>
                  <th className="pb-2">Par</th>
                  <th className="pb-2">SI</th>
                </tr>
              </thead>
              <tbody>
                {manual.holes.map((h, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-1.5 text-gray-400">{h.n}</td>
                    <td className="py-1.5 text-center">
                      <select
                        value={h.par}
                        onChange={e => handleHoleChange(i, 'par', e.target.value)}
                        className="bg-bg border border-border rounded px-1 py-0.5 text-white text-xs w-12"
                      >
                        <option>3</option><option>4</option><option>5</option>
                      </select>
                    </td>
                    <td className="py-1.5 text-center">
                      <input
                        type="number"
                        value={h.si}
                        onChange={e => handleHoleChange(i, 'si', e.target.value)}
                        className="bg-bg border border-border rounded px-1 py-0.5 text-white text-xs w-12 text-center"
                        min={1} max={18}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={() => { setField({ ...manual, id: 'manual' }) }} variant="outline" className="w-full">
            Usar este campo
          </Button>
        </div>
      )}

      <Button onClick={next} disabled={!field} className="w-full mt-auto">
        Continuar →
      </Button>
    </div>
  )
}
