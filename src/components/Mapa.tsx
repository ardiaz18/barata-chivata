import { useEffect, useRef, useState } from "react";
import { eurLitro } from "../lib/formato";
import { bonito, type Cercana, type Lugar } from "../lib/gasolina";
import { CLAVE_GOOGLE, cargarGoogleMaps, MAP_ID } from "../lib/google";
import "./Mapa.css";

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const comoLlegar = (e: Cercana) => `https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lon}`;

const ficha = (e: Cercana) =>
  `<strong>${escapar(bonito(e.rotulo))}</strong><br>${escapar(eurLitro(e.precio))}<br>` +
  `${escapar(bonito(e.direccion))}<br><a href="${comoLlegar(e)}" target="_blank" rel="noreferrer">Cómo llegar</a>`;

const precioCorto = (e: Cercana) => eurLitro(e.precio).replace(" €/l", " €");

type Limpiar = () => void;

/** Google Maps con un marcador por gasolinera y su precio dentro. */
async function pintarGoogle(caja: HTMLDivElement, punto: Lugar, estaciones: Cercana[]): Promise<Limpiar> {
  await cargarGoogleMaps(CLAVE_GOOGLE!);
  const { Map, InfoWindow } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
  const { AdvancedMarkerElement } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;

  const mapa = new Map(caja, {
    mapId: MAP_ID,
    center: { lat: punto.lat, lng: punto.lon },
    zoom: 13,
    disableDefaultUI: true,
    zoomControl: true,
    fullscreenControl: true,
    gestureHandling: "cooperative",
  });
  const info = new InfoWindow();

  const tu = document.createElement("span");
  tu.className = "gmapa-tu";
  tu.textContent = "Tú";
  new AdvancedMarkerElement({ map: mapa, position: { lat: punto.lat, lng: punto.lon }, content: tu, title: punto.nombre });

  const limites = new google.maps.LatLngBounds({ lat: punto.lat, lng: punto.lon });
  estaciones.forEach((e, i) => {
    const chip = document.createElement("span");
    chip.className = `gmapa-precio${i === 0 ? " mejor" : ""}`;
    chip.textContent = precioCorto(e);
    const marcador = new AdvancedMarkerElement({
      map: mapa,
      position: { lat: e.lat, lng: e.lon },
      content: chip,
      title: `${bonito(e.rotulo)}, ${eurLitro(e.precio)}`,
      zIndex: i === 0 ? 1000 : 100 - i,
      gmpClickable: true,
    });
    marcador.addListener("click", () => {
      info.setContent(ficha(e));
      info.open({ map: mapa, anchor: marcador });
    });
    limites.extend({ lat: e.lat, lng: e.lon });
  });

  mapa.fitBounds(limites, 56);
  return () => info.close();
}

/** Respaldo sin clave: OpenStreetMap con Leaflet. */
async function pintarLeaflet(caja: HTMLDivElement, punto: Lugar, estaciones: Cercana[]): Promise<Limpiar> {
  const L = await import("leaflet");
  await import("leaflet/dist/leaflet.css");
  const m = L.map(caja, { scrollWheelZoom: false });
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
        html: `<span>${precioCorto(e)}</span>`,
        iconSize: [80, 34],
        iconAnchor: [40, 40],
      }),
      zIndexOffset: i === 0 ? 1000 : -i,
      title: bonito(e.rotulo),
    })
      .bindPopup(ficha(e))
      .addTo(m);
  });

  const limites = L.latLngBounds([[punto.lat, punto.lon], ...estaciones.map((e) => [e.lat, e.lon] as [number, number])]);
  m.fitBounds(limites, { padding: [48, 48], maxZoom: 15 });
  return () => m.remove();
}

/** Mapa con las gasolineras más baratas. Usa Google Maps si la web se ha compilado con clave;
 *  si no hay clave o Google falla, OpenStreetMap. Se carga solo cuando hay resultados. */
export function Mapa({ punto, estaciones }: { punto: Lugar; estaciones: Cercana[] }) {
  const caja = useRef<HTMLDivElement>(null);
  const [motor, setMotor] = useState<"google" | "osm">(CLAVE_GOOGLE ? "google" : "osm");

  // Google avisa así de una clave mal restringida o sin facturación: mejor OpenStreetMap que un mapa roto.
  useEffect(() => {
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => setMotor("osm");
  }, []);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    let cancelado = false;
    let limpiar: Limpiar | undefined;
    const pintar = motor === "google" ? pintarGoogle : pintarLeaflet;
    pintar(el, punto, estaciones)
      .then((l) => (cancelado ? l() : (limpiar = l)))
      .catch(() => {
        if (!cancelado && motor === "google") setMotor("osm");
      });
    return () => {
      cancelado = true;
      limpiar?.();
      el.replaceChildren();
    };
  }, [motor, punto, estaciones]);

  const zona = `https://www.google.com/maps/search/gasolinera/@${punto.lat},${punto.lon},14z`;

  return (
    <figure className="mapa">
      <div key={motor} ref={caja} className="mapa-caja" role="region" aria-label="Mapa de gasolineras cercanas" />
      <figcaption>
        Toca un precio para ver la gasolinera y cómo llegar.{" "}
        <a href={zona} target="_blank" rel="noreferrer">
          Abrir la zona en Google Maps
        </a>
      </figcaption>
    </figure>
  );
}
