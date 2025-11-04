// Scraping utilities
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getListingCount() {
  const selectors = ['.feed-item', '.shortcut_navigable', '.marketplace_listing', '.listing', '.item'];
  for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    if (els.length > 0) return els.length;
  }
  return 0;
}

export function createListingId(listing) {
  const href = listing.querySelector('a[href*="/sell/item/"]')?.getAttribute('href');
  if (href) {
    const match = href.match(/\/sell\/item\/(\d+)/);
    if (match) {
      return `item_${match[1]}`;
    }
  }
  
  const textContent = listing.textContent.trim().substring(0, 100);
  const sellerSpan = listing.querySelector('span');
  const sellerText = sellerSpan ? sellerSpan.textContent.trim() : '';
  
  return `listing_${textContent.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}_${sellerText.replace(/\s+/g, '_')}`;
}

export function scrapeListingsOnPage() {
  const results = [];
  const containers = document.querySelectorAll('[data-itemid]');
  containers.forEach(container => {
    try {
      const listingId = container.getAttribute('data-itemid');
      
      let release = '';
      const titleLink = container.querySelector('a.text-brand-textLink');
      if (titleLink) release = titleLink.textContent.trim();
      if (!release) {
        const anyTitle = container.querySelector('a[href*="/sell/item/"]');
        if (anyTitle) release = anyTitle.textContent.trim();
      }
      
      let seller = '';
      let sellerRatings = '';
      const sellerBlock = container.querySelector('p.text-brand-textSecondary.brand-item-copy.flex.items-center');
      if (sellerBlock) {
        const sellerLink = sellerBlock.querySelector('a[href*="/seller/"]');
        if (sellerLink) seller = sellerLink.textContent.trim();
        const ratingSpan = sellerBlock.querySelector('span');
        if (ratingSpan) sellerRatings = ratingSpan.textContent.trim();
      } else {
        const fallbackSellerLink = container.querySelector('a[href*="/seller/"]');
        if (fallbackSellerLink) seller = fallbackSellerLink.textContent.trim();
      }
      
      let priceText = '';
      const priceContainer = container.querySelector('.border-brand-border01.w-\\[163px\\].shrink-0.border-l.ps-3, .border-brand-border01[class*="w-["][class*="shrink-0"][class*="border-l"]');
      if (priceContainer) {
        const priceEl = priceContainer.querySelector('span.text-2xl.leading-\\[1\\.25\\].font-bold, span[class*="text-2xl"][class*="font-bold"]');
        if (priceEl) {
          priceText = priceEl.textContent.trim();
        }
      }
      
      if (!priceText) {
        const priceEl = container.querySelector('span[class*="text-2xl"][class*="font-bold"]');
        if (priceEl) {
          priceText = priceEl.textContent.trim();
        }
      }

      let shippingText = '';
      if (priceContainer) {
        const shippingEl = priceContainer.querySelector('span.text-brand-primary.text-sm.leading-\\[1\\.25\\], span[class*="text-brand-primary"][class*="text-sm"]');
        if (shippingEl && shippingEl.textContent.includes('+')) {
          const match = shippingEl.textContent.match(/\+\s*([^<]+)/);
          if (match) {
            shippingText = match[1].trim();
          }
        }
      }
      results.push({ listingId, release, seller, sellerRatings, price: priceText, shipping: shippingText });
    } catch (_) {}
  });
  return results;
}

