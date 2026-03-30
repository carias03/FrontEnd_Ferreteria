/**
 * sidebar.js
 * Maneja el comportamiento responsive del sidebar:
 *  - Mobile (< 768px): overlay + slide desde la izquierda
 *  - Tablet (768–1024px): colapsado a íconos, se expande al abrir
 *  - Desktop (> 1024px): toggle collapsed/expanded, persiste en localStorage
 *
 * Importar en cada entry point de página con layout:
 *   import '../components/sidebar.js';
 */

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebar-overlay");
const toggleBtn = document.getElementById("sidebar-toggle");

if (!sidebar || !toggleBtn) {
  // Si la página no tiene sidebar (ej: login) no hace nada
  // No lanzar error para no romper el bundle
} else {
  // ─── Helpers ───────────────────────────────────────────────────────────────

  const BREAKPOINT_MOBILE = 767;
  const BREAKPOINT_TABLET = 1024;
  const STORAGE_KEY = "ferresystem_sidebar_collapsed";

  function isMobile() {
    return window.innerWidth <= BREAKPOINT_MOBILE;
  }
  function isTablet() {
    return (
      window.innerWidth > BREAKPOINT_MOBILE &&
      window.innerWidth <= BREAKPOINT_TABLET
    );
  }
  function isDesktop() {
    return window.innerWidth > BREAKPOINT_TABLET;
  }

  function openSidebar() {
    sidebar.classList.add("open");
    if (overlay) overlay.style.display = "block";
    // Forzar reflow para que la transición funcione
    requestAnimationFrame(() => {
      if (overlay) overlay.style.opacity = "1";
    });
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    if (overlay) {
      overlay.style.opacity = "0";
      // Esperar a que termine la transición antes de ocultar
      overlay.addEventListener(
        "transitionend",
        () => {
          overlay.style.display = "none";
        },
        { once: true },
      );
    }
  }

  function toggleCollapsed() {
    sidebar.classList.toggle("collapsed");
    const isCollapsed = sidebar.classList.contains("collapsed");
    localStorage.setItem(STORAGE_KEY, isCollapsed ? "1" : "0");
  }

  // ─── Estado inicial ────────────────────────────────────────────────────────

  function applyInitialState() {
    // Limpiar clases de estado previas
    sidebar.classList.remove("open", "collapsed");
    if (overlay) {
      overlay.style.display = "none";
      overlay.style.opacity = "0";
    }

    if (isDesktop()) {
      // Restaurar preferencia guardada del usuario
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "1") {
        sidebar.classList.add("collapsed");
      }
    }
    // Tablet y mobile: sin clase extra — el CSS maneja el estado base
  }

  applyInitialState();

  // ─── Toggle button ─────────────────────────────────────────────────────────

  toggleBtn.addEventListener("click", () => {
    if (isMobile() || isTablet()) {
      // Abre/cierra como panel
      if (sidebar.classList.contains("open")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    } else {
      // Desktop: colapsa/expande
      toggleCollapsed();
    }
  });

  // ─── Cerrar al hacer clic en el overlay (mobile/tablet) ───────────────────

  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }

  // ─── Cerrar al hacer clic en un ítem (mobile) ─────────────────────────────

  sidebar.querySelectorAll(".sidebar__item").forEach((item) => {
    item.addEventListener("click", () => {
      if (isMobile()) closeSidebar();
    });
  });

  // ─── Adaptar al cambiar tamaño de ventana ─────────────────────────────────

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyInitialState, 150);
  });

  // ─── Marcar ítem activo según la URL actual ────────────────────────────────

  const currentPage = window.location.pathname
    .split("/")
    .pop()
    .replace(".html", "");
  sidebar.querySelectorAll(".sidebar__item[data-page]").forEach((item) => {
    if (item.dataset.page === currentPage) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}
