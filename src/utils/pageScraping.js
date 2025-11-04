import { sleep, scrapeListingsOnPage } from './scraping';
import { getListingCount } from './scraping';

export async function selectShowItems250(timeoutMs = 4000) {
  try {
    const select = document.querySelector('select.brand-select[aria-labelledby="set-show-items"]');
    if (!select) return false;
    const previousCount = getListingCount();
    select.value = '250';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await sleep(200);
      const current = getListingCount();
      if (current && current !== previousCount) return true;
    }
    return true;
  } catch (_) {
    return false;
  }
}

export function findNextButton() {
  let btn = document.querySelector('button[aria-label*="Next" i]');
  if (!btn) {
    const candidates = Array.from(document.querySelectorAll('button'))
      .filter(b => b && b.offsetParent !== null);
    btn = candidates.reverse().find(b => !b.classList.contains('cursor-not-allowed')) || null;
  }
  return btn;
}

export async function goToNextPageAndWait(timeoutMs = 6000) {
  const btn = findNextButton();
  if (!btn) return { moved: false };
  if (btn.classList.contains('cursor-not-allowed') || btn.disabled) return { moved: false };

  const beforeIds = new Set(Array.from(document.querySelectorAll('[data-itemid]')).map(d => d.getAttribute('data-itemid')));
  try { btn.click(); } catch (_) {}

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(250);
    const afterIds = Array.from(document.querySelectorAll('[data-itemid]')).map(d => d.getAttribute('data-itemid'));
    if (afterIds.length && !afterIds.every(id => beforeIds.has(id))) {
      return { moved: true };
    }
    if (btn.classList.contains('cursor-not-allowed') || btn.disabled) return { moved: false };
  }
  return { moved: true };
}

export async function scrapeAllPages() {
  await selectShowItems250();
  const all = [];
  const seen = new Set();
  let page = 1;
  
  while (true) {
    const pageData = scrapeListingsOnPage();
    pageData.forEach(it => {
      const key = it.listingId || `${it.seller}|${it.release}`;
      if (!seen.has(key)) {
        seen.add(key);
        all.push(it);
      }
    });
    
    const btn = findNextButton();
    if (!btn || btn.classList.contains('cursor-not-allowed') || btn.disabled) break;
    
    const { moved } = await goToNextPageAndWait();
    if (!moved) break;
    page++;
    await sleep(500);
  }
  
  window.__discogsSellerFilterAllListings = all;
  console.log(`Scraped ${all.length} listings across pages`, all);
  return all;
}

