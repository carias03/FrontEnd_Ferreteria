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
let FIELDS = []; // se construye después de cargar catálogos

// ─── DOM ──────────────────────────────────────────────────────────────────────

const btnNuevo = document.getElementById("btn-nuevo-producto");
const badgeTotal = document.getElementById("badge-total");

// ─── Construir FIELDS con catálogos del store ─────────────────────────────────
// Se llama una sola vez al iniciar. Si el store ya tiene los datos en caché
// (porque otra página los cargó antes), no hace ninguna llamada al backend.

async function buildFields() {
  const [categoriasOptions, proveedoresOptions] = await Promise.all([
    store.getCategoriasOptions(),
    store.getProveedoresOptions(true), // true = incluir "Sin proveedor"
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
        title: "Acciones",
        data: null,
        orderable: false,
        className: "text-center",
        render: (row) => `
                    <div class="table-actions" style="justify-content:center">
                        <button class="btn btn--secondary btn--sm btn--icon btn-editar"
                                data-id="${row.idProducto}" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn--danger btn--sm btn--icon btn-eliminar"
                                data-id="${row.idProducto}"
                                data-nombre="${row.nombre}"
                                title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>`,
      },
    ],
  });
}

// ─── Cargar productos ─────────────────────────────────────────────────────────

async function cargarProductos() {
  try {
    const data = await store.getProductosActivos();

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

    // El JSON devuelve categoria y proveedor como objetos anidados.
    // El modal necesita los IDs en el nivel raíz para preseleccionar
    // los selects correctamente.
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

// ─── Eliminar ─────────────────────────────────────────────────────────────────

function confirmarEliminar(id, nombre) {
  modal.confirm({
    title: "Eliminar producto",
    message: `¿Estás seguro de eliminar <strong>${nombre}</strong>? El producto dejará de aparecer en el sistema. Su historial de ventas y movimientos se conservará.`,
    confirmText: "Eliminar",
    confirmClass: "btn--danger",
    onConfirm: async () => {
      await productosApi.remove(id);
      toast.success("Producto eliminado correctamente.");
      await store.refreshProductos();
      await cargarProductos();
    },
  });
}

// ─── Mapear datos del formulario al formato que espera el API ─────────────────
// El API de productos espera categoria: { idCategoria } y proveedor: { idProveedor }

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

// buildFields carga los catálogos del store (con caché),
// luego carga los productos. Todo en paralelo donde se puede.
buildFields().then(() => cargarProductos());
