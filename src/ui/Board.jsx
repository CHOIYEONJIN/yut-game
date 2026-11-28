// 윷판과 말을 그리는 화면 부품 (SVG 그림)
// 규칙 판단은 하지 않는다. 어떤 말을 누를 수 있고 어디로 갈 수 있는지는 GameScreen이 알려 준다.
import { POINTS, FINISH_POINT, BIG_POINTS, LINES } from './boardLayout.js'
import { getGroupAt } from '../rules/game.js'

// 키보드(Enter, 스페이스)로도 누를 수 있게 해 주는 도우미
const onEnter = (fn) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    fn()
  }
}

// props
// - state: 게임 상태
// - clickablePieceIds: 지금 누를 수 있는 말(묶음 대표) id 목록
// - selectedPieceId: 지금 고른 말 id (없으면 null)
// - targets: 고른 말이 갈 수 있는 곳 [{ key, to, finishes, label }]  (finishes면 완주 자리에 표시)
// - onPieceClick(pieceId), onTargetClick(key)
export default function Board({ state, clickablePieceIds = [], selectedPieceId = null, targets = [], onPieceClick, onTargetClick }) {
  const waitingHere = getGroupAt(state, 0).some((p) => p.status === 'waiting')

  return (
    // role="group": 화면 읽기 프로그램이 윷판을 "그림 한 장"이 아니라 "누를 수 있는 것들이 든 묶음"으로 읽게 한다.
    // (role="img"이면 안쪽의 말, 갈 곳 버튼을 읽지 못한다)
    <svg className="board" viewBox="-50 -50 800 760" role="group" aria-label="윷판">
      {/* 판 바탕 */}
      <rect x="-30" y="-30" width="660" height="660" rx="6" className="board-paper" />

      {/* 윷판 선 */}
      {LINES.map(([a, b]) => (
        <line key={`${a}-${b}`} x1={POINTS[a].x} y1={POINTS[a].y} x2={POINTS[b].x} y2={POINTS[b].y} className="board-line" />
      ))}

      {/* 칸 */}
      {Object.entries(POINTS).map(([pos, p]) => (
        <circle key={pos} cx={p.x} cy={p.y} r={BIG_POINTS.includes(Number(pos)) ? 26 : 16} className="board-point" />
      ))}
      <text x={POINTS[0].x} y={POINTS[0].y + 56} className="board-caption">출발점</text>

      {/* 완주 대기 표시 (출발점 아래) */}
      {waitingHere && (
        <text x={POINTS[0].x} y={POINTS[0].y + 88} className="waiting-label">완주 대기 중</text>
      )}

      {/* 말 (같은 칸의 내 말들은 하나로 그리고 개수를 적는다) */}
      {Object.keys(POINTS).map((key) => {
        const pos = Number(key)
        const group = getGroupAt(state, pos)
        if (group.length === 0) return null
        const leader = group[0]
        const owner = state.players[leader.owner]
        const clickable = clickablePieceIds.includes(leader.id)
        const selected = selectedPieceId === leader.id
        const p = POINTS[pos]
        return (
          <g
            key={`piece-${pos}`}
            className={`piece${clickable ? ' clickable' : ''}${selected ? ' selected' : ''}`}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={`${owner.name}의 말 ${group.length}개, ${pos === 0 ? '출발점' : `${pos}번 칸`}${clickable ? ', 누르면 고르기' : ''}`}
            onClick={() => clickable && onPieceClick?.(leader.id)}
            onKeyDown={clickable ? onEnter(() => onPieceClick?.(leader.id)) : undefined}
          >
            {/* 고를 수 있거나 고른 말은 바깥에 먹색 고리를 따로 그린다.
                말 색(특히 노랑)과 겹치지 않도록 말과 고리 사이에 틈을 둔다 */}
            {(clickable || selected) && <circle cx={p.x} cy={p.y} r="30" className="piece-halo" />}
            <circle cx={p.x} cy={p.y} r="20" fill={owner.color} className="piece-body" />
            {group.length > 1 && (
              <text x={p.x} y={p.y + 7} className="piece-count">{group.length}</text>
            )}
          </g>
        )
      })}

      {/* 갈 수 있는 곳 (말 위에 그려서, 상대 말을 잡는 자리도 보이게 한다) */}
      {targets.map((t) => {
        const p = t.finishes ? FINISH_POINT : POINTS[t.to]
        return (
          <g
            key={t.key}
            className="target"
            role="button"
            tabIndex={0}
            aria-label={t.label}
            onClick={() => onTargetClick?.(t.key)}
            onKeyDown={onEnter(() => onTargetClick?.(t.key))}
          >
            <circle cx={p.x} cy={p.y} r="30" />
            {t.finishes && <text x={p.x} y={p.y + 6} className="target-text">완주</text>}
            {t.stacks && <text x={p.x} y={p.y - 38} className="target-text stack-text">업기</text>}
          </g>
        )
      })}
    </svg>
  )
}
