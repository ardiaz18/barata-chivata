Gran cambio: la app pasa a llamarse **Barata Chivata** y crece de "solo luz" a "luz + gasolina". Te adjunto el logo (cabra guiñando un ojo: es la chivata que te sopla dónde está barato), su versión transparente y una hoja de estilo (styletile) que es la dirección de arte que hay que seguir al pie de la letra. Rehaz el diseño completo; conserva toda la lógica de datos que ya funciona (REE, Boost.space, cálculo de franjas, secreto BOOSTSPACE_API_TOKEN).

## 1. Marca
- Nombre: "Barata Chivata" en título, meta title/description, Open Graph y manifest. Favicon y apple-touch-icon a partir del logo adjunto (guárdalo en el proyecto; usa la versión transparente sobre fondos oliva).
- Créditos, PEQUEÑOS y solo en el footer: "Un proyecto de lasapaixa.com" (enlace a https://lasapaixa.com) y "Hecho por Alicia Ruiz" (enlace a https://aliciaruiz.es). Nada de esto en el hero ni en la cabecera.

## 2. Lo que SÍ se enfatiza: la confianza en los datos
Cada cifra grande lleva debajo, en una línea de texto normal (no badge, no pill), su fuente oficial y la hora de actualización real que devuelve la API: "Fuente: Red Eléctrica de España · actualizado 20:15" / "Fuente: Ministerio para la Transición Ecológica · actualizado 11:43". Crea una página "Fuentes" (enlazada en la cabecera) que explique en lenguaje llano de dónde sale cada dato, con enlaces a los datasets oficiales, cada cuánto se actualiza, qué incluye y qué no (impuestos, término de potencia). Tono: claro y con un punto pícaro de "chivatazo", nunca infantil.

## 3. Nueva sección: Gasolina (datos oficiales del Ministerio)
API pública sin clave, la misma que usa el Geoportal de gasolineras:
- Todas las estaciones: GET https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/
- Por provincia: .../EstacionesTerrestres/FiltroProvincia/{IDProvincia}; listados en .../Listados/Provincias/ y .../Listados/MunicipiosPorProvincia/{IDProvincia}
- Respuesta: { Fecha: "24/10/2026 11:43:17", ListaEESSPrecio: [...] }. Campos útiles: "Rótulo", "Dirección", "Localidad", "Municipio", "Provincia", "C.P.", "Horario", "Latitud", "Longitud (WGS84)", "Precio Gasolina 95 E5", "Precio Gasolina 98 E5", "Precio Gasoleo A", "Precio Gasoleo Premium", "Precio Gases licuados del petróleo". OJO: números con coma decimal ("1,459", "37,206167"), y precio vacío "" = no vende ese combustible.
- Hazlo en el backend, con caché de 30 min (la lista completa es grande).
- UI: botón "Usar mi ubicación" (geolocalización del navegador) y alternativa sin permisos: buscador de municipio. Selector de combustible (Gasolina 95, Diésel, Gasolina 98, GLP). Radio 5 / 10 / 25 km.
- Resultado: la gasolinera más barata cerca como protagonista (rótulo, precio en grande, distancia, dirección, horario, botón "Cómo llegar" a Google Maps), y debajo la lista de las 10 más baratas ordenadas por precio, como una tabla de una sola talla de letra (ver diseño). Muestra cuánto te ahorras en un depósito de 50 L respecto a la media de tu zona y respecto a la más cara del radio.
- Nada de pedir la ubicación al cargar: solo al pulsar el botón.

## 4. Estructura
Cabecera simple: logo + "Barata Chivata" a la izquierda; enlaces "Luz", "Gasolina", "Histórico", "Fuentes". Sin barra flotante ni efecto cristal.
Inicio = el chivatazo del día: a la izquierda un titular gigante con lo más jugoso de hoy (p. ej. "La luz, gratis a las 12"; máximo 2 líneas en cualquier ancho) y una frase debajo; a la derecha el **monolito de precios**: un bloque oliva que imita el poste de precios de una gasolinera, con filas LUZ (precio de la hora actual €/kWh), G95 y DIÉSEL (más barata cerca, si el usuario ha dado ubicación; si no, la media nacional de hoy) en cifras grandes color led amarillo, y la línea de fuente debajo. Después la sección de luz que ya tienes (gráfica por horas, electrodomésticos) y un acceso a gasolina.
Footer: campo oliva a todo el ancho, a pantalla completa, con columnas pequeñas arriba (Luz/Gasolina · Histórico/Fuentes · créditos lasapaixa.com y Alicia Ruiz) y abajo la palabra "BARATA CHIVATA" ocupando todo el ancho en una línea; debajo una línea legal pequeña.

## 5. Dirección de arte (la clave: que NO parezca hecho por IA)
Concepto: la estética del rótulo callejero español — el poste de precios de la gasolinera y la pizarra del mercado — aplicada a una app de precios.
- Tipografías (Google Fonts): **Big Shoulders 800** para titulares, cifras y rótulos (siempre en mayúsculas, interlineado 0.88, tracking -0.005em); **Public Sans 400/600** para todo lo que se lee (16–19 px, interlineado 1.5). Nada más.
- Paleta plana: fondo hueso #ECEBE7, superficie #E1DFD9, tinta oliva #38450F para TODO el texto, oliva suave #5D683A secundario, rojo rótulo #B3261E solo para "caro / evitar", led #F2C94C solo para las cifras dentro del monolito. En gráficas: barato = oliva, medio = #5D683A al 50 %, caro = rojo rótulo.
- Escala: muy grande contra pequeño, sin tallas intermedias. Las cifras importantes son enormes.
- Esquinas rectas en todo (botones, bloques, gráficas). Botón principal: relleno oliva con texto hueso.
- PROHIBIDO: degradados, sombras, glows, efecto cristal/blur, emojis, iconos dentro de cuadraditos de color, filas de tarjetas idénticas con icono arriba, etiquetas pequeñas en mayúsculas espaciadas encima de los títulos, badges/pills, numeración 01/02/03, tipografía monoespaciada, líneas finas divisorias (separa con espacio o con un cambio de tono de fondo), texto en gris claro.
- Las tarjetas de electrodomésticos actuales pásalas a una tabla limpia de una sola talla: electrodoméstico · mejor hora · coste en la mejor · coste en la peor.
- Mucho aire entre secciones (120–200 px en escritorio), márgenes laterales iguales, mobile-first impecable.
- Movimiento sobrio: entrada escalonada de titular → texto → bloque al aparecer cada sección (opacity + translateY 20 px), las cifras del monolito cuentan hasta su valor al cargar, feedback en hover/press de botones; respeta prefers-reduced-motion.
- Modo oscuro: fondo oliva muy oscuro #1d2408, texto hueso, mismo rojo y led.

## 6. Preparado para crecer
Deja la navegación y el código listos para añadir más adelante una sección "Súper" (comparador de supermercados), pero NO la muestres todavía.

Cuando termines, dime qué no has podido hacer exactamente como se pide.

(Adjuntar: barata-chivata-logo.png, barata-chivata-logo-transparent.png, styletile.png)
