// Storage utilities
export function getConfiguredServerUrl() {
  return (
    localStorage.getItem('discogs-analysis-server-url') ||
    'https://35559c0548fd.ngrok.app'
  );
}

export function getConfiguredApiToken() {
  return localStorage.getItem('discogs-api-token') || '';
}

export function setConfiguredServerUrl(url) {
  localStorage.setItem('discogs-analysis-server-url', url);
}

export function setConfiguredApiToken(token) {
  localStorage.setItem('discogs-api-token', token);
}

export function getIgnoredReleases() {
  const ignored = localStorage.getItem('discogs-ignored-releases');
  return ignored ? JSON.parse(ignored) : [];
}

export function saveIgnoredReleases(releases) {
  localStorage.setItem('discogs-ignored-releases', JSON.stringify(releases));
}

