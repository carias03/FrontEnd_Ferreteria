import "../../scss/main.scss";
import "bootstrap-icons/font/bootstrap-icons.css";

import { requireAuth } from "../utils/auth.js";
import "../components/sidebar.js";
import "../utils/logout.js";

requireAuth();
