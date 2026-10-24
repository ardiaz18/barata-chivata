import { Chivata } from "./Chivata";
import { eurKwh, horaCorta, horaMadrid } from "../lib/formato";
import { mejorYPeor, nivel, tercios, type DiaLuz } from "../lib/luz";
import "./Portada.css";

const TEXTO_NIVEL = { barato: "Barato", medio: "Normalito", caro: "Caro" } as const;

function titular(hoy: DiaLuz) {
  const { mejor } = mejorYPeor(hoy.horas, 3);
  const franja = `de ${horaCorta(mejor.inicio)} a ${horaCorta(mejor.fin)} h`;
  return mejor.media <= 0.01 ? `Hoy la luz sale gratis ${franja}` : `Hoy la luz está más barata ${franja}`;
}

export function Portada({ hoy }: { hoy: DiaLuz | null | undefined }) {
  return (
    <section className="portada wrap" aria-labelledby="titular">
      <div className="portada-texto">
        <h1 id="titular">{hoy ? titular(hoy) : "La cabra que se chiva de los precios"}</h1>
        <p className="portada-lead">
          Barata Chivata cotillea cada día los precios oficiales de la luz y la gasolina y te sopla cuándo y dónde te
          sale más barato.
        </p>
        <div className="portada-acciones">
          <a className="btn" href="#luz">
            Ver la luz por horas
          </a>
          <a className="btn secundario" href="#gasolina">
            Buscar gasolinera barata
          </a>
        </div>
      </div>

      <div className="portada-cabra">
        <Chivata tamano="min(78vw, 420px)" />
        <AhoraMismo hoy={hoy} />
      </div>
    </section>
  );
}

function AhoraMismo({ hoy }: { hoy: DiaLuz | null | undefined }) {
  if (hoy === undefined) return <div className="ahora esqueleto" style={{ height: 168 }} />;
  if (hoy === null)
    return (
      <div className="ahora">
        <p>Red Eléctrica no responde ahora mismo. La cabra lo vuelve a intentar en un rato.</p>
      </div>
    );

  const hora = horaMadrid();
  const i = hoy.horas.findIndex((h) => h.hora === hora);
  const actual = hoy.horas[i] ?? hoy.horas[0];
  const umbrales = tercios(hoy.horas);
  const n = nivel(actual.precio, umbrales);
  const siguiente = hoy.horas.slice(i + 1).find((h) => nivel(h.precio, umbrales) === "barato");

  return (
    <div className="ahora">
      <p className="ahora-etiqueta">Ahora mismo, a las {horaCorta(actual.hora)}</p>
      <p className="ahora-precio num">
        {eurKwh(actual.precio)} <span className={`nivel-${n}`}>{TEXTO_NIVEL[n]}</span>
      </p>
      <p className="ahora-pista">
        {n === "barato"
          ? "Buen momento para poner la lavadora."
          : siguiente
            ? `Aguanta: a las ${horaCorta(siguiente.hora)} baja.`
            : "Hoy ya no baja más. Mañana será otro día."}
      </p>
      <p className="fuente">
        Fuente: <a href="#fuentes">Red Eléctrica de España</a> · precio PVPC sin impuestos
      </p>
    </div>
  );
}
