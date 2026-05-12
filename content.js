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
 * Detección de único por color del nombre en el tooltip de poe.ninja:
 *   Único → naranja/ámbar: rgb(177, 98, 37)  → R alto, G<160, B<80
 *   Raro  → amarillo:      rgb(255, 255, 117) → R alto, G alto, B bajo (NO único)
 *   Mágico→ azul:          R bajo, B alto
 */
function isUniqueByColor(el) {
  if (!el) return false;
  const color = window.getComputedStyle(el).color;
  const m = color.match(/\d+/g);
  if (!m) return false;
  const [r, g, b] = m.map(Number);
  // Solo naranja/ámbar = único. Amarillo (rare) queda excluido porque G > 160.
  const isUnique = r > 140 && g < 160 && b < 80;
  console.log('[poe-trade] color nombre:', color, '→ isUnique:', isUnique);
  return isUnique;
}

function extractItemInfoFromSlot(slotEl) {
  const tooltipEl = findActiveTooltip(slotEl);
  if (!tooltipEl) return { itemName: '', itemType: '', slotArea: '', isUnique: false };

  // TreeWalker captura TODOS los nodos de texto (incluyendo no-hojas)
  // Esto encuentra "Dueling Wand" que el filtro de hojas perdía
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
  console.log('[poe-trade] textos (TreeWalker):', texts.slice(0, 12));

  const itemName = texts[0] || '';
  const itemType = texts[1] || '';  // Ahora debería ser "Dueling Wand"
  const isUnique = isUniqueByColor(entries[0]?.el || null);

  const gridArea = (slotEl.getAttribute('style') || '').match(/grid-area:\s*([^;]+)/);
  const slotArea = gridArea ? gridArea[1].trim() : 'Unknown';

  console.log('[poe-trade] extracción:', { itemName, itemType, slotArea, isUnique });
  return { itemName, itemType, slotArea, isUnique };
}

// ─── Config ──────────────────────────────────────────────────────────────────

async function getConfig() {
  return new Promise(resolve =>
    chrome.storage.sync.get(
      { league: 'Fate of the Vaal', listingType: 'instant', searchMode: 'name', autoOpen: true },
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
    console.log('[poe-trade] enviando:', { info, league: config.league });

    if (!info.itemName && !info.itemType) {
      setButtonState(btn, 'error', 'No se pudo leer el ítem. Hacé hover primero.');
      setTimeout(() => setButtonState(btn, null, 'Buscar en POE2 Trade'), 2500);
      return;
    }

    setButtonState(btn, 'loading', 'Buscando...');

    chrome.runtime.sendMessage(
      { action: 'searchItem', itemName: info.itemName, itemType: info.itemType, isUnique: info.isUnique, league: config.league, listingType: config.listingType },
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
