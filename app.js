const API_URL = "https://api-web.dnccudinus.org/api/mobil";
const PAGE_SIZE = 9;
const el = Object.fromEntries(
  [
    "carGrid",
    "searchInput",
    "brandFilter",
    "fuelFilter",
    "statusFilter",
    "sortFilter",
    "quickFilters",
    "resultsLabel",
    "heroTotal",
    "loadMore",
    "resetFilters",
    "emptyState",
    "errorState",
    "retryButton",
    "clearFilters",
    "themeToggle",
    "carDialog",
    "dialogContent",
    "dialogClose",
  ].map((id) => [id, document.getElementById(id)]),
);
let cars = [],
  visibleCount = PAGE_SIZE,
  activeQuickFuel = "all";
const money = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const availability = (status) =>
  String(status).toLowerCase() === "tersedia" ? "Available" : "Sold";

function populateFilters() {
  const brands = [...new Set(cars.map((c) => c.brand).filter(Boolean))].sort();
  const fuels = [
    ...new Set(cars.map((c) => c.bahan_bakar).filter(Boolean)),
  ].sort();
  el.brandFilter.innerHTML =
    '<option value="all">All makes</option>' +
    brands.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
  el.fuelFilter.innerHTML =
    '<option value="all">All fuel types</option>' +
    fuels.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
}
function filteredCars() {
  const q = el.searchInput.value.trim().toLowerCase();
  return cars
    .filter((c) => {
      const text = [c.nama, c.brand, c.tahun, c.transmisi, c.bahan_bakar]
        .join(" ")
        .toLowerCase();
      return (
        (!q || text.includes(q)) &&
        (el.brandFilter.value === "all" || c.brand === el.brandFilter.value) &&
        (el.fuelFilter.value === "all" ||
          c.bahan_bakar === el.fuelFilter.value) &&
        (activeQuickFuel === "all" || c.bahan_bakar === activeQuickFuel) &&
        (el.statusFilter.value === "all" || c.status === el.statusFilter.value)
      );
    })
    .sort((a, b) => {
      if (el.sortFilter.value === "price-low")
        return Number(a.harga) - Number(b.harga);
      if (el.sortFilter.value === "price-high")
        return Number(b.harga) - Number(a.harga);
      if (el.sortFilter.value === "name")
        return String(a.nama).localeCompare(String(b.nama));
      return Number(b.tahun) - Number(a.tahun) || Number(b.id) - Number(a.id);
    });
}
function card(c, i) {
  const sold = c.status !== "tersedia";
  return `<article class="car-card" data-id="${esc(c.id)}" tabindex="0" role="button" aria-label="Lihat detail ${esc(c.nama)}" style="animation-delay:${Math.min(i * 35, 280)}ms">
  <div class="car-photo">
    <img src="${esc(c.foto)}" alt="${esc(c.nama)}" loading="lazy" decoding="async">
    <span class="availability ${sold ? "sold" : ""}">${availability(c.status)}</span>
    <span class="year">${esc(c.tahun)}</span>
  </div>

  <div class="car-body"><div class="car-brand">
    ${esc(c.brand || "Automotive")}
  </div>

  <div class="car-title-row">
    <h3 class="car-title">${esc(c.nama)}</h3>
    <span class="car-arrow">↗</span>
  </div>

  <div class="specs">
    <span class="spec">⚙ ${esc(c.transmisi || "N/A")}</span>
    <span class="spec">◉ ${esc(c.bahan_bakar || "N/A")}</span>
  </div>

  <div class="price-row">
    <div>
      <span class="price-label">PRICE</span>
      <strong class="price">${money(c.harga)}</strong>
    </div>
    <span class="detail-cta">View details ↗</span>
  </div></div></article>`;
}
function render() {
  const filtered = filteredCars(),
    shown = filtered.slice(0, visibleCount);
  el.carGrid.innerHTML = shown.map(card).join("");
  el.resultsLabel.textContent = `Showing ${shown.length} of ${filtered.length} vehicles`;
  el.loadMore.hidden = shown.length >= filtered.length || !filtered.length;
  el.emptyState.hidden = filtered.length !== 0;
  el.resetFilters.hidden =
    !el.searchInput.value &&
    el.brandFilter.value === "all" &&
    el.fuelFilter.value === "all" &&
    el.statusFilter.value === "all" &&
    el.sortFilter.value === "newest" &&
    activeQuickFuel === "all";
}
function refresh() {
  visibleCount = PAGE_SIZE;
  render();
}
function showDetails(c) {
  const items = [
    ["Make", c.brand],
    ["Model year", c.tahun],
    ["Transmission", c.transmisi],
    ["Fuel type", c.bahan_bakar],
    ["Availability", availability(c.status)],
    ["Listing ID", `#${c.id}`],
  ];
  el.dialogContent.innerHTML = `<div class="dialog-photo"><img src="${esc(c.foto)}" alt="${esc(c.nama)}"></div><div class="dialog-main"><div class="car-brand">${esc(c.brand)} · ${esc(c.tahun)}</div><h2>${esc(c.nama)}</h2><div class="dialog-price">${money(c.harga)}</div><div class="dialog-grid">${items.map(([k, v]) => `<div class="dialog-item"><span>${esc(k)}</span><strong>${esc(v || "N/A")}</strong></div>`).join("")}</div><p class="dialog-note">${c.status === "tersedia" ? "This vehicle is currently listed as available." : "This vehicle is currently marked as sold."} Konfirmasi ketersediaan dan harga akhir kepada showroom. Data ditampilkan berdasarkan API inventaris.</p></div>`;
  el.carDialog.showModal();
}
async function loadCars() {
  el.errorState.hidden = true;
  el.resultsLabel.textContent = "Loading inventory...";
  el.carGrid.innerHTML = '<div class="skeleton"></div>'.repeat(6);
  try {
    const response = await fetch(API_URL, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload.success || !Array.isArray(payload.data))
      throw new Error("Format respons API tidak sesuai");
    cars = payload.data;
    el.heroTotal.textContent = String(payload.total ?? cars.length).padStart(
      2,
      "0",
    );
    populateFilters();
    refresh();
  } catch (error) {
    console.error("Gagal mengambil inventaris:", error);
    el.carGrid.innerHTML = "";
    el.errorState.hidden = false;
    el.resultsLabel.textContent = "Inventory unavailable";
  }
}
[
  el.searchInput,
  el.brandFilter,
  el.fuelFilter,
  el.statusFilter,
  el.sortFilter,
].forEach((control) =>
  control.addEventListener(
    control === el.searchInput ? "input" : "change",
    refresh,
  ),
);
el.quickFilters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-fuel]");
  if (!button) return;
  activeQuickFuel = button.dataset.fuel;
  el.fuelFilter.value = "all";
  el.quickFilters
    .querySelectorAll("button")
    .forEach((b) => b.classList.toggle("selected", b === button));
  refresh();
});
el.carGrid.addEventListener("click", (event) => {
  const c = cars.find(
    (item) => String(item.id) === event.target.closest(".car-card")?.dataset.id,
  );
  if (c) showDetails(c);
});
el.carGrid.addEventListener("keydown", (event) => {
  if (!["Enter", " "].includes(event.key)) return;
  const card = event.target.closest(".car-card");
  if (!card) return;
  event.preventDefault();
  const c = cars.find((item) => String(item.id) === card.dataset.id);
  if (c) showDetails(c);
});
el.loadMore.addEventListener("click", () => {
  visibleCount += PAGE_SIZE;
  render();
});
function clearFilters() {
  el.searchInput.value = "";
  el.brandFilter.value = el.fuelFilter.value = el.statusFilter.value = "all";
  el.sortFilter.value = "newest";
  activeQuickFuel = "all";
  el.quickFilters
    .querySelectorAll("button")
    .forEach((b) => b.classList.toggle("selected", b.dataset.fuel === "all"));
  refresh();
}
el.resetFilters.addEventListener("click", clearFilters);
el.clearFilters.addEventListener("click", clearFilters);
el.retryButton.addEventListener("click", loadCars);
el.dialogClose.addEventListener("click", () => el.carDialog.close());
el.carDialog.addEventListener("click", (e) => {
  if (e.target === el.carDialog) el.carDialog.close();
});
function setTheme(dark) {
  document.body.classList.toggle("dark", dark);
  el.themeToggle.textContent = dark ? "☾" : "☼";
  el.themeToggle.setAttribute(
    "aria-label",
    dark ? "Aktifkan light mode" : "Aktifkan dark mode",
  );
  document.querySelector('meta[name="theme-color"]').content = dark
    ? "#141612"
    : "#f5f5f2";
  try {
    localStorage.setItem("autora-theme", dark ? "dark" : "light");
  } catch {}
}
let theme = "light";
try {
  theme = localStorage.getItem("autora-theme") || "light";
} catch {}
setTheme(theme === "dark");
el.themeToggle.addEventListener("click", () =>
  setTheme(!document.body.classList.contains("dark")),
);
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    el.searchInput.focus();
  }
  if (e.key === "Escape" && el.carDialog.open) el.carDialog.close();
});
loadCars();
