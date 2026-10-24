// Histórico diario que calcula la automatización de Boost.space.
// Lo deja en public/data/historico.json la tarea de GitHub Actions; si no existe, la sección no se muestra.

export interface DiaHistorico {
  fecha: string;
  precioMedio: number;
  mejorFranja: string;
  precioMejor: number;
  peorFranja: string;
  precioPeor: number;
  ahorro: number;
  recomendacion: string;
}

export async function cargarHistorico(): Promise<DiaHistorico[]> {
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}data/historico.json`);
    if (!r.ok) return [];
    return await r.json();
  } catch {
    return [];
  }
}
