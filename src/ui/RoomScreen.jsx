// 친선대전 방 화면: 초대코드를 크게 보여 주고, 들어온 사람을 보여 준다. 방장이 2명 이상일 때 시작.
import PlayerSlots from './PlayerSlots.jsx'

export default function RoomScreen({ view, onStart, onLeave }) {
  if (!view) return <p className="setup hint">방에 들어가는 중…</p>
  const isHost = view.myIndex === view.hostIndex
  const notes = view.players.map((_, i) => [i === view.hostIndex ? '방장' : '', i === view.myIndex ? '나' : ''].filter(Boolean).join(' · '))

  return (
    <div className="setup">
      <h1 className="title">친선대전</h1>
      <p className="hint">친구에게 이 초대코드를 알려 주세요</p>
      <p className="invite-code" aria-label={`초대코드 ${view.code.split('').join(' ')}`}>
        {view.code}
      </p>
      <PlayerSlots players={view.players} notes={notes} />
      <div className="button-row">
        {isHost ? (
          <button type="button" className="primary" disabled={view.players.length < 2} onClick={onStart}>
            시작
          </button>
        ) : (
          <p className="hint">방장이 시작하기를 기다리는 중이에요.</p>
        )}
        <button type="button" className="chip" onClick={onLeave}>
          나가기
        </button>
      </div>
      {isHost && view.players.length < 2 && <p className="hint">2명 이상 모이면 시작할 수 있어요.</p>}
    </div>
  )
}
