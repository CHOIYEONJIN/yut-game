// 윷판 이동 규칙
// 칸 번호 (총 29칸):
//   10  9  8  7  6  5
//   11 25        20  4
//   12   26    21    3
//            22           (22 = 중앙)
//   13   23    27    2
//   14 24        28  1
//   15 16 17 18 19  0     (0 = 출발점 = 도착점)
//
// 바깥 길:      0 → 1 → ... → 19 → 0
// 5번 지름길:   5 → 20 → 21 → 22 → 23 → 24 → 15
// 10번 지름길: 10 → 25 → 26 → 22 → 27 → 28 → 0
// 중앙 출구:   22 → 27 → 28 → 0

export const START = 0 // 출발점 = 도착점
export const CENTER = 22 // 중앙 칸
export const CORNERS = [5, 10] // 지름길을 고를 수 있는 모서리

// 이 칸에서 이동을 시작할 때 고를 수 있는 길 목록.
// 모서리면 지름길/바깥길 두 가지, 그 외에는 고를 것이 없으므로 [null].
export function routeOptions(pos) {
  return CORNERS.includes(pos) ? ['shortcut', 'outer'] : [null]
}

// 한 칸 앞으로 갈 때의 다음 칸을 정한다.
// pos: 지금 칸, prev: 바로 전에 있던 칸, isStart: 이번 이동을 이 칸에서 시작했는지, route: 모서리에서 고른 길
function nextPos(pos, prev, isStart, route) {
  // 모서리에서 이동을 시작하면 고른 길을 따른다 (지나가기만 할 때는 바깥길)
  if (isStart && pos === 5) return route === 'shortcut' ? 20 : 6
  if (isStart && pos === 10) return route === 'shortcut' ? 25 : 11
  // 중앙: 여기서 출발하면 출구(27) 방향, 지나가는 중이면 들어온 방향으로 곧장 간다
  if (pos === CENTER) {
    if (isStart) return 27
    return prev === 21 ? 23 : 27
  }
  // 지름길 위의 칸들은 정해진 다음 칸이 있다
  const diagonal = { 20: 21, 21: 22, 23: 24, 24: 15, 25: 26, 26: 22, 27: 28, 28: 0 }
  if (pos in diagonal) return diagonal[pos]
  // 바깥 길: 한 칸씩 앞으로, 19 다음은 0
  return pos === 19 ? 0 : pos + 1
}

// start 칸에서 steps칸(1 이상) 앞으로 간다.
// 돌려주는 값: path = 지나간 칸들(시작 칸 제외, 마지막이 도착 칸), finished = 완주했는지
// 0에 도착했는데 아직 걸음이 남아 있으면 출발점을 "지나친" 것이므로 완주다.
export function walk(start, steps, route) {
  const path = []
  let pos = start
  let prev = null
  for (let i = 0; i < steps; i++) {
    // 이번 이동 중에 0에 도착했고 걸음이 더 남았다 → 완주
    if (i > 0 && pos === START) return { path, finished: true }
    const next = nextPos(pos, prev, i === 0, route)
    prev = pos
    pos = next
    path.push(pos)
  }
  return { path, finished: false }
}

// pos 칸에서 0(출발점)까지 남은 칸 수
export function remainingSteps(pos, route) {
  let count = 0
  let current = pos
  let prev = null
  do {
    const next = nextPos(current, prev, count === 0, route)
    prev = current
    current = next
    count++
  } while (current !== START)
  return count
}
