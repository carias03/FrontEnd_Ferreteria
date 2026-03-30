/**
 * sucursales.js
 * Entry point de Webpack para sucursales.html.
 */

import "../../scss/main.scss";
import "bootstrap-icons/font/bootstrap-icons.css";

import { requireAuth } from "../utils/auth.js";
import "../components/sidebar.js";
import "../utils/logout.js";
import { toast } from "../components/toast.js";
import { modal } from "../components/modal.js";
import { createTabla } from "../components/tabla.js";
import { sucursalesApi } from "../api/sucursalesApi.js";
import { store } from "../utils/store.js";

requireAuth();

const FIELDS = [
  {
    id: "nombre",
    label: "Nombre",
    type: "text",
    required: true,
    placeholder: "Ej: Sucursal Centro",
  },
  {
    id: "direccion",
    label: "Dirección",
    type: "textarea",
    required: true,
    placeholder: "Dirección completa de la sucursal",
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
    placeholder: "Ej: sucursal@ferreteria.com",
  },
];

const btnNuevo = document.getElementById("btn-nueva-sucursal");
const badgeTotal = document.getElementById("badge-total");

let tabla = null;

function inicializarTabla(data) {
  tabla = createTabla("#tabla-sucursales", {
    data,
    order: [[0, "asc"]],
    columns: [
      {
        title: "#",
        data: "idSucursal",
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
                    data-id="${row.idSucursal}" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn--danger btn--sm btn--icon btn-eliminar"
                    data-id="${row.idSucursal}"
                    data-nombre="${row.nombre}"
                    title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </div>`,
      },
    ],
  });
}

async function cargarSucursales() {
  try {
    const activas = await store.getSucursalesActivas();

    badgeTotal.textContent = `${activas.length} ${activas.length === 1 ? "sucursal" : "sucursales"}`;

    if (tabla) {
      tabla.reload(activas);
    } else {
      inicializarTabla(activas);
      document
        .getElementById("tabla-sucursales")
        .addEventListener("click", manejarAcciones);
    }
  } catch (error) {
    toast.error("No se pudieron cargar las sucursales.");
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
    title: "Nueva sucursal",
    fields: FIELDS,
    confirmText: '<i class="bi bi-plus-lg"></i> Crear sucursal',
    onConfirm: async (data) => {
      await sucursalesApi.create(data);
      toast.success("Sucursal creada correctamente.");
      await store.refreshSucursales();
      await cargarSucursales();
    },
  });
}

async function abrirEditar(id) {
  try {
    const sucursal = await sucursalesApi.getById(id);
    modal.open({
      title: "Editar sucursal",
      fields: FIELDS,
      data: sucursal,
      confirmText: '<i class="bi bi-check-lg"></i> Guardar cambios',
      onConfirm: async (data) => {
        await sucursalesApi.update(id, data);
        toast.success("Sucursal actualizada correctamente.");
        await store.refreshSucursales();
        await cargarSucursales();
      },
    });
  } catch (error) {
    toast.error("No se pudo cargar la sucursal.");
    console.error(error);
  }
}

function confirmarEliminar(id, nombre) {
  modal.confirm({
    title: "Eliminar sucursal",
    message: `¿Estás seguro de eliminar <strong>${nombre}</strong>? La sucursal dejará de aparecer en el sistema. Su historial de ventas, movimientos e inventario se conservará.`,
    confirmText: '<i class="bi bi-trash"></i> Eliminar',
    confirmClass: "btn--danger",
    onConfirm: async () => {
      await sucursalesApi.remove(id);
      toast.success("Sucursal eliminada correctamente.");
      await store.refreshSucursales();
      await cargarSucursales();
    },
  });
}

btnNuevo.addEventListener("click", abrirCrear);
cargarSucursales();
