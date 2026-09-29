# Notas para Claude

Repo de **La Mayoría** (sosmayoria.pisubi.com). Ver README.md para el detalle.

## Publicar

- El sitio se despliega desde otro repo (`Pisubi/sosmayoria`, `main`), no desde este.
- La publicación es automática: al actualizarse la rama **`produccion`** de este repo, la Action
  `.github/workflows/publicar.yml` corre lint, tests y build y empuja a `Pisubi/sosmayoria`.
- Trabajá siempre en la rama que te asigne la sesión. **No empujes a `produccion` por tu cuenta**:
  es un deploy a producción. Hacelo solo si el usuario lo pide de forma explícita ("publicá",
  "mandá a producción"), con `git push origin <rama-de-trabajo>:produccion`, y avisá que eso dispara
  el deploy.
- Antes de publicar: `npm test`, `npm run lint` y `npm run build` tienen que pasar.
- No hay acceso de escritura a `Pisubi/sosmayoria` desde la sesión, y no hace falta: la Action lo hace.

## Datos y brújula

- `src/data/cartas.json` solo admite agregar cartas al final (las partidas guardadas dependen del
  orden); para sacar una, marcar `"retirada": true`.
- Cada carta cita una encuesta publicada; los números se verifican contra la fuente original.
- La brújula se explica en el README. Después de tocar cartas, ejes o el sorteo (`src/engine/juego.ts`),
  correr los tests, que incluyen perfiles marcados y equilibrio de las cartas.
- Sin etiquetas partidarias ni nombres de partidos en el código, los tests ni el texto de las cartas:
  los perfiles se describen por dónde se ubican (economía, valores).
