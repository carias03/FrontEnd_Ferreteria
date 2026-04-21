/**
 * ordenesApi.js
 *
 * POST   /api/ordenes                           → { idSucursal, idProveedor, idUsuario }
 * POST   /api/ordenes/{idOrden}/productos       → { idProducto, cantidad, precioUnitario }
 * PATCH  /api/ordenes/{idOrden}/estado          → { nuevoEstado, idUsuario }
 * GET    /api/ordenes/{id}
 * GET    /api/ordenes/sucursal/{id}
 * GET    /api/ordenes/proveedor/{id}
 */

import { BaseApi } from "./baseApi.js";

class OrdenesApi extends BaseApi {
  constructor() {
    super("inv", "/api/ordenes");
  }

  crear(body) {
    return this.post("", body);
  }

  /**
   * Paso 2 — agrega productos uno por uno.
   * @param {number} idOrden
   * @param {Array<{ idProducto: number, cantidad: number, precioUnitario: number }>} productos
   */
  async agregarProductos(idOrden, productos) {
    for (const p of productos) {
      await this.post(`/${idOrden}/productos`, {
        idProducto: p.idProducto,
        cantidad: p.cantidad,
        precioUnitario: p.precioUnitario,
      });
    }
  }

  cambiarEstado(idOrden, estado, idUsuario) {
    return this.patch(`/${idOrden}/estado`, { nuevoEstado: estado, idUsuario });
  }

  getById(id) {
    return this.get(`/${id}`);
  }

  getBySucursal(idSucursal) {
    return this.get(`/sucursal/${idSucursal}`);
  }

  getByProveedor(idProveedor) {
    return this.get(`/proveedor/${idProveedor}`);
  }
}

export const ordenesApi = new OrdenesApi();
