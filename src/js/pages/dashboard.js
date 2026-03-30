/**
 * dashboard.js
 * Entry point de Webpack para dashboard.html.
 */

import "../../scss/main.scss";
import "bootstrap-icons/font/bootstrap-icons.css";

import "../components/sidebar.js";

import { requireAuth } from "../utils/auth.js";
import "../utils/logout.js";

// ─── Proteger la ruta ─────────────────────────────────────────────────────────
// Si no hay sesión en sessionStorage redirige a /login.html inmediatamente
requireAuth();
