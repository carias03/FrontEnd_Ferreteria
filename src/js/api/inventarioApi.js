/**
 * inventarioApi.js
 * POST   /api/inventario                          → { idSucursal, idProducto, stockMinimo, stockMaximo }
 * PATCH  /api/inventario/{id}/limites             → { stockMinimo, stockMaximo }
 * GET    /api/inventario/sucursal/{idSucursal}
 * GET    /api/inventario/sucursal/{idSucursal}/stock-bajo
 * GET    /api/inventario/producto/{idProducto}
 */

import { BaseApi } from "./baseApi.js";

class InventarioApi extends BaseApi {
  constructor() {
    super("inv", "/api/inventario");
  }

  /**
   * Obtener todo el inventario de una sucursal
   * @param {number} idSucursal
   * @returns {Promise<Array>}
   */
  getBySucursal(idSucursal) {
    return this.get(`/sucursal/${idSucursal}`);
  }

  /**
   * Obtener productos con stock bajo de una sucursal
   * @param {number} idSucursal
   * @returns {Promise<Array>}
   */
  getStockBajo(idSucursal) {
    return this.get(`/sucursal/${idSucursal}/stock-bajo`);
  }

  /**
   * Obtener inventario por producto
   * @param {number} idProducto
   * @returns {Promise<Array>}
   */
  getByProducto(idProducto) {
    return this.get(`/producto/${idProducto}`);
  }

  /**
   * Actualizar límites de stock (mínimo y máximo)
   * @param {number} id - ID del registro de inventario
   * @param {Object} body - { stockMinimo, stockMaximo }
   * @returns {Promise<Object>}
   */
  updateLimites(id, body) {
    return this.patch(`/${id}/limites`, body);
  }
}

export const inventarioApi = new InventarioApi();
