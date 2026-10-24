import { useEffect, useRef } from "react";
import { eurLitro } from "../lib/formato";
import { bonito, type Cercana, type Lugar } from "../lib/gasolina";
import "./Mapa.css";

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const comoLlegar = (e: Cercana) => `https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lon}`;

const ficha = (e: Cercana) =>
  `<strong>${escapar(bonito(e.rotulo))}</strong><br>${escapar(eurLitro(e.precio))}<br>` +
  `${escapar(bonito(e.direccion))}<br><a href="${comoLlegar(e)}" target="_blank" rel="noreferrer">Cómo llegar</a>`;

/** Mapa de OpenStreetMap con las gasolineras más baratas y su precio en cada chincheta.
 *  Leaflet se carga solo cuando hay resultados, para no pesar en la portada. */
export function Mapa({ punto, estaciones }: { punto: Lugar; estaciones: Cercana[] }) {
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    let cancelado = false;
    let quitar: (() => void) | undefined;

    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelado) return;

      const m = L.map(el, { scrollWheelZoom: false });
      quitar = () => m.remove();
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);

      L.marker([punto.lat, punto.lon], {
        icon: L.divIcon({ className: "mapa-tu", html: "<span>Tú</span>", iconSize: [44, 44], iconAnchor: [22, 22] }),
        title: punto.nombre,
      }).addTo(m);

      estaciones.forEach((e, i) => {
        L.marker([e.lat, e.lon], {
          icon: L.divIcon({
            className: `mapa-precio${i === 0 ? " mejor" : ""}`,
            html: `<span>${eurLitro(e.precio).replace(" €/l", " €")}</span>`,
            iconSize: [80, 34],
            iconAnchor: [40, 40],
          }),
          zIndexOffset: i === 0 ? 1000 : -i,
          title: bonito(e.rotulo),
        })
          .bindPopup(ficha(e))
          .addTo(m);
      });

      const limites = L.latLngBounds([
        [punto.lat, punto.lon],
        ...estaciones.map((e) => [e.lat, e.lon] as [number, number]),
      ]);
      m.fitBounds(limites, { padding: [48, 48], maxZoom: 15 });
    })();

    return () => {
      cancelado = true;
      quitar?.();
    };
  }, [punto, estaciones]);

  const zona = `https://www.google.com/maps/search/gasolinera/@${punto.lat},${punto.lon},14z`;

  return (
    <figure className="mapa">
      <div ref={caja} className="mapa-caja" role="region" aria-label="Mapa de gasolineras cercanas" />
      <figcaption>
        Toca un precio para ver la gasolinera y cómo llegar.{" "}
        <a href={zona} target="_blank" rel="noreferrer">
          Abrir la zona en Google Maps
        </a>
      </figcaption>
    </figure>
  );
}
