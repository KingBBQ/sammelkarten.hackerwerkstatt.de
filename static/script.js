/* ═══════════════════════════════════════════════════════════
   Sammelkarten Generator – Client Logic
   ═══════════════════════════════════════════════════════════ */

const ELEMENT_EMOJIS = {
  Feuer: "🔥",
  Wasser: "💧",
  Pflanze: "🌿",
  Elektro: "⚡",
  Eis: "❄️",
  Kampf: "👊",
  Gift: "☠️",
  Psycho: "🔮",
  Drache: "🐉",
  Fee: "✨",
  Geist: "👻",
  Normal: "⬜",
};

// ── DOM refs ──────────────────────────────────────────────────
const form = document.getElementById("card-form");
const btnGenerate = document.getElementById("btn-generate");
const btnText = btnGenerate.querySelector(".btn-generate__text");
const btnLoader = btnGenerate.querySelector(".btn-generate__loader");

const cardEl = document.getElementById("pokemon-card");
const placeholderEl = document.getElementById("card-placeholder");

const cardName = document.getElementById("card-name");
const cardHp = document.getElementById("card-hp");
const cardElementBadge = document.getElementById("card-element-badge");
const cardImageFrame = document.getElementById("card-image-frame");
const cardImage = document.getElementById("card-image");
const cardImagePlaceholder = document.getElementById("card-image-placeholder");
const cardAttacks = document.getElementById("card-attacks");
const cardWeakness = document.getElementById("card-weakness");
const cardRetreat = document.getElementById("card-retreat");
const cardFlavor = document.getElementById("card-flavor");

// ── Toast helper ──────────────────────────────────────────────
let toastEl = null;

function showToast(message, duration = 4000) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  requestAnimationFrame(() => {
    toastEl.classList.add("show");
  });
  setTimeout(() => {
    toastEl.classList.remove("show");
  }, duration);
}

// ── Loading state ─────────────────────────────────────────────
function setLoading(loading) {
  btnGenerate.disabled = loading;
  btnText.hidden = loading;
  btnLoader.hidden = !loading;
}

// ── Render the card ───────────────────────────────────────────
function renderCard(data) {
  // Show card, hide placeholder
  cardEl.hidden = false;
  placeholderEl.hidden = true;

  // Element styling
  cardEl.setAttribute("data-element", data.element);
  cardElementBadge.textContent = ELEMENT_EMOJIS[data.element] || "⬜";

  // Header
  cardName.textContent = data.name;
  cardHp.textContent = `HP ${data.hp}`;

  // Image
  if (data.image_b64) {
    cardImage.src = `data:image/png;base64,${data.image_b64}`;
    cardImage.classList.add("loaded");
    cardImagePlaceholder.classList.add("hidden");
  } else {
    cardImage.classList.remove("loaded");
    cardImagePlaceholder.classList.remove("hidden");
    cardImagePlaceholder.querySelector("small").textContent =
      "Bild konnte nicht generiert werden";
  }

  // Attacks
  cardAttacks.innerHTML = "";

  const attacks = [
    {
      name: data.attack1_name,
      damage: data.attack1_damage,
      desc: data.attack1_description,
    },
    {
      name: data.attack2_name,
      damage: data.attack2_damage,
      desc: data.attack2_description,
    },
  ];

  for (const atk of attacks) {
    const div = document.createElement("div");
    div.className = "attack";
    div.innerHTML = `
      <div class="attack__info">
        <div class="attack__name">${escapeHtml(atk.name)}</div>
        <div class="attack__desc">${escapeHtml(atk.desc)}</div>
      </div>
      <div class="attack__damage">${atk.damage}</div>
    `;
    cardAttacks.appendChild(div);
  }

  // Footer
  cardWeakness.textContent = data.weakness || "–";
  cardRetreat.textContent = "⭐".repeat(data.retreat_cost || 1);

  // Flavor
  cardFlavor.textContent = data.flavor_text || "";

  // Re-trigger animation
  cardEl.style.animation = "none";
  // force reflow
  void cardEl.offsetHeight;
  cardEl.style.animation = "";
}

// ── Submit handler ────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setLoading(true);

  const payload = {
    name: form.name.value.trim(),
    element: form.element.value,
    description: form.description.value.trim(),
    special_ability: form.special_ability.value.trim(),
    weakness: form.weakness.value.trim(),
  };

  try {
    const res = await fetch("/generate_card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || `Server-Fehler (${res.status})`);
    }

    const data = await res.json();
    renderCard(data);
  } catch (err) {
    showToast(`Fehler: ${err.message}`);
    console.error(err);
  } finally {
    setLoading(false);
  }
});

// ── Utility ───────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
