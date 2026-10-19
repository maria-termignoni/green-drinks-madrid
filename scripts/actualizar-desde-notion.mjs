// Lee la base "Eventos Green Drinks Madrid" de Notion y genera site/data/eventos.json,
// descargando la foto de cada ponente a site/assets/ponentes/.
// Lo ejecuta GitHub Actions (ver .github/workflows/publicar.yml). Necesita Node 20 o superior
// y la variable NOTION_TOKEN con el token de una integración de Notion de solo lectura.
//
// Solo se publican las filas con la casilla «Publicar en web» marcada:
//   - la de fecha más cercana a partir de hoy (hora de Madrid) es el «Próximo encuentro»;
//   - las de fecha anterior a hoy son los «Encuentros pasados».
// Si algo falla, el script termina con error y la web publicada no cambia.

import { writeFile, mkdir } from 'node:fs/promises';

const BASE_DE_DATOS = '77638ca362b84088b05b4ebf696db3ae'; // Eventos Green Drinks Madrid
const TOKEN = process.env.NOTION_TOKEN;
const SITE = new URL('../site/', import.meta.url);
const HORA_POR_DEFECTO = '20:00';

// Temáticas de Notion → filtro y etiqueta que se ven en la web
const TEMAS = {
  'Economia Circular':                  ['circular', 'Economía circular'],
  'Economia y Ecologia':                ['eco', 'Economía y ecología'],
  'Emprendimiento y Regeneracion':      ['emprende', 'Emprendimiento e impacto'],
  'Biodiversidad':                      ['bio', 'Biodiversidad'],
  'Diversidad y Transicion Energetica': ['energia', 'Energía'],
  'Inteligencia Artificial':            ['ia', 'IA'],
  'Agua':                               ['agua', 'Agua'],
};

// Sin token se publica el eventos.json que ya está en el repositorio, sin tocarlo
if (!TOKEN) {
  console.warn('::warning::Falta NOTION_TOKEN, así que se publica la web con los encuentros guardados en site/data/eventos.json. Añádelo en GitHub: Settings → Secrets and variables → Actions → New repository secret.');
  process.exit(0);
}

async function notion(path, body) {
  const r = await fetch(`https://api.notion.com/v1/${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Notion respondió ${r.status}: ${await r.text()}`);
  return r.json();
}

async function filasPublicadas() {
  const filas = [];
  let cursor;
  do {
    const res = await notion(`databases/${BASE_DE_DATOS}/query`, {
      filter: { property: 'Publicar en web', checkbox: { equals: true } },
      sorts: [{ property: 'Fecha del Evento', direction: 'descending' }],
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    filas.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return filas;
}

// Lectura de cada tipo de propiedad
const texto = p => (p?.rich_text || p?.title || []).map(t => t.plain_text).join('').trim();
const url = p => p?.url || '';
const temas = p => (p?.multi_select || []).map(o => o.name);
const archivo = p => {
  const f = (p?.files || [])[0];
  return f ? (f.type === 'file' ? f.file.url : f.external?.url) : '';
};

async function descargarFoto(origen, id) {
  if (!origen) return '';
  try {
    const r = await fetch(origen);
    if (!r.ok) throw new Error(r.status);
    const tipo = r.headers.get('content-type') || '';
    const ext = tipo.includes('png') ? 'png' : tipo.includes('webp') ? 'webp' : 'jpg';
    const nombre = `notion-${id.replace(/-/g, '').slice(0, 12)}.${ext}`;
    await writeFile(new URL(`assets/ponentes/${nombre}`, SITE), Buffer.from(await r.arrayBuffer()));
    return `assets/ponentes/${nombre}`;
  } catch (e) {
    console.warn(`::warning::No se pudo descargar la foto de la fila ${id}: ${e.message}`);
    return '';
  }
}

async function aEvento(fila) {
  const p = fila.properties;
  const inicio = p['Fecha del Evento']?.date?.start || '';
  const [cat, tema] = TEMAS[temas(p['Tematica'])[0]] || ['otros', temas(p['Tematica'])[0] || 'Otros temas'];
  return {
    fecha: inicio.slice(0, 10),
    hora: inicio.includes('T') ? inicio.slice(11, 16) : HORA_POR_DEFECTO,
    cat, tema,
    titulo: texto(p['Web: Título de la charla']),
    nombre: texto(p['Web: Nombre del ponente']) || texto(p['Ponente']),
    cargo: texto(p['Web: Cargo del ponente']),
    charla: texto(p['Web: Resumen de la charla']),
    bio: texto(p['Web: Bio del ponente']),
    web: url(p['Web: Sitio web del ponente']),
    linkedin: url(p['LinkedIn del Ponente']),
    inscripcion: url(p['Web: Enlace de inscripción']),
    foto: await descargarFoto(archivo(p['Web: Foto del ponente']), fila.id),
    _nombreEvento: texto(p['Nombre del Evento']),
  };
}

const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date()); // AAAA-MM-DD

const filas = await filasPublicadas();
if (!filas.length) {
  console.error('Notion no devolvió ninguna fila con «Publicar en web» marcada. No se actualiza la web para no dejarla vacía.');
  process.exit(1);
}

await mkdir(new URL('assets/ponentes/', SITE), { recursive: true });
const eventos = (await Promise.all(filas.map(aEvento))).filter(e => e.fecha);

const futuros = eventos.filter(e => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
const pasados = eventos.filter(e => e.fecha < hoy).sort((a, b) => b.fecha.localeCompare(a.fecha));

// Un encuentro pasado sin título usa el nombre del evento de Notion
for (const e of pasados) if (!e.titulo) e.titulo = e._nombreEvento;
for (const e of eventos) delete e._nombreEvento;

const datos = { generado: new Date().toISOString(), proximo: futuros[0] || null, pasados };
await writeFile(new URL('data/eventos.json', SITE), JSON.stringify(datos, null, 2) + '\n');

console.log(`Listo: ${pasados.length} encuentros pasados; próximo: ${datos.proximo ? `${datos.proximo.fecha} con ${datos.proximo.nombre}` : 'ninguno'}.`);
