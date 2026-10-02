"""Descarga las partidas guardadas en Supabase y arma un CSV largo: una fila por carta jugada.

Uso:
  SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SECRET_KEY=sb_secret_xxxx python3 scripts/exportar_partidas.py
  python3 scripts/exportar_partidas.py --csv partidas_rows.csv   # CSV bajado del panel

Genera jugadas.csv en la carpeta actual. La clave secreta lee todo: no la subas al repo ni la
pongas en la app. Las filas con bytes inválidos (cualquiera con la clave pública puede insertar)
se omiten y se informan.
"""
import csv, json, os, sys, urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# Deben coincidir con src/lib/participant.ts.
AGE = {0: '', 1: '16-17', 2: '18-24', 3: '25-34', 4: '35-44', 5: '45-54', 6: '55-64', 7: '65+'}
GENDER = {0: '', 1: 'Mujer', 2: 'Varón', 3: 'No binario u otra'}
EDUCATION = {0: '', 1: 'Sin estudios o primario incompleto', 2: 'Primario completo',
             3: 'Secundario incompleto', 4: 'Secundario completo',
             5: 'Terciario o universitario incompleto', 6: 'Terciario o universitario completo',
             7: 'Posgrado'}
ELECCION = {1: 'A', 2: 'B', 3: 'no dice'}
MARGEN = 3  # igual que MARGEN en src/engine/juego.ts


def a_bytes(valor):
    """Bytes de la columna bytea, venga como \\x…, hex pelado o base64 (según cómo se exportó)."""
    v = (valor or '').strip().strip('"')
    if v.startswith('{'):  # el panel de Supabase exporta {"type":"Buffer","data":[64,103,…]}
        try:
            return bytes(json.loads(valor)['data'])
        except (ValueError, KeyError, TypeError):
            return None
    h = v[2:] if v[:2] in ('\\x', '0x') else v
    try:
        return bytes.fromhex(h)
    except ValueError:
        pass
    try:
        import base64
        return base64.b64decode(v, validate=True)
    except ValueError:
        return None


def decodificar(hex_str, cartas):
    """Lista de (carta, elección), o None si la fila no es válida (ver src/engine/codificacion.ts)."""
    raw = a_bytes(hex_str)
    if raw is None:
        return None
    if not raw or len(raw) % 2:
        return None
    out = []
    for k in range(0, len(raw), 2):
        e, idx = raw[k] >> 6, ((raw[k] & 63) << 8) | raw[k + 1]
        if e == 0 or idx >= len(cartas):
            return None
        out.append((cartas[idx], ELECCION[e]))
    return out


def mayoria(carta):
    """Igual que mayoria() en src/engine/juego.ts: parejo si la diferencia entra en el margen."""
    ref = carta['ref']
    pct = 100 * ref['a'] / (ref['a'] + ref['b'])
    return 'parejo' if abs(pct - 50) < MARGEN else ('A' if pct > 50 else 'B')


def fetch_rows():
    url, key = os.environ.get('SUPABASE_URL'), os.environ.get('SUPABASE_SECRET_KEY')
    if not url or not key:
        sys.exit('Faltan SUPABASE_URL y SUPABASE_SECRET_KEY (o usá --csv archivo).')
    headers = {'apikey': key}
    if key.startswith('eyJ'):
        headers['Authorization'] = f'Bearer {key}'
    last, rows = 0, []
    while True:
        req = urllib.request.Request(
            f"{url.rstrip('/')}/rest/v1/partidas?id=gt.{last}&order=id&limit=1000", headers=headers)
        page = json.load(urllib.request.urlopen(req))
        if not page:
            return rows
        rows += page
        last = page[-1]['id']


def main():
    cartas = json.load(open(f'{ROOT}/src/data/cartas.json', encoding='utf-8'))['cartas']
    if '--csv' in sys.argv:
        rows = list(csv.DictReader(open(sys.argv[sys.argv.index('--csv') + 1], encoding='utf-8-sig')))
    else:
        rows = fetch_rows()
    invalid = n = 0
    with open('jugadas.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        # Las cartas núcleo (siempre en la ronda) van como columnas en cada fila: permiten cruzar
        # cualquier carta con el perfil de quien jugó (economía, valores, seguridad, memoria, gobierno).
        nucleo = [c for c in cartas if c.get('nucleo') and not c.get('retirada')]
        w.writerow(['partida', 'fecha', 'edad', 'genero', 'educacion', 'segundos',
                    *(f"nucleo:{c['id']}" for c in nucleo),
                    'carta', 'tema', 'pregunta', 'opcion_a', 'opcion_b', 'eleccion', 'mayoria_encuesta',
                    'con_la_mayoria'])
        for r in rows:
            jugadas = decodificar(r['jugadas'], cartas)
            if jugadas is None:
                invalid += 1
                if invalid == 1:
                    print(f"Primera fila inválida: id={r.get('id')} jugadas={r.get('jugadas')!r}", file=sys.stderr)
                continue
            elegido = {c['id']: (c['a']['texto'] if e == 'A' else c['b']['texto'] if e == 'B' else 'no dice')
                       for c, e in jugadas}
            perfil = [elegido.get(c['id'], '') for c in nucleo]
            for c, e in jugadas:
                m = mayoria(c)
                w.writerow([r['id'], r['fecha'], AGE.get(int(r['edad']), ''), GENDER.get(int(r['genero']), ''),
                            EDUCATION.get(int(r['educacion']), ''), r['segundos'], *perfil, c['id'], c['tema'],
                            c['pregunta'], c['a']['texto'], c['b']['texto'],
                            c['a']['texto'] if e == 'A' else c['b']['texto'] if e == 'B' else '',
                            m, '' if e == 'no dice' or m == 'parejo' else ('sí' if e == m else 'no')])
                n += 1
    print(f'jugadas.csv: {n} jugadas de {len(rows) - invalid} partidas' + (f' ({invalid} inválidas omitidas)' if invalid else ''))


if __name__ == '__main__':
    main()
