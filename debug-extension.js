// Debug version of the Discogs Seller Filter
// This version provides extensive logging to help debug issues

(function() {
  'use strict';

  console.log('🔍 Discogs Seller Filter Debug Mode Started');

  function debugPageStructure() {
    console.log('=== DISCOGS PAGE DEBUG INFO ===');
    console.log('Current URL:', window.location.href);
    console.log('Page title:', document.title);
    console.log('Document ready state:', document.readyState);
    
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
      '.results',
      '.marketplace_filters',
      '#page_aside',
      '.filters'
    ];
    
    console.log('=== ELEMENT ANALYSIS ===');
    commonElements.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
        if (elements.length === 1) {
          console.log(`   Element classes: ${elements[0].className}`);
        }
      } else {
        console.log(`❌ No elements found with selector: ${selector}`);
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
      sellerLinks.slice(0, 5).forEach(link => {
        console.log(`- "${link.textContent.trim()}" (${link.href})`);
      });
    }
    
    // Check for any text that might indicate listings
    const allText = document.body.innerText;
    const hasListings = allText.includes('$') || allText.includes('€') || allText.includes('£');
    console.log(`Page contains currency symbols: ${hasListings}`);
    
    // Look for common listing indicators
    const listingIndicators = ['price', 'seller', 'condition', 'shipping', 'buy', 'add to cart'];
    listingIndicators.forEach(indicator => {
      const found = allText.toLowerCase().includes(indicator);
      console.log(`Page contains "${indicator}": ${found}`);
    });
  }

  function testSelectors() {
    console.log('=== TESTING LISTING SELECTORS ===');
    
    const listingSelectors = [
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
      '.shop-item',
      'tr',
      'div[class*="row"]',
      'div[class*="card"]'
    ];
    
    listingSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✅ ${selector}: ${elements.length} elements`);
        if (elements.length <= 3) {
          elements.forEach((el, i) => {
            console.log(`   Element ${i}: classes="${el.className}", text="${el.textContent.substring(0, 50)}..."`);
          });
        }
      } else {
        console.log(`❌ ${selector}: 0 elements`);
      }
    });
  }

  function testSellerDetection() {
    console.log('=== TESTING SELLER DETECTION ===');
    
    const sellerSelectors = [
      'a.seller_info strong',
      'a.seller_info',
      '.seller_info a',
      '.seller_name',
      '.seller-name',
      '[data-seller]',
      '.seller a',
      'a[href*="/seller/"]',
      'a[href*="/user/"]'
    ];
    
    sellerSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✅ ${selector}: ${elements.length} elements`);
        elements.slice(0, 3).forEach((el, i) => {
          console.log(`   Element ${i}: "${el.textContent.trim()}"`);
        });
      } else {
        console.log(`❌ ${selector}: 0 elements`);
      }
    });
  }

  // Run all debug functions
  function runDebugAnalysis() {
    console.log('🚀 Starting comprehensive debug analysis...');
    debugPageStructure();
    testSelectors();
    testSellerDetection();
    console.log('✅ Debug analysis complete!');
  }

  // Run immediately and also after a delay
  runDebugAnalysis();
  setTimeout(runDebugAnalysis, 2000);
  setTimeout(runDebugAnalysis, 5000);

  // Also run when DOM changes
  const observer = new MutationObserver(() => {
    console.log('🔄 DOM changed, re-running debug analysis...');
    setTimeout(runDebugAnalysis, 1000);
  });
  
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });

})();
