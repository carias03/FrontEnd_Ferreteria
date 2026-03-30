// =============================================
// src/js/pages/usuarios.js
// =============================================

import "../../scss/main.scss";
import "bootstrap-icons/font/bootstrap-icons.css";

import { requireAuth } from "@utils/auth.js";
import { store } from "@utils/store.js";
import { toast } from "@components/toast.js";
import { modal } from "@components/modal.js";
import { createTabla } from "@components/tabla.js";
import { usuariosApi } from "@api/usuariosApi.js";

import "@components/sidebar.js";
import "@utils/logout.js";

requireAuth();

// ─── Roles predefinidos ───────────────────────────────────────────────────────

const ROLES_LABEL = {
  SUPERADMIN: { label: "Super Admin", clase: "badge--danger" },
  ADMIN: { label: "Admin", clase: "badge--primary" },
  BODEGUERO: { label: "Bodeguero", clase: "badge--info" },
  VENDEDOR: { label: "Vendedor", clase: "badge--success" },
  CAJERO: { label: "Cajero", clase: "badge--warning" },
  COMPRAS: { label: "Compras", clase: "badge--info" },
  AUDITOR: { label: "Auditor", clase: "badge--neutral" },
};

// ─── Estado ───────────────────────────────────────────────────────────────────

let tabla = null;
let usuarioActivo = null;
let rolesDisponibles = [];

// ─── DOM ──────────────────────────────────────────────────────────────────────

const btnNuevo = document.getElementById("btn-nuevo-usuario");
const badgeTotal = document.getElementById("badge-total");
const detalleOverlay = document.getElementById("detalle-overlay");
const detallePanel = document.getElementById("detalle-panel");
const detalleClose = document.getElementById("detalle-close");
const detalleBody = document.getElementById("detalle-body");
const detalleAcciones = document.getElementById("detalle-acciones");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderRol(rol) {
  if (!rol)
    return `<span style="color:var(--color-text-muted);font-style:italic">Sin rol</span>`;
  const cfg = ROLES_LABEL[rol] ?? { label: rol, clase: "badge--neutral" };
  return `<span class="badge ${cfg.clase}">${cfg.label}</span>`;
}

// ─── Tabla ────────────────────────────────────────────────────────────────────

function inicializarTabla(data) {
  tabla = createTabla("#tabla-usuarios", {
    data,
    order: [[0, "asc"]],
    scrollX: true, // FIX 4: scroll horizontal en pantallas pequeñas
    columns: [
      { title: "#", data: "idUsuario", width: "60px", type: "num" },
      {
        title: "Username",
        data: null,
        render: (row) => `<strong>@${row.username}</strong>`,
      },
      {
        title: "Nombre completo",
        data: null,
        render: (row) =>
          row.persona ? `${row.persona.nombre} ${row.persona.apellidos}` : "—",
      },
      {
        title: "Correo",
        data: null,
        render: (row) =>
          row.persona?.correo
            ? `<a href="mailto:${row.persona.correo}" style="color:var(--color-primary)">${row.persona.correo}</a>`
            : `<span style="color:var(--color-text-muted);font-style:italic">—</span>`,
      },
      {
        title: "Rol",
        data: null,
        render: (row) => renderRol(row._rol),
      },
      {
        title: "Estado",
        data: null,
        render: (row) =>
          row.estado
            ? `<span class="badge badge--success"><i class="bi bi-check-circle"></i> Activo</span>`
            : `<span class="badge badge--neutral"><i class="bi bi-dash-circle"></i> Inactivo</span>`,
      },
      {
        title: "Acciones",
        data: null,
        orderable: false,
        className: "text-center",
        render: (row) => `
          <div class="table-actions" style="justify-content:center">
            <button class="btn btn--secondary btn--sm btn--icon btn-detalle"
                    data-id="${row.idUsuario}" title="Ver detalle">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn--secondary btn--sm btn--icon btn-editar"
                    data-id="${row.idUsuario}" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
          </div>`,
      },
    ],
  });
}

// ─── Cargar usuarios ──────────────────────────────────────────────────────────

async function cargarUsuarios() {
  try {
    const [usuarios, roles] = await Promise.all([
      usuariosApi.getAll(),
      store.getRoles(),
    ]);

    rolesDisponibles = roles;

    const usuariosConRol = await Promise.all(
      usuarios.map(async (u) => {
        try {
          const rolesUsuario = await usuariosApi.getRolesPorUsuario(
            u.idUsuario,
          );
          u._rol = rolesUsuario.length > 0 ? rolesUsuario[0].nombre : null;
          u._roles = rolesUsuario;
        } catch {
          u._rol = null;
          u._roles = [];
        }
        return u;
      }),
    );

    badgeTotal.textContent = `${usuariosConRol.length} ${usuariosConRol.length === 1 ? "usuario" : "usuarios"}`;

    if (tabla) {
      tabla.reload(usuariosConRol);
    } else {
      inicializarTabla(usuariosConRol);
      document
        .getElementById("tabla-usuarios")
        .addEventListener("click", manejarAcciones);
    }
  } catch (error) {
    toast.error("No se pudieron cargar los usuarios.");
    console.error(error);
  }
}

// ─── Delegación de eventos ────────────────────────────────────────────────────

async function manejarAcciones(e) {
  const btnDetalle = e.target.closest(".btn-detalle");
  const btnEditar = e.target.closest(".btn-editar");

  if (btnDetalle) await abrirDetalle(Number(btnDetalle.dataset.id));
  if (btnEditar) await abrirEditar(Number(btnEditar.dataset.id));
}

// ─── Crear usuario ────────────────────────────────────────────────────────────

function abrirCrear() {
  modal.open({
    title: "Nuevo usuario",
    fields: [
      {
        id: "nombre",
        label: "Nombre",
        type: "text",
        required: true,
        placeholder: "Ej: Juan",
      },
      {
        id: "apellidos",
        label: "Apellidos",
        type: "text",
        required: true,
        placeholder: "Ej: Pérez González",
      },
      {
        id: "correo",
        label: "Correo",
        type: "email",
        required: false,
        placeholder: "correo@ejemplo.com",
      },
      {
        id: "telefono",
        label: "Teléfono",
        type: "text",
        required: false,
        placeholder: "Ej: 8888-8888",
      },
      {
        id: "username",
        label: "Username",
        type: "text",
        required: true,
        placeholder: "Ej: jperez",
      },
      {
        id: "password",
        label: "Contraseña",
        type: "password",
        required: true,
        placeholder: "Mínimo 6 caracteres",
      },
    ],
    confirmText: '<i class="bi bi-person-plus"></i> Crear usuario',
    onConfirm: async (data) => {
      await usuariosApi.create({
        username: data.username,
        password: data.password,
        persona: {
          idPersona: 0,
          nombre: data.nombre,
          apellidos: data.apellidos,
          correo: data.correo || null,
          telefono: data.telefono || null,
        },
      });
      toast.success("Usuario creado correctamente.");
      await store.refreshUsuarios();
      await cargarUsuarios();
    },
  });
}

// ─── Editar usuario ───────────────────────────────────────────────────────────
// FIX 2: incluye correo y teléfono editables

async function abrirEditar(id) {
  try {
    const usuario = await usuariosApi.getById(id);
    const p = usuario.persona ?? {};

    modal.open({
      title: `Editar @${usuario.username}`,
      fields: [
        { id: "username", label: "Username", type: "text", required: true },
        {
          id: "estado",
          label: "Estado",
          type: "select",
          required: true,
          options: [
            { value: true, label: "Activo" },
            { value: false, label: "Inactivo" },
          ],
        },
        { id: "nombre", label: "Nombre", type: "text", required: false },
        {
          id: "apellidos",
          label: "Apellidos",
          type: "text",
          required: false,
        },
        { id: "correo", label: "Correo", type: "email", required: false },
        { id: "telefono", label: "Teléfono", type: "text", required: false },
      ],
      data: {
        username: usuario.username,
        estado: usuario.estado,
        nombre: p.nombre ?? "",
        apellidos: p.apellidos ?? "",
        correo: p.correo ?? "",
        telefono: p.telefono ?? "",
      },
      confirmText: '<i class="bi bi-check-lg"></i> Guardar cambios',
      onConfirm: async (data) => {
        // Una sola llamada a usuariosApi.update() con todos los datos
        await usuariosApi.update(id, {
          username: data.username,
          estado: data.estado === "true" || data.estado === true,
          persona: {
            nombre: data.nombre || null,
            apellidos: data.apellidos || null,
            correo: data.correo || null,
            telefono: data.telefono || null,
          },
        });

        toast.success("Usuario actualizado correctamente.");
        await store.refreshUsuarios();
        await cargarUsuarios();

        if (usuarioActivo?.idUsuario === id) await abrirDetalle(id);
      },
    });
  } catch (error) {
    toast.error("No se pudo cargar el usuario.");
    console.error(error);
  }
}

// ─── Cambiar contraseña ───────────────────────────────────────────────────────

function abrirCambiarPassword(id, username) {
  modal.open({
    title: `Cambiar contraseña — @${username}`,
    fields: [
      {
        id: "nuevoPassword",
        label: "Nueva contraseña",
        type: "password",
        required: true,
        placeholder: "Mínimo 6 caracteres",
      },
      {
        id: "confirmarPassword",
        label: "Confirmar contraseña",
        type: "password",
        required: true,
        placeholder: "Repetí la contraseña",
      },
    ],
    confirmText: '<i class="bi bi-key"></i> Cambiar contraseña',
    onConfirm: async (data) => {
      if (data.nuevoPassword !== data.confirmarPassword) {
        toast.error("Las contraseñas no coinciden.");
        return;
      }
      if (data.nuevoPassword.length < 6) {
        toast.error("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
      await usuariosApi.updatePassword(id, data.nuevoPassword);
      toast.success("Contraseña actualizada correctamente.");
    },
  });
}

// ─── Asignar rol ──────────────────────────────────────────────────────────────
// FIX 5: modal normal con select, roles del store (rolesApi cacheados)

async function abrirAsignarRol(usuario) {
  // Cargar roles del store — usa caché si ya se cargaron antes
  const roles = await store.getRoles();

  const rolActualObj = usuario._roles?.[0] ?? null;
  const rolActualId = rolActualObj?.idRol ?? null;

  const rolesOptions = [
    { value: "", label: "— Sin rol —" },
    ...roles.map((r) => ({
      value: r.idRol,
      label: ROLES_LABEL[r.nombre]?.label ?? r.nombre,
    })),
  ];

  modal.open({
    title: `Asignar rol — @${usuario.username}`,
    fields: [
      {
        id: "idRol",
        label: "Rol",
        type: "select",
        required: false,
        options: rolesOptions,
      },
    ],
    data: { idRol: rolActualId ?? "" },
    confirmText: '<i class="bi bi-check-lg"></i> Asignar rol',
    onConfirm: async (data) => {
      const nuevoIdRol = data.idRol ? Number(data.idRol) : null;
      const idUsuario = usuario.idUsuario;

      // Quitar rol anterior si tenía uno
      if (rolActualId) {
        await usuariosApi.removerRol(idUsuario, rolActualId);
      }

      // Asignar nuevo rol si eligió uno
      if (nuevoIdRol) {
        await usuariosApi.asignarRol(idUsuario, nuevoIdRol);
      }

      toast.success("Rol actualizado correctamente.");
      await cargarUsuarios();

      if (usuarioActivo?.idUsuario === idUsuario) await abrirDetalle(idUsuario);
    },
  });
}

// ─── Panel de detalle ─────────────────────────────────────────────────────────

async function abrirDetalle(id) {
  try {
    const usuario = await usuariosApi.getById(id);
    const rolesUsuario = await usuariosApi.getRolesPorUsuario(id);

    usuario._rol = rolesUsuario.length > 0 ? rolesUsuario[0].nombre : null;
    usuario._roles = rolesUsuario;
    usuarioActivo = usuario;

    const p = usuario.persona ?? {};
    const nombreCompleto = p.nombre ? `${p.nombre} ${p.apellidos}` : "—";

    detalleBody.innerHTML = `
      <div style="text-align:center; margin-bottom:24px">
        <div style="
          width:64px; height:64px; border-radius:50%;
          background:var(--color-primary);
          display:flex; align-items:center; justify-content:center;
          font-size:26px; font-weight:800; color:#fff;
          margin:0 auto 12px">
          ${(p.nombre?.[0] ?? usuario.username[0]).toUpperCase()}
        </div>
        <div style="font-size:18px; font-weight:700">${nombreCompleto}</div>
        <div style="color:var(--color-text-muted); font-size:13px">@${usuario.username}</div>
        <div style="margin-top:8px">${renderRol(usuario._rol)}</div>
        <div style="margin-top:6px">${
          usuario.estado
            ? '<span class="badge badge--success"><i class="bi bi-check-circle"></i> Activo</span>'
            : '<span class="badge badge--neutral"><i class="bi bi-dash-circle"></i> Inactivo</span>'
        }</div>
      </div>
      <div style="border-top:1px solid var(--color-border); padding-top:16px">
        ${detalleRow(
          "bi-envelope",
          "Correo",
          p.correo
            ? `<a href="mailto:${p.correo}" style="color:var(--color-primary)">${p.correo}</a>`
            : "—",
        )}
        ${detalleRow("bi-telephone", "Teléfono", p.telefono ?? "—")}
        ${detalleRow(
          "bi-calendar3",
          "Fecha de creación",
          usuario.fechaCreacion
            ? new Date(usuario.fechaCreacion).toLocaleDateString("es-CR", {
                dateStyle: "medium",
              })
            : "—",
        )}
      </div>`;

    // FIX 3: editar y contraseña al 50% con misma altura, cambiar rol ancho completo
    detalleAcciones.innerHTML = `
      <div style="display:flex; gap:8px; width:100%; margin-bottom:8px">
        <button class="btn btn--secondary" id="det-btn-editar"
                style="flex:1; justify-content:center">
          <i class="bi bi-pencil"></i> Editar
        </button>
        <button class="btn btn--secondary" id="det-btn-password"
                style="flex:1; justify-content:center">
          <i class="bi bi-key"></i> Contraseña
        </button>
      </div>
      <button class="btn btn--primary" id="det-btn-rol"
              style="width:100%; justify-content:center">
        <i class="bi bi-shield-check"></i> Cambiar rol
      </button>`;

    document
      .getElementById("det-btn-editar")
      .addEventListener("click", () => abrirEditar(id));
    document
      .getElementById("det-btn-password")
      .addEventListener("click", () =>
        abrirCambiarPassword(id, usuario.username),
      );
    document
      .getElementById("det-btn-rol")
      .addEventListener("click", () => abrirAsignarRol(usuario));

    mostrarDetalle();
  } catch (error) {
    toast.error("No se pudo cargar el detalle del usuario.");
    console.error(error);
  }
}

function detalleRow(icono, label, valor) {
  return `
    <div style="display:flex; align-items:flex-start; gap:10px;
                padding:10px 0; border-bottom:1px solid var(--color-border)">
      <i class="bi ${icono}" style="color:var(--color-text-muted);
         margin-top:2px; flex-shrink:0; width:16px; text-align:center"></i>
      <div>
        <div style="font-size:11px; color:var(--color-text-muted);
                    text-transform:uppercase; letter-spacing:.5px;
                    font-weight:600; margin-bottom:2px">${label}</div>
        <div style="font-size:14px">${valor}</div>
      </div>
    </div>`;
}

function mostrarDetalle() {
  detalleOverlay.style.opacity = "1";
  detalleOverlay.style.visibility = "visible";
  detallePanel.style.transform = "translateX(0)";
}

function cerrarDetalle() {
  detalleOverlay.style.opacity = "0";
  detalleOverlay.style.visibility = "hidden";
  detallePanel.style.transform = "translateX(100%)";
  usuarioActivo = null;
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

btnNuevo.addEventListener("click", abrirCrear);
detalleClose.addEventListener("click", cerrarDetalle);
detalleOverlay.addEventListener("click", cerrarDetalle);

// ─── Init ─────────────────────────────────────────────────────────────────────

cargarUsuarios();
