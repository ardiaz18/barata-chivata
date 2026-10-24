import { Chivata } from "./Chivata";
import "./Marco.css";

export function Cabecera() {
  return (
    <header className="cabecera wrap">
      <a className="marca" href="#" aria-label="Barata Chivata, inicio">
        <Chivata tamano={48} animada={false} />
        <span className="marca-texto">Barata Chivata</span>
      </a>
      <nav aria-label="Secciones">
        <a href="#luz">Luz</a>
        <a href="#gasolina">Gasolina</a>
        <a href="#fuentes">Fuentes</a>
      </nav>
    </header>
  );
}

export function Pie() {
  return (
    <footer className="pie">
      <div className="wrap pie-dentro">
        <div className="pie-marca">
          <Chivata tamano={88} animada={false} />
          <p>
            Barata Chivata
            <span>La cabra que se chiva de los precios.</span>
          </p>
        </div>
        <p className="pie-creditos">
          Un proyecto de{" "}
          <a href="https://lasapaixa.com" target="_blank" rel="noreferrer">
            lasapaixa.com
          </a>{" "}
          · Hecho por{" "}
          <a href="https://aliciaruiz.es" target="_blank" rel="noreferrer">
            Alicia Ruiz
          </a>
        </p>
      </div>
    </footer>
  );
}
