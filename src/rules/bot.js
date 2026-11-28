// 컴퓨터 플레이어: 지금 상태에서 둘 수를 고른다
// 이 파일도 화면과 서버를 모른다. 서버가 "컴퓨터 차례"일 때 botStep을 불러서 쓴다.
import { getLegalMoves, applyMove, throwYut, getGroupAt } from './game.js'
import { START, routeOptions, remainingSteps } from './board.js'

// 이동 뒤 완주까지 남은 칸 수 (0번 칸 = 완주 대기라서 0으로 본다)
function stepsLeft(to) {
  if (to === START) return 0
  return Math.min(...routeOptions(to).map((route) => remainingSteps(to, route)))
}

// 이 이동이 상대 말을 잡는지 (도착 칸에 상대 말이 있는지)
function catches(state, move) {
  if (move.finishes) return false
  return getGroupAt(state, move.to).some((p) => p.owner !== state.current)
}

// 둘 수를 하나 고른다. 고르는 순서: 1) 잡기 2) 완주 3) 이동 뒤 남은 칸이 가장 적은 수
// 같은 점수면 목록에서 앞에 있는 수. 둘 수가 없으면 null.
export function chooseMove(state) {
  const moves = getLegalMoves(state)
  if (moves.length === 0) return null
  const capture = moves.find((m) => catches(state, m))
  if (capture) return capture
  const finish = moves.find((m) => m.finishes)
  if (finish) return finish
  let best = moves[0]
  for (const m of moves) {
    if (stepsLeft(m.to) < stepsLeft(best.to)) best = m
  }
  return best
}

// 컴퓨터가 한 동작을 한다: 던지기 단계면 던지고, 이동 단계면 고른 수를 둔다
export function botStep(state, random = Math.random) {
  if (state.phase === 'throw') return throwYut(state, random)
  if (state.phase === 'move') {
    const move = chooseMove(state)
    return move ? applyMove(state, move) : state
  }
  return state
}
