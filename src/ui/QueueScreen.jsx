// 빠른대전 찾는 중 화면
import PlayerSlots from './PlayerSlots.jsx'
import { useCountdown } from './useCountdown.js'

export default function QueueScreen({ view, onBots, onLeave }) {
  const players = view?.players ?? []
  const seconds = useCountdown(view?.msLeft ?? null, view)
  const alone = players.length === 1

  return (
    <div className="setup">
      <h1 className="title">빠른대전 찾는 중…</h1>
      <PlayerSlots players={players} />
      <p className="hint" role="status">
        {seconds !== null
          ? `${seconds}초 뒤 시작해요. 빈자리는 컴퓨터가 채워요.`
          : '다른 사람이 들어오기를 기다리는 중이에요.'}
      </p>
      <div className="button-row">
        {alone && (
          <button type="button" className="primary" onClick={onBots}>
            컴퓨터와 바로 하기
          </button>
        )}
        <button type="button" className="chip" onClick={onLeave}>
          나가기
        </button>
      </div>
    </div>
  )
}
