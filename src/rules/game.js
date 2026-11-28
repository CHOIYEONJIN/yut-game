// 게임 진행 규칙
// 이 파일은 화면(React)에 대해 전혀 모른다. "현재 상태 + 행동"을 받아 "새 상태"를 돌려줄 뿐이다.
// 상태는 평범한 객체라서, 2단계에서 그대로 서버로 보내고 받을 수 있다.
import { throwSticks, isBonus, RESULTS } from './yut.js'
import { START, walk, routeOptions } from './board.js'

// 플레이어 색 (순서대로 빨강, 파랑, 초록, 노랑)
export const PLAYER_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fdd835']

// 플레이어 한 명당 말 개수
export const PIECES_PER_PLAYER = 4

// 새 게임 상태를 만든다. names: 플레이어 이름 목록 (2~4명)
export function createGame(names) {
  const players = names.map((name, i) => ({ name, color: PLAYER_COLORS[i] }))
  const pieces = []
  players.forEach((_, owner) => {
    for (let k = 0; k < PIECES_PER_PLAYER; k++) {
      // status: 'home'(출발 전) | 'board'(판 위) | 'waiting'(완주 대기) | 'done'(완주)
      // history: 지나온 칸 기록 (빽도 때 온 길로 되돌아가기 위해 저장)
      pieces.push({ id: pieces.length, owner, status: 'home', pos: null, history: [] })
    }
  })
  return {
    players,
    pieces,
    current: 0, // 지금 차례인 플레이어 번호
    phase: 'throw', // 'throw'(던지기) | 'move'(말 옮기기) | 'over'(게임 끝)
    throwsLeft: 1, // 던지기 단계에서 더 던질 수 있는 횟수
    pool: [], // 모인 윷 결과들
    lastThrow: null, // 방금 던진 결과 (화면 표시용)
    lastSticks: null, // 방금 던진 윷가락 모양 { faces, out } (화면 표시용)
    winner: null, // 우승한 플레이어 번호
    message: '', // 화면에 보여줄 안내 문구
  }
}

// 윷을 한 번 던진다. 던지기 단계가 아니면 아무것도 바꾸지 않는다.
export function throwYut(state, random = Math.random) {
  if (state.phase !== 'throw') return state
  const next = structuredClone(state)
  const { faces, out, result } = throwSticks(random)
  next.lastThrow = result
  next.lastSticks = { faces, out } // 화면에서 가락 모양을 그리기 위해 저장
  next.message = ''

  // 낙: 이번 던지기는 무효이고 더 던질 수 없다.
  // 모은 결과가 있으면 그것만 쓰고 차례가 끝나고, 없으면 바로 다음 사람 차례로 넘어간다.
  if (result === 'nak') {
    next.throwsLeft = 0
    if (next.pool.length === 0) {
      const name = next.players[next.current].name
      startNextTurn(next)
      next.lastThrow = 'nak' // 다음 사람도 낙이 나온 것을 볼 수 있게 남겨 둔다
      next.lastSticks = { faces, out }
      next.message = `낙! ${name}의 차례를 건너뜁니다`
    } else {
      next.phase = 'move'
      next.message = '낙! 모은 결과만 쓰고 차례가 끝납니다'
      passIfStuck(next, true) // 모은 결과로도 움직일 말이 없으면 자동으로 다음 차례
    }
    return next
  }

  next.pool.push(result)
  next.throwsLeft -= 1
  // 윷이나 모면 한 번 더 던진다
  if (isBonus(result)) next.throwsLeft += 1
  // 더 던질 것이 없으면 모인 결과를 쓰는 이동 단계로 넘어간다
  if (next.throwsLeft === 0) next.phase = 'move'
  passIfStuck(next, true) // 모은 결과로 움직일 말이 없으면 자동으로 다음 차례
  return next
}

// ---------------- 말 옮기기 ----------------

// 같은 칸에 있는 내 말들(업힌 말 묶음)을 찾는다
function groupOf(state, piece) {
  if (piece.status === 'home') return [piece]
  return state.pieces.filter(
    (p) => p.owner === piece.owner && (p.status === 'board' || p.status === 'waiting') && p.pos === piece.pos,
  )
}

// 현재 플레이어가 움직일 수 있는 말 묶음의 대표 말 목록
// - 판 위/완주 대기 말: 칸마다 가장 작은 id 하나 (업힌 말은 함께 움직이므로)
// - 출발 전 말: 가장 작은 id 하나만 (어떤 말을 꺼내든 결과가 같으므로)
function movableLeaders(state) {
  const mine = state.pieces.filter((p) => p.owner === state.current)
  const leaders = []
  const seenPos = new Set()
  for (const p of mine) {
    if (p.status === 'board' || p.status === 'waiting') {
      if (!seenPos.has(p.pos)) {
        seenPos.add(p.pos)
        leaders.push(p)
      }
    }
  }
  const home = mine.find((p) => p.status === 'home')
  if (home) leaders.push(home)
  return leaders
}

// 말 하나(묶음의 대표)에 결과 하나를 썼을 때 가능한 이동들
function movesFor(piece, result, resultIndex) {
  const steps = RESULTS[result]
  // 빽도: 출발 전 말은 못 쓰고, 판 위 말과 완주 대기 말은 지나온 칸 기록의 바로 전 칸으로 되돌아간다.
  // (완주 대기 말도 바깥길로 왔으면 19번, 10번 지름길로 왔으면 28번 칸으로)
  // 1번 칸에서 빽도로 완주 대기가 된 말처럼 되돌아갈 칸이 없으면 빽도를 쓸 수 없다.
  if (steps < 0) {
    if (piece.status === 'home' || piece.history.length < 2) return []
    const to = piece.history[piece.history.length - 2]
    return [{ resultIndex, pieceId: piece.id, route: null, to, finishes: false }]
  }
  // 완주 대기 말: 도 이상이 나오면 그 결과 하나를 써서 완주
  if (piece.status === 'waiting') {
    return [{ resultIndex, pieceId: piece.id, route: null, to: null, finishes: true }]
  }
  // 앞으로 가기: 출발 전 말은 0번 칸에서 출발하는 것으로 계산한다
  const start = piece.status === 'home' ? START : piece.pos
  return routeOptions(start).map((route) => {
    const { path, finished } = walk(start, steps, route)
    return { resultIndex, pieceId: piece.id, route, to: finished ? null : path[path.length - 1], finishes: finished }
  })
}

// 지금 할 수 있는 이동 목록. 이동 단계가 아니면 빈 목록.
// 이동 = { resultIndex: 모인 결과 중 몇 번째, pieceId: 움직일 말, route: 모서리에서 고른 길, to: 도착 칸, finishes: 완주 여부 }
export function getLegalMoves(state) {
  if (state.phase !== 'move') return []
  const moves = []
  const seenResults = new Set()
  state.pool.forEach((result, resultIndex) => {
    // 같은 결과가 여러 개 모였으면 첫 번째 것만 후보로 (어느 것을 써도 같으므로)
    if (seenResults.has(result)) return
    seenResults.add(result)
    for (const piece of movableLeaders(state)) {
      moves.push(...movesFor(piece, result, resultIndex))
    }
  })
  return moves
}

// 이동 하나를 적용한 새 상태를 돌려준다. 할 수 없는 이동이면 상태를 그대로 돌려준다.
export function applyMove(state, move) {
  const legal = getLegalMoves(state).find(
    (m) => m.resultIndex === move.resultIndex && m.pieceId === move.pieceId && m.route === move.route,
  )
  if (!legal) return state

  const next = structuredClone(state)
  const result = next.pool[legal.resultIndex]
  const leader = next.pieces[legal.pieceId]
  const group = groupOf(next, leader)

  // 새 지나온 칸 기록 만들기
  let history
  if (legal.finishes) {
    history = []
  } else if (RESULTS[result] < 0) {
    history = leader.history.slice(0, -1) // 빽도: 마지막 칸을 지운다
  } else {
    const base = leader.status === 'home' ? [START] : leader.history
    const start = leader.status === 'home' ? START : leader.pos
    history = [...base, ...walk(start, RESULTS[result], legal.route).path]
  }

  // 묶음 전체를 옮긴다
  for (const p of group) {
    if (legal.finishes) {
      Object.assign(p, { status: 'done', pos: null, history: [] })
    } else {
      // 0번 칸에 정확히 도착하면 완주가 아니라 "완주 대기"
      Object.assign(p, { status: legal.to === START ? 'waiting' : 'board', pos: legal.to, history: [...history] })
    }
  }

  if (!legal.finishes) {
    // 잡기: 도착한 칸(0번 칸 포함)에 상대 말이 있으면 모두 출발 전으로 되돌리고, 한 번 더 던진다.
    // (0번 칸을 지나쳐 완주하는 말은 칸에 멈추지 않으므로 잡지 않는다)
    const caught = next.pieces.filter(
      (p) => p.owner !== next.current && (p.status === 'board' || p.status === 'waiting') && p.pos === legal.to,
    )
    for (const p of caught) Object.assign(p, { status: 'home', pos: null, history: [] })
    if (caught.length > 0) next.throwsLeft += 1

    // 업기: 도착한 칸에 원래 있던 내 말들도 같은 상태와 지나온 칸 기록(움직인 말의 기록)을 갖게 한다
    for (const p of next.pieces) {
      if (p.owner === next.current && (p.status === 'board' || p.status === 'waiting') && p.pos === legal.to) {
        Object.assign(p, { status: leader.status, history: [...history] })
      }
    }
  }

  // 쓴 결과를 모음에서 뺀다
  next.pool.splice(legal.resultIndex, 1)
  next.message = next.throwsLeft > 0 ? '상대 말을 잡았습니다! 한 번 더 던지세요' : ''

  // 승리: 내 말 4개가 모두 완주했으면 게임 끝
  const mine = next.pieces.filter((p) => p.owner === next.current)
  if (mine.every((p) => p.status === 'done')) {
    next.phase = 'over'
    next.winner = next.current
    return next
  }

  // 다음 단계 정하기
  if (next.throwsLeft > 0) {
    next.phase = 'throw' // 잡아서 얻은 추가 던지기가 있다 (남은 결과는 그대로 둔다)
  } else if (next.pool.length === 0) {
    startNextTurn(next) // 결과를 다 썼다 → 다음 플레이어
  } else {
    next.phase = 'move' // 아직 쓸 결과가 남았다
    passIfStuck(next) // 남은 결과로 움직일 말이 없으면 자동으로 다음 차례
  }
  return next
}

// 다음 플레이어의 턴을 시작한다 (state를 직접 고친다. 내부에서만 사용)
function startNextTurn(state) {
  state.current = (state.current + 1) % state.players.length
  state.phase = 'throw'
  state.throwsLeft = 1
  state.pool = []
  state.lastThrow = null // 앞 사람이 던진 결과는 지운다
  state.lastSticks = null
}

// 움직일 수 있는 말이 없을 때 보여 주는 안내 (모두에게 같은 문구)
export const NO_MOVES_MESSAGE = '움직일 수 있는 말이 없습니다.'

// 이동 단계인데 남은 결과로 움직일 수 있는 말이 하나도 없으면, 버튼을 누르지 않아도 바로 다음 차례로 넘긴다.
// (state를 직접 고친다. 내부에서만 사용)
// keepThrow가 true면 방금 던진 윷 모양은 남겨 둔다 (던진 사람이 무엇이 나왔는지는 볼 수 있게)
function passIfStuck(state, keepThrow = false) {
  if (state.phase !== 'move' || getLegalMoves(state).length > 0) return
  const { lastThrow, lastSticks } = state
  startNextTurn(state)
  if (keepThrow) Object.assign(state, { lastThrow, lastSticks })
  state.message = NO_MOVES_MESSAGE
}

// 어떤 칸에 있는 말들 (화면에서 말을 그릴 때 사용)
export function getGroupAt(state, pos) {
  return state.pieces.filter((p) => (p.status === 'board' || p.status === 'waiting') && p.pos === pos)
}
