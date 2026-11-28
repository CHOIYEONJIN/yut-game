// 서버와 화면 연결(hub.js) 검사: 진짜 서버를 빈 포트에 띄우고, 진짜 소켓으로 접속해 본다.
import { test, expect, beforeEach, afterEach } from 'vitest'
import { io as connect } from 'socket.io-client'
import { createServer } from '../index.js'

const FAST = { countdownMs: 50, turnMs: 200, botDelayMs: 10, rollMs: 10 }
let server
const sockets = []

async function startServer(timing = FAST) {
  server = await createServer({ port: 0, timing })
}
beforeEach(() => startServer())
afterEach(async () => {
  sockets.splice(0).forEach((s) => s.disconnect())
  await server.close()
})

// 소켓을 열고 hello를 보낸다. 받은 메시지는 모두 기록해 두고 waitFor로 꺼내 본다.
function connectAs(playerId, name = playerId, resume = false) {
  const socket = connect(`http://localhost:${server.port}`, { forceNew: true, transports: ['websocket'] })
  socket.log = []
  socket.waiters = []
  socket.onAny((event, data) => {
    const entry = { event, data, used: false }
    socket.log.push(entry)
    for (const w of socket.waiters) {
      if (!entry.used && w.event === event && w.pred(data)) {
        entry.used = true
        socket.waiters = socket.waiters.filter((x) => x !== w)
        w.resolve(data)
      }
    }
  })
  socket.on('connect', () => socket.emit('hello', { playerId, name, resume }))
  sockets.push(socket)
  return socket
}

// 아직 꺼내지 않은 메시지 중 조건에 맞는 첫 메시지를 기다린다
function waitFor(socket, event, pred = () => true, ms = 3000) {
  const found = socket.log.find((e) => !e.used && e.event === event && pred(e.data))
  if (found) {
    found.used = true
    return Promise.resolve(found.data)
  }
  return new Promise((resolve, reject) => {
    const w = { event, pred, resolve }
    socket.waiters.push(w)
    setTimeout(() => reject(new Error(`${event} 메시지가 오지 않았습니다`)), ms)
  })
}
const place = (p) => (d) => d.place === p
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 두 사람이 친선대전 방에서 만나 게임을 시작한다
async function friendlyGame() {
  const a = connectAs('a')
  await waitFor(a, 'where', place('entrance'))
  a.emit('room:create')
  const { code } = await waitFor(a, 'room')
  const b = connectAs('b')
  await waitFor(b, 'where', place('entrance'))
  b.emit('room:join', { code })
  await waitFor(a, 'room', (v) => v.players.length === 2)
  a.emit('room:start')
  await waitFor(a, 'where', place('game'))
  await waitFor(b, 'where', place('game'))
  return { a, b }
}

test('혼자 빠른대전 → 컴퓨터와 바로 하기 → game을 받고 mySeat이 0이다', async () => {
  const a = connectAs('a')
  await waitFor(a, 'where', place('entrance'))
  a.emit('queue:join')
  await waitFor(a, 'where', place('queue'))
  expect(await waitFor(a, 'queue')).toEqual({ players: ['a'], msLeft: null })
  a.emit('queue:bots')
  await waitFor(a, 'where', place('game'))
  const game = await waitFor(a, 'game')
  expect(game.mySeat).toBe(0)
  expect(game.seats.map((s) => s.kind)).toEqual(['human', 'bot', 'bot', 'bot'])
})

test('두 사람이 친선대전 방에서 만나 시작하고, 한 사람의 던지기가 두 화면 모두에 보인다', async () => {
  const { a, b } = await friendlyGame()
  expect((await waitFor(b, 'game')).mySeat).toBe(1)
  a.emit('game:action', { action: { type: 'throw' } })
  await waitFor(a, 'game', (g) => g.throwSeq === 1)
  await waitFor(b, 'game', (g) => g.throwSeq === 1)
})

test('방 모습에는 받는 사람의 순서(myIndex)가 들어 있다 (0이면 방장)', async () => {
  const a = connectAs('a')
  await waitFor(a, 'where', place('entrance'))
  a.emit('room:create')
  const { code, myIndex } = await waitFor(a, 'room')
  expect(myIndex).toBe(0)
  const b = connectAs('b')
  await waitFor(b, 'where', place('entrance'))
  b.emit('room:join', { code })
  expect((await waitFor(b, 'room')).myIndex).toBe(1)
})

test('없는 초대코드로 들어가면 room:error NOT_FOUND', async () => {
  const a = connectAs('a')
  await waitFor(a, 'where', place('entrance'))
  a.emit('room:join', { code: 'ZZZZ' })
  expect(await waitFor(a, 'room:error')).toEqual({ error: 'NOT_FOUND' })
})

test('같은 playerId로 새 창이 접속하면 이전 창은 replaced를 받고, 줄에서는 빠지지 않는다', async () => {
  const a1 = connectAs('a')
  await waitFor(a1, 'where', place('entrance'))
  a1.emit('queue:join')
  await waitFor(a1, 'queue')
  const a2 = connectAs('a')
  await waitFor(a1, 'replaced')
  await waitFor(a2, 'where', place('queue'))
  expect(await waitFor(a2, 'queue')).toEqual({ players: ['a'], msLeft: null })
  await sleep(50) // 이전 창이 끊긴 뒤에도
  const b = connectAs('b')
  await waitFor(b, 'where', place('entrance'))
  b.emit('queue:join')
  expect((await waitFor(b, 'queue')).players).toEqual(['a', 'b'])
})

test('게임 중 창을 닫았다 resume:false로 다시 오면 resume:offer, game:resume이면 game을 받는다', async () => {
  const { a } = await friendlyGame()
  a.disconnect()
  await sleep(50)
  const a2 = connectAs('a')
  await waitFor(a2, 'resume:offer')
  a2.emit('game:resume')
  await waitFor(a2, 'where', place('game'))
  expect((await waitFor(a2, 'game')).mySeat).toBe(0)
})

test('게임 나가기 뒤 다시 접속하면 resume:offer 없이 입구이고, 바로 빠른대전에 들어갈 수 있다', async () => {
  const { a } = await friendlyGame()
  a.emit('game:leave')
  await waitFor(a, 'where', place('entrance'))
  a.disconnect()
  const a2 = connectAs('a')
  await waitFor(a2, 'where', place('entrance'))
  await sleep(50)
  expect(a2.log.some((e) => e.event === 'resume:offer')).toBe(false)
  a2.emit('queue:join')
  await waitFor(a2, 'where', place('queue'))
})

test('두 사람이 아무것도 안 해도 시간 초과로 컴퓨터가 끝까지 두고, 둘 다 game:over를 받은 뒤 다시 빠른대전에 들어갈 수 있다', async () => {
  // 이 테스트만 timing { turnMs: 2, botDelayMs: 1, rollMs: 1 }
  await server.close()
  await startServer({ countdownMs: 50, turnMs: 2, botDelayMs: 1, rollMs: 1 })
  const { a, b } = await friendlyGame()
  const overA = await waitFor(a, 'game:over', () => true, 25000)
  const overB = await waitFor(b, 'game:over', () => true, 25000)
  expect(overA.winner).toEqual(overB.winner)
  expect(['a', 'b']).toContain(overA.winner.name)
  await waitFor(a, 'where', place('entrance'))
  a.emit('queue:join')
  await waitFor(a, 'where', place('queue'))
}, 30000)
