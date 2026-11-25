document.documentElement.classList.add("js");

/* ---------- Language ----------
   Priority: URL ?lang= > saved choice > English (the site default).
   The static markup is already English, so a first visit never flashes Chinese.
   Each page wraps its body content in [data-lang-panel="zh"|"en"]; nav / footer
   strings use data-i18n / data-i18n-aria / data-i18n-meta; zh-only items use data-zh-only.
--------------------------------------------------------------------------- */
const langStorageKey = "thinkery-site-lang";
const langPanels = [...document.querySelectorAll("[data-lang-panel]")];
const i18nNodes = [...document.querySelectorAll("[data-i18n], [data-i18n-aria], [data-i18n-alt], [data-i18n-meta], [data-i18n-src], [data-zh-only]")];
const currentLang = () => document.documentElement.lang.startsWith("zh") ? "zh" : "en";

const pickTranslation = (raw, lang) => {
  const pair = raw.split("|");
  return (lang === "en" ? (pair[1] ?? pair[0]) : pair[0]).trim();
};

const applyLang = (lang, { persist = true } = {}) => {
  if (!langPanels.length && !i18nNodes.length) return;
  const normalized = lang === "en" ? "en" : "zh";
  document.documentElement.lang = normalized === "en" ? "en" : "zh-Hans";

  langPanels.forEach((panel) => { panel.hidden = panel.dataset.langPanel !== normalized; });
  i18nNodes.forEach((node) => {
    if (node.hasAttribute("data-zh-only")) {
      node.hidden = normalized !== "zh";
      return;
    }
    if (node.hasAttribute("data-i18n")) node.textContent = pickTranslation(node.dataset.i18n, normalized);
    if (node.hasAttribute("data-i18n-aria")) node.setAttribute("aria-label", pickTranslation(node.dataset.i18nAria, normalized));
    if (node.hasAttribute("data-i18n-alt")) node.setAttribute("alt", pickTranslation(node.dataset.i18nAlt, normalized));
    if (node.hasAttribute("data-i18n-meta")) node.setAttribute("content", pickTranslation(node.dataset.i18nMeta, normalized));
    if (node.hasAttribute("data-i18n-src")) {
      const src = pickTranslation(node.dataset.i18nSrc, normalized);
      if (node.getAttribute("src") !== src) node.setAttribute("src", src);
    }
  });

  // A panel that was hidden when the reveal observer ran needs its in-view items shown now.
  const activePanel = langPanels.find((p) => p.dataset.langPanel === normalized);
  requestAnimationFrame(() => {
    activePanel?.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((el) => {
      const box = el.getBoundingClientRect();
      if (box.top < window.innerHeight && box.bottom > 0) el.classList.add("is-visible");
    });
  });

  // Only an explicit user switch is persisted / reflected in the URL, so a fresh
  // visit always falls back to the English default.
  if (persist) {
    try { localStorage.setItem(langStorageKey, normalized); } catch (_) { /* storage disabled */ }
    const url = new URL(window.location.href);
    if (normalized === "en") url.searchParams.set("lang", "en");
    else url.searchParams.delete("lang");
    history.replaceState(null, "", url);
  }
};

if (langPanels.length || i18nNodes.length) {
  const queryLang = new URLSearchParams(window.location.search).get("lang");
  let savedLang = null;
  try { savedLang = localStorage.getItem(langStorageKey); } catch (_) { /* storage disabled */ }
  applyLang(queryLang || savedLang || "en", { persist: false });
  document.querySelector("[data-lang-switch]")?.addEventListener("click", () => {
    applyLang(currentLang() === "en" ? "zh" : "en");
  });
}
// Remove the pre-paint guard added by the inline head script (Chinese visitors).
document.documentElement.classList.remove("lang-pending");

/* ---------- Header, mobile menu, reveal, hero tilt ---------- */
const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-toggle]");
const navigation = document.querySelector("[data-nav]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const menuLabel = () => currentLang() === "en" ? "Close menu" : "关闭导航";
const menuOpenLabel = () => currentLang() === "en" ? "Open menu" : "打开导航";

const updateHeader = () => {
  if (header) header.classList.toggle("scrolled", window.scrollY > 12);
};

const closeMenu = () => {
  if (!menuButton || !navigation) return;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", menuOpenLabel());
  navigation.classList.remove("open");
  header?.classList.remove("menu-active");
  document.body.classList.remove("menu-open");
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    menuButton.setAttribute("aria-label", isOpen ? menuOpenLabel() : menuLabel());
    navigation.classList.toggle("open", !isOpen);
    header?.classList.toggle("menu-active", !isOpen);
    document.body.classList.toggle("menu-open", !isOpen);
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) closeMenu();
  });
}

const revealItems = document.querySelectorAll("[data-reveal]");
if (reduceMotion.matches || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

  revealItems.forEach((item) => revealObserver.observe(item));
}

const heroPhone = document.querySelector("[data-tilt]");
if (heroPhone && !reduceMotion.matches && window.matchMedia("(pointer: fine)").matches) {
  const stage = heroPhone.closest(".hero-stage");
  stage?.addEventListener("pointermove", (event) => {
    const bounds = stage.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    heroPhone.style.transform = `translateX(-50%) rotateY(${x * 3}deg) rotateX(${y * -2}deg)`;
  });
  stage?.addEventListener("pointerleave", () => {
    heroPhone.style.transform = "translateX(-50%)";
  });
}
