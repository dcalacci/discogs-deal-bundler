import { h } from 'preact';
import { useState } from 'preact/hooks';

export default function BudgetRow({ onOptimize }) {
  const [budget, setBudget] = useState(100);
  const [isLoading, setIsLoading] = useState(false);

  const handleOptimize = async () => {
    setIsLoading(true);
    try {
      await onOptimize(budget);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="my-2 p-2 bg-white border border-black">
      <div className="font-bold mb-1.5 text-xs text-black">Budget Optimization</div>
      <div className="flex flex-col items-center gap-2 mb-1.5">
        <input
          type="range"
          min="10"
          max="1000"
          value={budget}
          step="10"
          onInput={(e) => setBudget(e.target.value)}
          className="flex-1"
        />
        <span className="font-bold min-w-[40px] text-right text-black">
          ${budget}
        </span>
        <button
          onClick={handleOptimize}
          disabled={isLoading}
          className="border border-black px-2 py-1 cursor-pointer text-[11px] disabled:opacity-50"
          style={{ background: '#000', color: '#fff' }}
        >
          🎯 Find Best Deals
          {isLoading && (
            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent animate-spin ml-1.5" />
          )}
        </button>
      </div>
    </div>
  );
}

