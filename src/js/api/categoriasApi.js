/**
 * categoriasApi.js
 * POST   /api/categorias          → { nombre, descripcion }
 * PUT    /api/categorias/{id}     → { nombre, descripcion }
 * DELETE /api/categorias/{id}
 * GET    /api/categorias/{id}
 * GET    /api/categorias
 */

import { BaseApi } from "./baseApi.js";

class CategoriasApi extends BaseApi {
  constructor() {
    super("inv", "/api/categorias");
  }
  // getAll, getById, create, update, remove heredados de BaseApi
}

export const categoriasApi = new CategoriasApi();
