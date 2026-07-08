// ---------- Estado ----------
let allBookmarks = [];   // planos: {id, title, url, dateAdded, path, folderId}
let folderIndex = {};    // id -> {title, children, count}
let bookmarkTree = [];   // árbol crudo de chrome.bookmarks.getTree()
let currentFolder = null; // null = todos
let currentQuery = "";
let viewMode = "list"; // "list" | "grid"
let lang = localStorage.getItem("favs-lang") || "en"; // por defecto en inglés

const $ = (sel) => document.querySelector(sel);
const listEl = $("#list");
const treeEl = $("#folder-tree");
const emptyEl = $("#empty");

// ---------- Traducciones ----------
const STRINGS = {
  en: {
    folderNavLabel: "Bookmark folders",
    searchPlaceholder: "Search by title or URL…  ( / )",
    sortLabel: "Sort",
    sortRecent: "Most recent",
    sortOldest: "Oldest",
    sortAz: "A → Z",
    sortZa: "Z → A",
    sortDomain: "By domain",
    viewTypeLabel: "View type",
    viewList: "List view",
    viewGrid: "Grid view",
    compactView: "Compact view",
    newBookmark: "New bookmark",
    allBookmarks: "All bookmarks",
    emptyTitle: "Nothing here.",
    emptySub: "Try another search or folder.",
    emptyCreate: "Create a bookmark",
    modalTitle: "New bookmark",
    fieldTitle: "Title",
    titlePlaceholder: "Uses the domain if left empty",
    fieldUrl: "URL",
    fieldFolder: "Folder",
    cancel: "Cancel",
    create: "Create bookmark",
    themeToLight: "Switch to light mode",
    themeToDark: "Switch to dark mode",
    langSwitch: "Switch to Spanish",
    creditPrefix: "Made by",
    creditGithub: "Code on GitHub",
    general: "General",
    otherFolder: "Other",
    rootFolderTitle: "Bookmarks",
    rootPath: "root",
    stats: (n, f) => `${n} bookmarks · ${f} folders`,
    itemsCount: (n) => `${n} items`,
    dateNever: "—",
    dateToday: "today",
    dateYesterday: "yesterday",
    dateDays: (d) => `${d}d ago`,
    dateMonths: (m) => `${m}mo ago`,
    dateYears: (y) => `${y}y ago`,
    copyUrl: "Copy URL",
    deleteBookmark: "Delete bookmark",
    urlCopied: "URL copied",
    bookmarkDeleted: "Bookmark deleted",
    invalidUrl: "Invalid URL",
    bookmarkCreated: "Bookmark created",
    confirmDelete: (title) => `Delete "${title}" from your bookmarks?`,
  },
  es: {
    folderNavLabel: "Carpetas de favoritos",
    searchPlaceholder: "Buscar por título o URL…  ( / )",
    sortLabel: "Ordenar",
    sortRecent: "Más recientes",
    sortOldest: "Más antiguos",
    sortAz: "A → Z",
    sortZa: "Z → A",
    sortDomain: "Por dominio",
    viewTypeLabel: "Tipo de vista",
    viewList: "Vista de lista",
    viewGrid: "Vista de grilla",
    compactView: "Vista compacta",
    newBookmark: "Nuevo favorito",
    allBookmarks: "Todos los favoritos",
    emptyTitle: "Nada por acá.",
    emptySub: "Probá con otra búsqueda u otra carpeta.",
    emptyCreate: "Crear un favorito",
    modalTitle: "Nuevo favorito",
    fieldTitle: "Título",
    titlePlaceholder: "Se usa el dominio si lo dejás vacío",
    fieldUrl: "URL",
    fieldFolder: "Carpeta",
    cancel: "Cancelar",
    create: "Crear favorito",
    themeToLight: "Cambiar a modo claro",
    themeToDark: "Cambiar a modo oscuro",
    langSwitch: "Cambiar a inglés",
    creditPrefix: "Hecho por",
    creditGithub: "Código en GitHub",
    general: "General",
    otherFolder: "Otros",
    rootFolderTitle: "Favoritos",
    rootPath: "raíz",
    stats: (n, f) => `${n} favoritos · ${f} carpetas`,
    itemsCount: (n) => `${n} items`,
    dateNever: "—",
    dateToday: "hoy",
    dateYesterday: "ayer",
    dateDays: (d) => `hace ${d}d`,
    dateMonths: (m) => `hace ${m}m`,
    dateYears: (y) => `hace ${y}a`,
    copyUrl: "Copiar URL",
    deleteBookmark: "Eliminar favorito",
    urlCopied: "URL copiada",
    bookmarkDeleted: "Favorito eliminado",
    invalidUrl: "URL inválida",
    bookmarkCreated: "Favorito creado",
    confirmDelete: (title) => `¿Eliminar "${title}" de tus favoritos?`,
  },
};

function t(key, ...args) {
  const entry = STRINGS[lang][key];
  return typeof entry === "function" ? entry(...args) : entry;
}

function applyStaticTranslations() {
  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const label = t(el.getAttribute("data-i18n-title"));
    el.title = label;
    el.setAttribute("aria-label", label);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
  });
}

// ---------- Iconos (SVG inline, sin emojis) ----------
const ICON_CHEVRON =
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5l6 5-6 5"/></svg>';
const ICON_COPY =
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="9" height="9" rx="2"/><path d="M4.5 13V5.5a2 2 0 0 1 2-2H14"/></svg>';
const ICON_TRASH =
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m-6 0 .6 9a1.5 1.5 0 0 0 1.5 1.4h3.8a1.5 1.5 0 0 0 1.5-1.4L14 6"/></svg>';

// ---------- Helpers ----------
function faviconUrl(pageUrl) {
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", pageUrl);
  url.searchParams.set("size", "32");
  return url.toString();
}

function relativeDate(ts) {
  if (!ts) return t("dateNever");
  const diff = Date.now() - ts;
  const d = Math.floor(diff / 86400000);
  if (d === 0) return t("dateToday");
  if (d === 1) return t("dateYesterday");
  if (d < 30) return t("dateDays", d);
  if (d < 365) return t("dateMonths", Math.floor(d / 30));
  return t("dateYears", Math.floor(d / 365));
}

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.hidden = true), 1600);
}

// ---------- Carga ----------
async function load() {
  const tree = await chrome.bookmarks.getTree();
  bookmarkTree = tree;
  allBookmarks = [];
  folderIndex = {};

  function walk(node, path, pathIds) {
    if (node.url) {
      allBookmarks.push({
        id: node.id,
        title: node.title || node.url,
        url: node.url,
        dateAdded: node.dateAdded || 0,
        path: path.join(" / ") || t("rootPath"),
        pathIds,
      });
      return 1;
    }
    let count = 0;
    const children = [];
    for (const child of node.children || []) {
      const isFolder = !child.url;
      const c = walk(
        child,
        node.title ? [...path, node.title] : path,
        [...pathIds, node.id]
      );
      count += c;
      if (isFolder) children.push(child.id);
    }
    folderIndex[node.id] = {
      id: node.id,
      title: node.title || t("rootFolderTitle"),
      children,
      count,
    };
    return count;
  }

  for (const root of tree) walk(root, [], []);

  const totalFolders = Object.values(folderIndex).filter((f) => f.title !== t("rootFolderTitle")).length;
  $("#global-stats").textContent = t("stats", allBookmarks.length, totalFolders);

  renderTree(tree);
  render();
}

// ---------- Árbol ----------
function renderTree(tree) {
  treeEl.innerHTML = "";

  const allBtn = makeTreeItem({ title: t("allBookmarks"), count: allBookmarks.length }, 0, false);
  allBtn.classList.add("active");
  allBtn.addEventListener("click", () => selectFolder(null, allBtn, t("allBookmarks")));
  treeEl.appendChild(allBtn);

  function build(node, depth, container) {
    for (const child of node.children || []) {
      if (child.url) continue;
      const info = folderIndex[child.id];
      const hasSub = info.children.length > 0;
      const btn = makeTreeItem(info, depth, hasSub);
      container.appendChild(btn);

      let childBox = null;
      if (hasSub) {
        childBox = document.createElement("div");
        childBox.className = "tree-children";
        container.appendChild(childBox);
        build(child, depth + 1, childBox);
      }

      btn.addEventListener("click", (e) => {
        // click en la flecha = expandir/colapsar; click en el resto = seleccionar
        if (hasSub && e.target.classList.contains("tw")) {
          btn.classList.toggle("expanded");
          childBox.classList.toggle("open");
          return;
        }
        selectFolder(child.id, btn, info.title);
      });
    }
  }

  for (const root of tree) build(root, 0, treeEl);
}

function makeTreeItem(info, depth, hasSub) {
  const btn = document.createElement("button");
  btn.className = "tree-item";
  btn.style.paddingLeft = `${8 + depth * 14}px`;
  btn.innerHTML = `
    <span class="tw">${hasSub ? ICON_CHEVRON : ""}</span>
    <span class="name"></span>
    <span class="count"></span>
  `;
  btn.querySelector(".name").textContent = info.title;
  btn.querySelector(".count").textContent = info.count;
  return btn;
}

function selectFolder(folderId, btn, title) {
  currentFolder = folderId;
  treeEl.querySelectorAll(".tree-item.active").forEach((el) => el.classList.remove("active"));
  btn.classList.add("active");
  $("#context-path").textContent = title;
  render();
}

// ---------- Agrupado por secciones ----------
const GENERAL_KEY = "__general__";

function sectionKeyFor(b) {
  if (currentFolder) {
    const idx = b.pathIds.indexOf(currentFolder);
    const childId = idx !== -1 ? b.pathIds[idx + 1] : undefined;
    return childId ? folderIndex[childId]?.title || t("otherFolder") : GENERAL_KEY;
  }
  const segs = b.path.split(" / ").filter(Boolean);
  return segs.length ? segs[segs.length - 1] : GENERAL_KEY;
}

function groupIntoSections(items) {
  const buckets = new Map();
  for (const b of items) {
    const key = sectionKeyFor(b);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(b);
  }
  const keys = [...buckets.keys()].sort((a, b) => {
    if (a === GENERAL_KEY) return 1;
    if (b === GENERAL_KEY) return -1;
    return a.localeCompare(b, lang);
  });
  return keys.map((key) => ({ key, items: buckets.get(key) }));
}

// ---------- Filtrado + render ----------
function getVisible() {
  let items = allBookmarks;

  if (currentFolder) {
    items = items.filter((b) => b.pathIds.includes(currentFolder));
  }

  if (currentQuery) {
    const q = currentQuery.toLowerCase();
    items = items.filter(
      (b) => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q)
    );
  }

  const sort = $("#sort").value;
  const sorted = [...items];
  if (sort === "recent") sorted.sort((a, b) => b.dateAdded - a.dateAdded);
  if (sort === "oldest") sorted.sort((a, b) => a.dateAdded - b.dateAdded);
  if (sort === "az") sorted.sort((a, b) => a.title.localeCompare(b.title, lang));
  if (sort === "za") sorted.sort((a, b) => b.title.localeCompare(a.title, lang));
  if (sort === "domain") sorted.sort((a, b) => domainOf(a.url).localeCompare(domainOf(b.url)));
  return sorted;
}

function buildRow(b) {
  const row = document.createElement("div");
  row.className = "bm";
  row.innerHTML = `
    <div class="favicon-chip"><img class="favicon" loading="lazy" alt="" /></div>
    <div class="info">
      <div class="title"></div>
      <div class="meta">
        <span class="path"></span>
        <span class="url"></span>
        <span class="date"></span>
      </div>
    </div>
    <div class="actions">
      <button class="act-copy" title="${t("copyUrl")}" aria-label="${t("copyUrl")}">${ICON_COPY}</button>
      <button class="act-del" title="${t("deleteBookmark")}" aria-label="${t("deleteBookmark")}">${ICON_TRASH}</button>
    </div>
  `;
  row.querySelector(".favicon").src = faviconUrl(b.url);
  row.querySelector(".title").textContent = b.title;
  row.querySelector(".path").textContent = b.path;
  row.querySelector(".url").textContent = b.url;
  row.querySelector(".date").textContent = relativeDate(b.dateAdded);
  row.title = b.url;

  row.addEventListener("click", (e) => {
    if (e.target.closest(".actions")) return;
    chrome.tabs.create({ url: b.url, active: !e.ctrlKey && !e.metaKey });
  });

  row.querySelector(".act-copy").addEventListener("click", async () => {
    await navigator.clipboard.writeText(b.url);
    toast(t("urlCopied"));
  });

  row.querySelector(".act-del").addEventListener("click", async () => {
    if (!confirm(t("confirmDelete", b.title))) return;
    await chrome.bookmarks.remove(b.id);
    toast(t("bookmarkDeleted"));
    load();
  });

  return row;
}

function buildTile(b) {
  const wrap = document.createElement("div");
  wrap.className = "tile-wrap";
  wrap.innerHTML = `
    <a class="tile" href="${b.url}" target="_blank" rel="noopener" title="${b.url}">
      <div class="tile-icon"><img class="favicon" loading="lazy" alt="" /></div>
      <div class="tile-title"></div>
    </a>
    <div class="tile-actions">
      <button class="act-copy" title="${t("copyUrl")}" aria-label="${t("copyUrl")}">${ICON_COPY}</button>
      <button class="act-del" title="${t("deleteBookmark")}" aria-label="${t("deleteBookmark")}">${ICON_TRASH}</button>
    </div>
  `;
  wrap.querySelector(".favicon").src = faviconUrl(b.url);
  wrap.querySelector(".tile-title").textContent = b.title;

  wrap.querySelector(".tile").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: b.url, active: !e.ctrlKey && !e.metaKey });
  });

  wrap.querySelector(".act-copy").addEventListener("click", async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(b.url);
    toast(t("urlCopied"));
  });

  wrap.querySelector(".act-del").addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!confirm(t("confirmDelete", b.title))) return;
    await chrome.bookmarks.remove(b.id);
    toast(t("bookmarkDeleted"));
    load();
  });

  return wrap;
}

function render() {
  const items = getVisible();
  $("#context-count").textContent = t("itemsCount", items.length);
  listEl.innerHTML = "";
  emptyEl.hidden = items.length > 0;

  const sections = groupIntoSections(items);
  const skipHeader = sections.length === 1 && sections[0].key === GENERAL_KEY;

  const frag = document.createDocumentFragment();
  for (const section of sections) {
    const sectionEl = document.createElement("div");
    sectionEl.className = "section";

    if (!skipHeader) {
      const header = document.createElement("div");
      header.className = "section-header";
      header.innerHTML = `<h3></h3><span class="count"></span>`;
      header.querySelector("h3").textContent =
        section.key === GENERAL_KEY ? t("general") : section.key;
      header.querySelector(".count").textContent = section.items.length;
      sectionEl.appendChild(header);
    }

    const list = document.createElement("div");
    if (viewMode === "grid") {
      list.className = "tile-grid";
      for (const b of section.items) list.appendChild(buildTile(b));
    } else {
      list.className = "section-list";
      for (const b of section.items) list.appendChild(buildRow(b));
    }
    sectionEl.appendChild(list);

    frag.appendChild(sectionEl);
  }
  listEl.appendChild(frag);
}

// ---------- Eventos ----------
$("#search").addEventListener("input", (e) => {
  currentQuery = e.target.value.trim();
  render();
});

$("#sort").addEventListener("change", render);

$("#toggle-view").addEventListener("click", () => {
  listEl.classList.toggle("compact");
});

function setViewMode(mode) {
  viewMode = mode;
  listEl.classList.toggle("grid-mode", mode === "grid");
  $("#view-list").classList.toggle("active", mode === "list");
  $("#view-list").setAttribute("aria-pressed", String(mode === "list"));
  $("#view-grid").classList.toggle("active", mode === "grid");
  $("#view-grid").setAttribute("aria-pressed", String(mode === "grid"));
  $("#toggle-view").disabled = mode === "grid";
  render();
}

$("#view-list").addEventListener("click", () => setViewMode("list"));
$("#view-grid").addEventListener("click", () => setViewMode("grid"));

// ---------- Modal: nuevo favorito ----------
function buildFolderOptions() {
  const select = $("#bm-folder");
  select.innerHTML = "";

  function walk(node, depth) {
    for (const child of node.children || []) {
      if (child.url) continue;
      const option = document.createElement("option");
      option.value = child.id;
      option.textContent = `${"—".repeat(depth)} ${folderIndex[child.id].title}`.trim();
      select.appendChild(option);
      walk(child, depth + 1);
    }
  }

  for (const root of bookmarkTree) walk(root, 0);
  if (currentFolder && [...select.options].some((o) => o.value === currentFolder)) {
    select.value = currentFolder;
  }
}

function openModal() {
  buildFolderOptions();
  $("#bm-title").value = "";
  $("#bm-url").value = "";
  $("#modal-backdrop").hidden = false;
  $("#bm-title").focus();
}

function closeModal() {
  $("#modal-backdrop").hidden = true;
}

$("#new-bookmark").addEventListener("click", openModal);
$("#empty-create").addEventListener("click", openModal);
$("#modal-cancel").addEventListener("click", closeModal);

$("#modal-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "modal-backdrop") closeModal();
});

$("#bookmark-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  let url = $("#bm-url").value.trim();
  if (!url) return;
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(url)) url = `https://${url}`;
  try {
    new URL(url);
  } catch {
    toast(t("invalidUrl"));
    return;
  }

  const title = $("#bm-title").value.trim() || domainOf(url);
  const parentId = $("#bm-folder").value || undefined;

  await chrome.bookmarks.create({ parentId, title, url });
  closeModal();
  toast(t("bookmarkCreated"));
  load();
});

document.addEventListener("keydown", (e) => {
  const modalOpen = !$("#modal-backdrop").hidden;
  const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName);

  if (e.key === "Escape" && modalOpen) {
    closeModal();
    return;
  }
  if (e.key === "n" && !isTyping && !modalOpen) {
    e.preventDefault();
    openModal();
    return;
  }
  if (e.key === "/" && !isTyping) {
    e.preventDefault();
    $("#search").focus();
  }
});

// Refrescar si cambian los bookmarks desde otro lado
chrome.bookmarks.onCreated.addListener(load);
chrome.bookmarks.onRemoved.addListener(load);
chrome.bookmarks.onChanged.addListener(load);
chrome.bookmarks.onMoved.addListener(load);

// ---------- Tema claro/oscuro ----------
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

function effectiveTheme() {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return systemDark.matches ? "dark" : "light";
}

function updateThemeToggle() {
  const isDark = effectiveTheme() === "dark";
  const btn = $("#theme-toggle");
  btn.classList.toggle("is-dark", isDark);
  btn.setAttribute("aria-pressed", String(isDark));
  const label = isDark ? t("themeToLight") : t("themeToDark");
  btn.title = label;
  btn.setAttribute("aria-label", label);
}

$("#theme-toggle").addEventListener("click", () => {
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("favs-theme", next);
  updateThemeToggle();
});

systemDark.addEventListener("change", () => {
  if (document.documentElement.getAttribute("data-theme") === "auto") updateThemeToggle();
});

// ---------- Idioma ----------
function updateLangToggle() {
  const btn = $("#lang-toggle");
  btn.querySelector(".lang-code").textContent = lang.toUpperCase();
  const label = t("langSwitch");
  btn.title = label;
  btn.setAttribute("aria-label", label);
}

$("#lang-toggle").addEventListener("click", () => {
  lang = lang === "en" ? "es" : "en";
  localStorage.setItem("favs-lang", lang);
  applyStaticTranslations();
  updateLangToggle();
  updateThemeToggle();
  load();
});

// ---------- Arranque ----------
applyStaticTranslations();
updateThemeToggle();
updateLangToggle();
load();
