// =============================================
// src/js/utils/store.js
// Store centralizado de catálogos.
// =============================================

import { categoriasApi } from "@api/categoriasApi.js";
import { proveedoresApi } from "@api/proveedoresApi.js";
import { sucursalesApi } from "@api/sucursalesApi.js";
import { rolesApi } from "@api/rolesApi.js";
import { productosApi } from "@api/productosApi.js";
import { usuariosApi } from "@api/usuariosApi.js"; // PracticaAPI (/users)

const _state = {
  categorias: null,
  proveedores: null,
  sucursales: null,
  roles: null,
  productos: null,
  usuarios: null,
};

function soloActivos(lista) {
  if (!lista) return [];
  return lista.filter((item) => item.estado !== false);
}

async function _cargar(key, apiFn) {
  if (_state[key] === null) {
    _state[key] = await apiFn();
  }
  return _state[key];
}

export const store = {
  // ── Getters ───────────────────────────────────────────────────────────────

  async getCategorias() {
    return _cargar("categorias", () => categoriasApi.getAll());
  },
  async getProveedores() {
    return _cargar("proveedores", () => proveedoresApi.getAll());
  },
  async getSucursales() {
    return _cargar("sucursales", () => sucursalesApi.getAll());
  },
  async getRoles() {
    return _cargar("roles", () => rolesApi.getAll());
  },
  async getProductos() {
    return _cargar("productos", () => productosApi.getAll());
  },
  async getUsuarios() {
    return _cargar("usuarios", () => usuariosApi.getAll());
  },

  // ── Getters filtrados ─────────────────────────────────────────────────────

  async getCategoriasActivas() {
    return soloActivos(await this.getCategorias());
  },
  async getProveedoresActivos() {
    return soloActivos(await this.getProveedores());
  },
  async getSucursalesActivas() {
    return soloActivos(await this.getSucursales());
  },
  async getRolesActivos() {
    return soloActivos(await this.getRoles());
  },
  async getProductosActivos() {
    return soloActivos(await this.getProductos());
  },
  async getUsuariosActivos() {
    return soloActivos(await this.getUsuarios());
  },

  // ── Refresh ───────────────────────────────────────────────────────────────

  async refreshCategorias() {
    _state.categorias = await categoriasApi.getAll();
    return _state.categorias;
  },
  async refreshProveedores() {
    _state.proveedores = await proveedoresApi.getAll();
    return _state.proveedores;
  },
  async refreshSucursales() {
    _state.sucursales = await sucursalesApi.getAll();
    return _state.sucursales;
  },
  async refreshRoles() {
    _state.roles = await rolesApi.getAll();
    return _state.roles;
  },
  async refreshProductos() {
    _state.productos = await productosApi.getAll();
    return _state.productos;
  },
  async refreshUsuarios() {
    _state.usuarios = await usuariosApi.getAll();
    return _state.usuarios;
  },

  // ── Helpers para selects ──────────────────────────────────────────────────

  async getCategoriasOptions() {
    const lista = await this.getCategoriasActivas();
    return lista.map((c) => ({ value: c.idCategoria, label: c.nombre }));
  },

  async getProveedoresOptions(conOpcionVacia = true) {
    const lista = await this.getProveedoresActivos();
    const options = lista.map((p) => ({
      value: p.idProveedor,
      label: p.nombre,
    }));
    if (conOpcionVacia)
      options.unshift({ value: null, label: "Sin proveedor" });
    return options;
  },

  async getSucursalesOptions() {
    const lista = await this.getSucursalesActivas();
    return lista.map((s) => ({ value: s.idSucursal, label: s.nombre }));
  },

  async getRolesOptions() {
    const lista = await this.getRolesActivos();
    return lista.map((r) => ({ value: r.idRol, label: r.nombre }));
  },

  async getProductosOptions() {
    const lista = await this.getProductosActivos();
    return lista.map((p) => ({ value: p.idProducto, label: p.nombre }));
  },

  // ── Mapa idProducto → producto (incluye inactivos, para enriquecer tablas) ─

  async getProductosMap() {
    const lista = await this.getProductos(); // todos, sin filtrar por estado
    const mapa = {};
    lista.forEach((p) => {
      mapa[p.idProducto] = p;
    });
    return mapa;
  },

  // ── Mapa idUsuario → username (para enriquecer tablas) ───────────────────

  async getMapaUsuarios() {
    const lista = await this.getUsuarios();
    const mapa = {};
    lista.forEach((u) => {
      mapa[u.idUsuario] = u.username ?? `#${u.idUsuario}`;
    });
    return mapa;
  },
};
