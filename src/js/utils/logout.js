/**
 * logout.js
 * Inicializa el footer del sidebar con datos del usuario en sesión
 * y conecta el botón de logout.
 *
 * Estructura esperada en sessionStorage (objeto usuario de la API):
 * {
 *   idUsuario, username, estado,
 *   persona: { nombre, apellidos, correo, telefono, idPersona },
 *   roles: [...]  ← puede no venir en el login, se muestra vacío
 * }
 */

import { logout, getCurrentUser } from "../utils/auth.js";

const avatarEl = document.getElementById("sidebar-avatar");
const usernameEl = document.getElementById("sidebar-username");
const roleEl = document.getElementById("sidebar-role");
const user = getCurrentUser();

if (user) {
  // La API guarda el usuario con persona.nombre y persona.apellidos
  const nombre = user.persona?.nombre ?? "";
  const apellido = user.persona?.apellidos ?? "";
  const displayName = nombre
    ? `${nombre} ${apellido}`.trim()
    : (user.username ?? "Usuario");

  if (usernameEl) usernameEl.textContent = displayName;
  if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();

  if (roleEl) {
    // roles puede no venir en el response del login
    const roles = user.roles ?? [];
    if (roles.length > 0) {
      const r = roles[0];
      roleEl.textContent = typeof r === "string" ? r : (r.nombre ?? "Sin rol");
    } else {
      roleEl.textContent = "Sin rol";
    }
  }
}

const btnLogout = document.getElementById("btn-logout");
if (btnLogout) {
  btnLogout.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });
}
