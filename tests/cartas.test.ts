import { describe, expect, it } from 'vitest'
import { cartas, orden, todas, TEMAS } from '../src/data/cartas'
import { brujula, CUPO, EJES, esExtrema, mideBrujula, MINIMO_EJE, RONDA, sortear } from '../src/engine/juego'
import type { Carta, NombreEje } from '../src/types'
import fotos from '../src/data/fotos.json'
import guardado from './orden-cartas.json'

describe('banco de cartas', () => {
  it('ids y preguntas únicos', () => {
    expect(new Set(orden).size).toBe(orden.length)
    const activas = todas.filter((c) => !c.retirada).map((c) => c.pregunta.trim().toLowerCase())
    expect(new Set(activas).size).toBe(activas.length)
  })

  it('los grupos de parecidas tienen al menos dos cartas y ninguna activa comparte grupo con una núcleo', () => {
    const activas = todas.filter((c) => !c.retirada)
    const porGrupo = new Map<string, number>()
    for (const c of activas) for (const g of c.grupos ?? []) porGrupo.set(g, (porGrupo.get(g) ?? 0) + 1)
    const deNucleo = new Set(activas.filter((c) => c.nucleo).flatMap((c) => c.grupos ?? []))
    for (const c of activas) if (!c.nucleo) for (const g of c.grupos ?? []) expect(deNucleo.has(g), c.id).toBe(false)
    for (const [g, n] of porGrupo) if (!deNucleo.has(g)) expect(n, g).toBeGreaterThanOrEqual(2)
  })

  it('una ronda real sale completa, sin parecidas', () => {
    for (let s = 0; s < 200; s++) {
      const r = sortear(cartas, s)
      expect(r).toHaveLength(RONDA)
      const grupos = r.flatMap((c) => c.grupos ?? [])
      expect(new Set(grupos).size).toBe(grupos.length)
    }
  })

  it('los ejes de la brújula son ±1 o ±0,5 y la aprobación del gobierno no cuenta', () => {
    for (const c of todas) {
      for (const [k, v] of Object.entries(c.eje ?? {})) {
        expect(EJES, c.id).toContain(k)
        expect([1, -1, 0.5, -0.5], c.id).toContain(v)
      }
    }
    expect(todas.find((c) => c.id.startsWith('aprobas-la-gestion'))?.eje).toBeUndefined()
  })

  it('cada ronda real trae el cupo de cada escala y deja lugar para las otras cartas', () => {
    for (let s = 0; s < 200; s++) {
      const r = sortear(cartas, s)
      for (const e of EJES) expect(r.filter((c) => c.eje?.[e]).length, `${e}, semilla ${s}`).toBeGreaterThanOrEqual(CUPO[e])
      const ideologicas = r.filter(mideBrujula).length
      expect(ideologicas).toBeLessThanOrEqual(19)
      expect(RONDA - ideologicas).toBeGreaterThanOrEqual(6)
      for (const e of EJES) expect(r.filter((c) => esExtrema(c) && c.eje?.[e]).length).toBeLessThanOrEqual(1)
      const b = brujula(r.map((carta) => ({ carta, eleccion: 'a' as const })))
      expect(b).not.toBeNull()
    }
  })

  it('alguien bien conservador queda arriba aunque le toquen varias afirmaciones extremas', () => {
    // Rechaza lo que rechaza casi todo el país (incluidos muchos conservadores), pero elige el lado
    // tradicional en aborto y en que el matrimonio sea solo entre un hombre y una mujer.
    const de = (inicio: string) => cartas.find((c) => c.pregunta.startsWith(inicio))!
    const r = [
      { carta: de('Tiene que haber acceso al aborto'), eleccion: 'b' as const },
      { carta: de('El matrimonio debería ser solo entre'), eleccion: 'a' as const },
      { carta: de('En las decisiones importantes del hogar'), eleccion: 'b' as const },
      { carta: de('Cuando falta trabajo'), eleccion: 'b' as const },
      { carta: de('No me gustaría tener inmigrantes'), eleccion: 'b' as const },
      { carta: de('«El cambio climático'), eleccion: 'b' as const },
      ...cartas.filter((c) => c.eje?.economia).slice(0, 3).map((carta) => ({ carta, eleccion: 'a' as const })),
    ]
    expect(brujula(r)!.vos.valores).toBeGreaterThan(0.3)
  })

  describe('perfiles marcados quedan lejos del centro en una sola ronda', () => {
    type Signo = Record<NombreEje, 1 | -1>
    /** Elige el lado de su signo en la escala de más peso de cada carta, salvo las excepciones. */
    const jugar = (signo: Signo, excepciones: Record<string, 'a' | 'b'>) => (carta: Carta) => {
      if (excepciones[carta.id]) return excepciones[carta.id]
      if (!carta.eje) return carta.ref.a > carta.ref.b ? 'a' : 'b'
      const [e, w] = Object.entries(carta.eje).sort(([, x], [, y]) => Math.abs(y) - Math.abs(x))[0]
      return w * signo[e as NombreEje] > 0 ? 'a' : 'b'
    }
    const mediana = (signo: Signo, excepciones: Record<string, 'a' | 'b'>) => {
      const elegir = jugar(signo, excepciones)
      const pos = Array.from({ length: 200 }, (_, s) =>
        brujula(sortear(cartas, s).map((carta) => ({ carta, eleccion: elegir(carta) })))!.vos,
      )
      return (e: NombreEje) => pos.map((p) => p[e]).sort((a, b) => a - b)[100]
    }

    it('pro mercado y tradicional, aunque sea nacionalista en algunas cartas', () => {
      // Defiende la industria nacional, los recursos y las áreas estratégicas, la ayuda a los pobres
      // y la obra pública, prefiere salarios a precios y no privatizaría YPF: sigue siendo más mercado.
      const m = mediana(
        { economia: 1, valores: 1, autoridad: 1 },
        {
          'es-mas-importante-proteger-la-produccion': 'a',
          'los-recursos-naturales-estrategicos-liti': 'a',
          'el-estado-tiene-que-ser-dueno-de-algunas': 'a',
          'como-deberia-abrirse-la-economia-argenti': 'b',
          'que-deberia-priorizar-la-economia': 'a',
          'la-ayuda-del-estado-a-los-sectores-mas-p': 'a',
          'la-obra-publica-es-una-inversion-no-un-g': 'a',
          'hay-que-privatizar-ypf': 'b',
          'hay-que-permitir-jornadas-laborales-de-1': 'b',
        },
      )
      expect(m('economia')).toBeGreaterThan(0.7)
      expect(m('valores')).toBeGreaterThan(0.8)
    })

    it('más Estado y progresista, aunque valore el esfuerzo y el empleo privado', () => {
      const m = mediana(
        { economia: -1, valores: -1, autoridad: -1 },
        {
          'una-sociedad-justa-es-aquella-en-la-que': 'a',
          'que-es-mejor-para-un-pais-que-el-empleo': 'a',
          'la-argentina-necesita-una-reforma-labora': 'a',
          'que-deberia-priorizar-la-economia': 'b',
        },
      )
      // Contradice la carta núcleo de empleo (sale siempre) y la del esfuerzo: queda más cerca.
      expect(m('economia')).toBeLessThan(-0.35)
      expect(m('valores')).toBeLessThan(-0.8)
    })

    it('siempre del mismo lado se acerca al borde sin saturar', () => {
      const m = mediana({ economia: 1, valores: -1, autoridad: 1 }, {})
      expect(m('economia')).toBeGreaterThan(0.9)
      expect(m('economia')).toBeLessThan(1)
      expect(m('valores')).toBeLessThan(-0.85)
    })
  })

  it('las cartas de consenso no cuentan para la brújula, salvo las afirmaciones extremas', () => {
    // Con 78% o más de un lado casi no distinguen posiciones; las extremas (menos del 25% de acuerdo)
    // se quedan porque sirven para los bordes y salen como mucho una por escala.
    for (const c of cartas.filter((x) => x.eje?.economia || x.eje?.valores)) {
      const p = (100 * c.ref.a) / (c.ref.a + c.ref.b)
      if (Math.max(p, 100 - p) >= 78) expect(esExtrema(c), c.id).toBe(true)
    }
  })

  it('cada ronda trae respuestas de autoridad suficientes para mostrar la barra', () => {
    for (let s = 0; s < 200; s++) {
      const r = sortear(cartas, s).map((carta) => ({ carta, eleccion: 'a' as const }))
      expect(brujula(r)!.cartas.autoridad, `semilla ${s}`).toBeGreaterThanOrEqual(MINIMO_EJE)
    }
  })

  it('las cartas que no miden ideología salen parejo, sin importar el tema', () => {
    // Antes se llenaba por turnos de tema: las dos de historia salían en casi todas las rondas.
    const veces = new Map<string, number>()
    const n = 2000
    for (let s = 0; s < n; s++) for (const c of sortear(cartas, s)) veces.set(c.id, (veces.get(c.id) ?? 0) + 1)
    for (const c of cartas.filter((x) => !x.nucleo && !mideBrujula(x))) {
      expect((veces.get(c.id) ?? 0) / n, c.id).toBeLessThan(0.2)
    }
  })

  it('contestar "de acuerdo" a todo no corre los valores hacia un lado', () => {
    // Las afirmaciones de cada ronda se equilibran entre las que se aceptan del lado progresista y
    // las que se aceptan del lado tradicional.
    const n = 500
    let suma = 0
    for (let s = 0; s < n; s++) {
      const r = sortear(cartas, s).map((carta) => ({
        carta,
        eleccion: carta.tipo === 'afirmacion' ? ('a' as const) : s % 2 ? ('a' as const) : ('b' as const),
      }))
      suma += brujula(r)!.vos.valores
    }
    expect(Math.abs(suma / n)).toBeLessThan(0.25)
  })

  it('las cartas sobre medidas de un gobierno son de 2025 en adelante y lo nombran', () => {
    for (const c of cartas) {
      if (!/gobierno/i.test(c.pregunta) || c.nucleo) continue
      if (/impulsa|medida|reforma/i.test(c.pregunta)) {
        expect(c.ref.fecha >= '2025-01', c.id).toBe(true)
        expect(c.pregunta, c.id).toMatch(/gobierno de \w+/)
      }
    }
  })

  it('hay entre 4 y 5 cartas núcleo, nacionales', () => {
    const nucleo = todas.filter((c) => c.nucleo && !c.retirada)
    expect(nucleo.length).toBeGreaterThanOrEqual(4)
    expect(nucleo.length).toBeLessThanOrEqual(5)
    for (const c of nucleo) expect(c.ref.alcance).toBe('nacional')
  })

  it('nacionales, o regionales amplias con al menos 500 casos informados', () => {
    for (const c of todas.filter((x) => !x.retirada)) {
      if (/^nacional/.test(c.ref.alcance)) continue
      const m = (c.ref.muestra ?? '').match(/(\d{1,3}(?:\.\d{3})*|\d+)\s*casos/)
      const casos = m ? Number(m[1].replace(/\./g, '')) : 0
      expect(casos, `${c.id}: ${c.ref.alcance} sin muestra suficiente`).toBeGreaterThanOrEqual(500)
    }
  })

  it('el orden solo crece al final (las partidas guardadas dependen de él)', () => {
    expect(orden.slice(0, guardado.length)).toEqual(guardado)
  })

  it.each(todas.map((c) => [c.id, c] as const))('%s: texto, tema y encuesta válidos', (_, c) => {
    expect(c.pregunta.length).toBeGreaterThan(5)
    expect(c.pregunta.length).toBeLessThanOrEqual(140)
    expect(c.a.texto.length).toBeLessThanOrEqual(32)
    expect(c.b.texto.length).toBeLessThanOrEqual(32)
    expect(TEMAS.map((t) => t.id)).toContain(c.tema)
    expect(['duelo', 'afirmacion']).toContain(c.tipo)
    const r = c.ref
    expect(r.a).toBeGreaterThan(0)
    expect(r.b).toBeGreaterThan(0)
    expect(r.a + r.b).toBeGreaterThanOrEqual(60)
    expect(Math.abs(r.a + r.b + r.resto - 100)).toBeLessThanOrEqual(1.5)
    expect(r.url).toMatch(/^https:\/\//)
    expect(r.fecha).toMatch(/^\d{4}(-\d{2})?$/)
    expect(r.encuestadora.length).toBeGreaterThan(1)
    for (const op of [c.a, c.b]) if (op.foto) expect(Object.keys(fotos.fotos)).toContain(op.foto)
  })
})
