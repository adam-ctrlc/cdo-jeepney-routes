export const MAX_WALK_TO_ROUTE_METERS = 500
export const MAX_TRANSFER_WALK_METERS = 300
export const WALK_WEIGHT = 1.5
export const RIDE_WEIGHT = 1.0
export const TRANSFER_WALK_WEIGHT = 2.0
export const TRANSFER_PENALTY_METERS = 1200
export const MAX_DIRECT_RESULTS = 5
export const MAX_TRANSFER_RESULTS = 5
export const WALKABLE_DISTANCE_METERS = 700
export const VERY_SHORT_DISTANCE_METERS = 300
const TRANSFER_PATH_SIMPLIFY_METERS = 80
const MAX_NEARBY_TRANSFER_PATHS = 14

const routePathOptionsCache = new WeakMap()
const nearestPointPathCache = new WeakMap()
const simplifiedPathCache = new WeakMap()
const closestPathCache = new Map()
let nextPathId = 1

function lat(point) {
  return Array.isArray(point) ? point[0] : point.lat
}

function lng(point) {
  return Array.isArray(point) ? point[1] : point.lng
}

function toRoutePoint(point) {
  return [lat(point), lng(point)]
}

function isValidPoint(point) {
  return (
    point &&
    Number.isFinite(lat(point)) &&
    Number.isFinite(lng(point))
  )
}

function isValidPath(path) {
  return Array.isArray(path) && path.length > 1 && path.every(isValidPoint)
}

function pathDistanceMeters(path) {
  let distance = 0
  for (let index = 1; index < path.length; index += 1) {
    distance += haversineDistanceMeters(path[index - 1], path[index])
  }
  return distance
}

function getPathId(path) {
  if (!Object.prototype.hasOwnProperty.call(path, '__routePathId')) {
    Object.defineProperty(path, '__routePathId', {
      value: nextPathId,
      enumerable: false
    })
    nextPathId += 1
  }
  return path.__routePathId
}

function simplifyPathByDistance(path, minDistanceMeters = TRANSFER_PATH_SIMPLIFY_METERS) {
  if (!isValidPath(path)) return path
  if (simplifiedPathCache.has(path)) return simplifiedPathCache.get(path)

  const simplified = [path[0]]
  let lastKept = path[0]

  for (let index = 1; index < path.length - 1; index += 1) {
    if (haversineDistanceMeters(lastKept, path[index]) >= minDistanceMeters) {
      simplified.push(path[index])
      lastKept = path[index]
    }
  }

  simplified.push(path[path.length - 1])
  simplifiedPathCache.set(path, simplified)
  return simplified
}

function pathBounds(path) {
  return path.reduce(
    (bounds, point) => ({
      minLat: Math.min(bounds.minLat, lat(point)),
      maxLat: Math.max(bounds.maxLat, lat(point)),
      minLng: Math.min(bounds.minLng, lng(point)),
      maxLng: Math.max(bounds.maxLng, lng(point))
    }),
    {
      minLat: Infinity,
      maxLat: -Infinity,
      minLng: Infinity,
      maxLng: -Infinity
    }
  )
}

function distanceBetweenBoundsMeters(boundsA, boundsB) {
  const closestLatA = Math.max(boundsA.minLat, Math.min(boundsB.minLat, boundsA.maxLat))
  const closestLngA = Math.max(boundsA.minLng, Math.min(boundsB.minLng, boundsA.maxLng))
  const closestLatB = Math.max(boundsB.minLat, Math.min(boundsA.minLat, boundsB.maxLat))
  const closestLngB = Math.max(boundsB.minLng, Math.min(boundsA.minLng, boundsB.maxLng))

  if (
    boundsA.minLat <= boundsB.maxLat &&
    boundsA.maxLat >= boundsB.minLat &&
    boundsA.minLng <= boundsB.maxLng &&
    boundsA.maxLng >= boundsB.minLng
  ) {
    return 0
  }

  return haversineDistanceMeters(
    [closestLatA, closestLngA],
    [closestLatB, closestLngB]
  )
}

function routePathOptions(route) {
  if (routePathOptionsCache.has(route)) return routePathOptionsCache.get(route)

  const options = []
  const hasExplicitDirections =
    isValidPath(route.inboundPath) || isValidPath(route.outboundPath)

  if (isValidPath(route.inboundPath)) {
    options.push({ route, routeId: route.id, direction: 'Inbound', path: route.inboundPath })
  }

  if (isValidPath(route.outboundPath)) {
    options.push({ route, routeId: route.id, direction: 'Outbound', path: route.outboundPath })
  }

  if (!hasExplicitDirections && isValidPath(route.paths?.inbound)) {
    options.push({ route, routeId: route.id, direction: 'Inbound', path: route.paths.inbound })
  }

  if (!hasExplicitDirections && isValidPath(route.paths?.outbound)) {
    options.push({ route, routeId: route.id, direction: 'Outbound', path: route.paths.outbound })
  }

  if (options.length === 0 && isValidPath(route.path)) {
    options.push({ route, routeId: route.id, direction: 'Route', path: route.path })
  }

  const enrichedOptions = options.map((option) => {
    const transferPath = simplifyPathByDistance(option.path)
    return {
      ...option,
      transferPath,
      transferBounds: pathBounds(transferPath)
    }
  })

  routePathOptionsCache.set(route, enrichedOptions)
  return enrichedOptions
}

export function getRoutePathOptions(route) {
  return routePathOptions(route)
}

export function hasValidRouteGeometry(route) {
  return Boolean(route?.id && route?.name && routePathOptions(route).length > 0)
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
  const metersPerDegreeLng =
    111320 * Math.cos((referenceLat * Math.PI) / 180)

  const px = (lng(point) - lng(segmentStart)) * metersPerDegreeLng
  const py = (lat(point) - lat(segmentStart)) * metersPerDegreeLat
  const sx = 0
  const sy = 0
  const ex = (lng(segmentEnd) - lng(segmentStart)) * metersPerDegreeLng
  const ey = (lat(segmentEnd) - lat(segmentStart)) * metersPerDegreeLat
  const dx = ex - sx
  const dy = ey - sy
  const lengthSquared = dx * dx + dy * dy
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSquared))

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

export function getNearestPointOnPath(point, path) {
  if (!isValidPath(path)) return null

  const cacheKey = `${lat(point).toFixed(6)},${lng(point).toFixed(6)}`
  let pathCache = nearestPointPathCache.get(path)
  if (!pathCache) {
    pathCache = new Map()
    nearestPointPathCache.set(path, pathCache)
  }
  if (pathCache.has(cacheKey)) return pathCache.get(cacheKey)

  let best = null
  let distanceBeforeSegment = 0

  for (let index = 0; index < path.length - 1; index += 1) {
    const segmentStart = path[index]
    const segmentEnd = path[index + 1]
    const nearestPoint = nearestPointOnSegment(point, segmentStart, segmentEnd)
    const distanceMeters = haversineDistanceMeters(point, nearestPoint)
    const segmentStartToNearest = haversineDistanceMeters(segmentStart, nearestPoint)

    if (!best || distanceMeters < best.distanceMeters) {
      best = {
        point: nearestPoint,
        distanceMeters,
        index,
        segmentIndex: index,
        positionAlongPathMeters: distanceBeforeSegment + segmentStartToNearest
      }
    }

    distanceBeforeSegment += haversineDistanceMeters(segmentStart, segmentEnd)
  }

  pathCache.set(cacheKey, best)
  return best
}

export function distancePointToPathMeters(point, path) {
  return getNearestPointOnPath(point, path)?.distanceMeters ?? Infinity
}

export function getPathDistanceBetweenIndexes(path, startIndex, endIndex) {
  if (!isValidPath(path) || endIndex <= startIndex) return 0

  let distance = 0
  const lastIndex = Math.min(endIndex, path.length - 1)
  for (let index = Math.max(0, startIndex + 1); index <= lastIndex; index += 1) {
    distance += haversineDistanceMeters(path[index - 1], path[index])
  }
  return distance
}

export function getClosestPointsBetweenPaths(pathA, pathB) {
  if (!isValidPath(pathA) || !isValidPath(pathB)) return null
  const pathAId = getPathId(pathA)
  const pathBId = getPathId(pathB)
  const cacheKey = `${pathAId}:${pathBId}`
  if (closestPathCache.has(cacheKey)) return closestPathCache.get(cacheKey)

  function segmentCandidate(indexA, indexB) {
    const segmentAStart = pathA[indexA]
    const segmentAEnd = pathA[indexA + 1]
    const segmentBStart = pathB[indexB]
    const segmentBEnd = pathB[indexB + 1]
    const candidateOnB = nearestPointOnSegment(segmentAStart, segmentBStart, segmentBEnd)
    const candidateOnA = nearestPointOnSegment(candidateOnB, segmentAStart, segmentAEnd)
    const candidateOnBRefined = nearestPointOnSegment(candidateOnA, segmentBStart, segmentBEnd)

    return {
      pointA: candidateOnA,
      pointB: candidateOnBRefined,
      distanceMeters: haversineDistanceMeters(candidateOnA, candidateOnBRefined),
      indexA,
      indexB
    }
  }

  let best = null

  const segmentCountA = pathA.length - 1
  const segmentCountB = pathB.length - 1
  const strideA = Math.max(1, Math.floor(segmentCountA / 100))
  const strideB = Math.max(1, Math.floor(segmentCountB / 100))

  for (let indexA = 0; indexA < segmentCountA; indexA += strideA) {
    for (let indexB = 0; indexB < segmentCountB; indexB += strideB) {
      const candidate = segmentCandidate(indexA, indexB)
      if (!best || candidate.distanceMeters < best.distanceMeters) best = candidate
    }
  }

  const refineRadiusA = Math.max(4, strideA + 2)
  const refineRadiusB = Math.max(4, strideB + 2)
  const startA = Math.max(0, best.indexA - refineRadiusA)
  const endA = Math.min(segmentCountA - 1, best.indexA + refineRadiusA)
  const startB = Math.max(0, best.indexB - refineRadiusB)
  const endB = Math.min(segmentCountB - 1, best.indexB + refineRadiusB)

  for (let indexA = startA; indexA <= endA; indexA += 1) {
    for (let indexB = startB; indexB <= endB; indexB += 1) {
      const candidate = segmentCandidate(indexA, indexB)
      if (candidate.distanceMeters < best.distanceMeters) best = candidate
    }
  }

  const result = {
    ...best,
    positionA: getNearestPointOnPath(best.pointA, pathA)?.positionAlongPathMeters ?? 0,
    positionB: getNearestPointOnPath(best.pointB, pathB)?.positionAlongPathMeters ?? 0
  }

  closestPathCache.set(cacheKey, result)
  return result
}

export function findRoutesNearPoint(routes, point, maxDistanceMeters) {
  const results = []

  for (const route of routes) {
    for (const pathOption of routePathOptions(route)) {
      const nearest = getNearestPointOnPath(point, pathOption.path)
      if (nearest && nearest.distanceMeters <= maxDistanceMeters) {
        results.push({ ...pathOption, nearest })
      }
    }
  }

  return results.sort((a, b) => a.nearest.distanceMeters - b.nearest.distanceMeters)
}

function distanceBetweenSnappedPoints(path, startSnap, endSnap) {
  if (!startSnap || !endSnap) return null
  if (endSnap.positionAlongPathMeters <= startSnap.positionAlongPathMeters) return null
  if (startSnap.segmentIndex === endSnap.segmentIndex) {
    return haversineDistanceMeters(startSnap.point, endSnap.point)
  }

  const wholeSegmentsMeters = getPathDistanceBetweenIndexes(
    path,
    startSnap.segmentIndex + 1,
    endSnap.segmentIndex
  )
  const startPartialMeters = haversineDistanceMeters(
    startSnap.point,
    path[startSnap.segmentIndex + 1]
  )
  const endPartialMeters = haversineDistanceMeters(
    path[endSnap.segmentIndex],
    endSnap.point
  )

  return Math.max(0, startPartialMeters + wholeSegmentsMeters + endPartialMeters)
}

function pathBetweenSnappedPoints(path, startSnap, endSnap) {
  if (!startSnap || !endSnap) return []
  if (endSnap.positionAlongPathMeters <= startSnap.positionAlongPathMeters) return []

  const middlePoints =
    startSnap.segmentIndex === endSnap.segmentIndex
      ? []
      : path.slice(startSnap.segmentIndex + 1, endSnap.segmentIndex + 1)

  return [startSnap.point, ...middlePoints, endSnap.point]
}

export function findDirectRouteCandidates(routes, startPoint, endPoint, options = {}) {
  const maxWalkToRouteMeters = options.maxWalkToRouteMeters ?? MAX_WALK_TO_ROUTE_METERS
  const maxResults = options.maxResults ?? MAX_DIRECT_RESULTS
  const walkWeight = options.walkWeight ?? WALK_WEIGHT
  const rideWeight = options.rideWeight ?? RIDE_WEIGHT
  const candidates = []

  for (const route of routes) {
    for (const pathOption of routePathOptions(route)) {
      const startSnap = getNearestPointOnPath(startPoint, pathOption.path)
      const endSnap = getNearestPointOnPath(endPoint, pathOption.path)
      if (!startSnap || !endSnap) continue
      if (
        startSnap.distanceMeters > maxWalkToRouteMeters ||
        endSnap.distanceMeters > maxWalkToRouteMeters
      ) continue

      const rideMeters = distanceBetweenSnappedPoints(pathOption.path, startSnap, endSnap)
      if (rideMeters === null) continue

      const score =
        startSnap.distanceMeters * walkWeight +
        rideMeters * rideWeight +
        endSnap.distanceMeters * walkWeight

      candidates.push({
        type: 'direct',
        route,
        routeId: route.id,
        direction: pathOption.direction,
        startWalkMeters: startSnap.distanceMeters,
        rideMeters,
        endWalkMeters: endSnap.distanceMeters,
        startSnapPoint: startSnap.point,
        endSnapPoint: endSnap.point,
        ridePath: pathBetweenSnappedPoints(pathOption.path, startSnap, endSnap),
        walkToRoutePath: [toRoutePoint(startPoint), startSnap.point],
        walkToDestinationPath: [endSnap.point, toRoutePoint(endPoint)],
        score,
        reason: 'This route passes near both selected points.'
      })
    }
  }

  return candidates.sort((a, b) => a.score - b.score).slice(0, maxResults)
}

export function findTransferRouteCandidates(routes, startPoint, endPoint, options = {}) {
  const maxWalkToRouteMeters = options.maxWalkToRouteMeters ?? MAX_WALK_TO_ROUTE_METERS
  const maxTransferWalkMeters = options.maxTransferWalkMeters ?? MAX_TRANSFER_WALK_METERS
  const maxResults = options.maxResults ?? MAX_TRANSFER_RESULTS
  const walkWeight = options.walkWeight ?? WALK_WEIGHT
  const rideWeight = options.rideWeight ?? RIDE_WEIGHT
  const transferWalkWeight = options.transferWalkWeight ?? TRANSFER_WALK_WEIGHT
  const transferPenaltyMeters = options.transferPenaltyMeters ?? TRANSFER_PENALTY_METERS
  const startRoutes = findRoutesNearPoint(routes, startPoint, maxWalkToRouteMeters)
    .slice(0, options.maxNearbyTransferPaths ?? MAX_NEARBY_TRANSFER_PATHS)
  const destinationRoutes = findRoutesNearPoint(routes, endPoint, maxWalkToRouteMeters)
    .slice(0, options.maxNearbyTransferPaths ?? MAX_NEARBY_TRANSFER_PATHS)
  const candidates = []

  for (const firstPath of startRoutes) {
    for (const secondPath of destinationRoutes) {
      if (firstPath.routeId === secondPath.routeId) continue
      if (
        distanceBetweenBoundsMeters(firstPath.transferBounds, secondPath.transferBounds) >
        maxTransferWalkMeters
      ) continue

      const closest = getClosestPointsBetweenPaths(
        firstPath.transferPath,
        secondPath.transferPath
      )
      if (!closest || closest.distanceMeters > maxTransferWalkMeters) continue

      const firstTransferSnap = getNearestPointOnPath(closest.pointA, firstPath.path)
      const secondTransferSnap = getNearestPointOnPath(closest.pointB, secondPath.path)
      const endSnap = getNearestPointOnPath(endPoint, secondPath.path)
      const firstRideMeters = distanceBetweenSnappedPoints(
        firstPath.path,
        firstPath.nearest,
        firstTransferSnap
      )
      const secondRideMeters = distanceBetweenSnappedPoints(
        secondPath.path,
        secondTransferSnap,
        endSnap
      )

      if (firstRideMeters === null || secondRideMeters === null || !endSnap) continue

      const transferPoint = [
        (lat(closest.pointA) + lat(closest.pointB)) / 2,
        (lng(closest.pointA) + lng(closest.pointB)) / 2
      ]
      const score =
        firstPath.nearest.distanceMeters * walkWeight +
        firstRideMeters * rideWeight +
        closest.distanceMeters * transferWalkWeight +
        secondRideMeters * rideWeight +
        endSnap.distanceMeters * walkWeight +
        transferPenaltyMeters

      candidates.push({
        type: 'transfer',
        firstRoute: firstPath.route,
        secondRoute: secondPath.route,
        firstRouteId: firstPath.routeId,
        secondRouteId: secondPath.routeId,
        firstDirection: firstPath.direction,
        secondDirection: secondPath.direction,
        startWalkMeters: firstPath.nearest.distanceMeters,
        firstRideMeters,
        transferWalkMeters: closest.distanceMeters,
        secondRideMeters,
        endWalkMeters: endSnap.distanceMeters,
        startSnapPoint: firstPath.nearest.point,
        firstTransferPoint: firstTransferSnap.point,
        secondTransferPoint: secondTransferSnap.point,
        endSnapPoint: endSnap.point,
        transferPoint,
        firstRidePath: pathBetweenSnappedPoints(
          firstPath.path,
          firstPath.nearest,
          firstTransferSnap
        ),
        transferWalkPath: [firstTransferSnap.point, secondTransferSnap.point],
        secondRidePath: pathBetweenSnappedPoints(secondPath.path, secondTransferSnap, endSnap),
        walkToRoutePath: [toRoutePoint(startPoint), firstPath.nearest.point],
        walkToDestinationPath: [endSnap.point, toRoutePoint(endPoint)],
        score,
        reason: 'These routes pass near each other around the transfer area.'
      })
    }
  }

  return candidates.sort((a, b) => a.score - b.score).slice(0, maxResults)
}

export function pointToLatLngObject(point) {
  if (!point) return null
  return { lat: lat(point), lng: lng(point) }
}

export function pathToRoutePoints(path) {
  return path.map(toRoutePoint)
}
