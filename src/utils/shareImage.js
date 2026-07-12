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

export async function generateShareImage(round, players, settlement) {
  const { debts, ledger } = settlement
  const playerIds = Object.keys(players)
  const fmtAbs = n => `$${Math.abs(Number(n || 0)).toLocaleString('es-MX')}`

  const W = 800
  const PAD = 44
  const DPR = 2 // Always render at 2x for sharpness

  // --- MEASURE PASS: figure out how tall the canvas needs to be ---
  const playerRowH = 60
  const debtRowH   = 52
  const headerH    = 180
  const balSection = 80 + playerIds.length * playerRowH + 24
  const debtSection = debts.length > 0 ? 70 + debts.length * debtRowH + 16 : 0
  const footerH    = 100
  const TOTAL_H    = headerH + balSection + debtSection + footerH + 32

  const canvas = document.createElement('canvas')
  canvas.width  = W * DPR
  canvas.height = TOTAL_H * DPR
  const ctx = canvas.getContext('2d')
  ctx.scale(DPR, DPR)

  // ── BACKGROUND ─────────────────────────────────────────────────────────────
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, TOTAL_H)

  // Subtle diagonal stripe pattern for texture
  ctx.strokeStyle = '#ffffff08'
  ctx.lineWidth = 1
  for (let i = -TOTAL_H; i < W + TOTAL_H; i += 28) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + TOTAL_H, TOTAL_H)
    ctx.stroke()
  }

  let y = 0

  // ── HEADER ─────────────────────────────────────────────────────────────────
  // Gold top bar
  ctx.fillStyle = C.gold
  ctx.fillRect(0, 0, W, 6)

  // Load logo (best-effort)
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
  const logoX = PAD
  const logoY = y

  if (logo) {
    // Rounded logo
    ctx.save()
    rr(ctx, logoX, logoY, LOGO_SIZE, LOGO_SIZE, 18)
    ctx.clip()
    ctx.drawImage(logo, logoX, logoY, LOGO_SIZE, LOGO_SIZE)
    ctx.restore()
  }

  const textX = logo ? PAD + LOGO_SIZE + 20 : PAD

  ctx.fillStyle = C.gold
  ctx.font = `900 44px "Inter", system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText('HAND BET', textX, y + 36)

  ctx.fillStyle = C.white
  ctx.font = `600 20px "Inter", system-ui, sans-serif`
  const fieldName = round.field?.name || 'Ronda de Golf'
  ctx.fillText(fieldName, textX, y + 62)

  const date = round.createdAt
    ? new Date(round.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  ctx.fillStyle = C.gray
  ctx.font = `400 18px "Inter", system-ui, sans-serif`
  ctx.fillText(date, textX, y + 86)

  // Divider
  y = headerH - 20
  ctx.strokeStyle = C.green
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(W - PAD, y)
  ctx.stroke()

  // ── BALANCES ────────────────────────────────────────────────────────────────
  y = headerH + 8

  ctx.fillStyle = C.gold
  ctx.font = `700 14px "Inter", system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText('RESULTADOS FINALES', PAD, y)
  y += 24

  // Sort players: winners first
  const sorted = [...playerIds].sort((a, b) => (ledger[b] || 0) - (ledger[a] || 0))

  sorted.forEach((id, i) => {
    const bal = ledger[id] || 0
    const rowY = y + i * playerRowH
    const isWinner = i === 0 && bal > 0
    const isLoser  = i === sorted.length - 1 && bal < 0

    // Row highlight — vertically centered around the name + HCP text block
    if (isWinner) {
      ctx.fillStyle = '#C9A84C18'
      rr(ctx, PAD - 12, rowY - 2, W - PAD * 2 + 24, playerRowH - 2, 12)
      ctx.fill()
      // Gold border
      ctx.strokeStyle = '#C9A84C55'
      ctx.lineWidth = 1.5
      rr(ctx, PAD - 12, rowY - 2, W - PAD * 2 + 24, playerRowH - 2, 12)
      ctx.stroke()
    }

    // Medal / icon
    const medal = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : isLoser ? '💸' : '  '
    ctx.font = `28px "Inter", system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText(medal, PAD, rowY + 34)

    // Name
    ctx.fillStyle = isWinner ? C.gold : C.white
    ctx.font = isWinner ? `800 26px "Inter", system-ui, sans-serif` : `500 24px "Inter", system-ui, sans-serif`
    ctx.fillText(players[id].name, PAD + 44, rowY + 34)

    // HCP tag
    ctx.fillStyle = C.gray
    ctx.font = `400 16px "Inter", system-ui, sans-serif`
    ctx.fillText(`HCP ${players[id].handicap}`, PAD + 44, rowY + 54)

    // Balance
    ctx.fillStyle = bal > 0 ? C.win : bal < 0 ? C.lose : C.gray
    ctx.font = `800 26px "Inter", system-ui, sans-serif`
    ctx.textAlign = 'right'
    const balStr = bal > 0 ? `+${fmtAbs(bal)}` : bal < 0 ? `-${fmtAbs(bal)}` : '$0'
    ctx.fillText(balStr, W - PAD, rowY + 34)
  })

  y += sorted.length * playerRowH + 24

  // ── DEBTS ──────────────────────────────────────────────────────────────────
  if (debts.length > 0) {
    ctx.strokeStyle = C.green
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD, y)
    ctx.lineTo(W - PAD, y)
    ctx.stroke()
    y += 16

    ctx.fillStyle = C.gold
    ctx.font = `700 14px "Inter", system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText('¿QUIÉN LE PAGA A QUIÉN?', PAD, y)
    y += 24

    debts.forEach(d => {
      // Row bg
      ctx.fillStyle = C.surface
      rr(ctx, PAD - 12, y - 4, W - PAD * 2 + 24, debtRowH - 6, 10)
      ctx.fill()

      // From (red)
      ctx.fillStyle = C.lose
      ctx.font = `700 22px "Inter", system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText(d.fromName, PAD, y + 28)
      const fromW = ctx.measureText(d.fromName).width

      // Arrow
      ctx.fillStyle = C.gray
      ctx.font = `400 22px "Inter", system-ui, sans-serif`
      ctx.fillText(' → ', PAD + fromW, y + 28)
      const arrowW = ctx.measureText(' → ').width

      // To (green)
      ctx.fillStyle = C.win
      ctx.font = `700 22px "Inter", system-ui, sans-serif`
      ctx.fillText(d.toName, PAD + fromW + arrowW, y + 28)

      // Amount (gold, right)
      ctx.fillStyle = C.gold
      ctx.font = `800 24px "Inter", system-ui, sans-serif`
      ctx.textAlign = 'right'
      ctx.fillText(fmtAbs(d.amount), W - PAD, y + 28)

      y += debtRowH
    })

    y += 16
  }

  // ── FOOTER ─────────────────────────────────────────────────────────────────
  // Divider
  ctx.strokeStyle = C.green
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(W - PAD, y)
  ctx.stroke()
  y += 24

  // Funny phrase
  const phrase = FUNNY_PHRASES[Math.floor(Math.random() * FUNNY_PHRASES.length)]
  ctx.fillStyle = C.gray
  ctx.font = `italic 400 19px "Inter", system-ui, sans-serif`
  ctx.textAlign = 'center'
  const phraseLines = wrapText(ctx, phrase, W - PAD * 3)
  phraseLines.forEach((line, i) => ctx.fillText(line, W / 2, y + 22 + i * 28))
  y += 22 + phraseLines.length * 28 + 12

  // Gold bottom bar
  ctx.fillStyle = C.gold
  ctx.fillRect(0, TOTAL_H - 5, W, 5)

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}
