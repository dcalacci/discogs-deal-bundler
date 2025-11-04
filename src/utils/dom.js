// DOM utilities
export function injectTailwind() {
  if (document.getElementById('tailwind-css-injected')) return;
  const script = document.createElement('script');
  script.id = 'tailwind-css-injected';
  script.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(script);
}

export function findSidebar() {
  return document.querySelector('.marketplace_filters') || 
         document.querySelector('#page_aside') ||
         document.querySelector('.filters') ||
         document.querySelector('.sidebar') ||
         document.querySelector('[class*="sidebar"]') ||
         document.querySelector('[class*="filter"]');
}

export function showListingsByIds(listingIdsSet) {
  const all = document.querySelectorAll('[data-itemid]');
  all.forEach(node => {
    const id = node.getAttribute('data-itemid');
    node.style.display = listingIdsSet.has(id) ? '' : 'none';
  });
}

export function showAllListings() {
  const listingSelectors = ['.feed-item', '.shortcut_navigable', '.marketplace_listing', '.listing', '.item'];
  for (const selector of listingSelectors) {
    const listings = document.querySelectorAll(selector);
    if (listings.length > 0) {
      listings.forEach(listing => {
        listing.style.display = '';
      });
      console.log(`Showing all ${listings.length} listings using selector: ${selector}`);
      break;
    }
  }
}

