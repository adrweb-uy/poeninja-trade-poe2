/**
 * background.js — Fetch a la API de trade2 + apertura de pestaña.
 * El background no tiene restricciones CORS gracias a host_permissions.
 */

const POE2_TRADE_API  = 'https://www.pathofexile.com/api/trade2/search/poe2';
const POE2_TRADE_URL  = 'https://www.pathofexile.com/trade2/search/poe2';
const POE2_STATS_API  = 'https://www.pathofexile.com/api/trade2/data/stats';

// ─── Cache de stats ───────────────────────────────────────────────────────────

let statsMap  = null;
let statsFetchedAt = 0;
const STATS_TTL = 3_600_000; // 1 hora

async function getStatsMap() {
  const now = Date.now();
  if (statsMap && (now - statsFetchedAt) < STATS_TTL) return statsMap;

  try {
    console.log('[poe-trade BG] Descargando stats list...');
    const resp = await fetch(POE2_STATS_API);
    if (!resp.ok) throw new Error(`Stats API ${resp.status}`);
    const data = await resp.json();

    statsMap = new Map();
    for (const group of (data.result || [])) {
      for (const entry of (group.entries || [])) {
        if (!entry.id || !entry.text) continue;
        const key = normalizeStatText(entry.text);
        const prefix = entry.id.split('.')[0];
        
        if (!statsMap.has(key)) statsMap.set(key, []);
        statsMap.get(key).push({ id: entry.id, prefix: prefix, label: group.label });
      }
    }
    statsFetchedAt = now;
    console.log('[poe-trade BG] Stats cargados:', statsMap.size, 'entradas únicas');
  } catch (err) {
    console.error('[poe-trade BG] Error cargando stats:', err.message);
    statsMap = statsMap || new Map(); // mantener cache anterior si falla
  }

  return statsMap;
}

// ─── Normalización ────────────────────────────────────────────────────────────

/**
 * Reemplaza todos los números (con o sin signo) por "#".
 * Ejemplo: "+73% increased Critical Hit Chance" → "+#% increased Critical Hit Chance"
 */
function normalizeStatText(text) {
  return text
    .replace(/(?<![a-zA-Z])[+-]?\d+(?:\.\d+)?/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Extrae el primer número de un texto de stat mod */
function extractValue(text) {
  const m = text.match(/[+-]?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

// ─── Matching stats ───────────────────────────────────────────────────────────

async function matchStatMods(statMods) {
  if (!statMods || statMods.length === 0) return [];

  const map = await getStatsMap();
  const results = [];

  for (const { text, modType } of statMods) {
    const key = normalizeStatText(text);
    const candidates = map.get(key);

    if (candidates && candidates.length > 0) {
      const rawValue = extractValue(text);
      const value    = rawValue !== null ? Math.abs(rawValue) : null;
      
      // Determine preferred prefix based on color/modType
      let preferredPrefix = 'explicit';
      if (modType === 'white') preferredPrefix = 'rune';
      if (modType === 'fractured') preferredPrefix = 'fractured';
      // Nota: En poe.ninja, los explicits suelen ser de color azul (implicit). 
      // Por defecto preferimos 'explicit' para ellos.
      
      let bestMatch = null;
      
      // Try exact prefix match first
      bestMatch = candidates.find(c => c.prefix === preferredPrefix);
      
      // Si era azul (implicit) y no existe como explicit, puede ser un skill, enchant o verdaderamente un implicit
      if (!bestMatch && modType === 'implicit') {
        bestMatch = candidates.find(c => ['skill', 'enchant', 'rune', 'implicit'].includes(c.prefix));
      }
      
      // Si era blanco (rune) y no existe como rune, puede ser skill o enchant
      if (!bestMatch && modType === 'white') {
        bestMatch = candidates.find(c => ['skill', 'enchant'].includes(c.prefix));
      }
      
      // Fallbacks
      if (!bestMatch) bestMatch = candidates.find(c => c.prefix === 'explicit'); // fallback to explicit
      if (!bestMatch) bestMatch = candidates.find(c => c.prefix !== 'fractured' && c.prefix !== 'desecrated'); 
      if (!bestMatch) bestMatch = candidates[0]; // ultimate fallback

      console.log('[poe-trade BG] ✅ Match:', text, '→', bestMatch.id, '| value:', value);
      results.push({ id: bestMatch.id, value, modType });
    } else {
      console.log('[poe-trade BG] ✗ Sin match:', text, '| key:', key);
    }
  }

  return results;
}

// ─── Builder del query ────────────────────────────────────────────────────────

const categoryMap = {
  wand: 'weapon.wand',
  sceptre: 'weapon.sceptre',
  staff: 'weapon.staff',
  bow: 'weapon.bow',
  crossbow: 'weapon.crossbow',
  dagger: 'weapon.dagger',
  sword: 'weapon.sword',
  axe: 'weapon.axe',
  mace: 'weapon.mace',
  flail: 'weapon.flail',
  spear: 'weapon.spear',
  focus: 'armour.focus',
  shield: 'armour.shield',
  quiver: 'armour.quiver',
  amulet: 'accessory.amulet',
  ring: 'accessory.ring',
  belt: 'accessory.belt',
  helmet: 'armour.helmet',
  hood: 'armour.helmet',
  circlet: 'armour.helmet',
  mask: 'armour.helmet',
  crown: 'armour.helmet',
  boots: 'armour.boots',
  shoes: 'armour.boots',
  greaves: 'armour.boots',
  gloves: 'armour.gloves',
  gauntlets: 'armour.gloves',
  mitts: 'armour.gloves',
  armour: 'armour.chest',
  garb: 'armour.chest',
  robe: 'armour.chest',
  vest: 'armour.chest',
  regalia: 'armour.chest',
  plate: 'armour.chest',
  chest: 'armour.chest'
};

function getCategoryFromType(itemType) {
  if (!itemType) return null;
  const words = itemType.toLowerCase().split(/\s+/);
  const lastWord = words[words.length - 1];
  return categoryMap[lastWord] || null;
}

async function buildQuery(itemName, itemType, isUnique, listingType, searchMode, ilvl, quality, reqLvl, reqStr, reqDex, reqInt, runeSockets, statMods) {
  const statusOption = listingType || 'securable';
  const query = { status: { option: statusOption } };

  query.filters = query.filters || {};
  const typeFilters = {};

  if (searchMode === 'only_type') {
    const cat = getCategoryFromType(itemType);
    if (cat) {
      typeFilters.category = { option: cat };
    } else {
      query.type = itemType; // fallback if category not found
    }
  } else {
    // Modo "name" (Solo nombre o Type si no es único) o "name+type"
    if (searchMode === 'name+type') {
      if (itemName) query.name = itemName;
      if (itemType) query.type = itemType;
    } else { // default 'name'
      if (isUnique && itemName) {
        query.name = itemName;
      } else {
        query.type = itemType;
      }
    }
  }

  // ── type_filters: iLvl y quality ──────────────────────────────────────────
  if (ilvl !== null && ilvl !== undefined) typeFilters.ilvl = { min: ilvl };
  if (quality !== null && quality !== undefined) typeFilters.quality = { min: quality };

  if (Object.keys(typeFilters).length > 0) {
    query.filters.type_filters = { filters: typeFilters };
  }

  // ── req_filters: lvl, str, dex, int ─────────────────────────────────────
  const reqFilters = {};
  if (reqLvl !== null && reqLvl !== undefined) reqFilters.lvl = { min: reqLvl };
  if (reqStr !== null && reqStr !== undefined) reqFilters.str = { min: reqStr };
  if (reqDex !== null && reqDex !== undefined) reqFilters.dex = { min: reqDex };
  if (reqInt !== null && reqInt !== undefined) reqFilters.int = { min: reqInt };

  if (Object.keys(reqFilters).length > 0) {
    query.filters.req_filters = { filters: reqFilters };
  }

  // ── equipment_filters: rune_sockets ─────────────────────────────────────
  if (runeSockets && runeSockets > 0) {
    query.filters.equipment_filters = { filters: { rune_sockets: { min: runeSockets } } };
  }

  // ── stat_filters: mods del item ───────────────────────────────────────────
  const matched = await matchStatMods(statMods);
  
  if (matched.length > 0) {
    query.stats = [{
      type: 'and',
      filters: matched.map(m => {
        return {
          id:       m.id,
          value:    m.value !== null ? { min: m.value } : {},
          disabled: false,
        };
      }),
    }];
  }

  if (Object.keys(query.filters).length === 0) {
    delete query.filters;
  }

  return query;
}

// ─── Fetch trade URL ──────────────────────────────────────────────────────────

async function fetchTradeUrl({ itemName, itemType, isUnique, league, listingType, searchMode, ilvl, quality, reqLvl, reqStr, reqDex, reqInt, runeSockets, statMods }) {
  const query   = await buildQuery(itemName, itemType, isUnique, listingType, searchMode, ilvl, quality, reqLvl, reqStr, reqDex, reqInt, runeSockets, statMods);
  const payload = { query, sort: { price: "asc" } };
  const url     = `${POE2_TRADE_API}/${encodeURIComponent(league)}`;

  console.log('[poe-trade BG] POST →', url);
  console.log('[poe-trade BG] payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  const text = await response.text();
  console.log('[poe-trade BG] status:', response.status, '| body:', text.slice(0, 300));

  if (!response.ok) throw new Error(`API ${response.status}: ${text}`);

  const data = JSON.parse(text);
  if (!data.id) throw new Error('La API no devolvió search ID');

  return `${POE2_TRADE_URL}/${encodeURIComponent(league)}/${data.id}`;
}

// ─── Message listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== 'searchItem') return false;

  fetchTradeUrl(message)
    .then((tradeUrl) => {
      console.log('[poe-trade BG] ✅ abriendo:', tradeUrl);
      chrome.tabs.create({ url: tradeUrl, active: true });
      sendResponse({ success: true, url: tradeUrl });
    })
    .catch((err) => {
      console.error('[poe-trade BG] ❌ Error:', err.message);
      sendResponse({ error: err.message });
    });

  return true; // canal async abierto
});

// Pre-cargar stats al arrancar para que la primera búsqueda sea rápida
getStatsMap();
