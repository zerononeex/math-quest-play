// [S60] Embedded assets: heavy files ride in inert <script type="text/plain" id="mq-<key>"> tags (base64) after the game
// script, so boot never parses them as JS. embeddedAssets() merges them with window.ASSETS as { key: dataURL }.
const MIME = { png: 'image/png', json: 'application/json', mp3: 'audio/mpeg' };

export function embeddedAssets() {
  const out = Object.assign({}, (typeof window !== 'undefined' && window.ASSETS) || {});
  if (typeof document === 'undefined') return out;
  for (const el of document.querySelectorAll('script[type="text/plain"][id^="mq-"]')) {
    const key = el.id.slice(3), ext = key.split('.').pop();
    if (!(key in out)) Object.defineProperty(out, key, { enumerable: true, get: () => 'data:' + (MIME[ext] || 'application/octet-stream') + ';base64,' + el.textContent.trim() });
  }
  return out;
}

// Resolves once the whole page (all asset tags) has been parsed.
export function pageParsed() {
  if (typeof document === 'undefined' || document.readyState !== 'loading') return Promise.resolve();
  return new Promise((r) => document.addEventListener('DOMContentLoaded', () => r(), { once: true }));
}
