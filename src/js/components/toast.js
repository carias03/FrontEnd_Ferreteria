/**
 * toast.js
 * Wrapper de Toastify para notificaciones del sistema.
 * Expone 4 métodos: success, error, warning, info
 *
 * Uso:
 *   import { toast } from '../components/toast.js';
 *   toast.success('Categoría guardada');
 *   toast.error('No se pudo conectar al servidor');
 */

import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

const DEFAULTS = {
  duration: 3500,
  gravity: "bottom",
  position: "right",
  stopOnFocus: true,
};

const STYLES = {
  success: { background: "#10B981", icon: "bi-check-circle" },
  error: { background: "#EF4444", icon: "bi-x-circle" },
  warning: { background: "#F59E0B", icon: "bi-exclamation-triangle" },
  info: { background: "#3B82F6", icon: "bi-info-circle" },
};

function show(type, message) {
  const { background, icon } = STYLES[type];

  Toastify({
    ...DEFAULTS,
    text: `<i class="bi ${icon}" style="margin-right:8px;font-size:15px"></i>${message}`,
    escapeMarkup: false,
    style: {
      background,
      borderRadius: "8px",
      padding: "10px 16px",
      fontSize: "13.5px",
      fontWeight: "500",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      display: "flex",
      alignItems: "center",
      minWidth: "260px",
      maxWidth: "380px",
    },
  }).showToast();
}

export const toast = {
  success: (msg) => show("success", msg),
  error: (msg) => show("error", msg),
  warning: (msg) => show("warning", msg),
  info: (msg) => show("info", msg),
};
