// =============================================
// src/js/pages/productos.js
// =============================================

import "../../scss/main.scss";
import "bootstrap-icons/font/bootstrap-icons.css";

import { requireAuth } from "@utils/auth.js";
import { store } from "@utils/store.js";
import { toast } from "@components/toast.js";
import { modal } from "@components/modal.js";
import { createTabla } from "@components/tabla.js";
import { productosApi } from "@api/productosApi.js";

import "@components/sidebar.js";
import "@utils/logout.js";

requireAuth();

// ─── Estado local ─────────────────────────────────────────────────────────────

let tabla = null;
let FIELDS = [];

// ─── DOM ──────────────────────────────────────────────────────────────────────

const btnNuevo = document.getElementById("btn-nuevo-producto");
const badgeTotal = document.getElementById("badge-total");

// ─── Construir FIELDS con catálogos del store ─────────────────────────────────

async function buildFields() {
  const [categoriasOptions, proveedoresOptions] = await Promise.all([
    store.getCategoriasOptions(),
    store.getProveedoresOptions(true),
  ]);

  FIELDS = [
    {
      id: "codigo",
      label: "Código",
      type: "text",
      required: true,
      placeholder: "Ej: EL-001",
    },
    {
      id: "nombre",
      label: "Nombre",
      type: "text",
      required: true,
      placeholder: "Ej: Cable THHN #12 Negro",
    },
    {
      id: "descripcion",
      label: "Descripción",
      type: "textarea",
      required: false,
      placeholder: "Descripción opcional del producto",
    },
    {
      id: "precioCompra",
      label: "Precio de Compra",
      type: "number",
      required: true,
      placeholder: "Ej: 450.00",
    },
    {
      id: "precioVenta",
      label: "Precio de Venta",
      type: "number",
      required: true,
      placeholder: "Ej: 750.00",
    },
    {
      id: "unidadMedida",
      label: "Unidad de Medida",
      type: "text",
      required: true,
      placeholder: "Ej: metro, unidad, kg",
    },
    {
      id: "idCategoria",
      label: "Categoría",
      type: "select",
      required: true,
      options: categoriasOptions,
    },
    {
      id: "idProveedor",
      label: "Proveedor",
      type: "select",
      required: false,
      options: proveedoresOptions,
    },
  ];
}

// ─── Tabla ────────────────────────────────────────────────────────────────────

function inicializarTabla(data) {
  tabla = createTabla("#tabla-productos", {
    data,
    order: [[0, "asc"]],
    columns: [
      {
        title: "#",
        data: "idProducto",
        width: "60px",
        type: "num",
        orderable: true,
      },
      {
        title: "Código",
        data: "codigo",
      },
      {
        title: "Nombre",
        data: "nombre",
      },
      {
        title: "Unidad",
        data: "unidadMedida",
      },
      {
        title: "Categoría",
        data: null,
        render: (row) =>
          row.categoria?.nombre ??
          `<span style="color:var(--color-text-muted);font-style:italic">—</span>`,
      },
      {
        title: "Estado",
        data: null,
        render: (row) =>
          row.estado !== false
            ? `<span class="badge badge--success">Activo</span>`
            : `<span class="badge badge--neutral">Inactivo</span>`,
      },
      {
        title: "Acciones",
        data: null,
        orderable: false,
        className: "text-center",
        render: (row) => {
          const activo = row.estado !== false;
          return `
            <div class="table-actions" style="justify-content:center">
              <button class="btn btn--secondary btn--sm btn--icon btn-editar"
                      data-id="${row.idProducto}" title="Editar">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn ${activo ? "btn--danger" : "btn--secondary"} btn--sm btn-toggle-estado"
                      data-id="${row.idProducto}"
                      data-nombre="${row.nombre}"
                      data-activo="${activo}"
                      title="${activo ? "Desactivar" : "Reactivar"}">
                <i class="bi ${activo ? "bi-slash-circle" : "bi-arrow-counterclockwise"}"></i>
                ${activo ? "Desactivar" : "Reactivar"}
              </button>
            </div>`;
        },
      },
    ],
  });
}

// ─── Cargar productos ─────────────────────────────────────────────────────────

async function cargarProductos() {
  try {
    const data = await store.getProductos();

    badgeTotal.textContent = `${data.length} ${data.length === 1 ? "producto" : "productos"}`;

    if (tabla) {
      tabla.reload(data);
    } else {
      inicializarTabla(data);
      document
        .getElementById("tabla-productos")
        .addEventListener("click", manejarAcciones);
    }
  } catch (error) {
    toast.error("No se pudieron cargar los productos.");
    console.error(error);
  }
}

// ─── Delegación de eventos ────────────────────────────────────────────────────

async function manejarAcciones(e) {
  const btnEditar = e.target.closest(".btn-editar");
  const btnToggle = e.target.closest(".btn-toggle-estado");

  if (btnEditar) await abrirEditar(Number(btnEditar.dataset.id));
  if (btnToggle) {
    const activo = btnToggle.dataset.activo === "true";
    confirmarToggleEstado(
      Number(btnToggle.dataset.id),
      btnToggle.dataset.nombre,
      activo,
    );
  }
}

// ─── Crear ────────────────────────────────────────────────────────────────────

function abrirCrear() {
  modal.open({
    title: "Nuevo producto",
    fields: FIELDS,
    confirmText: '<i class="bi bi-plus-lg"></i> Crear producto',
    onConfirm: async (data) => {
      await productosApi.create(mapearParaApi(data));
      toast.success("Producto creado correctamente.");
      await store.refreshProductos();
      await cargarProductos();
    },
  });
}

// ─── Editar ───────────────────────────────────────────────────────────────────

async function abrirEditar(id) {
  try {
    const producto = await productosApi.getById(id);

    const datosFormulario = {
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precioCompra: producto.precioCompra,
      precioVenta: producto.precioVenta,
      unidadMedida: producto.unidadMedida,
      idCategoria: producto.categoria?.idCategoria ?? null,
      idProveedor: producto.proveedor?.idProveedor ?? null,
    };

    modal.open({
      title: "Editar producto",
      fields: FIELDS,
      data: datosFormulario,
      confirmText: '<i class="bi bi-check-lg"></i> Guardar cambios',
      onConfirm: async (data) => {
        await productosApi.update(id, mapearParaApi(data));
        toast.success("Producto actualizado correctamente.");
        await store.refreshProductos();
        await cargarProductos();
      },
    });
  } catch (error) {
    toast.error("No se pudo cargar el producto.");
    console.error(error);
  }
}

// ─── Desactivar / Reactivar ───────────────────────────────────────────────────

function confirmarToggleEstado(id, nombre, activo) {
  modal.confirm({
    title: activo ? "Desactivar producto" : "Reactivar producto",
    message: activo
      ? `¿Desactivar <strong>${nombre}</strong>? No podrá agregarse a nuevos movimientos ni inventarios, pero su historial se conservará.`
      : `¿Reactivar <strong>${nombre}</strong>? Volverá a estar disponible en el sistema.`,
    confirmText: activo ? "Desactivar" : "Reactivar",
    confirmClass: activo ? "btn--danger" : "btn--secondary",
    onConfirm: async () => {
      try {
        activo
          ? await productosApi.desactivar(id)
          : await productosApi.activar(id);
        toast.success(
          activo
            ? "Producto desactivado correctamente."
            : "Producto reactivado correctamente.",
        );
        await store.refreshProductos();
        await cargarProductos();
      } catch (error) {
        toast.error(
          activo
            ? "No se pudo desactivar el producto."
            : "No se pudo reactivar el producto.",
        );
        console.error(error);
      }
    },
  });
}

// ─── Mapear datos del formulario al formato que espera el API ─────────────────

function mapearParaApi(formData) {
  return {
    codigo: formData.codigo,
    nombre: formData.nombre,
    descripcion: formData.descripcion || null,
    precioCompra: Number(formData.precioCompra),
    precioVenta: Number(formData.precioVenta),
    unidadMedida: formData.unidadMedida,
    categoria: { idCategoria: Number(formData.idCategoria) },
    proveedor: formData.idProveedor
      ? { idProveedor: Number(formData.idProveedor) }
      : null,
  };
}

// ─── Inicialización ───────────────────────────────────────────────────────────

btnNuevo.addEventListener("click", abrirCrear);
buildFields().then(() => cargarProductos());
