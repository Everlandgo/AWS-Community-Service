export function getStoredTokens() {
  try { return JSON.parse(localStorage.getItem('cognitoTokens') || '{}'); }
  catch { return {}; }
}

export function pickBearer() {
  const { idToken, accessToken } = getStoredTokens();
  return idToken || accessToken || localStorage.getItem('backendAccessToken') || null;
}

export function authHeader() {
  const token = pickBearer();
  return token ? { Authorization: `Bearer ${token}` } : {};
}