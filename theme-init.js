// Aplica el tema y el idioma guardados antes del primer paint para evitar parpadeo.
// Va en un archivo externo (no inline) porque Manifest V3 bloquea <script> inline por CSP.
document.documentElement.setAttribute("data-theme", localStorage.getItem("favs-theme") || "auto");
document.documentElement.lang = localStorage.getItem("favs-lang") || "en";
