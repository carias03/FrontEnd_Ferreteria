/**
 * movimientos.js
 * Entry point de Webpack para movimientos.html.
 */

import "../../scss/main.scss";
import "bootstrap-icons/font/bootstrap-icons.css";

import { requireAuth, getCurrentUser } from "@utils/auth.js";
import { store } from "@utils/store.js";
import { toast } from "@components/toast.js";
import { modal } from "@components/modal.js";
import { createTabla } from "@components/tabla.js";
import { movimientosApi } from "@api/movimientosApi.js";
import { inventarioApi } from "@api/inventarioApi.js";
import dayjs from "dayjs";

import "@components/sidebar.js";
import "@utils/logout.js";

requireAuth();

// ─── Estado ───────────────────────────────────────────────────────────────────

let tabla = null;
let sucursalActual = null;
let mapaInventario = {}; // idInventario → { codigo, nombre }
let mapaUsuarios = {}; // idUsuario    → username

// ─── DOM ──────────────────────────────────────────────────────────────────────

const selectSucursal = document.getElementById("select-sucursal");
const inputDesde = document.getElementById("input-desde");
const inputHasta = document.getElementById("input-hasta");
const btnBuscar = document.getElementById("btn-buscar");
const btnNuevo = document.getElementById("btn-nuevo-movimiento");
const statEntradas = document.getElementById("stat-entradas");
const statSalidas = document.getElementById("stat-salidas");
const statTotal = document.getElementById("stat-total");

// ─── Fechas por defecto: último mes ──────────────────────────────────────────

function inicializarFechas() {
  inputHasta.value = dayjs().format("YYYY-MM-DD");
  inputDesde.value = dayjs().subtract(1, "month").format("YYYY-MM-DD");
}

// ─── Cargar mapas de enriquecimiento ─────────────────────────────────────────

async function cargarMapas() {
  try {
    // Inventario de la sucursal → mapa idInventario → producto.
    // Se usa getAll() del endpoint (sin filtro de estado en el backend) para
    // que los productos desactivados sigan apareciendo en el historial.
    if (sucursalActual) {
      const inventario = await inventarioApi.getBySucursal(sucursalActual);
      mapaInventario = {};
      inventario.forEach((i) => {
        mapaInventario[i.idInventario] = {
          codigo: i.producto?.codigo ?? "—",
          nombre: i.producto?.nombre ?? "—",
        };
      });
    }

    // Usuarios → mapa idUsuario → username (via store)
    mapaUsuarios = await store.getMapaUsuarios();
  } catch (err) {
    console.warn("No se pudieron cargar los mapas de enriquecimiento:", err);
  }
}

// ─── Cargar sucursales ────────────────────────────────────────────────────────

async function cargarSucursales() {
  const sucursales = await store.getSucursalesActivas();

  selectSucursal.innerHTML = sucursales
    .map((s) => `<option value="${s.idSucursal}">${s.nombre}</option>`)
    .join("");

  if (sucursales.length > 0) {
    sucursalActual = sucursales[0].idSucursal;
    await cargarMapas();
    await buscar();
  } else {
    selectSucursal.innerHTML = '<option value="">Sin sucursales</option>';
  }
}

// ─── Buscar movimientos ───────────────────────────────────────────────────────

async function buscar() {
  if (!sucursalActual) return;

  const desde = inputDesde.value;
  const hasta = inputHasta.value;

  if (!desde || !hasta) {
    toast.error("Seleccioná un rango de fechas.");
    return;
  }

  if (dayjs(desde).isAfter(dayjs(hasta))) {
    toast.error('La fecha "desde" no puede ser mayor que "hasta".');
    return;
  }

  try {
    const data = await movimientosApi.getBySucursal(
      sucursalActual,
      `${desde}T00:00:00`,
      `${hasta}T23:59:59`,
    );

    actualizarResumen(data);

    // Fix bug DataTables reinit: destruir siempre antes de recrear
    if (tabla) {
      tabla.destroy();
      document.querySelector("#tabla-movimientos tbody").innerHTML = "";
      tabla = null;
    }

    inicializarTabla(data);
  } catch (error) {
    toast.error("No se pudieron cargar los movimientos.");
    console.error(error);
  }
}

// ─── Cards resumen ────────────────────────────────────────────────────────────

function actualizarResumen(data) {
  const entradas = data.filter((m) => m.tipoMovimiento === "ENTRADA").length;
  const salidas = data.filter((m) => m.tipoMovimiento === "SALIDA").length;

  statEntradas.textContent = entradas;
  statSalidas.textContent = salidas;
  statTotal.textContent = data.length;
}

// ─── Tabla ────────────────────────────────────────────────────────────────────

function inicializarTabla(data) {
  tabla = createTabla("#tabla-movimientos", {
    data,
    order: [[0, "desc"]],
    columns: [
      {
        title: "Fecha",
        data: null,
        render: (row) => {
          if (!row.fecha) return "—";
          const fecha = new Date(row.fecha.replace(" ", "T"));
          return fecha.toLocaleString("es-CR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
        },
      },
      {
        title: "Producto",
        data: null,
        render: (row) => {
          const p = mapaInventario[row.idInventario];
          return p
            ? `<span style="font-family:monospace;font-size:12px;color:var(--color-text-muted)">${p.codigo}</span>
               <span style="margin-left:6px">${p.nombre}</span>`
            : `<span style="color:var(--color-text-muted);font-style:italic">Inv. #${row.idInventario}</span>`;
        },
      },
      {
        title: "Tipo",
        data: null,
        render: (row) => {
          const config = {
            ENTRADA: {
              clase: "badge--success",
              icono: "bi-arrow-down-circle",
              label: "Entrada",
            },
            SALIDA: {
              clase: "badge--danger",
              icono: "bi-arrow-up-circle",
              label: "Salida",
            },
          };
          const c = config[row.tipoMovimiento] ?? {
            clase: "badge--neutral",
            icono: "bi-question",
            label: row.tipoMovimiento,
          };
          return `<span class="badge ${c.clase}"><i class="bi ${c.icono}"></i> ${c.label}</span>`;
        },
      },
      {
        title: "Cantidad",
        data: null,
        render: (row) => {
          const esEntrada = row.tipoMovimiento === "ENTRADA";
          const color = esEntrada
            ? "var(--color-success)"
            : "var(--color-danger)";
          const signo = esEntrada ? "+" : "-";
          return `<strong style="color:${color}">${signo}${row.cantidad}</strong>`;
        },
      },
      {
        title: "Antes",
        data: null,
        render: (row) => row.cantidadAntes,
      },
      {
        title: "Después",
        data: null,
        render: (row) => `<strong>${row.cantidadDespues}</strong>`,
      },
      {
        title: "Motivo",
        data: null,
        render: (row) =>
          row.motivo
            ? `<span title="${row.motivo}">${row.motivo.length > 40 ? row.motivo.slice(0, 40) + "…" : row.motivo}</span>`
            : `<span style="color:var(--color-text-muted);font-style:italic">—</span>`,
      },
      {
        title: "Usuario",
        data: null,
        render: (row) => {
          const username = mapaUsuarios[row.idUsuario];
          return `<span class="badge badge--neutral">${username ?? "#" + row.idUsuario}</span>`;
        },
      },
    ],
  });
}

// ─── Registrar movimiento ─────────────────────────────────────────────────────

async function abrirNuevoMovimiento() {
  // Se trae TODO el inventario de la sucursal, incluyendo productos
  // desactivados, porque pueden seguir teniendo stock físico y necesitar
  // ajustes (ej: salida por merma, devolución, corrección de conteo).
  const inventario = await inventarioApi.getBySucursal(sucursalActual);

  const productosOptions = inventario.map((i) => {
    const activo = i.producto?.estado !== false;
    const sufijo = activo ? "" : " [inactivo]";
    return {
      value: i.idInventario,
      label: `${i.producto?.codigo ?? "?"} — ${i.producto?.nombre ?? "Producto"}${sufijo} (stock: ${i.cantidad})`,
    };
  });

  if (productosOptions.length === 0) {
    toast.error("No hay productos en el inventario de esta sucursal.");
    return;
  }

  const usuario = getCurrentUser();

  modal.open({
    title: "Registrar movimiento",
    fields: [
      {
        id: "idInventario",
        label: "Producto",
        type: "select",
        required: true,
        options: productosOptions,
      },
      {
        id: "tipoMovimiento",
        label: "Tipo de movimiento",
        type: "select",
        required: true,
        options: [
          { value: "ENTRADA", label: "Entrada — suma al stock" },
          { value: "SALIDA", label: "Salida — resta del stock" },
        ],
      },
      {
        id: "cantidad",
        label: "Cantidad",
        type: "number",
        required: true,
        placeholder: "Ingresá la cantidad",
        min: 1,
      },
      {
        id: "motivo",
        label: "Motivo",
        type: "textarea",
        required: false,
        placeholder: "Descripción del movimiento (opcional)",
      },
    ],
    confirmText: '<i class="bi bi-check-lg"></i> Registrar',
    onConfirm: async (data) => {
      // Fix: usar create() heredado de BaseApi, no registrar()
      await movimientosApi.create({
        idInventario: Number(data.idInventario),
        tipoMovimiento: data.tipoMovimiento,
        cantidad: Number(data.cantidad),
        motivo: data.motivo || null,
        idUsuario: usuario.idUsuario,
      });

      toast.success("Movimiento registrado correctamente.");
      await cargarMapas(); // el stock cambió, refrescar el mapa
      await buscar();
    },
  });
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

selectSucursal.addEventListener("change", async () => {
  sucursalActual = Number(selectSucursal.value);
  await cargarMapas();
  await buscar();
});

btnBuscar.addEventListener("click", buscar);
btnNuevo.addEventListener("click", abrirNuevoMovimiento);

[inputDesde, inputHasta].forEach((el) => {
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") buscar();
  });
});

// ─── Init ─────────────────────────────────────────────────────────────────────

inicializarFechas();
cargarSucursales();
