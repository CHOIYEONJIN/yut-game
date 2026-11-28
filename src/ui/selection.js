import { RESULTS } from '../rules/yut.js'

// 게임 화면에서 "무엇을 고를 수 있는지" 보여 주기 위한 도우미 (규칙 판단은 getLegalMoves 결과만 사용)

// 이 이동이 내 다른 말이 있는 칸에 도착해서 업게 되는지 (화면에 "업기"라고 알려 주기 위함)
export function stacksOnOwnPiece(state, move) {
  if (move.finishes) return false
  const mover = state.pieces[move.pieceId]
  return state.pieces.some(
    (p) =>
      p.owner === mover.owner &&
      p.pos === move.to &&
      (p.status === 'board' || p.status === 'waiting') &&
      !(mover.status !== 'home' && p.pos === mover.pos), // 같이 움직이는 묶음은 제외
  )
}

// 고른 말이 갈 수 있는 자리 목록: [{ move, result }]
// 모인 결과를 모두 따져서, 자리마다 어떤 결과를 쓰는지 붙여 준다.
// 두 결과가 같은 자리로 가면(대개 완주) 가장 작은 결과 하나만 남긴다. 큰 결과는 다른 말에 쓰는 게 이득이라서.
// 결과는 작은 것부터 순서대로 돌려준다 (빽도 → 도 → … → 모)
export function pieceChoices(state, moves, pieceId) {
  const best = new Map() // 자리 이름 → { move, result }
  for (const move of moves) {
    if (move.pieceId !== pieceId) continue
    const result = state.pool[move.resultIndex]
    const spot = move.finishes ? 'finish' : String(move.to)
    const old = best.get(spot)
    if (!old || RESULTS[result] < RESULTS[old.result]) best.set(spot, { move, result })
  }
  return [...best.values()].sort((a, b) => RESULTS[a.result] - RESULTS[b.result])
}
