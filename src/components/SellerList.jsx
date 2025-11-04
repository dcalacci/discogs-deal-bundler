import { h } from 'preact';
import { useState } from 'preact/hooks';

export default function SellerList({ analysisResult, onSellerToggle, selectedSellers }) {
  const [expandedSellers, setExpandedSellers] = useState(new Set());

  if (!analysisResult || !Array.isArray(analysisResult.sellers)) {
    return (
      <div id="sellers-list" className="max-h-[400px] overflow-y-auto overflow-x-hidden" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <div className="text-xs text-black p-2">No seller data available. Click "Analyze Sellers" to fetch data.</div>
      </div>
    );
  }

  const isOptimization = analysisResult.isOptimization;
  const summary = analysisResult.summary;

  // Sort sellers by number of items (descending - most items first)
  const sortedSellers = [...analysisResult.sellers].sort((a, b) => {
    const countA = a.count || a.itemCount || 0;
    const countB = b.count || b.itemCount || 0;
    return countB - countA; // Descending order
  });

  const toggleSeller = (seller) => {
    const newExpanded = new Set(expandedSellers);
    if (newExpanded.has(seller)) {
      newExpanded.delete(seller);
    } else {
      newExpanded.add(seller);
    }
    setExpandedSellers(newExpanded);
  };

  return (
    <div id="sellers-list" className="max-h-[400px] overflow-y-auto overflow-x-hidden" style={{ maxHeight: '400px', overflowY: 'auto' }}>
      {isOptimization && summary && (
        <div className="bg-white border border-black p-2 mb-2">
          <div className="font-bold text-black mb-1">🎯 Best Deals Found</div>
          <div className="text-xs text-black">
            <div>Items: {summary.totalItems}</div>
            <div>Items Cost: ${summary.itemCost?.toFixed(2) || '0.00'}</div>
            <div>Shipping: ${summary.shippingCost?.toFixed(2) || '0.00'}</div>
            <div className="font-bold text-black">Total: ${summary.totalCost?.toFixed(2) || '0.00'}</div>
            {summary.efficiency && <div>Efficiency: {summary.efficiency.toFixed(2)} items per $</div>}
            {summary.remainingBudget !== undefined && (
              <div>Remaining Budget: ${summary.remainingBudget.toFixed(2)}</div>
            )}
          </div>
        </div>
      )}
      {sortedSellers.map((seller, idx) => {
        const isExpanded = expandedSellers.has(seller.seller);
        const isSelected = selectedSellers?.has(seller.seller) || false;

        return (
          <div key={idx} className="my-1.5 p-1.5 bg-white border border-black">
            <label className="flex flex-col justify-between items-start cursor-pointer px-1">
              <div className="flex flex-colitems-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSellerToggle(seller.seller)}
                  className="mr-2 cursor-pointer w-3.5 h-3.5 flex-shrink-0"
                />
                <span 
                  onClick={(e) => { e.preventDefault(); toggleSeller(seller.seller); }}
                  className="cursor-pointer"
                >
                  <strong>{idx + 1}. {seller.seller}</strong>{' '}
                  <span className="text-black">{seller.sellerRatings || ''}</span>
                </span>
              </div>
              <div className="flex flex-col items-start">
                <span className="mr-2">Items: {seller.count}</span>
                <span>Total: ${seller.totalPrice.toFixed(2)}</span>
              </div>
            </label>

            {isExpanded && seller.items && seller.items.length > 0 && (
              <div className="mt-2">
                <ul className="pl-4">
                  {seller.items.map((item, itemIdx) => {
                    const priceText = item.priceParsed?.amountUSD 
                      ? `$${item.priceParsed.amountUSD.toFixed(2)}` 
                      : item.price || '';
                    const shippingText = item.shippingParsed?.amountUSD 
                      ? `+ $${item.shippingParsed.amountUSD.toFixed(2)} shipping` 
                      : item.shipping ? `+ ${item.shipping}` : '';
                    
                    return (
                      <li key={itemIdx} className="text-xs mb-1">
                        <div className="font-bold mb-0.5">{item.release || '(untitled)'}</div>
                        <div className="text-black">
                          {priceText} {shippingText}
                        </div>
                        {item.listingId && (
                          <div className="flex gap-1 mt-1">
                            <a 
                              href={`https://www.discogs.com/sell/cart/?add=${item.listingId}`}
                              target="_blank"
                              className="border border-black px-1.5 py-0.5 text-[10px] font-bold no-underline"
                              style={{ background: '#000', color: '#fff' }}
                            >
                              Add to Cart
                            </a>
                            <a 
                              href={`https://www.discogs.com/sell/item/${item.listingId}`}
                              target="_blank"
                              className="border border-black px-1.5 py-0.5 text-[10px] font-bold no-underline"
                              style={{ background: '#fff', color: '#000' }}
                            >
                              View
                            </a>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

