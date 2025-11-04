import { useState } from 'preact/hooks';
import { getConfiguredApiToken, getConfiguredServerUrl, setConfiguredApiToken } from '../utils/storage';
import { scrapeAllPages } from '../utils/pageScraping';

export function useAnalysis() {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState(null);

  const analyze = async () => {
    setIsAnalyzing(true);
    setMessage('Analyzing sellers...');
    
    try {
      let token = getConfiguredApiToken();
      if (!token) {
        token = prompt('Enter your Discogs API token:');
        if (!token) {
          setIsAnalyzing(false);
          return;
        }
        setConfiguredApiToken(token.trim());
      }

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
        setMessage('Analysis failed: ' + (json.error || resp.status));
        setIsAnalyzing(false);
        return;
      }
      
      console.log('Analysis result:', json);
      setAnalysisResult(json);
      setMessage('Analysis complete');
      setIsAnalyzing(false);
    } catch (err) {
      console.error(err);
      setMessage('Analysis request failed');
      setIsAnalyzing(false);
    }
  };

  return { analysisResult, setAnalysisResult, isAnalyzing, message, analyze };
}

