// 게임 진행 규칙
// 이 파일은 화면(React)에 대해 전혀 모른다. "현재 상태 + 행동"을 받아 "새 상태"를 돌려줄 뿐이다.
// 상태는 평범한 객체라서, 2단계에서 그대로 서버로 보내고 받을 수 있다.
import { rollYut, isBonus, RESULTS } from './yut.js'
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
    winner: null, // 우승한 플레이어 번호
    message: '', // 화면에 보여줄 안내 문구
  }
}

// 윷을 한 번 던진다. 던지기 단계가 아니면 아무것도 바꾸지 않는다.
export function throwYut(state, random = Math.random) {
  if (state.phase !== 'throw') return state
  const next = structuredClone(state)
  const result = rollYut(random)
  next.pool.push(result)
  next.lastThrow = result
  next.message = ''
  next.throwsLeft -= 1
  // 윷이나 모면 한 번 더 던진다
  if (isBonus(result)) next.throwsLeft += 1
  // 더 던질 것이 없으면 모인 결과를 쓰는 이동 단계로 넘어간다
  if (next.throwsLeft === 0) next.phase = 'move'
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
  // 완주 대기 말: 어떤 결과든(빽도 포함) 하나 쓰면 완주
  if (piece.status === 'waiting') {
    return [{ resultIndex, pieceId: piece.id, route: null, to: null, finishes: true }]
  }
  // 빽도: 출발 전 말은 못 쓰고, 판 위 말은 지나온 칸 기록의 바로 전 칸으로
  if (steps < 0) {
    if (piece.status !== 'board') return []
    const to = piece.history[piece.history.length - 2]
    return [{ resultIndex, pieceId: piece.id, route: null, to, finishes: false }]
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
}

// 남은 결과를 하나도 쓸 수 없을 때, 버리고 턴을 넘긴다.
// 쓸 수 있는 이동이 하나라도 있으면 넘길 수 없다 (반드시 써야 함).
export function passUnusable(state) {
  if (state.phase !== 'move' || getLegalMoves(state).length > 0) return state
  const next = structuredClone(state)
  startNextTurn(next)
  next.message = '쓸 수 있는 결과가 없어 턴이 넘어갑니다'
  return next
}

// 어떤 칸에 있는 말들 (화면에서 말을 그릴 때 사용)
export function getGroupAt(state, pos) {
  return state.pieces.filter((p) => (p.status === 'board' || p.status === 'waiting') && p.pos === pos)
}
