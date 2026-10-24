// Carga de la API de Google Maps. La clave llega en tiempo de compilación (VITE_GOOGLE_MAPS_KEY):
// en el navegador siempre es visible, por eso se restringe en Google Cloud a los dominios de la web.

export const CLAVE_GOOGLE: string | undefined = import.meta.env.VITE_GOOGLE_MAPS_KEY || undefined;
// Los marcadores avanzados necesitan un Map ID; DEMO_MAP_ID solo vale para pruebas.
export const MAP_ID: string = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

let carga: Promise<void> | null = null;

export function cargarGoogleMaps(clave: string): Promise<void> {
  carga ??= new Promise<void>((ok, mal) => {
    const w = window as unknown as Record<string, unknown>;
    w.__barataGoogleListo = () => ok();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(clave)}&v=weekly&loading=async&language=es&region=ES&callback=__barataGoogleListo`;
    s.async = true;
    s.onerror = () => {
      carga = null;
      mal(new Error("No se ha podido cargar Google Maps"));
    };
    document.head.append(s);
  });
  return carga;
}
