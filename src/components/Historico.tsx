import { useEffect, useState } from "react";
import { eurKwh, fechaLarga } from "../lib/formato";
import { cargarHistorico, type DiaHistorico } from "../lib/historico";
import { useAparece } from "../lib/useAparece";
import "./Historico.css";

/** Lo que ha ido guardando la automatización de Boost.space. No aparece si aún no hay datos. */
export function Historico() {
  const [dias, setDias] = useState<DiaHistorico[]>([]);
  const ref = useAparece<HTMLDivElement>();

  useEffect(() => {
    cargarHistorico().then(setDias);
  }, []);

  if (dias.length === 0) return null;

  const ultimos = dias.slice(-14);
  const max = Math.max(...ultimos.map((d) => d.precioMedio), 0.01);

  return (
    <section id="historico" className="section wrap" aria-labelledby="hist-titulo">
      <div className="section-head aparece" ref={ref}>
        <h2 id="hist-titulo">Lo que la cabra ha chivado estos días</h2>
        <p>Cada noche a las 20:45 una automatización guarda el día siguiente. Este es su diario.</p>
      </div>

      <ol className="hist-lista">
        {[...ultimos].reverse().map((d) => (
          <li key={d.fecha}>
            <p className="hist-fecha">{fechaLarga(d.fecha)}</p>
            <div className="hist-barra" aria-hidden="true">
              <span style={{ width: `${Math.max(4, (d.precioMedio / max) * 100)}%` }} />
            </div>
            <p className="num">
              Media {eurKwh(d.precioMedio)} · mejor franja <strong className="nivel-barato">{d.mejorFranja}</strong> ·
              peor <strong className="nivel-caro">{d.peorFranja}</strong>
            </p>
          </li>
        ))}
      </ol>
      <p className="fuente">
        Datos de Red Eléctrica de España guardados a diario por una automatización en Boost.space.
      </p>
    </section>
  );
}
