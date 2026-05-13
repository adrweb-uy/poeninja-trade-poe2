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

  const cls = (el.className || '').toLowerCase();
  if (cls.includes('fractured') || cls.includes('poe-fractured')) return 'fractured';
  if (cls.includes('explicit') || cls.includes('poe-rare')) return 'explicit';
  if (cls.includes('implicit') || cls.includes('poe-magic')) return 'implicit';
  if (cls.includes('unique') || cls.includes('poe-unique')) return 'unique';
  if (cls.includes('crafted') || cls.includes('poe-crafted')) return 'crafted';

  const color = window.getComputedStyle(el).color;
  const m = color.match(/\d+/g);
  if (!m || m.length < 3) return 'unknown';
  const [r, g, b] = m.map(Number);

  // Naranja/Unico
  if (r > 140 && g < 130 && b < 80) return 'unique';
  
  // Fractured (dorado/marrón: ej rgb(162, 145, 96))
  if (r > 140 && r < 190 && g > 120 && g < 170 && b < 120) return 'fractured';
  
  // Amarillo/Explicito (suele ser r>160, g>160, b más bajo, pero en POE2 a veces es rgb(210, 210, 150))
  if (r > 150 && g > 150 && b < 180) return 'explicit';
  
  // Azul/Implicito (Runas, Skills, Implicits)
  if (b > 150 && r < 150 && g < 180) return 'implicit';
  
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
  console.log('[poe-trade] textos tooltip:', texts);

  const itemName = texts[0] || '';
  const itemType = texts[1] || '';
  const isUnique = isUniqueByColor(entries[0]?.el || null);

  const gridArea = (slotEl.getAttribute('style') || '').match(/grid-area:\s*([^;]+)/);
  const slotArea = gridArea ? gridArea[1].trim() : 'Unknown';

  // ─ Extraer iLvl, Quality usando el texto completo para evitar nodos separados ──
  const fullText = tooltipEl.innerText || tooltipEl.textContent || '';
  
  // ─ Extraer Sockets del slotEl ──
  const runeSockets = slotEl.querySelectorAll('div[style*="socketSlot-"]').length;

  let ilvl = null;
  const ilvlM = fullText.match(/Item Level:\s*(\d+)/i);
  if (ilvlM) ilvl = parseInt(ilvlM[1]);

  let quality = null;
  const qualM = fullText.match(/Quality:\s*\+?(\d+)%/i);
  if (qualM) quality = parseInt(qualM[1]);

  let reqLvl = null, reqStr = null, reqDex = null, reqInt = null;
  const reqM = fullText.match(/Requires:\s*([^\n]+)/i);
  if (reqM) {
    const reqText = reqM[1];
    const lvlM = reqText.match(/Level\s*(\d+)/i);
    if (lvlM) reqLvl = parseInt(lvlM[1]);
    const strM = reqText.match(/(\d+)\s*Str/i);
    if (strM) reqStr = parseInt(strM[1]);
    const dexM = reqText.match(/(\d+)\s*Dex/i);
    if (dexM) reqDex = parseInt(dexM[1]);
    const intM = reqText.match(/(\d+)\s*Int/i);
    if (intM) reqInt = parseInt(intM[1]);
  }

  const statWalker = document.createTreeWalker(tooltipEl, NodeFilter.SHOW_ALL);
  const rawLines = [];
  let currentLineText = '';
  let currentLineColorNode = null;

  while (statWalker.nextNode()) {
    const node = statWalker.currentNode;
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      if (['script', 'style', 'svg', 'path', 'circle', 'line'].includes(tag)) continue;
      
      // Elementos que cortan la línea
      if (['br', 'div', 'p', 'li'].includes(tag)) {
        if (currentLineText.trim()) {
          rawLines.push({ text: currentLineText, el: currentLineColorNode });
        }
        currentLineText = '';
        currentLineColorNode = null;
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const parentTag = node.parentElement?.tagName.toLowerCase() || '';
      if (['script', 'style', 'svg', 'path', 'circle', 'line'].includes(parentTag)) continue;
      
      const t = node.textContent;
      if (t.trim()) {
        // Agregamos un espacio para evitar que "Spell" y "Skills" se peguen sin espacios intermedios
        currentLineText += " " + t;
        if (!currentLineColorNode) {
          // Usa el contenedor principal de la línea para el color, no el span del número (que suele ser blanco)
          currentLineColorNode = node.parentElement.closest('div, p, li') || node.parentElement;
        }
      }
    }
  }
  if (currentLineText.trim()) {
    rawLines.push({ text: currentLineText, el: currentLineColorNode });
  }

  const statMods = [];

  for (const { text: rawText, el } of rawLines) {
    const text = rawText.trim().replace(/\s+/g, ' ');
    if (!text || !/\d/.test(text)) continue;

    if (/^Item Level:/i.test(text) || /^Quality:/i.test(text) || /^\+?\d+%?$/.test(text)) continue;
    if (/^Requires:/i.test(text)) continue;
    if (/^(Weapon|Armour|Flask|Jewel|Equipment|Item|Rarity|Dueling Wand|Wand|One Handed Mace|Two Handed Mace|Bow|Crossbow|Quarterstaff)$/i.test(text)) continue;
    if (/^(Physical Damage|Fire Damage|Cold Damage|Lightning Damage|Chaos Damage|Elemental Damage|Critical Hit Chance|Attacks per Second|Armour|Evasion Rating|Energy Shield|Block Chance|Spirit|Reload Time):/i.test(text)) continue;

    const modType = classifyModColor(el);
    const isStatLine = (modType === 'explicit' || modType === 'implicit' || modType === 'white' || modType === 'fractured' ||
                        (isUnique && modType === 'unique'));
    
    if (isStatLine) {
      statMods.push({ text, modType });
    }
  }

  console.log('[poe-trade] statMods extraidos:', JSON.stringify(statMods));
  console.log('[poe-trade] extracción final:', { itemName, itemType, isUnique, ilvl, quality, reqLvl, reqStr, reqDex, reqInt, runeSockets });
  return { itemName, itemType, slotArea, isUnique, ilvl, quality, reqLvl, reqStr, reqDex, reqInt, runeSockets, statMods };
}

// ─── Config ──────────────────────────────────────────────────────────────────

async function getConfig() {
  return new Promise(resolve =>
    chrome.storage.sync.get(
      { league: 'Fate of the Vaal', listingType: 'securable', searchMode: 'name', autoOpen: true, autoFilters: true, tradeLanguage: 'en' },
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
        itemName:      info.itemName,
        itemType:      info.itemType,
        isUnique:      info.isUnique,
        ilvl:          info.ilvl,
        quality:       info.quality,
        reqLvl:        info.reqLvl,
        reqStr:        info.reqStr,
        reqDex:        info.reqDex,
        reqInt:        info.reqInt,
        runeSockets:   info.runeSockets,
        statMods:      config.autoFilters ? info.statMods : [],
        league:        config.league,
        listingType:   config.listingType,
        searchMode:    config.searchMode,
        tradeLanguage: config.tradeLanguage,
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

// Grid-areas que el elemento puede tener directamente (equipamiento normal)
const DIRECT_SLOT_AREAS = /grid-area:\s*(Weapon|Helm|BodyArmour|Gloves|Boots|Amulet|Ring|Ring2|Ring3|Belt|Offhand)/i;

// Grid-areas que solo aparecen en el CONTENEDOR PADRE (frascos y charms individuales)
const CONTAINER_SLOT_AREAS = /grid-area:\s*(Flask\d*|Flasks|LifeFlask|ManaFlask|Charms)/i;

function isEquipmentSlot(el) {
  if (el.nodeType !== Node.ELEMENT_NODE) return false;
  if (el.getAttribute('data-tooltip-trigger') !== 'true') return false;

  // Verifica el propio elemento (equipamiento normal: Boots, Helm, etc.)
  if (DIRECT_SLOT_AREAS.test(el.getAttribute('style') || '')) return true;

  // Para Frascos y Charms: buscar SOLO grid-areas de contenedor en ancestros
  // (NO buscar equipamiento normal para no capturar gemas/sockets dentro de items)
  let ancestor = el.parentElement;
  for (let i = 0; i < 3 && ancestor; i++) {
    if (CONTAINER_SLOT_AREAS.test(ancestor.getAttribute('style') || '')) return true;
    ancestor = ancestor.parentElement;
  }

  return false;
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
