// 판 옆 대기 공간: 플레이어마다 말 4개의 자리를 보여 준다
// - 출발 전 말: 플레이어 색의 돌 (내 차례에 꺼낼 수 있으면 금색 고리, 누르면 그 말을 고른다)
// - 판 위에 나간 말: 빈 자리
// - 완주한 말: 빈 자리에 ✓ 표시
// - 이름 옆: 내 자리 (나), 컴퓨터 자리 🤖, 끊긴 자리 "자동 진행 중", 나간 자리 "나감"
// props: state, seats(서버의 자리 정보), mySeat, clickablePieceIds, selectedPieceId, onPieceClick(pieceId)
const SEAT_BADGES = { away: '자동 진행 중', left: '나감' }

export default function HomeTray({ state, seats = [], mySeat = null, clickablePieceIds = [], selectedPieceId = null, onPieceClick }) {
  return (
    <div className="tray" aria-label="대기 공간">
      {state.players.map((player, owner) => {
        const mine = state.pieces.filter((p) => p.owner === owner)
        // 꺼낼 수 있는 출발 전 말 (규칙상 출발 전 말은 가장 작은 id 하나가 대표)
        const leaderHome = mine.find((p) => p.status === 'home' && clickablePieceIds.includes(p.id))
        const waiting = mine.filter((p) => p.status === 'waiting').length
        return (
          <div key={owner} className={owner === state.current ? 'tray-row current' : 'tray-row'}>
            <span className="tray-name">
              {seats[owner]?.kind === 'bot' && <span aria-label="컴퓨터">🤖 </span>}
              {player.name}
              {owner === mySeat && ' (나)'}
            </span>
            {SEAT_BADGES[seats[owner]?.status] && <span className="seat-badge">{SEAT_BADGES[seats[owner].status]}</span>}
            <div className="tray-slots">
              {mine.map((p) => {
                if (p.status === 'home') {
                  // 출발 전 말은 어느 것을 눌러도 같은 "새 말 꺼내기"가 된다
                  const clickable = Boolean(leaderHome)
                  const selected = leaderHome && selectedPieceId === leaderHome.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`stone${clickable ? ' clickable' : ''}${selected ? ' selected' : ''}`}
                      style={{ background: player.color }}
                      disabled={!clickable}
                      aria-label={clickable ? `${player.name}의 새 말 꺼내기` : `${player.name}의 출발 전 말`}
                      onClick={() => onPieceClick?.(leaderHome.id)}
                    />
                  )
                }
                const done = p.status === 'done'
                return (
                  <span
                    key={p.id}
                    className={done ? 'slot done' : 'slot'}
                    style={done ? { borderColor: player.color, color: player.color } : undefined}
                    aria-label={done ? '완주한 말' : '판 위에 나간 말'}
                  >
                    {done ? '✓' : ''}
                  </span>
                )
              })}
            </div>
            {waiting > 0 && <span className="waiting-badge">완주 대기 중 {waiting}</span>}
          </div>
        )
      })}
    </div>
  )
}
