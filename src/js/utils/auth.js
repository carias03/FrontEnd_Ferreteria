/**
 * auth.js
 * Manejo de sesión sin JWT para FerreSystem.
 * Guarda el usuario en sessionStorage y protege las rutas.
 */

const SESSION_KEY = "ferresystem_user";

// ─── Guardar / leer / limpiar sesión ─────────────────────────────────────────

export function saveSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn() {
  return getSession() !== null;
}

// ─── Acceso a datos del usuario ───────────────────────────────────────────────

export function getCurrentUser() {
  return getSession();
}

/**
 * Devuelve los roles del usuario actual como array de strings.
 * Ejemplo: ['ADMIN', 'VENDEDOR']
 */
export function getCurrentRoles() {
  const user = getSession();
  if (!user?.roles) return [];
  // Acepta roles como array de strings o de objetos { nombre }
  return user.roles.map((r) => (typeof r === "string" ? r : r.nombre));
}

export function hasRole(role) {
  return getCurrentRoles().includes(role);
}

// ─── Protección de rutas ──────────────────────────────────────────────────────

/**
 * Llama esto al inicio de cada página protegida.
 * Si no hay sesión activa, redirige a login.
 * @param {string[]} [requiredRoles] - roles que pueden acceder (vacío = cualquier usuario)
 */
export function requireAuth(requiredRoles = []) {
  if (!isLoggedIn()) {
    redirectToLogin();
    return false;
  }

  if (requiredRoles.length > 0) {
    const userRoles = getCurrentRoles();
    const allowed = requiredRoles.some((r) => userRoles.includes(r));
    if (!allowed) {
      // Sesión válida pero sin el rol requerido
      alert("No tenés permisos para acceder a esta sección.");
      window.location.href = "/dashboard.html";
      return false;
    }
  }

  return true;
}

export function redirectToLogin() {
  window.location.href = "/login.html";
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export function logout() {
  clearSession();
  redirectToLogin();
}
