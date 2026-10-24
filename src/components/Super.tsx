import { useEffect, useState } from "react";
import { euros, fechaLarga } from "../lib/formato";
import { cargarSuper, comparables, ganadora, totales, type DatosSuper } from "../lib/super";
import { useAparece } from "../lib/useAparece";
import "./Super.css";

const cantidad = (n: number, unidad: string) => {
  const num = n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
  if (unidad === "kg" && n < 1) return `${Math.round(n * 1000)} g`;
  if (unidad === "pieza") return "la pieza";
  if (unidad === "rollo") return `${num} rollos`;
  if (unidad === "docena" || unidad === "pack" || unidad === "tarro") return "";
  return `${num} ${unidad}`;
};

/** Logo de la cadena; si el logo no incluye el nombre, se escribe al lado. */
function Cadena({ c }: { c: DatosSuper["cadenas"][string] }) {
  if (!c.logo) return <>{c.nombre}</>;
  const src = `${import.meta.env.BASE_URL}${c.logo}`;
  return c.logoConNombre ? (
    <img className="super-logo ancho" src={src} alt={c.nombre} />
  ) : (
    <span className="super-cadena">
      <img className="super-logo" src={src} alt="" />
      {c.nombre}
    </span>
  );
}

export function Super() {
  const [datos, setDatos] = useState<DatosSuper | null | undefined>(undefined);
  const ref = useAparece<HTMLDivElement>();

  useEffect(() => {
    cargarSuper().then(setDatos);
  }, []);

  return (
    <section id="super" className="section wrap" aria-labelledby="super-titulo">
      <div className="section-head aparece" ref={ref}>
        <h2 id="super-titulo">La cesta de la cabra</h2>
        <p>
          {datos ? comparables(datos).length : "Unos 30"} básicos, de la despensa a la fruta, comparados cada día en
          Mercadona y Consum. Mismo producto, mismo tamaño.
        </p>
      </div>

      {datos === undefined && <div className="esqueleto" style={{ height: 320 }} />}
      {datos === null && <p className="super-aviso">Hoy la cabra no ha podido mirar los precios del súper. Vuelve en un rato.</p>}
      {datos && <Cesta datos={datos} />}
    </section>
  );
}

function Cesta({ datos }: { datos: DatosSuper }) {
  const [categoria, setCategoria] = useState("todo");
  const cadenas = Object.keys(datos.cadenas);
  const todos = comparables(datos);
  const lista = categoria === "todo" ? todos : todos.filter((p) => p.categoria === categoria);
  const tot = totales(lista);
  const que = categoria === "todo" ? "la cesta completa" : datos.categorias[categoria].toLowerCase();
  const orden = [...cadenas].sort((a, b) => tot[a] - tot[b]);
  const [barata, cara] = [orden[0], orden[orden.length - 1]];
  const diferencia = tot[cara] - tot[barata];
  const empates = lista.filter((p) => ganadora(p) === null).length;
  const hora = new Date(datos.actualizado).toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <div className="opciones super-categorias" role="group" aria-label="Categoría">
        {["todo", ...Object.keys(datos.categorias)].map((c) => (
          <button key={c} aria-pressed={categoria === c} onClick={() => setCategoria(c)}>
            {c === "todo" ? "Toda la cesta" : datos.categorias[c]}
          </button>
        ))}
      </div>

      <div className="super-veredicto">
        <p className="super-frase">
          {diferencia < 0.05 ? (
            <>Hoy, en {que}, empate: cuesta prácticamente lo mismo en las dos.</>
          ) : (
            <>
              Hoy, en {que}, gana <strong>{datos.cadenas[barata].nombre}</strong>: te ahorras{" "}
              <strong className="num">{euros(diferencia)}</strong>.
            </>
          )}{" "}
          En {empates} de {lista.length} productos cuestan exactamente lo mismo.
        </p>
        <dl className="super-totales">
          {orden.map((c) => (
            <div key={c} className={c === barata && diferencia >= 0.05 ? "gana" : undefined}>
              <dt><Cadena c={datos.cadenas[c]} /></dt>
              <dd className="num">{euros(tot[c])}</dd>
            </div>
          ))}
        </dl>
      </div>

      <table className="super-tabla">
        <caption className="visually-hidden">Precio de cada producto de la cesta en cada cadena</caption>
        <thead>
          <tr>
            <th scope="col">Producto</th>
            {cadenas.map((c) => (
              <th key={c} scope="col" className="dcha">
                <Cadena c={datos.cadenas[c]} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lista.map((p) => {
            const g = ganadora(p);
            const cant = cantidad(p.referencia, p.unidad);
            return (
              <tr key={p.id}>
                <th scope="row">
                  {p.nombre}
                  {cant && <span>{cant}</span>}
                </th>
                {cadenas.map((c) => {
                  const v = p.precios[c];
                  return (
                    <td key={c} className={`dcha num${g === c ? " gana" : ""}`}>
                      <a href={v.url} target="_blank" rel="noreferrer" title={v.articulo}>
                        {euros(v.precioCesta)}
                      </a>
                      {v.oferta && <span className="super-oferta">en oferta</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <Evolucion datos={datos} />

      <p className="fuente">
        Precios de las tiendas online de{" "}
        {cadenas.map((c, i) => (
          <span key={c}>
            {i > 0 && (i === cadenas.length - 1 ? " y " : ", ")}
            <a href={datos.cadenas[c].web} target="_blank" rel="noreferrer">
              {datos.cadenas[c].nombre}
            </a>
          </span>
        ))}
        , consultados el {hora}. Mercadona, en su catálogo de Madrid. En la tienda física pueden variar. Si un envase no
        tiene exactamente el tamaño de la cesta, su precio se ajusta a ese tamaño. Toca un precio para ver el producto en
        su web.
      </p>
    </>
  );
}

/** Total de la cesta por día y cadena, desde lo que va guardando Boost.space. */
function Evolucion({ datos }: { datos: DatosSuper }) {
  const dias = datos.evolucion;
  const cadenas = Object.keys(datos.cadenas);
  if (dias.length < 2) {
    return (
      <p className="super-evolucion-vacia">
        {dias.length === 1
          ? `La cabra empezó a apuntar precios el ${fechaLarga(dias[0].fecha)}. En unos días verás aquí cómo cambian.`
          : "La cabra apunta los precios cada mañana. En unos días verás aquí cómo cambian."}
      </p>
    );
  }

  const ancho = 1000;
  const alto = 260;
  const margen = 40;
  const derecha = 130; // sitio para la cifra final de cada línea
  const valores = dias.flatMap((d) => cadenas.map((c) => d.totales[c]).filter((v) => v != null));
  const min = Math.min(...valores) - 0.5;
  const max = Math.max(...valores) + 0.5;
  const x = (i: number) => margen + (i * (ancho - margen - derecha)) / (dias.length - 1);
  const ultimo = dias[dias.length - 1];
  const y = (v: number) => alto - margen - ((v - min) / (max - min)) * (alto - 2 * margen);
  // Colores neutros: el verde y el rojo ya significan «barato» y «caro» en toda la web.
  const colores = ["var(--ink)", "var(--medio)", "var(--soft)"];

  return (
    <figure className="super-evolucion">
      <h3>Cómo ha cambiado la cesta</h3>
      <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label="Total de la cesta por día en cada cadena">
        {cadenas.map((c, k) => (
          <polyline
            key={c}
            fill="none"
            stroke={colores[k % colores.length]}
            strokeWidth={5}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={dias
              .map((d, i) => (d.totales[c] != null ? `${x(i)},${y(d.totales[c])}` : ""))
              .filter(Boolean)
              .join(" ")}
          />
        ))}
        {cadenas.map((c, k) =>
          ultimo.totales[c] != null ? (
            <text
              key={`t-${c}`}
              x={x(dias.length - 1) + 16}
              y={y(ultimo.totales[c]) + 8}
              className="super-cifra"
              fill={colores[k % colores.length]}
            >
              {euros(ultimo.totales[c])}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption>
        {cadenas.map((c, k) => (
          <span key={c} style={{ color: colores[k % colores.length] }}>
            ● {datos.cadenas[c].nombre}
          </span>
        ))}
        <span className="num">
          Del {fechaLarga(dias[0].fecha)} al {fechaLarga(dias[dias.length - 1].fecha)}
        </span>
      </figcaption>
    </figure>
  );
}
