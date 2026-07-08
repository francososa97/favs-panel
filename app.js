// ---------- Estado ----------
let allBookmarks = [];   // planos: {id, title, url, dateAdded, path, folderId}
let folderIndex = {};    // id -> {title, children, count}
let currentFolder = null; // null = todos
let currentQuery = "";

const $ = (sel) => document.querySelector(sel);
const listEl = $("#list");
const treeEl = $("#folder-tree");
const emptyEl = $("#empty");

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
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 30) return `hace ${d}d`;
  if (d < 365) return `hace ${Math.floor(d / 30)}m`;
  return `hace ${Math.floor(d / 365)}a`;
}

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 1600);
}

// ---------- Carga ----------
async function load() {
  const tree = await chrome.bookmarks.getTree();
  allBookmarks = [];
  folderIndex = {};

  function walk(node, path, pathIds) {
    if (node.url) {
      allBookmarks.push({
        id: node.id,
        title: node.title || node.url,
        url: node.url,
        dateAdded: node.dateAdded || 0,
        path: path.join(" / ") || "raíz",
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
      title: node.title || "Favoritos",
      children,
      count,
    };
    return count;
  }

  for (const root of tree) walk(root, [], []);

  const totalFolders = Object.values(folderIndex).filter((f) => f.title !== "Favoritos").length;
  $("#global-stats").textContent = `${allBookmarks.length} favoritos · ${totalFolders} carpetas`;

  renderTree(tree);
  render();
}

// ---------- Árbol ----------
function renderTree(tree) {
  treeEl.innerHTML = "";

  const allBtn = makeTreeItem({ title: "Todos los favoritos", count: allBookmarks.length }, 0, false);
  allBtn.classList.add("active");
  allBtn.addEventListener("click", () => selectFolder(null, allBtn, "Todos los favoritos"));
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
    return childId ? folderIndex[childId]?.title || "Otros" : GENERAL_KEY;
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
    return a.localeCompare(b, "es");
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
  if (sort === "az") sorted.sort((a, b) => a.title.localeCompare(b.title, "es"));
  if (sort === "za") sorted.sort((a, b) => b.title.localeCompare(a.title, "es"));
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
      <button class="act-copy" title="Copiar URL" aria-label="Copiar URL">${ICON_COPY}</button>
      <button class="act-del" title="Eliminar favorito" aria-label="Eliminar favorito">${ICON_TRASH}</button>
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
    toast("URL copiada");
  });

  row.querySelector(".act-del").addEventListener("click", async () => {
    if (!confirm(`¿Eliminar "${b.title}" de tus favoritos?`)) return;
    await chrome.bookmarks.remove(b.id);
    toast("Favorito eliminado");
    load();
  });

  return row;
}

function render() {
  const items = getVisible();
  $("#context-count").textContent = `${items.length} items`;
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
        section.key === GENERAL_KEY ? "General" : section.key;
      header.querySelector(".count").textContent = section.items.length;
      sectionEl.appendChild(header);
    }

    const list = document.createElement("div");
    list.className = "section-list";
    for (const b of section.items) list.appendChild(buildRow(b));
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

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== $("#search")) {
    e.preventDefault();
    $("#search").focus();
  }
});

// Refrescar si cambian los bookmarks desde otro lado
chrome.bookmarks.onCreated.addListener(load);
chrome.bookmarks.onRemoved.addListener(load);
chrome.bookmarks.onChanged.addListener(load);
chrome.bookmarks.onMoved.addListener(load);

load();
