import { useMemo, useState } from "react";
import { eurLitro, euros, km } from "../lib/formato";
import {
  bonito,
  buscarLugar,
  cargarGasolineras,
  cercanas,
  COMBUSTIBLES,
  esCodigoPostal,
  municipios,
  type Combustible,
  type DatosGasolina,
  type Lugar as Punto,
  type Municipio,
} from "../lib/gasolina";
import { useAparece } from "../lib/useAparece";
import { Mapa } from "./Mapa";
import "./Gasolina.css";

const RADIOS = [5, 10, 25];
const DEPOSITO = 50;

export function Gasolina() {
  const [datos, setDatos] = useState<DatosGasolina | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [combustible, setCombustible] = useState<Combustible>("g95");
  const [radio, setRadio] = useState(10);
  const [punto, setPunto] = useState<Punto | null>(null);
  const [busqueda, setBusqueda] = useState("");
  // La lista pesa ~400 KB comprimida: se pide al llegar a esta sección, no al abrir la página.
  const ref = useAparece<HTMLDivElement>(() => void asegurarDatos());

  async function asegurarDatos() {
    if (datos) return datos;
    try {
      const d = await cargarGasolineras();
      setDatos(d);
      return d;
    } catch {
      setError("No hemos podido cargar los precios del Ministerio. Prueba otra vez en un momento.");
      return null;
    }
  }

  async function usarUbicacion() {
    if (!("geolocation" in navigator)) {
      setError("Tu navegador no comparte la ubicación. Escribe tu código postal.");
      return;
    }
    setCargando(true);
    setError(null);
    const [d, pos] = await Promise.all([
      asegurarDatos(),
      new Promise<GeolocationPosition | null>((ok) =>
        navigator.geolocation.getCurrentPosition(ok, () => ok(null), { enableHighAccuracy: false, timeout: 10000 }),
      ),
    ]);
    setCargando(false);
    if (!d) return;
    if (!pos) {
      setError("Sin permiso para ver tu ubicación. Escribe tu código postal y listo.");
      return;
    }
    setPunto({ lat: pos.coords.latitude, lon: pos.coords.longitude, nombre: "tu ubicación" });
  }

  const listaMunicipios = useMemo(() => (datos ? municipios(datos) : []), [datos]);

  // Al escribir: se busca solo en cuanto hay un código postal completo o un municipio de la lista.
  async function escribir(texto: string) {
    setBusqueda(texto);
    setError(null);
    if (esCodigoPostal(texto) || listaMunicipios.some((m) => etiqueta(m) === texto)) await buscar(texto);
  }

  async function buscar(texto: string) {
    if (!texto.trim()) return;
    const d = await asegurarDatos();
    if (!d) return;
    try {
      const lugar = await buscarLugar(texto, municipios(d));
      if (lugar) {
        setError(null);
        setPunto(lugar);
      } else {
        setError(
          esCodigoPostal(texto)
            ? `No encontramos el código postal ${texto.trim()}. ¿Seguro que está bien?`
            : "No encontramos ese municipio. Elige uno de la lista o escribe tu código postal.",
        );
      }
    } catch {
      setError("No hemos podido cargar los códigos postales. Prueba otra vez en un momento.");
    }
  }

  const resultados = useMemo(
    () => (datos && punto ? cercanas(datos, punto.lat, punto.lon, radio, combustible) : null),
    [datos, punto, radio, combustible],
  );

  return (
    <section id="gasolina" className="section wrap" aria-labelledby="gas-titulo">
      <div className="section-head aparece" ref={ref}>
        <h2 id="gas-titulo">La gasolinera más barata cerca de ti</h2>
        <p>Los precios que cada gasolinera de España comunica al Ministerio, ordenados de más barato a más caro.</p>
      </div>

      <div className="gas-panel">
        <div className="gas-fila">
          <div className="opciones" role="group" aria-label="Combustible">
            {COMBUSTIBLES.map((c) => (
              <button key={c.id} aria-pressed={combustible === c.id} onClick={() => setCombustible(c.id)}>
                {c.nombre}
              </button>
            ))}
          </div>
          <div className="opciones" role="group" aria-label="Distancia máxima">
            {RADIOS.map((r) => (
              <button key={r} aria-pressed={radio === r} onClick={() => setRadio(r)}>
                {r} km
              </button>
            ))}
          </div>
        </div>

        <div className="gas-fila">
          <button className="btn" onClick={usarUbicacion} disabled={cargando}>
            {cargando ? "Buscando…" : "Usar mi ubicación"}
          </button>
          <span className="gas-o">o</span>
          <form
            className="gas-buscar"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              void buscar(busqueda);
            }}
          >
            <label>
              <span className="visually-hidden">Código postal o municipio</span>
              <input
                type="search"
                list="municipios"
                inputMode="search"
                autoComplete="postal-code"
                placeholder="Código postal o municipio"
                value={busqueda}
                onFocus={asegurarDatos}
                onChange={(e) => void escribir(e.target.value)}
              />
            </label>
            <button className="btn secundario" type="submit">
              Buscar
            </button>
            <datalist id="municipios">
              {listaMunicipios.map((m) => (
                <option key={`${m.nombre}|${m.provincia}`} value={etiqueta(m)} />
              ))}
            </datalist>
          </form>
        </div>
        {error && <p className="gas-aviso">{error}</p>}
      </div>

      {!punto && <MediasHoy datos={datos} />}

      {resultados && punto && datos && (
        <Resultados
          lista={resultados}
          punto={punto}
          radio={radio}
          media={datos.mediaNacional[combustible]}
          combustible={COMBUSTIBLES.find((c) => c.id === combustible)!.nombre}
        />
      )}

      <p className="fuente">
        Fuente:{" "}
        <a href="https://geoportalgasolineras.es/geoportal-instalaciones/Inicio" target="_blank" rel="noreferrer">
          Ministerio para la Transición Ecológica y el Reto Demográfico
        </a>
        {datos ? `, precios publicados el ${datos.actualizado.replace(" ", " a las ").slice(0, -3)}` : ""}. Se
        actualizan cada media hora.
      </p>
    </section>
  );
}

const etiqueta = (m: Municipio) => `${bonito(m.nombre)} (${bonito(m.provincia)})`;

/** Antes de buscar: cuánto cuesta hoy cada combustible de media en España. */
function MediasHoy({ datos }: { datos: DatosGasolina | null }) {
  return (
    <div className="gas-medias">
      <h3>Hoy, de media en España</h3>
      <dl>
        {COMBUSTIBLES.map((c) => (
          <div key={c.id}>
            <dt>{c.nombre}</dt>
            <dd className="num">
              {datos ? (datos.mediaNacional[c.id] ? eurLitro(datos.mediaNacional[c.id]!) : "—") : "…"}
            </dd>
          </div>
        ))}
      </dl>
      <p>Dinos dónde estás y la cabra te dice dónde pagar menos que esto.</p>
    </div>
  );
}

function Resultados({
  lista,
  punto,
  radio,
  media,
  combustible,
}: {
  lista: ReturnType<typeof cercanas>;
  punto: Punto;
  radio: number;
  media: number | null;
  combustible: string;
}) {
  if (lista.length === 0)
    return (
      <p className="gas-vacio">
        Ni una gasolinera con {combustible.toLowerCase()} a menos de {radio} km de {punto.nombre}. Prueba con más
        distancia.
      </p>
    );

  const [mejor, ...resto] = lista;
  const mediaZona = lista.reduce((s, e) => s + e.precio, 0) / lista.length;
  const masCara = lista[lista.length - 1];
  const mapa = `https://www.google.com/maps/dir/?api=1&destination=${mejor.lat},${mejor.lon}`;

  return (
    <div className="gas-resultado">
      <article className="gas-ganadora" aria-label="La más barata">
        <div>
          <p className="gas-rotulo">{bonito(mejor.rotulo)}</p>
          <p className="gas-precio num">{eurLitro(mejor.precio)}</p>
          <p className="gas-dir">
            {bonito(mejor.direccion)}, {bonito(mejor.municipio)} · a {km(mejor.distancia)} de {punto.nombre}
          </p>
          <p className="gas-horario">Horario: {mejor.horario}</p>
        </div>
        <div className="gas-ahorro">
          <p>
            Llenar {DEPOSITO} litros aquí te ahorra{" "}
            <strong className="nivel-barato num">{euros((mediaZona - mejor.precio) * DEPOSITO)}</strong> frente a la
            media de la zona
            {lista.length > 1 && (
              <>
                {" "}
                y <strong className="nivel-barato num">{euros((masCara.precio - mejor.precio) * DEPOSITO)}</strong>{" "}
                frente a la más cara
              </>
            )}
            .
          </p>
          {media && (
            <p className="gas-media">
              Media de España hoy: <span className="num">{eurLitro(media)}</span>
            </p>
          )}
          <a className="btn" href={mapa} target="_blank" rel="noreferrer">
            Cómo llegar
          </a>
        </div>
      </article>

      <Mapa punto={punto} estaciones={lista.slice(0, 10)} />

      {resto.length > 0 && (
        <table className="gas-lista">
          <caption className="visually-hidden">Siguientes gasolineras más baratas</caption>
          <tbody>
            {resto.slice(0, 9).map((e) => (
              <tr key={`${e.lat},${e.lon}`}>
                <th scope="row">
                  {bonito(e.rotulo)}
                  <span>
                    {bonito(e.direccion)}, {bonito(e.municipio)}
                  </span>
                </th>
                <td className="num">{km(e.distancia)}</td>
                <td className="num dcha">{eurLitro(e.precio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
