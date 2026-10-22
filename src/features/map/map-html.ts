import { Colors } from '@/constants/theme';

export type MapArtist = {
  id: number;
  username: string;
  name: string;
  avatarUrl: string | null;
  lat: number;
  lng: number;
  /** Two-letter code, or null when unknown. */
  country: string | null;
  countryName: string | null;
  state: number | null;
  stateName: string | null;
};

/** What the page sends back to the app. */
export type MapMessage = { type: 'open'; username: string } | { type: 'ready' };

/**
 * The website's map search (resources/js/lightpainters.js, lpArtistMap) as one HTML page:
 * Leaflet over the site's tiles. Rules, as on the website (Dan, 2026-10-18):
 *   - the opening view is the whole world (zoom 2), and no one zooms out past it;
 *   - each country is ONE gold bubble with its count, at the median of its artists;
 *   - the USA, Canada and Australia split into state bubbles from zoom 3;
 *   - every country shows its artists' round avatars from zoom 5;
 *   - a bubble zooms to its artists; an avatar opens a card that links to the profile.
 * The page talks to the app with postMessage (a WebView on phones, an iframe on web), and
 * the app calls window.lpReset() for Reset.
 */
export function buildMapHtml({ artists, tileUrl, attribution }: { artists: MapArtist[]; tileUrl: string; attribution: string }) {
  // Safe inside <script>: no "</script>" can close it early.
  const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; background: ${Colors.background}; }
  .leaflet-container { background: #1b1d33; font: 14px/1.4 system-ui, -apple-system, sans-serif; }
  .lp-card { display: flex; align-items: center; gap: 10px; min-width: 180px; }
  .lp-card img { width: 44px; height: 44px; border-radius: 9999px; object-fit: cover; border: 2px solid ${Colors.gold}; background: ${Colors.background}; }
  .lp-card b { display: block; color: #14162C; font-size: 15px; }
  .lp-card button { margin-top: 4px; padding: 6px 12px; border: 0; border-radius: 9999px; background: ${Colors.gold}; color: ${Colors.onGold}; font: 600 13px system-ui, sans-serif; }
  .lp-map-country, .lp-map-marker { background: none; border: 0; }
</style>
</head>
<body>
<div id="map" role="application" aria-label="Map of artists"></div>
<script>
(function () {
  var data = ${json(artists)};
  var send = function (message) {
    var text = JSON.stringify(message);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
    else if (window.parent !== window) window.parent.postMessage(text, '*');
  };

  var WORLD_ZOOM = 2;
  var WORLD_CENTRE = [30, 0];
  var map = L.map('map', { worldCopyJump: true, minZoom: WORLD_ZOOM, zoomControl: true }).setView(WORLD_CENTRE, WORLD_ZOOM);
  window.lpReset = function () { map.closePopup(); map.setView(WORLD_CENTRE, WORLD_ZOOM); };
  L.tileLayer(${json(tileUrl)}, { attribution: ${json(attribution)}, maxZoom: 19 }).addTo(map);

  var BIG = { regionsFrom: 3, avatarsFrom: 5 };
  var RULES = { US: BIG, CA: BIG, AU: BIG };
  var DEFAULT_RULE = { regionsFrom: null, avatarsFrom: 5 };

  var median = function (values) {
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  var escape = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };

  // A count bubble at the median of its artists (an outlier does not drag it into the sea).
  var bubble = function (name, artists) {
    var points = artists.map(function (a) { return [a.lat, a.lng]; });
    var count = points.length;
    var size = Math.round(Math.min(64, 26 + Math.sqrt(count) * 4.5));
    var icon = L.divIcon({
      className: 'lp-map-country',
      html: '<span style="display:flex;align-items:center;justify-content:center;width:' + size + 'px;height:' + size + 'px;border-radius:9999px;background:${Colors.gold};color:${Colors.onGold};font:600 ' + (size > 40 ? 14 : 12) + 'px/1 system-ui,sans-serif;border:2px solid ${Colors.onGold};box-shadow:0 2px 6px rgb(0 0 0/.35)">' + count + '</span>',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    var where = [median(points.map(function (p) { return p[0]; })), median(points.map(function (p) { return p[1]; }))];
    return L.marker(where, { icon: icon, title: name + ': ' + count, riseOnHover: true })
      .on('click', function () { map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 9 }); });
  };

  var avatar = function (artist) {
    var icon = L.divIcon({
      className: 'lp-map-marker',
      html: '<img src="' + escape(artist.avatarUrl || '') + '" alt="" style="width:36px;height:36px;border-radius:9999px;border:2px solid ${Colors.gold};object-fit:cover;background:${Colors.background}">',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    var card = document.createElement('div');
    card.className = 'lp-card';
    card.innerHTML = '<img src="' + escape(artist.avatarUrl || '') + '" alt=""><div><b>' + escape(artist.name) + '</b>' +
      '<button type="button">View profile</button></div>';
    card.querySelector('button').addEventListener('click', function () { send({ type: 'open', username: artist.username }); });
    return L.marker([artist.lat, artist.lng], { icon: icon, title: artist.name }).bindPopup(card, { closeButton: false });
  };

  var countries = new Map();
  data.forEach(function (artist) {
    var code = artist.country || '?';
    if (!countries.has(code)) {
      var rule = RULES[code] || {};
      countries.set(code, {
        name: artist.countryName || artist.country || 'Elsewhere',
        artists: [],
        regionsFrom: 'regionsFrom' in rule ? rule.regionsFrom : DEFAULT_RULE.regionsFrom,
        avatarsFrom: rule.avatarsFrom || DEFAULT_RULE.avatarsFrom,
      });
    }
    countries.get(code).artists.push(artist);
  });

  countries.forEach(function (c) {
    c.bubble = bubble(c.name, c.artists);
    c.people = L.layerGroup(c.artists.map(avatar));
    c.regions = L.layerGroup();
    if (c.regionsFrom !== null) {
      var byState = new Map();
      c.artists.forEach(function (artist) {
        var key = artist.state == null ? 'none' : artist.state;
        if (!byState.has(key)) byState.set(key, { name: artist.stateName || c.name, artists: [] });
        byState.get(key).artists.push(artist);
      });
      byState.forEach(function (s) { c.regions.addLayer(bubble(s.name, s.artists)); });
    }
  });

  var show = function () {
    var zoom = map.getZoom();
    countries.forEach(function (c) {
      var stage = zoom >= c.avatarsFrom ? 'people' : (c.regionsFrom !== null && zoom >= c.regionsFrom ? 'regions' : 'bubble');
      ['bubble', 'regions', 'people'].forEach(function (layer) {
        if (layer === stage) map.addLayer(c[layer]); else map.removeLayer(c[layer]);
      });
    });
  };
  map.on('zoomend', show);
  show();
  send({ type: 'ready' });
})();
</script>
</body>
</html>`;
}
