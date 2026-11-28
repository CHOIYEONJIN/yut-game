// 빠른대전 기다리는 줄
// - 혼자면 자동으로 시작하지 않는다 ("컴퓨터와 바로 하기"로 직접 시작)
// - 2명 이상이면 30초를 세고, 끝나면 빈자리를 컴퓨터로 채워 4명으로 시작한다
// - 4명이 차면 바로 시작한다
export const MAX_PLAYERS = 4

// 빈자리를 컴퓨터로 채운 자리 목록 (컴퓨터1, 컴퓨터2 … 순서)
function fillWithBots(players) {
  const seats = players.map((p) => ({ playerId: p.playerId, name: p.name, kind: 'human' }))
  for (let n = 1; seats.length < MAX_PLAYERS; n++) {
    seats.push({ playerId: null, name: `컴퓨터${n}`, kind: 'bot' })
  }
  return seats
}

export function createQueue({ countdownMs = 30000, onUpdate = () => {}, startMatch }) {
  let players = [] // 들어온 순서대로 { playerId, name }
  let timer = null
  let countdownStart = null // 세기 시작한 시각 (세는 중이 아니면 null)

  function stopCountdown() {
    clearTimeout(timer)
    timer = null
    countdownStart = null
  }

  // 지금 줄에 있는 사람들로 게임을 시작하고 줄을 비운다
  function launch() {
    const seats = fillWithBots(players)
    players = []
    stopCountdown()
    startMatch(seats)
    onUpdate(view())
  }

  // 사람 수에 맞게 세기를 시작하거나 멈춘다
  function refresh() {
    if (players.length >= MAX_PLAYERS) return launch()
    if (players.length >= 2 && countdownStart === null) {
      countdownStart = Date.now()
      timer = setTimeout(launch, countdownMs)
    } else if (players.length < 2) {
      stopCountdown()
    }
    onUpdate(view())
  }

  function view() {
    return {
      players: players.map((p) => p.name),
      msLeft: countdownStart === null ? null : Math.max(0, countdownMs - (Date.now() - countdownStart)),
    }
  }

  const has = (playerId) => players.some((p) => p.playerId === playerId)

  return {
    join({ playerId, name }) {
      if (has(playerId)) return
      players.push({ playerId, name })
      refresh()
    },
    leave(playerId) {
      if (!has(playerId)) return
      players = players.filter((p) => p.playerId !== playerId)
      refresh()
    },
    // 줄에 그 사람 혼자일 때만 컴퓨터 3명과 바로 시작
    startWithBots(playerId) {
      if (players.length !== 1 || players[0].playerId !== playerId) return false
      launch()
      return true
    },
    has,
    members: () => players.map((p) => p.playerId),
    view,
  }
}
