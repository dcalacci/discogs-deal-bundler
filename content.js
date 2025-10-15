// Discogs Seller Filter Content Script
(function() {
  'use strict';

  // Function to create a unique identifier for a listing
  function createListingId(listing) {
    // Try to find unique identifiers in the listing
    const href = listing.querySelector('a[href*="/sell/item/"]')?.getAttribute('href');
    if (href) {
      const match = href.match(/\/sell\/item\/(\d+)/);
      if (match) {
        return `item_${match[1]}`;
      }
    }
    
    // Fallback: use a combination of text content and seller
    const textContent = listing.textContent.trim().substring(0, 100);
    const sellerSpan = listing.querySelector('span');
    const sellerText = sellerSpan ? sellerSpan.textContent.trim() : '';
    
    // Create a hash-like identifier
    return `listing_${textContent.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}_${sellerText.replace(/\s+/g, '_')}`;
  }

  // Function to debug page structure
  function debugPageStructure() {
    console.log('=== DISCOGS PAGE DEBUG INFO ===');
    console.log('Current URL:', window.location.href);
    console.log('Page title:', document.title);
    
    // Check for common Discogs elements
    const commonElements = [
      'body',
      'main',
      '.content',
      '.main-content',
      '.page-content',
      '.marketplace',
      '.shop',
      '.listings',
      '.results'
    ];
    
    commonElements.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
      }
    });
    
    // Look for any elements that might contain listings
    const potentialContainers = document.querySelectorAll('div, section, article, ul, ol');
    console.log(`Found ${potentialContainers.length} potential container elements`);
    
    // Check for any links that might be seller links
    const allLinks = document.querySelectorAll('a');
    const sellerLinks = Array.from(allLinks).filter(link => {
      const href = link.getAttribute('href') || '';
      return href.includes('/seller/') || href.includes('/user/');
    });
    console.log(`Found ${sellerLinks.length} potential seller links`);
    
    if (sellerLinks.length > 0) {
      console.log('Sample seller links:');
      sellerLinks.slice(0, 3).forEach(link => {
        console.log(`- ${link.textContent.trim()} (${link.href})`);
      });
    }
  }

  // Helpers to expand/scroll and load as many listings as possible
  function getConfiguredServerUrl() {
    return (
      localStorage.getItem('discogs-analysis-server-url') ||
      'https://35559c0548fd.ngrok.app'
    );
  }

  function getConfiguredApiToken() {
    return localStorage.getItem('discogs-api-token') || '';
  }

  function setConfiguredServerUrl(url) {
    localStorage.setItem('discogs-analysis-server-url', url);
  }

  function setConfiguredApiToken(token) {
    localStorage.setItem('discogs-api-token', token);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getListingCount() {
    const selectors = ['.feed-item', '.shortcut_navigable', '.marketplace_listing', '.listing', '.item'];
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) return els.length;
    }
    return 0;
  }

  async function expandAllListingsIfPossible(maxIterations = 30) {
    let lastCount = getListingCount();
    let stagnantTries = 0;
    for (let i = 0; i < maxIterations; i++) {
      // Scroll to bottom to trigger lazy/infinite load
      window.scrollTo(0, document.body.scrollHeight);

      // Click common load more controls if present
      const loadButtons = Array.from(document.querySelectorAll('button, a')).filter(el => {
        const txt = (el.textContent || '').toLowerCase().trim();
        return txt && (
          txt.includes('load more') ||
          txt.includes('show more') ||
          txt === 'more' ||
          (txt.includes('load') && txt.includes('more'))
        );
      });
      if (loadButtons.length > 0) {
        try { loadButtons[0].click(); } catch (_) {}
      }

      await sleep(1200);

      const current = getListingCount();
      if (current > lastCount) {
        console.log(`Expanded listings: ${current} (was ${lastCount})`);
        lastCount = current;
        stagnantTries = 0;
      } else {
        stagnantTries++;
        if (stagnantTries >= 3) {
          console.log('No additional listings after multiple attempts.');
          break;
        }
      }
    }
  }

  // Pagination helpers for the new UI
  async function selectShowItems250(timeoutMs = 4000) {
    try {
      const select = document.querySelector('select.brand-select[aria-labelledby="set-show-items"]');
      if (!select) return false;
      const previousCount = getListingCount();
      select.value = '250';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      // wait for list to refresh
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

  function findNextButton() {
    // Prefer explicit next button
    let btn = document.querySelector('button[aria-label*="Next" i]');
    if (!btn) {
      // Fallbacks: some UIs use arrow or "Skip to End" buttons - pick the right-most pagination-like button that isn't disabled
      const candidates = Array.from(document.querySelectorAll('button'))
        .filter(b => b && b.offsetParent !== null);
      // choose last clickable without cursor-not-allowed
      btn = candidates.reverse().find(b => !b.classList.contains('cursor-not-allowed')) || null;
    }
    return btn;
  }

  async function goToNextPageAndWait(timeoutMs = 6000) {
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
      // if button becomes disabled, we likely reached the end
      if (btn.classList.contains('cursor-not-allowed') || btn.disabled) return { moved: false };
    }
    return { moved: true };
  }

  function ensureCombinedContainer() {
    let wrap = document.getElementById('discogs-combined-listings');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'discogs-combined-listings';
      wrap.style.cssText = 'border:1px solid #ddd;border-radius:6px;padding:8px;margin:12px 0;background:#fafafa;';
      const title = document.createElement('div');
      title.textContent = 'All pages (combined)';
      title.style.cssText = 'font-weight:bold;margin-bottom:6px;';
      wrap.appendChild(title);
      // Insert above the first listing if possible, else at top of body
      const firstListing = document.querySelector('[data-itemid]');
      if (firstListing && firstListing.parentElement) {
        firstListing.parentElement.insertBefore(wrap, firstListing.parentElement.firstChild);
      } else {
        document.body.insertBefore(wrap, document.body.firstChild);
      }
    } else {
      // clear previous clones (keep title)
      Array.from(wrap.children).forEach((child, idx) => { if (idx > 0) child.remove(); });
    }
    return wrap;
  }

  function scrapeListingsOnPage() {
    const results = [];
    const containers = document.querySelectorAll('[data-itemid]');
    containers.forEach(container => {
      try {
        const listingId = container.getAttribute('data-itemid');
        // release/title
        // Release/title: prefer product title link next to the image
        let release = '';
        const titleLink = container.querySelector('a.text-brand-textLink');
        if (titleLink) release = titleLink.textContent.trim();
        if (!release) {
          const anyTitle = container.querySelector('a[href*="/sell/item/"]');
          if (anyTitle) release = anyTitle.textContent.trim();
        }
        // seller block per provided structure
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
        // price - look for the price in the right column with specific structure
        let priceText = '';
        const priceContainer = container.querySelector('.border-brand-border01.w-\\[163px\\].shrink-0.border-l.ps-3, .border-brand-border01[class*="w-["][class*="shrink-0"][class*="border-l"]');
        if (priceContainer) {
          const priceEl = priceContainer.querySelector('span.text-2xl.leading-\\[1\\.25\\].font-bold, span[class*="text-2xl"][class*="font-bold"]');
          if (priceEl) {
            priceText = priceEl.textContent.trim();
          }
        }
        
        // Fallback: look for any span with price-like text
        if (!priceText) {
          const priceEl = container.querySelector('span[class*="text-2xl"][class*="font-bold"]');
          if (priceEl) {
            priceText = priceEl.textContent.trim();
          }
        }

        // shipping - look for the shipping text in the price container
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

  async function scrapeAllPages() {
    await selectShowItems250();
    const all = [];
    const combined = ensureCombinedContainer();
    const seen = new Set();
    let page = 1;
    while (true) {
      // collect data
      const pageData = scrapeListingsOnPage();
      pageData.forEach(it => {
        const key = it.listingId || `${it.seller}|${it.release}`;
        if (!seen.has(key)) {
          seen.add(key);
          all.push(it);
        }
      });
      // clone and append visible nodes for this page into combined container
      const pageNodes = document.querySelectorAll('[data-itemid]');
      pageNodes.forEach(node => {
        const id = node.getAttribute('data-itemid');
        if (!id) return;
        if (!combined.querySelector(`[data-itemid="${id}"]`)) {
          const clone = node.cloneNode(true);
          clone.setAttribute('data-combined', '1');
          clone.style.margin = '8px 0';
          combined.appendChild(clone);
        }
      });
      const btn = findNextButton();
      if (!btn || btn.classList.contains('cursor-not-allowed') || btn.disabled) break;
      const { moved } = await goToNextPageAndWait();
      if (!moved) break;
      page++;
      // small pause between pages
      await sleep(500);
    }
    window.__discogsSellerFilterAllListings = all;
    console.log(`Scraped ${all.length} listings across pages`, all);
    window.__discogsCombinedActive = true;
    // Hide original page listings; show combined only by default
    const originals = document.querySelectorAll('[data-itemid]:not([data-combined])');
    originals.forEach(n => { n.style.display = 'none'; });
    ensureCombinedContainer().style.display = '';
    return all;
  }

  // Function to show user messages
  function showUserMessage(message, type = 'info') {
    // Remove any existing messages
    const existingMessage = document.getElementById('seller-filter-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.id = 'seller-filter-message';
    messageDiv.style.cssText = `
      background: ${type === 'error' ? '#ffebee' : '#e3f2fd'};
      color: ${type === 'error' ? '#c62828' : '#1565c0'};
      border: 1px solid ${type === 'error' ? '#ffcdd2' : '#bbdefb'};
      border-radius: 4px;
      padding: 12px;
      margin: 10px 0;
      font-size: 14px;
      text-align: center;
    `;
    messageDiv.textContent = message;
    
    // Try to insert in the sidebar, fallback to top of page
    const sidebar = document.querySelector('.marketplace_filters') || 
                    document.querySelector('#page_aside') ||
                    document.querySelector('.filters');
    
    if (sidebar) {
      sidebar.insertBefore(messageDiv, sidebar.firstChild);
    } else {
      document.body.insertBefore(messageDiv, document.body.firstChild);
    }
  }

  // Wait for page to be fully loaded
  function init() {
    // Check if we're on the right page
    if (!window.location.href.includes('discogs.com/shop/mywants')) {
      return;
    }

    // Try multiple times with increasing delays for dynamic content
    const tryAnalyze = async (attempt = 1, maxAttempts = 5) => {
      console.log(`Attempt ${attempt} to analyze sellers...`);
      
      // Check if we have any content loaded
      const hasContent = document.querySelectorAll('div, section, article').length > 10;
      
      if (hasContent) {
        // Do NOT scan or scrape; just render the shell UI.
        try {
          createFilterUI([], {});
        } catch (e) { console.log(e); }
      } else if (attempt < maxAttempts) {
        console.log(`Not enough content loaded yet, retrying in ${attempt * 1000}ms...`);
        setTimeout(() => tryAnalyze(attempt + 1, maxAttempts), attempt * 1000);
      } else {
        console.log('Max attempts reached, trying anyway...');
        try { createFilterUI([], {}); } catch (e) {}
      }
    };

    // Start trying after initial delay
    setTimeout(() => tryAnalyze(), 1000);
  }

  function analyzeSellersAndCreateFilter() {
    // Try multiple selectors to find marketplace listings
    const listingSelectors = [
      '.feed-item',  // This is the actual class used on Discogs
      '.shortcut_navigable',
      '.marketplace_listing',
      '.listing',
      '.item',
      '.result',
      '[class*="listing"]',
      '[class*="item"]',
      '[class*="result"]',
      '.card',
      '.product',
      'tr[data-listing-id]',
      'div[data-listing-id]',
      '.marketplace-item',
      '.shop-item'
    ];
    
    let listings = [];
    let usedSelector = '';
    
    for (const selector of listingSelectors) {
      listings = document.querySelectorAll(selector);
      if (listings.length > 0) {
        usedSelector = selector;
        console.log(`Found ${listings.length} listings using selector: ${selector}`);
        break;
      }
    }
    
    if (listings.length === 0) {
      // Run debug function to understand page structure
      debugPageStructure();
      
      console.log('No listings found with any selector. Available elements:');
      console.log('All divs:', document.querySelectorAll('div').length);
      console.log('All elements with "listing":', document.querySelectorAll('[class*="listing"]').length);
      console.log('All elements with "item":', document.querySelectorAll('[class*="item"]').length);
      console.log('All elements with "result":', document.querySelectorAll('[class*="result"]').length);
      
      // Let's also check what's actually on the page
      const allDivs = document.querySelectorAll('div');
      const divClasses = new Set();
      allDivs.forEach(div => {
        if (div.className) {
          div.className.split(' ').forEach(cls => divClasses.add(cls));
        }
      });
      console.log('Available CSS classes:', Array.from(divClasses).slice(0, 20));
      
      // Try one more approach - look for any elements that might contain seller info
      const sellerLinks = document.querySelectorAll('a[href*="/seller/"], a[href*="/user/"]');
      if (sellerLinks.length > 0) {
        console.log(`Found ${sellerLinks.length} seller links, trying alternative approach...`);
        // Create a virtual listing for each seller link
        listings = Array.from(sellerLinks).map(link => {
          const container = document.createElement('div');
          container.className = 'virtual-listing';
          container.appendChild(link.cloneNode(true));
          return container;
        });
        console.log(`Created ${listings.length} virtual listings from seller links`);
      } else {
        showUserMessage('No marketplace listings found. Make sure you have items in your wantlist and are on the correct page. Check console for debugging info.', 'error');
        return;
      }
    }
    
    console.log(`Found ${listings.length} listings to analyze using selector: ${usedSelector}`);

    // Count items per seller
    const sellerCounts = {};
    const sellerToListings = {};
    const processedListings = new Set(); // Track processed listings to avoid duplicates

    listings.forEach(listing => {
      // Create a unique identifier for this listing to avoid duplicates
      const listingId = createListingId(listing);
      if (processedListings.has(listingId)) {
        console.log('Skipping duplicate listing:', listingId);
        return; // Skip this listing as it's a duplicate
      }
      processedListings.add(listingId);
      // Try multiple selectors to find seller name
      let sellerName = null;
      
      // Primary method: Look for "Seller: [name]" pattern in spans
      const allSpans = listing.querySelectorAll('span');
      for (const span of allSpans) {
        const text = span.textContent.trim();
        if (text.startsWith('Seller: ')) {
          sellerName = text.replace('Seller: ', '').trim();
          
          // Clean up seller name - remove various suffixes
          sellerName = sellerName.replace(/\s+has\s+\d+\s+more\s+items?\s+I\s+want.*$/i, '');
          sellerName = sellerName.replace(/\s+has\s+\d+\s+more\s+items?.*$/i, '');
          sellerName = sellerName.replace(/\s+\(\d+\.\d+%\)$/, ''); // Remove percentage
          sellerName = sellerName.replace(/\s+\(\d+%\)$/, ''); // Remove percentage without decimal
          sellerName = sellerName.replace(/\s+\(\d+\.\d+\)$/, ''); // Remove decimal number
          sellerName = sellerName.replace(/\s+\(\d+\)$/, ''); // Remove number in parentheses
          sellerName = sellerName.trim();
          
          // Skip if the seller name is empty or looks like a message
          if (sellerName && 
              !sellerName.toLowerCase().includes('has') && 
              !sellerName.toLowerCase().includes('more items') &&
              !sellerName.toLowerCase().includes('more item') &&
              sellerName.length > 1) {
            break;
          } else {
            sellerName = null; // Reset if it's not a real seller name
          }
        }
      }
      
      // Fallback: Look for seller links
      if (!sellerName) {
        const sellerLink = listing.querySelector('a.seller_info strong');
        if (sellerLink) {
          sellerName = sellerLink.textContent.trim();
        }
      }
      
      // Additional fallback selectors for different page structures
      if (!sellerName) {
        const selectors = [
          'a.seller_info',
          '.seller_info a',
          '.seller_name',
          '.seller-name',
          '[data-seller]',
          '.seller a',
          'a[href*="/seller/"]'
        ];
        
        for (const selector of selectors) {
          const element = listing.querySelector(selector);
          if (element) {
            sellerName = element.textContent.trim();
            break;
          }
        }
      }
      
      // Additional fallback: look for any link that might contain seller info
      if (!sellerName) {
        const allLinks = listing.querySelectorAll('a');
        for (const link of allLinks) {
          const href = link.getAttribute('href');
          if (href && href.includes('/seller/')) {
            sellerName = link.textContent.trim();
            break;
          }
        }
      }
      
      if (sellerName && sellerName.length > 0) {
        // Clean up seller name (remove extra whitespace, etc.)
        sellerName = sellerName.replace(/\s+/g, ' ').trim();
        
        // Initialize if not exists
        if (!sellerCounts[sellerName]) {
          sellerCounts[sellerName] = 0;
          sellerToListings[sellerName] = [];
        }
        
        sellerCounts[sellerName]++;
        sellerToListings[sellerName].push(listing);
        console.log(`✅ Added listing for seller: ${sellerName} (total: ${sellerCounts[sellerName]})`);
      } else {
        console.log('❌ Could not find valid seller name for listing:', listing);
        console.log('Listing HTML:', listing.innerHTML.substring(0, 200) + '...');
      }
    });

    // Sort sellers by count (descending)
    const sortedSellers = Object.entries(sellerCounts)
      .sort((a, b) => b[1] - a[1]);

    if (sortedSellers.length === 0) {
      console.log('No sellers found');
      return;
    }

    // Store data globally and render minimal UI list
    currentSellerData = { sortedSellers, sellerToListings };
    createFilterUI(sortedSellers, sellerToListings);
  }

  function createFilterUI(sortedSellers, sellerToListings) {
    // Check if filter already exists and remove it
    const existingFilter = document.getElementById('seller-filter-container');
    if (existingFilter) {
      console.log('Removing existing filter to update with new data...');
      existingFilter.remove();
    }
    
    // Find the sidebar (left side of the page)
    const sidebar = document.querySelector('.marketplace_filters') || 
                    document.querySelector('#page_aside') ||
                    document.querySelector('.filters') ||
                    document.querySelector('.sidebar') ||
                    document.querySelector('[class*="sidebar"]') ||
                    document.querySelector('[class*="filter"]');

    if (!sidebar) {
      console.log('Could not find sidebar to inject filter');
      showUserMessage('Could not find the sidebar to add the filter. The page structure may have changed.', 'error');
      return;
    }

    // Create filter container
    const filterContainer = document.createElement('div');
    filterContainer.id = 'seller-filter-container';
    filterContainer.className = 'section_header';

    // Create header with refresh button
    const header = document.createElement('h3');
    header.textContent = 'Filter by Seller';
    header.style.cursor = 'pointer';
    
    // Add refresh + analyze + settings buttons
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '🔄';
    refreshBtn.title = 'Refresh filter (click if new items were loaded)';
    refreshBtn.style.cssText = `
      float: right;
      background: #0074e0;
      color: white;
      border: none;
      border-radius: 3px;
      padding: 2px 6px;
      font-size: 12px;
      cursor: pointer;
      margin-left: 10px;
    `;
    refreshBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('🔄 Manual refresh triggered by user');
      
      // Force a complete reanalysis by clearing current data
      currentSellerData = null;
      lastListingCount = 0;
      
      // Re-run the entire analysis
      analyzeSellersAndCreateFilter();
    });
    const analyzeBtn = document.createElement('button');
    analyzeBtn.textContent = 'Analyze Sellers';
    analyzeBtn.title = 'Send scraped listings to analysis server';
    analyzeBtn.style.cssText = `
      float: right;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 3px;
      padding: 2px 8px;
      font-size: 12px;
      cursor: pointer;
      margin-left: 8px;
    `;
    analyzeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        let token = getConfiguredApiToken();
        if (!token) {
          token = prompt('Enter your Discogs API token:');
          if (!token) return;
          setConfiguredApiToken(token.trim());
        }
        // Ensure we have the full scrape first
        const allListings = await scrapeAllPages();
        const payload = { token, listings: allListings };
        const serverUrl = getConfiguredServerUrl();
        const resp = await fetch(`${serverUrl.replace(/\/$/, '')}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await resp.json();
        if (!resp.ok) {
          alert('Analysis failed: ' + (json.error || resp.status));
          return;
        }
        console.log('Analysis result:', json);
        renderSellerResults(json, sellersList);
      } catch (err) {
        console.error(err);
        alert('Analysis request failed');
      }
    });

    const settingsBtn = document.createElement('button');
    settingsBtn.textContent = '⚙️';
    settingsBtn.title = 'Configure analysis server URL and Discogs API token';
    settingsBtn.style.cssText = `
      float: right;
      background: #6b7280;
      color: white;
      border: none;
      border-radius: 3px;
      padding: 2px 6px;
      font-size: 12px;
      cursor: pointer;
      margin-left: 8px;
    `;
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentUrl = getConfiguredServerUrl();
      const newUrl = prompt('Analysis server URL:', currentUrl);
      if (newUrl && newUrl.trim()) setConfiguredServerUrl(newUrl.trim());
      const currentToken = getConfiguredApiToken();
      const newToken = prompt('Discogs API token (will be stored locally):', currentToken);
      if (newToken !== null) setConfiguredApiToken((newToken || '').trim());
      alert('Configuration saved.');
    });

    header.appendChild(refreshBtn);
    header.appendChild(settingsBtn);
    header.appendChild(analyzeBtn);
    filterContainer.appendChild(header);

    // Inline config row
    const configRow = document.createElement('div');
    configRow.style.cssText = 'margin:8px 0; display:flex; gap:6px; align-items:center; flex-wrap:wrap;';
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.placeholder = 'Server URL';
    urlInput.value = getConfiguredServerUrl();
    urlInput.style.cssText = 'flex:1; min-width:220px; padding:4px 6px; border:1px solid #ccc; border-radius:3px;';
    const tokenInput = document.createElement('input');
    tokenInput.type = 'text';
    tokenInput.placeholder = 'Discogs API token';
    tokenInput.value = getConfiguredApiToken();
    tokenInput.style.cssText = 'flex:1; min-width:220px; padding:4px 6px; border:1px solid #ccc; border-radius:3px;';
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.cssText = 'background:#374151;color:#fff;border:none;border-radius:3px;padding:4px 8px;cursor:pointer;';
    saveBtn.addEventListener('click', () => {
      setConfiguredServerUrl(urlInput.value.trim());
      setConfiguredApiToken(tokenInput.value.trim());
    });
    configRow.appendChild(urlInput);
    configRow.appendChild(tokenInput);
      configRow.appendChild(saveBtn);
      filterContainer.appendChild(configRow);

      // Budget optimization row
      const budgetRow = document.createElement('div');
      budgetRow.style.cssText = 'margin:8px 0; padding:8px; background:#f8f9fa; border-radius:4px; border:1px solid #e9ecef;';
      
      const budgetLabel = document.createElement('div');
      budgetLabel.textContent = 'Budget Optimization';
      budgetLabel.style.cssText = 'font-weight:bold; margin-bottom:6px; font-size:12px;';
      
      const budgetSliderContainer = document.createElement('div');
      budgetSliderContainer.style.cssText = 'display:flex; align-items:center; gap:8px; margin-bottom:6px;';
      
      const budgetSlider = document.createElement('input');
      budgetSlider.type = 'range';
      budgetSlider.min = '10';
      budgetSlider.max = '1000';
      budgetSlider.value = '100';
      budgetSlider.step = '10';
      budgetSlider.style.cssText = 'flex:1;';
      
      const budgetValue = document.createElement('span');
      budgetValue.textContent = '$100';
      budgetValue.style.cssText = 'font-weight:bold; min-width:40px; text-align:right;';
      
      budgetSlider.addEventListener('input', () => {
        budgetValue.textContent = '$' + budgetSlider.value;
      });
      
      const optimizeBtn = document.createElement('button');
      optimizeBtn.textContent = '🎯 Find Best Deals';
      optimizeBtn.style.cssText = 'background:#dc2626;color:#fff;border:none;border-radius:3px;padding:4px 8px;cursor:pointer;font-size:11px;';
      optimizeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await runOptimizationFlow(budgetSlider.value);
      });
      
      budgetSliderContainer.appendChild(budgetSlider);
      budgetSliderContainer.appendChild(budgetValue);
      budgetSliderContainer.appendChild(optimizeBtn);
      
      budgetRow.appendChild(budgetLabel);
      budgetRow.appendChild(budgetSliderContainer);
      filterContainer.appendChild(budgetRow);

      // Create sellers list container (empty initially)
    const sellersList = document.createElement('div');
    sellersList.id = 'sellers-list';
    sellersList.className = 'sellers-list';
    filterContainer.appendChild(sellersList);

    // Insert at the top of the sidebar
    sidebar.insertBefore(filterContainer, sidebar.firstChild);
    
    // Minimal message
    console.log('Seller filter ready. Use Analyze Sellers to fetch data.');

    // Add collapse/expand functionality
    let isExpanded = true;
    header.addEventListener('click', () => {
      isExpanded = !isExpanded;
      sellersList.style.display = isExpanded ? 'block' : 'none';
      header.style.opacity = isExpanded ? '1' : '0.7';
    });
  }

  function filterListings(selectedSellers, sellerToListings) {
    // Hide all listings first - try multiple selectors
    const listingSelectors = ['.feed-item', '.shortcut_navigable', '.marketplace_listing', '.listing', '.item'];
    let allListings = [];
    
    for (const selector of listingSelectors) {
      const listings = document.querySelectorAll(selector);
      if (listings.length > 0) {
        allListings = listings;
        console.log(`Filtering ${listings.length} listings using selector: ${selector}`);
        break;
      }
    }
    
    allListings.forEach(listing => {
      listing.style.display = 'none';
    });

    // Show only selected sellers' listings
    selectedSellers.forEach(seller => {
      if (sellerToListings[seller]) {
        sellerToListings[seller].forEach(listing => {
          listing.style.display = '';
        });
      }
    });

    // Update the results count if it exists
    updateResultsCount(selectedSellers, sellerToListings);
  }

  function showAllListings() {
    // Try multiple selectors to find all listings
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
    
    updateResultsCount(null, null);
  }

  // Filter DOM by a specific set of listingIds (data-itemid)
  function showListingsByIds(listingIdsSet) {
    const all = document.querySelectorAll('[data-itemid]');
    all.forEach(node => {
      const id = node.getAttribute('data-itemid');
      node.style.display = listingIdsSet.has(id) ? '' : 'none';
    });
  }

  function applySellerFilterFromSelection() {
    const result = window.__discogsAnalysisResult;
    if (!result || !Array.isArray(result.sellers)) {
      showAllListings();
      return;
    }
    if (!currentSelectedSellers || currentSelectedSellers.size === 0) {
      showAllListings();
      return;
    }
    const ids = new Set();
    result.sellers.forEach(s => {
      if (currentSelectedSellers.has(s.seller)) {
        (s.items || []).forEach(it => ids.add(String(it.listingId)));
      }
    });
    if (ids.size === 0) {
      showAllListings();
    } else {
      showListingsByIds(ids);
    }
  }

  function updateResultsCount(selectedSellers, sellerToListings) {
    const resultsHeader = document.querySelector('.pagination_total');
    if (!resultsHeader) return;

    if (!selectedSellers || selectedSellers.size === 0) {
      // Restore original count - try multiple selectors
      const listingSelectors = ['.feed-item', '.shortcut_navigable', '.marketplace_listing', '.listing', '.item'];
      let allListings = [];
      
      for (const selector of listingSelectors) {
        const listings = document.querySelectorAll(selector);
        if (listings.length > 0) {
          allListings = listings;
          break;
        }
      }
      
      resultsHeader.textContent = `Showing ${allListings.length} items`;
    } else {
      let totalCount = 0;
      selectedSellers.forEach(seller => {
        if (sellerToListings[seller]) {
          totalCount += sellerToListings[seller].length;
        }
      });
      resultsHeader.textContent = `Showing ${totalCount} items (filtered)`;
    }
  }

  function renderSellerResults(result, container) {
    if (!result || !Array.isArray(result.sellers)) return;
    container.innerHTML = '';
    window.__discogsAnalysisResult = result; // keep last result
    result.sellers.forEach((seller, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'seller-item';
      const header = document.createElement('label');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.cursor = 'pointer';
      const left = document.createElement('div');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.style.marginRight = '8px';
      checkbox.checked = currentSelectedSellers && currentSelectedSellers.has(seller.seller);
      left.appendChild(checkbox);
      const nameSpan = document.createElement('span');
      nameSpan.innerHTML = `<strong>${idx + 1}. ${seller.seller}</strong> <span style="color:#666">${seller.sellerRatings || ''}</span>`;
      left.appendChild(nameSpan);
      const right = document.createElement('div');
      right.innerHTML = `<span style="margin-right:8px">Items: ${seller.count}</span><span>Total: ${seller.totalPrice.toFixed(2)}</span>`;
      header.appendChild(left);
      header.appendChild(right);

      const details = document.createElement('div');
      details.style.display = 'none';
      details.style.marginTop = '8px';
      const list = document.createElement('ul');
      list.style.paddingLeft = '16px';
      (seller.items || []).forEach(it => {
        const li = document.createElement('li');
        li.textContent = `${it.release || '(untitled)'} • ${it.price || ''} + ${it.shipping || ''} • id:${it.listingId}`;
        list.appendChild(li);
      });
      details.appendChild(list);

      nameSpan.addEventListener('click', (e) => {
        e.preventDefault();
        details.style.display = details.style.display === 'none' ? 'block' : 'none';
      });
      checkbox.addEventListener('change', () => {
        if (!currentSelectedSellers) currentSelectedSellers = new Set();
        if (checkbox.checked) currentSelectedSellers.add(seller.seller); else currentSelectedSellers.delete(seller.seller);
        applySellerFilterFromSelection();
      });

      wrapper.appendChild(header);
      wrapper.appendChild(details);
      container.appendChild(wrapper);
    });
  }

  // Function to re-analyze sellers when new content is loaded
  function reanalyzeAndUpdateFilter() {
    console.log('🔄 Re-analyzing sellers due to new content...');
    
    // Get current listing count for comparison
    const currentListings = document.querySelectorAll('.feed-item, .shortcut_navigable, .marketplace_listing, .listing, .item');
    console.log(`📊 Current listings found: ${currentListings.length}`);
    
    if (currentListings.length === 0) {
      console.log('⚠️ No listings found, skipping reanalysis');
      return;
    }
    
    // Store previous filter state
    const previousSelectedSellers = new Set(currentSelectedSellers);
    const wasFilterActive = isFilterActive;
    
    // Re-run the analysis
    analyzeSellersAndCreateFilter();
    
    // If we had active filters, reapply them
    if (wasFilterActive && previousSelectedSellers.size > 0 && currentSellerData) {
      console.log(`🔍 Re-applying filters for ${previousSelectedSellers.size} sellers...`);
      
      // Update the current selected sellers
      currentSelectedSellers = previousSelectedSellers;
      isFilterActive = true;
      
      // Reapply the filters
      filterListings(currentSelectedSellers, currentSellerData.sellerToListings);
      
      // Update checkboxes to match the filter state
      setTimeout(() => {
        updateCheckboxesFromFilterState();
      }, 500);
    } else {
      console.log('ℹ️ No active filters to reapply');
    }
  }
  
  // Function to update checkboxes based on current filter state
  function updateCheckboxesFromFilterState() {
    const filterContainer = document.getElementById('seller-filter-container');
    if (!filterContainer) return;
    
    // Update "Show All" checkbox
    const showAllCheckbox = filterContainer.querySelector('.show-all-btn input');
    if (showAllCheckbox) {
      showAllCheckbox.checked = !isFilterActive;
    }
    
    // Update individual seller checkboxes
    currentSelectedSellers.forEach(seller => {
      const checkbox = filterContainer.querySelector(`#seller-${seller.replace(/\s+/g, '-')}`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
  }

  async function runOptimizationFlow(budget) {
    showUserMessage(`Starting optimization with budget $${budget}...`, 'info');
    const apiToken = localStorage.getItem('discogs-api-token');
    const serverUrl = localStorage.getItem('discogs-analysis-server-url');

    if (!apiToken) {
      showUserMessage('Discogs API Token is not set. Please enter it in the sidebar settings.', 'error');
      return;
    }
    if (!serverUrl) {
      showUserMessage('Analysis Server URL is not set. Please enter it in the sidebar settings.', 'error');
      return;
    }

    try {
      await selectShowItems250(); // Ensure 250 items are shown per page
      const allScrapedListings = await scrapeAllPages(); // Scrape all pages

      if (allScrapedListings.length === 0) {
        showUserMessage('No listings found after scraping all pages.', 'error');
        return;
      }

      showUserMessage(`Scraped ${allScrapedListings.length} listings. Optimizing for budget $${budget}...`, 'info');

      const response = await fetch(`${serverUrl}/optimize-fast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: apiToken, listings: allScrapedListings, budget: parseFloat(budget) }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const optimizationResults = await response.json();
      console.log('🎯 Optimization Results from server:', optimizationResults);
      displayOptimizationResults(optimizationResults);
      showUserMessage(`Optimization complete! Found ${optimizationResults.selected.length} items for $${optimizationResults.summary.totalCost}.`, 'success');

    } catch (error) {
      console.error('Error during optimization flow:', error);
      showUserMessage(`Optimization failed: ${error.message}`, 'error');
    }
  }

  function displayOptimizationResults(results) {
    const sellersList = document.getElementById('sellers-list');
    if (!sellersList) return;

    sellersList.innerHTML = '';

    const summaryDiv = document.createElement('div');
    summaryDiv.style.cssText = 'background:#e8f5e8;border:1px solid #4caf50;border-radius:4px;padding:8px;margin-bottom:8px;';
    summaryDiv.innerHTML = `
      <div style="font-weight:bold;color:#2e7d32;margin-bottom:4px;">🎯 Best Deals Found</div>
      <div style="font-size:12px;">
        <div>Items: ${results.summary.totalItems}</div>
        <div>Items Cost: $${results.summary.itemCost.toFixed(2)}</div>
        <div>Shipping: $${results.summary.shippingCost.toFixed(2)}</div>
        <div style="font-weight:bold;color:#d32f2f;">Total: $${results.summary.totalCost.toFixed(2)}</div>
        <div>Efficiency: ${(results.summary.efficiency || 0).toFixed(2)} items per $</div>
        <div>Remaining Budget: $${(results.summary.remainingBudget || 0).toFixed(2)}</div>
      </div>
    `;
    sellersList.appendChild(summaryDiv);

    // Group by seller
    Object.entries(results.bySeller).forEach(([seller, data]) => {
      const sellerDiv = document.createElement('div');
      sellerDiv.style.cssText = 'border:1px solid #ddd;border-radius:4px;margin:4px 0;padding:6px;background:#fff;';
      
      sellerDiv.innerHTML = `
        <div style="font-weight:bold;color:#1976d2;margin-bottom:4px;">
          ${seller} (${data.itemCount} items, $${data.totalCost.toFixed(2)})
        </div>
        <div style="font-size:11px;color:#666;">
          Items: $${data.itemCost.toFixed(2)} + Shipping: $${data.shippingCost.toFixed(2)}
        </div>
        <div style="margin-top:4px;">
          ${data.items.map(item => `
            <div style="font-size:11px;padding:4px 0;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;">
              <div style="flex:1;">
                <div style="font-weight:bold;margin-bottom:2px;">${item.release}</div>
                <div style="color:#666;">
                  $${(item.priceParsed?.amountUSD || 0).toFixed(2)} (${item.priceParsed?.currency || 'USD'}${item.priceParsed?.amount || 0})
                  ${item.shippingParsed?.amountUSD > 0 ? `+ $${(item.shippingParsed?.amountUSD || 0).toFixed(2)} shipping` : ''}
                </div>
              </div>
              <div style="display:flex;gap:4px;margin-left:8px;">
                <a href="https://www.discogs.com/sell/cart/?add=${item.listingId}" 
                   target="_blank" 
                   style="background:#4caf50;color:white;padding:2px 6px;border-radius:3px;text-decoration:none;font-size:10px;font-weight:bold;">
                  Add to Cart
                </a>
                <a href="https://www.discogs.com/sell/item/${item.listingId}" 
                   target="_blank" 
                   style="background:#2196f3;color:white;padding:2px 6px;border-radius:3px;text-decoration:none;font-size:10px;font-weight:bold;">
                  View
                </a>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      sellersList.appendChild(sellerDiv);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Global variables to track current state
  let currentSellerData = null;
  let currentSelectedSellers = new Set();
  let isFilterActive = false;

  // Enhanced mutation observer to handle dynamic content loading
  let lastUrl = location.href;
  let lastListingCount = 0;
  let reanalysisTimeout = null;
  
  // Function to check for new listings and trigger reanalysis
  function checkForNewListings() {
    const currentListings = document.querySelectorAll('.feed-item, .shortcut_navigable, .marketplace_listing, .listing, .item');
    
    if (currentListings.length > lastListingCount) {
      console.log(`🔄 New listings detected: ${currentListings.length} (was ${lastListingCount})`);
      lastListingCount = currentListings.length;
      
      // Clear any existing timeout
      if (reanalysisTimeout) {
        clearTimeout(reanalysisTimeout);
      }
      
      // Re-analyze sellers and update filter with a small delay
      reanalysisTimeout = setTimeout(() => {
        reanalyzeAndUpdateFilter();
      }, 1000);
    }
  }
  
  const mutationObserver = new MutationObserver((mutations) => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      init();
      return;
    }
    
    // Check for new listings
    checkForNewListings();
  });
  
  mutationObserver.observe(document, { 
    subtree: true, 
    childList: true,
    attributes: true,
    characterData: true
  });
  
  // Also check periodically in case mutation observer misses something
  setInterval(checkForNewListings, 2000);
  
  // Listen for common events that might trigger content loading
  document.addEventListener('click', (event) => {
    // Check if clicked element might be a "load more" button
    const target = event.target;
    if (target && (
      target.textContent.toLowerCase().includes('load') ||
      target.textContent.toLowerCase().includes('more') ||
      target.textContent.toLowerCase().includes('show') ||
      target.classList.contains('load-more') ||
      target.classList.contains('show-more') ||
      target.classList.contains('pagination')
    )) {
      console.log('🖱️ Potential load more button clicked, checking for new content...');
      setTimeout(checkForNewListings, 1500);
    }
  });
  
  // Listen for scroll events (in case of infinite scroll)
  let scrollTimeout = null;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(checkForNewListings, 1000);
  });

})();
