/**
 * modal.js
 * Modal genérico para operaciones CRUD de FerreSystem.
 *
 * Uso:
 *   modal.open({ title, fields, data?, confirmText?, onConfirm })
 *   modal.confirm({ title, message, confirmText?, confirmClass?, onConfirm })
 *   modal.close()
 */

import { toast } from "./toast.js";

const overlay = document.getElementById("modal-overlay");
const modalEl = document.getElementById("modal");
const titleEl = document.getElementById("modal-title");
const bodyEl = document.getElementById("modal-body");
const footerEl = document.getElementById("modal-footer");
const closeBtn = document.getElementById("modal-close");

// ─── Abrir / cerrar ───────────────────────────────────────────────────────────

function openModal() {
  overlay.classList.add("active");
  setTimeout(() => {
    const first = modalEl.querySelector("input, select, textarea");
    if (first) first.focus();
  }, 150);
}

function closeModal() {
  overlay.classList.remove("active");
}

function setConfirmLoading(btn, loading) {
  btn.disabled = loading;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> Guardando...`;
  } else if (btn.dataset.originalText) {
    btn.innerHTML = btn.dataset.originalText;
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && overlay.classList.contains("active")) closeModal();
});

overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal();
});

closeBtn.addEventListener("click", closeModal);

// ─── Footer ───────────────────────────────────────────────────────────────────

function buildFooter(confirmText, confirmClass, onClickConfirm) {
  footerEl.innerHTML = "";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn--secondary";
  cancelBtn.textContent = "Cancelar";
  cancelBtn.addEventListener("click", closeModal);

  const confirmBtn = document.createElement("button");
  confirmBtn.className = `btn ${confirmClass}`;
  confirmBtn.innerHTML = confirmText;

  confirmBtn.addEventListener("click", async () => {
    setConfirmLoading(confirmBtn, true);
    try {
      const shouldClose = await onClickConfirm();
      // onClickConfirm devuelve false explícitamente si la validación falló
      // En ese caso no cerramos el modal ni mostramos toast
      if (shouldClose !== false) {
        closeModal();
      }
    } catch (error) {
      // Solo errores reales de la API llegan aquí
      toast.error(error.message || "Ocurrió un error al guardar.");
    } finally {
      setConfirmLoading(confirmBtn, false);
    }
  });

  footerEl.appendChild(cancelBtn);
  footerEl.appendChild(confirmBtn);
}

// ─── Campos ───────────────────────────────────────────────────────────────────

function buildFields(fields, data = {}) {
  return fields
    .map((f) => {
      const value = data[f.id] ?? "";
      const required = f.required ? "required" : "";
      const placeholder = f.placeholder ? `placeholder="${f.placeholder}"` : "";

      let input;

      if (f.type === "textarea") {
        input = `<textarea
        id="modal-field-${f.id}" name="${f.id}"
        class="form-control" rows="3"
        ${required} ${placeholder}
      >${value}</textarea>`;
      } else if (f.type === "select") {
        const opts = (f.options ?? [])
          .map(
            (o) =>
              `<option value="${o.value}" ${o.value == value ? "selected" : ""}>${o.label}</option>`,
          )
          .join("");
        input = `
          <div class="select-wrapper">
            <select id="modal-field-${f.id}" name="${f.id}" class="form-control" ${required}>
              <option value="" hidden>Seleccioná una opción</option>${opts}
            </select>
            <i class="bi bi-chevron-down select-icon"></i>
          </div>`;
      } else {
        const extra =
          f.type === "number"
            ? `${f.min != null ? `min="${f.min}"` : ""} ${f.max != null ? `max="${f.max}"` : ""} ${f.step != null ? `step="${f.step}"` : ""}`
            : "";
        input = `<input
        type="${f.type}" id="modal-field-${f.id}" name="${f.id}"
        class="form-control" value="${value}"
        ${required} ${placeholder} ${extra}
      />`;
      }

      const hint = f.hint ? `<span class="form-hint">${f.hint}</span>` : "";
      const requiredMark = f.required
        ? ' <span style="color:var(--color-danger)">*</span>'
        : "";

      return `
      <div class="form-group">
        <label for="modal-field-${f.id}">${f.label}${requiredMark}</label>
        ${input}
        ${hint}
        <span class="form-error" id="modal-error-${f.id}" style="display:none"></span>
      </div>`;
    })
    .join("");
}

// ─── Validación ───────────────────────────────────────────────────────────────

function readFields(fields) {
  const data = {};
  let valid = true;

  // Limpiar estado previo
  fields.forEach((f) => {
    const errEl = document.getElementById(`modal-error-${f.id}`);
    const input = document.getElementById(`modal-field-${f.id}`);
    if (errEl) errEl.style.display = "none";
    if (input) input.classList.remove("is-invalid");
  });

  fields.forEach((f) => {
    const input = document.getElementById(`modal-field-${f.id}`);
    if (!input) return;

    const raw = input.value;
    const value =
      f.type === "number" ? (raw === "" ? null : Number(raw)) : raw.trim();

    if (f.required && (value === "" || value === null)) {
      input.classList.add("is-invalid");
      const errEl = document.getElementById(`modal-error-${f.id}`);
      if (errEl) {
        errEl.textContent = `${f.label} es requerido.`;
        errEl.style.display = "block";
      }
      valid = false;
    }

    data[f.id] = value;
  });

  return valid ? data : null;
}

// ─── API pública ──────────────────────────────────────────────────────────────

export const modal = {
  open({
    title,
    fields,
    data = {},
    confirmText = '<i class="bi bi-check-lg"></i> Guardar',
    onConfirm,
  }) {
    titleEl.textContent = title;
    bodyEl.innerHTML = buildFields(fields, data);

    buildFooter(confirmText, "btn--primary", async () => {
      const formData = readFields(fields);
      if (!formData) return false; // validación falló — no cerrar, no toast
      await onConfirm(formData); // error real aquí sube al catch de buildFooter
    });

    openModal();
  },

  confirm({
    title,
    message,
    confirmText = "Confirmar",
    confirmClass = "btn--danger",
    onConfirm,
  }) {
    titleEl.textContent = title;
    bodyEl.innerHTML = `<p style="color:var(--color-text-muted);font-size:14px;margin:0;line-height:1.6">${message}</p>`;

    buildFooter(confirmText, confirmClass, async () => {
      await onConfirm();
    });

    openModal();
  },

  close: closeModal,
};
