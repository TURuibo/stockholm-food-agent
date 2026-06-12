// Geo helpers shared across scripts. Home base = Sundbyberg, Stockholm.
export const HOME = { name: "Sundbyberg", lat: 59.3614, lng: 17.9710 };

// Haversine distance in km between two {lat,lng} points.
export function distanceKm(a, b) {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

// Distance from home (Sundbyberg) to a place; null if no coords.
export function distanceFromHome(place) {
  return distanceKm(HOME, place);
}
