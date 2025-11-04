import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import FilterContainer from './components/FilterContainer';
import { injectTailwind, findSidebar, showListingsByIds, showAllListings } from './utils/dom';
import { useAnalysis } from './hooks/useAnalysis';
import { getConfiguredServerUrl, getConfiguredApiToken, setConfiguredServerUrl, setConfiguredApiToken, getIgnoredReleases } from './utils/storage';
import { scrapeAllPages, selectShowItems250 } from './utils/pageScraping';
import { transformOptimizationResults } from './utils/transformResults';

// Main extension logic
function App() {
  const [selectedSellers, setSelectedSellers] = useState(new Set());
  const { analysisResult, setAnalysisResult, isAnalyzing, message, analyze } = useAnalysis();

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered by user');
    // Force reanalysis if needed
    window.location.reload();
  };

  const handleAnalyze = async () => {
    await analyze();
  };

  const handleSettings = () => {
    const currentUrl = getConfiguredServerUrl();
    const newUrl = prompt('Analysis server URL:', currentUrl);
    if (newUrl && newUrl.trim()) setConfiguredServerUrl(newUrl.trim());
    
    const currentToken = getConfiguredApiToken();
    const newToken = prompt('Discogs API token (will be stored locally):', currentToken);
    if (newToken !== null) setConfiguredApiToken((newToken || '').trim());
    alert('Configuration saved.');
  };

  const handleSellerToggle = (seller) => {
    const newSet = new Set(selectedSellers);
    if (newSet.has(seller)) {
      newSet.delete(seller);
    } else {
      newSet.add(seller);
    }
    setSelectedSellers(newSet);
    applySellerFilter(newSet);
  };

  const applySellerFilter = (sellers) => {
    if (!analysisResult || !Array.isArray(analysisResult.sellers)) {
      showAllListings();
      return;
    }
    if (!sellers || sellers.size === 0) {
      showAllListings();
      return;
    }
    
    const ids = new Set();
    analysisResult.sellers.forEach(s => {
      if (sellers.has(s.seller)) {
        (s.items || []).forEach(it => ids.add(String(it.listingId)));
      }
    });
    
    if (ids.size === 0) {
      showAllListings();
    } else {
      showListingsByIds(ids);
    }
  };

  const handleOptimize = async (budget) => {
    const apiToken = getConfiguredApiToken();
    const serverUrl = getConfiguredServerUrl();

    if (!apiToken) {
      alert('Discogs API Token is not set. Please enter it in the sidebar settings.');
      return;
    }
    if (!serverUrl) {
      alert('Analysis Server URL is not set. Please enter it in the sidebar settings.');
      return;
    }

    try {
      await selectShowItems250();
      const allScrapedListings = await scrapeAllPages();

      if (allScrapedListings.length === 0) {
        alert('No listings found after scraping all pages.');
        return;
      }

      const ignoredReleases = getIgnoredReleases();
      
      const response = await fetch(`${serverUrl}/optimize-fast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: apiToken, 
          listings: allScrapedListings, 
          budget: parseFloat(budget),
          ignoredReleases: ignoredReleases
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const optimizationResults = await response.json();
      console.log('🎯 Optimization Results from server:', optimizationResults);
      
      // Transform optimization results to match analysis format
      const transformedResults = transformOptimizationResults(optimizationResults);
      if (transformedResults) {
        setAnalysisResult(transformedResults);
      } else {
        console.error('Failed to transform optimization results');
      }
    } catch (error) {
      console.error('Error during optimization flow:', error);
      alert(`Optimization failed: ${error.message}`);
    }
  };

  return (
    <div>
      {message && (
        <div id="seller-filter-message" className="bg-white text-black border-2 border-black p-2 my-2.5 text-xs">
          {message}
        </div>
      )}
      <FilterContainer
        onRefresh={handleRefresh}
        onAnalyze={handleAnalyze}
        onSettings={handleSettings}
        onOptimize={handleOptimize}
        analysisResult={analysisResult}
        onSellerToggle={handleSellerToggle}
        selectedSellers={selectedSellers}
        isAnalyzing={isAnalyzing}
      />
    </div>
  );
}

// Initialize extension
function init() {
  if (!window.location.href.includes('discogs.com/shop/mywants')) {
    return;
  }

  injectTailwind();

  // Wait for Tailwind to load
  setTimeout(() => {
    const sidebar = findSidebar();
    if (!sidebar) {
      console.log('Could not find sidebar to inject filter');
      setTimeout(init, 1000);
      return;
    }

    // Remove existing container if present
    const existing = document.getElementById('seller-filter-container');
    if (existing) existing.remove();

    // Create mount point
    const container = document.createElement('div');
    container.id = 'seller-filter-root';
    sidebar.insertBefore(container, sidebar.firstChild);

    // Render Preact app
    render(<App />, container);
    
    console.log('Seller filter ready. Use Analyze Sellers to fetch data.');
  }, 500);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Handle navigation changes (SPA)
let lastUrl = location.href;
const mutationObserver = new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(init, 1000);
  }
});

mutationObserver.observe(document, { 
  subtree: true, 
  childList: true,
  attributes: true
});

