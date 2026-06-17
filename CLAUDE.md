# Hand Bet — Contexto del Proyecto

## ¿Qué es?
App web móvil para llevar apuestas de golf entre amigos. El administrador de la ronda ingresa los scores hoyo a hoyo y la app calcula automáticamente quién le debe cuánto a quién al final.

## Stack
- **Frontend**: React + Vite, Tailwind CSS, desplegado en Vercel
- **Base de datos**: Firebase Realtime Database (sincronización en tiempo real entre jugadores)
- **Deploy**: `git push` al repo `nicolasaltamirano025-ux/hand-bet` en GitHub → Vercel despliega automáticamente en ~1 min
- **URL producción**: https://hand-bet-navy.vercel.app

## Colores y diseño
```
bg:      #0F1A14  (fondo oscuro verde)
surface: #1E3328  (tarjetas)
gold:    #C9A84C  (acento dorado)
border:  bordes sutiles
```
La app es mobile-first. Siempre verificar que los elementos no queden detrás de la barra de estado del iPhone (`env(safe-area-inset-top/bottom)`).

---

## Tipos de apuestas

### 🤜 La Mano
- Por hoyo. El jugador con el menor score NETO gana el hoyo y cobra a todos.
- Si hay empate → la mano se "abre" y los hoyos se acumulan hasta que alguien gane sin empate.
- **Ventajas (handicap)**: aplica a La Mano y Medals. El jugador con menor HCP del grupo juega de referencia (0 ventajas), los demás reciben `(su HCP − minHCP)` strokes en los hoyos más difíciles según el SI.

### 📍 O'yes
- Solo en par 3. El jugador que llegue al green en el 1er tiro y haga par o menos gana el O'yes.
- Si nadie lo logra → se acumula al siguiente par 3.
- Si un jugador gana todos los O'yes de la ronda → "El Zapato" (cobra doble).

### 🥇 Medals (stroke play neto)
- Menor score neto acumulado del Front 9, Back 9 y/o Total gana.
- Se calculan al final de la ronda.
- Usa el mismo sistema de ventajas que La Mano.

### 💨 Drive
- Par 4 y par 5. Solo UN jugador puede ganar el drive por hoyo (exclusivo).
- Si nadie gana → se acumula al siguiente hoyo.

### ⛳ Putts
- Individual: cada jugador paga `(sus putts − mínimo del grupo) × valor por putt` al jugador con menos putts.
- 0 putts sin chip de Hole-out = error (app avisa).

### 🏆 Unidades
- Premios especiales: Birdie, Eagle, Albatros, Hoyo en uno, Sandy par, Hole-out.
- Se detectan automáticamente según el score y los chips marcados.

---

## Sistema de handicap
```js
// El jugador con menor HCP del grupo = referencia (0 ventajas)
// Los demás reciben: strokesOnHole(player.handicap - minHCP, holeSI)
// Aplica SOLO a: La Mano y Medals
// NO aplica a: O'yes (par bruto), Drives, Putts

// Ejemplo: grupo con HCP 5, 10, 15
// minHCP = 5
// HCP 10 → 5 ventajas en SI 1-5
// HCP 15 → 10 ventajas en SI 1-10
```
Archivos relevantes: `src/utils/handicap.js`, `src/utils/gameLogic.js`

---

## Archivos clave

| Archivo | Qué hace |
|---------|----------|
| `src/screens/GameScreen.jsx` | Pantalla principal de juego — ingreso de scores hoyo a hoyo |
| `src/screens/BetsScreen.jsx` | Estado de todas las apuestas en tiempo real |
| `src/screens/FinalScreen.jsx` | Resultado final + botón de compartir imagen |
| `src/screens/ScorecardScreen.jsx` | Scorecard completo de todos los jugadores |
| `src/screens/CreateRound/` | Flujo de creación de ronda (5 pasos) |
| `src/utils/handicap.js` | Cálculo de ventajas entre jugadores |
| `src/utils/gameLogic.js` | Lógica de La Mano, O'yes, Medals, Unidades |
| `src/utils/settlement.js` | Cálculo de quién le debe cuánto a quién |
| `src/utils/shareImage.js` | Genera imagen PNG para compartir resultados (Canvas API) |
| `src/data/courses.js` | Lista de campos de golf con par y SI por hoyo |
| `src/firebase/roundsService.js` | Funciones de lectura/escritura a Firebase |
| `src/hooks/useRound.js` | Hook para suscribirse a datos de Firebase en tiempo real |

---

## Campos de golf (courses.js)
El primer campo siempre es **El Campanario** (el más usado).
- Tiene dos sets de SI: `si` (saliendo del hoyo 1) y `si10` (saliendo del hoyo 10).
- El usuario selecciona el hoyo de salida en el Paso 1 de creación de ronda.
- Otros campos: Campestre Querétaro, Juriquilla, Balvanera, Ventanas de San Miguel, Marina Vallarta, Tequisquiapan.

---

## Flujo de creación de ronda
1. **Step1Field** — Seleccionar campo + hoyo de salida (H1 o H10)
2. **Step2RoundType** — 18 hoyos / Front 9 / Back 9
3. **Step3Players** — Nombres y handicaps de los jugadores
4. **Step4Bets** — Activar/configurar cada tipo de apuesta y sus valores
5. **Step5Review** — Resumen y confirmar

---

## Comportamientos importantes en GameScreen
- El botón `+` de score: primera vez que se toca → pone par (no par+1)
- El botón `-`: primera vez → pone par-1
- **Drive**: exclusivo — solo un jugador puede tenerlo marcado por hoyo
- **Auto-putts**: en par 3, si se marca "En green 1er tiro" y score ≥ par → putts = score − 1 automáticamente
- **Guardar**: al presionar "Siguiente →", avisa si falta score de algún jugador o si hay 0 putts sin Hole-out
- **Re-guardar**: se puede guardar el mismo hoyo varias veces sin duplicar eventos (los eventos del hoyo se filtran y recalculan)

---

## Estructura de datos en Firebase
```
rounds/
  {code}/
    players/
      p1: { name, handicap, isCreator }
      p2: { name, handicap }
    holes/
      1/
        n: 1, par: 4, si: 5, playOrder: 1
        scores/
          p1: { gross, putts, driveWinner, onGreenFirstShot, inBunker, chipIn }
        reviews/
          {pushKey}: { status, authorId, authorName, text, ts, resolution }
    bets/
      mano:   { enabled, valuePerHole }
      oyes:   { enabled, value }
      medals: { enabled, frontValue, backValue, totalValue }
      drives: { enabled, value }
      putts:  { enabled, valuePerPutt }
      units:  { enabled, baseValue, birdie, eagle, ... }
    manoState:  { holderId, isOpen, accumulated }
    manoEvents: [ { type, winnerId, holeNum, units } ]
    oyesState:  { accumulated, wonSequentially, zapatoTriggered }
    oyesEvents: [ { type, winners, holeNum, units, wasAccumulated } ]
    driveEvents: [ { type, winnerId, holeNum, totalValue } ]
    unitsEvents: [ { holeNum, playerId, units[] } ]
```

---

## Cómo hacer deploy
```bash
git add .
git commit -m "descripción del cambio"
git push
# Vercel despliega automáticamente en ~1 minuto
```

## Variables de entorno (Firebase)
Están en `.env` (no se sube a GitHub por seguridad). En Vercel ya están configuradas como Environment Variables del proyecto. Si se necesita trabajar localmente, el archivo `.env` existe en la carpeta del proyecto en la PC de Nicolás (`C:\Users\Nicolas\hand-bet\.env`).
