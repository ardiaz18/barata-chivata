import { useEffect, useState } from "react";
import { Cabecera, Pie } from "./components/Marco";
import { Fuentes } from "./components/Fuentes";
import { Gasolina } from "./components/Gasolina";
import { Historico } from "./components/Historico";
import { Luz } from "./components/Luz";
import { Portada } from "./components/Portada";
import { fechaMadrid } from "./lib/formato";
import { cargarLuz, type DiaLuz } from "./lib/luz";

export default function App() {
  // undefined = cargando, null = Red Eléctrica no ha respondido
  const [hoy, setHoy] = useState<DiaLuz | null | undefined>(undefined);

  useEffect(() => {
    cargarLuz(fechaMadrid())
      .then(setHoy)
      .catch(() => setHoy(null));
  }, []);

  return (
    <>
      <Cabecera />
      <main>
        <Portada hoy={hoy} />
        <Luz hoy={hoy} />
        <Gasolina />
        <Historico />
        <Fuentes />
      </main>
      <Pie />
    </>
  );
}
