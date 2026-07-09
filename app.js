// ---------- Estado ----------
let allBookmarks = [];   // planos: {id, title, url, dateAdded, path, folderId}
let folderIndex = {};    // id -> {title, children, count}
let bookmarkTree = [];   // árbol crudo de chrome.bookmarks.getTree()
let currentFolder = null; // null = todos
let currentQuery = "";
let viewMode = "list"; // "list" | "grid" | "cover" | "kanban"
let lang = localStorage.getItem("favs-lang") || "en"; // por defecto en inglés
const selectedIds = new Set(); // selección múltiple para borrado masivo
let draggingId = null; // id del favorito que se está arrastrando (kanban)

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
    sortManual: "Manual",
    viewTypeLabel: "View type",
    viewList: "List view",
    viewGrid: "Grid view",
    viewCover: "Cover view",
    viewKanban: "Kanban view",
    compactView: "Compact view",
    recentlyAdded: "Recently added",
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
    supportProject: "Buy me a coffee",
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
    editBookmark: "Edit bookmark",
    saveEdit: "Save",
    selectBookmark: "Select bookmark",
    itemsSelected: (n) => `${n} selected`,
    deleteSelectedBtn: "Delete selected",
    urlCopied: "URL copied",
    bookmarkDeleted: "Bookmark deleted",
    bookmarkUpdated: "Bookmark updated",
    bookmarkMoved: "Bookmark moved",
    invalidUrl: "Invalid URL",
    bookmarkCreated: "Bookmark created",
    confirmDelete: (title) => `Delete "${title}" from your bookmarks?`,
    confirmDeleteMultiple: (n) => `Delete ${n} bookmarks from your bookmarks?`,
    openAllLinks: (n) => `Open all (${n})`,
    confirmOpenAll: (n) => `Open ${n} links in new tabs?`,
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
    sortManual: "Manual",
    viewTypeLabel: "Tipo de vista",
    viewList: "Vista de lista",
    viewGrid: "Vista de grilla",
    viewCover: "Vista de portadas",
    viewKanban: "Vista kanban",
    compactView: "Vista compacta",
    recentlyAdded: "Recién añadido",
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
    supportProject: "Invitame un café",
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
    editBookmark: "Editar favorito",
    saveEdit: "Guardar",
    selectBookmark: "Seleccionar favorito",
    itemsSelected: (n) => `${n} seleccionados`,
    deleteSelectedBtn: "Eliminar seleccionados",
    urlCopied: "URL copiada",
    bookmarkDeleted: "Favorito eliminado",
    bookmarkUpdated: "Favorito actualizado",
    bookmarkMoved: "Favorito movido",
    invalidUrl: "URL inválida",
    bookmarkCreated: "Favorito creado",
    confirmDelete: (title) => `¿Eliminar "${title}" de tus favoritos?`,
    confirmDeleteMultiple: (n) => `¿Eliminar ${n} favoritos de tus favoritos?`,
    openAllLinks: (n) => `Abrir todos (${n})`,
    confirmOpenAll: (n) => `¿Abrir ${n} enlaces en pestañas nuevas?`,
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
const ICON_EDIT =
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 3.5a1.7 1.7 0 0 1 2.4 2.4L7 15l-3.5 1L4.5 12.5l9-9z"/></svg>';
const ICON_CHECK =
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5l4 4 8-9"/></svg>';
const ICON_CLOSE =
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5l10 10M15 5 5 15"/></svg>';

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

const RECENT_MS = 7 * 24 * 60 * 60 * 1000;
function isRecentlyAdded(b) {
  return b.dateAdded > 0 && Date.now() - b.dateAdded < RECENT_MS;
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.hidden = true), 1600);
}

// ---------- Menú contextual (clic derecho) ----------
function closeContextMenu() {
  $("#ctx-menu")?.remove();
  document.removeEventListener("click", closeContextMenu);
  document.removeEventListener("contextmenu", closeContextMenu);
  document.removeEventListener("keydown", ctxMenuKeydown);
}

function ctxMenuKeydown(e) {
  if (e.key === "Escape") closeContextMenu();
}

function showContextMenu(x, y, items) {
  closeContextMenu();
  const menu = document.createElement("div");
  menu.id = "ctx-menu";
  menu.className = "ctx-menu";
  for (const item of items) {
    const btn = document.createElement("button");
    btn.className = "ctx-menu-item";
    btn.textContent = item.label;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeContextMenu();
      item.onClick();
    });
    menu.appendChild(btn);
  }
  document.body.appendChild(menu);

  const rect = menu.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - 8;
  const maxY = window.innerHeight - rect.height - 8;
  menu.style.left = `${Math.max(8, Math.min(x, maxX))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, maxY))}px`;

  setTimeout(() => {
    document.addEventListener("click", closeContextMenu);
    document.addEventListener("contextmenu", closeContextMenu);
    document.addEventListener("keydown", ctxMenuKeydown);
  }, 0);
}

async function openAllBookmarks(items) {
  if (!items.length) return;
  if (items.length > 8 && !confirm(t("confirmOpenAll", items.length))) return;
  for (const b of items) await chrome.tabs.create({ url: b.url, active: false });
}

function attachOpenAllContextMenu(el, getItems) {
  el.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const items = getItems();
    showContextMenu(e.clientX, e.clientY, [
      { label: t("openAllLinks", items.length), onClick: () => openAllBookmarks(items) },
    ]);
  });
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
  attachOpenAllContextMenu(allBtn, () => allBookmarks);
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
        // click en la flecha (o en el ícono SVG que contiene) = expandir/colapsar; click en el resto = seleccionar
        if (hasSub && e.target.closest(".tw")) {
          btn.classList.toggle("expanded");
          childBox.classList.toggle("open");
          return;
        }
        selectFolder(child.id, btn, info.title);
      });

      attachOpenAllContextMenu(btn, () => allBookmarks.filter((b) => b.pathIds.includes(child.id)));
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

// Carpeta real que contiene el favorito, según la carpeta actualmente seleccionada.
function sectionInfoFor(b) {
  if (currentFolder) {
    const idx = b.pathIds.indexOf(currentFolder);
    const childId = idx !== -1 ? b.pathIds[idx + 1] : undefined;
    if (childId) {
      return { key: childId, folderId: childId, title: folderIndex[childId]?.title || t("otherFolder") };
    }
    return { key: GENERAL_KEY, folderId: currentFolder, title: t("general") };
  }
  const folderId = b.pathIds[b.pathIds.length - 1];
  if (!folderId) return { key: GENERAL_KEY, folderId: null, title: t("general") };
  return { key: folderId, folderId, title: folderIndex[folderId]?.title || t("general") };
}

function groupIntoSections(items) {
  const buckets = new Map();
  for (const b of items) {
    const info = sectionInfoFor(b);
    if (!buckets.has(info.key)) buckets.set(info.key, { key: info.key, folderId: info.folderId, title: info.title, items: [] });
    buckets.get(info.key).items.push(b);
  }
  const sections = [...buckets.values()];
  sections.sort((a, b) => {
    if (a.key === GENERAL_KEY) return 1;
    if (b.key === GENERAL_KEY) return -1;
    return a.title.localeCompare(b.title, lang);
  });
  return sections;
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

// ---------- Selección múltiple ----------
function setSelected(id, on) {
  if (on) selectedIds.add(id);
  else selectedIds.delete(id);
  listEl.classList.toggle("has-selection", selectedIds.size > 0);
  updateBulkBar();
}

function clearSelection() {
  selectedIds.clear();
  render();
}

function updateBulkBar() {
  const bar = $("#bulk-bar");
  const n = selectedIds.size;
  bar.hidden = n === 0;
  if (n > 0) $("#bulk-count").textContent = t("itemsSelected", n);
}

$("#bulk-cancel").addEventListener("click", clearSelection);

$("#bulk-delete").addEventListener("click", async () => {
  const ids = [...selectedIds];
  if (!ids.length) return;
  if (!confirm(t("confirmDeleteMultiple", ids.length))) return;
  await Promise.all(ids.map((id) => chrome.bookmarks.remove(id)));
  selectedIds.clear();
  $("#bulk-bar").hidden = true;
  toast(t("bookmarkDeleted"));
  load();
});

// ---------- Drag & drop estilo kanban entre carpetas ----------
function clearDragClasses() {
  document
    .querySelectorAll(".drag-over-top, .drag-over-bottom, .drag-over")
    .forEach((n) => n.classList.remove("drag-over-top", "drag-over-bottom", "drag-over"));
}

function attachDragSource(el, b) {
  el.draggable = true;
  el.addEventListener("dragstart", (e) => {
    draggingId = b.id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", b.id);
    el.classList.add("dragging");
  });
  el.addEventListener("dragend", () => {
    draggingId = null;
    el.classList.remove("dragging");
    clearDragClasses();
  });
  el.addEventListener("dragover", (e) => {
    if (!draggingId || draggingId === b.id) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const rect = el.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    el.classList.toggle("drag-over-top", before);
    el.classList.toggle("drag-over-bottom", !before);
  });
  el.addEventListener("dragleave", () => {
    el.classList.remove("drag-over-top", "drag-over-bottom");
  });
  el.addEventListener("drop", async (e) => {
    if (!draggingId || draggingId === b.id) return;
    e.preventDefault();
    e.stopPropagation();
    const before = el.classList.contains("drag-over-top");
    el.classList.remove("drag-over-top", "drag-over-bottom");
    await dropBookmarkNear(draggingId, b.id, before);
  });
}

function attachDragContainer(container, folderId) {
  if (folderId == null) return;
  container.addEventListener("dragover", (e) => {
    if (!draggingId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    container.classList.add("drag-over");
  });
  container.addEventListener("dragleave", (e) => {
    if (e.target === container) container.classList.remove("drag-over");
  });
  container.addEventListener("drop", async (e) => {
    if (!draggingId) return;
    e.preventDefault();
    container.classList.remove("drag-over");
    await dropBookmarkAtEnd(draggingId, folderId);
  });
}

function switchToManualSort() {
  const sortSel = $("#sort");
  if (sortSel.value !== "manual") sortSel.value = "manual";
}

async function dropBookmarkNear(draggedId, targetId, before) {
  const targetBm = allBookmarks.find((x) => x.id === targetId);
  if (!targetBm) return;
  const folderId = targetBm.pathIds[targetBm.pathIds.length - 1];
  const siblings = await chrome.bookmarks.getChildren(folderId);
  let index = siblings.findIndex((s) => s.id === targetId);
  if (index === -1) index = siblings.length;
  if (!before) index += 1;
  await chrome.bookmarks.move(draggedId, { parentId: folderId, index });
  toast(t("bookmarkMoved"));
  switchToManualSort();
  animateNextRender = true;
  load();
}

async function dropBookmarkAtEnd(draggedId, folderId) {
  const siblings = await chrome.bookmarks.getChildren(folderId);
  await chrome.bookmarks.move(draggedId, { parentId: folderId, index: siblings.length });
  toast(t("bookmarkMoved"));
  switchToManualSort();
  animateNextRender = true;
  load();
}

// ---------- Edición inline ----------
async function saveBookmarkEdit(b, title, url) {
  if (!url) {
    toast(t("invalidUrl"));
    return;
  }
  let finalUrl = url;
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(finalUrl)) finalUrl = `https://${finalUrl}`;
  try {
    new URL(finalUrl);
  } catch {
    toast(t("invalidUrl"));
    return;
  }
  const finalTitle = title || domainOf(finalUrl);
  await chrome.bookmarks.update(b.id, { title: finalTitle, url: finalUrl });
  toast(t("bookmarkUpdated"));
  load();
}

function enterRowEditMode(row, b) {
  row.draggable = false;
  row.classList.add("editing");
  const info = row.querySelector(".info");
  info.innerHTML = "";
  const titleInput = document.createElement("input");
  titleInput.className = "edit-title";
  titleInput.value = b.title;
  const urlInput = document.createElement("input");
  urlInput.className = "edit-url";
  urlInput.value = b.url;
  info.append(titleInput, urlInput);

  const actions = row.querySelector(".actions");
  actions.innerHTML = `
    <button class="act-save" title="${t("saveEdit")}" aria-label="${t("saveEdit")}">${ICON_CHECK}</button>
    <button class="act-cancel-edit" title="${t("cancel")}" aria-label="${t("cancel")}">${ICON_CLOSE}</button>
  `;

  const commit = () => saveBookmarkEdit(b, titleInput.value.trim(), urlInput.value.trim());
  const cancel = () => render();

  actions.querySelector(".act-save").addEventListener("click", (e) => { e.stopPropagation(); commit(); });
  actions.querySelector(".act-cancel-edit").addEventListener("click", (e) => { e.stopPropagation(); cancel(); });
  for (const inp of [titleInput, urlInput]) {
    inp.addEventListener("click", (e) => e.stopPropagation());
    inp.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      if (e.key === "Escape") { e.preventDefault(); cancel(); }
    });
  }
  titleInput.focus();
  titleInput.select();
}

function enterTileEditMode(wrap, b) {
  wrap.draggable = false;
  wrap.classList.add("editing");
  const tile = wrap.querySelector(".tile");
  tile.hidden = true;

  const form = document.createElement("div");
  form.className = "tile-edit-form";
  const titleInput = document.createElement("input");
  titleInput.className = "edit-title";
  titleInput.value = b.title;
  const urlInput = document.createElement("input");
  urlInput.className = "edit-url";
  urlInput.value = b.url;
  form.append(titleInput, urlInput);
  wrap.insertBefore(form, tile);

  const actions = wrap.querySelector(".tile-actions");
  actions.innerHTML = `
    <button class="act-save" title="${t("saveEdit")}" aria-label="${t("saveEdit")}">${ICON_CHECK}</button>
    <button class="act-cancel-edit" title="${t("cancel")}" aria-label="${t("cancel")}">${ICON_CLOSE}</button>
  `;

  const commit = () => saveBookmarkEdit(b, titleInput.value.trim(), urlInput.value.trim());
  const cancel = () => render();

  actions.querySelector(".act-save").addEventListener("click", (e) => { e.stopPropagation(); commit(); });
  actions.querySelector(".act-cancel-edit").addEventListener("click", (e) => { e.stopPropagation(); cancel(); });
  for (const inp of [titleInput, urlInput]) {
    inp.addEventListener("click", (e) => e.stopPropagation());
    inp.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      if (e.key === "Escape") { e.preventDefault(); cancel(); }
    });
  }
  titleInput.focus();
  titleInput.select();
}

function buildRow(b) {
  const row = document.createElement("div");
  row.className = "bm";
  row.dataset.id = b.id;
  row.innerHTML = `
    <div class="favicon-chip">
      <input type="checkbox" class="select-box" title="${t("selectBookmark")}" aria-label="${t("selectBookmark")}" />
      <img class="favicon" loading="lazy" alt="" />
    </div>
    <div class="info">
      <div class="title"></div>
      <div class="meta">
        <span class="path"></span>
        <span class="url"></span>
        <span class="date"></span>
      </div>
    </div>
    <div class="actions">
      <button class="act-edit" title="${t("editBookmark")}" aria-label="${t("editBookmark")}">${ICON_EDIT}</button>
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

  const checkbox = row.querySelector(".select-box");
  checkbox.checked = selectedIds.has(b.id);
  row.classList.toggle("selected", checkbox.checked);
  checkbox.addEventListener("click", (e) => e.stopPropagation());
  checkbox.addEventListener("change", () => {
    setSelected(b.id, checkbox.checked);
    row.classList.toggle("selected", checkbox.checked);
  });

  row.addEventListener("click", (e) => {
    if (e.target.closest(".actions") || e.target.closest(".select-box")) return;
    chrome.tabs.create({ url: b.url, active: !e.ctrlKey && !e.metaKey });
  });

  row.querySelector(".act-edit").addEventListener("click", (e) => {
    e.stopPropagation();
    enterRowEditMode(row, b);
  });

  row.querySelector(".act-copy").addEventListener("click", async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(b.url);
    toast(t("urlCopied"));
  });

  row.querySelector(".act-del").addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!confirm(t("confirmDelete", b.title))) return;
    await chrome.bookmarks.remove(b.id);
    toast(t("bookmarkDeleted"));
    load();
  });

  attachDragSource(row, b);

  return row;
}

function buildTile(b, opts = {}) {
  const wrap = document.createElement("div");
  wrap.className = opts.cover ? "tile-wrap cover" : "tile-wrap";
  wrap.dataset.id = b.id;
  const badge = opts.cover && isRecentlyAdded(b) ? `<span class="cover-badge">${t("recentlyAdded")}</span>` : "";
  wrap.innerHTML = `
    ${badge}
    <a class="tile" href="${b.url}" target="_blank" rel="noopener" title="${b.url}">
      <div class="tile-icon">
        <input type="checkbox" class="select-box" title="${t("selectBookmark")}" aria-label="${t("selectBookmark")}" />
        <img class="favicon" loading="lazy" alt="" />
      </div>
      <div class="tile-title"></div>
    </a>
    <div class="tile-actions">
      <button class="act-edit" title="${t("editBookmark")}" aria-label="${t("editBookmark")}">${ICON_EDIT}</button>
      <button class="act-copy" title="${t("copyUrl")}" aria-label="${t("copyUrl")}">${ICON_COPY}</button>
      <button class="act-del" title="${t("deleteBookmark")}" aria-label="${t("deleteBookmark")}">${ICON_TRASH}</button>
    </div>
  `;
  wrap.querySelector(".favicon").src = faviconUrl(b.url);
  wrap.querySelector(".tile-title").textContent = b.title;
  wrap.querySelector(".tile").draggable = false;

  const checkbox = wrap.querySelector(".select-box");
  checkbox.checked = selectedIds.has(b.id);
  wrap.classList.toggle("selected", checkbox.checked);
  checkbox.addEventListener("click", (e) => e.stopPropagation());
  checkbox.addEventListener("change", () => {
    setSelected(b.id, checkbox.checked);
    wrap.classList.toggle("selected", checkbox.checked);
  });

  wrap.querySelector(".tile").addEventListener("click", (e) => {
    if (e.target.closest(".select-box")) return;
    e.preventDefault();
    chrome.tabs.create({ url: b.url, active: !e.ctrlKey && !e.metaKey });
  });

  wrap.querySelector(".act-edit").addEventListener("click", (e) => {
    e.stopPropagation();
    enterTileEditMode(wrap, b);
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

  attachDragSource(wrap, b);

  return wrap;
}

function renderKanban(items) {
  const sections = groupIntoSections(items);
  const board = document.createElement("div");
  board.className = "kanban-board";

  for (const section of sections) {
    const col = document.createElement("div");
    col.className = "kanban-column";

    const header = document.createElement("div");
    header.className = "kanban-column-header";
    header.innerHTML = `<h3></h3><span class="count"></span>`;
    header.querySelector("h3").textContent = section.title;
    header.querySelector(".count").textContent = section.items.length;
    attachOpenAllContextMenu(header, () => section.items);
    col.appendChild(header);

    const body = document.createElement("div");
    body.className = "kanban-column-body";
    for (const b of section.items) body.appendChild(buildRow(b));
    attachDragContainer(body, section.folderId);
    col.appendChild(body);

    board.appendChild(col);
  }
  listEl.appendChild(board);
}

// ---------- Animación de reubicación (estilo FLIP) ----------
let animateNextRender = false;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function captureRects(root) {
  const map = new Map();
  root.querySelectorAll("[data-id]").forEach((el) => {
    map.set(el.dataset.id, el.getBoundingClientRect());
  });
  return map;
}

function playFlip(root, oldRects) {
  root.querySelectorAll("[data-id]").forEach((el) => {
    const old = oldRects.get(el.dataset.id);
    if (!old) return;
    const neu = el.getBoundingClientRect();
    const dx = old.left - neu.left;
    const dy = old.top - neu.top;
    if (!dx && !dy) return;
    el.style.transition = "none";
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform = "";
      });
    });
    el.addEventListener("transitionend", () => { el.style.transition = ""; }, { once: true });
  });
}

function render() {
  const items = getVisible();
  $("#context-count").textContent = t("itemsCount", items.length);

  const shouldAnimate = animateNextRender && !prefersReducedMotion();
  animateNextRender = false;
  const oldRects = shouldAnimate ? captureRects(listEl) : null;

  listEl.innerHTML = "";
  emptyEl.hidden = items.length > 0;
  listEl.classList.toggle("has-selection", selectedIds.size > 0);
  updateBulkBar();

  if (viewMode === "kanban") {
    renderKanban(items);
  } else {
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
        header.querySelector("h3").textContent = section.title;
        header.querySelector(".count").textContent = section.items.length;
        attachOpenAllContextMenu(header, () => section.items);
        sectionEl.appendChild(header);
      }

      const list = document.createElement("div");
      if (viewMode === "grid") {
        list.className = "tile-grid";
        for (const b of section.items) list.appendChild(buildTile(b));
      } else if (viewMode === "cover") {
        list.className = "cover-grid";
        for (const b of section.items) list.appendChild(buildTile(b, { cover: true }));
      } else {
        list.className = "section-list";
        for (const b of section.items) list.appendChild(buildRow(b));
      }
      attachDragContainer(list, section.folderId);
      sectionEl.appendChild(list);

      frag.appendChild(sectionEl);
    }
    listEl.appendChild(frag);
  }

  if (shouldAnimate) playFlip(listEl, oldRects);
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

const VIEW_MODES = ["list", "grid", "cover", "kanban"];

function setViewMode(mode) {
  viewMode = mode;
  listEl.classList.toggle("grid-mode", mode === "grid");
  listEl.classList.toggle("cover-mode", mode === "cover");
  listEl.classList.toggle("kanban-mode", mode === "kanban");
  for (const m of VIEW_MODES) {
    const btn = $(`#view-${m}`);
    btn.classList.toggle("active", mode === m);
    btn.setAttribute("aria-pressed", String(mode === m));
  }
  $("#toggle-view").disabled = mode !== "list";
  render();
}

for (const m of VIEW_MODES) {
  $(`#view-${m}`).addEventListener("click", () => setViewMode(m));
}

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
$("#app-version").textContent = `v${chrome.runtime.getManifest().version}`;
applyStaticTranslations();
updateThemeToggle();
updateLangToggle();
load();
