/**
 * proveedores.js
 * Entry point de Webpack para proveedores.html.
 */

import "../../scss/main.scss";
import "bootstrap-icons/font/bootstrap-icons.css";

import { requireAuth } from "../utils/auth.js";
import "../components/sidebar.js";
import "../utils/logout.js";
import { toast } from "../components/toast.js";
import { modal } from "../components/modal.js";
import { createTabla } from "../components/tabla.js";
import { proveedoresApi } from "../api/proveedoresApi.js";
import { store } from "../utils/store.js";

requireAuth();

const FIELDS = [
  {
    id: "nombre",
    label: "Nombre",
    type: "text",
    required: true,
    placeholder: "Ej: Ferretería ABC",
  },
  {
    id: "telefono",
    label: "Teléfono",
    type: "text",
    required: false,
    placeholder: "Ej: 2222-2222",
  },
  {
    id: "correo",
    label: "Correo",
    type: "email",
    required: false,
    placeholder: "Ej: contacto@proveedor.com",
  },
  {
    id: "direccion",
    label: "Dirección",
    type: "textarea",
    required: false,
    placeholder: "Dirección del proveedor",
  },
];

const btnNuevo = document.getElementById("btn-nuevo-proveedor");
const badgeTotal = document.getElementById("badge-total");

let tabla = null;

function inicializarTabla(data) {
  tabla = createTabla("#tabla-proveedores", {
    data,
    order: [[0, "asc"]],
    columns: [
      {
        title: "#",
        data: "idProveedor",
        width: "60px",
        type: "num",
        orderable: true,
      },
      { title: "Nombre", data: "nombre" },
      {
        title: "Correo",
        data: "correo",
        render: (row) =>
          row.correo
            ? `<a href="mailto:${row.correo}" style="color:var(--color-primary)">${row.correo}</a>`
            : `<span style="color:var(--color-text-muted);font-style:italic">—</span>`,
      },
      {
        title: "Teléfono",
        data: "telefono",
        render: (row) =>
          row.telefono ||
          `<span style="color:var(--color-text-muted);font-style:italic">—</span>`,
      },
      {
        title: "Dirección",
        data: "direccion",
        render: (row) =>
          row.direccion ||
          `<span style="color:var(--color-text-muted);font-style:italic">—</span>`,
      },
      {
        title: "Acciones",
        data: null,
        orderable: false,
        className: "text-center",
        render: (row) => `
          <div class="table-actions" style="justify-content:center">
            <button class="btn btn--secondary btn--sm btn--icon btn-editar"
                    data-id="${row.idProveedor}" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn--danger btn--sm btn--icon btn-eliminar"
                    data-id="${row.idProveedor}"
                    data-nombre="${row.nombre}"
                    title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </div>`,
      },
    ],
  });
}

async function cargarProveedores() {
  try {
    const activos = await store.getProveedoresActivos();

    badgeTotal.textContent = `${activos.length} ${activos.length === 1 ? "proveedor" : "proveedores"}`;

    if (tabla) {
      tabla.reload(activos);
    } else {
      inicializarTabla(activos);
      document
        .getElementById("tabla-proveedores")
        .addEventListener("click", manejarAcciones);
    }
  } catch (error) {
    toast.error("No se pudieron cargar los proveedores.");
    console.error(error);
  }
}

async function manejarAcciones(e) {
  const btnEditar = e.target.closest(".btn-editar");
  const btnEliminar = e.target.closest(".btn-eliminar");

  if (btnEditar) await abrirEditar(Number(btnEditar.dataset.id));
  if (btnEliminar)
    confirmarEliminar(
      Number(btnEliminar.dataset.id),
      btnEliminar.dataset.nombre,
    );
}

function abrirCrear() {
  modal.open({
    title: "Nuevo proveedor",
    fields: FIELDS,
    confirmText: '<i class="bi bi-plus-lg"></i> Crear proveedor',
    onConfirm: async (data) => {
      await proveedoresApi.create(data);
      toast.success("Proveedor creado correctamente.");
      await store.refreshProveedores();
      await cargarProveedores();
    },
  });
}

async function abrirEditar(id) {
  try {
    const proveedor = await proveedoresApi.getById(id);
    modal.open({
      title: "Editar proveedor",
      fields: FIELDS,
      data: proveedor,
      confirmText: '<i class="bi bi-check-lg"></i> Guardar cambios',
      onConfirm: async (data) => {
        await proveedoresApi.update(id, data);
        toast.success("Proveedor actualizado correctamente.");
        await store.refreshProveedores();
        await cargarProveedores();
      },
    });
  } catch (error) {
    toast.error("No se pudo cargar el proveedor.");
    console.error(error);
  }
}

function confirmarEliminar(id, nombre) {
  modal.confirm({
    title: "Eliminar proveedor",
    message: `¿Estás seguro de eliminar a <strong>${nombre}</strong>? El proveedor dejará de aparecer en el sistema. Su historial en órdenes de compra y movimientos se conservará.`,
    confirmText: '<i class="bi bi-trash"></i> Eliminar',
    confirmClass: "btn--danger",
    onConfirm: async () => {
      await proveedoresApi.remove(id);
      toast.success("Proveedor eliminado correctamente.");
      await store.refreshProveedores();
      await cargarProveedores();
    },
  });
}

btnNuevo.addEventListener("click", abrirCrear);
cargarProveedores();
