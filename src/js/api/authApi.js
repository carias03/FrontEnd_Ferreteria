/**
 * authApi.js
 * Comunicación con el endpoint de autenticación de PracticaAPI.
 * POST /api/auth/login → { username, password }
 */

import { BaseApi } from "./baseApi.js";

class AuthApi extends BaseApi {
  constructor() {
    super("users", "/api/auth");
  }

  /**
   * @param {string} username
   * @param {string} password
   * @returns {Promise<Object>} datos del usuario autenticado
   */
  login(username, password) {
    return this.post("/login", { username, password });
  }
}

export const authApi = new AuthApi();
