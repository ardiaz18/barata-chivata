// Gasolineras del Ministerio para la Transición Ecológica, ya compactadas por
// scripts/build-data.mjs en public/data/gasolineras.json.

export type Combustible = "g95" | "diesel" | "g98" | "glp";

export const COMBUSTIBLES: { id: Combustible; nombre: string }[] = [
  { id: "g95", nombre: "Gasolina 95" },
  { id: "diesel", nombre: "Diésel" },
  { id: "g98", nombre: "Gasolina 98" },
  { id: "glp", nombre: "GLP" },
];

export interface Estacion {
  lat: number;
  lon: number;
  rotulo: string;
  direccion: string;
  municipio: string;
  provincia: string;
  horario: string;
  cp: string;
  precios: Record<Combustible, number | null>;
}

export interface DatosGasolina {
  actualizado: string; // "24/10/2026 11:59:33", tal cual lo da el Ministerio
  mediaNacional: Record<Combustible, number | null>;
  estaciones: Estacion[];
}

type Fila = [number, number, string, string, string, string, string, string, ...(number | null)[]];

let cache: Promise<DatosGasolina> | null = null;

export function cargarGasolineras(): Promise<DatosGasolina> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/gasolineras.json`)
    .then((r) => {
      if (!r.ok) throw new Error("No se han podido cargar las gasolineras");
      return r.json();
    })
    .then((json: { actualizado: string; mediaNacional: DatosGasolina["mediaNacional"]; estaciones: Fila[] }) => ({
      actualizado: json.actualizado,
      mediaNacional: json.mediaNacional,
      estaciones: json.estaciones.map(([lat, lon, rotulo, direccion, municipio, provincia, horario, cp, g95, g98, diesel, glp]) => ({
        lat,
        lon,
        rotulo,
        direccion,
        municipio,
        provincia,
        horario,
        cp,
        precios: { g95: g95 ?? null, g98: g98 ?? null, diesel: diesel ?? null, glp: glp ?? null },
      })),
    }));
  cache.catch(() => (cache = null));
  return cache;
}

export function distanciaKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export interface Cercana extends Estacion {
  distancia: number;
  precio: number;
}

export function cercanas(datos: DatosGasolina, lat: number, lon: number, radioKm: number, c: Combustible): Cercana[] {
  const out: Cercana[] = [];
  for (const e of datos.estaciones) {
    const precio = e.precios[c];
    if (precio == null) continue;
    // Descarte rápido antes de calcular la distancia real.
    if (Math.abs(e.lat - lat) > radioKm / 100 || Math.abs(e.lon - lon) > radioKm / 70) continue;
    const distancia = distanciaKm(lat, lon, e.lat, e.lon);
    if (distancia <= radioKm) out.push({ ...e, distancia, precio });
  }
  return out.sort((a, b) => a.precio - b.precio || a.distancia - b.distancia);
}

export interface Municipio {
  nombre: string;
  provincia: string;
  lat: number;
  lon: number;
}

/** Centro aproximado de cada municipio: la media de las coordenadas de sus gasolineras. */
export function municipios(datos: DatosGasolina): Municipio[] {
  const acc = new Map<string, { nombre: string; provincia: string; lat: number; lon: number; n: number }>();
  for (const e of datos.estaciones) {
    const clave = `${e.municipio}|${e.provincia}`;
    const m = acc.get(clave) ?? { nombre: e.municipio, provincia: e.provincia, lat: 0, lon: 0, n: 0 };
    m.lat += e.lat;
    m.lon += e.lon;
    m.n += 1;
    acc.set(clave, m);
  }
  return [...acc.values()]
    .map(({ nombre, provincia, lat, lon, n }) => ({ nombre, provincia, lat: lat / n, lon: lon / n }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

type TablaCP = Record<string, [number, number, string]>;
let cacheCP: Promise<TablaCP> | null = null;

/** Centro de cada código postal (GeoNames), generado por scripts/build-data.mjs. */
export function cargarCodigosPostales(): Promise<TablaCP> {
  cacheCP ??= fetch(`${import.meta.env.BASE_URL}data/codigos-postales.json`).then((r) => {
    if (!r.ok) throw new Error("No se han podido cargar los códigos postales");
    return r.json();
  });
  cacheCP.catch(() => (cacheCP = null));
  return cacheCP;
}

export interface Lugar {
  lat: number;
  lon: number;
  nombre: string;
}

export const esCodigoPostal = (texto: string) => /^\d{5}$/.test(texto.trim());

/** Busca un código postal ("29007") o un municipio tal como sale en la lista ("Málaga (Málaga)" o "Málaga"). */
export async function buscarLugar(texto: string, lista: Municipio[]): Promise<Lugar | null> {
  const t = texto.trim();
  if (esCodigoPostal(t)) {
    const cp = (await cargarCodigosPostales())[t];
    return cp ? { lat: cp[0], lon: cp[1], nombre: `${t}, ${cp[2]}` } : null;
  }
  const normal = (s: string) =>
    s
      .toLocaleLowerCase("es-ES")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  const buscado = normal(t);
  const m =
    lista.find((x) => normal(`${x.nombre} (${x.provincia})`) === buscado) ??
    lista.find((x) => normal(x.nombre) === buscado);
  return m ? { lat: m.lat, lon: m.lon, nombre: bonito(m.nombre) } : null;
}

/** Los rótulos y municipios llegan en mayúsculas: "REPSOL" → "Repsol". */
export function bonito(s: string): string {
  return s.toLocaleLowerCase("es-ES").replace(/(^|[\s(/-])(\p{L})/gu, (_, sep, l) => sep + l.toLocaleUpperCase("es-ES"));
}
