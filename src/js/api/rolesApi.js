/**
 * rolesApi.js
 * POST   /api/roles              → { nombre, descripcion }
 * PUT    /api/roles/{id}         → { nombre, descripcion }
 * DELETE /api/roles/{id}
 * GET    /api/roles/{id}
 * GET    /api/roles
 */

import { BaseApi } from "./baseApi.js";

class RolesApi extends BaseApi {
  constructor() {
    super("users", "/api/roles");
  }
  // getAll, getById, create, update, remove heredados de BaseApi
}

export const rolesApi = new RolesApi();
