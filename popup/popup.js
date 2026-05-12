/**
 * popup.js — Extension Popup Logic
 * Carga y guarda la configuración usando chrome.storage.sync
 */

const leagueSelect   = document.getElementById('league');
const modeNameInput  = document.getElementById('mode-name');
const modeTypeInput  = document.getElementById('mode-type');
const autoOpenInput  = document.getElementById('autoOpen');
const statusMsg      = document.getElementById('status-msg');
const githubLink     = document.getElementById('github-link');

// Actualizar link de GitHub con la URL real del repo
githubLink.href = 'https://github.com/Drian/poeninja-trade-poe2';

// ─── Cargar configuración guardada ──────────────────────────────────────────

chrome.storage.sync.get(
  {
    league:     'Fate of the Vaal',
    searchMode: 'name',
    autoOpen:   true,
  },
  (config) => {
    leagueSelect.value = config.league;
    if (config.searchMode === 'name+type') {
      modeTypeInput.checked = true;
    } else {
      modeNameInput.checked = true;
    }
    autoOpenInput.checked = config.autoOpen;
  }
);

// ─── Guardar configuración al cambiar ───────────────────────────────────────

function saveConfig() {
  const config = {
    league:     leagueSelect.value,
    searchMode: document.querySelector('input[name="searchMode"]:checked')?.value || 'name',
    autoOpen:   autoOpenInput.checked,
  };

  chrome.storage.sync.set(config, () => {
    showStatus('✓ Guardado', 'success');
  });
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

// Listeners
leagueSelect.addEventListener('change', saveConfig);
modeNameInput.addEventListener('change', saveConfig);
modeTypeInput.addEventListener('change', saveConfig);
autoOpenInput.addEventListener('change', saveConfig);
