interface Point {
  x: number;
  y: number;
}

interface Circle {
  center: Point,
  radius: number;
}

function onRight(points: Array<Point>, center: Point) {
  let a = points[0]
  let b = points[2]
  let c = center

  if (Math.abs(a.x - b.x) < Number.EPSILON*64 ) {
      if (c.x < b.x) {
          return b.y > a.y ? 1 : -1;
      }
      if (c.x > b.x) {
          return b.y > a.y ? -1 : 1;
      } 
      return 0;
  }
  if (Math.abs(a.y - b.y) < Number.EPSILON*64) { // horizontal line
      if (c.y < b.y) {
          return b.x > a.x ? -1 : 1;
      }
      if (c.y > b.y) {
          return b.x > a.x ? 1 : -1;
      } 
      return 0;
  }
  let slope = (b.y - a.y) / (b.x - a.x);
  let yIntercept = a.y - a.x * slope;
  let cSolution = (slope*c.x) + yIntercept;
  if (slope != 0) {
      if (c.y > cSolution) {
          return b.x > a.x ? 1 : -1;
      }
      if (c.y < cSolution) {
          return b.x > a.x ? -1 : 1;
      }
      return 0;
  }
  return 0;
}

const nudge = Math.pow(2, -46);

export function simpleCenter(points: Array<Point>): Circle {
  const p1 = points[0]
  const p2 = points[points.length-1]
  const p3 = points[Math.floor(points.length/2)]
  const ax = (p1.x + p2.x) / 2;
  const ay = (p1.y + p2.y) / 2;
  const ux = (p1.y - p2.y);
  const uy = (p2.x - p1.x);
  const bx = (p2.x + p3.x) / 2;
  const by = (p2.y + p3.y) / 2;
  const vx = (p2.y - p3.y);
  const vy = (p3.x - p2.x);
  const dx = ax - bx;
  const dy = ay - by;
  let vu = vx * uy - vy * ux;
  if (vu == 0) {
      vu = nudge
  }
  const g = (dx * uy - dy * ux) / vu;
  const x = bx + g * vx;
  const y = by + g * vy;
  const center = {x, y}
  const rx = p1.x - x
  const ry = p1.y - y
  const magnitude = Math.sqrt(rx * rx + ry * ry)

  const sign = onRight(points, center)
  
  const radius = sign >= 0 ? -magnitude : magnitude

  return { center, radius }
}

function calcError(distances: Array<number>, r: number): number {
  let result = distances.reduce((prev, distance) => {
    return prev + Math.abs(distance - r)
  }, 0.0)
  return result
}

// Calculate set indexes
function iocSets(distances: Array<number>, r: number): Array<Array<number>> {
  let result = distances.reduce((prev, distance, index) => {
    let [i, o, c] = prev
    if (distance < r) return [[...i, index], o, c]
    if (distance > r) return [i, [...o, index], c]
    return [i, o, [...c, index]]
  }, [[], [], []])
  return result
}

export function circleCenter(points: Array<Point>) {
  // Must be 3 or more points, use circleCenter instead if 3
  // Adapted from: Robust Fiting of Circle Arcs
  let step = 0.001 // ??? naming ???
  // Step 1. Initial center circle by first, middle, and last data points
  let center = simpleCenter(points).center
  // Step 2. // TODO use non-euclidian distance function: try  Math.abs(p.x-a.center.x) + Math.abs(p.y-a.center.y)
  let distances = points.map((p) => Math.sqrt((p.x-center.x)**2 + (p.y-center.y)**2))
  // median: sum/number of points
  let magnitude = (distances.reduce((prev, curr) => prev + curr, 0))/points.length
  // Starting error
  let error = calcError(distances, magnitude)

  let iterations: number = 0
  do {
    // Step 3. Calculate set indexes
    let [i, o, c] = iocSets(distances, magnitude)
    // Step 4.
    let coses = distances.map((distance, index) => {
        let x = points[index].x
        return (x - center.x)/distance
    })
    let sines = distances.map((distance, index) => {
        let y = points[index].y
        return (y - center.y)/distance
    })
    // Step 5.
    let sumCosI = i.reduce((previous, index) => {
        return previous + coses[index]
    }, 0.0)
    let sumCosO = o.reduce((previous, index) => {
        return previous + coses[index]
    }, 0.0)
    let sumCosC = c.reduce((previous, index) => {
        return previous + coses[index]
    }, 0.0)
    let sumSinI = i.reduce((previous, index) => {
        return previous + sines[index]
    }, 0.0)
    let sumSinO = o.reduce((previous, index) => {
        return previous + sines[index]
    }, 0.0)
    let sumSinC = c.reduce((previous, index) => {
        return previous + sines[index]
    }, 0.0)
    let eaPlus = sumCosI - sumCosO + Math.abs(sumCosC)
    let eaMinus = sumCosI - sumCosO - Math.abs(sumCosC)
    let ebPlus = sumSinI - sumSinO + Math.abs(sumSinC)
    let ebMinus = sumSinI - sumSinO - Math.abs(sumSinC)
    // Step 6.
    let alpha = eaMinus >= 0 ? 1 : eaPlus <= 0 ? 0 : 0.5
    let beta = ebMinus >= 0 ? 1 : ebPlus <= 0 ? 0 : 0.5
    let d1 = -(alpha * eaMinus + (1 - alpha) * eaPlus)
    let d2 = -(beta * ebMinus + (1 - beta) * ebPlus)
    let x = center.x + step*d1
    let y = center.y + step*d2
    // Step 7.
    let distancesNew = points.map((p) => Math.sqrt((p.x-x)**2 + (p.y-y)**2))
    let radiusNew = (distancesNew.reduce((prev, curr) => prev + curr, 0))/points.length
    let errorNew = calcError(distancesNew, radiusNew)
    if (errorNew < error) {
      step *= 1.1
    } else {
      step *= 0.9
    }
    center = {x, y}
    distances = distancesNew
    magnitude = radiusNew
    error = errorNew
    iterations += 1
  } while (iterations < 3)

  const sign = onRight(points, center)
  
  const radius = sign >= 0 ? -magnitude : magnitude


  return {center, radius}
}

