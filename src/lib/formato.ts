const ZONA = "Europe/Madrid";

export const eurKwh = (v: number) =>
  `${v.toLocaleString("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} €/kWh`;

export const eurLitro = (v: number) =>
  `${v.toLocaleString("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} €/l`;

export const euros = (v: number) => {
  if (Math.abs(v) < 0.005) return "0 €";
  const decimales = Math.abs(v) < 10 ? 2 : 0;
  return `${v.toLocaleString("es-ES", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })} €`;
};

export const km = (v: number) =>
  v < 1 ? `${Math.round(v * 1000)} m` : `${v.toLocaleString("es-ES", { maximumFractionDigits: 1 })} km`;

/** Fecha ISO (YYYY-MM-DD) de hoy en hora peninsular, desplazada `dias`. */
export function fechaMadrid(dias = 0): string {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
  const d = new Date(`${hoy}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Hora actual en Madrid como "HH:00", para buscarla en la lista de precios. */
export function horaMadrid(): string {
  const h = new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, hour: "2-digit", hourCycle: "h23" }).format(new Date());
  return `${h.padStart(2, "0")}:00`;
}

/** "sábado 24 de octubre" */
export function fechaLarga(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

/** "12" o "12:30" para usar en frases: "de 12 a 15 h". */
export const horaCorta = (hhmm: string) => (hhmm.endsWith(":00") ? String(Number(hhmm.slice(0, 2))) : hhmm);
