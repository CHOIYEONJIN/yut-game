// 서버의 게임 한 판
// 소켓(인터넷 연결)은 모른다. 행동을 받아 규칙 함수로 판정하고, 바뀐 모습을 onUpdate로 알린다.
// 컴퓨터 차례, 30초 시간 제한, 접속 끊김과 나가기도 여기서 처리한다.
import { createGame, throwYut, applyMove } from '../src/rules/game.js'
import { botStep } from '../src/rules/bot.js'

// 목록의 순서를 무작위로 섞은 새 목록을 돌려준다 (원래 목록은 그대로).
// 게임을 시작할 때 차례 순서를 정하는 데 쓴다: 먼저 들어온 사람이 늘 먼저 하지 않도록.
// 방법: 뒤에서부터 한 칸씩, 그 칸과 그 앞의 아무 칸이나 하나 골라 자리를 바꾼다.
export function shuffle(items, random = Math.random) {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

// seats: [{ playerId, name, kind: 'human' | 'bot' }] (순서 = 플레이어 번호)
export function createMatch({
  seats,
  random = Math.random,
  turnMs = 30000, // 사람의 한 동작 제한 시간
  botDelayMs = 1000, // 컴퓨터가 "생각하는" 시간
  rollMs = 900, // 윷가락이 굴러가는 시간 (화면의 ROLL_MS와 같게)
  emptyGraceMs = 60000, // 접속한 사람이 아무도 없을 때 게임을 남겨 두는 시간 (그사이 돌아오면 이어서 한다)
  onUpdate = () => {},
  onEnd = () => {},
  initialState, // 테스트에서 상태를 꾸밀 때만 쓴다
}) {
  let state = initialState ?? createGame(seats.map((s) => s.name))
  // 자리 상태: 'playing'(사람이 두는 중) | 'away'(끊김) | 'left'(완전히 나감) | 'bot'(컴퓨터 자리)
  const seatInfo = seats.map((s) => ({ ...s, status: s.kind === 'bot' ? 'bot' : 'playing' }))
  let autoThisTurn = false // 이번 차례를 컴퓨터가 대신 두는 중 (차례가 바뀔 때만 꺼진다)
  let lastCurrent = state.current
  let throwSeq = 0 // 던질 때마다 1씩 증가 (화면이 굴림 움직임을 시작하는 신호)
  let timer = null // 예약은 하나만 둔다
  let deadline = null // 사람이 직접 둘 때 이 동작의 마감 시각
  let justThrew = false // 방금 던졌는지 (굴러가는 시간만큼 기다려 주기 위해)
  let ended = false
  let graceTimer = null // 사람이 모두 끊겼을 때 게임을 끝내는 예약

  // 지금 차례를 컴퓨터가 두는지
  const botControls = () => {
    const seat = seatInfo[state.current]
    return seat.kind === 'bot' || seat.status !== 'playing' || autoThisTurn
  }

  function view() {
    const seat = seatInfo[state.current]
    return {
      state,
      seats: seatInfo.map(({ name, kind, status }) => ({ name, kind, status })),
      auto: seat.kind === 'human' && botControls() && state.phase !== 'over',
      turnMsLeft: deadline === null ? null : Math.min(turnMs, Math.max(0, deadline - Date.now())),
      throwSeq,
    }
  }

  // 다음 할 일을 예약한다: 컴퓨터가 둘 차례면 컴퓨터 한 동작, 사람 차례면 시간 초과
  function schedule() {
    clearTimeout(timer)
    timer = null
    deadline = null
    const wait = justThrew ? rollMs : 0
    if (botControls()) {
      timer = setTimeout(runBot, wait + botDelayMs)
    } else {
      deadline = Date.now() + wait + turnMs
      timer = setTimeout(() => {
        autoThisTurn = true // 시간 초과: 이번 차례는 컴퓨터가 마저 둔다
        afterChange(true)
      }, wait + turnMs)
    }
  }

  // 컴퓨터가 한 동작을 한다
  function runBot() {
    if (ended) return
    if (seatInfo[state.current].kind === 'human') autoThisTurn = true
    const threw = state.phase === 'throw'
    state = botStep(state, random)
    if (threw) throwSeq++
    afterChange(true, threw)
  }

  // 게임 끝내기 (한 번만)
  function finish(winner) {
    ended = true
    clearTimeout(graceTimer)
    graceTimer = null
    clearTimeout(timer)
    timer = null
    deadline = null
    onEnd({ winner })
  }

  // 무언가 바뀐 뒤에 한 곳에서 정리한다.
  // reschedule이 false면 지금 차례의 시간은 그대로 둔다 (차례가 아닌 사람이 끊기거나 돌아온 경우)
  function afterChange(reschedule = true, threw = false) {
    if (reschedule) justThrew = threw
    if (state.current !== lastCurrent) {
      lastCurrent = state.current
      autoThisTurn = false // 차례가 바뀌면 다시 본인이 둔다
    }
    if (state.phase === 'over') {
      deadline = null
      onUpdate(view())
      finish(state.winner)
      return
    }
    // 접속한 사람이 아무도 없을 때:
    // - 모두 "게임 나가기"로 완전히 나갔으면 바로 끝낸다
    // - 끊긴 사람이 있으면 1분 동안 기다린다 (그사이 컴퓨터가 대신 두고, 돌아오면 이어서 한다)
    const humans = seatInfo.filter((s) => s.kind === 'human')
    if (!humans.some((s) => s.status === 'playing')) {
      const endNow = () => {
        clearTimeout(timer)
        deadline = null
        onUpdate(view())
        finish(null)
      }
      if (!humans.some((s) => s.status === 'away')) return endNow()
      if (graceTimer === null) graceTimer = setTimeout(endNow, emptyGraceMs)
    } else if (graceTimer !== null) {
      clearTimeout(graceTimer) // 누군가 돌아왔다
      graceTimer = null
    }
    if (reschedule) schedule()
    onUpdate(view())
  }

  const indexOf = (playerId) => seatInfo.findIndex((s) => s.kind === 'human' && s.playerId === playerId)

  return {
    start() {
      afterChange(true)
    },

    // 사람의 행동. 받아들였으면 true
    act(playerId, action) {
      if (ended || indexOf(playerId) !== state.current || botControls()) return false
      let next = state
      if (action?.type === 'throw') next = throwYut(state, random)
      else if (action?.type === 'move') next = applyMove(state, action.move ?? {})
      if (next === state) return false // 할 수 없는 행동
      state = next
      const threw = action.type === 'throw'
      if (threw) throwSeq++
      afterChange(true, threw)
      return true
    },

    // 접속이 끊기거나 다시 이어졌을 때
    setConnected(playerId, connected) {
      const i = indexOf(playerId)
      if (ended || i < 0 || seatInfo[i].status === 'left') return
      seatInfo[i].status = connected ? 'playing' : 'away'
      const myTurn = i === state.current
      if (!connected && myTurn) autoThisTurn = true // 끊긴 사람의 이번 차례는 컴퓨터가 마저
      afterChange(myTurn && !connected)
    },

    // 완전히 나감: 이 자리는 끝까지 컴퓨터가 둔다
    leave(playerId) {
      const i = indexOf(playerId)
      if (ended || i < 0 || seatInfo[i].status === 'left') return
      seatInfo[i].status = 'left'
      const myTurn = i === state.current
      if (myTurn) autoThisTurn = true
      afterChange(myTurn)
    },

    // 나가지 않은 사람의 자리 번호 (없으면 -1)
    seatOf(playerId) {
      const i = indexOf(playerId)
      return i >= 0 && seatInfo[i].status !== 'left' ? i : -1
    },

    view,

    stop() {
      ended = true
      clearTimeout(graceTimer)
      clearTimeout(timer)
      timer = null
    },
  }
}
