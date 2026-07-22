// Generates a share card image (PNG blob) for golf round results.
// Drawn on an offscreen Canvas — no external deps needed.

const FUNNY_PHRASES = [
  'Los resultados no mienten... los jugadores sí 🤫',
  '¡El que deba, que pague con bolas de golf! ⛳',
  '¡Pronto habrá revancha en el campo! 🏌️',
  '¿Alguien dijo desquite? 👀',
  '¡A pagar se ha dicho! Venmo no acepta excusas 💸',
  'El handicap es una sugerencia, no una promesa 😅',
  '¡Birdie o birria, no hay de otra! 🍺',
  'Recuerden: el golf es un deporte de caballeros... hasta la última apuesta 🎩',
  'Si lo tuyo fue una "mala racha" llevas 18 hoyos de racha 🫠',
  '¡Que paguen los que más putts metieron! (los que más erraron) 🙈',
]

const C = {
  bg:      '#0F1A14',
  surface: '#1E3328',
  gold:    '#C9A84C',
  green:   '#2D6A4F',
  white:   '#FFFFFF',
  gray:    '#9CA3AF',
  win:     '#4ADE80',
  lose:    '#F87171',
}

const TYPE_META = {
  mano:      { emoji: '🤜', label: 'La Mano' },
  oyes:      { emoji: '📍', label: "O'yes" },
  medals:    { emoji: '🥇', label: 'Medals' },
  drives:    { emoji: '💨', label: 'Drives' },
  putts:     { emoji: '⛳', label: 'Putts' },
  units:     { emoji: '🏆', label: 'Unidades' },
  pinkies:   { emoji: '🤙', label: 'Pinkies' },
  penalties: { emoji: '💀', label: 'Penalidades' },
}

const TYPE_ORDER = ['mano', 'oyes', 'medals', 'drives', 'putts', 'units', 'pinkies', 'penalties']

// Layout constants for breakdown section
const BD = {
  hdrH:   50,  // player name row
  sepH:    8,  // gap after separator line
  typeH:  36,  // type title row
  evtH:   22,  // event row
  typeGap: 4,  // gap between consecutive types
  vPad:   12,  // bottom padding inside section
  pGap:   14,  // gap between player sections
  titleH: 32,  // "DESGLOSE POR APUESTA" label + margin
}

function rr(ctx, x, y, w, h, r = 16) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function wrapText(ctx, text, maxW) {
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function computePlayerBreakdown(playerIds, items) {
  const breakdown = {}
  for (const id of playerIds) breakdown[id] = {}
  for (const item of items) {
    const { type = 'other', from = [], to = [], amount, label } = item
    for (const pid of from) {
      if (!(pid in breakdown)) continue
      if (!breakdown[pid][type]) breakdown[pid][type] = { net: 0, events: [] }
      const share = amount / (from.length || 1)
      breakdown[pid][type].net -= share
      breakdown[pid][type].events.push({ label, amount: -share })
    }
    for (const pid of to) {
      if (!(pid in breakdown)) continue
      if (!breakdown[pid][type]) breakdown[pid][type] = { net: 0, events: [] }
      const share = amount / (to.length || 1)
      breakdown[pid][type].net += share
      breakdown[pid][type].events.push({ label, amount: share })
    }
  }
  return breakdown
}

function calcPlayerSectionH(types, breakdown, id) {
  let h = BD.hdrH + BD.sepH + BD.vPad
  for (let i = 0; i < types.length; i++) {
    h += BD.typeH + breakdown[id][types[i]].events.length * BD.evtH
    if (i < types.length - 1) h += BD.typeGap
  }
  return h
}

function calcBreakdownH(sorted, breakdown) {
  let h = BD.titleH
  let first = true
  for (const id of sorted) {
    const types = TYPE_ORDER.filter(t => breakdown[id][t])
    if (!types.length) continue
    if (!first) h += BD.pGap
    first = false
    h += calcPlayerSectionH(types, breakdown, id)
  }
  return h
}

export async function generateShareImage(round, players, settlement) {
  const { debts, ledger, items = [] } = settlement
  const playerIds = Object.keys(players)
  const fmtAbs = n => `$${Math.abs(Number(n || 0)).toLocaleString('es-MX')}`
  const fmtNet = n => {
    const v = Number(n || 0)
    return v > 0 ? `+${fmtAbs(v)}` : v < 0 ? `-${fmtAbs(v)}` : '$0'
  }

  const W = 800
  const PAD = 44
  const DPR = 2

  const sorted = [...playerIds].sort((a, b) => (ledger[b] || 0) - (ledger[a] || 0))
  const breakdown = computePlayerBreakdown(playerIds, items)

  const hasBkd   = items.length > 0
  const hasDebts = debts.length > 0

  // Compute total canvas height
  const headerH  = 180
  const balH     = 104 + sorted.length * 60
  const bkdH     = hasBkd ? (17 + calcBreakdownH(sorted, breakdown) + 24) : 0
  const debtH    = hasDebts ? (17 + 24 + debts.length * 52 + 16) : 0
  const footerH  = 100
  const TOTAL_H  = headerH + balH + bkdH + debtH + footerH + 32

  const canvas = document.createElement('canvas')
  canvas.width  = W * DPR
  canvas.height = TOTAL_H * DPR
  const ctx = canvas.getContext('2d')
  ctx.scale(DPR, DPR)

  // Background
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, TOTAL_H)
  ctx.strokeStyle = '#ffffff08'
  ctx.lineWidth = 1
  for (let i = -TOTAL_H; i < W + TOTAL_H; i += 28) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + TOTAL_H, TOTAL_H)
    ctx.stroke()
  }

  let y = 0

  // ── HEADER ────────────────────────────────────────────────────────────────
  ctx.fillStyle = C.gold
  ctx.fillRect(0, 0, W, 6)

  let logo = null
  try {
    logo = await new Promise((res, rej) => {
      const img = new Image()
      img.onload = () => res(img)
      img.onerror = rej
      img.src = '/hand-bet.png'
    })
  } catch {}

  y = 30
  const LOGO_SIZE = 80
  if (logo) {
    ctx.save()
    rr(ctx, PAD, y, LOGO_SIZE, LOGO_SIZE, 18)
    ctx.clip()
    ctx.drawImage(logo, PAD, y, LOGO_SIZE, LOGO_SIZE)
    ctx.restore()
  }

  const textX = logo ? PAD + LOGO_SIZE + 20 : PAD
  ctx.fillStyle = C.gold
  ctx.font = `900 44px "Inter", system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText('HAND BET', textX, y + 36)

  ctx.fillStyle = C.white
  ctx.font = `600 20px "Inter", system-ui, sans-serif`
  ctx.fillText(round.field?.name || 'Ronda de Golf', textX, y + 62)

  const date = round.createdAt
    ? new Date(round.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  ctx.fillStyle = C.gray
  ctx.font = `400 18px "Inter", system-ui, sans-serif`
  ctx.fillText(date, textX, y + 86)

  y = headerH - 20
  ctx.strokeStyle = C.green
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(W - PAD, y)
  ctx.stroke()

  // ── BALANCES ──────────────────────────────────────────────────────────────
  y = headerH + 8

  ctx.fillStyle = C.gold
  ctx.font = `700 14px "Inter", system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText('RESULTADOS FINALES', PAD, y)
  y += 24

  sorted.forEach((id, i) => {
    const bal = ledger[id] || 0
    const rowY = y + i * 60
    const isWinner = i === 0 && bal > 0
    const isLoser  = i === sorted.length - 1 && bal < 0

    if (isWinner) {
      ctx.fillStyle = '#C9A84C18'
      rr(ctx, PAD - 12, rowY - 2, W - PAD * 2 + 24, 58, 12)
      ctx.fill()
      ctx.strokeStyle = '#C9A84C55'
      ctx.lineWidth = 1.5
      rr(ctx, PAD - 12, rowY - 2, W - PAD * 2 + 24, 58, 12)
      ctx.stroke()
    }

    const medal = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : isLoser ? '💸' : '  '
    ctx.font = `28px "Inter", system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText(medal, PAD, rowY + 34)

    ctx.fillStyle = isWinner ? C.gold : C.white
    ctx.font = isWinner ? `800 26px "Inter", system-ui, sans-serif` : `500 24px "Inter", system-ui, sans-serif`
    ctx.fillText(players[id].name, PAD + 44, rowY + 34)

    ctx.fillStyle = C.gray
    ctx.font = `400 16px "Inter", system-ui, sans-serif`
    ctx.fillText(`HCP ${players[id].handicap}`, PAD + 44, rowY + 54)

    ctx.fillStyle = bal > 0 ? C.win : bal < 0 ? C.lose : C.gray
    ctx.font = `800 26px "Inter", system-ui, sans-serif`
    ctx.textAlign = 'right'
    ctx.fillText(fmtNet(bal), W - PAD, rowY + 34)
  })

  y += sorted.length * 60 + 24

  // ── BREAKDOWN PER PLAYER ──────────────────────────────────────────────────
  if (hasBkd) {
    ctx.strokeStyle = C.green
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD, y)
    ctx.lineTo(W - PAD, y)
    ctx.stroke()
    y += 17

    ctx.fillStyle = C.gold
    ctx.font = `700 14px "Inter", system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText('DESGLOSE POR APUESTA', PAD, y)
    y += BD.titleH

    let firstPlayer = true
    for (const id of sorted) {
      const types = TYPE_ORDER.filter(t => breakdown[id][t])
      if (!types.length) continue

      if (!firstPlayer) y += BD.pGap
      firstPlayer = false

      const bal = ledger[id] || 0
      const sectionH = calcPlayerSectionH(types, breakdown, id)

      // Section background
      ctx.fillStyle = C.surface
      rr(ctx, PAD - 12, y, W - PAD * 2 + 24, sectionH, 14)
      ctx.fill()

      // Darker header overlay (clipped to rounded rect)
      ctx.save()
      rr(ctx, PAD - 12, y, W - PAD * 2 + 24, sectionH, 14)
      ctx.clip()
      ctx.fillStyle = '#0A1410'
      ctx.fillRect(PAD - 12, y, W - PAD * 2 + 24, BD.hdrH)
      ctx.restore()

      // Player name (measure width before drawing HCP beside it)
      ctx.font = `700 20px "Inter", system-ui, sans-serif`
      const nameW = ctx.measureText(players[id].name).width
      ctx.fillStyle = C.white
      ctx.textAlign = 'left'
      ctx.fillText(players[id].name, PAD, y + 35)

      ctx.fillStyle = C.gray
      ctx.font = `400 13px "Inter", system-ui, sans-serif`
      ctx.fillText(`HCP ${players[id].handicap}`, PAD + nameW + 8, y + 35)

      ctx.fillStyle = bal > 0 ? C.win : bal < 0 ? C.lose : C.gray
      ctx.font = `800 20px "Inter", system-ui, sans-serif`
      ctx.textAlign = 'right'
      ctx.fillText(fmtNet(bal), W - PAD, y + 35)

      y += BD.hdrH

      // Gold separator
      ctx.strokeStyle = C.gold
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.moveTo(PAD, y + 2)
      ctx.lineTo(W - PAD, y + 2)
      ctx.stroke()
      ctx.globalAlpha = 1
      y += BD.sepH

      // Types and events
      for (let ti = 0; ti < types.length; ti++) {
        const type = types[ti]
        const typeData = breakdown[id][type]
        const meta = TYPE_META[type] || { emoji: '📌', label: type }
        const typeColor = typeData.net >= 0 ? C.win : C.lose

        ctx.fillStyle = C.gold
        ctx.font = `600 14px "Inter", system-ui, sans-serif`
        ctx.textAlign = 'left'
        ctx.fillText(`${meta.emoji} ${meta.label}`, PAD, y + 24)

        ctx.fillStyle = typeColor
        ctx.font = `700 14px "Inter", system-ui, sans-serif`
        ctx.textAlign = 'right'
        ctx.fillText(fmtNet(typeData.net), W - PAD, y + 24)
        y += BD.typeH

        for (const ev of typeData.events) {
          const maxLW = W - PAD * 2 - 90
          ctx.font = `400 12px "Inter", system-ui, sans-serif`
          let lt = `   · ${ev.label}`
          if (ctx.measureText(lt).width > maxLW) {
            while (ctx.measureText(lt + '…').width > maxLW && lt.length > 5) {
              lt = lt.slice(0, -1)
            }
            lt += '…'
          }
          ctx.fillStyle = '#6B7280'
          ctx.textAlign = 'left'
          ctx.fillText(lt, PAD, y + 16)

          ctx.fillStyle = ev.amount >= 0 ? C.win : C.lose
          ctx.font = `600 12px "Inter", system-ui, sans-serif`
          ctx.textAlign = 'right'
          ctx.fillText(fmtNet(ev.amount), W - PAD, y + 16)
          y += BD.evtH
        }

        if (ti < types.length - 1) y += BD.typeGap
      }

      y += BD.vPad
    }
    y += 24
  }

  // ── DEBTS ─────────────────────────────────────────────────────────────────
  if (hasDebts) {
    ctx.strokeStyle = C.green
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD, y)
    ctx.lineTo(W - PAD, y)
    ctx.stroke()
    y += 17

    ctx.fillStyle = C.gold
    ctx.font = `700 14px "Inter", system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText('¿QUIÉN LE PAGA A QUIÉN?', PAD, y)
    y += 24

    debts.forEach(d => {
      ctx.fillStyle = C.surface
      rr(ctx, PAD - 12, y - 4, W - PAD * 2 + 24, 46, 10)
      ctx.fill()

      ctx.fillStyle = C.lose
      ctx.font = `700 22px "Inter", system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText(d.fromName, PAD, y + 28)
      const fromW = ctx.measureText(d.fromName).width

      ctx.fillStyle = C.gray
      ctx.font = `400 22px "Inter", system-ui, sans-serif`
      ctx.fillText(' → ', PAD + fromW, y + 28)
      const arrowW = ctx.measureText(' → ').width

      ctx.fillStyle = C.win
      ctx.font = `700 22px "Inter", system-ui, sans-serif`
      ctx.fillText(d.toName, PAD + fromW + arrowW, y + 28)

      ctx.fillStyle = C.gold
      ctx.font = `800 24px "Inter", system-ui, sans-serif`
      ctx.textAlign = 'right'
      ctx.fillText(fmtAbs(d.amount), W - PAD, y + 28)

      y += 52
    })

    y += 16
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  ctx.strokeStyle = C.green
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(W - PAD, y)
  ctx.stroke()
  y += 24

  const phrase = FUNNY_PHRASES[Math.floor(Math.random() * FUNNY_PHRASES.length)]
  ctx.fillStyle = C.gray
  ctx.font = `italic 400 19px "Inter", system-ui, sans-serif`
  ctx.textAlign = 'center'
  const phraseLines = wrapText(ctx, phrase, W - PAD * 3)
  phraseLines.forEach((line, i) => ctx.fillText(line, W / 2, y + 22 + i * 28))

  ctx.fillStyle = C.gold
  ctx.fillRect(0, TOTAL_H - 5, W, 5)

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}
