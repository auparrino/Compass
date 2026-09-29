# La Mayoría

¿Pensás como la mayoría de los argentinos? Un juego web sobre la opinión pública: en cada
carta elegís entre dos opciones (esto o aquello, de acuerdo o en desacuerdo) y al toque ves
si estás con la mayoría, según una encuesta publicada.

No es una encuesta, pero junta opinión: lo que elige cada persona se guarda de forma anónima
(si el despliegue tiene Supabase).

## Cómo se juega

- Rondas de 25 cartas sorteadas del banco (encuestas nacionales de la Argentina, o regionales
  amplias —AMBA, grandes ciudades, varias regiones— con al menos 500 casos), alternando temas (política, economía, sociedad, historia, cultura, vida
  cotidiana) y priorizando las que la persona todavía no vio.
- Cada carta: elegís A, B o "prefiero no decir" y aparece "Estás con la mayoría", "Estás en la
  minoría" o "Está parejo"; después pasa sola a la siguiente. No se muestran porcentajes.
- Una carta es pareja si la opción más elegida no supera el 50% por más de 3 puntos (entre
  quienes eligieron A o B): las encuestas tienen márgenes de error de 2 a 4 puntos.
- Al final: en cuántas cartas (con mayoría clara) pensás como la mayoría, un perfil (de "Sos la
  mayoría" a "Minoría intensa"), dónde sos minoría y cómo te va en cada tema.

## Cartas núcleo

Cinco cartas (`"nucleo": true`) salen en todas las rondas, en lugares al azar repartidos entre
las demás: Estado o mercado en el empleo, aborto legal, penas o desigualdad frente a la
inseguridad, juicios por la dictadura y aprobación del gobierno. Dan un perfil político de
cada partida para cruzar con el resto de las cartas (la exportación las trae como columnas).
La de aprobación es `"volatil": true`: hay que actualizar su dato con la última medición.

## Brújula política

Las cartas con `eje` ubican a quien juega en tres escalas: `economia` (`-` más Estado, `+` más
mercado), `valores` (`-` más progresistas, `+` más tradicionales) y `autoridad` (`-` más
garantías y libertades civiles, `+` más orden). Autoridad se calcula pero no se muestra ni tiene
cupo por ronda: la brújula que ve quien juega es economía × valores. El valor dice cuánto y hacia dónde empuja elegir
A (B empuja al revés): `±1` si la carta mide bien la escala, `±0.5` si es un indicador débil o
atado a un gobierno. La aprobación del gobierno no tiene eje: mide alineamiento, no ideología.

- **Relativa al país.** `brujula()` (en `src/engine/juego.ts`) usa un modelo de respuesta al
  ítem: la posición θ de cada escala sale de la media de la posterior, con una previa N(0, 1,5²),
  y la dificultad de cada carta se fija para que, con el país en θ ~ N(0, 1), la proporción que
  elige cada lado coincida con la encuesta. Elegir lo que eligió el 80% casi no mueve; elegir lo
  del 20% mueve mucho; rechazar una afirmación extrema dice poco. El centro es el argentino
  promedio.
- **Lapso del 10%.** El modelo admite que cualquiera elige a veces el lado contrario a su posición
  por motivos ajenos a la escala (consenso, nacionalismo, coyuntura). Sin eso, una sola respuesta
  así en una carta de consenso le ponía techo a toda la escala: alguien muy pro mercado que
  defendía la industria nacional quedaba cerca del centro.
- **Escala en percentiles.** La posición que se dibuja es `2·Φ(θ) − 1`: 0,8 es estar más hacia ese
  lado que el 90% del país. No se satura en el borde (antes todo perfil marcado quedaba en ±1).
- **Qué mide cada carta de economía.** Solo Estado contra mercado. Las que mezclan nacionalismo o
  soberanía (industria nacional, áreas y recursos estratégicos, apertura al mundo) o frases de
  consenso (obra pública) pesan `±0.5`, porque también las sostiene mucha gente pro mercado; las
  que no separan Estado de mercado (regular la IA, "igualdad de oportunidades") no tienen eje. Los
  tests de `tests/cartas.test.ts` verifican que un perfil pro mercado con respuestas
  nacionalistas y uno estatista que valora el esfuerzo queden lejos del centro en una ronda.
- **Afirmaciones extremas** (menos del 25% de acuerdo, `esExtrema()`): como mucho una por escala
  en cada ronda, para que varias juntas no arrastren al centro a quien tiene posiciones firmes.
- **Cupo por ronda.** Cada ronda trae al menos `CUPO` cartas de cada escala (núcleo incluidas);
  el resto son cartas que no mueven la brújula que se ve (fútbol, mate, creencias… y las de
  autoridad, que se calcula pero no se muestra). Esas se toman en el orden sorteado, como mucho
  tres por tema, así salen todas parecido (con turnos por tema, las dos de
  historia salían en casi todas las rondas); después `intercalar()` separa los temas.
- **Afirmaciones en equilibrio.** Al llenar el cupo de cada escala se alternan afirmaciones que se
  aceptan de un lado y del otro (por ejemplo, "hay que legalizar la marihuana" y "hay que derogar el
  matrimonio igualitario"), para que quien contesta "de acuerdo" a todo no quede corrido.
- **Sin cartas de consenso.** Una carta de economía o valores con 78% o más de un lado no cuenta
  para la brújula (casi no distingue a nadie y, como las de consenso suelen ser estatistas o
  progresistas, corrían a quien contesta "de acuerdo" a todo); queda como carta común. La excepción
  son las afirmaciones extremas, que sirven para los bordes. Un test lo verifica.
- **Primero cartas nuevas.** Al llenar el cupo se prefieren cartas que la persona no vio, y recién
  entre ellas se busca el equilibrio de afirmaciones.
- **Inseguridad** (núcleo, endurecer penas o reducir la desigualdad) cuenta solo para autoridad, así
  que no mueve la brújula que se ve.
- **Se afina con cada ronda.** Las respuestas de todas las rondas quedan en el navegador
  (`mayoria:respuestas:v1`) y la brújula usa todas. No se envían ni van en la imagen para
  historias.
- **Cartas sobre medidas de un gobierno:** de 2025 en adelante y nombrándolo; las de 2024 se
  retiraron.

## Cartas parecidas

Las cartas de un mismo tema fino comparten `"grupos"` (religión, "¿Creés en…?", jubilaciones,
privatizaciones, reforma electoral, grieta, etc.): en una ronda sale como mucho una por grupo,
y las núcleo reservan el suyo. Una carta puede estar en más de un grupo. Las que eran casi
iguales a una núcleo se retiraron (`motivo_retiro`). Al agregar cartas, asignales grupo si se
parecen a otra; los tests verifican que ninguna ronda repita grupo.

## El dato real

Cada carta de `src/data/cartas.json` cita una encuesta publicada: encuestadora, fecha,
muestra, alcance y enlace, con los porcentajes crudos de A, B y el resto. Si la encuesta tenía
más opciones o "no sabe", la mayoría se define entre quienes eligieron A o B. Todas las cartas
se verificaron una por una contra su fuente.

El orden de `cartas.json` solo admite agregar al final (las partidas guardadas lo usan); una
carta que se quiera sacar se marca `"retirada": true`.

## Datos de quienes juegan (Supabase)

Antes de cada resultado se piden edad, género y nivel educativo (opcionales; quedan marcadas
las respuestas anteriores del dispositivo). Si hay `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY`
(ver `.env.example`), cada ronda terminada se guarda en una fila anónima de unos 90 bytes:

- `supabase/schema.sql` crea `partidas`, en la que la clave pública solo puede insertar. La app
  no lee nada de la base.
- Las jugadas van empaquetadas en 2 bytes por carta (ver `src/engine/codificacion.ts`); el
  esquema trae una consulta de ejemplo para contar elecciones por carta en el SQL Editor.
- Menores de 16: juegan, pero no se guarda nada.
- `python3 scripts/exportar_partidas.py` baja todo con la clave secreta y arma `jugadas.csv`,
  una fila por carta jugada, con la mayoría de la encuesta y si la persona coincidió, para
  analizar (por ejemplo, ponderando por edad, género y educación según el censo: la muestra no
  es representativa).

## Publicar en sosmayoria.pisubi.com

El sitio se despliega desde **otro repositorio**: `Pisubi/sosmayoria` (rama `main`), que Cloudflare
Pages tiene conectado (build `npm run build`, salida `dist`, variables `VITE_SUPABASE_URL` y
`VITE_SUPABASE_KEY`; el DNS de pisubi.com también está en Cloudflare). Este repositorio
(`auparrino/Compass`) es donde se desarrolla, y se publica así:

```
rama de trabajo ──(merge o push)──▶ produccion ──(GitHub Action)──▶ Pisubi/sosmayoria main ──▶ Cloudflare
```

- **Para publicar**: actualizar la rama `produccion` de este repo, por ejemplo
  `git push origin <rama-de-trabajo>:produccion`, o mergeando un pull request hacia `produccion`.
- `.github/workflows/publicar.yml` corre `lint`, `test` y `build`; si todo pasa, empuja a
  `Pisubi/sosmayoria` `main` (sin forzar: si allá hay commits que acá no, falla en vez de pisarlos).
  Cloudflare redespliega solo. Se sigue en la pestaña Actions y, para el deploy, en Cloudflare →
  Workers & Pages → Deployments.
- **Vista previa sin tocar producción**: empujar a otra rama de `Pisubi/sosmayoria`
  (`git push <remoto-pisubi> <rama>`); Cloudflare arma una URL de prueba.
- **Configuración inicial (ya hecha, por si hay que rehacerla)**: una clave SSH de deploy; la pública
  va en `Pisubi/sosmayoria` → Settings → Deploy keys (con *Allow write access*) y la privada en este
  repo → Settings → Secrets → Actions, con el nombre `SOSMAYORIA_DEPLOY_KEY`.
- Solo `produccion` publica. Las otras ramas (incluidas las que abre Claude en cada sesión) no
  cambian el sitio hasta que se las lleve a `produccion`.
- No se hacen cambios directos en `Pisubi/sosmayoria`: se perderían o harían fallar la Action.

## Desarrollo

```
npm install
npm run dev
npm test        # vitest
npm run lint    # oxlint
npm run build
```

Vite, React, TypeScript y Tailwind. Las fotos de figuras (`public/img`, `src/data/fotos.json`)
son de Wikimedia Commons, con autor y licencia.
