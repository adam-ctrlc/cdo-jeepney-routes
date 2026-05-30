import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const sourceDir = path.join(rootDir, 'route-sources')
const outputPath = path.join(rootDir, 'public', 'data', 'routes.json')
const shouldWrite = process.argv.includes('--write')

const colorPalette = [
  '#1267ff',
  '#e4572e',
  '#6f42c1',
  '#198754',
  '#0dcaf0',
  '#20c997',
  '#fd7e14',
  '#e83e8c',
  '#dc3545',
  '#7952b3',
  '#0d6efd',
  '#1982c4',
  '#6610f2',
  '#2a9d8f',
  '#8f3985',
  '#f4a261',
  '#457b9d',
  '#588157'
]

const transferNames = [
  'Agora Market City and Terminal',
  'Agora Market City & Terminal',
  'Agora Terminal',
  'Carmen Public Market',
  'Cogon Public Market',
  'Cogon Market',
  'Divisoria Park',
  'Gaisano City',
  'Limketkai Center',
  'Puerto Public Market',
  'Rodelsa Circle',
  'Westbound Terminal',
  'Westbound Terminal and Public Market'
]

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function cleanStreet(value) {
  return normalizeText(value)
    .replace(/^[-:]+/, '')
    .replace(/\s+-\s+/g, ' - ')
    .replace(/\s+([,.)])/g, '$1')
    .replace(/\.$/, '')
    .trim()
}

function splitStreetList(value) {
  return normalizeText(value)
    .replace(/\s+-\s+/g, ' - ')
    .split(/\s+(?:-|–|—)\s+| - /)
    .map(cleanStreet)
    .filter(Boolean)
}

function decodeXml(value) {
  return String(value ?? '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function listFiles(dir, extension) {
  if (!fs.existsSync(dir)) return []

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return listFiles(fullPath, extension)
    return entry.isFile() && entry.name.toLowerCase().endsWith(extension)
      ? [fullPath]
      : []
  })
}

function readDescriptionBlocks() {
  const files = listFiles(sourceDir, 'route-descriptions.txt')
  const blocks = []

  for (const file of files) {
    const district = path.basename(path.dirname(file))
    const raw = fs.readFileSync(file, 'utf8')
    const sections = raw
      .split(/\n\s*={3,}\s*\n/g)
      .map((section) => section.trim())
      .filter(Boolean)

    for (const section of sections) {
      const parsed = parseDescriptionBlock(section, district)
      if (parsed) blocks.push(parsed)
    }
  }

  return blocks
}

function parseDescriptionBlock(section, district) {
  const clean = normalizeText(section)
  const inboundMatch = clean.match(/\bInbound\s*\(([^)]*)\)\s*:\s*/i)
  const outboundMatch = clean.match(/\bOutbound\s*\(([^)]*)\)\s*:\s*/i)
  const firstLine = section
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)

  if (!firstLine) return null

  const title = normalizeText(firstLine)
    .replace(/\([^)]*roundtrip[^)]*\)/i, '')
    .trim()

  const status = getStatus(clean)
  const inboundText =
    inboundMatch && outboundMatch
      ? clean.slice(inboundMatch.index + inboundMatch[0].length, outboundMatch.index)
      : ''
  const outboundText = outboundMatch
    ? clean.slice(outboundMatch.index + outboundMatch[0].length)
    : ''

  return {
    district,
    title,
    key: routeKey(title),
    status,
    inboundDistance: inboundMatch?.[1] ?? '',
    outboundDistance: outboundMatch?.[1] ?? '',
    inboundStreets: splitStreetList(inboundText),
    outboundStreets: splitStreetList(outboundText),
    raw: section
  }
}

function getStatus(value) {
  if (/not\s*yet\s*operational/i.test(value)) return 'not-yet-operational'
  if (/for\s*clarification|structure\s*for\s*clarification/i.test(value)) {
    return 'for-clarification'
  }
  return 'imported-unverified'
}

function routeKey(value) {
  return slugify(
    normalizeText(value)
      .replace(/\([^)]*roundtrip[^)]*\)/gi, '')
      .replace(/\bkilometers?\b/gi, 'km')
      .replace(/\s+/g, ' ')
  )
}

function parseKml(file) {
  const raw = fs.readFileSync(file, 'utf8')
  const docName = decodeXml(raw.match(/<Document>[\s\S]*?<name>([\s\S]*?)<\/name>/i)?.[1])
  const lineStrings = [...raw.matchAll(/<Placemark\b[\s\S]*?<\/Placemark>/gi)]
    .map((match) => match[0])
    .filter((placemark) => /<LineString\b/i.test(placemark))
    .map((placemark) => ({
      name: decodeXml(placemark.match(/<name>([\s\S]*?)<\/name>/i)?.[1]),
      coordinates: parseCoordinates(
        placemark.match(/<coordinates>([\s\S]*?)<\/coordinates>/i)?.[1]
      )
    }))
    .filter((line) => line.coordinates.length > 1)

  const points = [...raw.matchAll(/<Placemark\b[\s\S]*?<\/Placemark>/gi)]
    .map((match) => match[0])
    .filter((placemark) => /<Point\b/i.test(placemark))
    .map((placemark) => {
      const point = parseCoordinates(
        placemark.match(/<coordinates>([\s\S]*?)<\/coordinates>/i)?.[1]
      )[0]
      return {
        name: cleanPointName(
          decodeXml(placemark.match(/<name>([\s\S]*?)<\/name>/i)?.[1])
        ),
        lat: point?.[0],
        lng: point?.[1]
      }
    })
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))

  return {
    file,
    docName: normalizeText(docName || path.basename(file, '.kml')),
    key: routeKey(docName || path.basename(file, '.kml')),
    lineStrings,
    points
  }
}

function parseCoordinates(value) {
  return String(value ?? '')
    .trim()
    .split(/\s+/)
    .map((chunk) => chunk.split(',').map(Number))
    .filter(([lng, lat]) => Number.isFinite(lat) && Number.isFinite(lng))
    .map(([lng, lat]) => [lat, lng])
}

function cleanPointName(value) {
  const clean = normalizeText(value)
  if (!clean || /^[A-Z0-9+]{4,}/.test(clean)) return 'Route point'
  return clean
}

function findDescriptionForKml(kml, descriptions) {
  const exact = descriptions.find((description) => description.key === kml.key)
  if (exact) return exact

  const kmlTokens = new Set(kml.key.split('-').filter((token) => token.length > 1))
  let best = null
  let bestScore = 0

  for (const description of descriptions) {
    const descTokens = description.key.split('-').filter((token) => token.length > 1)
    const score = descTokens.filter((token) => kmlTokens.has(token)).length
    if (score > bestScore) {
      best = description
      bestScore = score
    }
  }

  return bestScore >= 3 ? best : null
}

function routeCodeFromTitle(title) {
  const normalized = normalizeText(title)
  const rMatch = normalized.match(/^(.+?)\s*\((R\d+)\)/i)
  if (rMatch) return `${rMatch[1].trim()} ${rMatch[2].toUpperCase()}`

  const inlineMatch = normalized.match(/^(.+?\s+R\d+)\b/i)
  if (inlineMatch) return inlineMatch[1].trim()

  return normalized.split(' - ')[0].trim()
}

function routeNameFromTitle(title, code) {
  const normalized = normalizeText(title)
    .replace(/^(.+?)\s*\((R\d+)\)\s*/i, '$1 $2 ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized.startsWith(code)
    ? normalized
        .slice(code.length)
        .replace(/^[-\s]+/, '')
        .trim() || normalized
    : normalized
}

function unique(values) {
  return [...new Set(values.map(cleanStreet).filter(Boolean))]
}

function buildRoute(kml, description, index) {
  const title = description?.title || kml.docName
  const code = routeCodeFromTitle(title)
  const name = routeNameFromTitle(title, code)
  const inbound = kml.lineStrings[0]?.coordinates ?? []
  const outbound = kml.lineStrings[1]?.coordinates ?? []
  const inboundStreets = description?.inboundStreets?.length
    ? description.inboundStreets
    : fallbackStreets(title)
  const outboundStreets = description?.outboundStreets?.length
    ? description.outboundStreets
    : []
  const allStreets = unique([...inboundStreets, ...outboundStreets])

  return {
    id: routeKey(title),
    code,
    name,
    color: colorPalette[index % colorPalette.length],
    status: description?.status ?? 'imported-unverified',
    source:
      'CDO Local Public Transport Route Plan website; raw KML route geometry and route-descriptions.txt',
    lastUpdated: new Date().toISOString().slice(0, 10),
    areas: inferAreas(title, allStreets),
    landmarks: allStreets,
    transferPoints: inferTransferPoints(allStreets),
    inbound: {
      summary: `${inboundStreets[0] ?? code} to ${inboundStreets.at(-1) ?? name}`,
      streets: inboundStreets
    },
    outbound: {
      summary: outboundStreets.length
        ? `${outboundStreets[0]} to ${outboundStreets.at(-1)}`
        : 'Outbound street sequence not listed',
      streets: outboundStreets
    },
    stops: buildStops(kml.points, inboundStreets, outboundStreets),
    paths: {
      inbound,
      outbound
    },
    path: [...inbound, ...outbound],
    notes: buildNotes(kml, description)
  }
}

function fallbackStreets(title) {
  return normalizeText(title).split(' - ').map(cleanStreet).filter(Boolean)
}

function inferAreas(title, streets) {
  const titleAreas = normalizeText(title)
    .replace(/^(.+?)\s*\((R\d+)\)\s*/i, '$1 ')
    .split(' - ')
    .map(cleanStreet)
  const streetAreas = streets.filter((street) =>
    /brgy\.|barangay|centro|subd\.|subdivision|terminal|market|park/i.test(street)
  )
  return unique([...titleAreas, ...streetAreas]).slice(0, 8)
}

function inferTransferPoints(streets) {
  const normalizedStreets = streets.map((street) => ({
    raw: street,
    normalized: normalizeText(street).toLowerCase()
  }))

  return unique(
    transferNames.filter((transfer) =>
      normalizedStreets.some(({ normalized }) =>
        normalized.includes(normalizeText(transfer).toLowerCase())
      )
    )
  )
}

function buildStops(points, inboundStreets, outboundStreets) {
  const labels = [
    inboundStreets[0],
    inboundStreets.at(-1),
    outboundStreets[0],
    outboundStreets.at(-1)
  ].filter(Boolean)

  return points.slice(0, 8).map((point, index) => ({
    id: slugify(`${labels[index] || point.name || 'route-point'}-${index + 1}`),
    name: labels[index] || point.name || `Route point ${index + 1}`,
    lat: point.lat,
    lng: point.lng,
    type: inferStopType(labels[index] || point.name)
  }))
}

function inferStopType(value) {
  const normalized = normalizeText(value).toLowerCase()
  if (normalized.includes('terminal')) return 'terminal'
  if (normalized.includes('market')) return 'market'
  if (normalized.includes('mall') || normalized.includes('gaisano')) return 'mall'
  if (normalized.includes('bridge') || normalized.includes('park')) return 'landmark'
  return 'area'
}

function buildNotes(kml, description) {
  const notes = [`Imported from ${path.relative(rootDir, kml.file).replace(/\\/g, '/')}.`]

  if (!description) {
    notes.push('No matching route description block was found; verify metadata.')
  }

  if (description?.status === 'not-yet-operational') {
    notes.push('Marked as Not Yet Operational in route descriptions.')
  }

  if (description?.status === 'for-clarification') {
    notes.push('Marked for route structure clarification in route descriptions.')
  }

  return notes.join(' ')
}

function main() {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Missing route source directory: ${sourceDir}`)
  }

  const descriptions = readDescriptionBlocks()
  const kmlFiles = listFiles(sourceDir, '.kml').sort((a, b) => a.localeCompare(b))
  const routes = []
  const warnings = []

  kmlFiles.forEach((file, index) => {
    const kml = parseKml(file)
    const description = findDescriptionForKml(kml, descriptions)
    if (!description) {
      warnings.push(`No description match: ${path.relative(rootDir, file)}`)
    }
    if (kml.lineStrings.length < 1) {
      warnings.push(`No route geometry: ${path.relative(rootDir, file)}`)
      return
    }

    routes.push(buildRoute(kml, description, index))
  })

  routes.sort((routeA, routeB) =>
    `${routeA.code} ${routeA.name}`.localeCompare(`${routeB.code} ${routeB.name}`)
  )

  const duplicateIds = routes
    .map((route) => route.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index)

  if (duplicateIds.length > 0) {
    warnings.push(`Duplicate route IDs: ${unique(duplicateIds).join(', ')}`)
  }

  if (shouldWrite) {
    fs.writeFileSync(outputPath, `${JSON.stringify(routes, null, 2)}\n`)
  }

  console.log(
    JSON.stringify(
      {
        mode: shouldWrite ? 'write' : 'dry-run',
        routes: routes.length,
        descriptions: descriptions.length,
        notYetOperational: routes.filter(
          (route) => route.status === 'not-yet-operational'
        ).length,
        forClarification: routes.filter((route) => route.status === 'for-clarification')
          .length,
        warnings
      },
      null,
      2
    )
  )
}

main()
