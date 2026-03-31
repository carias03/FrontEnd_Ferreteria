/**
 * productosApi.js
 * POST   /api/productos          → { codigo, nombre, descripcion, precioCompra, precioVenta, unidadMedida, idCategoria }
 * PUT    /api/productos/{id}     → { codigo, nombre, descripcion, precioCompra, precioVenta, unidadMedida, idCategoria }
 * PATCH  /api/productos/{id}/desactivar
 * PATCH  /api/productos/{id}/activar
 * GET    /api/productos/{id}
 * GET    /api/productos
 */

import { BaseApi } from "./baseApi.js";

class ProductosApi extends BaseApi {
  constructor() {
    super("inv", "/api/productos");
  }

  desactivar(id) {
    return this.patch(`/${id}/desactivar`);
  }

  activar(id) {
    return this.patch(`/${id}/activar`);
  }

  // getAll, getById, create, update heredados de BaseApi
}

export const productosApi = new ProductosApi();
