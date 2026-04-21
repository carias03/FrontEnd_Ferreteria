// =============================================
// src/js/pages/ordenes.js
// =============================================

import "../../scss/main.scss";
import "bootstrap-icons/font/bootstrap-icons.css";

import { requireAuth, getCurrentUser } from "@utils/auth.js";
import { store } from "@utils/store.js";
import { toast } from "@components/toast.js";
import { createTabla } from "@components/tabla.js";
import { ordenesApi } from "@api/ordenesApi.js";

import "@components/sidebar.js";
import "@utils/logout.js";

requireAuth();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatColones = (valor) =>
  `₡${Number(valor ?? 0).toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatFecha = (valor) => {
  if (!valor) return "—";
  return new Date(valor).toLocaleString("es-CR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Estado local ─────────────────────────────────────────────────────────────

let tabla = null;
let itemsOrden = []; // [{ idProducto, nombre, cantidad, precioCompra, idProveedor, proveedorNombre }]
let productosMap = {}; // idProducto → producto
let ordenActual = null; // orden cargada en el modal de detalle

// mapas para enriquecer la tabla principal (igual que ventas.js)
let mapaSucursales = {}; // idSucursal → nombre
let mapaUsuarios = {}; // idUsuario  → username

// ─── DOM — controles principales ─────────────────────────────────────────────

const selectSucursalFiltro = document.getElementById("select-sucursal");
const btnNueva = document.getElementById("btn-nueva-orden");

// ─── DOM — modal nueva orden ──────────────────────────────────────────────────

const ordenOverlay = document.getElementById("orden-overlay");
const ordenClose = document.getElementById("orden-modal-close");
const ordenCancelar = document.getElementById("orden-btn-cancelar");
const ordenConfirmar = document.getElementById("orden-btn-confirmar");
const selectSucursal = document.getElementById("orden-sucursal");
const errorSucursal = document.getElementById("error-orden-sucursal");
const selectProveedor = document.getElementById("orden-proveedor");
const errorProveedor = document.getElementById("error-orden-proveedor");

const selectProd = document.getElementById("orden-prod-select");
const inputCantidad = document.getElementById("orden-prod-cantidad");
const btnAgregar = document.getElementById("btn-agregar-item-orden");
const itemsTbody = document.getElementById("orden-items-tbody");
const itemsEmpty = document.getElementById("orden-items-empty");
const totalRow = document.getElementById("orden-total-row");
const totalLabel = document.getElementById("orden-total-label");

// ─── DOM — modal detalle ──────────────────────────────────────────────────────

const detalleOverlay = document.getElementById("detalle-orden-overlay");
const detalleClose = document.getElementById("detalle-orden-close");
const detalleCerrar = document.getElementById("detalle-orden-btn-cerrar");
const detalleTitle = document.getElementById("detalle-orden-title");
const detalleBody = document.getElementById("detalle-orden-body");
const detalleFooter = document.getElementById("detalle-orden-footer");

// ─── DOM — modal cambio de estado ────────────────────────────────────────────

const estadoOverlay = document.getElementById("estado-orden-overlay");
const estadoClose = document.getElementById("estado-orden-close");
const estadoCancelar = document.getElementById("estado-orden-btn-cancelar");
const estadoConfirmar = document.getElementById("estado-orden-btn-confirmar");
const estadoTitle = document.getElementById("estado-orden-title");
const estadoMensaje = document.getElementById("estado-orden-mensaje");

// ─── Helpers de estado ───────────────────────────────────────────────────────

const ESTADO_BADGE = {
  PENDIENTE: "badge--warning",
  ENVIADA: "badge--info",
  RECIBIDA: "badge--success",
  CANCELADA: "badge--danger",
};

const ESTADO_LABEL = {
  PENDIENTE: "Pendiente",
  ENVIADA: "Enviada",
  RECIBIDA: "Recibida",
  CANCELADA: "Cancelada",
};

// Transiciones válidas desde cada estado
const TRANSICIONES = {
  PENDIENTE: ["ENVIADA", "RECIBIDA", "CANCELADA"],
  ENVIADA: ["RECIBIDA", "CANCELADA"],
  RECIBIDA: [],
  CANCELADA: [],
};

function badgeEstado(estado) {
  const cls = ESTADO_BADGE[estado] ?? "badge--neutral";
  const label = ESTADO_LABEL[estado] ?? estado;
  return `<span class="badge ${cls}">${label}</span>`;
}

// ─── Helpers de modal ─────────────────────────────────────────────────────────

function abrirOrdenModal() {
  ordenOverlay.classList.add("active");
}

function cerrarOrdenModal() {
  ordenOverlay.classList.remove("active");
}

function abrirDetalleModal() {
  detalleOverlay.classList.add("active");
}

function cerrarDetalleModal() {
  detalleOverlay.classList.remove("active");
  ordenActual = null;
}

function abrirEstadoModal() {
  estadoOverlay.classList.add("active");
}

function cerrarEstadoModal() {
  estadoOverlay.classList.remove("active");
}

// ─── Cargar mapas de enriquecimiento ─────────────────────────────────────────
// FIX 1 y 2: sucursal y usuario no se mostraban porque el listado devuelve
// solo idSucursal / idUsuario — igual que ventas.js, enriquecemos con mapas.

async function cargarMapas() {
  const [sucursales, usuarios] = await Promise.all([
    store.getSucursales(),
    store.getMapaUsuarios(),
  ]);

  mapaSucursales = {};
  sucursales.forEach((s) => {
    mapaSucursales[s.idSucursal] = s.nombre;
  });

  mapaUsuarios = usuarios; // { idUsuario → username }
}

// ─── Tabla principal ──────────────────────────────────────────────────────────

function inicializarTabla(data) {
  tabla = createTabla("#tabla-ordenes", {
    data,
    order: [[0, "desc"]],
    columns: [
      {
        title: "#",
        data: "idOrden",
        width: "60px",
        type: "num",
      },
      {
        // FIX 1: usar mapa cuando sucursal viene null en el listado
        title: "Sucursal",
        data: null,
        render: (row) =>
          row.sucursal?.nombre ?? mapaSucursales[row.idSucursal] ?? "—",
      },
      {
        title: "Proveedor",
        data: null,
        render: (row) => row.proveedor?.nombre ?? "—",
      },
      {
        // FIX 2: usar mapa cuando usuario viene null en el listado
        title: "Usuario",
        data: null,
        render: (row) => {
          const username = row.usuario?.username ?? mapaUsuarios[row.idUsuario];
          return `<span class="badge badge--neutral">${username ?? "#" + row.idUsuario}</span>`;
        },
      },
      {
        // FIX 3: formato de fecha con toLocaleString igual que ventas.js
        title: "Fecha",
        data: null,
        render: (row) => formatFecha(row.fecha),
      },
      {
        title: "Estado",
        data: null,
        render: (row) => badgeEstado(row.estado),
      },
      {
        title: "Acciones",
        data: null,
        orderable: false,
        className: "text-center",
        render: (row) => `
          <div class="table-actions" style="justify-content:center">
            <button class="btn btn--secondary btn--sm btn--icon btn-ver-detalle"
                    data-id="${row.idOrden}" title="Ver detalle">
              <i class="bi bi-eye"></i>
            </button>
          </div>`,
      },
    ],
  });
}

async function cargarOrdenes(idSucursal = null) {
  try {
    const sucursales = await store.getSucursales();
    const lista = idSucursal
      ? [sucursales.find((s) => s.idSucursal === idSucursal)].filter(Boolean)
      : sucursales;

    let todas = [];
    for (const s of lista) {
      const ordenes = await ordenesApi.getBySucursal(s.idSucursal);
      // Inyectar idSucursal para que el mapa lo resuelva cuando sucursal viene null
      if (Array.isArray(ordenes))
        todas = todas.concat(
          ordenes.map((o) => ({ ...o, idSucursal: s.idSucursal })),
        );
    }

    todas.sort((a, b) => b.idOrden - a.idOrden);

    actualizarStats(todas);

    if (tabla) {
      tabla.reload(todas);
    } else {
      inicializarTabla(todas);
      document
        .getElementById("tabla-ordenes")
        .addEventListener("click", manejarAccionesTabla);
    }
  } catch (error) {
    toast.error("No se pudieron cargar las órdenes.");
    console.error(error);
  }
}

function actualizarStats(ordenes) {
  const contar = (estado) => ordenes.filter((o) => o.estado === estado).length;
  document.getElementById("stat-pendientes").textContent = contar("PENDIENTE");
  document.getElementById("stat-enviadas").textContent = contar("ENVIADA");
  document.getElementById("stat-recibidas").textContent = contar("RECIBIDA");
  document.getElementById("stat-canceladas").textContent = contar("CANCELADA");
}

// ─── Delegación de eventos — tabla ───────────────────────────────────────────

async function manejarAccionesTabla(e) {
  const btnDetalle = e.target.closest(".btn-ver-detalle");
  if (btnDetalle) await abrirDetalle(Number(btnDetalle.dataset.id));
}

// ─── Detalle de orden ─────────────────────────────────────────────────────────

async function abrirDetalle(idOrden) {
  detalleTitle.textContent = `Orden #${idOrden}`;
  detalleBody.innerHTML = `<p style="color:var(--color-text-muted)">Cargando...</p>`;
  // Limpiar botones dinámicos mientras carga
  Array.from(detalleFooter.querySelectorAll(".btn-estado-dinamico")).forEach(
    (b) => b.remove(),
  );
  abrirDetalleModal();

  try {
    const orden = await ordenesApi.getById(idOrden);
    ordenActual = orden;
    detalleBody.innerHTML = renderDetalleOrden(orden);
    renderBotonesEstado(orden);
  } catch (error) {
    detalleBody.innerHTML = `<p style="color:var(--color-danger)">No se pudo cargar el detalle.</p>`;
    console.error(error);
  }
}

function renderDetalleOrden(orden) {
  const detalles = orden.detalle ?? orden.detalles ?? orden.productos ?? [];

  const filas = detalles
    .map(
      (d) => `
      <tr>
        <td>${d.producto?.nombre ?? d.nombreProducto ?? `#${d.idProducto}`}</td>
        <td class="text-center">${d.cantidad}</td>
        <td class="text-end">${formatColones(d.precioUnitario ?? d.precioCompra)}</td>
        <td class="text-end"><strong>${formatColones(
          d.subtotal ?? d.cantidad * (d.precioUnitario ?? d.precioCompra ?? 0),
        )}</strong></td>
      </tr>`,
    )
    .join("");

  return `
    <div class="detalle-grid">
      <div class="detalle-item">
        <span class="detalle-label">Sucursal</span>
        <span class="detalle-value">${
          orden.sucursal?.nombre ?? mapaSucursales[orden.idSucursal] ?? "—"
        }</span>
      </div>
      <div class="detalle-item">
        <span class="detalle-label">Proveedor</span>
        <span class="detalle-value">${orden.proveedor?.nombre ?? "—"}</span>
      </div>
      <div class="detalle-item">
        <span class="detalle-label">Usuario</span>
        <span class="detalle-value">${
          orden.usuario?.username ??
          mapaUsuarios[orden.idUsuario] ??
          `#${orden.idUsuario}`
        }</span>
      </div>
      <div class="detalle-item">
        <span class="detalle-label">Fecha</span>
        <span class="detalle-value">${formatFecha(orden.fecha)}</span>
      </div>
      <div class="detalle-item">
        <span class="detalle-label">Estado</span>
        <span class="detalle-value">${badgeEstado(orden.estado)}</span>
      </div>
    </div>

    <div class="venta-items-table-wrapper" style="margin-top:16px">
      <table class="venta-items-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th class="text-center" style="width:90px">Cant.</th>
            <th class="text-end" style="width:130px">Precio unit.</th>
            <th class="text-end" style="width:130px">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${
            filas ||
            `<tr><td colspan="4" class="text-center"
              style="color:var(--color-text-muted);font-style:italic;padding:16px 0">
              Sin productos registrados.
            </td></tr>`
          }
        </tbody>
      </table>
    </div>`;
}

// ─── FIX 4: botón único "Cambiar estado" que muestra todas las transiciones ───
// Reemplaza el botón "Marcar como Enviada" individual por un selector de estado
// que muestra solo las transiciones válidas desde el estado actual.

function renderBotonesEstado(orden) {
  // Limpiar botones dinámicos anteriores
  Array.from(detalleFooter.querySelectorAll(".btn-estado-dinamico")).forEach(
    (b) => b.remove(),
  );

  const transiciones = TRANSICIONES[orden.estado] ?? [];
  if (transiciones.length === 0) return;

  // Contenedor con select + botón confirmar
  const wrapper = document.createElement("div");
  wrapper.className = "btn-estado-dinamico estado-change-wrapper";
  wrapper.innerHTML = `
    <div class="select-wrapper" style="min-width:160px">
      <select id="select-nuevo-estado" class="form-control form-control--sm">
        <option value="" hidden>Cambiar estado…</option>
        ${transiciones
          .map((e) => `<option value="${e}">${ESTADO_LABEL[e]}</option>`)
          .join("")}
      </select>
      <i class="bi bi-chevron-down select-icon"></i>
    </div>
    <button class="btn btn--primary btn-confirmar-estado" disabled>
      <i class="bi bi-arrow-repeat"></i> Cambiar
    </button>`;

  // Habilitar el botón sólo cuando se elige un estado
  const selectEstado = wrapper.querySelector("#select-nuevo-estado");
  const btnConfirmarEstado = wrapper.querySelector(".btn-confirmar-estado");

  selectEstado.addEventListener("change", () => {
    btnConfirmarEstado.disabled = !selectEstado.value;
    // Poner clase peligro si es CANCELADA
    btnConfirmarEstado.className = `btn btn-confirmar-estado ${
      selectEstado.value === "CANCELADA" ? "btn--danger" : "btn--primary"
    }`;
  });

  btnConfirmarEstado.addEventListener("click", () => {
    if (!selectEstado.value) return;
    confirmarCambioEstado(orden.idOrden, selectEstado.value);
  });

  // Insertar antes del botón "Cerrar"
  detalleFooter.insertBefore(wrapper, detalleCerrar);
}

// ─── FIX 5: cambio de estado — ahora sí envía el estado correcto ─────────────

let _pendingEstadoChange = null; // { idOrden, estado }

function confirmarCambioEstado(idOrden, nuevoEstado) {
  _pendingEstadoChange = { idOrden, estado: nuevoEstado };

  const mensajes = {
    ENVIADA: `¿Confirmás que la orden #${idOrden} fue enviada al proveedor?`,
    RECIBIDA: `¿Confirmás la recepción de la orden #${idOrden}? Esto generará las entradas de inventario automáticamente.`,
    CANCELADA: `¿Estás seguro de que querés cancelar la orden #${idOrden}? Esta acción no se puede deshacer.`,
  };

  estadoTitle.textContent = `Cambiar a: ${ESTADO_LABEL[nuevoEstado]}`;
  estadoMensaje.textContent =
    mensajes[nuevoEstado] ?? "¿Confirmás el cambio de estado?";

  estadoConfirmar.className = `btn ${
    nuevoEstado === "CANCELADA" ? "btn--danger" : "btn--primary"
  }`;
  estadoConfirmar.innerHTML = `<i class="bi bi-check-lg"></i> Confirmar`;

  abrirEstadoModal();
}

estadoConfirmar.addEventListener("click", async () => {
  if (!_pendingEstadoChange) return;

  estadoConfirmar.disabled = true;
  const originalText = estadoConfirmar.innerHTML;
  estadoConfirmar.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Guardando...`;

  try {
    const { idOrden, estado } = _pendingEstadoChange;
    const usuario = getCurrentUser();

    await ordenesApi.cambiarEstado(idOrden, estado, usuario.idUsuario);

    toast.success(`Orden #${idOrden} actualizada a ${ESTADO_LABEL[estado]}.`);

    cerrarEstadoModal();
    cerrarDetalleModal();

    const idSucursal = Number(selectSucursalFiltro.value) || null;
    await cargarOrdenes(idSucursal);
  } catch (error) {
    toast.error(error.message || "No se pudo cambiar el estado.");
    console.error(error);
  } finally {
    estadoConfirmar.disabled = false;
    estadoConfirmar.innerHTML = originalText;
    _pendingEstadoChange = null;
  }
});

// ─── Modal nueva orden — poblar selects ──────────────────────────────────────

async function poblarSelectsOrden() {
  const [sucursalesOpts, proveedoresOpts] = await Promise.all([
    store.getSucursalesOptions(),
    store.getProveedoresOptions(false),
  ]);

  selectSucursal.innerHTML =
    `<option value="" hidden>Seleccioná una sucursal</option>` +
    sucursalesOpts
      .map((o) => `<option value="${o.value}">${o.label}</option>`)
      .join("");

  selectProveedor.innerHTML =
    `<option value="" hidden>Seleccioná un proveedor</option>` +
    proveedoresOpts
      .map((o) => `<option value="${o.value}">${o.label}</option>`)
      .join("");

  productosMap = await store.getProductosMap();

  // Select de productos vacío hasta que se elija proveedor
  selectProd.innerHTML = `<option value="" hidden>Primero seleccioná un proveedor</option>`;
  selectProd.disabled = true;
  btnAgregar.disabled = true;
}

// ─── Al cambiar proveedor: filtrar productos y limpiar tabla ──────────────────

selectProveedor.addEventListener("change", () => {
  const idProveedor = Number(selectProveedor.value);

  // Si había items, limpiarlos
  if (itemsOrden.length > 0) {
    itemsOrden = [];
    renderItemsOrden();
  }

  if (!idProveedor) {
    selectProd.innerHTML = `<option value="" hidden>Primero seleccioná un proveedor</option>`;
    selectProd.disabled = true;
    btnAgregar.disabled = true;
    return;
  }

  // Filtrar productos de ese proveedor
  const options = Object.values(productosMap)
    .filter(
      (p) => p.estado !== false && p.proveedor?.idProveedor === idProveedor,
    )
    .map((p) => `<option value="${p.idProducto}">${p.nombre}</option>`)
    .join("");

  if (!options) {
    selectProd.innerHTML = `<option value="" hidden>Sin productos para este proveedor</option>`;
    selectProd.disabled = true;
    btnAgregar.disabled = true;
    toast.warning("Este proveedor no tiene productos asignados.");
    return;
  }

  selectProd.innerHTML =
    `<option value="" hidden>Seleccioná un producto</option>` + options;
  selectProd.disabled = false;
  btnAgregar.disabled = false;
});

// ─── Agregar item ─────────────────────────────────────────────────────────────

btnAgregar.addEventListener("click", () => {
  const idProducto = Number(selectProd.value);
  const cantidad = Number(inputCantidad.value);

  if (!idProducto) {
    toast.warning("Seleccioná un producto.");
    return;
  }
  if (!cantidad || cantidad < 1) {
    toast.warning("La cantidad debe ser mayor a 0.");
    return;
  }

  const producto = productosMap[idProducto];
  if (!producto) {
    toast.error("Producto no encontrado.");
    return;
  }

  const existente = itemsOrden.find((i) => i.idProducto === idProducto);
  if (existente) {
    existente.cantidad += cantidad;
  } else {
    itemsOrden.push({
      idProducto,
      nombre: producto.nombre,
      cantidad,
      precioCompra: producto.precioCompra ?? 0,
      idProveedor: Number(selectProveedor.value),
    });
  }

  renderItemsOrden();
  selectProd.value = "";
  inputCantidad.value = "1";
});

// ─── Renderizar tabla de items ────────────────────────────────────────────────

function renderItemsOrden() {
  itemsTbody.querySelectorAll("tr.item-row").forEach((r) => r.remove());

  if (itemsOrden.length === 0) {
    itemsEmpty.style.display = "";
    totalRow.style.display = "none";
    return;
  }

  itemsEmpty.style.display = "none";
  totalRow.style.display = "";

  let total = 0;

  itemsOrden.forEach((item, idx) => {
    const subtotal = item.cantidad * item.precioCompra;
    total += subtotal;

    const tr = document.createElement("tr");
    tr.className = "item-row";
    tr.innerHTML = `
      <td>${item.nombre}</td>
      <td class="text-center">${item.cantidad}</td>
      <td class="text-end">${formatColones(item.precioCompra)}</td>
      <td class="text-end"><strong>${formatColones(subtotal)}</strong></td>
      <td class="text-center">
        <button class="btn btn--ghost btn--sm btn--icon btn-quitar-item"
                data-idx="${idx}" title="Quitar">
          <i class="bi bi-x-lg" style="color:var(--color-danger)"></i>
        </button>
      </td>`;
    itemsTbody.insertBefore(tr, itemsEmpty);
  });

  totalLabel.textContent = formatColones(total);
}

itemsTbody.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-quitar-item");
  if (!btn) return;
  itemsOrden.splice(Number(btn.dataset.idx), 1);
  renderItemsOrden();
});

// ─── Confirmar orden ──────────────────────────────────────────────────────────

ordenConfirmar.addEventListener("click", async () => {
  const idSucursal = Number(selectSucursal.value);
  const idProveedor = Number(selectProveedor.value);

  if (!idSucursal) {
    errorSucursal.textContent = "Sucursal es requerida.";
    errorSucursal.style.display = "block";
    selectSucursal.classList.add("is-invalid");
    return;
  }
  errorSucursal.style.display = "none";
  selectSucursal.classList.remove("is-invalid");

  if (!idProveedor) {
    errorProveedor.textContent = "Proveedor es requerido.";
    errorProveedor.style.display = "block";
    selectProveedor.classList.add("is-invalid");
    return;
  }
  errorProveedor.style.display = "none";
  selectProveedor.classList.remove("is-invalid");

  if (itemsOrden.length === 0) {
    toast.warning("Agregá al menos un producto a la orden.");
    return;
  }

  ordenConfirmar.disabled = true;
  const originalText = ordenConfirmar.innerHTML;
  ordenConfirmar.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Guardando...`;

  try {
    const usuario = getCurrentUser();

    // Paso 1: crear encabezado
    const orden = await ordenesApi.crear({
      idSucursal,
      idProveedor,
      idUsuario: usuario.idUsuario,
    });

    // Paso 2: agregar productos en bloque
    await ordenesApi.agregarProductos(
      orden.idOrden,
      itemsOrden.map((i) => ({
        idProducto: i.idProducto,
        cantidad: i.cantidad,
        precioUnitario: i.precioCompra,
      })),
    );

    toast.success(`Orden #${orden.idOrden} creada correctamente.`);
    cerrarOrdenModal();

    const idSucursalFiltro = Number(selectSucursalFiltro.value) || null;
    await cargarOrdenes(idSucursalFiltro);
  } catch (error) {
    toast.error(error.message || "No se pudo crear la orden.");
    console.error(error);
  } finally {
    ordenConfirmar.disabled = false;
    ordenConfirmar.innerHTML = originalText;
  }
});

// ─── Abrir modal nueva orden ──────────────────────────────────────────────────

async function abrirNuevaOrden() {
  // Poblar selects primero
  await poblarSelectsOrden();

  // Resetear estado
  itemsOrden = [];
  renderItemsOrden();

  selectSucursal.value = "";
  selectProveedor.value = "";
  inputCantidad.value = "1";

  errorSucursal.style.display = "none";
  errorProveedor.style.display = "none";
  selectSucursal.classList.remove("is-invalid");
  selectProveedor.classList.remove("is-invalid");

  abrirOrdenModal();
}

// ─── Filtro por sucursal ──────────────────────────────────────────────────────

async function poblarSelectSucursalFiltro() {
  const sucursales = await store.getSucursales();
  selectSucursalFiltro.innerHTML =
    `<option value="">Todas las sucursales</option>` +
    sucursales
      .map((s) => `<option value="${s.idSucursal}">${s.nombre}</option>`)
      .join("");
}

selectSucursalFiltro.addEventListener("change", () => {
  const id = Number(selectSucursalFiltro.value) || null;
  cargarOrdenes(id);
});

// ─── Cerrar modales ───────────────────────────────────────────────────────────

ordenClose.addEventListener("click", cerrarOrdenModal);
ordenCancelar.addEventListener("click", cerrarOrdenModal);
detalleClose.addEventListener("click", cerrarDetalleModal);
detalleCerrar.addEventListener("click", cerrarDetalleModal);
estadoClose.addEventListener("click", cerrarEstadoModal);
estadoCancelar.addEventListener("click", cerrarEstadoModal);

ordenOverlay.addEventListener("click", (e) => {
  if (e.target === ordenOverlay) cerrarOrdenModal();
});
detalleOverlay.addEventListener("click", (e) => {
  if (e.target === detalleOverlay) cerrarDetalleModal();
});
estadoOverlay.addEventListener("click", (e) => {
  if (e.target === estadoOverlay) cerrarEstadoModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  // Cerrar en orden: estado → detalle → nueva orden
  if (estadoOverlay.classList.contains("active")) {
    cerrarEstadoModal();
    return;
  }
  if (detalleOverlay.classList.contains("active")) {
    cerrarDetalleModal();
    return;
  }
  if (ordenOverlay.classList.contains("active")) cerrarOrdenModal();
});

// ─── Inicialización ───────────────────────────────────────────────────────────

btnNueva.addEventListener("click", abrirNuevaOrden);

(async () => {
  await cargarMapas();
  await poblarSelectSucursalFiltro();
  await cargarOrdenes();
})();
