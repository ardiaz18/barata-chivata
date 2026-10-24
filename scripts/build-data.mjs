// Genera los datos estáticos que la web no puede pedir en directo:
//  - public/data/gasolineras.json: precios oficiales del Ministerio, compactados
//    (la API completa pesa ~12 MB y no va comprimida).
//  - public/data/codigos-postales.json: centro de cada código postal (GeoNames, CC BY 4.0),
//    para buscar gasolineras escribiendo el código postal.
//  - public/data/historico.json: histórico diario calculado por la automatización
//    de Boost.space. Solo si existe BOOSTSPACE_API_TOKEN, para no exponer el token.
// Se ejecuta en GitHub Actions cada 30 minutos y en local con `npm run data`.
import { mkdir, writeFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";

const OUT = new URL("../public/data/", import.meta.url);
const MINETUR =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";
const GEONAMES = "https://download.geonames.org/export/zip/ES.zip";
const BOOSTSPACE = "https://aliciaruiz.boost.space/api/module/9/item";
const CAMPOS_BOOSTSPACE = {
  3017: "fecha",
  3021: "precioMedio",
  3025: "mejorFranja",
  3029: "precioMejor",
  3033: "peorFranja",
  3037: "precioPeor",
  3041: "ahorro",
  3045: "recomendacion",
};
// Orden de los precios dentro de cada estación compactada.
const COMBUSTIBLES = {
  g95: "Precio Gasolina 95 E5",
  g98: "Precio Gasolina 98 E5",
  diesel: "Precio Gasoleo A",
  glp: "Precio Gases licuados del petróleo",
};

const num = (s) => (s ? Number(String(s).replace(",", ".")) : null);

async function gasolineras() {
  const r = await fetch(MINETUR, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`Ministerio respondió ${r.status}`);
  const { Fecha, ListaEESSPrecio } = await r.json();
  const claves = Object.keys(COMBUSTIBLES);
  const suma = Object.fromEntries(claves.map((k) => [k, [0, 0]]));

  const estaciones = [];
  for (const e of ListaEESSPrecio) {
    const lat = num(e["Latitud"]);
    const lon = num(e["Longitud (WGS84)"]);
    if (lat == null || lon == null) continue;
    const precios = claves.map((k) => num(e[COMBUSTIBLES[k]]));
    if (precios.every((p) => p == null)) continue;
    precios.forEach((p, i) => {
      if (p != null) {
        suma[claves[i]][0] += p;
        suma[claves[i]][1] += 1;
      }
    });
    estaciones.push([
      Math.round(lat * 1e5) / 1e5,
      Math.round(lon * 1e5) / 1e5,
      e["Rótulo"].trim(),
      e["Dirección"].trim(),
      e["Municipio"].trim(),
      e["Provincia"].trim(),
      e["Horario"].trim(),
      e["C.P."].trim(),
      ...precios,
    ]);
  }

  const media = Object.fromEntries(
    claves.map((k) => [k, suma[k][1] ? Math.round((suma[k][0] / suma[k][1]) * 1000) / 1000 : null]),
  );
  return {
    actualizado: Fecha,
    campos: ["lat", "lon", "rotulo", "direccion", "municipio", "provincia", "horario", "cp", ...claves],
    mediaNacional: media,
    estaciones,
  };
}

/** { "29007": [lat, lon, "Málaga"] }. Un código postal puede cubrir varias localidades: se promedian. */
async function codigosPostales() {
  const r = await fetch(GEONAMES);
  if (!r.ok) throw new Error(`GeoNames respondió ${r.status}`);
  const zip = unzipSync(new Uint8Array(await r.arrayBuffer()));
  const acc = new Map();
  for (const linea of strFromU8(zip["ES.txt"]).split("\n")) {
    const c = linea.split("\t");
    if (c.length < 11) continue;
    const [, cp, lugar, , , provincia] = c;
    const lat = Number(c[9]);
    const lon = Number(c[10]);
    const v = acc.get(cp) ?? { lat: 0, lon: 0, n: 0, lugar, provincia };
    v.lat += lat;
    v.lon += lon;
    v.n += 1;
    acc.set(cp, v);
  }
  const out = {};
  for (const [cp, v] of acc) {
    out[cp] = [Math.round((v.lat / v.n) * 1e4) / 1e4, Math.round((v.lon / v.n) * 1e4) / 1e4, v.provincia];
  }
  return out;
}

async function historico(token) {
  const url = `${BOOSTSPACE}?filter=spaceId=17&limit=90&order=id;DESC`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Boost.space respondió ${r.status}`);
  const registros = await r.json();
  return registros
    .map((rec) => {
      const dia = {};
      for (const cf of rec.customFieldsValues ?? []) {
        const campo = CAMPOS_BOOSTSPACE[cf.customFieldInputId];
        if (campo) dia[campo] = cf.value;
      }
      if (dia.fecha) dia.fecha = String(dia.fecha).slice(0, 10);
      return dia;
    })
    .filter((d) => d.fecha)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

await mkdir(OUT, { recursive: true });

const gas = await gasolineras();
await writeFile(new URL("gasolineras.json", OUT), JSON.stringify(gas));
console.log(`gasolineras.json: ${gas.estaciones.length} estaciones, actualizado ${gas.actualizado}`);

const cps = await codigosPostales();
await writeFile(new URL("codigos-postales.json", OUT), JSON.stringify(cps));
console.log(`codigos-postales.json: ${Object.keys(cps).length} códigos`);

const token = process.env.BOOSTSPACE_API_TOKEN;
if (token) {
  const dias = await historico(token);
  await writeFile(new URL("historico.json", OUT), JSON.stringify(dias));
  console.log(`historico.json: ${dias.length} días`);
} else {
  console.log("Sin BOOSTSPACE_API_TOKEN: no se genera historico.json");
}
