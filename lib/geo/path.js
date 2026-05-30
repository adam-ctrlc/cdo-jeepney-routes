// Path-level geometry: route path extraction + caching, nearest-point snapping,
// distances along a path, and closest approach between two paths.
import { TRANSFER_PATH_SIMPLIFY_METERS } from './constants.js'
import {
  haversineDistanceMeters,
  isValidPath,
  lat,
  lng,
  nearestPointOnSegment
} from './points.js'

const routePathOptionsCache = new WeakMap()
const nearestPointPathCache = new WeakMap()
const simplifiedPathCache = new WeakMap()
const closestPathCache = new Map()
let nextPathId = 1

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

export function distanceBetweenBoundsMeters(boundsA, boundsB) {
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

  return haversineDistanceMeters([closestLatA, closestLngA], [closestLatB, closestLngB])
}

// Cheap O(1) lower bound: distance from a point to a path's bounding box. Since
// the box contains the path, box distance <= true path distance, so anything
// beyond the threshold here can be skipped without scanning the geometry.
export function distancePointToBoundsMeters(point, bounds) {
  const pointLat = lat(point)
  const pointLng = lng(point)
  if (
    pointLat >= bounds.minLat &&
    pointLat <= bounds.maxLat &&
    pointLng >= bounds.minLng &&
    pointLng <= bounds.maxLng
  ) {
    return 0
  }
  const clampedLat = Math.max(bounds.minLat, Math.min(pointLat, bounds.maxLat))
  const clampedLng = Math.max(bounds.minLng, Math.min(pointLng, bounds.maxLng))
  return haversineDistanceMeters([pointLat, pointLng], [clampedLat, clampedLng])
}

function routePathOptions(route) {
  if (routePathOptionsCache.has(route)) return routePathOptionsCache.get(route)

  const options = []
  const hasExplicitDirections =
    isValidPath(route.inboundPath) || isValidPath(route.outboundPath)

  if (isValidPath(route.inboundPath)) {
    options.push({
      route,
      routeId: route.id,
      direction: 'Inbound',
      path: route.inboundPath
    })
  }

  if (isValidPath(route.outboundPath)) {
    options.push({
      route,
      routeId: route.id,
      direction: 'Outbound',
      path: route.outboundPath
    })
  }

  if (!hasExplicitDirections && isValidPath(route.paths?.inbound)) {
    options.push({
      route,
      routeId: route.id,
      direction: 'Inbound',
      path: route.paths.inbound
    })
  }

  if (!hasExplicitDirections && isValidPath(route.paths?.outbound)) {
    options.push({
      route,
      routeId: route.id,
      direction: 'Outbound',
      path: route.paths.outbound
    })
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
    const candidateOnBRefined = nearestPointOnSegment(
      candidateOnA,
      segmentBStart,
      segmentBEnd
    )

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
      // Skip routes whose bounding box is already too far before scanning it.
      if (
        distancePointToBoundsMeters(point, pathOption.transferBounds) > maxDistanceMeters
      ) {
        continue
      }
      const nearest = getNearestPointOnPath(point, pathOption.path)
      if (nearest && nearest.distanceMeters <= maxDistanceMeters) {
        results.push({ ...pathOption, nearest })
      }
    }
  }

  return results.sort((a, b) => a.nearest.distanceMeters - b.nearest.distanceMeters)
}

export function distanceBetweenSnappedPoints(path, startSnap, endSnap) {
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

export function pathBetweenSnappedPoints(path, startSnap, endSnap) {
  if (!startSnap || !endSnap) return []
  if (endSnap.positionAlongPathMeters <= startSnap.positionAlongPathMeters) return []

  const middlePoints =
    startSnap.segmentIndex === endSnap.segmentIndex
      ? []
      : path.slice(startSnap.segmentIndex + 1, endSnap.segmentIndex + 1)

  return [startSnap.point, ...middlePoints, endSnap.point]
}
