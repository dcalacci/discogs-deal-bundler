import { h } from 'preact';
import { useState } from 'preact/hooks';
import { getConfiguredServerUrl, getConfiguredApiToken, setConfiguredServerUrl, setConfiguredApiToken } from '../utils/storage';

export default function ConfigRow() {
  const [serverUrl, setServerUrl] = useState(getConfiguredServerUrl());
  const [apiToken, setApiToken] = useState(getConfiguredApiToken());

  const handleSave = () => {
    setConfiguredServerUrl(serverUrl.trim());
    setConfiguredApiToken(apiToken.trim());
  };

  return (
    <div className="my-2 flex gap-1.5 items-center flex-wrap">
      <input
        type="text"
        placeholder="Server URL"
        value={serverUrl}
        onInput={(e) => setServerUrl(e.target.value)}
        className="flex-1 min-w-[220px] px-1.5 py-1 border border-black"
      />
      <input
        type="text"
        placeholder="Discogs API token"
        value={apiToken}
        onInput={(e) => setApiToken(e.target.value)}
        className="flex-1 min-w-[220px] px-1.5 py-1 border border-black"
      />
      <button
        onClick={handleSave}
        className="border border-black px-2 py-1 cursor-pointer text-[11px]"
        style={{ background: '#000', color: '#fff' }}
      >
        Save
      </button>
    </div>
  );
}

