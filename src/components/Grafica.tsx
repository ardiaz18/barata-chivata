import { useState } from "react";
import { eurKwh, horaCorta } from "../lib/formato";
import { nivel, tercios, type Franja, type Hora } from "../lib/luz";

const COLOR = { barato: "var(--barato)", medio: "var(--medio)", caro: "var(--caro)" } as const;
const TEXTO = { barato: "barato", medio: "normalito", caro: "caro" } as const;

/** Barras de las 24 horas coloreadas por tercios, con la mejor franja marcada y la hora actual. */
export function Grafica({
  horas,
  mejor,
  duracion,
  ahora,
}: {
  horas: Hora[];
  mejor: Franja;
  duracion: number;
  ahora: string | null;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const umbrales = tercios(horas);
  const ancho = 1000;
  const alto = 340;
  const arriba = 36;
  const abajo = 40;
  const max = Math.max(...horas.map((h) => h.precio), 0.01);
  const min = Math.min(...horas.map((h) => h.precio), 0);
  const escala = (alto - arriba - abajo) / (max - min);
  const cero = arriba + max * escala;
  const paso = ancho / horas.length;
  const barra = paso * 0.7;
  const iAhora = ahora ? horas.findIndex((h) => h.hora === ahora) : -1;
  const anchoFranja = Math.ceil(duracion) * paso;
  const detalle = sel ?? (iAhora >= 0 ? iAhora : null);

  return (
    <figure className="grafica">
      <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label="Precio de la luz hora a hora">
        <rect x={mejor.desde * paso} y={8} width={anchoFranja} height={alto - abajo - 4} rx={18} fill="var(--barato-bg)" />
        <text x={mejor.desde * paso + 14} y={28} className="g-etiqueta" fill="var(--barato)">
          Mejor franja
        </text>
        {horas.map((h, i) => {
          const y = h.precio >= 0 ? cero - h.precio * escala : cero;
          const alt = Math.max(Math.abs(h.precio) * escala, 4);
          const n = nivel(h.precio, umbrales);
          return (
            <g key={`${h.hora}-${i}`}>
              <rect
                x={i * paso + (paso - barra) / 2}
                y={y}
                width={barra}
                height={alt}
                rx={Math.min(8, barra / 2)}
                fill={COLOR[n]}
                opacity={detalle === null || detalle === i ? 1 : 0.55}
              />
              <rect
                x={i * paso}
                y={0}
                width={paso}
                height={alto}
                fill="transparent"
                onMouseEnter={() => setSel(i)}
                onMouseLeave={() => setSel(null)}
                onClick={() => setSel(i)}
              >
                <title>{`${h.hora} · ${eurKwh(h.precio)}`}</title>
              </rect>
            </g>
          );
        })}
        {iAhora >= 0 && (
          <g pointerEvents="none">
            <path
              d={`M${iAhora * paso + paso / 2 - 9} ${alto - abajo + 22} l9 -12 l9 12 z`}
              fill="var(--ink)"
            />
          </g>
        )}
        {horas.map((h, i) =>
          i % 3 === 0 ? (
            <text key={`l${i}`} x={i * paso + paso / 2} y={alto - 6} textAnchor="middle" className="g-hora">
              {horaCorta(h.hora)}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="grafica-detalle num" aria-live="polite">
        {detalle !== null ? (
          <>
            <strong>
              {detalle === iAhora && sel === null ? "Ahora, " : ""}
              {horas[detalle].hora}
            </strong>{" "}
            · {eurKwh(horas[detalle].precio)} ·{" "}
            <span className={`nivel-${nivel(horas[detalle].precio, umbrales)}`}>
              {TEXTO[nivel(horas[detalle].precio, umbrales)]}
            </span>
          </>
        ) : (
          "Toca una barra para ver su precio."
        )}
      </figcaption>
    </figure>
  );
}
