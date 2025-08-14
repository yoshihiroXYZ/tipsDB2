const grid = document.querySelector("#grid");
document.querySelector("#year").textContent = new Date().getFullYear();

const overlay = document.querySelector("#overlay");
const modal = document.querySelector("#modal");
const modalContent = document.querySelector("#modal-content");
const modalClose = document.querySelector("#modal-close");

let items = [];

async function init() {
  const res = await fetch("./data/projects.json", { cache: "no-store" });
  items = await res.json();
  grid.innerHTML = items.map(cardHTML).join("");
  grid.addEventListener("click", onGridClick);
  overlay.addEventListener("click", closeModal);
  modalClose.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hasAttribute("hidden")) closeModal();
  });
}

function cardHTML(i, idx) {
  const index = typeof idx === "number" ? idx : items.indexOf(i);
  const alt = `${i.title} のサムネイル`;
  const tags = (i.tags||[]).map(t => `<span class="tag">${t}</span>`).join("");
  return `
    <article class="card">
      <a href="${i.url}" target="_blank" rel="noopener noreferrer">
        <img class="thumb" src="${i.thumb}" alt="${alt}" loading="lazy" />
      </a>
      <div class="card-body">
        <h2 class="title"><a href="${i.url}" target="_blank" rel="noopener noreferrer">${i.title}</a></h2>
        <p class="desc">${i.description||""}</p>
        <div class="tags">${tags}</div>
        <div class="actions">
          <button class="btn" data-detail="${index}">作品の詳細</button>
          <a class="btn secondary" href="${i.url}" target="_blank" rel="noopener noreferrer">作品を開く</a>
        </div>
      </div>
    </article>`;
}

function onGridClick(e) {
  const btn = e.target.closest("button[data-detail]");
  if (!btn) return;
  const idx = Number(btn.getAttribute("data-detail"));
  openModal(idx, btn);
}

let lastFocus = null;
function openModal(index, invoker) {
  lastFocus = invoker || document.activeElement;
  const i = items[index];
  const date = i.date ? new Date(i.date) : null;
  const dateStr = date ? date.toLocaleDateString("ja-JP") : "";

  modalContent.innerHTML = `
    <div class="modal-header">
      <h2 id="modal-title" class="modal-title">${i.title}</h2>
    </div>
    <div class="modal-meta">${[dateStr, (i.tags||[]).join(" / ")].filter(Boolean).join("　|　")}</div>
    <div class="modal-body">
      <img src="${i.thumb}" alt="${i.title} の拡大画像" style="width:100%;border-radius:12px;margin-bottom:12px;" loading="lazy" />
      <p>${i.detail || i.description || ""}</p>
    </div>
    <div class="modal-actions">
      <a class="btn" href="${i.url}" target="_blank" rel="noopener noreferrer">作品を開く</a>
      <button class="btn secondary" id="modal-ok">閉じる</button>
    </div>
  `;

  overlay.removeAttribute("hidden");
  modal.removeAttribute("hidden");
  document.body.style.overflow = "hidden";
  // Move focus to close
  setTimeout(() => (modalClose.focus()), 0);

  // Close button inside content
  modalContent.querySelector("#modal-ok").addEventListener("click", closeModal);
}

function closeModal() {
  modal.setAttribute("hidden", "");
  overlay.setAttribute("hidden", "");
  document.body.style.overflow = "";
  if (lastFocus) lastFocus.focus();
}

init();
