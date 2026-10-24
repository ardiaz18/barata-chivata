# Barata Chivata

Una cabra chivata que cotillea los precios oficiales de la luz y la gasolina y te sopla a qué hora y dónde te sale más barato.

Un proyecto de [lasapaixa.com](https://lasapaixa.com), hecho por [Alicia Ruiz](https://aliciaruiz.es).

## De dónde salen los datos

| Dato | Fuente | Cómo llega a la web |
| --- | --- | --- |
| Precio de la luz (PVPC) hora a hora | [Red Eléctrica de España, REData](https://www.ree.es/es/apidatos) | El navegador lo pide en directo. |
| Precio de cada gasolinera | [Ministerio para la Transición Ecológica](https://geoportalgasolineras.es/geoportal-instalaciones/Inicio) | `scripts/build-data.mjs` lo descarga y compacta cada 30 min (la API completa pesa 12 MB). |
| Coordenadas de cada código postal | [GeoNames](https://download.geonames.org/export/zip/) (CC BY 4.0) | El mismo script genera `codigos-postales.json`. |
| Mapa | [OpenStreetMap](https://www.openstreetmap.org/copyright) con Leaflet | Se carga solo al mostrar resultados. |
| Precio de la cesta del súper (17 básicos, `datos/cesta.json`) | Tiendas online de Mercadona y Consum (no hay fuente oficial) | El script lee el precio de hoy; la automatización de Boost.space `automatizaciones/cesta_super.py` lo guarda cada día a las 9:00 para la evolución. |
| Histórico diario de la luz | Automatización en Boost.space (cada día a las 20:45) | El mismo script lo lee con el token y publica `historico.json`, sin exponer el token. |

## En local

```bash
npm install
npm run data   # genera public/data/gasolineras.json (y historico.json si exportas BOOSTSPACE_API_TOKEN)
npm run dev
```

## Publicación

`.github/workflows/publicar.yml` regenera los datos y publica en GitHub Pages en cada push y cada 30 minutos.
Necesita el secreto del repositorio `BOOSTSPACE_API_TOKEN` para el histórico; sin él, la web funciona igual y oculta esa sección.