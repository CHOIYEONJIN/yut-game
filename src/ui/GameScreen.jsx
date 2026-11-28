// 게임 화면 (온라인): 윷판 + 오른쪽 패널(차례, 남은 시간, 윷가락, 모인 결과)
// 규칙 판단은 서버가 한다. 이 화면은 서버가 보낸 게임 모습(view)을 그리고,
// 내 차례일 때 고른 행동(던지기, 이동)을 onAction으로 서버에 보낼 뿐이다.
import { useEffect, useRef, useState } from 'react'
import Board from './Board.jsx'
import { getLegalMoves } from '../rules/game.js'
import { RESULT_LABELS } from '../rules/yut.js'
import { usableResults, stacksOnOwnPiece } from './selection.js'
import YutSticks from './YutSticks.jsx'
import HomeTray from './HomeTray.jsx'
import { useCountdown } from './useCountdown.js'

// 윷가락이 굴러가는 시간 (밀리초). App.css의 stick-roll 움직임 길이, 서버의 rollMs와 맞춘다.
const ROLL_MS = 900

// props
// - view: 서버가 보낸 게임 모습 { state, seats, auto, turnMsLeft, throwSeq }
// - mySeat: 내 자리 번호
// - onAction(action): { type: 'throw' } 또는 { type: 'move', move: { resultIndex, pieceId, route } }
// - onLeave(): 게임 나가기
export default function GameScreen({ view, mySeat, onAction, onLeave }) {
  const [shown, setShown] = useState(view) // 지금 화면에 그리는 모습 (굴러가는 동안은 이전 모습)
  const [rollingSticks, setRollingSticks] = useState(null) // 굴러가는 중이면 새 윷가락 모양
  const [rollKey, setRollKey] = useState(0)
  const [pickedResult, setPickedResult] = useState(null) // 고른 결과 (예: 'gae')
  const [pickedPiece, setPickedPiece] = useState(null) // 고른 말 id
  const [sent, setSent] = useState(false) // 행동을 보내고 서버의 답을 기다리는 중 (두 번 누르기 방지)

  // 서버에서 온 모습들을 순서대로 보여 준다. 던진 모습이면 먼저 윷가락을 굴린다.
  const queueRef = useRef([])
  const busyRef = useRef(false)
  const shownRef = useRef(view)
  const timerRef = useRef(null)

  useEffect(() => {
    const show = (next) => {
      shownRef.current = next
      setShown(next)
      setPickedResult(null)
      setPickedPiece(null)
      setSent(false)
    }
    const pump = () => {
      if (busyRef.current) return
      const next = queueRef.current.shift()
      if (!next) return
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (next.throwSeq > shownRef.current.throwSeq && !reduceMotion) {
        busyRef.current = true
        setRollingSticks(next.state.lastSticks ?? { faces: [false, false, false, false], out: [false, false, false, false] })
        setRollKey((k) => k + 1)
        timerRef.current = setTimeout(() => {
          busyRef.current = false
          setRollingSticks(null)
          show(next)
          pump()
        }, ROLL_MS)
      } else {
        show(next)
        pump()
      }
    }
    queueRef.current.push(view)
    pump()
  }, [view])

  // 화면을 떠나면 굴림 예약을 지운다
  useEffect(() => () => clearTimeout(timerRef.current), [])

  const { state, seats } = shown
  const player = state.players[state.current]
  const rolling = Boolean(rollingSticks)
  // 내가 지금 조작할 수 있는지: 최신 모습이고, 내 차례이고, 컴퓨터가 대신 두는 중이 아님
  const canAct = !rolling && !sent && shown === view && state.current === mySeat && !shown.auto && state.phase !== 'over'
  const seconds = useCountdown(rolling ? null : shown.turnMsLeft, shown)

  const moves = canAct ? getLegalMoves(state) : []
  // 지금 실제로 쓸 수 있는 결과들 (예: 판에 말이 없으면 빽도는 못 씀)
  const usable = usableResults(state, moves)
  // 쓸 수 있는 결과가 한 종류뿐이면 자동으로 고른 것으로 본다 (클릭을 줄이기 위해)
  const result = usable.includes(pickedResult) ? pickedResult : usable.length === 1 ? usable[0] : null

  // 고른 결과로 할 수 있는 이동들, 그중 고른 말의 이동들
  const resultMoves = result ? moves.filter((m) => state.pool[m.resultIndex] === result) : []
  const pieceMoves = resultMoves.filter((m) => m.pieceId === pickedPiece)
  const clickableIds = [...new Set(resultMoves.map((m) => m.pieceId))]

  const targets = pieceMoves.map((m, i) => ({
    key: String(i),
    to: m.to,
    finishes: m.finishes,
    stacks: stacksOnOwnPiece(state, m), // 내 말 위로 가면 "업기"라고 표시
    label: m.finishes ? '완주' : `${m.route === 'shortcut' ? '지름길로 ' : m.route === 'outer' ? '바깥길로 ' : ''}${m.to}번 칸으로 이동`,
  }))

  const act = (action) => {
    setSent(true)
    onAction(action)
  }

  const pickResult = (r) => {
    setPickedResult(r)
    setPickedPiece(null)
  }

  const isMe = state.current === mySeat

  return (
    <div className="game">
      <div className="game-board">
        <Board
          state={state}
          clickablePieceIds={clickableIds}
          selectedPieceId={pickedPiece}
          targets={targets}
          onPieceClick={setPickedPiece}
          onTargetClick={(key) => {
            const { resultIndex, pieceId, route } = pieceMoves[Number(key)]
            act({ type: 'move', move: { resultIndex, pieceId, route } })
          }}
        />
        <HomeTray
          state={state}
          seats={seats}
          mySeat={mySeat}
          clickablePieceIds={clickableIds}
          selectedPieceId={pickedPiece}
          onPieceClick={setPickedPiece}
        />
      </div>

      <aside className="panel">
        <h2 className="turn">
          <span className="dot" style={{ background: player.color }} aria-hidden="true" />
          {isMe ? '내 차례' : `${player.name} 차례`}
        </h2>
        {shown.auto && <p className="auto-note">자동 진행 중</p>}
        {seconds !== null && !shown.auto && (
          <p className={seconds <= 10 ? 'time-left urgent' : 'time-left'} role="timer">
            남은 시간 {seconds}초
          </p>
        )}

        {state.message && <p className="message" role="status">{state.message}</p>}

        {/* 윷가락 그림: 굴러가는 중이면 새 결과의 모양을, 아니면 마지막 결과를 보여 준다 */}
        <YutSticks
          sticks={rollingSticks ?? state.lastSticks}
          rolling={rolling}
          rollKey={rollKey}
          resultLabel={state.lastThrow ? RESULT_LABELS[state.lastThrow] : null}
        />

        {/* 던지기 단계 */}
        {state.phase === 'throw' &&
          (canAct ? (
            <button type="button" className="primary throw" onClick={() => act({ type: 'throw' })}>
              윷 던지기
            </button>
          ) : (
            <p className="hint">{rolling ? '던지는 중…' : isMe ? '' : `${player.name}의 차례를 기다리는 중…`}</p>
          ))}

        {/* 모인 결과 */}
        {state.pool.length > 0 && (
          <div className="pool">
            <p className="hint">{state.phase === 'throw' ? '한 번 더 던지세요. 모인 결과:' : canAct ? '쓸 결과를 고르세요' : '모인 결과:'}</p>
            <div className="pool-list">
              {state.pool.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  className={r === result ? 'chip active' : 'chip'}
                  disabled={!canAct || state.phase !== 'move' || !usable.includes(r)}
                  title={canAct && state.phase === 'move' && !usable.includes(r) ? '지금은 이 결과로 움직일 수 있는 말이 없습니다' : undefined}
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
              <p className="hint">움직일 말을 고르세요 (판 위는 점선 고리, 대기 공간은 금색 고리가 있는 말)</p>
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

        <button
          type="button"
          className="chip leave"
          onClick={() => {
            if (window.confirm('정말 게임에서 나갈까요? 내 자리는 끝까지 컴퓨터가 둡니다')) onLeave()
          }}
        >
          게임 나가기
        </button>
      </aside>
    </div>
  )
}
