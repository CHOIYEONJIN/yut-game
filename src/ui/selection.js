// 게임 화면에서 "무엇을 고를 수 있는지" 보여 주기 위한 도우미 (규칙 판단은 getLegalMoves 결과만 사용)

// 모인 결과 중 지금 실제로 쓸 수 있는 결과 이름 목록
export function usableResults(state, moves) {
  return [...new Set(moves.map((m) => state.pool[m.resultIndex]))]
}

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
