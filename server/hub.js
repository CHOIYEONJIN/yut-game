// 서버와 화면(소켓)을 잇는 곳
// 사람마다 "지금 어디에 있는지"(입구/빠른대전 줄/친선대전 방/게임)를 기억하고,
// 화면에서 온 메시지를 빠른대전 줄(matchmaking.js), 친선대전 방(rooms.js), 게임 한 판(match.js)에 전달한다.
import { createQueue } from './matchmaking.js'
import { createRooms } from './rooms.js'
import { createMatch } from './match.js'

// 닉네임 정리: 앞뒤 공백을 빼고 최대 10글자, 비어 있으면 기본 이름
function cleanName(name) {
  const text = typeof name === 'string' ? name.trim().slice(0, 10) : ''
  return text || '이름없음'
}

export function createHub(io, timing = {}) {
  const { countdownMs, turnMs, botDelayMs, rollMs } = timing
  // playerId → { playerId, name, socket, place, matchId, offer }
  //   place: 'entrance' | 'queue' | 'room' | 'game' (게임 화면을 보는 중) | 'away' (끊김)
  //   matchId: 나가지 않은 게임이 있으면 그 번호, offer: "이어하기/나가기"를 묻는 중인지
  const people = new Map()
  const matches = new Map() // matchId → { match, players: [playerId], code }
  let nextMatchId = 1

  const emitTo = (playerId, event, data) => people.get(playerId)?.socket?.emit(event, data)

  function moveTo(person, place) {
    person.place = place
    person.socket?.emit('where', { place })
  }

  const queue = createQueue({
    countdownMs,
    onUpdate: (view) => queue.members().forEach((id) => emitTo(id, 'queue', view)),
    startMatch: (seats) => beginMatch(seats, null),
  })

  const rooms = createRooms({ startMatch: (code, seats) => beginMatch(seats, code) })

  // 방 안의 모두에게 방 모습을 보낸다 (myIndex: 받는 사람이 목록의 몇 번째인지, 0이면 방장)
  function sendRoom(code) {
    const view = rooms.view(code)
    if (view) rooms.members(code).forEach((id, i) => emitTo(id, 'room', { ...view, myIndex: i }))
  }

  // 게임을 보는 사람들에게 각자의 자리 번호와 함께 게임 모습을 보낸다
  function sendGame(id) {
    const entry = matches.get(id)
    if (!entry) return
    const view = entry.match.view()
    for (const playerId of entry.players) {
      const person = people.get(playerId)
      if (person?.matchId === id && person.place === 'game') {
        person.socket?.emit('game', { ...view, mySeat: entry.match.seatOf(playerId) })
      }
    }
  }

  function beginMatch(seats, code) {
    const id = nextMatchId++
    const players = seats.filter((s) => s.kind === 'human').map((s) => s.playerId)
    const entry = { players, code, match: null }
    matches.set(id, entry)
    entry.match = createMatch({
      seats,
      turnMs,
      botDelayMs,
      rollMs,
      onUpdate: () => sendGame(id),
      onEnd: ({ winner }) => endMatch(id, winner),
    })
    for (const playerId of players) {
      const person = people.get(playerId)
      person.matchId = id
      moveTo(person, 'game')
    }
    entry.match.start()
  }

  // 게임이 끝났다: 아직 그 게임에 있는 사람들에게 결과를 알리고 입구로 보낸다
  function endMatch(id, winner) {
    const entry = matches.get(id)
    if (!entry) return
    const { state } = entry.match.view()
    const result = { winner: winner === null ? null : { name: state.players[winner].name, color: state.players[winner].color } }
    for (const playerId of entry.players) {
      const person = people.get(playerId)
      if (person?.matchId !== id) continue
      person.matchId = null
      person.offer = false
      person.socket?.emit('game:over', result)
      if (person.place !== 'away') moveTo(person, 'entrance')
    }
    if (entry.code) rooms.end(entry.code)
    matches.delete(id)
  }

  // 아무 데도 들어가 있지 않은 사람인지 (빠른대전/친선대전을 새로 시작할 수 있는지)
  const isFree = (person) => person.place === 'entrance' && !person.matchId && !person.offer

  io.on('connection', (socket) => {
    let person = null // 이 소켓의 사람 (hello를 받은 뒤 정해진다)

    // 화면에서 온 메시지를 처리하다 오류가 나도 서버 전체가 멈추지 않게 감싼다
    const safe = (handler) => (data) => {
      try {
        handler(data)
      } catch (error) {
        console.error('메시지 처리 중 오류:', error)
      }
    }

    socket.on('hello', safe((data) => {
      const { playerId, name, resume } = data ?? {}
      if (person || typeof playerId !== 'string' || playerId.length === 0 || playerId.length > 100) return
      person = people.get(playerId)
      if (person?.socket) {
        // 같은 사람이 새 창으로 접속: 이전 창은 끊되, "끊김"으로 치지 않는다
        const old = person.socket
        old.data.replaced = true
        old.emit('replaced')
        old.disconnect(true)
      }
      if (!person) {
        person = { playerId, name: '', socket: null, place: 'entrance', matchId: null, offer: false }
        people.set(playerId, person)
      }
      person.socket = socket
      person.name = cleanName(name)

      // 나가지 않은 게임이 있으면: 방금까지 하던 중이면 바로 이어서, 아니면 이어할지 묻는다
      const entry = matches.get(person.matchId)
      if (entry && entry.match.seatOf(playerId) >= 0) {
        if (resume) {
          person.offer = false
          moveTo(person, 'game')
          entry.match.setConnected(playerId, true)
          sendGame(person.matchId)
        } else {
          person.offer = true
          moveTo(person, 'entrance')
          socket.emit('resume:offer')
        }
        return
      }
      if (person.place === 'queue' && queue.has(playerId)) {
        moveTo(person, 'queue')
        socket.emit('queue', queue.view())
      } else if (person.place === 'room' && rooms.codeOf(playerId)) {
        moveTo(person, 'room')
        sendRoom(rooms.codeOf(playerId))
      } else {
        moveTo(person, 'entrance')
      }
    }))

    // hello 전에 온 메시지는 무시한다
    const on = (event, handler) =>
      socket.on(event, safe((data) => person && person.socket === socket && handler(data ?? {})))

    on('queue:join', () => {
      if (!isFree(person)) return
      moveTo(person, 'queue')
      queue.join({ playerId: person.playerId, name: person.name })
    })
    on('queue:leave', () => {
      if (person.place !== 'queue') return
      queue.leave(person.playerId)
      moveTo(person, 'entrance')
    })
    on('queue:bots', () => {
      if (person.place === 'queue') queue.startWithBots(person.playerId)
    })

    on('room:create', () => {
      if (!isFree(person)) return
      const code = rooms.create({ playerId: person.playerId, name: person.name })
      moveTo(person, 'room')
      sendRoom(code)
    })
    on('room:join', ({ code }) => {
      if (!isFree(person)) return
      const result = rooms.join(code, { playerId: person.playerId, name: person.name })
      if (!result.ok) return socket.emit('room:error', { error: result.error })
      moveTo(person, 'room')
      sendRoom(rooms.codeOf(person.playerId))
    })
    on('room:leave', () => {
      if (person.place !== 'room') return
      const code = rooms.leave(person.playerId)
      moveTo(person, 'entrance')
      sendRoom(code)
    })
    on('room:start', () => {
      if (person.place === 'room') rooms.start(person.playerId)
    })

    on('game:action', ({ action }) => {
      const entry = matches.get(person.matchId)
      if (entry && person.place === 'game') entry.match.act(person.playerId, action)
    })
    on('game:resume', () => {
      const entry = matches.get(person.matchId)
      if (!entry || !person.offer) return
      person.offer = false
      moveTo(person, 'game')
      entry.match.setConnected(person.playerId, true)
      sendGame(person.matchId)
    })
    on('game:leave', () => {
      const entry = matches.get(person.matchId)
      if (!entry) return
      person.matchId = null
      person.offer = false
      moveTo(person, 'entrance')
      entry.match.leave(person.playerId)
    })

    socket.on('disconnect', () => {
      if (!person || socket.data.replaced || person.socket !== socket) return
      person.socket = null
      person.offer = false
      if (person.place === 'queue') queue.leave(person.playerId)
      if (person.place === 'room') sendRoom(rooms.leave(person.playerId))
      const entry = matches.get(person.matchId)
      if (entry) {
        person.place = 'away'
        entry.match.setConnected(person.playerId, false)
      } else {
        person.place = 'entrance'
      }
    })
  })

  return {
    // 서버를 끌 때: 진행 중인 게임의 예약을 모두 멈춘다
    close() {
      for (const entry of matches.values()) entry.match.stop()
      matches.clear()
    },
  }
}
