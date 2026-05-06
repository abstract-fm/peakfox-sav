export function toggleFaq(btn) {
  const body = btn.nextElementSibling;
  const isOpen = btn.classList.contains("open");

  document.querySelectorAll(".faq-article-btn").forEach((item) => {
    item.classList.remove("open");
    if (item.nextElementSibling) item.nextElementSibling.classList.remove("open");
  });

  if (!isOpen && body) {
    btn.classList.add("open");
    body.classList.add("open");
  }
}

export function filterFaqArticles(query) {
  const normalized = String(query || "").toLowerCase().trim();

  document.querySelectorAll(".faq-article-card").forEach((card) => {
    const haystack = `${card.dataset.search || ""} ${card.textContent || ""}`.toLowerCase();
    card.style.display = !normalized || haystack.includes(normalized) ? "" : "none";
  });

  document.querySelectorAll(".faq-section-block").forEach((block) => {
    const visible = [...block.querySelectorAll(".faq-article-card")].some((card) => card.style.display !== "none");
    block.style.display = visible ? "" : "none";
  });
}

function openFaqFromHash() {
  const hash = window.location.hash.replace("#", "");
  if (!hash) return;

  const target = document.getElementById(`art-${hash}`);
  if (!target) return;

  target.click();
  setTimeout(() => {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 60);
}

export function initFaq() {
  document.querySelectorAll(".faq-article-btn").forEach((btn) => {
    btn.addEventListener("click", () => toggleFaq(btn));
  });

  document.getElementById("faqSearch")?.addEventListener("input", (event) => {
    filterFaqArticles(event.target.value);
  });

  window.addEventListener("DOMContentLoaded", openFaqFromHash);
  window.addEventListener("hashchange", openFaqFromHash);
}
