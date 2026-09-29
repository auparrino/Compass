import { useState } from 'react'
import { cartas, TEMAS } from '../data/cartas'
import { brujula, cuadrante, enPalabras, LADOS, MINIMO_EJE, perfil, temaDistinto, type Lectura, type Lugar, type Resumen } from '../engine/juego'
import type { NombreEje } from '../types'
import { renderShareImage, type Tarjeta } from '../lib/compartir'
import { borrarHistorial, type Historial } from '../lib/guardado'
import { fecha } from '../lib/formato'
import { BrujulaPolitica } from './BrujulaPolitica'
import { Eyebrow } from './Eyebrow'
import { Footer } from './Footer'

interface ResultadoProps {
  resumen: Resumen
  /** Tus respuestas de todas las rondas, para la brújula. */
  historial: Historial
  onOtraRonda: () => void
  onMethodology: () => void
}

const CHIP: Record<Lugar, { texto: string; clase: string }> = {
  mayoria: { texto: 'Con la mayoría', clase: 'bg-azul/10 text-azul' },
  minoria: { texto: 'En la minoría', clase: 'bg-naranja/15 text-naranja' },
  parejo: { texto: 'Parejo', clase: 'bg-arena/60 text-azul' },
  nada: { texto: 'No elegiste', clase: 'bg-linea text-azul/60' },
}

const nombreTema = (id: string) => TEMAS.find((t) => t.id === id)?.nombre ?? id
const porId = new Map(cartas.map((c) => [c.id, c]))
const URL_PUBLICA = 'https://sosmayoria.pisubi.com'

export function Resultado({ resumen, historial, onOtraRonda, onMethodology }: ResultadoProps) {
  const { conLaMayoria, definidas, enLaMinoria, parejas, lecturas, porTema } = resumen
  const p = perfil(conLaMayoria, definidas)
  const minoria = lecturas.filter((l) => l.lugar === 'minoria')
  const [conHistorial, setConHistorial] = useState(true)
  const respuestas = Object.entries(historial.respuestas).flatMap(([id, eleccion]) => {
    const carta = porId.get(id)
    return carta ? [{ carta, eleccion }] : []
  })
  const b = conHistorial ? brujula(respuestas) : null
  const distinto = temaDistinto(porTema)
  const texto = `Pienso como la mayoría de los argentinos en ${conLaMayoria} de ${definidas} temas: ${p.titulo.toLowerCase()}. ¿Y vos?`

  return (
    <main>
      <section className="bg-noche text-marfil">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <Eyebrow>Fin de la ronda</Eyebrow>
          <p className="mt-6 text-lg text-marfil/70">Pensás como la mayoría en</p>
          <p className="mt-1 text-6xl font-bold tracking-[-0.02em] tabular-nums sm:text-7xl">
            {conLaMayoria} <span className="text-3xl font-normal text-marfil/60 sm:text-4xl">de {definidas}</span>
          </p>
          <h1 className="mt-6 text-3xl font-bold text-naranja sm:text-4xl">{p.titulo}</h1>
          <p className="mt-2 max-w-xl leading-7 text-marfil/75">{p.texto}</p>
          <p className="mt-4 text-sm text-marfil/55">
            En la minoría en {enLaMinoria}
            {parejas > 0 && ` · ${parejas} ${parejas === 1 ? 'carta pareja' : 'cartas parejas'}, donde el país se parte al medio`}
            .
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onOtraRonda}
              className="rounded-md bg-naranja px-8 py-3.5 text-sm font-semibold text-marfil hover:bg-marfil hover:text-azul"
            >
              Jugar otra ronda →
            </button>
            <Compartir
              texto={texto}
              tarjeta={{
                mayoria: conLaMayoria,
                definidas,
                titulo: p.titulo,
                texto: p.texto,
                temaDistinto: distinto ? nombreTema(distinto) : undefined,
              }}
            />
          </div>
        </div>
      </section>

      {b && (
        <section className="mx-auto max-w-3xl px-4 pt-14 sm:px-6">
          <Eyebrow>Tu brújula política</Eyebrow>
          <h2 className="mt-4 text-2xl font-bold">{cuadrante(b.vos)}</h2>
          <p className="mt-2 leading-7 text-azul/75">
            Comparado con el argentino promedio.
            {b.cartas.autoridad >= MINIMO_EJE && ` En autoridad: ${enPalabras('autoridad', b.vos.autoridad)}.`}
          </p>
          <div className="mt-6">
            <BrujulaPolitica b={b} />
          </div>
          <Motivos b={b} />
          <p className="mx-auto mt-5 max-w-md text-xs leading-5 text-azul/55">
            Precisión {b.precision}: {b.cartas.economia} respuestas sobre economía, {b.cartas.valores} sobre valores
            {b.cartas.autoridad >= MINIMO_EJE && ` y ${b.cartas.autoridad} sobre autoridad`}
            {historial.rondas > 1 ? `, sumando tus ${historial.rondas} rondas` : ''}. El centro es lo que respondió el
            país en las encuestas: elegir lo que eligió casi todo el mundo te mueve poco; elegir lo de pocos, mucho.
            {b.precision !== 'muy buena' && ' Cada ronda nueva la afina.'}{' '}
            <button
              type="button"
              onClick={() => {
                borrarHistorial()
                setConHistorial(false)
              }}
              className="underline"
            >
              Borrar mis respuestas guardadas
            </button>
          </p>
        </section>
      )}

      {minoria.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pt-14 sm:px-6">
          <Eyebrow>Donde sos minoría</Eyebrow>
          <ul className="mt-6 grid gap-3">
            {minoria.map((l) => (
              <li key={l.carta.id} className="rounded-2xl border border-naranja/30 bg-papel p-5">
                <p className="font-semibold">{l.carta.pregunta}</p>
                <p className="mt-1 text-sm text-azul/65">
                  Elegiste <span className="font-semibold text-azul">{eleccion(l)}</span>; la mayoría eligió{' '}
                  <span className="font-semibold text-azul">{otra(l)}</span>.
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {porTema.length > 1 && (
        <section className="mx-auto max-w-3xl px-4 pt-14 sm:px-6">
          <Eyebrow>Por tema</Eyebrow>
          <ul className="mt-6 grid gap-4">
            {porTema.map((t) => (
              <li key={t.tema}>
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="font-semibold">{nombreTema(t.tema)}</span>
                  <span className="text-azul/60 tabular-nums">
                    con la mayoría en {t.mayoria} de {t.definidas}
                  </span>
                </div>
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: t.definidas }, (_, i) => (
                    <span key={i} className={`h-2 flex-1 rounded-full ${i < t.mayoria ? 'bg-azul' : 'bg-naranja'}`} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl border border-azul/12 px-5 py-4 font-semibold">
            Ver carta por carta ({lecturas.length}), con sus fuentes
            <span className="text-naranja transition-transform group-open:rotate-45">+</span>
          </summary>
        <ol className="mt-6 grid gap-3">
          {lecturas.map((l) => (
            <li key={l.carta.id} className="rounded-2xl border border-azul/12 bg-papel p-5">
              <div className="flex items-start justify-between gap-4">
                <p className="font-semibold">{l.carta.pregunta}</p>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${CHIP[l.lugar].clase}`}>
                  {CHIP[l.lugar].texto}
                </span>
              </div>
              {l.jugada.eleccion !== 'nada' && <p className="mt-1 text-sm text-azul/65">Elegiste {eleccion(l)}.</p>}
              <p className="mt-2 text-xs text-azul/50">
                {l.carta.ref.encuestadora}, {fecha(l.carta.ref.fecha)}
                {!l.carta.ref.alcance.startsWith('nacional') && ` (${l.carta.ref.alcance})`} ·{' '}
                <a href={l.carta.ref.url} target="_blank" rel="noreferrer" className="underline">
                  fuente
                </a>
              </p>
            </li>
          ))}
        </ol>
        </details>
      </section>

      <Footer onMethodology={onMethodology} />
    </main>
  )
}

function eleccion(l: Lectura): string {
  return l.jugada.eleccion === 'nada' ? '' : `«${l.carta[l.jugada.eleccion].texto}»`
}

function otra(l: Lectura): string {
  return l.jugada.eleccion === 'a' ? `«${l.carta.b.texto}»` : `«${l.carta.a.texto}»`
}

function Compartir({ texto, tarjeta }: { texto: string; tarjeta: Omit<Tarjeta, 'url'> }) {
  const [estado, setEstado] = useState<'listo' | 'copiado' | 'generando'>('listo')
  async function compartir() {
    // Siempre la dirección pública, aunque se juegue desde el archivo suelto o una vista previa.
    const url = (import.meta.env.VITE_URL_PUBLICA as string | undefined) ?? URL_PUBLICA
    const mensaje = `${texto} ${url}`.trim()
    setEstado('generando')
    try {
      const blob = await renderShareImage({ ...tarjeta, url })
      const file = new File([blob], 'la-mayoria.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: mensaje })
          setEstado('listo')
          return
        } catch (e) {
          if ((e as Error).name === 'AbortError') {
            setEstado('listo')
            return
          }
        }
      }
      await navigator.clipboard.writeText(mensaje).catch(() => undefined)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = file.name
      a.click()
      window.setTimeout(() => URL.revokeObjectURL(a.href), 5000)
      setEstado('copiado')
      window.setTimeout(() => setEstado('listo'), 3000)
    } catch {
      setEstado('listo')
    }
  }
  return (
    <button
      type="button"
      onClick={compartir}
      disabled={estado === 'generando'}
      className="rounded-md border border-marfil/40 px-8 py-3.5 text-sm font-semibold text-marfil hover:bg-marfil hover:text-azul disabled:opacity-60"
    >
      {estado === 'generando' ? 'Generando…' : estado === 'copiado' ? 'Imagen descargada y texto copiado' : 'Compartir en historias'}
    </button>
  )
}

const ESCALAS: { eje: NombreEje; nombre: string }[] = [
  { eje: 'economia', nombre: 'Economía' },
  { eje: 'valores', nombre: 'Valores' },
  { eje: 'autoridad', nombre: 'Autoridad' },
]

/** De dónde sale la posición en cada escala: las respuestas que más pesaron. */
function Motivos({ b }: { b: NonNullable<ReturnType<typeof brujula>> }) {
  const escalas = ESCALAS.filter(({ eje }) => b.motivos[eje].length > 0)
  return (
    <details className="mx-auto mt-6 max-w-md rounded-2xl border border-azul/15 bg-papel px-5 py-4 text-sm">
      <summary className="cursor-pointer font-semibold">Qué te movió más</summary>
      <div className="mt-4 grid gap-5">
        {escalas.map(({ eje, nombre }) => (
          <div key={eje}>
            <p className="text-xs font-semibold tracking-wide text-azul/55 uppercase">{nombre}</p>
            <ul className="mt-2 grid gap-2">
              {b.motivos[eje].map((m) => (
                <li key={m.carta.id} className="leading-6">
                  <span className="font-semibold">{m.carta.pregunta}</span>{' '}
                  <span className="text-azul/65">
                    Elegiste «{m.eleccion === 'a' ? m.carta.a.texto : m.carta.b.texto}» →{' '}
                    {LADOS[eje][m.lado === 'mas' ? 1 : 0]}.
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-azul/55">
        Pesan más las respuestas que se apartan de lo que eligió el país; las que coinciden con casi todos mueven poco.
      </p>
    </details>
  )
}
