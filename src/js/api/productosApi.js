/**
 * productosApi.js
 * POST   /api/productos          → { codigo, nombre, descripcion, precioCompra, precioVenta, unidadMedida, idCategoria }
 * PUT    /api/productos/{id}     → { codigo, nombre, descripcion, precioCompra, precioVenta, unidadMedida, idCategoria }
 * DELETE /api/productos/{id}
 * GET    /api/productos/{id}
 * GET    /api/productos
 */

import { BaseApi } from "./baseApi.js";

class ProductosApi extends BaseApi {
  constructor() {
    super("inv", "/api/productos");
  }
  // getAll, getById, create, update, remove heredados de BaseApi
}

export const productosApi = new ProductosApi();
