// Point-level primitives: coordinate access, validation, haversine distance,
// projecting a point onto a segment, and small conversion helpers.

export function lat(point) {
  return Array.isArray(point) ? point[0] : point.lat
}

export function lng(point) {
  return Array.isArray(point) ? point[1] : point.lng
}

export function toRoutePoint(point) {
  return [lat(point), lng(point)]
}

export function isValidPoint(point) {
  return point && Number.isFinite(lat(point)) && Number.isFinite(lng(point))
}

export function isValidPath(path) {
  return Array.isArray(path) && path.length > 1 && path.every(isValidPoint)
}

export function haversineDistanceMeters(pointA, pointB) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180
  const earthRadiusMeters = 6371000
  const lat1 = lat(pointA)
  const lng1 = lng(pointA)
  const lat2 = lat(pointB)
  const lng2 = lng(pointB)

  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function nearestPointOnSegment(point, segmentStart, segmentEnd) {
  const referenceLat = (lat(segmentStart) + lat(segmentEnd) + lat(point)) / 3
  const metersPerDegreeLat = 111320
  const metersPerDegreeLng = 111320 * Math.cos((referenceLat * Math.PI) / 180)

  const px = (lng(point) - lng(segmentStart)) * metersPerDegreeLng
  const py = (lat(point) - lat(segmentStart)) * metersPerDegreeLat
  const sx = 0
  const sy = 0
  const ex = (lng(segmentEnd) - lng(segmentStart)) * metersPerDegreeLng
  const ey = (lat(segmentEnd) - lat(segmentStart)) * metersPerDegreeLat
  const dx = ex - sx
  const dy = ey - sy
  const lengthSquared = dx * dx + dy * dy
  const ratio =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSquared))

  return [
    lat(segmentStart) + (lat(segmentEnd) - lat(segmentStart)) * ratio,
    lng(segmentStart) + (lng(segmentEnd) - lng(segmentStart)) * ratio
  ]
}

export function distancePointToSegmentMeters(point, segmentStart, segmentEnd) {
  return haversineDistanceMeters(
    point,
    nearestPointOnSegment(point, segmentStart, segmentEnd)
  )
}

export function pointToLatLngObject(point) {
  if (!point) return null
  return { lat: lat(point), lng: lng(point) }
}

export function pathToRoutePoints(path) {
  return path.map(toRoutePoint)
}
