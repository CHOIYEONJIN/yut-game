// 서버와 주고받기 (React 훅)
// 서버에서 온 메시지를 화면이 쓰기 좋은 값들로 정리해 두고, 화면은 send()로 서버에 행동을 보낸다.
// 메시지 이름은 server/hub.js와 같다.
import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

// 접속할 서버 주소: 빌드할 때 VITE_SERVER_URL로 정한다. 없으면 내 컴퓨터의 서버.
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

// 이 시간 안에 연결되지 않으면 "서버를 깨우는 중…"을 보여 준다 (무료 서버는 잠들어 있을 수 있다)
const WAKE_MS = 3000

export function useServer(identity) {
  const [status, setStatus] = useState('connecting') // 'connecting' | 'waking' | 'online' | 'replaced'
  const [place, setPlace] = useState(null) // 'entrance' | 'queue' | 'room' | 'game'
  const [queue, setQueue] = useState(null)
  const [room, setRoom] = useState(null)
  const [roomError, setRoomError] = useState(null)
  const [game, setGame] = useState(null)
  const [gameOver, setGameOver] = useState(null)
  const [resumeOffer, setResumeOffer] = useState(false)
  const socketRef = useRef(null)
  const inGameRef = useRef(false) // 이 페이지에서 방금까지 게임을 하던 중인지 (잠깐 끊겼다 이어지면 바로 이어하기)

  useEffect(() => {
    const socket = io(SERVER_URL)
    socketRef.current = socket
    let replaced = false
    const wake = setTimeout(() => setStatus((s) => (s === 'connecting' ? 'waking' : s)), WAKE_MS)

    socket.on('connect', () => {
      setStatus('online')
      socket.emit('hello', { playerId: identity.playerId, name: identity.name, resume: inGameRef.current })
    })
    socket.on('disconnect', () => {
      if (!replaced) setStatus('connecting')
    })
    socket.on('where', ({ place }) => {
      setPlace(place)
      inGameRef.current = place === 'game'
      setRoomError(null)
      if (place !== 'queue') setQueue(null)
      if (place !== 'room') setRoom(null)
      if (place !== 'game') setGame(null)
      if (place === 'game') {
        setResumeOffer(false)
        setGameOver(null)
      }
    })
    socket.on('queue', setQueue)
    socket.on('room', setRoom)
    socket.on('room:error', ({ error }) => setRoomError(error))
    socket.on('game', setGame)
    socket.on('game:over', (result) => {
      inGameRef.current = false
      setResumeOffer(false) // 이어할지 묻던 게임이 끝났으면 더 묻지 않는다
      setGameOver(result)
    })
    socket.on('resume:offer', () => setResumeOffer(true))
    socket.on('replaced', () => {
      replaced = true
      setStatus('replaced')
    })

    return () => {
      clearTimeout(wake)
      socket.disconnect()
    }
  }, [identity.playerId, identity.name])

  // 서버에 행동을 보낸다
  const send = (event, data) => {
    if (event === 'game:resume' || event === 'game:leave') setResumeOffer(false)
    socketRef.current?.emit(event, data)
  }

  return {
    status,
    place,
    queue,
    room,
    roomError,
    game,
    gameOver,
    resumeOffer,
    send,
    clearGameOver: () => setGameOver(null),
  }
}
