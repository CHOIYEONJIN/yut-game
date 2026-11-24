// 게임 화면: 윷판 + 오른쪽 패널(던지기, 모인 결과, 플레이어 현황)
// 규칙 판단은 전부 rules/game.js의 함수에 맡긴다. 이 화면은 "무엇을 골랐는지"만 기억한다.
import { useState } from 'react'
import Board from './Board.jsx'
import { throwYut, getLegalMoves, applyMove, passUnusable } from '../rules/game.js'
import { RESULT_LABELS } from '../rules/yut.js'
import { usableResults, stacksOnOwnPiece } from './selection.js'

export default function GameScreen({ state, onChange }) {
  const [pickedResult, setPickedResult] = useState(null) // 고른 결과 (예: 'gae')
  const [pickedPiece, setPickedPiece] = useState(null) // 고른 말 id

  const player = state.players[state.current]
  const moves = getLegalMoves(state)

  // 지금 실제로 쓸 수 있는 결과들 (예: 판에 말이 없으면 빽도는 못 씀)
  const usable = usableResults(state, moves)
  // 쓸 수 있는 결과가 한 종류뿐이면 자동으로 고른 것으로 본다 (클릭을 줄이기 위해)
  const result = usable.includes(pickedResult) ? pickedResult : usable.length === 1 ? usable[0] : null

  // 고른 결과로 할 수 있는 이동들, 그중 고른 말의 이동들
  const resultMoves = result ? moves.filter((m) => state.pool[m.resultIndex] === result) : []
  const pieceMoves = resultMoves.filter((m) => m.pieceId === pickedPiece)
  const clickableIds = [...new Set(resultMoves.map((m) => m.pieceId))]
  // 출발 전 말을 꺼낼 수 있는지 (출발 전 말은 판 밖에 있으므로 패널의 버튼으로 고른다)
  const homeMove = resultMoves.find((m) => state.pieces[m.pieceId].status === 'home')

  // 상태가 바뀌면 고른 것들을 초기화한다
  const update = (next) => {
    setPickedResult(null)
    setPickedPiece(null)
    onChange(next)
  }

  // 이동 대상 표시용 정보
  const targets = pieceMoves.map((m, i) => ({
    key: String(i),
    to: m.to,
    finishes: m.finishes,
    stacks: stacksOnOwnPiece(state, m), // 내 말 위로 가면 "업기"라고 표시
    label: m.finishes ? '완주' : `${m.route === 'shortcut' ? '지름길로 ' : m.route === 'outer' ? '바깥길로 ' : ''}${m.to}번 칸으로 이동`,
  }))

  const pickResult = (r) => {
    setPickedResult(r)
    setPickedPiece(null)
  }

  return (
    <div className="game">
      <div className="game-board">
        <Board
          state={state}
          clickablePieceIds={clickableIds}
          selectedPieceId={pickedPiece}
          targets={targets}
          onPieceClick={setPickedPiece}
          onTargetClick={(key) => update(applyMove(state, pieceMoves[Number(key)]))}
        />
      </div>

      <aside className="panel">
        <h2 className="turn">
          <span className="dot" style={{ background: player.color }} aria-hidden="true" />
          {player.name} 차례
        </h2>

        {state.message && <p className="message" role="status">{state.message}</p>}

        {/* 던지기 단계 */}
        {state.phase === 'throw' && (
          <button type="button" className="primary throw" onClick={() => update(throwYut(state))}>
            윷 던지기
          </button>
        )}

        {state.lastThrow && (
          <p className="last-throw">
            방금 던진 결과 <strong>{RESULT_LABELS[state.lastThrow]}</strong>
          </p>
        )}

        {/* 모인 결과 */}
        {state.pool.length > 0 && (
          <div className="pool">
            <p className="hint">
              {state.phase === 'throw' ? '한 번 더 던지세요. 모인 결과:' : '쓸 결과를 고르세요'}
            </p>
            <div className="pool-list">
              {state.pool.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  className={r === result ? 'chip active' : 'chip'}
                  disabled={state.phase !== 'move' || !usable.includes(r)}
                  title={state.phase === 'move' && !usable.includes(r) ? '지금은 이 결과로 움직일 수 있는 말이 없습니다' : undefined}
                  aria-pressed={r === result}
                  onClick={() => pickResult(r)}
                >
                  {RESULT_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 이동 단계 안내 */}
        {state.phase === 'move' && moves.length > 0 && result && (
          <div className="move-help">
            {pickedPiece === null ? (
              <p className="hint">움직일 말을 고르세요 (판 위 노란 테두리)</p>
            ) : (
              <>
                <p className="hint">갈 곳을 고르세요 (깜빡이는 자리)</p>
                <button type="button" className="chip" onClick={() => setPickedPiece(null)}>
                  다른 말 고르기
                </button>
              </>
            )}
            {homeMove && (
              <button
                type="button"
                className={pickedPiece === homeMove.pieceId ? 'chip active' : 'chip'}
                onClick={() => setPickedPiece(homeMove.pieceId)}
              >
                새 말 꺼내기
              </button>
            )}
          </div>
        )}

        {state.phase === 'move' && moves.length === 0 && (
          <div className="move-help">
            <p className="hint">남은 결과로 움직일 수 있는 말이 없습니다.</p>
            <button type="button" className="primary" onClick={() => update(passUnusable(state))}>
              턴 넘기기
            </button>
          </div>
        )}

        {/* 플레이어 현황 */}
        <ul className="players">
          {state.players.map((p, i) => {
            const mine = state.pieces.filter((x) => x.owner === i)
            const count = (status) => mine.filter((x) => x.status === status).length
            return (
              <li key={i} className={i === state.current ? 'current' : ''}>
                <span className="dot" style={{ background: p.color }} aria-hidden="true" />
                <span className="player-name">{p.name}</span>
                <span className="counts">
                  출발 전 {count('home')}, 판 위 {count('board')}, 완주 {count('done')}
                </span>
                {count('waiting') > 0 && <span className="waiting-badge">완주 대기 중 {count('waiting')}</span>}
              </li>
            )
          })}
        </ul>
      </aside>
    </div>
  )
}
