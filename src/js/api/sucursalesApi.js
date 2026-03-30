/**
 * sucursalesApi.js
 * POST   /api/sucursales          → { nombre, direccion, telefono, correo }
 * PUT    /api/sucursales/{id}     → { nombre, direccion, telefono, correo }
 * DELETE /api/sucursales/{id}
 * GET    /api/sucursales/{id}
 * GET    /api/sucursales
 */

import { BaseApi } from "./baseApi.js";

class SucursalesApi extends BaseApi {
  constructor() {
    super("inv", "/api/sucursales");
  }
  // getAll, getById, create, update, remove heredados de BaseApi
}

export const sucursalesApi = new SucursalesApi();
