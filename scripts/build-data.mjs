// Genera los datos estáticos que la web no puede pedir en directo:
//  - public/data/gasolineras.json: precios oficiales del Ministerio, compactados
//    (la API completa pesa ~12 MB y no va comprimida).
//  - public/data/codigos-postales.json: centro de cada código postal (GeoNames, CC BY 4.0),
//    para buscar gasolineras escribiendo el código postal.
//  - public/data/super.json: precio de hoy de la cesta (datos/cesta.json) en Mercadona y Consum,
//    leído de sus tiendas online, y su evolución diaria guardada por la automatización de Boost.space.
//  - public/data/historico.json: histórico diario calculado por la automatización
//    de Boost.space. Solo si existe BOOSTSPACE_API_TOKEN, para no exponer el token.
// Se ejecuta en GitHub Actions cada 30 minutos y en local con `npm run data`.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";

const OUT = new URL("../public/data/", import.meta.url);
const MINETUR =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";
const GEONAMES = "https://download.geonames.org/export/zip/ES.zip";
const BOOSTSPACE = "https://aliciaruiz.boost.space/api/module/9/item";
const BOOSTSPACE_SUPER = "https://aliciaruiz.boost.space/api/module/13/item";
const CAMPOS_SUPER = { 3053: "fecha", 3057: "producto", 3061: "cadena", 3073: "precioCesta" };
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
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

// Mismas reglas que automatizaciones/cesta_super.py: precio pagado hoy (oferta incluida).
const LECTORES = {
  async mercadona(id) {
    const r = await fetch(`https://tienda.mercadona.es/api/products/${id}/?lang=es&wh=mad1`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!r.ok) throw new Error(`Mercadona ${id}: ${r.status}`);
    const j = await r.json();
    const pi = j.price_instructions;
    return {
      precio: Number(pi.unit_price),
      porKilo: Number(pi.reference_price || pi.bulk_price || 0),
      oferta: Boolean(pi.price_decreased),
      articulo: `${j.display_name} (${[j.packaging, pi.unit_size, pi.size_format].filter(Boolean).join(" ")})`,
      url: j.share_url,
    };
  },
  async consum(id) {
    const r = await fetch(`https://tienda.consum.es/api/rest/V1.0/catalog/product/${id}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!r.ok) throw new Error(`Consum ${id}: ${r.status}`);
    const j = await r.json();
    const ahora = new Date().toISOString();
    const vigentes = j.priceData.prices.filter((p) => (p.toDate ?? "9999") > ahora);
    const normal = vigentes.find((p) => p.id === "PRICE").value;
    const pagado = vigentes
      .filter((p) => p.id === "OFFER_PRICE")
      .map((p) => p.value)
      .reduce((a, b) => (b.centAmount < a.centAmount ? b : a), normal);
    return {
      precio: pagado.centAmount,
      porKilo: pagado.centUnitAmount,
      oferta: pagado.centAmount < normal.centAmount,
      articulo: j.productData.description,
      url: j.productData.url,
    };
  },
};

async function supermercados(token) {
  const cesta = JSON.parse(await readFile(new URL("../datos/cesta.json", import.meta.url), "utf8"));
  const cadenas = Object.keys(cesta.cadenas);

  const productos = await Promise.all(
    cesta.productos.map(async (p) => {
      const precios = {};
      await Promise.all(
        cadenas
          .filter((c) => p[c])
          .map(async (c) => {
            try {
              const { porKilo, ...leido } = await LECTORES[c](p[c].id);
              // La fruta y la verdura van al peso: se compara el precio por kilo que publica la tienda.
              const unidad = p.porKilo ? porKilo : leido.precio / p[c].cantidad;
              precios[c] = { ...leido, precioCesta: Math.round(unidad * p.referencia * 10000) / 10000 };
            } catch (e) {
              console.warn(`  sin precio: ${e.message}`);
            }
          }),
      );
      return { id: p.id, nombre: p.nombre, categoria: p.categoria, unidad: p.unidad, referencia: p.referencia, precios };
    }),
  );

  // Evolución diaria del total de la cesta, desde los registros de Boost.space.
  let evolucion = [];
  if (token) {
    const r = await fetch(`${BOOSTSPACE_SUPER}?filter=spaceId=21&limit=2000&order=id;DESC`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error(`Boost.space respondió ${r.status}`);
    const porDia = {};
    for (const rec of await r.json()) {
      const v = {};
      for (const cf of rec.customFieldsValues ?? []) {
        const campo = CAMPOS_SUPER[cf.customFieldInputId];
        if (campo) v[campo] = cf.value;
      }
      if (!v.fecha || !v.cadena) continue;
      const dia = (porDia[String(v.fecha).slice(0, 10)] ??= {});
      dia[v.cadena] = (dia[v.cadena] ?? 0) + Number(v.precioCesta);
    }
    evolucion = Object.entries(porDia)
      .map(([fecha, totales]) => ({
        fecha,
        totales: Object.fromEntries(Object.entries(totales).map(([c, t]) => [c, Math.round(t * 100) / 100])),
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  return {
    actualizado: new Date().toISOString(),
    cadenas: cesta.cadenas,
    categorias: cesta.categorias,
    productos,
    evolucion,
  };
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

const sup = await supermercados(token);
await writeFile(new URL("super.json", OUT), JSON.stringify(sup));
const completos = sup.productos.filter((p) => Object.keys(p.precios).length === Object.keys(sup.cadenas).length);
console.log(`super.json: ${completos.length}/${sup.productos.length} productos con precio en todas las cadenas, ${sup.evolucion.length} días de evolución`);

if (token) {
  const dias = await historico(token);
  await writeFile(new URL("historico.json", OUT), JSON.stringify(dias));
  console.log(`historico.json: ${dias.length} días`);
} else {
  console.log("Sin BOOSTSPACE_API_TOKEN: no se genera historico.json");
}
