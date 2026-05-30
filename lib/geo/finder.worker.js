// Web Worker: runs the (potentially heavy) route search off the main thread so
// it never freezes the UI. Initialised once with the routes, then answers
// per-search "find" messages.
import { findDirectRouteCandidates, findTransferRouteCandidates } from './index.js'

let routes = []

// Strip the heavy geometry from the route references in results — the UI only
// needs the identity/label fields, and this keeps the postMessage payload small.
function slimRoute(route) {
  if (!route) return route
  return {
    id: route.id,
    code: route.code,
    name: route.name,
    color: route.color,
    status: route.status
  }
}

function slimResult(result) {
  if (result.type === 'direct') {
    return { ...result, route: slimRoute(result.route) }
  }
  return {
    ...result,
    firstRoute: slimRoute(result.firstRoute),
    secondRoute: slimRoute(result.secondRoute)
  }
}

self.onmessage = (event) => {
  const message = event.data

  if (message.type === 'init') {
    routes = message.routes || []
    return
  }

  if (message.type === 'find') {
    const { id, startPoint, endPoint, options } = message
    let direct = []
    let transfer = []
    try {
      direct = findDirectRouteCandidates(routes, startPoint, endPoint, options).map(
        slimResult
      )
      transfer = findTransferRouteCandidates(routes, startPoint, endPoint, {
        ...options,
        maxResults: options.maxTransferResults
      }).map(slimResult)
    } catch {
      // On failure, return empty result sets rather than crashing the worker.
    }
    self.postMessage({ id, direct, transfer })
  }
}
