import svg from "../assets/chivata.svg?raw";
import "./Chivata.css";

/** La mascota. Se balancea un poco y el bocadillo del € flota; quieta si se pide menos movimiento. */
export function Chivata({ tamano, animada = true }: { tamano: number | string; animada?: boolean }) {
  return (
    <span
      className={`chivata${animada ? " animada" : ""}`}
      style={{ width: tamano, height: tamano }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
