// 앱 전체: 닉네임 → 서버 연결 → 서버가 알려 준 위치(입구/빠른대전/친선대전 방/게임)에 맞는 화면
import { useState } from 'react'
import { getIdentity, saveName } from './net/identity.js'
import { useServer } from './net/useServer.js'
import NameScreen from './ui/NameScreen.jsx'
import EntranceScreen from './ui/EntranceScreen.jsx'
import QueueScreen from './ui/QueueScreen.jsx'
import RoomScreen from './ui/RoomScreen.jsx'
import ResultScreen from './ui/ResultScreen.jsx'
import GameScreen from './ui/GameScreen.jsx'

export default function App() {
  const [identity, setIdentity] = useState(() => getIdentity())

  if (!identity.name) {
    return (
      <NameScreen
        onSave={(name) => {
          saveName(name)
          setIdentity(getIdentity())
        }}
      />
    )
  }
  return <Online identity={identity} />
}

// 서버에 연결된 뒤의 화면들
function Online({ identity }) {
  const server = useServer(identity)
  const { status, place, send } = server

  if (status === 'replaced') return <Notice text="다른 창에서 접속했습니다" />
  if (status === 'waking') return <Notice text="서버를 깨우는 중…" sub="처음 접속하면 1분쯤 걸릴 수 있어요" />
  if (status === 'connecting' || !place) return <Notice text="서버에 연결하는 중…" />

  if (server.gameOver) return <ResultScreen winner={server.gameOver.winner} onBack={server.clearGameOver} />

  if (server.resumeOffer) {
    return (
      <div className="setup">
        <h1 className="title">진행 중인 게임이 있어요</h1>
        <div className="button-row">
          <button type="button" className="primary" onClick={() => send('game:resume')}>
            이어하기
          </button>
          <button type="button" className="chip" onClick={() => send('game:leave')}>
            나가기
          </button>
        </div>
      </div>
    )
  }

  if (place === 'queue') {
    return <QueueScreen view={server.queue} onBots={() => send('queue:bots')} onLeave={() => send('queue:leave')} />
  }
  if (place === 'room') {
    return <RoomScreen view={server.room} onStart={() => send('room:start')} onLeave={() => send('room:leave')} />
  }
  if (place === 'game') {
    if (!server.game) return <Notice text="게임을 불러오는 중…" />
    return (
      <GameScreen
        view={server.game}
        mySeat={server.game.mySeat}
        onAction={(action) => send('game:action', { action })}
        onLeave={() => send('game:leave')}
      />
    )
  }
  return (
    <EntranceScreen
      name={identity.name}
      error={server.roomError}
      onQuick={() => send('queue:join')}
      onCreate={() => send('room:create')}
      onJoin={(code) => send('room:join', { code })}
    />
  )
}

// 가운데에 안내 글 하나만 보여 주는 화면
function Notice({ text, sub }) {
  return (
    <div className="setup" role="status">
      <h1 className="title">{text}</h1>
      {sub && <p className="hint">{sub}</p>}
    </div>
  )
}
