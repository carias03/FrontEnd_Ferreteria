/**
 * baseApi.js
 * Clase base para todas las llamadas HTTP del proyecto FerreSystem.
 *
 * Las rutas son RELATIVAS para que pasen por el proxy de Webpack DevServer:
 *   /users/*  →  http://localhost:8080  (PracticaAPI)
 *   /inv/*    →  http://localhost:8081  (InventarioAPI)
 *
 * En producción estas rutas deben ser manejadas por el servidor (nginx, etc.)
 */

const API_PREFIXES = {
  users: "/users",
  inv: "/inv",
};

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export class BaseApi {
  /**
   * @param {'users'|'inv'} apiType - cuál backend usar
   * @param {string} resource - path base del recurso, ej: '/api/productos'
   */
  constructor(apiType, resource) {
    this.baseUrl = API_PREFIXES[apiType];
    this.resource = resource;
  }

  _url(path = "") {
    return `${this.baseUrl}${this.resource}${path}`;
  }

  _headers(extra = {}) {
    return {
      "Content-Type": "application/json",
      ...extra,
    };
  }

  async _handleResponse(response) {
    if (response.status === 204) return null;

    let data = null;
    try {
      data = await response.json();
    } catch {
      // El body no era JSON — seguimos con null
    }

    if (!response.ok) {
      const message =
        data?.message ||
        data?.error ||
        `Error ${response.status}: ${response.statusText}`;
      throw new ApiError(message, response.status, data);
    }

    return data;
  }

  async get(path = "", params = {}) {
    const url = new URL(this._url(path), window.location.origin);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
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
