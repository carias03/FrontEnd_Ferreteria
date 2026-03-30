/**
 * inventario.js
 * Entry point de Webpack para inventario.html.
 *
 * Cambios respecto a la versión anterior:
 * - Sin botón refresh — la tabla se actualiza sola tras cada acción
 * - Sin columna Categoría en la tabla
 * - Botón "Ajustar límites" reemplazado por texto descriptivo
 * - Botón de movimiento eliminado (se gestiona en movimientos.html)
 * - Botón "Registrar producto" renombrado a "Agregar al inventario"
 * - Encabezado muestra "Inventario — {Nombre sucursal}"
 * - Controles del topbar responsive con CSS
 */

import "../../scss/main.scss";
import "bootstrap-icons/font/bootstrap-icons.css";

import { requireAuth } from "@utils/auth.js";
import { store } from "@utils/store.js";
import { getCurrentUser } from "@utils/auth.js";
import { toast } from "@components/toast.js";
import { modal } from "@components/modal.js";
import { createTabla } from "@components/tabla.js";
import { inventarioApi } from "@api/inventarioApi.js";

import "@components/sidebar.js";
import "@utils/logout.js";

requireAuth();

// ─── Estado ───────────────────────────────────────────────────────────────────

let tabla = null;
let sucursalActual = null; // id
let nombreSucursal = ""; // para el encabezado
let inventarioActual = []; // copia local para filtrar sin ir al backend

// ─── DOM ──────────────────────────────────────────────────────────────────────

const selectSucursal = document.getElementById("select-sucursal");
const selectEstado = document.getElementById("select-estado");
const btnAgregar = document.getElementById("btn-agregar-inventario");
const badgeTotal = document.getElementById("badge-total");
const tituloInventario = document.getElementById("titulo-inventario");
const alertaBox = document.getElementById("alerta-stock-bajo");
const alertaTexto = document.getElementById("alerta-texto");
const alertaLink = document.getElementById("alerta-link");

// ─── Cargar sucursales en el select ───────────────────────────────────────────

async function cargarSucursales() {
  const sucursales = await store.getSucursalesActivas();

  selectSucursal.innerHTML = sucursales
    .map((s) => `<option value="${s.idSucursal}">${s.nombre}</option>`)
    .join("");

  if (sucursales.length > 0) {
    sucursalActual = sucursales[0].idSucursal;
    nombreSucursal = sucursales[0].nombre;
    await cargarInventario();
  } else {
    selectSucursal.innerHTML =
      '<option value="">Sin sucursales disponibles</option>';
  }
}

// ─── Actualizar título con nombre de sucursal ─────────────────────────────────

function actualizarTitulo() {
  tituloInventario.textContent = nombreSucursal
    ? `Inventario — ${nombreSucursal}`
    : "Inventario";
}

// ─── Cargar inventario de la sucursal seleccionada ────────────────────────────

async function cargarInventario() {
  if (!sucursalActual) return;

  try {
    const data = await inventarioApi.getBySucursal(sucursalActual);
    inventarioActual = data;

    actualizarTitulo();
    mostrarAlertaStockBajo(data);
    aplicarFiltroEstado();
  } catch (error) {
    toast.error("No se pudo cargar el inventario.");
    console.error(error);
  }
}

// ─── Filtrar por estado sin llamar al backend ─────────────────────────────────

function aplicarFiltroEstado() {
  const estado = selectEstado.value;
  const filtrado = estado
    ? inventarioActual.filter((i) => i.estadoStock === estado)
    : inventarioActual;

  badgeTotal.textContent = `${filtrado.length} ${filtrado.length === 1 ? "producto" : "productos"}`;

  if (tabla) {
    tabla.reload(filtrado);
  } else {
    inicializarTabla(filtrado);
    document
      .getElementById("tabla-inventario")
      .addEventListener("click", manejarAcciones);
  }
}

// ─── Alerta de stock bajo ─────────────────────────────────────────────────────

function mostrarAlertaStockBajo(data) {
  const bajos = data.filter((i) => i.estadoStock === "BAJO");

  if (bajos.length > 0) {
    alertaTexto.textContent = `${bajos.length} ${bajos.length === 1 ? "producto tiene" : "productos tienen"} stock bajo.`;
    alertaLink.onclick = (e) => {
      e.preventDefault();
      selectEstado.value = "BAJO";
      aplicarFiltroEstado();
    };
    alertaBox.style.display = "block";
  } else {
    alertaBox.style.display = "none";
  }
}

// ─── Tabla ────────────────────────────────────────────────────────────────────

function inicializarTabla(data) {
  tabla = createTabla("#tabla-inventario", {
    data,
    order: [[0, "asc"]],
    columns: [
      {
        title: "Código",
        data: null,
        render: (row) => row.producto?.codigo ?? "—",
      },
      {
        title: "Producto",
        data: null,
        render: (row) => row.producto?.nombre ?? "—",
      },
      {
        title: "Unidad",
        data: null,
        render: (row) => row.producto?.unidadMedida ?? "—",
      },
      {
        title: "Stock actual",
        data: null,
        orderable: true,
        render: (row) => {
          const color =
            {
              BAJO: "var(--color-danger)",
              ALTO: "var(--color-info)",
              OK: "var(--color-text)",
            }[row.estadoStock] ?? "var(--color-text)";
          return `<strong style="color:${color}">${row.cantidad}</strong>`;
        },
      },
      {
        title: "Mín.",
        data: null,
        render: (row) => row.stockMinimo,
      },
      {
        title: "Máx.",
        data: null,
        render: (row) => row.stockMaximo,
      },
      {
        title: "Estado",
        data: null,
        render: (row) => {
          const clase = {
            BAJO: "badge--danger",
            OK: "badge--success",
            ALTO: "badge--info",
          };
          return `<span class="badge ${clase[row.estadoStock] ?? "badge--neutral"}">${row.estadoStock}</span>`;
        },
      },
      {
        title: "Acciones",
        data: null,
        orderable: false,
        className: "text-center",
        render: (row) => `
          <div class="table-actions" style="justify-content:center">
            <button class="btn btn--secondary btn--sm btn-limites"
                    data-id="${row.idInventario}"
                    data-min="${row.stockMinimo}"
                    data-max="${row.stockMaximo}"
                    title="Ajustar límites de stock">
              <i class="bi bi-sliders"></i> Ajustar límites
            </button>
          </div>`,
      },
    ],
  });
}

// ─── Acciones de la tabla ─────────────────────────────────────────────────────

async function manejarAcciones(e) {
  const btnLimites = e.target.closest(".btn-limites");
  if (btnLimites) abrirLimites(btnLimites.dataset);
}

// ─── Agregar producto al inventario de la sucursal ────────────────────────────

async function abrirAgregarInventario() {
  try {
    // IDs ya en inventario para esta sucursal (no ofrecer duplicados)
    const yaRegistrados = new Set(
      inventarioActual.map((i) => i.producto?.idProducto),
    );
    const productos = await store.getProductosActivos();
    const disponibles = productos
      .filter((p) => !yaRegistrados.has(p.idProducto))
      .map((p) => ({
        value: p.idProducto,
        label: `${p.codigo} — ${p.nombre}`,
      }));

    if (disponibles.length === 0) {
      toast.info(
        "Todos los productos activos ya están registrados en esta sucursal.",
      );
      return;
    }

    modal.open({
      title: "Agregar producto al inventario",
      fields: [
        {
          id: "idProducto",
          label: "Producto",
          type: "select",
          required: true,
          options: disponibles,
        },
        {
          id: "stockMinimo",
          label: "Stock mínimo",
          type: "number",
          required: true,
          placeholder: "Ej: 5",
          min: 0,
        },
        {
          id: "stockMaximo",
          label: "Stock máximo",
          type: "number",
          required: true,
          placeholder: "Ej: 100",
          min: 1,
        },
      ],
      confirmText: '<i class="bi bi-plus-lg"></i> Agregar',
      onConfirm: async (data) => {
        await inventarioApi.create({
          idSucursal: sucursalActual,
          idProducto: Number(data.idProducto),
          stockMinimo: Number(data.stockMinimo),
          stockMaximo: Number(data.stockMaximo),
        });
        toast.success("Producto agregado al inventario.");
        await cargarInventario();
      },
    });
  } catch (error) {
    toast.error("No se pudieron cargar los productos.");
    console.error(error);
  }
}

// ─── Ajustar límites de stock ─────────────────────────────────────────────────

function abrirLimites({ id, min, max }) {
  modal.open({
    title: "Ajustar límites de stock",
    fields: [
      {
        id: "stockMinimo",
        label: "Stock mínimo",
        type: "number",
        required: true,
        min: 0,
        hint: "Cantidad mínima antes de generar alerta de stock bajo.",
      },
      {
        id: "stockMaximo",
        label: "Stock máximo",
        type: "number",
        required: true,
        min: 1,
        hint: "Cantidad máxima recomendada para este producto.",
      },
    ],
    data: { stockMinimo: min, stockMaximo: max },
    confirmText: '<i class="bi bi-check-lg"></i> Guardar',
    onConfirm: async (data) => {
      await inventarioApi.updateLimites(Number(id), {
        stockMinimo: Number(data.stockMinimo),
        stockMaximo: Number(data.stockMaximo),
      });
      toast.success("Límites actualizados correctamente.");
      await cargarInventario();
    },
  });
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

selectSucursal.addEventListener("change", async () => {
  const sucursales = await store.getSucursalesActivas();
  const seleccionada = sucursales.find(
    (s) => s.idSucursal === Number(selectSucursal.value),
  );

  sucursalActual = Number(selectSucursal.value);
  nombreSucursal = seleccionada?.nombre ?? "";

  // Resetear tabla para forzar re-creación con datos nuevos
  if (tabla) {
    tabla.destroy();
    tabla = null;
    document.querySelector("#tabla-inventario tbody").innerHTML = "";
  }

  await cargarInventario();
});

selectEstado.addEventListener("change", aplicarFiltroEstado);
btnAgregar.addEventListener("click", abrirAgregarInventario);

// ─── Init ─────────────────────────────────────────────────────────────────────

cargarSucursales();
