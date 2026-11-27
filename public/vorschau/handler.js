// Logik des Vorschau-Service-Workers (reine Funktionen). Klassisches Skript: sw.js laedt es per
// importScripts, die Tests per import. Kein Netzwerkzugriff, nur der Cache `zdl-vorschau`.
(function (root) {
  // Kein api.github.com: Code in der Vorschau kann keinen Zugangsschluessel an GitHub schicken.
  var CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
    "font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'none'; object-src 'none'; frame-ancestors 'none'";
  var NOT_FOUND = 'Diese Datei ist in der Vorschau nicht enthalten.';

  function inScope(url, scope) {
    return String(url).indexOf(scope) === 0;
  }

  function withHeaders(body, status, base) {
    var headers = new Headers(base);
    headers.set('Content-Security-Policy', CSP);
    headers.set('Cache-Control', 'no-store');
    return new Response(body, { status: status, headers: headers });
  }

  // null = nicht zustaendig (ausserhalb des Scopes oder keine Lese-Anfrage), sonst eine Response.
  async function respond(request, scope, cache) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return null;
    if (!inScope(request.url, scope)) return null;
    var u = new URL(request.url);
    var key = u.origin + u.pathname;
    if (key.charAt(key.length - 1) === '/') key += 'index.html';
    var hit = await cache.match(key);
    if (!hit) {
      return withHeaders(NOT_FOUND, 404, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    return withHeaders(hit.body, 200, hit.headers);
  }

  root.zdlPreview = { CSP: CSP, inScope: inScope, respond: respond };
})(typeof self !== 'undefined' ? self : globalThis);
