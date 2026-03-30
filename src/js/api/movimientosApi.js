/**
 * movimientosApi.js
 * POST   /api/movimientos                         → { idInventario, tipoMovimiento, cantidad, motivo, idUsuario }
 * GET    /api/movimientos/inventario/{idInventario}
 * GET    /api/movimientos/sucursal/{idSucursal}  (con parámetros: desde, hasta)
 */

import { BaseApi } from "./baseApi.js";

class MovimientosApi extends BaseApi {
  constructor() {
    super("inv", "/api/movimientos");
  }

  /**
   * Obtener movimientos de un inventario
   * @param {number} idInventario
   * @returns {Promise<Array>}
   */
  getByInventario(idInventario) {
    return this.get(`/inventario/${idInventario}`);
  }

  /**
   * Obtener movimientos de una sucursal por rango de fechas
   * @param {number} idSucursal
   * @param {string} desde - ISO datetime (ej: 2025-01-01T00:00:00)
   * @param {string} hasta - ISO datetime (ej: 2025-12-31T23:59:59)
   * @returns {Promise<Array>}
   */
  getBySucursal(idSucursal, desde, hasta) {
    return this.get(`/sucursal/${idSucursal}`, { desde, hasta });
  }
}

export const movimientosApi = new MovimientosApi();
