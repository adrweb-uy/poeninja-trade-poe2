/**
 * popup.js — Extension Popup Logic
 */

const POE2_LEAGUES_API  = 'https://www.pathofexile.com/api/trade2/data/leagues';
const LEAGUES_CACHE_TTL = 3_600_000; // 1 hora en ms

const leagueSelect         = document.getElementById('league');
const listingTypeSelect    = document.getElementById('listingType');
const tradeLanguageSelect  = document.getElementById('tradeLanguage');
const modeNameInput        = document.getElementById('mode-name');
const modeOnlyTypeInput    = document.getElementById('mode-onlytype');
const autoOpenInput        = document.getElementById('autoOpen');
const autoFiltersInput     = document.getElementById('autoFilters');
const statusMsg            = document.getElementById('status-msg');
const versionDisplay       = document.getElementById('version-display');

// ─── Versión ─────────────────────────────────────────────────────────────────

if (versionDisplay) {
  versionDisplay.textContent = (typeof APP_VERSION !== 'undefined')
    ? APP_VERSION
    : `v${chrome.runtime.getManifest().version}`;
}

// ─── Ligas dinámicas ─────────────────────────────────────────────────────────

/**
 * Carga las ligas activas desde la API de GGG.
 * Usa caché en chrome.storage.local para no hacer un request en cada apertura del popup.
 * Si la API falla, carga una lista de emergencia hardcodeada.
 */
async function loadLeagues(savedLeague) {
  const FALLBACK_LEAGUES = ['Standard', 'Hardcore'];

  try {
    // Intentar leer del caché primero
    const cache = await new Promise(resolve =>
      chrome.storage.local.get(['leaguesCache', 'leaguesCachedAt'], resolve)
    );

    const now = Date.now();
    const isCacheValid = cache.leaguesCache &&
                         cache.leaguesCachedAt &&
                         (now - cache.leaguesCachedAt) < LEAGUES_CACHE_TTL;

    let leagues;

    if (isCacheValid) {
      console.log('[poe-trade popup] Ligas desde caché');
      leagues = cache.leaguesCache;
    } else {
      console.log('[poe-trade popup] Descargando ligas desde API...');
      const resp = await fetch(POE2_LEAGUES_API);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      // La API devuelve: { result: [{ id: "Fate of the Vaal", text: "Fate of the Vaal" }, ...] }
      leagues = (data.result || []).map(l => l.id || l.text || l);

      // Guardar en caché
      chrome.storage.local.set({ leaguesCache: leagues, leaguesCachedAt: now });
      console.log('[poe-trade popup] Ligas guardadas en caché:', leagues);
    }

    populateLeagueSelect(leagues, savedLeague);

  } catch (err) {
    console.warn('[poe-trade popup] Error cargando ligas, usando fallback:', err.message);
    populateLeagueSelect(FALLBACK_LEAGUES, savedLeague);
  }
}

/**
 * Rellena el <select> de ligas con las opciones recibidas.
 * Restaura la liga guardada si sigue estando disponible.
 */
function populateLeagueSelect(leagues, savedLeague) {
  leagueSelect.innerHTML = '';

  for (const league of leagues) {
    const opt = document.createElement('option');
    opt.value = league;
    opt.textContent = league;
    leagueSelect.appendChild(opt);
  }

  // Restaurar la liga guardada si sigue existiendo; si no, usar la primera
  if (savedLeague && leagues.includes(savedLeague)) {
    leagueSelect.value = savedLeague;
  } else if (leagues.length > 0) {
    leagueSelect.value = leagues[0];
    // Guardar el nuevo valor automáticamente si cambió
    saveConfig();
  }
}

// ─── Configuración ───────────────────────────────────────────────────────────

chrome.storage.sync.get(
  {
    league:        'Fate of the Vaal',
    listingType:   'securable',
    searchMode:    'only_type',
    autoOpen:      true,
    autoFilters:   true,
    tradeLanguage: 'en',
  },
  (config) => {
    // Cargar ligas dinámicamente (pasa la liga guardada para restaurarla)
    loadLeagues(config.league);

    listingTypeSelect.value   = config.listingType;
    tradeLanguageSelect.value = config.tradeLanguage;

    if (config.searchMode === 'only_type') {
      modeOnlyTypeInput.checked = true;
    } else {
      modeNameInput.checked = true;
    }

    autoOpenInput.checked    = config.autoOpen;
    autoFiltersInput.checked = config.autoFilters;
  }
);

// ─── Guardado ────────────────────────────────────────────────────────────────

function saveConfig() {
  const config = {
    league:        leagueSelect.value,
    listingType:   listingTypeSelect.value,
    tradeLanguage: tradeLanguageSelect.value,
    searchMode:    document.querySelector('input[name="searchMode"]:checked')?.value || 'only_type',
    autoOpen:      autoOpenInput.checked,
    autoFilters:   autoFiltersInput.checked,
  };
  chrome.storage.sync.set(config, () => showStatus('✓ Guardado', 'success'));
}

function showStatus(text, type = 'info') {
  statusMsg.textContent = text;
  statusMsg.className = `status-msg status-msg--${type}`;
  statusMsg.style.opacity = '1';
  setTimeout(() => {
    statusMsg.style.opacity = '0';
    setTimeout(() => { statusMsg.textContent = ''; }, 300);
  }, 1500);
}

leagueSelect.addEventListener('change', saveConfig);
listingTypeSelect.addEventListener('change', saveConfig);
tradeLanguageSelect.addEventListener('change', saveConfig);
modeNameInput.addEventListener('change', saveConfig);
if (modeOnlyTypeInput) modeOnlyTypeInput.addEventListener('change', saveConfig);
autoOpenInput.addEventListener('change', saveConfig);
autoFiltersInput.addEventListener('change', saveConfig);
