import { TOOLS, TOOL_CATEGORIES } from './tools-registry.js';

const toolGrid = document.querySelector('#toolGrid');
const chips = document.querySelector('#categoryChips');
const searchInput = document.querySelector('#toolSearch');
const searchButton = document.querySelector('#searchButton');
const resultSummary = document.querySelector('#resultSummary');
const categoryGrid = document.querySelector('#categoryGrid');
let activeCategory = 'all';

const favouriteKey = 'cspwala_favourite_tools';
const favourites = new Set(JSON.parse(localStorage.getItem(favouriteKey) || '[]'));
const normalize = value => String(value || '').toLocaleLowerCase('mr-IN').normalize('NFKD');

function matches(tool, query) {
  if (!query) return true;
  const haystack = [tool.name, tool.nameMr, tool.descriptionMr, tool.category, ...(tool.keywords || [])].join(' ');
  return normalize(haystack).includes(normalize(query));
}

function renderCategoryCards() {
  categoryGrid.innerHTML = TOOL_CATEGORIES.filter(c => c.id !== 'all').map(category => {
    const count = TOOLS.filter(tool => tool.category === category.id).length;
    return `<button class="category-card" type="button" data-category-card="${category.id}">
      <span class="category-icon">${category.icon}</span>
      <span><strong>${category.nameMr}</strong><small>${category.name} · ${count} tools</small></span>
      <span aria-hidden="true">→</span>
    </button>`;
  }).join('');
}

function renderChips() {
  chips.innerHTML = TOOL_CATEGORIES.map(category => `<button class="chip ${category.id === activeCategory ? 'active' : ''}" type="button" data-category="${category.id}">${category.icon} ${category.nameMr}</button>`).join('');
}

function renderTools() {
  const query = searchInput.value.trim();
  const tools = TOOLS.filter(tool => (activeCategory === 'all' || tool.category === activeCategory) && matches(tool, query));
  resultSummary.textContent = query ? `${tools.length} matching tools` : `${tools.length} tools उपलब्ध`;
  toolGrid.innerHTML = tools.length ? tools.map(tool => {
    const isFavourite = favourites.has(tool.id);
    return `<article class="tool-card" data-tool-id="${tool.id}">
      <div class="tool-card-top"><div class="tool-icon" aria-hidden="true">${tool.icon}</div><button class="favorite-btn" type="button" data-favourite="${tool.id}" aria-label="Favourite ${tool.name}" aria-pressed="${isFavourite}">${isFavourite ? '★' : '☆'}</button></div>
      <h3>${tool.nameMr}<small>${tool.name}</small></h3>
      <p>${tool.descriptionMr}</p>
      <div class="badges"><span class="badge badge-free">FREE</span>${tool.processingType === 'local' ? '<span class="badge badge-local">LOCAL</span>' : ''}${tool.beta ? '<span class="badge badge-new">BETA</span>' : ''}</div>
      <div class="tool-card-footer"><a class="btn btn-primary btn-block" href="${tool.href}">टूल उघडा <span aria-hidden="true">→</span></a></div>
    </article>`;
  }).join('') : '<div class="empty-state"><strong>कोणतेही टूल सापडले नाही.</strong><br>Search शब्द किंवा category बदला.</div>';
}

function selectCategory(id) {
  activeCategory = id;
  renderChips();
  renderTools();
  document.querySelector('#all-tools')?.scrollIntoView({ behavior:'smooth' });
}

chips.addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (button) selectCategory(button.dataset.category);
});
categoryGrid.addEventListener('click', event => {
  const button = event.target.closest('[data-category-card]');
  if (button) selectCategory(button.dataset.categoryCard);
});
toolGrid.addEventListener('click', event => {
  const button = event.target.closest('[data-favourite]');
  if (!button) return;
  const id = button.dataset.favourite;
  favourites.has(id) ? favourites.delete(id) : favourites.add(id);
  localStorage.setItem(favouriteKey, JSON.stringify([...favourites]));
  renderTools();
});
searchInput.addEventListener('input', renderTools);
searchInput.addEventListener('keydown', event => { if (event.key === 'Enter') renderTools(); });
searchButton.addEventListener('click', renderTools);

renderCategoryCards();
renderChips();
renderTools();
