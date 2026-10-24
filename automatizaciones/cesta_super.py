# Automatización diaria de Boost.space: «La cesta de la cabra».
# Lee la cesta (datos/cesta.json del repositorio), consulta el precio de cada producto en las
# tiendas online de Mercadona y Consum y guarda un registro por producto, cadena y día.
# Si ya existe el registro de hoy, lo actualiza (se puede ejecutar varias veces sin duplicar).
import datetime
import os
from concurrent.futures import ThreadPoolExecutor
from zoneinfo import ZoneInfo

import requests

CESTA_URL = "https://raw.githubusercontent.com/ardiaz18/barata-chivata/main/datos/cesta.json"
MODULE_ID = 13
SPACE_ID = 21
STATUS_ACTIVO = 94
CAMPOS = {
    "fecha": 3053,
    "producto": 3057,
    "cadena": 3061,
    "articulo": 3065,
    "precio": 3069,
    "precio_cesta": 3073,
    "oferta": 3077,
}
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"


def precio_mercadona(pid):
    r = requests.get(
        f"https://tienda.mercadona.es/api/products/{pid}/",
        params={"lang": "es", "wh": "mad1"},
        headers={"User-Agent": UA, "Accept": "application/json"},
        timeout=20,
    )
    r.raise_for_status()
    j = r.json()
    pi = j["price_instructions"]
    nombre = f"{j['display_name']} ({j.get('packaging') or ''} {pi.get('unit_size') or ''} {pi.get('size_format') or ''})"
    return float(pi["unit_price"]), bool(pi.get("price_decreased")), " ".join(nombre.split())


def precio_consum(pid):
    r = requests.get(
        f"https://tienda.consum.es/api/rest/V1.0/catalog/product/{pid}",
        headers={"User-Agent": UA, "Accept": "application/json"},
        timeout=20,
    )
    r.raise_for_status()
    j = r.json()
    ahora = datetime.datetime.now(datetime.timezone.utc).isoformat()
    vigentes = [p for p in j["priceData"]["prices"] if p.get("toDate", "9999") > ahora]
    normal = next(p["value"]["centAmount"] for p in vigentes if p["id"] == "PRICE")
    oferta = [p["value"]["centAmount"] for p in vigentes if p["id"] == "OFFER_PRICE"]
    precio = min([normal, *oferta])
    return float(precio), precio < normal, j["productData"]["description"]


LECTORES = {"mercadona": precio_mercadona, "consum": precio_consum}


def bs_headers():
    return {"Authorization": f"Bearer {os.environ['BS_API_TOKEN']}", "Content-Type": "application/json"}


def registros_de_hoy(fecha):
    """{(producto, cadena): id} de los registros ya guardados hoy."""
    r = requests.get(
        f"{os.environ['BS_API_URL']}/module/{MODULE_ID}/item",
        headers=bs_headers(),
        params={"limit": 200, "order": "id;DESC", "filter": f"spaceId={SPACE_ID}"},
        timeout=30,
    )
    r.raise_for_status()
    out = {}
    for rec in r.json():
        v = {cf["customFieldInputId"]: cf.get("value") for cf in rec.get("customFieldsValues") or []}
        if str(v.get(CAMPOS["fecha"], ""))[:10] == fecha:
            out[(v.get(CAMPOS["producto"]), v.get(CAMPOS["cadena"]))] = rec["id"]
    return out


def main(input):
    params = input if isinstance(input, dict) else {}
    hoy = datetime.datetime.now(ZoneInfo("Europe/Madrid")).date().isoformat()
    cesta = requests.get(CESTA_URL, timeout=20).json()

    tareas = [(p, cadena) for p in cesta["productos"] for cadena in cesta["cadenas"] if cadena in p]

    def consultar(t):
        p, cadena = t
        try:
            precio, oferta, articulo = LECTORES[cadena](p[cadena]["id"])
            precio_cesta = round(precio / p[cadena]["cantidad"] * p["referencia"], 4)
            return {"producto": p["id"], "nombre": p["nombre"], "cadena": cadena, "articulo": articulo,
                    "precio": precio, "precio_cesta": precio_cesta, "oferta": oferta}
        except Exception as e:  # una tienda caída no debe tumbar toda la cesta
            return {"producto": p["id"], "cadena": cadena, "error": str(e)[:200]}

    with ThreadPoolExecutor(max_workers=8) as ex:
        resultados = list(ex.map(consultar, tareas))

    ok = [r for r in resultados if "error" not in r]
    errores = [r for r in resultados if "error" in r]
    totales = {}
    for r in ok:
        totales[r["cadena"]] = round(totales.get(r["cadena"], 0) + r["precio_cesta"], 2)

    if params.get("dry_run"):
        return {"fecha": hoy, "totales": totales, "errores": errores, "muestra": ok[:3]}

    existentes = registros_de_hoy(hoy)
    base = os.environ["BS_API_URL"]

    def guardar(r):
        body = {
            "name": f"{r['nombre']} · {cesta['cadenas'][r['cadena']]['nombre']} · {hoy}",
            "spaceId": SPACE_ID,
            "statusSystemId": STATUS_ACTIVO,
            "customFieldsValues": [
                {"customFieldInputId": CAMPOS["fecha"], "value": hoy},
                {"customFieldInputId": CAMPOS["producto"], "value": r["producto"]},
                {"customFieldInputId": CAMPOS["cadena"], "value": r["cadena"]},
                {"customFieldInputId": CAMPOS["articulo"], "value": r["articulo"]},
                {"customFieldInputId": CAMPOS["precio"], "value": r["precio"]},
                {"customFieldInputId": CAMPOS["precio_cesta"], "value": r["precio_cesta"]},
                {"customFieldInputId": CAMPOS["oferta"], "value": 1 if r["oferta"] else 0},
            ],
        }
        rid = existentes.get((r["producto"], r["cadena"]))
        if rid:
            resp = requests.put(f"{base}/record/{rid}", headers=bs_headers(), json=body, timeout=30)
        else:
            resp = requests.post(f"{base}/record", headers=bs_headers(), json=body, timeout=30)
        return resp.status_code < 300

    with ThreadPoolExecutor(max_workers=6) as ex:
        guardados = list(ex.map(guardar, ok))

    if errores and not ok:
        raise RuntimeError(f"Ninguna tienda ha respondido: {errores[:3]}")
    return {
        "fecha": hoy,
        "guardados": sum(guardados),
        "fallos_guardado": len(guardados) - sum(guardados),
        "totales": totales,
        "errores": errores,
    }
