import { h } from 'preact';
import { useState } from 'preact/hooks';
import ConfigRow from './ConfigRow';
import BudgetRow from './BudgetRow';
import SellerList from './SellerList';

export default function FilterContainer({ 
  onRefresh, 
  onAnalyze, 
  onSettings,
  onOptimize,
  analysisResult,
  onSellerToggle,
  selectedSellers,
  isAnalyzing
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div id="seller-filter-container" className="bg-white border-2 border-black p-2.5 mb-4">
      <h3 
        className={`m-0 mb-2.5 pb-2 border-b-2 border-black text-sm font-bold uppercase text-black cursor-pointer ${!isExpanded ? 'opacity-70' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        Filter by Seller
        <button 
          className="float-right border border-black px-1.5 py-0.5 text-[11px] cursor-pointer ml-1.5"
          style={{ background: '#fff', color: '#000' }}
          onClick={(e) => { e.stopPropagation(); onRefresh(); }}
          title="Refresh filter (click if new items were loaded)"
        >
          🔄
        </button>
        <button 
          className="float-right border border-black px-1.5 py-0.5 text-[11px] cursor-pointer ml-1.5"
          style={{ background: '#fff', color: '#000' }}
          onClick={(e) => { e.stopPropagation(); onSettings(); }}
          title="Configure analysis server URL and Discogs API token"
        >
          ⚙️
        </button>
        <button 
          className="float-right border border-black px-2 py-0.5 text-[11px] cursor-pointer ml-1.5 disabled:opacity-50"
          style={{ background: '#000', color: '#fff' }}
          onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
          disabled={isAnalyzing}
          title="Send scraped listings to analysis server"
        >
          Analyze Sellers
          {isAnalyzing && (
            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent animate-spin ml-1.5" />
          )}
        </button>
      </h3>

      <ConfigRow />
      <BudgetRow onOptimize={onOptimize} />

      {isExpanded && (
        <SellerList 
          analysisResult={analysisResult}
          onSellerToggle={onSellerToggle}
          selectedSellers={selectedSellers}
        />
      )}
    </div>
  );
}

