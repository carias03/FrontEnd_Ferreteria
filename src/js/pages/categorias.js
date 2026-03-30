/**
 * categorias.js
 * Entry point de Webpack para categorias.html.
 */

import "../../scss/main.scss";
import "bootstrap-icons/font/bootstrap-icons.css";

import { requireAuth } from "../utils/auth.js";
import "../components/sidebar.js";
import "../utils/logout.js";
import { toast } from "../components/toast.js";
import { modal } from "../components/modal.js";
import { createTabla } from "../components/tabla.js";
import { categoriasApi } from "../api/categoriasApi.js";
import { store } from "../utils/store.js";

requireAuth();

// ─── Campos del formulario ────────────────────────────────────────────────────

const FIELDS = [
  {
    id: "nombre",
    label: "Nombre",
    type: "text",
    required: true,
    placeholder: "Ej: Herramientas manuales",
  },
  {
    id: "descripcion",
    label: "Descripción",
    type: "textarea",
    required: false,
    placeholder: "Descripción opcional de la categoría",
  },
];

// ─── DOM ──────────────────────────────────────────────────────────────────────

const btnNueva = document.getElementById("btn-nueva-categoria");
const badgeTotal = document.getElementById("badge-total");

// ─── Tabla ────────────────────────────────────────────────────────────────────

let tabla = null;

function inicializarTabla(data) {
  tabla = createTabla("#tabla-categorias", {
    data,
    order: [[0, "asc"]], // ordenar por idCategoria ascendente
    columns: [
      {
        title: "#",
        data: "idCategoria",
        width: "60px",
        type: "num", // orden numérico, no lexicográfico
        orderable: true,
      },
      {
        title: "Nombre",
        data: "nombre",
      },
      {
        title: "Descripción",
        data: "descripcion",
        render: (row) =>
          row.descripcion
            ? `<span style="color:var(--color-text-muted)">${row.descripcion}</span>`
            : `<span style="color:var(--color-text-muted);font-style:italic">Sin descripción</span>`,
      },
      {
        title: "Acciones",
        data: null,
        orderable: false,
        className: "text-center",
        render: (row) => `
          <div class="table-actions" style="justify-content:center">
            <button class="btn btn--secondary btn--sm btn--icon btn-editar"
                    data-id="${row.idCategoria}" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn--danger btn--sm btn--icon btn-eliminar"
                    data-id="${row.idCategoria}"
                    data-nombre="${row.nombre}"
                    title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </div>`,
      },
    ],
  });
}

// ─── Cargar datos ─────────────────────────────────────────────────────────────

async function cargarCategorias() {
  try {
    const data = await store.getCategorias();

    badgeTotal.textContent = `${data.length} ${data.length === 1 ? "categoría" : "categorías"}`;

    if (tabla) {
      tabla.reload(data);
    } else {
      inicializarTabla(data);
      document
        .getElementById("tabla-categorias")
        .addEventListener("click", manejarAcciones);
    }
  } catch (error) {
    toast.error("No se pudieron cargar las categorías.");
    console.error(error);
  }
}

// ─── Delegación de eventos en la tabla ───────────────────────────────────────

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

// ─── Crear ────────────────────────────────────────────────────────────────────

function abrirCrear() {
  modal.open({
    title: "Nueva categoría",
    fields: FIELDS,
    confirmText: '<i class="bi bi-plus-lg"></i> Crear categoría',
    onConfirm: async (data) => {
      await categoriasApi.create(data);
      toast.success("Categoría creada correctamente.");
      await store.refreshCategorias();
      await cargarCategorias();
    },
  });
}

// ─── Editar ───────────────────────────────────────────────────────────────────

async function abrirEditar(id) {
  try {
    const categoria = await categoriasApi.getById(id);
    modal.open({
      title: "Editar categoría",
      fields: FIELDS,
      data: categoria,
      confirmText: '<i class="bi bi-check-lg"></i> Guardar cambios',
      onConfirm: async (data) => {
        await categoriasApi.update(id, data);
        toast.success("Categoría actualizada correctamente.");
        await store.refreshCategorias();
        await cargarCategorias();
      },
    });
  } catch (error) {
    toast.error("No se pudo cargar la categoría.");
    console.error(error);
  }
}

// ─── Eliminar ─────────────────────────────────────────────────────────────────

function confirmarEliminar(id, nombre) {
  modal.confirm({
    title: "Eliminar categoría",
    message: `¿Estás seguro de eliminar <strong>${nombre}</strong>? Esta acción no se puede deshacer.`,
    confirmText: "Eliminar",
    confirmClass: "btn--danger",
    onConfirm: async () => {
      await categoriasApi.remove(id);
      toast.success("Categoría eliminada correctamente.");
      await store.refreshCategorias();
      await cargarCategorias();
    },
  });
}

// ─── Eventos y arranque ───────────────────────────────────────────────────────

btnNueva.addEventListener("click", abrirCrear);
cargarCategorias();
