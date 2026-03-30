/**
 * usuariosApi.js
 * Comunicación con PracticaAPI (/users)
 *
 * POST   /api/usuarios                           → { username, password, persona: { idPersona, nombre, apellidos, correo, telefono } }
 * PUT    /api/usuarios/{id}                      → { username, estado }
 * PATCH  /api/usuarios/{id}/password             → { nuevoPassword }
 * DELETE /api/usuarios/{id}
 * GET    /api/usuarios/{id}
 * GET    /api/usuarios
 * POST   /api/usuarios/{idUsuario}/roles/{idRol}
 * DELETE /api/usuarios/{idUsuario}/roles/{idRol}
 * GET    /api/usuarios/{idUsuario}/roles
 * GET    /api/usuarios/por-rol/{idRol}
 * GET    /api/usuarios/roles
 */

import { BaseApi } from "./baseApi.js";

class UsuariosApi extends BaseApi {
  constructor() {
    super("users", "/api/usuarios");
  }

  /**
   * Actualizar contraseña de un usuario
   * @param {number} id - ID del usuario
   * @param {string} nuevoPassword - Nueva contraseña
   * @returns {Promise<Object>}
   */
  updatePassword(id, nuevoPassword) {
    return this.patch(`/${id}/password`, { nuevoPassword });
  }

  /**
   * Asignar un rol a un usuario
   * @param {number} idUsuario
   * @param {number} idRol
   * @returns {Promise<Object>}
   */
  asignarRol(idUsuario, idRol) {
    return this.post(`/${idUsuario}/roles/${idRol}`, {});
  }

  /**
   * Remover un rol de un usuario
   * @param {number} idUsuario
   * @param {number} idRol
   * @returns {Promise<Object>}
   */
  removerRol(idUsuario, idRol) {
    return this.delete(`/${idUsuario}/roles/${idRol}`);
  }

  /**
   * Obtener roles de un usuario
   * @param {number} idUsuario
   * @returns {Promise<Array>}
   */
  getRolesPorUsuario(idUsuario) {
    return this.get(`/${idUsuario}/roles`);
  }

  /**
   * Obtener usuarios que tienen un rol específico
   * @param {number} idRol
   * @returns {Promise<Array>}
   */
  getUsuariosPorRol(idRol) {
    return this.get(`/por-rol/${idRol}`);
  }

  /**
   * Obtener todos los roles del sistema (sin filtro de usuario específico)
   * @returns {Promise<Array>}
   */
  getRoles() {
    return this.get(`/roles`);
  }
}

export const usuariosApi = new UsuariosApi();
