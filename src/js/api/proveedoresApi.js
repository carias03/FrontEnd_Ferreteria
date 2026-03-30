/**
 * proveedoresApi.js
 * POST   /api/proveedores          → { nombre, telefono, correo, direccion }
 * PUT    /api/proveedores/{id}     → { nombre, telefono, correo, direccion }
 * DELETE /api/proveedores/{id}
 * GET    /api/proveedores/{id}
 * GET    /api/proveedores
 */

import { BaseApi } from "./baseApi.js";

class ProveedoresApi extends BaseApi {
  constructor() {
    super("inv", "/api/proveedores");
  }
  // getAll, getById, create, update, remove heredados de BaseApi
}

export const proveedoresApi = new ProveedoresApi();
