import { cartas, TEMAS, version } from '../data/cartas'
import { CUPO, esIdeologica, MARGEN, mayoria } from '../engine/juego'
import { todasLasFotos } from '../lib/fotos'
import { collecting } from '../lib/supabase'
import { Eyebrow } from './Eyebrow'
import { fecha } from '../lib/formato'
import type { NombreEje } from '../types'

const cuenta = (e: NombreEje) => cartas.filter((c) => c.eje?.[e]).length

export function ComoFunciona({ onBack, backLabel = 'Volver' }: { onBack: () => void; backLabel?: string }) {
  const fotos = todasLasFotos().filter(([id]) => cartas.some((c) => c.a.foto === id || c.b.foto === id))
  return (
    <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <Eyebrow>Cómo funciona</Eyebrow>
      <h1 className="mt-6 text-4xl font-bold tracking-[-0.015em]">Un juego, no una encuesta</h1>

      <Bloque titulo="El dato real">
        Cada carta tiene detrás una encuesta publicada: consultora o universidad, fecha, muestra y
        enlace. La mayoría son nacionales; también entran encuestas regionales amplias (AMBA,
        grandes ciudades o varias regiones) con al menos 500 casos y método conocido, y en ese
        caso la carta lo aclara. No entran encuestas de una sola ciudad o provincia, muestras
        autoseleccionadas ni subgrupos (solo jóvenes, por ejemplo). Cuando la encuesta ofrecía más de dos respuestas (o
        incluía "no sabe"), se compara solo entre quienes eligieron una de las dos opciones de la
        carta.
      </Bloque>

      <Bloque titulo="Mayoría, minoría o parejo">
        Al elegir, te decimos si coincidís con lo que eligió la mayoría en la encuesta. Si la
        diferencia entre las dos opciones es chica ({MARGEN} puntos o menos respecto de la mitad),
        la carta cuenta como pareja: las encuestas tienen márgenes de error de 2 a 4 puntos y no
        tendría sentido hablar de mayoría. Al final, el "X de Y" cuenta solo las cartas con una
        mayoría clara en las que elegiste.
      </Bloque>

      <Bloque titulo="Las cartas que siempre salen">
        En cada ronda hay cinco cartas fijas, mezcladas entre las demás: el rol del Estado en la
        economía, el aborto legal, la seguridad, los juicios por la última dictadura y la
        aprobación del gobierno. Son las que más distinguen las posturas políticas en la Argentina
        y permiten analizar las respuestas de cada carta según la orientación de quien juega. La
        del gobierno se actualiza con la última medición disponible.
      </Bloque>

      <Bloque titulo="La brújula política">
        {`De las ${cartas.length} cartas, ${cartas.filter(esIdeologica).length} ubican tu brújula en tres escalas: economía (más Estado o más mercado, ${cuenta('economia')} cartas), valores (más progresistas o más tradicionales, ${cuenta('valores')}) y autoridad (más garantías o más orden, ${cuenta('autoridad')}). La aprobación del gobierno no cuenta: mide apoyo a un gobierno, no ideología. Cada ronda trae al menos ${CUPO.economia} cartas de economía, ${CUPO.valores} de valores y ${CUPO.autoridad} de autoridad; el resto son cartas que no cuentan para la brújula (fútbol, mate, creencias…). Tu respuesta se compara con lo que respondió el país en la encuesta: elegir lo que eligió el 80% casi no te mueve, y elegir lo del 20% te mueve mucho. Por eso rechazar una afirmación extrema (que rechaza casi todo el mundo) dice poco de vos, y en cada ronda sale como mucho una por escala. Por eso el centro es el argentino promedio, y "más Estado" quiere decir más que el promedio: la distancia al centro es el percentil (cerca del borde, más que casi todo el país). Una respuesta suelta a contramano de tus otras no te lleva al centro: el modelo cuenta con que cualquiera se aparta a veces. Las cartas débiles o atadas a un gobierno pesan la mitad. Al final del resultado, "Qué te movió más" lista las respuestas que más pesaron en cada escala. Tus respuestas de rondas anteriores quedan en tu teléfono y se suman, así que la brújula se afina con cada ronda. No se envían ni van en la imagen para compartir.`}
      </Bloque>

      <Bloque titulo="Lo que se guarda">
        {collecting
          ? 'Cada ronda terminada se guarda de forma anónima: qué elegiste en cada carta, cuánto tardaste y, si decidís darlos, tu rango de edad, género y nivel educativo (se preguntan antes de cada resultado, con tus respuestas anteriores ya marcadas). No se guarda nombre, mail, IP ni nada que te identifique, y nunca las rondas de menores de 16 años. Lo que eligen quienes juegan no es una encuesta representativa: juega quien quiere.'
          : 'En esta versión no se guarda nada fuera de tu dispositivo.'}
      </Bloque>

      <Bloque titulo={`Las ${cartas.length} cartas y sus fuentes (${version})`}>
        {TEMAS.filter((t) => cartas.some((c) => c.tema === t.id)).map((t) => (
          <div key={t.id} className="mt-6">
            <p className="font-semibold text-azul">{t.nombre}</p>
            <ul className="mt-2 grid gap-2 text-sm">
              {cartas
                .filter((c) => c.tema === t.id)
                .map((c) => (
                  <li key={c.id} className="rounded-xl bg-papel px-4 py-3">
                    <p className="font-medium text-azul">{c.pregunta}</p>
                    <p className="mt-1 text-xs text-azul/60">
                      {mayoria(c) === 'parejo' ? 'Parejo' : `Mayoría: ${c[mayoria(c) as 'a' | 'b'].texto}`} —{' '}
                      {c.ref.encuestadora}, {fecha(c.ref.fecha)}
                      {c.ref.alcance !== 'nacional' && ` (${c.ref.alcance})`} ·{' '}
                      <a href={c.ref.url} target="_blank" rel="noreferrer" className="underline">
                        fuente
                      </a>
                    </p>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </Bloque>

      {fotos.length > 0 && (
        <Bloque titulo="Créditos de las fotos">
          <ul className="mt-2 grid gap-1 text-xs text-azul/60">
            {fotos.map(([id, f]) => (
              <li key={id}>
                {id}: {f.author} · {f.license} ·{' '}
                <a href={f.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                  Wikimedia Commons
                </a>
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      <button
        type="button"
        onClick={onBack}
        className="mt-12 rounded-md bg-azul px-8 py-3.5 text-sm font-semibold text-marfil hover:bg-noche"
      >
        {backLabel}
      </button>
    </main>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold">{titulo}</h2>
      <div className="mt-3 leading-7 text-azul/75">{children}</div>
    </section>
  )
}
