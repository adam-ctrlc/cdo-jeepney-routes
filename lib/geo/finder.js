// Route finder: scores and ranks direct and single-transfer trip candidates
// between two arbitrary points.
import {
  MAX_DIRECT_RESULTS,
  MAX_NEARBY_TRANSFER_PATHS,
  MAX_TRANSFER_RESULTS,
  MAX_TRANSFER_WALK_METERS,
  MAX_WALK_TO_ROUTE_METERS,
  RIDE_WEIGHT,
  TRANSFER_PENALTY_METERS,
  TRANSFER_WALK_WEIGHT,
  WALK_WEIGHT
} from './constants.js'
import { lat, lng, toRoutePoint } from './points.js'
import {
  distanceBetweenBoundsMeters,
  distanceBetweenSnappedPoints,
  distancePointToBoundsMeters,
  findRoutesNearPoint,
  getClosestPointsBetweenPaths,
  getNearestPointOnPath,
  getRoutePathOptions,
  pathBetweenSnappedPoints
} from './path.js'

export function findDirectRouteCandidates(routes, startPoint, endPoint, options = {}) {
  const maxWalkToRouteMeters = options.maxWalkToRouteMeters ?? MAX_WALK_TO_ROUTE_METERS
  const maxResults = options.maxResults ?? MAX_DIRECT_RESULTS
  const walkWeight = options.walkWeight ?? WALK_WEIGHT
  const rideWeight = options.rideWeight ?? RIDE_WEIGHT
  const candidates = []

  for (const route of routes) {
    for (const pathOption of getRoutePathOptions(route)) {
      // Reject routes whose bounding box is too far from either point before
      // scanning the full geometry.
      if (
        distancePointToBoundsMeters(startPoint, pathOption.transferBounds) >
          maxWalkToRouteMeters ||
        distancePointToBoundsMeters(endPoint, pathOption.transferBounds) >
          maxWalkToRouteMeters
      ) {
        continue
      }

      const startSnap = getNearestPointOnPath(startPoint, pathOption.path)
      const endSnap = getNearestPointOnPath(endPoint, pathOption.path)
      if (!startSnap || !endSnap) continue
      if (
        startSnap.distanceMeters > maxWalkToRouteMeters ||
        endSnap.distanceMeters > maxWalkToRouteMeters
      )
        continue

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
  const startRoutes = findRoutesNearPoint(routes, startPoint, maxWalkToRouteMeters).slice(
    0,
    options.maxNearbyTransferPaths ?? MAX_NEARBY_TRANSFER_PATHS
  )
  const destinationRoutes = findRoutesNearPoint(
    routes,
    endPoint,
    maxWalkToRouteMeters
  ).slice(0, options.maxNearbyTransferPaths ?? MAX_NEARBY_TRANSFER_PATHS)
  const candidates = []

  for (const firstPath of startRoutes) {
    for (const secondPath of destinationRoutes) {
      if (firstPath.routeId === secondPath.routeId) continue
      if (
        distanceBetweenBoundsMeters(firstPath.transferBounds, secondPath.transferBounds) >
        maxTransferWalkMeters
      )
        continue

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
        secondRidePath: pathBetweenSnappedPoints(
          secondPath.path,
          secondTransferSnap,
          endSnap
        ),
        walkToRoutePath: [toRoutePoint(startPoint), firstPath.nearest.point],
        walkToDestinationPath: [endSnap.point, toRoutePoint(endPoint)],
        score,
        reason: 'These routes pass near each other around the transfer area.'
      })
    }
  }

  return candidates.sort((a, b) => a.score - b.score).slice(0, maxResults)
}
