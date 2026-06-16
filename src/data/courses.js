// Datos reales de scorecards físicos y 18Birdies (junio 2026).
// si = SI jugando desde hoyo 1. si10 = SI jugando desde hoyo 10 (solo campos que difieren).

export const COURSES = [
  {
    id: 'campanario',
    name: 'El Campanario Residencial & Golf',
    city: 'Querétaro',
    // SI verificado con scorecard físico. Cambia según hoyo de salida.
    holes: [
      { n:1,  par:5, si:5,  si10:1  }, { n:2,  par:4, si:1,  si10:7  }, { n:3,  par:3, si:9,  si10:17 },
      { n:4,  par:4, si:11, si10:15 }, { n:5,  par:3, si:13, si10:5  }, { n:6,  par:4, si:15, si10:9  },
      { n:7,  par:5, si:7,  si10:3  }, { n:8,  par:4, si:17, si10:11 }, { n:9,  par:4, si:3,  si10:13 },
      { n:10, par:4, si:2,  si10:6  }, { n:11, par:4, si:8,  si10:2  }, { n:12, par:3, si:18, si10:10 },
      { n:13, par:4, si:16, si10:12 }, { n:14, par:4, si:6,  si10:14 }, { n:15, par:3, si:10, si10:16 },
      { n:16, par:5, si:4,  si10:8  }, { n:17, par:4, si:12, si10:18 }, { n:18, par:5, si:14, si10:4  },
    ],
  },
  {
    id: 'campestre-queretaro',
    name: 'Club Campestre de Querétaro',
    city: 'Querétaro',
    holes: [
      { n:1,  par:4, si:13 }, { n:2,  par:4, si:3  }, { n:3,  par:3, si:15 },
      { n:4,  par:5, si:7  }, { n:5,  par:4, si:1  }, { n:6,  par:4, si:5  },
      { n:7,  par:4, si:11 }, { n:8,  par:3, si:17 }, { n:9,  par:5, si:9  },
      { n:10, par:4, si:10 }, { n:11, par:5, si:8  }, { n:12, par:3, si:18 },
      { n:13, par:4, si:6  }, { n:14, par:5, si:14 }, { n:15, par:4, si:12 },
      { n:16, par:4, si:2  }, { n:17, par:3, si:16 }, { n:18, par:4, si:4  },
    ],
  },
  {
    id: 'juriquilla',
    name: 'Club de Golf Provincia Juriquilla',
    city: 'Querétaro',
    holes: [
      { n:1,  par:5, si:9  }, { n:2,  par:4, si:1  }, { n:3,  par:4, si:5  },
      { n:4,  par:4, si:13 }, { n:5,  par:3, si:15 }, { n:6,  par:5, si:3  },
      { n:7,  par:3, si:11 }, { n:8,  par:5, si:7  }, { n:9,  par:3, si:17 },
      { n:10, par:4, si:2  }, { n:11, par:5, si:12 }, { n:12, par:3, si:10 },
      { n:13, par:5, si:8  }, { n:14, par:4, si:4  }, { n:15, par:4, si:6  },
      { n:16, par:4, si:16 }, { n:17, par:3, si:14 }, { n:18, par:4, si:18 },
    ],
  },
  {
    id: 'balvanera',
    name: 'Balvanera Polo & Country Club',
    city: 'Querétaro',
    // Nota: 18Birdies muestra SI 5 en hoyos 5 y 9 — verificar in-situ.
    holes: [
      { n:1,  par:5, si:11 }, { n:2,  par:4, si:3  }, { n:3,  par:3, si:17 },
      { n:4,  par:4, si:1  }, { n:5,  par:4, si:5  }, { n:6,  par:3, si:15 },
      { n:7,  par:5, si:9  }, { n:8,  par:4, si:13 }, { n:9,  par:4, si:7  },
      { n:10, par:5, si:6  }, { n:11, par:4, si:4  }, { n:12, par:3, si:16 },
      { n:13, par:4, si:14 }, { n:14, par:5, si:8  }, { n:15, par:3, si:18 },
      { n:16, par:4, si:2  }, { n:17, par:4, si:12 }, { n:18, par:4, si:10 },
    ],
  },
  {
    id: 'san-miguel',
    name: 'Ventanas de San Miguel',
    city: 'San Miguel de Allende',
    holes: [
      { n:1,  par:5, si:15 }, { n:2,  par:4, si:3  }, { n:3,  par:3, si:11 },
      { n:4,  par:4, si:5  }, { n:5,  par:3, si:13 }, { n:6,  par:5, si:1  },
      { n:7,  par:4, si:7  }, { n:8,  par:4, si:9  }, { n:9,  par:3, si:17 },
      { n:10, par:4, si:14 }, { n:11, par:4, si:8  }, { n:12, par:3, si:18 },
      { n:13, par:4, si:6  }, { n:14, par:5, si:4  }, { n:15, par:4, si:16 },
      { n:16, par:4, si:12 }, { n:17, par:3, si:10 }, { n:18, par:4, si:2  },
    ],
  },
  {
    id: 'puerto-vallarta',
    name: 'Marina Vallarta Club de Golf',
    city: 'Puerto Vallarta',
    holes: [
      { n:1,  par:5, si:1  }, { n:2,  par:4, si:5  }, { n:3,  par:4, si:3  },
      { n:4,  par:3, si:9  }, { n:5,  par:5, si:15 }, { n:6,  par:3, si:17 },
      { n:7,  par:4, si:13 }, { n:8,  par:4, si:11 }, { n:9,  par:4, si:7  },
      { n:10, par:5, si:10 }, { n:11, par:4, si:12 }, { n:12, par:5, si:6  },
      { n:13, par:3, si:14 }, { n:14, par:4, si:4  }, { n:15, par:3, si:16 },
      { n:16, par:4, si:2  }, { n:17, par:3, si:18 }, { n:18, par:4, si:8  },
    ],
  },
  {
    id: 'tequisquiapan',
    name: 'Club de Golf de Tequisquiapan',
    city: 'Tequisquiapan',
    holes: [
      { n:1,  par:5, si:1  }, { n:2,  par:3, si:15 }, { n:3,  par:4, si:13 },
      { n:4,  par:4, si:3  }, { n:5,  par:4, si:11 }, { n:6,  par:3, si:17 },
      { n:7,  par:4, si:9  }, { n:8,  par:5, si:5  }, { n:9,  par:4, si:7  },
      { n:10, par:5, si:8  }, { n:11, par:4, si:10 }, { n:12, par:3, si:16 },
      { n:13, par:4, si:6  }, { n:14, par:4, si:14 }, { n:15, par:5, si:2  },
      { n:16, par:4, si:12 }, { n:17, par:3, si:18 }, { n:18, par:4, si:4  },
    ],
  },
]

export const MANUAL_COURSE_TEMPLATE = {
  id: 'manual',
  name: '',
  city: '',
  holes: Array.from({ length: 18 }, (_, i) => ({ n: i + 1, par: 4, si: i + 1 })),
}

export function getHolesForRoundType(holes, roundType) {
  if (roundType === 'front9') return holes.filter(h => h.n <= 9)
  if (roundType === 'back9')  return holes.filter(h => h.n >= 10)
  return holes
}
