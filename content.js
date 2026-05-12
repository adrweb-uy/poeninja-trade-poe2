/**
 * content.js — poe.ninja → POE2 Trade Extension
 *
 * Inyecta un botón de búsqueda en cada slot de equipamiento de poe.ninja.
 * Detecta los ítems con MutationObserver (el sitio es Astro/SPA).
 */

const EXTENSION_TAG = 'poe-trade-btn';

// ─── Utilidades ─────────────────────────────────────────────────────────────

/**
 * Extrae el nombre e info del ítem desde el tooltip del DOM.
 * Los tooltips en poe.ninja están fuera del slot pero referenciados por
 * data-tooltip-id / aria-describedby.
 */
function extractItemInfoFromSlot(slotEl) {
  // Método 1: leer desde el tooltip flotante si está en el DOM
  const tooltipId = slotEl.getAttribute('aria-describedby')
    || slotEl.getAttribute('data-tooltip-id');

  let tooltipEl = tooltipId ? document.getElementById(tooltipId) : null;

  // Método 2: buscar tooltip por data-tooltip-id en cualquier parte del doc
  if (!tooltipEl && tooltipId) {
    tooltipEl = document.querySelector(`[data-tooltip-id="${tooltipId}"]`);
  }

  // Método 3: buscar tooltip que sea hermano o ancestro cercano
  if (!tooltipEl) {
    tooltipEl = slotEl.closest('[data-tooltip]')
      || slotEl.parentElement?.querySelector('[data-tooltip-content]');
  }

  let itemName = '';
  let itemType = '';

  if (tooltipEl) {
    // El nombre del ítem suele estar en un elemento con texto amarillo/dorado
    // o en el primer elemento de texto prominente del tooltip
    const nameEl = tooltipEl.querySelector(
      'h1, h2, h3, [class*="name"], [class*="item-name"], [class*="itemName"]'
    );
    if (nameEl) {
      itemName = nameEl.textContent.trim();
    }

    // El tipo base suele ser la segunda línea del tooltip
    const typeEl = tooltipEl.querySelector(
      '[class*="type"], [class*="base"], [class*="basetype"]'
    );
    if (typeEl) {
      itemType = typeEl.textContent.trim();
    }

    // Fallback: tomar los primeros dos textos del tooltip
    if (!itemName) {
      const textNodes = Array.from(tooltipEl.querySelectorAll('span, div, p'))
        .filter(el => el.children.length === 0 && el.textContent.trim().length > 0)
        .slice(0, 2);
      if (textNodes[0]) itemName = textNodes[0].textContent.trim();
      if (textNodes[1]) itemType = textNodes[1].textContent.trim();
    }
  }

  // Leer grid-area del slot para saber qué ranura es
  const style = slotEl.getAttribute('style') || '';
  const gridAreaMatch = style.match(/grid-area:\s*([^;]+)/);
  const slotArea = gridAreaMatch ? gridAreaMatch[1].trim() : 'Unknown';

  return { itemName, itemType, slotArea, tooltipId };
}

/**
 * Obtiene la configuración guardada del extension storage.
 */
async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      {
        league: 'Standard',
        searchMode: 'name', // 'name' | 'name+type'
        autoOpen: true,
      },
      (config) => resolve(config)
    );
  });
}

// ─── Botón de búsqueda ───────────────────────────────────────────────────────

function createSearchButton(slotEl) {
  const btn = document.createElement('button');
  btn.className = EXTENSION_TAG;
  btn.setAttribute('data-poe-slot', slotEl.style?.gridArea || '');
  btn.title = 'Buscar en POE2 Trade';
  btn.setAttribute('aria-label', 'Buscar ítem en POE2 Trade');

  // SVG lupa como ícono
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="7"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  `;

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();

    const info = extractItemInfoFromSlot(slotEl);
    const config = await getConfig();

    if (!info.itemName) {
      // Mostrar feedback visual de error
      btn.classList.add(`${EXTENSION_TAG}--error`);
      btn.title = 'No se pudo leer el nombre del ítem. Hover sobre el ítem primero.';
      setTimeout(() => {
        btn.classList.remove(`${EXTENSION_TAG}--error`);
        btn.title = 'Buscar en POE2 Trade';
      }, 2000);
      return;
    }

    // Animar botón como "cargando"
    btn.classList.add(`${EXTENSION_TAG}--loading`);

    try {
      // Enviar al background script para hacer el POST a la API de trade
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
            setTimeout(() => {
              btn.classList.remove(`${EXTENSION_TAG}--success`);
            }, 1500);
          }
        }
      );
    } catch (err) {
      btn.classList.remove(`${EXTENSION_TAG}--loading`);
      console.error('[poe-trade] Error al enviar mensaje:', err);
    }
  });

  return btn;
}

// ─── Detección e inyección ───────────────────────────────────────────────────

/**
 * Comprueba si un elemento es un slot de equipamiento de poe.ninja.
 * Se basa en los atributos del div que el usuario nos pasó como referencia:
 *  - data-tooltip-trigger="true"
 *  - grid-area en el style (indica que es un slot de equipo)
 */
function isEquipmentSlot(el) {
  if (el.nodeType !== Node.ELEMENT_NODE) return false;
  if (el.getAttribute('data-tooltip-trigger') !== 'true') return false;

  const style = el.getAttribute('style') || '';
  // Tiene grid-area con nombre de slot de equipo (Weapon, Helmet, Chest, etc.)
  const hasGridArea = /grid-area:\s*(Weapon|Helmet|BodyArmour|Gloves|Boots|Amulet|Ring|Ring2|Belt|Offhand|Flask\d*)/i.test(style);

  return hasGridArea;
}

/**
 * Inyecta el botón en un slot si aún no lo tiene.
 */
function injectButtonIntoSlot(slotEl) {
  // Evitar inyección duplicada
  if (slotEl.querySelector(`.${EXTENSION_TAG}`)) return;

  // El slot debe ser position: relative para que el botón absoluto funcione
  if (getComputedStyle(slotEl).position === 'static') {
    slotEl.style.position = 'relative';
  }

  const btn = createSearchButton(slotEl);
  slotEl.appendChild(btn);
}

/**
 * Escanea todo el documento en busca de slots de equipamiento.
 */
function scanAndInject() {
  const candidates = document.querySelectorAll('[data-tooltip-trigger="true"]');
  candidates.forEach((el) => {
    if (isEquipmentSlot(el)) {
      injectButtonIntoSlot(el);
    }
  });
}

// ─── MutationObserver (SPA) ──────────────────────────────────────────────────

let scanTimeout = null;

function scheduleScan() {
  clearTimeout(scanTimeout);
  scanTimeout = setTimeout(scanAndInject, 300);
}

const observer = new MutationObserver((mutations) => {
  let shouldScan = false;

  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      shouldScan = true;
      break;
    }
    if (
      mutation.type === 'attributes' &&
      (mutation.attributeName === 'data-tooltip-trigger' ||
        mutation.attributeName === 'style')
    ) {
      shouldScan = true;
      break;
    }
  }

  if (shouldScan) scheduleScan();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['data-tooltip-trigger', 'style'],
});

// Escaneo inicial
scanAndInject();

// Re-escanear en cambios de URL (navegación SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(scanAndInject, 800);
  }
}).observe(document, { subtree: true, childList: true });
