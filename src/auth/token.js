const KEY = 'cms.token';

export function loadToken() {
  return sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY);
}

export function saveToken(token, remember) {
  clearToken();
  (remember ? localStorage : sessionStorage).setItem(KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(KEY);
  localStorage.removeItem(KEY);
}
