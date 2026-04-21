/**
 * ventasApi.js
 *
 * POST   /api/ventas                        → { idSucursal, idUsuario }
 * POST   /api/ventas/{idVenta}/productos    → [{ idProducto, cantidad, precioUnitario }]
 * GET    /api/ventas/{id}
 * GET    /api/ventas/sucursal/{id}?desde=...&hasta=...
 */

import { BaseApi } from "./baseApi.js";

class VentasApi extends BaseApi {
  constructor() {
    super("inv", "/api/ventas");
  }

  /**
   * Paso 1 — crea el encabezado de la venta.
   * @param {{ idSucursal: number, idUsuario: number }} body
   */
  crear(body) {
    return this.post("", body);
  }

  /**
   * Paso 2 — agrega productos a una venta existente.
   * @param {number} idVenta
   * @param {Array<{ idProducto: number, cantidad: number, precioUnitario: number }>} productos
   */
  async agregarProductos(idVenta, productos, { idSucursal, idUsuario }) {
    for (const p of productos) {
      await this.post(`/${idVenta}/productos`, {
        idProducto: p.idProducto,
        cantidad: p.cantidad,
        idSucursal,
        idUsuario,
      });
    }
  }
  /**
   * GET /api/ventas/{id}
   */
  getById(id) {
    return this.get(`/${id}`);
  }

  /**
   * GET /api/ventas/sucursal/{id}?desde=...&hasta=...
   */
  getBySucursal(idSucursal, desde = null, hasta = null) {
    const params = {};

    const desdeFormatted = toDateTimeString(desde, false);
    const hastaFormatted = toDateTimeString(hasta, true);

    if (desdeFormatted) params.desde = desdeFormatted;
    if (hastaFormatted) params.hasta = hastaFormatted;

    return this.get(`/sucursal/${idSucursal}`, params);
  }
}

function toDateTimeString(date, endOfDay = false) {
  if (!date) return null;

  // Si ya viene como Date object
  if (date instanceof Date) {
    const iso = date.toISOString();
    return iso.slice(0, 19); // "YYYY-MM-DDTHH:mm:ss"
  }

  // Si viene como string tipo "2026-04-13"
  if (typeof date === "string") {
    return endOfDay ? `${date}T23:59:59` : `${date}T00:00:00`;
  }

  return null;
}

export const ventasApi = new VentasApi();
