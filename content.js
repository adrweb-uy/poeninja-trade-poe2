/**
 * content.js — poe.ninja → POE2 Trade Extension
 */

const EXTENSION_TAG = 'poe-trade-btn';

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function findActiveTooltip(slotEl) {
  const descId = slotEl.getAttribute('aria-describedby');
  if (descId) {
    const el = document.getElementById(descId);
    if (el) return el;
  }
  const radix = document.querySelector(
    '[data-radix-tooltip-content][data-state="delayed-open"],' +
    '[data-radix-tooltip-content][data-state="instant-open"]'
  );
  if (radix) return radix;
  const role = Array.from(document.querySelectorAll('[role="tooltip"]')).find(e => e.offsetParent);
  if (role) return role;
  for (const p of document.querySelectorAll('[data-radix-popper-content-wrapper]')) {
    if (p.offsetWidth > 0) return p;
  }
  console.warn('[poe-trade] ⚠ No tooltip. Hacé hover primero.');
  return null;
}

/**
 * Clasifica el color de un elemento para identificar el tipo de mod:
 *   orange/amber → único (R alto, G<160, B<80)
 *   yellow       → explícito raro (R>180, G>180, B<120)
 *   blue         → implícito/encantamiento (B>150, R<150)
 */
function classifyModColor(el) {
  if (!el) return 'unknown';
  const color = window.getComputedStyle(el).color;
  const m = color.match(/\d+/g);
  if (!m || m.length < 3) return 'unknown';
  const [r, g, b] = m.map(Number);
  if (r > 140 && g < 160 && b < 80)  return 'unique';   // naranja = único
  if (r > 180 && g > 180 && b < 120) return 'explicit'; // amarillo = explícito
  if (b > 150 && r < 150)            return 'implicit'; // azul = implícito
  return 'white';
}

function isUniqueByColor(el) {
  return classifyModColor(el) === 'unique';
}

// ─── Extracción ───────────────────────────────────────────────────────────────

function extractItemInfoFromSlot(slotEl) {
  const tooltipEl = findActiveTooltip(slotEl);
  if (!tooltipEl) return null;

  const walker = document.createTreeWalker(tooltipEl, NodeFilter.SHOW_TEXT);
  const entries = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const tag = node.parentElement?.tagName.toLowerCase() || '';
    if (['script', 'style', 'svg', 'path', 'circle', 'line'].includes(tag)) continue;
    const t = node.textContent.trim();
    if (t.length > 1) entries.push({ text: t, el: node.parentElement });
  }

  const texts = entries.map(e => e.text);
  console.log('[poe-trade] textos tooltip:', texts.slice(0, 20));

  const itemName = texts[0] || '';
  const itemType = texts[1] || '';
  const isUnique = isUniqueByColor(entries[0]?.el || null);

  const gridArea = (slotEl.getAttribute('style') || '').match(/grid-area:\s*([^;]+)/);
  const slotArea = gridArea ? gridArea[1].trim() : 'Unknown';

  // ─ Extraer iLvl, Quality usando el texto completo para evitar nodos separados ──
  const fullText = tooltipEl.innerText || tooltipEl.textContent || '';
  
  let ilvl = null;
  const ilvlM = fullText.match(/Item Level:\s*(\d+)/i);
  if (ilvlM) ilvl = parseInt(ilvlM[1]);

  let quality = null;
  const qualM = fullText.match(/Quality:\s*\+?(\d+)%/i);
  if (qualM) quality = parseInt(qualM[1]);

  const statMods = [];

  for (const { text, el } of entries) {
    // Ya extrajimos ilvl y quality del texto completo, podemos ignorarlos acá si aparecen
    if (/^Item Level:/i.test(text) || /^Quality:/i.test(text) || /^\+?\d+%?$/.test(text)) continue;

    // Ignorar líneas de requerimientos
    if (/^Requires:/i.test(text)) continue;
    // Ignorar líneas genéricas que no son stats
    if (/^(Weapon|Armour|Flask|Jewel|Equipment|Item|Rarity|Dueling Wand|Wand|One Handed Mace|Two Handed Mace|Bow|Crossbow|Quarterstaff)$/i.test(text)) continue;

    // Stat mods: líneas con color clasificado y que contengan números
    const modType = classifyModColor(el);
    const isStatLine = (modType === 'explicit' || modType === 'implicit' ||
                        (isUnique && modType === 'unique'));
    if (isStatLine && /\d/.test(text)) {
      statMods.push({ text, modType });
    }
  }

  console.log('[poe-trade] extracción:', { itemName, itemType, isUnique, ilvl, quality, statMods });
  return { itemName, itemType, slotArea, isUnique, ilvl, quality, statMods };
}

// ─── Config ──────────────────────────────────────────────────────────────────

async function getConfig() {
  return new Promise(resolve =>
    chrome.storage.sync.get(
      { league: 'Fate of the Vaal', listingType: 'securable', searchMode: 'name', autoOpen: true, autoFilters: true },
      resolve
    )
  );
}

// ─── Botón ───────────────────────────────────────────────────────────────────

function setButtonState(btn, state, msg) {
  btn.classList.remove(`${EXTENSION_TAG}--loading`, `${EXTENSION_TAG}--error`, `${EXTENSION_TAG}--success`);
  if (state) btn.classList.add(`${EXTENSION_TAG}--${state}`);
  if (msg) btn.title = msg;
}

function createSearchButton(slotEl) {
  const btn = document.createElement('button');
  btn.className = EXTENSION_TAG;
  btn.title = 'Buscar en POE2 Trade';
  btn.setAttribute('aria-label', 'Buscar ítem en POE2 Trade');
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`;

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();

    const info = extractItemInfoFromSlot(slotEl);
    const config = await getConfig();

    if (!info || (!info.itemName && !info.itemType)) {
      setButtonState(btn, 'error', 'No se pudo leer el ítem. Hacé hover primero.');
      setTimeout(() => setButtonState(btn, null, 'Buscar en POE2 Trade'), 2500);
      return;
    }

    setButtonState(btn, 'loading', 'Buscando...');

    chrome.runtime.sendMessage(
      {
        action: 'searchItem',
        itemName:    info.itemName,
        itemType:    info.itemType,
        isUnique:    info.isUnique,
        ilvl:        info.ilvl,
        quality:     info.quality,
        statMods:    config.autoFilters ? info.statMods : [],
        league:      config.league,
        listingType: config.listingType,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('[poe-trade] runtime error:', chrome.runtime.lastError.message);
          setButtonState(btn, 'error', 'Error de extensión. Recargá la página.');
          setTimeout(() => setButtonState(btn, null, 'Buscar en POE2 Trade'), 4000);
          return;
        }
        if (response?.error) {
          console.error('[poe-trade] ❌ Error API:', response.error);
          setButtonState(btn, 'error', `Error: ${response.error}`);
          setTimeout(() => setButtonState(btn, null, 'Buscar en POE2 Trade'), 4000);
        } else {
          console.log('[poe-trade] ✅ OK:', response?.url);
          setButtonState(btn, 'success');
          setTimeout(() => setButtonState(btn, null, 'Buscar en POE2 Trade'), 1500);
        }
      }
    );
  });

  return btn;
}

// ─── Inyección ───────────────────────────────────────────────────────────────

function isEquipmentSlot(el) {
  if (el.nodeType !== Node.ELEMENT_NODE) return false;
  if (el.getAttribute('data-tooltip-trigger') !== 'true') return false;
  return /grid-area:\s*(Weapon|Helmet|BodyArmour|Gloves|Boots|Amulet|Ring|Ring2|Belt|Offhand|Flask\d*)/i
    .test(el.getAttribute('style') || '');
}

function injectButtonIntoSlot(slotEl) {
  if (slotEl.querySelector(`.${EXTENSION_TAG}`)) return;
  if (getComputedStyle(slotEl).position === 'static') slotEl.style.position = 'relative';
  slotEl.appendChild(createSearchButton(slotEl));
}

function scanAndInject() {
  document.querySelectorAll('[data-tooltip-trigger="true"]').forEach(el => {
    if (isEquipmentSlot(el)) injectButtonIntoSlot(el);
  });
}

// ─── Observer ────────────────────────────────────────────────────────────────

let scanTimeout = null;
new MutationObserver((mutations) => {
  for (const m of mutations) {
    if ((m.type === 'childList' && m.addedNodes.length) || m.type === 'attributes') {
      clearTimeout(scanTimeout);
      scanTimeout = setTimeout(scanAndInject, 300);
      break;
    }
  }
}).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-tooltip-trigger', 'style'] });

scanAndInject();

let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) { lastUrl = location.href; setTimeout(scanAndInject, 800); }
}).observe(document, { subtree: true, childList: true });
