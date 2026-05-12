/**
 * popup.js — Extension Popup Logic
 */

const leagueSelect      = document.getElementById('league');
const listingTypeSelect = document.getElementById('listingType');
const modeNameInput     = document.getElementById('mode-name');
const modeTypeInput     = document.getElementById('mode-type');
const modeOnlyTypeInput = document.getElementById('mode-onlytype');
const autoOpenInput     = document.getElementById('autoOpen');
const autoFiltersInput  = document.getElementById('autoFilters');
const statusMsg         = document.getElementById('status-msg');
const githubLink        = document.getElementById('github-link');

githubLink.href = 'https://github.com/adrweb-uy/poeninja-trade-poe2';

chrome.storage.sync.get(
  { league: 'Fate of the Vaal', listingType: 'securable', searchMode: 'only_type', autoOpen: true, autoFilters: true },
  (config) => {
    leagueSelect.value      = config.league;
    listingTypeSelect.value = config.listingType;
    if (config.searchMode === 'only_type') {
      modeOnlyTypeInput.checked = true;
    } else if (config.searchMode === 'name+type') {
      modeTypeInput.checked = true;
    } else {
      modeNameInput.checked = true;
    }
    autoOpenInput.checked   = config.autoOpen;
    autoFiltersInput.checked= config.autoFilters;
  }
);

function saveConfig() {
  const config = {
    league:      leagueSelect.value,
    listingType: listingTypeSelect.value,
    searchMode:  document.querySelector('input[name="searchMode"]:checked')?.value || 'name',
    autoOpen:    autoOpenInput.checked,
    autoFilters: autoFiltersInput.checked,
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
modeNameInput.addEventListener('change', saveConfig);
modeTypeInput.addEventListener('change', saveConfig);
if (modeOnlyTypeInput) modeOnlyTypeInput.addEventListener('change', saveConfig);
autoOpenInput.addEventListener('change', saveConfig);
autoFiltersInput.addEventListener('change', saveConfig);
