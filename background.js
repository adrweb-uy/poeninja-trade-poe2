/**
 * background.js — Service Worker
 *
 * Recibe mensajes del content script y realiza el POST
 * a la API de Path of Exile 2 Trade para obtener un search ID,
 * luego abre la tab con los resultados.
 */

const POE2_TRADE_API = 'https://www.pathofexile.com/api/trade2/search';
const POE2_TRADE_URL = 'https://www.pathofexile.com/trade2/search';

/**
 * Construye el payload JSON para la búsqueda en el trade de POE2.
 */
function buildSearchPayload(itemName, itemType) {
  const query = {
    status: { option: 'online' },
  };

  if (itemName) {
    query.name = itemName;
  }

  if (itemType) {
    query.type = itemType;
  }

  return {
    query,
    sort: { price: 'asc' },
  };
}

/**
 * Hace el POST a la API de trade de POE2 y devuelve la URL de búsqueda.
 */
async function getTradeSearchUrl(itemName, itemType, league) {
  const payload = buildSearchPayload(itemName, itemType);
  const url = `${POE2_TRADE_API}/${encodeURIComponent(league)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // User-Agent requerido por la API de GGG
      'User-Agent': 'Chrome Extension poe.ninja-trade-poe2/0.1.0 (contact: extension)',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.status);
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (!data.id) {
    throw new Error('La API no devolvió un search ID');
  }

  return `${POE2_TRADE_URL}/${encodeURIComponent(league)}/${data.id}`;
}

// ─── Message listener ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== 'searchItem') return false;

  const { itemName, itemType, league, autoOpen } = message;

  getTradeSearchUrl(itemName, itemType, league)
    .then((tradeUrl) => {
      if (autoOpen !== false) {
        chrome.tabs.create({ url: tradeUrl, active: true });
      }
      sendResponse({ success: true, url: tradeUrl });
    })
    .catch((err) => {
      console.error('[poe-trade] Error buscando ítem:', err);
      sendResponse({ error: err.message });
    });

  // Retornar true para mantener el canal de respuesta abierto (async)
  return true;
});
