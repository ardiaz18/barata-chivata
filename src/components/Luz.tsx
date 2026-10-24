import { useEffect, useState } from "react";
import { Grafica } from "./Grafica";
import { eurKwh, euros, fechaLarga, fechaMadrid, horaCorta, horaMadrid } from "../lib/formato";
import { APARATOS, cargarLuz, mejorYPeor, type DiaLuz } from "../lib/luz";
import { useAparece } from "../lib/useAparece";
import "./Luz.css";

type Dia = "hoy" | "manana";

export function Luz({ hoy }: { hoy: DiaLuz | null | undefined }) {
  const [dia, setDia] = useState<Dia>("hoy");
  const [manana, setManana] = useState<DiaLuz | null | undefined>(undefined);
  const ref = useAparece<HTMLDivElement>();

  // Mañana solo existe a partir de ~20:15, cuando Red Eléctrica lo publica.
  useEffect(() => {
    cargarLuz(fechaMadrid(1))
      .then(setManana)
      .catch(() => setManana(null));
  }, []);

  const datos = dia === "hoy" ? hoy : manana;

  return (
    <section id="luz" className="section wrap" aria-labelledby="luz-titulo">
      <div className="section-head aparece" ref={ref}>
        <h2 id="luz-titulo">La luz, hora a hora</h2>
        <p>Verde, barato. Rojo, caro. La franja marcada son las tres horas seguidas más baratas del día.</p>
      </div>

      <div className="luz-controles">
        <div className="opciones" role="group" aria-label="Día">
          <button aria-pressed={dia === "hoy"} onClick={() => setDia("hoy")}>
            Hoy
          </button>
          <button
            aria-pressed={dia === "manana"}
            onClick={() => setDia("manana")}
            disabled={!manana}
            title={manana ? undefined : "Red Eléctrica publica los precios de mañana hacia las 20:15"}
          >
            Mañana
          </button>
        </div>
        {datos && <p className="luz-fecha">{fechaLarga(datos.fecha)}</p>}
        {!manana && manana !== undefined && dia === "hoy" && (
          <p className="luz-aviso">Los precios de mañana salen hacia las 20:15.</p>
        )}
      </div>

      {datos === undefined && <div className="esqueleto" style={{ height: 360, marginTop: 24 }} />}
      {datos === null && (
        <p className="luz-error">Red Eléctrica no ha respondido. Prueba a recargar en un momento.</p>
      )}
      {datos && <DiaDeLuz datos={datos} esHoy={dia === "hoy"} />}
    </section>
  );
}

function DiaDeLuz({ datos, esHoy }: { datos: DiaLuz; esHoy: boolean }) {
  const { mejor, peor } = mejorYPeor(datos.horas, 3);
  const media = datos.horas.reduce((s, h) => s + h.precio, 0) / datos.horas.length;
  const actualizado = datos.actualizado
    ? new Date(datos.actualizado).toLocaleString("es-ES", {
        timeZone: "Europe/Madrid",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <>
      <div className="luz-resumen">
        <p>
          <span className="luz-cifra num nivel-barato">
            {horaCorta(mejor.inicio)}–{horaCorta(mejor.fin)} h
          </span>
          la mejor franja, a {eurKwh(mejor.media)}
        </p>
        <p>
          <span className="luz-cifra num nivel-caro">
            {horaCorta(peor.inicio)}–{horaCorta(peor.fin)} h
          </span>
          la peor, a {eurKwh(peor.media)}
        </p>
        <p>
          <span className="luz-cifra num">{eurKwh(media).replace(" €/kWh", "")}</span>
          €/kWh de media en el día
        </p>
      </div>

      <Grafica horas={datos.horas} mejor={mejor} duracion={3} ahora={esHoy ? horaMadrid() : null} />

      <h3 className="luz-sub">¿Cuándo pongo…?</h3>
      <table className="aparatos">
        <thead>
          <tr>
            <th scope="col">Aparato</th>
            <th scope="col">Mejor momento</th>
            <th scope="col" className="dcha">
              Te cuesta
            </th>
            <th scope="col" className="dcha">
              A la peor hora
            </th>
          </tr>
        </thead>
        <tbody>
          {APARATOS.map((a) => {
            const f = mejorYPeor(datos.horas, a.horas);
            return (
              <tr key={a.nombre}>
                <th scope="row">{a.nombre}</th>
                <td className="num">
                  {f.mejor.inicio}–{f.mejor.fin}
                </td>
                <td className="num dcha nivel-barato">{euros(Math.max(0, f.mejor.media * a.kwh))}</td>
                <td className="num dcha nivel-caro">{euros(f.peor.media * a.kwh)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="fuente">
        Consumos de un uso típico: lavadora 0,9 kWh, lavavajillas 1,1, horno 1,5 y secadora 2,5. Fuente de los
        precios:{" "}
        <a href="https://www.ree.es/es/apidatos" target="_blank" rel="noreferrer">
          Red Eléctrica de España
        </a>
        {actualizado ? `, actualizado el ${actualizado}` : ""}. Precio PVPC de la energía, sin impuestos ni término de
        potencia.
      </p>
    </>
  );
}
