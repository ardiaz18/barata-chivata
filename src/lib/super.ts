// La cesta de la cabra: precios de hoy en cada cadena (public/data/super.json, generado por
// scripts/build-data.mjs) y la evolución diaria que guarda la automatización de Boost.space.

export interface PrecioTienda {
  precio: number; // lo que cuesta el envase hoy, oferta incluida
  precioCesta: number; // precio por unidad × cantidad de referencia: lo que se compara
  oferta: boolean;
  articulo: string;
  url: string;
}

export interface ProductoCesta {
  id: string;
  nombre: string;
  unidad: string;
  referencia: number;
  precios: Record<string, PrecioTienda>;
}

export interface DatosSuper {
  actualizado: string;
  cadenas: Record<string, { nombre: string; web: string }>;
  productos: ProductoCesta[];
  evolucion: { fecha: string; totales: Record<string, number> }[];
}

export async function cargarSuper(): Promise<DatosSuper | null> {
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}data/super.json`);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

/** Solo cuentan los productos que tienen precio en todas las cadenas, para comparar lo mismo. */
export function comparables(d: DatosSuper): ProductoCesta[] {
  const cadenas = Object.keys(d.cadenas);
  return d.productos.filter((p) => cadenas.every((c) => p.precios[c]));
}

export function totales(d: DatosSuper): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of comparables(d)) for (const [c, v] of Object.entries(p.precios)) out[c] = (out[c] ?? 0) + v.precioCesta;
  return out;
}

/** Cadena más barata para un producto, o null si empatan (diferencia de menos de medio céntimo). */
export function ganadora(p: ProductoCesta): string | null {
  const orden = Object.entries(p.precios).sort((a, b) => a[1].precioCesta - b[1].precioCesta);
  if (orden.length < 2 || orden[1][1].precioCesta - orden[0][1].precioCesta < 0.005) return null;
  return orden[0][0];
}
