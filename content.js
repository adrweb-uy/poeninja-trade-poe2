/**
 * content.js — poe.ninja → POE2 Trade Extension
 * Inyecta un botón de búsqueda en cada slot de equipamiento de poe.ninja.
 */

const EXTENSION_TAG = 'poe-trade-btn';

// ─── Extracción del tooltip ──────────────────────────────────────────────────

/**
 * Busca el tooltip visible en el DOM.
 * poe.ninja usa Radix UI → los tooltips son portales al final de <body>.
 */
function findActiveTooltip(slotEl) {
  // 1. Por aria-describedby (Radix asigna el id al portal)
  const descId = slotEl.getAttribute('aria-describedby');
  if (descId) {
    const el = document.getElementById(descId);
    if (el) {
      console.log('[poe-trade] tooltip por aria-describedby:', descId);
      return el;
    }
  }

  // 2. Radix state abierto
  const radixOpen = document.querySelector(
    '[data-radix-tooltip-content][data-state="delayed-open"],' +
    '[data-radix-tooltip-content][data-state="instant-open"]'
  );
  if (radixOpen) {
    console.log('[poe-trade] tooltip por radix data-state');
    return radixOpen;
  }

  // 3. role="tooltip" visible
  const roleTip = Array.from(document.querySelectorAll('[role="tooltip"]'))
    .find(el => el.offsetParent !== null);
  if (roleTip) {
    console.log('[poe-trade] tooltip por role=tooltip');
    return roleTip;
  }

  // 4. Popper wrapper de Radix
  for (const p of document.querySelectorAll('[data-radix-popper-content-wrapper]')) {
    if (p.offsetWidth > 0) {
      console.log('[poe-trade] tooltip por popper-content-wrapper');
      return p;
    }
  }

  console.warn('[poe-trade] No se encontró tooltip. Hacé hover sobre el ítem primero.');
  return null;
}

/**
 * Extrae nombre y tipo base del tooltip visible.
 * Loguea el contenido para facilitar debug.
 */
function parseItemFromTooltip(tooltipEl) {
  console.log('[poe-trade] tooltip HTML (500):', tooltipEl.innerHTML.slice(0, 500));

  const texts = Array.from(tooltipEl.querySelectorAll('*'))
    .filter(el =>
      el.children.length === 0 &&
      el.textContent.trim().length > 1 &&
      !['script','style','svg','path','circle','line'].includes(el.tagName.toLowerCase())
    )
    .map(el => el.textContent.trim());

  console.log('[poe-trade] textos encontrados:', texts.slice(0, 10));

  return { itemName: texts[0] || '', itemType: texts[1] || '' };
}

function extractItemInfoFromSlot(slotEl) {
  const tooltipEl = findActiveTooltip(slotEl);
  let itemName = '', itemType = '';

  if (tooltipEl) {
    ({ itemName, itemType } = parseItemFromTooltip(tooltipEl));
  }

  const gridAreaMatch = (slotEl.getAttribute('style') || '').match(/grid-area:\s*([^;]+)/);
  const slotArea = gridAreaMatch ? gridAreaMatch[1].trim() : 'Unknown';

  console.log('[poe-trade] extracción final:', { itemName, itemType, slotArea });
  return { itemName, itemType, slotArea };
}

// ─── Config ──────────────────────────────────────────────────────────────────

async function getConfig() {
  return new Promise(resolve =>
    chrome.storage.sync.get(
      { league: 'Fate of the Vaal', searchMode: 'name', autoOpen: true },
      resolve
    )
  );
}

// ─── Botón ───────────────────────────────────────────────────────────────────

function createSearchButton(slotEl) {
  const btn = document.createElement('button');
  btn.className = EXTENSION_TAG;
  btn.title = 'Buscar en POE2 Trade';
  btn.setAttribute('aria-label', 'Buscar ítem en POE2 Trade');
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="7"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>`;

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();

    const info = extractItemInfoFromSlot(slotEl);
    const config = await getConfig();

    console.log('[poe-trade] click → config:', config, '| info:', info);

    if (!info.itemName) {
      btn.classList.add(`${EXTENSION_TAG}--error`);
      btn.title = 'No se pudo leer el nombre. Hacé hover sobre el ítem primero.';
      setTimeout(() => {
        btn.classList.remove(`${EXTENSION_TAG}--error`);
        btn.title = 'Buscar en POE2 Trade';
      }, 2500);
      return;
    }

    btn.classList.add(`${EXTENSION_TAG}--loading`);

    chrome.runtime.sendMessage(
      {
        action: 'searchItem',
        itemName: info.itemName,
        itemType: config.searchMode === 'name+type' ? info.itemType : '',
        league: config.league,
        autoOpen: config.autoOpen,
      },
      (response) => {
        btn.classList.remove(`${EXTENSION_TAG}--loading`);
        if (response?.error) {
          btn.classList.add(`${EXTENSION_TAG}--error`);
          btn.title = `Error: ${response.error}`;
          setTimeout(() => {
            btn.classList.remove(`${EXTENSION_TAG}--error`);
            btn.title = 'Buscar en POE2 Trade';
          }, 3000);
        } else {
          btn.classList.add(`${EXTENSION_TAG}--success`);
          setTimeout(() => btn.classList.remove(`${EXTENSION_TAG}--success`), 1500);
        }
      }
    );
  });

  return btn;
}

// ─── Detección e inyección ───────────────────────────────────────────────────

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

// ─── MutationObserver (SPA) ──────────────────────────────────────────────────

let scanTimeout = null;
const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if ((m.type === 'childList' && m.addedNodes.length) || m.type === 'attributes') {
      clearTimeout(scanTimeout);
      scanTimeout = setTimeout(scanAndInject, 300);
      break;
    }
  }
});

observer.observe(document.body, {
  childList: true, subtree: true,
  attributes: true, attributeFilter: ['data-tooltip-trigger', 'style'],
});

scanAndInject();

// Re-escanear en navegación SPA
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(scanAndInject, 800);
  }
}).observe(document, { subtree: true, childList: true });
