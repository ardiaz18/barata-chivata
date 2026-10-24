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
            <a href="https://www.ree.es/es/apidatos" target="_blank" rel="noreferrer">
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
            <p>
              Para buscar por código postal usamos las coordenadas de{" "}
              <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">
                GeoNames
              </a>{" "}
              (CC BY 4.0), y el mapa es de{" "}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                OpenStreetMap
              </a>
              .
            </p>
            <a href="https://geoportalgasolineras.es/geoportal-instalaciones/Inicio" target="_blank" rel="noreferrer">
              Ver el Geoportal de gasolineras
            </a>
          </article>

          <article>
            <h3>El súper</h3>
            <p>
              No hay ninguna fuente oficial de precios de supermercado, así que la cabra mira directamente las{" "}
              <strong>tiendas online de Mercadona y Consum</strong> cada mañana, producto a producto, y guarda lo que ve.
            </p>
            <p>
              Compara 17 básicos de marca blanca del mismo tamaño. Cuando el peso no se declara igual en las dos (el atún,
              los garbanzos), compara envase con envase. Si un producto está de oferta, cuenta la oferta.
            </p>
            <p>Son precios online: en la tienda física pueden ser distintos. Dia y Carrefour no permiten leer sus precios.</p>
          </article>

          <article>
            <h3>El histórico</h3>
            <p>
              Dos automatizaciones hechas en <strong>Boost.space</strong> guardan cada día los datos: a las 20:45, los
              precios de la luz del día siguiente con su mejor y peor franja; a las 9:00, el precio de la cesta en cada
              supermercado. De ahí salen el diario de la luz y la evolución de la cesta.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
