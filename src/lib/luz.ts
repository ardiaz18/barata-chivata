// Precio PVPC hora a hora desde la API abierta de Red Eléctrica (REData).
const REE = "https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real";

export interface Hora {
  hora: string; // "HH:00"
  precio: number; // €/kWh
}

export interface DiaLuz {
  fecha: string;
  horas: Hora[];
  actualizado: string | null; // marca de tiempo que devuelve REE
}

export async function cargarLuz(fecha: string): Promise<DiaLuz | null> {
  const params = new URLSearchParams({
    start_date: `${fecha}T00:00`,
    end_date: `${fecha}T23:59`,
    time_trunc: "hour",
  });
  const r = await fetch(`${REE}?${params}`, { headers: { Accept: "application/json" } });
  if (!r.ok) return null;
  const json = await r.json();
  const serie = (json.included ?? []).find((s: { type: string }) => s.type === "PVPC");
  if (!serie) return null;
  const horas: Hora[] = serie.attributes.values
    .filter((v: { datetime: string }) => v.datetime.startsWith(fecha))
    .map((v: { datetime: string; value: number }) => ({
      hora: v.datetime.slice(11, 16),
      precio: v.value / 1000,
    }));
  // Un día completo tiene 23, 24 o 25 horas según el cambio de hora.
  if (horas.length < 23) return null;
  return { fecha, horas, actualizado: serie.attributes["last-update"] ?? json.data?.attributes?.["last-update"] ?? null };
}

export interface Franja {
  inicio: string;
  fin: string;
  media: number; // €/kWh medio durante la franja
  desde: number; // índice de la primera hora
}

/** Media de cada ventana de `duracion` horas seguidas (admite fracciones: 1,5 h). */
export function franjas(horas: Hora[], duracion: number): Franja[] {
  const completas = Math.ceil(duracion);
  const resto = duracion - Math.floor(duracion);
  const out: Franja[] = [];
  for (let i = 0; i + completas <= horas.length; i++) {
    let suma = 0;
    for (let j = 0; j < completas; j++) {
      const peso = j === completas - 1 && resto > 0 ? resto : 1;
      suma += horas[i + j].precio * peso;
    }
    const ultima = horas[i + completas - 1].hora;
    const minutos = resto > 0 ? Math.round(resto * 60) : 60;
    const finH = (Number(ultima.slice(0, 2)) + (minutos === 60 ? 1 : 0)) % 24;
    const finM = minutos === 60 ? "00" : String(minutos).padStart(2, "0");
    out.push({ inicio: horas[i].hora, fin: `${String(finH).padStart(2, "0")}:${finM}`, media: suma / duracion, desde: i });
  }
  return out;
}

export function mejorYPeor(horas: Hora[], duracion: number) {
  const vs = franjas(horas, duracion);
  const mejor = vs.reduce((a, b) => (b.media < a.media ? b : a));
  const peor = vs.reduce((a, b) => (b.media > a.media ? b : a));
  return { mejor, peor };
}

/** Umbrales de los tercios del día: por debajo del primero es barato, por encima del segundo, caro. */
export function tercios(horas: Hora[]): [number, number] {
  const ord = horas.map((h) => h.precio).sort((a, b) => a - b);
  return [ord[Math.floor(ord.length / 3)], ord[Math.floor((2 * ord.length) / 3)]];
}

export type Nivel = "barato" | "medio" | "caro";

export function nivel(precio: number, [bajo, alto]: [number, number]): Nivel {
  if (precio <= bajo) return "barato";
  if (precio >= alto) return "caro";
  return "medio";
}

export interface Aparato {
  nombre: string;
  horas: number;
  kwh: number; // consumo de un uso típico
}

export const APARATOS: Aparato[] = [
  { nombre: "Lavadora", horas: 2, kwh: 0.9 },
  { nombre: "Lavavajillas", horas: 2, kwh: 1.1 },
  { nombre: "Horno", horas: 1, kwh: 1.5 },
  { nombre: "Secadora", horas: 1.5, kwh: 2.5 },
  { nombre: "Coche eléctrico", horas: 4, kwh: 28 },
];
