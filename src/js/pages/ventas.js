// =============================================
// src/js/pages/ventas.js
// =============================================

import "../../scss/main.scss";
import "bootstrap-icons/font/bootstrap-icons.css";

import { requireAuth, getCurrentUser } from "@utils/auth.js";
import { store } from "@utils/store.js";
import { toast } from "@components/toast.js";
import { createTabla } from "@components/tabla.js";
import { ventasApi } from "@api/ventasApi.js";

import "@components/sidebar.js";
import "@utils/logout.js";

requireAuth();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatColones = (valor) =>
  `₡${Number(valor ?? 0).toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ─── Estado local ─────────────────────────────────────────────────────────────

let tabla = null;
let itemsVenta = [];
let productosMap = {};
let mapaSucursales = {}; // idSucursal → nombre
let mapaUsuarios = {}; // idUsuario  → username

// ─── DOM — controles principales ─────────────────────────────────────────────

const selectSucursalFiltro = document.getElementById("select-sucursal");
const inputDesde = document.getElementById("input-desde");
const inputHasta = document.getElementById("input-hasta");
const btnBuscar = document.getElementById("btn-buscar");
const btnNueva = document.getElementById("btn-nueva-venta");

// ─── DOM — modal nueva venta ──────────────────────────────────────────────────

const ventaOverlay = document.getElementById("venta-overlay");
const ventaClose = document.getElementById("venta-modal-close");
const ventaCancelar = document.getElementById("venta-btn-cancelar");
const ventaConfirmar = document.getElementById("venta-btn-confirmar");
const selectSucursal = document.getElementById("venta-sucursal");
const errorSucursal = document.getElementById("error-venta-sucursal");

const selectProd = document.getElementById("venta-prod-select");
const inputCantidad = document.getElementById("venta-prod-cantidad");
const itemsTbody = document.getElementById("venta-items-tbody");
const itemsEmpty = document.getElementById("venta-items-empty");
const totalRow = document.getElementById("venta-total-row");
const totalLabel = document.getElementById("venta-total-label");

// ─── DOM — modal detalle ──────────────────────────────────────────────────────

const detalleOverlay = document.getElementById("detalle-venta-overlay");
const detalleClose = document.getElementById("detalle-venta-close");
const detalleCerrar = document.getElementById("detalle-venta-btn-cerrar");
const detalleTitle = document.getElementById("detalle-venta-title");
const detalleBody = document.getElementById("detalle-venta-body");

// ─── Helpers de modal ─────────────────────────────────────────────────────────

const abrirVentaModal = () => ventaOverlay.classList.add("active");
const cerrarVentaModal = () => ventaOverlay.classList.remove("active");
const abrirDetalleModal = () => detalleOverlay.classList.add("active");
const cerrarDetalleModal = () => detalleOverlay.classList.remove("active");

// ─── Cargar mapas de enriquecimiento ─────────────────────────────────────────

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
  tabla = createTabla("#tabla-ventas", {
    data,
    order: [[0, "desc"]],
    columns: [
      {
        title: "#",
        data: "idVenta",
        width: "60px",
        type: "num",
      },
      {
        title: "Sucursal",
        data: null,
        // El listado devuelve sucursal: null — enriquecemos con el mapa
        render: (row) =>
          row.sucursal?.nombre ?? mapaSucursales[row.idSucursal] ?? "—",
      },
      {
        title: "Usuario",
        data: null,
        render: (row) => {
          const username = mapaUsuarios[row.idUsuario];
          return `<span class="badge badge--neutral">${username ?? "#" + row.idUsuario}</span>`;
        },
      },
      {
        title: "Fecha",
        data: null,
        render: (row) => {
          if (!row.fecha) return "—";
          return new Date(row.fecha).toLocaleString("es-CR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
        },
      },
      {
        title: "Total",
        data: null,
        className: "text-end",
        render: (row) =>
          row.total != null
            ? `<strong>${formatColones(row.total)}</strong>`
            : "—",
      },
      {
        title: "Acciones",
        data: null,
        orderable: false,
        className: "text-center",
        render: (row) => `
            <div class="table-actions" style="justify-content:center">
              <button class="btn btn--secondary btn--sm btn--icon btn-ver-detalle"
                      data-id="${row.idVenta}" title="Ver detalle">
                <i class="bi bi-eye"></i>
              </button>
            </div>`,
      },
    ],
  });
}

async function cargarVentas(idSucursal = null, desde = null, hasta = null) {
  try {
    const sucursales = await store.getSucursales();
    const lista = idSucursal
      ? [sucursales.find((s) => s.idSucursal === idSucursal)].filter(Boolean)
      : sucursales;

    let todas = [];
    for (const s of lista) {
      const ventas = await ventasApi.getBySucursal(s.idSucursal, desde, hasta);
      // Inyectamos idSucursal porque el listado devuelve sucursal: null
      if (Array.isArray(ventas))
        todas = todas.concat(
          ventas.map((v) => ({ ...v, idSucursal: s.idSucursal })),
        );
    }

    todas.sort((a, b) => b.idVenta - a.idVenta);

    actualizarStats(todas);

    if (tabla) {
      tabla.reload(todas);
    } else {
      inicializarTabla(todas);
      document
        .getElementById("tabla-ventas")
        .addEventListener("click", manejarAccionesTabla);
    }
  } catch (error) {
    toast.error("No se pudieron cargar las ventas.");
    console.error(error);
  }
}

function actualizarStats(ventas) {
  document.getElementById("stat-total-ventas").textContent = ventas.length;

  const montoTotal = ventas.reduce((acc, v) => acc + (v.total ?? 0), 0);
  document.getElementById("stat-monto-total").textContent =
    formatColones(montoTotal);
}

// ─── Delegación de eventos — tabla ───────────────────────────────────────────

async function manejarAccionesTabla(e) {
  const btn = e.target.closest(".btn-ver-detalle");
  if (btn) await abrirDetalle(Number(btn.dataset.id));
}

// ─── Detalle de venta ─────────────────────────────────────────────────────────

async function abrirDetalle(idVenta) {
  detalleTitle.textContent = `Venta #${idVenta}`;
  detalleBody.innerHTML = `<p style="color:var(--color-text-muted)">Cargando...</p>`;
  abrirDetalleModal();

  try {
    const venta = await ventasApi.getById(idVenta);
    detalleBody.innerHTML = renderDetalleVenta(venta);
  } catch (error) {
    detalleBody.innerHTML = `<p style="color:var(--color-danger)">No se pudo cargar el detalle.</p>`;
    console.error(error);
  }
}

function renderDetalleVenta(venta) {
  // La API devuelve el array en venta.detalle (no detalles ni productos)
  const detalles = venta.detalle ?? [];

  const filas = detalles
    .map(
      (d) => `
        <tr>
          <td>
            ${
              d.producto?.codigo
                ? `<span style="font-family:monospace;font-size:12px;color:var(--color-text-muted)">${d.producto.codigo}</span>
                  <span style="margin-left:6px">${d.producto.nombre}</span>`
                : (d.producto?.nombre ?? `#${d.idProducto}`)
            }
          </td>
          <td class="text-center">${d.cantidad}</td>
          <td class="text-end">${formatColones(d.precioUnitario)}</td>
          <td class="text-end"><strong>${formatColones(d.subtotal)}</strong></td>
        </tr>`,
    )
    .join("");

  const fechaFormateada = venta.fecha
    ? new Date(venta.fecha).toLocaleString("es-CR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return `
      <div class="detalle-grid">
        <div class="detalle-item">
          <span class="detalle-label">Sucursal</span>
          <span class="detalle-value">${venta.sucursal?.nombre ?? "—"}</span>
        </div>
        <div class="detalle-item">
          <span class="detalle-label">Usuario</span>
          <span class="detalle-value">${mapaUsuarios[venta.idUsuario] ?? `#${venta.idUsuario}`}</span>
        </div>
        <div class="detalle-item">
          <span class="detalle-label">Fecha</span>
          <span class="detalle-value">${fechaFormateada}</span>
        </div>
        <div class="detalle-item">
          <span class="detalle-label">Total</span>
          <span class="detalle-value" style="font-weight:700">
            ${formatColones(venta.total)}
          </span>
        </div>
      </div>

      <div class="venta-items-table-wrapper" style="margin-top:16px">
        <table class="venta-items-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th class="text-center" style="width:80px">Cant.</th>
              <th class="text-end" style="width:140px">Precio unit.</th>
              <th class="text-end" style="width:140px">Subtotal</th>
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
          <tfoot>
            <tr>
              <td colspan="3" class="text-end" style="font-weight:600;padding-right:12px">
                Total:
              </td>
              <td class="text-end" style="font-weight:700;font-size:15px">
                ${formatColones(venta.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>`;
}

// ─── Modal nueva venta — poblar selects ───────────────────────────────────────

async function poblarSelectsVenta() {
  const [sucursalesOpts, productosOpts] = await Promise.all([
    store.getSucursalesOptions(),
    store.getProductosOptions(),
  ]);

  selectSucursal.innerHTML =
    `<option value="" hidden>Seleccioná una sucursal</option>` +
    sucursalesOpts
      .map((o) => `<option value="${o.value}">${o.label}</option>`)
      .join("");

  selectProd.innerHTML =
    `<option value="" hidden>Seleccioná un producto</option>` +
    productosOpts
      .map((o) => `<option value="${o.value}">${o.label}</option>`)
      .join("");

  // Mapa local para nombre/código en la tabla de items del modal
  const productos = await store.getProductos();
  productosMap = {};
  productos.forEach((p) => {
    productosMap[p.idProducto] = p;
  });
}

// ─── Agregar item ─────────────────────────────────────────────────────────────

document.getElementById("btn-agregar-item").addEventListener("click", () => {
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

  const existente = itemsVenta.find((i) => i.idProducto === idProducto);
  if (existente) {
    existente.cantidad += cantidad;
  } else {
    const prod = productosMap[idProducto];
    itemsVenta.push({
      idProducto,
      nombre: prod?.nombre ?? `Producto #${idProducto}`,
      codigo: prod?.codigo ?? "",
      cantidad,
      precioUnitario: prod?.precioVenta ?? 0,
    });
  }

  renderItemsVenta();
  selectProd.value = "";
  inputCantidad.value = "1";
});

// ─── Renderizar tabla de items ────────────────────────────────────────────────

function renderItemsVenta() {
  itemsTbody.querySelectorAll("tr.item-row").forEach((r) => r.remove());

  if (itemsVenta.length === 0) {
    itemsEmpty.style.display = "";
    totalRow.style.display = "none";
    return;
  }

  itemsEmpty.style.display = "none";
  totalRow.style.display = "";

  let total = 0;

  itemsVenta.forEach((item, idx) => {
    const subtotal = item.cantidad * item.precioUnitario;
    total += subtotal;

    const tr = document.createElement("tr");
    tr.className = "item-row";

    tr.innerHTML = `
        <td>
          ${
            item.codigo
              ? `<span style="font-family:monospace;font-size:12px;color:var(--color-text-muted)">${item.codigo}</span> `
              : ""
          }
          ${item.nombre}
        </td>
        <td class="text-center">${item.cantidad}</td>
        <td class="text-end">${formatColones(item.precioUnitario)}</td>
        <td class="text-end"><strong>${formatColones(subtotal)}</strong></td>
        <td class="text-center">
          <button class="btn btn--ghost btn--sm btn--icon btn-quitar-item"
                  data-idx="${idx}" title="Quitar">
            <i class="bi bi-x-lg" style="color:var(--color-danger)"></i>
          </button>
        </td>
      `;

    itemsTbody.insertBefore(tr, itemsEmpty);
  });

  totalLabel.textContent = formatColones(total);
}

itemsTbody.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-quitar-item");
  if (!btn) return;
  itemsVenta.splice(Number(btn.dataset.idx), 1);
  renderItemsVenta();
});

// ─── Confirmar venta ──────────────────────────────────────────────────────────

ventaConfirmar.addEventListener("click", async () => {
  const idSucursal = Number(selectSucursal.value);
  if (!idSucursal) {
    errorSucursal.textContent = "Sucursal es requerida.";
    errorSucursal.style.display = "block";
    selectSucursal.classList.add("is-invalid");
    return;
  }
  errorSucursal.style.display = "none";
  selectSucursal.classList.remove("is-invalid");

  if (itemsVenta.length === 0) {
    toast.warning("Agregá al menos un producto a la venta.");
    return;
  }

  ventaConfirmar.disabled = true;
  const originalText = ventaConfirmar.innerHTML;
  ventaConfirmar.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Guardando...`;

  try {
    const usuario = getCurrentUser();

    // Paso 1: crear encabezado
    const venta = await ventasApi.crear({
      idSucursal,
      idUsuario: usuario.idUsuario,
    });

    // Paso 2: agregar productos uno por uno
    await ventasApi.agregarProductos(
      venta.idVenta,
      itemsVenta.map((i) => ({
        idProducto: i.idProducto,
        cantidad: i.cantidad,
      })),
      { idSucursal, idUsuario: usuario.idUsuario },
    );

    toast.success(`Venta #${venta.idVenta} registrada correctamente.`);
    cerrarVentaModal();

    const idSucursalFiltro = Number(selectSucursalFiltro.value) || null;
    await cargarVentas(
      idSucursalFiltro,
      inputDesde.value || null,
      inputHasta.value || null,
    );
  } catch (error) {
    toast.error(error.message || "No se pudo registrar la venta.");
    console.error(error);
  } finally {
    ventaConfirmar.disabled = false;
    ventaConfirmar.innerHTML = originalText;
  }
});

// ─── Abrir modal nueva venta ──────────────────────────────────────────────────

async function abrirNuevaVenta() {
  itemsVenta = [];
  renderItemsVenta();
  selectSucursal.value = "";
  selectProd.value = "";
  inputCantidad.value = "1";
  errorSucursal.style.display = "none";
  selectSucursal.classList.remove("is-invalid");

  await poblarSelectsVenta();
  abrirVentaModal();
}

// ─── Filtros del topbar ───────────────────────────────────────────────────────

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
  cargarVentas(id, inputDesde.value || null, inputHasta.value || null);
});

btnBuscar.addEventListener("click", () => {
  const id = Number(selectSucursalFiltro.value) || null;
  cargarVentas(id, inputDesde.value || null, inputHasta.value || null);
});

[inputDesde, inputHasta].forEach((el) => {
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnBuscar.click();
  });
});

// ─── Cerrar modales ───────────────────────────────────────────────────────────

ventaClose.addEventListener("click", cerrarVentaModal);
ventaCancelar.addEventListener("click", cerrarVentaModal);
detalleClose.addEventListener("click", cerrarDetalleModal);
detalleCerrar.addEventListener("click", cerrarDetalleModal);

ventaOverlay.addEventListener("click", (e) => {
  if (e.target === ventaOverlay) cerrarVentaModal();
});
detalleOverlay.addEventListener("click", (e) => {
  if (e.target === detalleOverlay) cerrarDetalleModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (detalleOverlay.classList.contains("active")) {
    cerrarDetalleModal();
    return;
  }
  if (ventaOverlay.classList.contains("active")) cerrarVentaModal();
});

// ─── Inicialización ───────────────────────────────────────────────────────────

btnNueva.addEventListener("click", abrirNuevaVenta);

(async () => {
  await cargarMapas();
  await poblarSelectSucursalFiltro();
  await cargarVentas();
})();
