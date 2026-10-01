import { describe, expect, it } from 'vitest'
import {
  brujula,
  cuadrante,
  enPalabras,
  lugar,
  mayoria,
  perfil,
  random,
  real,
  resumir,
  RONDA,
  sortear,
  temaDistinto,
} from '../src/engine/juego'
import type { Carta, Eje, Eleccion, Tema } from '../src/types'
import { carta } from './fixture'

describe('real y mayoría', () => {
  it('reparte entre A y B dejando afuera el resto', () => {
    expect(real(carta('x', 45, 15))).toBeCloseTo(75)
  })
  it('dentro del margen de error la carta es pareja', () => {
    expect(mayoria(carta('x', 50, 48))).toBe('parejo')
    expect(mayoria(carta('x', 54, 46))).toBe('a')
    expect(mayoria(carta('x', 30, 60))).toBe('b')
  })
  it('ubica tu elección', () => {
    const c = carta('x', 70, 30)
    expect(lugar(c, { carta: 'x', eleccion: 'a' })).toBe('mayoria')
    expect(lugar(c, { carta: 'x', eleccion: 'b' })).toBe('minoria')
    expect(lugar(c, { carta: 'x', eleccion: 'nada' })).toBe('nada')
  })
})

describe('sortear', () => {
  const temas: Tema[] = ['politica', 'economia', 'cultura']
  const banco = Array.from({ length: 40 }, (_, i) => carta(`c${i}`, 50, 50, temas[i % 3]))

  it('no repite cartas y respeta el tamaño de la ronda', () => {
    const r = sortear(banco, 7)
    expect(r).toHaveLength(RONDA)
    expect(new Set(r.map((c) => c.id)).size).toBe(RONDA)
  })

  it('prioriza las cartas no vistas de cada tema', () => {
    // 16 sin ver (menos que una ronda): tienen que salir todas.
    const vistas = new Set(banco.slice(0, 24).map((c) => c.id))
    const r = sortear(banco, 3, vistas)
    expect(r.filter((c) => !vistas.has(c.id))).toHaveLength(16)
  })

  it('con temas elegidos, todas las cartas son de esos temas, núcleo incluidas', () => {
    const conNucleo = [...banco, { ...carta('n1', 50, 50, 'historia'), nucleo: true }, { ...carta('n2', 50, 50, 'cultura'), nucleo: true }]
    for (let s = 0; s < 20; s++) {
      const r = sortear(conNucleo, s, new Set(), new Set<Tema>(['politica', 'cultura']))
      expect(r.length).toBeGreaterThan(0)
      expect(r.every((c) => c.tema === 'politica' || c.tema === 'cultura')).toBe(true)
    }
  })

  it('intercala temas: nunca tres seguidas del mismo', () => {
    for (let s = 0; s < 50; s++) {
      const r = sortear(banco, s)
      for (let i = 2; i < r.length; i++) {
        expect(r[i].tema === r[i - 1].tema && r[i].tema === r[i - 2].tema).toBe(false)
      }
    }
  })

  it('filtra por tema', () => {
    expect(sortear(banco, 1, new Set(), new Set<Tema>(['cultura'])).every((c) => c.tema === 'cultura')).toBe(true)
  })

  it('la misma semilla da la misma ronda', () => {
    expect(sortear(banco, 42).map((c) => c.id)).toEqual(sortear(banco, 42).map((c) => c.id))
  })
})

describe('cartas núcleo', () => {
  const temas: Tema[] = ['politica', 'economia', 'cultura']
  const banco = [
    ...Array.from({ length: 40 }, (_, i) => carta(`c${i}`, 50, 50, temas[i % 3])),
    ...Array.from({ length: 5 }, (_, i) => ({ ...carta(`n${i}`, 60, 40, 'sociedad'), nucleo: true })),
  ]

  it('salen todas en cada ronda, repartidas y nunca primera', () => {
    for (let s = 0; s < 100; s++) {
      const r = sortear(banco, s)
      expect(r).toHaveLength(RONDA)
      const pos = r.flatMap((c, i) => (c.nucleo ? [i] : []))
      expect(pos).toHaveLength(5)
      expect(pos[0]).toBeGreaterThan(0)
      // Repartidas: una por cada quinto de la ronda.
      pos.forEach((p, i) => expect(Math.floor((p * 5) / RONDA)).toBeLessThanOrEqual(i + 1))
      expect(new Set(r.map((c) => c.id)).size).toBe(RONDA)
    }
  })

  it('salen aunque se filtre por tema', () => {
    const r = sortear(banco, 3, new Set(), new Set<Tema>(['cultura']))
    expect(r.filter((c) => c.nucleo)).toHaveLength(5)
    expect(r.filter((c) => !c.nucleo).every((c) => c.tema === 'cultura')).toBe(true)
  })
})

describe('cartas parecidas', () => {
  it('nunca salen dos del mismo grupo en una ronda, ni una parecida a una núcleo', () => {
    const banco = [
      ...Array.from({ length: 40 }, (_, i) => ({ ...carta(`c${i}`, 50, 50), grupos: [`g${i % 8}`, `h${i % 5}`] })),
      ...Array.from({ length: 30 }, (_, i) => carta(`s${i}`, 50, 50, 'cultura')),
      { ...carta('n0', 60, 40), nucleo: true, grupos: ['g0'] },
    ]
    for (let s = 0; s < 100; s++) {
      const grupos = sortear(banco, s).flatMap((c) => c.grupos ?? [])
      expect(new Set(grupos).size).toBe(grupos.length)
    }
  })
})

describe('resumir', () => {
  const banco = [carta('a', 70, 30), carta('b', 40, 60), carta('c', 50, 49), carta('d', 20, 80, 'economia')]

  it('cuenta mayoría, minoría y parejas, y separa por tema', () => {
    const r = resumir(banco, [
      { carta: 'a', eleccion: 'a' },
      { carta: 'b', eleccion: 'a' },
      { carta: 'c', eleccion: 'b' },
      { carta: 'd', eleccion: 'b' },
    ])
    expect(r.conLaMayoria).toBe(2)
    expect(r.enLaMinoria).toBe(1)
    expect(r.parejas).toBe(1)
    expect(r.definidas).toBe(3)
    expect(r.porTema).toEqual([
      { tema: 'politica', mayoria: 1, definidas: 2 },
      { tema: 'economia', mayoria: 1, definidas: 1 },
    ])
  })

  it('el perfil depende de la proporción con la mayoría', () => {
    expect(perfil(19, 20).titulo).toBe('Sos la mayoría')
    expect(perfil(10, 20).titulo).toBe('Mitad y mitad')
    expect(perfil(2, 20).titulo).toBe('Minoría intensa')
  })
})

describe('brújula política', () => {
  const con = (c: Carta, eje: Eje): Carta => ({ ...c, eje })
  const banco = [
    con(carta('m1', 50, 50), { economia: 1 }),
    con(carta('m2', 50, 50), { economia: -1 }),
    con(carta('m3', 80, 20), { economia: 1 }),
    con(carta('v1', 50, 50), { valores: 1 }),
    con(carta('v2', 20, 80), { valores: -1 }),
    con(carta('v3', 50, 50), { valores: 0.5 }),
    carta('x', 90, 10),
  ]
  const responder = (e: Record<string, Eleccion>) =>
    Object.entries(e).map(([id, eleccion]) => ({ carta: banco.find((c) => c.id === id)!, eleccion }))

  it('el país, respondiendo con sus proporciones, promedia en el centro', () => {
    const next = random(9)
    const pos = Array.from({ length: 4000 }, () => {
      const r = banco.map((c) => ({ carta: c, eleccion: (next() < real(c) / 100 ? 'a' : 'b') as Eleccion }))
      return brujula(r)!.vos
    })
    const media = (e: 'economia' | 'valores') => pos.reduce((s, p) => s + p[e], 0) / pos.length
    // La escala es el percentil en el país (va de -1 a 1): 0,05 es menos de 3 puntos de percentil.
    expect(Math.abs(media('economia'))).toBeLessThan(0.05)
    expect(Math.abs(media('valores'))).toBeLessThan(0.05)
  })

  it('elegir lo de pocos mueve más que elegir lo de muchos', () => {
    const minoria = brujula(responder({ m1: 'a', m2: 'b', m3: 'b', v1: 'a', v2: 'b', v3: 'a' }))!
    const mayoria = brujula(responder({ m1: 'a', m2: 'b', m3: 'a', v1: 'a', v2: 'b', v3: 'a' }))!
    // m3 (80% A, empuja a mercado): elegir B (20%) corre mucho más a la izquierda que A a la derecha.
    expect(mayoria.vos.economia).toBeGreaterThan(0)
    expect(minoria.vos.economia).toBeLessThan(mayoria.vos.economia)
  })

  it('siempre del mismo lado queda lejos del centro, sin pasar del borde', () => {
    const b = brujula(responder({ m1: 'a', m2: 'b', m3: 'a', v1: 'b', v2: 'a', v3: 'b' }))!
    expect(b.vos.economia).toBeGreaterThan(0.5)
    expect(b.vos.valores).toBeLessThan(-0.5)
    expect(b.vos.economia).toBeLessThanOrEqual(1)
    expect(cuadrante(b.vos)).toBe('Más mercado, valores más progresistas')
    expect(b.cartas).toEqual({ economia: 3, valores: 3, autoridad: 0 })
    expect(b.vos.autoridad).toBe(0)
  })

  it('sin suficientes respuestas por escala no ubica, y "no dice" no cuenta', () => {
    expect(brujula(responder({ m1: 'a', m2: 'a', m3: 'nada', v1: 'a', v2: 'a', v3: 'a' }))).toBeNull()
  })

  it('nombra el centro y cada escala', () => {
    expect(cuadrante({ economia: 0.1, valores: -0.1, autoridad: 0 })).toBe('Cerca del promedio')
    expect(cuadrante({ economia: -0.5, valores: 0, autoridad: 0 })).toBe('Más Estado, centro en valores')
    expect(enPalabras('autoridad', 0.4)).toBe('más orden')
  })
})

describe('tema en el que más te diferenciás', () => {
  it('elige el de menor proporción con la mayoría, con al menos dos cartas', () => {
    expect(
      temaDistinto([
        { tema: 'economia', mayoria: 3, definidas: 4 },
        { tema: 'cultura', mayoria: 0, definidas: 1 },
        { tema: 'sociedad', mayoria: 1, definidas: 3 },
      ]),
    ).toBe('sociedad')
    expect(temaDistinto([{ tema: 'economia', mayoria: 2, definidas: 2 }])).toBeNull()
  })
})
