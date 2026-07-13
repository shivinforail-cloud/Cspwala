import { TOOLS, TOOL_CATEGORIES } from "./tools-registry.js";

const toolGrid = document.querySelector("#toolGrid");
const chips = document.querySelector("#categoryChips");
const searchInput = document.querySelector("#toolSearch");
const searchButton = document.querySelector("#searchButton");
const resultSummary = document.querySelector("#resultSummary");
let activeCategory = "all";

const favouriteKey = "cspwala_favourite_tools";
const favourites = new Set(JSON.parse(localStorage.getItem(favouriteKey) || "[]"));

function normalise(value) {
  return value.toLocaleLowerCase("en-IN").normalize("NFKD");
}

function matches(tool, query) {
  if (!query) return true;
  const haystack = [tool.name, tool.nameMr, tool.description, tool.descriptionMr, tool.category, ...tool.keywords].join(" ");
  return normalise(haystack).includes(normalise(query));
}

function renderChips() {
  chips.innerHTML = TOOL_CATEGORIES.map(category => `
    <button class="chip ${category.id === activeCategory ? "active" : ""}" type="button" data-category="${category.id}">
      ${category.nameMr} <span aria-hidden="true">·</span> ${category.name}
    </button>
  `).join("");
}

function renderTools() {
  const query = searchInput.value.trim();
  const tools = TOOLS.filter(tool => (activeCategory === "all" || tool.category === activeCategory) && matches(tool, query));
  resultSummary.textContent = query ? `${tools.length} matching tools` : `${tools.length} tools available`;

  if (!tools.length) {
    toolGrid.innerHTML = `<div class="empty-state"><strong>कोणतेही टूल सापडले नाही.</strong><br>Search शब्द बदला किंवा सर्व category निवडा.</div>`;
    return;
  }

  toolGrid.innerHTML = tools.map(tool => {
    const active = tool.status === "active";
    const isFavourite = favourites.has(tool.id);
    return `
      <article class="tool-card" data-tool-id="${tool.id}">
        <div class="tool-icon" aria-hidden="true">${tool.icon}</div>
        <h3>${tool.nameMr}<br><small class="muted">${tool.name}</small></h3>
        <p>${tool.descriptionMr}</p>
        <div class="badges">
          ${active ? '<span class="badge badge-free">FREE</span>' : '<span class="badge badge-soon">COMING SOON</span>'}
          ${tool.isNew ? '<span class="badge badge-new">NEW</span>' : ""}
        </div>
        <div class="tool-card-footer">
          ${active ? `<a class="btn btn-primary" href="${tool.href}">टूल उघडा</a>` : `<span class="muted"><strong>लवकरच उपलब्ध</strong></span>`}
          <button class="favorite-btn" type="button" data-favourite="${tool.id}" aria-label="Favourite ${tool.name}" aria-pressed="${isFavourite}">${isFavourite ? "★" : "☆"}</button>
        </div>
      </article>
    `;
  }).join("");
}

chips.addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  renderChips();
  renderTools();
});

toolGrid.addEventListener("click", event => {
  const button = event.target.closest("[data-favourite]");
  if (!button) return;
  const id = button.dataset.favourite;
  favourites.has(id) ? favourites.delete(id) : favourites.add(id);
  localStorage.setItem(favouriteKey, JSON.stringify([...favourites]));
  renderTools();
});

searchInput.addEventListener("input", renderTools);
searchInput.addEventListener("keydown", event => {
  if (event.key === "Enter") renderTools();
});
searchButton.addEventListener("click", renderTools);

renderChips();
renderTools();
