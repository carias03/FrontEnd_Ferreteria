/**
 * baseApi.js
 * Clase base para todas las llamadas HTTP del proyecto FerreSystem.
 *
 * ✔ En desarrollo:
 *    /users → proxy a http://localhost:8080
 *    /inv   → proxy a http://localhost:8081
 *
 * ✔ En producción:
 *    Usa variables de entorno de Vercel:
 *    process.env.USERS_API_URL
 *    process.env.INV_API_URL
 */

// Detecta si estamos en local
const isDev = window.location.hostname === "localhost";

// Prefijos dinámicos según entorno
const API_PREFIXES = {
  users: isDev ? "/api/users" : process.env.USERS_API_URL,
  inv: isDev ? "/api/inv" : process.env.INV_API_URL,
};

// ==============================
// Error personalizado
// ==============================
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ==============================
// Clase base
// ==============================
export class BaseApi {
  /**
   * @param {'users'|'inv'} apiType
   * @param {string} resource Ej: '/api/productos'
   */
  constructor(apiType, resource) {
    this.baseUrl = API_PREFIXES[apiType];

    if (!this.baseUrl) {
      throw new Error(
        `Base URL no definida para '${apiType}'. Verifica variables de entorno.`,
      );
    }

    this.resource = resource;
  }

  // Construye URL completa
  _url(path = "") {
    return `${this.baseUrl}${this.resource}${path}`;
  }

  // Headers base
  _headers(extra = {}) {
    return {
      "Content-Type": "application/json",
      ...extra,
    };
  }

  // Manejo de respuestas
  async _handleResponse(response) {
    if (response.status === 204) return null;

    let data = null;
    let text = null;

    try {
      text = await response.text();
      data = JSON.parse(text);
    } catch {
      // No era JSON — quedó como texto plano en `text`
    }

    if (!response.ok) {
      const message =
        data?.message ||
        data?.error ||
        text || // texto plano del backend
        `Error ${response.status}: ${response.statusText}`;
      throw new ApiError(message, response.status, data);
    }

    return data;
  }

  // ==============================
  // Métodos HTTP
  // ==============================

  async get(path = "", params = {}) {
    const rawUrl = this._url(path);

    // 👇 clave: manejar relativa vs absoluta
    const url = rawUrl.startsWith("http")
      ? new URL(rawUrl)
      : new URL(rawUrl, window.location.origin);

    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, v);
      }
    });

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: this._headers(),
    });

    return this._handleResponse(response);
  }

  async post(path = "", body = {}) {
    const response = await fetch(this._url(path), {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify(body),
    });
    return this._handleResponse(response);
  }

  async put(path = "", body = {}) {
    const response = await fetch(this._url(path), {
      method: "PUT",
      headers: this._headers(),
      body: JSON.stringify(body),
    });
    return this._handleResponse(response);
  }

  async patch(path = "", body = {}) {
    const response = await fetch(this._url(path), {
      method: "PATCH",
      headers: this._headers(),
      body: JSON.stringify(body),
    });
    return this._handleResponse(response);
  }

  async delete(path = "") {
    const response = await fetch(this._url(path), {
      method: "DELETE",
      headers: this._headers(),
    });
    return this._handleResponse(response);
  }

  // ==============================
  // Helpers CRUD
  // ==============================

  getAll() {
    return this.get();
  }
  getById(id) {
    return this.get(`/${id}`);
  }
  create(body) {
    return this.post("", body);
  }
  update(id, body) {
    return this.put(`/${id}`, body);
  }
  remove(id) {
    return this.delete(`/${id}`);
  }
}
