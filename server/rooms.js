// 친선대전 방과 초대코드
// 방장이 방을 만들면 초대코드가 생기고, 친구가 그 코드로 들어온다. 방장이 2명 이상일 때 시작한다.
import { MAX_PLAYERS } from './matchmaking.js'

// 초대코드에 쓰는 글자 (헷갈리는 O, 0, I, 1은 뺐다)
export const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 4

export function createRooms({ startMatch, random = Math.random }) {
  // code → { code, players: [{ playerId, name }], started }  (players[0]이 방장)
  const rooms = new Map()

  // 아직 없는 새 코드를 만든다
  function newCode() {
    for (;;) {
      let code = ''
      for (let i = 0; i < CODE_LENGTH; i++) code += CODE_LETTERS[Math.floor(random() * CODE_LETTERS.length)]
      if (!rooms.has(code)) return code
    }
  }

  // 화면에서 온 코드는 글자일 때만 찾는다 (이상한 값이 와도 서버가 멈추지 않게)
  const find = (code) => (typeof code === 'string' ? rooms.get(code.trim().toUpperCase()) : undefined)

  // 이 사람이 들어가 있는 "시작 전" 방의 코드.
  // 시작한 방은 게임이 끝날 때까지 남아 있지만, 그 게임에서 나간 사람이 새 방에 들어갈 수 있도록 건너뛴다.
  function codeOf(playerId) {
    for (const room of rooms.values()) {
      if (!room.started && room.players.some((p) => p.playerId === playerId)) return room.code
    }
    return null
  }

  return {
    create({ playerId, name }) {
      const code = newCode()
      rooms.set(code, { code, players: [{ playerId, name }], started: false })
      return code
    },

    join(code, { playerId, name }) {
      const room = find(code)
      if (!room) return { ok: false, error: 'NOT_FOUND' }
      if (room.started) return { ok: false, error: 'STARTED' }
      if (room.players.length >= MAX_PLAYERS) return { ok: false, error: 'FULL' }
      if (!room.players.some((p) => p.playerId === playerId)) room.players.push({ playerId, name })
      return { ok: true }
    },

    // 시작 전 방에서 나간다. 방장이 나가면 다음 사람이 방장(목록의 첫 사람), 아무도 없으면 방 삭제
    leave(playerId) {
      const code = codeOf(playerId)
      const room = rooms.get(code)
      if (!room) return null
      room.players = room.players.filter((p) => p.playerId !== playerId)
      if (room.players.length === 0) rooms.delete(code)
      return code
    },

    // 방장이고, 2명 이상이고, 아직 시작 전일 때만 시작
    start(playerId) {
      const room = rooms.get(codeOf(playerId))
      if (!room || room.players.length < 2 || room.players[0].playerId !== playerId) return false
      room.started = true
      startMatch(
        room.code,
        room.players.map((p) => ({ playerId: p.playerId, name: p.name, kind: 'human' })),
      )
      return true
    },

    // 게임이 끝나면 방을 지운다
    end(code) {
      rooms.delete(code)
    },

    codeOf,
    members: (code) => (rooms.get(code)?.players ?? []).map((p) => p.playerId),

    view(code) {
      const room = rooms.get(code)
      if (!room) return null
      return { code: room.code, players: room.players.map((p) => p.name), hostIndex: 0, started: room.started }
    },
  }
}
