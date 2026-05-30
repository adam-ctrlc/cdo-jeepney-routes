/**
 * Shared domain types for the CDO Jeepney Routes app.
 *
 * The app code is authored in JavaScript; these types are consumed from
 * `.vue`/`.js` files through JSDoc, e.g.
 *   `/** @type {import('~/types').Route} *​/`
 */

/** A geographic point in object form. */
export interface LatLng {
  lat: number
  lng: number
}

/** A geographic point in `[lat, lng]` tuple form (used by route geometry). */
export type RoutePoint = [number, number]

/** Either accepted point representation. */
export type GeoPoint = LatLng | RoutePoint

/** An ordered list of points describing one direction of travel. */
export type RoutePath = RoutePoint[]

/** Lifecycle/verification state of a route in the LPTRP dataset. */
export type RouteStatus =
  | 'imported-unverified'
  | 'for-clarification'
  | 'not-yet-operational'

/** Human-readable summary + street list for one direction. */
export interface RouteDirection {
  summary: string
  streets: string[]
}

/** A named stop or area along a route. */
export interface RouteStop {
  id: string
  name: string
  lat: number
  lng: number
  type: string
}

/** Per-direction geometry container (legacy `paths` field). */
export interface RoutePaths {
  inbound?: RoutePath
  outbound?: RoutePath
}

/** A single jeepney route as stored in `public/data/routes.json`. */
export interface Route {
  id: string
  code: string
  name: string
  color: string
  status: RouteStatus
  source: string
  lastUpdated: string
  areas: string[]
  landmarks: string[]
  transferPoints: string[]
  inbound: RouteDirection
  outbound: RouteDirection
  stops: RouteStop[]
  paths?: RoutePaths
  path?: RoutePath
  /** Normalized geometry added at load time (falls back to `paths.*`). */
  inboundPath?: RoutePath
  outboundPath?: RoutePath
  notes: string
}

/** Tunable weights/thresholds for the route finder (see lib/geo). */
export interface RouteFinderOptions {
  maxWalkToRouteMeters?: number
  maxTransferWalkMeters?: number
  walkWeight?: number
  rideWeight?: number
  transferWalkWeight?: number
  transferPenaltyMeters?: number
  maxResults?: number
  maxDirectResults?: number
  maxTransferResults?: number
  maxNearbyTransferPaths?: number
}

/** A suggested single-ride trip. */
export interface DirectRouteResult {
  type: 'direct'
  route: Route
  routeId: string
  direction: string
  startWalkMeters: number
  rideMeters: number
  endWalkMeters: number
  startSnapPoint: RoutePoint
  endSnapPoint: RoutePoint
  ridePath: RoutePoint[]
  walkToRoutePath: RoutePoint[]
  walkToDestinationPath: RoutePoint[]
  score: number
  reason: string
}

/** A suggested two-ride trip with one transfer. */
export interface TransferRouteResult {
  type: 'transfer'
  firstRoute: Route
  secondRoute: Route
  firstRouteId: string
  secondRouteId: string
  firstDirection: string
  secondDirection: string
  startWalkMeters: number
  firstRideMeters: number
  transferWalkMeters: number
  secondRideMeters: number
  endWalkMeters: number
  startSnapPoint: RoutePoint
  firstTransferPoint: RoutePoint
  secondTransferPoint: RoutePoint
  endSnapPoint: RoutePoint
  transferPoint: RoutePoint
  firstRidePath: RoutePoint[]
  transferWalkPath: RoutePoint[]
  secondRidePath: RoutePoint[]
  walkToRoutePath: RoutePoint[]
  walkToDestinationPath: RoutePoint[]
  score: number
  reason: string
}

/** Any finder result shown in the sidebar / drawn on the map. */
export type FinderResult = DirectRouteResult | TransferRouteResult
