import type { Carta, Eleccion, Jugada, Mayoria, NombreEje, Tema } from '../types'

/** Cartas por ronda. */
export const RONDA = 25

/**
 * Si entre quienes eligieron A o B la diferencia con 50% es menor que esto (en puntos),
 * la carta se considera pareja: las encuestas tienen márgenes de error de 2 a 4 puntos.
 */
export const MARGEN = 3

/** Porcentaje de A entre quienes eligieron A o B en la encuesta de referencia (0 a 100). */
export function real(carta: Carta): number {
  const { a, b } = carta.ref
  return (100 * a) / (a + b)
}

export function mayoria(carta: Carta): Mayoria {
  const pct = real(carta)
  if (Math.abs(pct - 50) < MARGEN) return 'parejo'
  return pct > 50 ? 'a' : 'b'
}

/** Cómo quedó tu elección frente a la encuesta: con la mayoría, en la minoría, parejo o sin elegir. */
export type Lugar = 'mayoria' | 'minoria' | 'parejo' | 'nada'

export function lugar(carta: Carta, jugada: Jugada): Lugar {
  if (jugada.eleccion === 'nada') return 'nada'
  const m = mayoria(carta)
  if (m === 'parejo') return 'parejo'
  return m === jugada.eleccion ? 'mayoria' : 'minoria'
}

export function random(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function nuevaSemilla(): number {
  return Math.floor(Math.random() * 2 ** 31)
}

function mezclar<T>(items: T[], next: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Mínimo de cartas de cada escala por ronda, núcleo incluidas, para que la brújula tenga base. */
export const CUPO: Record<NombreEje, number> = { economia: 8, valores: 6, autoridad: 5 }

/**
 * Sortea una ronda: las cartas núcleo siempre, repartidas en lugares al azar; después las
 * ideológicas necesarias para el cupo de cada escala; y el resto, primero las que no miden
 * ideología (las "divertidas"). Nunca dos cartas del mismo grupo de parecidas, siempre
 * priorizando las que todavía no vio, y con los temas intercalados.
 */
export function sortear(
  cartas: Carta[],
  seed: number,
  vistas: ReadonlySet<string> = new Set(),
  temas?: ReadonlySet<Tema>,
  n = RONDA,
): Carta[] {
  const next = random(seed)
  const nucleo = cartas.filter((c) => c.nucleo && !c.retirada)
  const activas = cartas.filter(
    (c) => !c.retirada && !c.nucleo && (!temas || temas.size === 0 || temas.has(c.tema)),
  )
  const candidatas = [
    ...mezclar(activas.filter((c) => !vistas.has(c.id)), next),
    ...mezclar(activas.filter((c) => vistas.has(c.id)), next),
  ]
  // Como mucho una carta por grupo de cartas parecidas; las núcleo reservan el suyo primero.
  const grupos = new Set(nucleo.flatMap((c) => c.grupos ?? []))
  // Como mucho una afirmación extrema por escala: sirven solo para los extremos, y varias juntas
  // arrastran al centro a quien tiene posiciones firmes pero no extremas.
  const extremas = new Set<NombreEje>()
  const libre = (c: Carta) =>
    !(c.grupos ?? []).some((g) => grupos.has(g)) && !(esExtrema(c) && EJES.some((e) => c.eje?.[e] && extremas.has(e)))
  const elegidas: Carta[] = []
  const total = Math.max(0, n - nucleo.length)
  const tomar = (c: Carta) => {
    for (const g of c.grupos ?? []) grupos.add(g)
    if (esExtrema(c)) for (const e of EJES) if (c.eje?.[e]) extremas.add(e)
    elegidas.push(c)
    candidatas.splice(candidatas.indexOf(c), 1)
  }

  const cuenta = (e: NombreEje) => [...nucleo, ...elegidas].filter((c) => c.eje?.[e]).length
  // Afirmaciones redactadas hacia cada lado, en equilibrio: si en una escala casi todas se aceptan
  // del lado progresista (o estatista), quien contesta "de acuerdo" a todo queda corrido hacia ahí.
  const sentido = (c: Carta, e: NombreEje) => (c.tipo === 'afirmacion' ? Math.sign(c.eje?.[e] ?? 0) : 0)
  const saldo = (e: NombreEje) => [...nucleo, ...elegidas].reduce((s, c) => s + sentido(c, e), 0)
  for (const e of EJES) {
    while (cuenta(e) < CUPO[e] && elegidas.length < total) {
      const opciones = candidatas.filter((x) => x.eje?.[e] && libre(x))
      // Primero que no se repitan cartas ya vistas; después, el equilibrio.
      const nuevas = opciones.filter((x) => !vistas.has(x.id))
      const equilibra = (x: Carta) => sentido(x, e) * saldo(e) <= 0
      const c = nuevas.find(equilibra) ?? nuevas[0] ?? opciones.find(equilibra) ?? opciones[0]
      if (!c) break
      tomar(c)
    }
  }
  // El resto, primero las que no mueven la brújula que se ve, en el orden sorteado (las no vistas antes) y como
  // mucho tres por tema; si no alcanza, sin tope, y después cualquiera. Nada de turnos por tema: con
  // turnos, las cartas de un tema chico (historia tiene dos) salían en casi todas las rondas.
  const porTema = new Map<Tema, number>()
  const pasadas: [(c: Carta) => boolean, number][] = [
    [(c) => !mideBrujula(c), 3],
    [(c) => !mideBrujula(c), Infinity],
    [() => true, Infinity],
  ]
  for (const [sirve, tope] of pasadas) {
    for (const c of candidatas.filter(sirve)) {
      if (elegidas.length >= total) break
      if (!libre(c) || (porTema.get(c.tema) ?? 0) >= tope) continue
      porTema.set(c.tema, (porTema.get(c.tema) ?? 0) + 1)
      tomar(c)
    }
  }

  const out = intercalar(elegidas, next)
  // Las cartas núcleo van en todas las rondas, en lugares al azar repartidos entre las demás
  // (una por tramo de la ronda, nunca la primera), para que no se note un bloque fijo.
  const tramos = nucleo.length
  const largo = out.length + nucleo.length
  mezclar(nucleo, next).forEach((c, i) => {
    const desde = Math.max(1, Math.floor((i * largo) / tramos))
    const hasta = Math.max(desde, Math.floor(((i + 1) * largo) / tramos) - 1)
    const pos = Math.min(out.length, desde + Math.floor(next() * (hasta - desde + 1)))
    out.splice(pos, 0, c)
  })
  return out
}

/** Ordena para separar los temas: cada vez, del tema con más cartas pendientes que no sea el anterior. */
function intercalar(cartas: Carta[], next: () => number): Carta[] {
  const colas = new Map<Tema, Carta[]>()
  for (const c of mezclar(cartas, next)) colas.set(c.tema, [...(colas.get(c.tema) ?? []), c])
  const out: Carta[] = []
  let anterior: Tema | null = null
  while (out.length < cartas.length) {
    const opciones = mezclar([...colas.entries()], next)
      .filter(([, cola]) => cola.length > 0)
      .sort(([, a], [, b]) => b.length - a.length)
    const [tema, cola] = opciones.find(([t]) => t !== anterior) ?? opciones[0]
    out.push(cola.shift()!)
    anterior = tema
  }
  return out
}

export interface Lectura {
  carta: Carta
  jugada: Jugada
  lugar: Lugar
}

export interface Resumen {
  lecturas: Lectura[]
  conLaMayoria: number
  enLaMinoria: number
  parejas: number
  /** Cartas con mayoría clara en las que elegiste (la base del "X de Y"). */
  definidas: number
  porTema: { tema: Tema; mayoria: number; definidas: number }[]
}

export function resumir(cartas: Carta[], jugadas: Jugada[]): Resumen {
  const porId = new Map(cartas.map((c) => [c.id, c]))
  const lecturas: Lectura[] = []
  for (const jugada of jugadas) {
    const carta = porId.get(jugada.carta)
    if (carta) lecturas.push({ carta, jugada, lugar: lugar(carta, jugada) })
  }
  const cuenta = (l: Lugar) => lecturas.filter((x) => x.lugar === l).length
  const temas = [...new Set(lecturas.map((l) => l.carta.tema))]
  return {
    lecturas,
    conLaMayoria: cuenta('mayoria'),
    enLaMinoria: cuenta('minoria'),
    parejas: cuenta('parejo'),
    definidas: cuenta('mayoria') + cuenta('minoria'),
    porTema: temas
      .map((tema) => {
        const del = lecturas.filter((l) => l.carta.tema === tema)
        const mayoria = del.filter((l) => l.lugar === 'mayoria').length
        return { tema, mayoria, definidas: mayoria + del.filter((l) => l.lugar === 'minoria').length }
      })
      .filter((t) => t.definidas > 0),
  }
}

/** Qué tan mayoritario sos, en palabras. */
export function perfil(conLaMayoria: number, definidas: number): { titulo: string; texto: string } {
  if (definidas === 0) return { titulo: 'Sin datos', texto: 'No elegiste en ninguna carta con una mayoría clara.' }
  const p = conLaMayoria / definidas
  if (p >= 0.85) return { titulo: 'Sos la mayoría', texto: 'Casi siempre pensás lo mismo que la mayor parte del país.' }
  if (p >= 0.65) return { titulo: 'Bien mayoritario', texto: 'En general coincidís con la mayoría, con algunas excepciones.' }
  if (p >= 0.45) return { titulo: 'Mitad y mitad', texto: 'Tan seguido con la mayoría como en la minoría.' }
  if (p >= 0.25) return { titulo: 'A contracorriente', texto: 'Más de una vez pensás distinto que la mayoría del país.' }
  return { titulo: 'Minoría intensa', texto: 'Casi siempre elegís lo que eligen menos argentinos.' }
}

/** Las tres escalas de la brújula. La brújula dibuja economía × valores; autoridad va aparte, en una barra. */
export const EJES: readonly NombreEje[] = ['economia', 'valores', 'autoridad']

export const esIdeologica = (c: Carta): boolean => EJES.some((e) => c.eje?.[e])

/**
 * Si la carta mueve una escala que se muestra (las que tienen cupo). Las de autoridad, que se
 * calcula pero no se ve, se sortean como cualquier carta sin eje.
 */
export const mideBrujula = (c: Carta): boolean => EJES.some((e) => CUPO[e] > 0 && c.eje?.[e])

/** Afirmación con la que acuerda menos de un cuarto del país (p. ej. "el marido tiene la última palabra"). */
export const esExtrema = (c: Carta): boolean => esIdeologica(c) && c.tipo === 'afirmacion' && real(c) < 25

/** Posición en cada escala, de -1 a 1; 0 es el argentino promedio según las encuestas. */
export type Posicion = Record<NombreEje, number>

/** Una respuesta que pesó en una escala, para explicar de dónde sale la posición. */
export interface Motivo {
  carta: Carta
  eleccion: 'a' | 'b'
  /** Si lo que elegiste es el lado + de la escala (más mercado / tradicional / orden) o el lado −. */
  lado: 'mas' | 'menos'
  /** Cuánto se movería tu posición (en desvíos del país) si no hubieras contestado esa carta; siempre positivo. */
  peso: number
}

export interface Brujula {
  vos: Posicion
  /** Cuántas respuestas cuentan en cada escala. */
  cartas: Record<NombreEje, number>
  precision: 'aproximada' | 'buena' | 'muy buena'
  /** Las respuestas que más pesaron en cada escala, de mayor a menor. */
  motivos: Record<NombreEje, Motivo[]>
}

/** Los dos lados de cada escala: [− , +]. */
export const LADOS: Record<NombreEje, [string, string]> = {
  economia: ['más Estado', 'más mercado'],
  valores: ['progresista', 'tradicional'],
  autoridad: ['más garantías', 'más orden'],
}

/** Cuántos motivos se guardan por escala. */
export const MOTIVOS = 3

/** Respuestas mínimas por escala para ubicar a alguien. */
export const MINIMO_EJE = 3

/**
 * Modelo de respuesta (tipo teoría de respuesta al ítem): cada persona tiene una posición θ en
 * cada escala, y la chance de elegir el lado + de una carta es logística en θ − b. La dificultad b
 * de cada carta sale de la encuesta: si el país tiene θ ~ N(0, 1), la proporción que eligió el
 * lado + tiene que coincidir con la publicada. Así, rechazar una afirmación extrema (que rechaza
 * casi todo el mundo) mueve poco, y aceptarla mueve mucho; el centro es el argentino promedio.
 */
const DISCRIMINACION = 1.7
/**
 * Chance de elegir el lado contrario a la propia posición por motivos ajenos a la escala (una
 * carta de consenso, nacionalismo, la coyuntura). Sin esto, una sola respuesta "fuera de libreto"
 * en una carta que elige el 80% le pone techo a toda la escala: alguien muy pro mercado que dice
 * que hay que proteger la industria nacional quedaba cerca del centro.
 */
const LAPSO = 0.1
/** Previa N(0, σ²) de la posición: con pocas cartas acerca al promedio, sin aplastar a nadie. */
const PREVIA = 1.5
const GRILLA = Array.from({ length: 161 }, (_, i) => -4 + i * 0.05)

interface Item {
  carta: Carta
  eleccion: 'a' | 'b'
  /** Discriminación (1,7 por el peso de la carta en la escala). */
  a: number
  /** Dificultad del lado +. */
  b: number
  /** Si eligió el lado + de la escala. */
  mas: boolean
}

/** Dificultad para que, con θ ~ N(0, 1) y el lapso, elija el lado + una proporción q del país. */
function dificultad(q: number, a: number): number {
  const sinLapso = Math.min(0.97, Math.max(0.03, (q - LAPSO) / (1 - 2 * LAPSO)))
  return (-Math.log(sinLapso / (1 - sinLapso)) * Math.sqrt(1 + (Math.PI * a * a) / 8)) / a
}

/** Media de la posterior de θ en la grilla. */
function posicion(items: Item[]): number {
  let max = -Infinity
  const log = GRILLA.map((t) => {
    let l = -(t * t) / (2 * PREVIA * PREVIA)
    for (const { a, b, mas } of items) {
      const p = LAPSO + (1 - 2 * LAPSO) / (1 + Math.exp(-a * (t - b)))
      l += Math.log(mas ? p : 1 - p)
    }
    max = Math.max(max, l)
    return l
  })
  let suma = 0
  let total = 0
  log.forEach((l, i) => {
    const w = Math.exp(l - max)
    suma += w * GRILLA[i]
    total += w
  })
  return suma / total
}

/** Función de distribución normal estándar (Abramowitz y Stegun 26.2.17, error < 1e-7). */
function normal(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989423 * Math.exp((-x * x) / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return x > 0 ? 1 - p : p
}

/**
 * Ubica a quien juega en cada escala comparando sus respuestas con lo que respondió el país
 * (ver el modelo arriba). Las cartas pesan según su eje: ±1 las que miden bien, ±0,5 las débiles.
 * La posición va de -1 a 1 según el percentil en el país: 0,8 es estar más hacia el lado + que el
 * 90% de los argentinos. Así no se satura en el borde ni aplasta a quien tiene posiciones firmes.
 */
export function brujula(respuestas: { carta: Carta; eleccion: Eleccion }[]): Brujula | null {
  const items: Record<NombreEje, Item[]> = { economia: [], valores: [], autoridad: [] }
  for (const { carta, eleccion } of respuestas) {
    if (!carta.eje || eleccion === 'nada') continue
    const pA = real(carta) / 100
    for (const e of EJES) {
      const w = carta.eje[e]
      if (!w) continue
      const a = DISCRIMINACION * Math.abs(w)
      // Lado + de la escala: A si el eje es positivo, B si es negativo.
      const q = w > 0 ? pA : 1 - pA
      items[e].push({ carta, eleccion, a, b: dificultad(q, a), mas: (eleccion === 'a') === w > 0 })
    }
  }
  const cartas = { economia: items.economia.length, valores: items.valores.length, autoridad: items.autoridad.length }
  if (cartas.economia < MINIMO_EJE || cartas.valores < MINIMO_EJE) return null
  const pos = (e: NombreEje) => (cartas[e] < MINIMO_EJE ? 0 : 2 * normal(posicion(items[e])) - 1)
  const base = Math.min(cartas.economia, cartas.valores)
  // Cuánto habría cambiado la posición sin cada respuesta: mide el peso de cada una sin que lo tape
  // el borde del gráfico (quien está cerca de +1 casi no se mueve, pero sí su posición real).
  const motivo = (e: NombreEje): Motivo[] => {
    if (cartas[e] < MINIMO_EJE) return []
    const total = posicion(items[e])
    return items[e]
      .map((it, i) => ({
        carta: it.carta,
        eleccion: it.eleccion,
        lado: it.mas ? ('mas' as const) : ('menos' as const),
        peso: Math.abs(total - posicion(items[e].filter((_, k) => k !== i))),
      }))
      .sort((x, y) => y.peso - x.peso)
      .slice(0, MOTIVOS)
  }
  return {
    vos: { economia: pos('economia'), valores: pos('valores'), autoridad: pos('autoridad') },
    cartas,
    precision: base >= 16 ? 'muy buena' : base >= 8 ? 'buena' : 'aproximada',
    motivos: { economia: motivo('economia'), valores: motivo('valores'), autoridad: motivo('autoridad') },
  }
}

/** Por debajo de esto (en valor absoluto) una escala cuenta como centro. */
export const CENTRO = 0.15

const PALABRAS: Record<NombreEje, [string, string, string]> = {
  economia: ['más Estado', 'centro en economía', 'más mercado'],
  valores: ['valores más progresistas', 'centro en valores', 'valores más tradicionales'],
  autoridad: ['más garantías', 'cerca del promedio', 'más orden'],
}

/** Una escala en palabras, relativa al promedio: "más Estado", "centro en valores"… */
export function enPalabras(e: NombreEje, v: number): string {
  return PALABRAS[e][v <= -CENTRO ? 0 : v >= CENTRO ? 2 : 1]
}

/** Economía y valores en palabras, por ejemplo "Más Estado, valores más tradicionales". */
export function cuadrante(p: Posicion): string {
  if (Math.abs(p.economia) < CENTRO && Math.abs(p.valores) < CENTRO) return 'Cerca del promedio'
  const texto = `${enPalabras('economia', p.economia)}, ${enPalabras('valores', p.valores)}`
  return texto[0].toUpperCase() + texto.slice(1)
}

/** El tema en el que más seguido quedaste en la minoría (al menos dos cartas definidas). */
export function temaDistinto(porTema: Resumen['porTema']): Tema | null {
  const candidatos = porTema.filter((t) => t.definidas >= 2 && t.mayoria < t.definidas)
  if (!candidatos.length) return null
  const ratio = (t: (typeof candidatos)[number]) => t.mayoria / t.definidas
  return candidatos.reduce((a, b) =>
    ratio(b) < ratio(a) || (ratio(b) === ratio(a) && b.definidas - b.mayoria > a.definidas - a.mayoria) ? b : a,
  ).tema
}
