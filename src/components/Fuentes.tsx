import { useAparece } from "../lib/useAparece";
import "./Fuentes.css";

export function Fuentes() {
  const ref = useAparece<HTMLDivElement>();
  return (
    <section id="fuentes" className="section fuentes" aria-labelledby="fuentes-titulo">
      <div className="wrap">
        <div className="section-head aparece" ref={ref}>
          <h2 id="fuentes-titulo">¿De dónde saca la cabra sus chivatazos?</h2>
          <p>De fuentes oficiales y abiertas. Nada de precios inventados ni estimados: lo que publican ellos, tal cual.</p>
        </div>

        <div className="fuentes-grid">
          <article>
            <h3>La luz</h3>
            <p>
              <strong>Red Eléctrica de España</strong>, el operador del sistema eléctrico, publica cada tarde hacia las
              20:15 el precio de la tarifa regulada (PVPC) para cada hora del día siguiente. Barata Chivata lo lee
              directamente de su API abierta, REData, cada vez que abres la página.
            </p>
            <p>
              Es el precio de la energía: no incluye impuestos ni el término de potencia de tu factura. Si tienes tarifa
              de mercado libre a precio fijo, la hora te da igual.
            </p>
            <a href="https://www.ree.es/es/datos/apidata" target="_blank" rel="noreferrer">
              Ver la API de Red Eléctrica
            </a>
          </article>

          <article>
            <h3>La gasolina</h3>
            <p>
              Todas las gasolineras de España están obligadas a comunicar sus precios al{" "}
              <strong>Ministerio para la Transición Ecológica y el Reto Demográfico</strong>, que los publica en su
              Geoportal de gasolineras. Barata Chivata recoge la lista completa cada media hora.
            </p>
            <p>Si una gasolinera cambia el precio y aún no lo ha comunicado, puede haber una pequeña diferencia.</p>
            <a href="https://geoportalgasolineras.es/" target="_blank" rel="noreferrer">
              Ver el Geoportal de gasolineras
            </a>
          </article>

          <article>
            <h3>El histórico</h3>
            <p>
              Cada noche a las 20:45 una automatización hecha en <strong>Boost.space</strong> descarga los precios de
              Red Eléctrica para el día siguiente, calcula la mejor y la peor franja y los guarda. De ahí sale el diario
              de la cabra.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
