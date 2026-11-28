// 게임 화면: 윷판 + 오른쪽 패널(던지기, 모인 결과, 플레이어 현황)
// 규칙 판단은 전부 rules/game.js의 함수에 맡긴다. 이 화면은 "무엇을 골랐는지"만 기억한다.
import { useState } from 'react'
import Board from './Board.jsx'
import { throwYut, getLegalMoves, applyMove } from '../rules/game.js'
import { RESULT_LABELS } from '../rules/yut.js'
import { usableResults, stacksOnOwnPiece } from './selection.js'
import YutSticks from './YutSticks.jsx'
import HomeTray from './HomeTray.jsx'

// 윷가락이 굴러가는 시간 (밀리초). App.css의 stick-roll 움직임 길이와 맞춘다.
const ROLL_MS = 900

export default function GameScreen({ state, onChange }) {
  const [pickedResult, setPickedResult] = useState(null) // 고른 결과 (예: 'gae')
  const [pickedPiece, setPickedPiece] = useState(null) // 고른 말 id
  const [rolling, setRolling] = useState(null) // 윷이 굴러가는 동안 기다리는 "다음 상태" (아니면 null)
  const [rollKey, setRollKey] = useState(0) // 던질 때마다 1씩 늘려 굴러가는 움직임을 다시 시작

  const player = state.players[state.current]
  const moves = getLegalMoves(state)

  // 지금 실제로 쓸 수 있는 결과들 (예: 판에 말이 없으면 빽도는 못 씀)
  const usable = usableResults(state, moves)
  // 쓸 수 있는 결과가 한 종류뿐이면 자동으로 고른 것으로 본다 (클릭을 줄이기 위해)
  const result = usable.includes(pickedResult) ? pickedResult : usable.length === 1 ? usable[0] : null

  // 고른 결과로 할 수 있는 이동들, 그중 고른 말의 이동들
  const resultMoves = result ? moves.filter((m) => state.pool[m.resultIndex] === result) : []
  const pieceMoves = resultMoves.filter((m) => m.pieceId === pickedPiece)
  // 누를 수 있는 말 (판 위의 말은 윷판에서, 출발 전 말은 대기 공간에서 누른다)
  const clickableIds = [...new Set(resultMoves.map((m) => m.pieceId))]

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

  // 윷 던지기: 결과는 바로 정하지만, 가락이 굴러가는 동안(약 0.9초)은 화면에 결과를 알리지 않는다.
  // "움직임 줄이기"를 켠 사용자에게는 굴러가는 효과 없이 바로 보여 준다.
  const throwSticksNow = () => {
    if (rolling) return
    const next = throwYut(state)
    setRollKey((k) => k + 1)
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      update(next)
      return
    }
    setRolling(next)
    setTimeout(() => {
      setRolling(null)
      update(next)
    }, ROLL_MS)
  }

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
        <HomeTray state={state} clickablePieceIds={clickableIds} selectedPieceId={pickedPiece} onPieceClick={setPickedPiece} />
      </div>

      <aside className="panel">
        <h2 className="turn">
          <span className="dot" style={{ background: player.color }} aria-hidden="true" />
          {player.name} 차례
        </h2>

        {state.message && <p className="message" role="status">{state.message}</p>}

        {/* 윷가락 그림: 굴러가는 중이면 새 결과의 모양을, 아니면 마지막 결과를 보여 준다 */}
        <YutSticks
          sticks={rolling ? rolling.lastSticks : state.lastSticks}
          rolling={Boolean(rolling)}
          rollKey={rollKey}
          resultLabel={state.lastThrow ? RESULT_LABELS[state.lastThrow] : null}
        />

        {/* 던지기 단계 */}
        {state.phase === 'throw' && (
          <button type="button" className="primary throw" disabled={Boolean(rolling)} onClick={throwSticksNow}>
            {rolling ? '던지는 중…' : '윷 던지기'}
          </button>
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
              <p className="hint">움직일 말을 고르세요 (판이나 대기 공간의 노란 테두리)</p>
            ) : (
              <>
                <p className="hint">갈 곳을 고르세요 (깜빡이는 자리)</p>
                <button type="button" className="chip" onClick={() => setPickedPiece(null)}>
                  다른 말 고르기
                </button>
              </>
            )}
          </div>
        )}


      </aside>
    </div>
  )
}
