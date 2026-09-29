import { MINIMO_EJE, type Brujula } from '../engine/juego'

/** Cuánto del cuadro usa el recorrido de -1 a 1 (en %), para que el punto no toque el borde. */
const ALCANCE = 42

/**
 * Economía × valores, con el argentino promedio en el centro, y abajo la escala de autoridad.
 */
export function BrujulaPolitica({ b }: { b: Brujula }) {
  const { economia, valores, autoridad } = b.vos
  return (
    <figure className="mx-auto w-full max-w-md">
      <div
        className="relative aspect-square overflow-hidden rounded-2xl border border-azul/15 bg-papel text-[11px] font-semibold tracking-wide text-azul/55 uppercase sm:text-xs"
        role="img"
        aria-label={`Brújula política. Economía ${pct(economia)} (negativo, más Estado; positivo, más mercado). Valores ${pct(valores)} (negativo, progresistas; positivo, tradicionales). Cero es el promedio del país.`}
      >
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <span className="bg-azul/[0.07]" />
          <span className="bg-arena/35" />
          <span className="bg-naranja/[0.08]" />
          <span className="bg-azul/[0.03]" />
        </div>
        <span className="absolute inset-x-0 top-1/2 h-px bg-azul/25" />
        <span className="absolute inset-y-0 left-1/2 w-px bg-azul/25" />

        <span className="absolute top-2 left-1/2 -translate-x-1/2 rounded bg-papel/80 px-1.5">Valores tradicionales</span>
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-papel/80 px-1.5">
          Valores progresistas
        </span>
        <span className="absolute top-1/2 left-2 -translate-y-[calc(100%+4px)]">Más Estado</span>
        <span className="absolute top-1/2 right-2 -translate-y-[calc(100%+4px)]">Más mercado</span>

        <span className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-azul/50 bg-papel" />

        <span
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${50 + economia * ALCANCE}%`, top: `${50 - valores * ALCANCE}%` }}
        >
          <span className="block size-4 rounded-full border-2 border-papel bg-naranja ring-4 ring-naranja/25" />
          <span className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded bg-noche px-1.5 py-0.5 text-[11px] tracking-normal whitespace-nowrap text-marfil normal-case">
            Vos
          </span>
        </span>
      </div>
      <figcaption className="mt-2 flex justify-center gap-4 text-xs text-azul/60">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-azul/50 bg-papel" /> Promedio del país
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-naranja" /> Vos
        </span>
      </figcaption>

      {b.cartas.autoridad >= MINIMO_EJE && (
        <div className="mt-6">
          <div className="flex justify-between text-[11px] font-semibold tracking-wide text-azul/55 uppercase sm:text-xs">
            <span>Más garantías</span>
            <span>Autoridad</span>
            <span>Más orden</span>
          </div>
          <div
            className="relative mt-2 h-3 rounded-full bg-gradient-to-r from-azul/10 via-arena/40 to-naranja/15"
            role="img"
            aria-label={`Autoridad ${pct(autoridad)} (negativo, más garantías; positivo, más orden). Cero es el promedio del país.`}
          >
            <span className="absolute inset-y-[-4px] left-1/2 w-px bg-azul/40" />
            <span
              className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-papel bg-naranja ring-4 ring-naranja/25"
              style={{ left: `${50 + autoridad * ALCANCE}%` }}
            />
          </div>
        </div>
      )}
    </figure>
  )
}

const pct = (v: number) => `${Math.round(v * 100)}`
