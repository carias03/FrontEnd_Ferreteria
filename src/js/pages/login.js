/**
 * login.js
 * Entry point de Webpack para login.html.
 */
import "../../scss/main.scss";
import "bootstrap-icons/font/bootstrap-icons.css";

import { authApi } from "../api/authApi.js";
import { saveSession, isLoggedIn } from "../utils/auth.js";

if (isLoggedIn()) {
  window.location.href = "/movimientos.html";
}

const form = document.getElementById("form-login");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("btn-login");
const errorBox = document.getElementById("login-error");
const errorMsg = document.getElementById("login-error-msg");

function setLoading(loading) {
  submitBtn.disabled = loading;
  submitBtn.innerHTML = loading
    ? `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Ingresando...`
    : `<i class="bi bi-box-arrow-in-right"></i> Iniciar sesión`;
}

function showError(message) {
  errorMsg.textContent = message;
  errorBox.classList.add("visible");
}

function hideError() {
  errorBox.classList.remove("visible");
}

function setFieldInvalid(input) {
  input.classList.add("is-invalid");
}

function clearValidation() {
  usernameInput.classList.remove("is-invalid");
  passwordInput.classList.remove("is-invalid");
}

function validate() {
  clearValidation();
  let valid = true;

  if (!usernameInput.value.trim()) {
    setFieldInvalid(usernameInput);
    valid = false;
  }
  if (!passwordInput.value) {
    setFieldInvalid(passwordInput);
    valid = false;
  }
  if (!valid) showError("Completá todos los campos para continuar.");

  return valid;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  if (!validate()) return;

  setLoading(true);

  try {
    const response = await authApi.login(
      usernameInput.value.trim(),
      passwordInput.value,
    );

    // La API devuelve { message, success, usuario }
    // Guardamos solo el objeto usuario en sesión
    const userData = response.usuario ?? response;
    saveSession(userData);

    window.location.href = "/movimientos.html";
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      showError("Usuario o contraseña incorrectos.");
      setFieldInvalid(usernameInput);
      setFieldInvalid(passwordInput);
    } else if (
      error.status === 502 ||
      error.status === 503 ||
      error.status === 504
    ) {
      showError("El servicio no está disponible. Intentá más tarde.");
    } else if (!error.status) {
      showError("No se pudo conectar al servidor. Verificá tu conexión.");
    } else {
      showError(error.message || "Ocurrió un error inesperado.");
    }
  } finally {
    setLoading(false);
  }
});

[usernameInput, passwordInput].forEach((input) => {
  input.addEventListener("input", () => {
    input.classList.remove("is-invalid");
    hideError();
  });
});
