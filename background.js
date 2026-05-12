/**
 * background.js — Fetch a la API de trade2 + apertura de pestaña.
 * El background no tiene restricciones CORS gracias a host_permissions.
 */

const POE2_TRADE_API = 'https://www.pathofexile.com/api/trade2/search/poe2';
const POE2_TRADE_URL = 'https://www.pathofexile.com/trade2/search/poe2';

async function fetchTradeUrl(itemName, itemType, isUnique, league, listingType) {
  const statusOption = listingType || 'instant';
  const query = isUnique && itemName
    ? { status: { option: statusOption }, name: itemName }
    : { status: { option: statusOption }, type: itemType };

  const payload = { query, sort: { price: 'asc' } };
  const url = `${POE2_TRADE_API}/${encodeURIComponent(league)}`;

  console.log('[poe-trade BG] POST →', url);
  console.log('[poe-trade BG] payload:', JSON.stringify(payload));

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  console.log('[poe-trade BG] status:', response.status, '| body:', text.slice(0, 200));

  if (!response.ok) throw new Error(`API ${response.status}: ${text}`);

  const data = JSON.parse(text);
  if (!data.id) throw new Error('La API no devolvió search ID');

  return `${POE2_TRADE_URL}/${encodeURIComponent(league)}/${data.id}`;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== 'searchItem') return false;

  const { itemName, itemType, isUnique, league, listingType } = message;

  fetchTradeUrl(itemName, itemType, isUnique, league, listingType)
    .then((tradeUrl) => {
      console.log('[poe-trade BG] ✅ abriendo:', tradeUrl);
      chrome.tabs.create({ url: tradeUrl, active: true });
      sendResponse({ success: true, url: tradeUrl });
    })
    .catch((err) => {
      console.error('[poe-trade BG] ❌ Error:', err.message);
      sendResponse({ error: err.message });
    });

  return true; // mantener canal async abierto
});
