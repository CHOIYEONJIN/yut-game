// 서버의 게임 한 판(match.js) 검사. 가짜 시계로 시간을 돌려서 실제로 기다리지 않는다.
import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMatch } from '../match.js'
import { createGame, getLegalMoves } from '../../src/rules/game.js'
import { repeatRandom, setPiece } from '../../src/rules/__tests__/helpers.js'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const human = (id) => ({ playerId: id, name: id, kind: 'human' })
const bot = (name) => ({ playerId: null, name, kind: 'bot' })

// 기본: 사람 a, b. 던지면 항상 "도"
function setup({ seats = [human('a'), human('b')], result = 'do', ...rest } = {}) {
  const updates = []
  const ends = []
  const match = createMatch({
    seats,
    random: repeatRandom(result),
    onUpdate: (v) => updates.push(v),
    onEnd: (e) => ends.push(e),
    ...rest,
  })
  match.start()
  return { match, updates, ends }
}

// 지금 차례인 사람이 차례가 끝날 때까지 던지고 첫 번째로 가능한 이동을 한다 (잡아서 한 번 더 던지는 경우 포함)
function playTurn(match, id) {
  const seat = match.seatOf(id)
  expect(match.view().state.current).toBe(seat)
  while (match.view().state.current === seat && match.view().state.phase !== 'over') {
    const { state } = match.view()
    if (state.phase === 'throw') expect(match.act(id, { type: 'throw' })).toBe(true)
    else expect(match.act(id, { type: 'move', move: getLegalMoves(state)[0] })).toBe(true)
  }
}

test('자기 차례에 던지면 상태가 바뀌고 throwSeq가 1 늘어난다', () => {
  const { match } = setup()
  expect(match.act('a', { type: 'throw' })).toBe(true)
  const v = match.view()
  expect(v.throwSeq).toBe(1)
  expect(v.state.phase).toBe('move')
  expect(v.state.pool).toEqual(['do'])
})

test('자기 차례가 아닌 사람의 행동은 무시한다', () => {
  const { match, updates } = setup()
  const before = updates.length
  expect(match.act('b', { type: 'throw' })).toBe(false)
  expect(match.act('zzz', { type: 'throw' })).toBe(false)
  expect(updates.length).toBe(before)
})

test('같은 이동을 두 번 보내면 두 번째는 무시한다', () => {
  const { match } = setup()
  expect(match.act('a', { type: 'throw' })).toBe(true)
  expect(match.act('a', { type: 'throw' })).toBe(false) // 이미 던졌다
  const move = getLegalMoves(match.view().state)[0]
  expect(match.act('a', { type: 'move', move })).toBe(true)
  const after = match.view().state
  expect(match.act('a', { type: 'move', move })).toBe(false)
  expect(match.view().state).toEqual(after)
  expect(after.current).toBe(1)
})

test('컴퓨터 차례는 1초 뒤 자동으로 둔다', () => {
  const { match } = setup({ seats: [human('a'), bot('컴퓨터1')] })
  playTurn(match, 'a')
  expect(match.view().state.current).toBe(1)
  vi.advanceTimersByTime(999)
  expect(match.view().throwSeq).toBe(1)
  vi.advanceTimersByTime(1)
  expect(match.view().throwSeq).toBe(2)
})

test('30초 동안 아무것도 안 하면 그 차례를 컴퓨터가 마저 두고, 그동안 본인 행동은 무시한다', () => {
  const { match } = setup()
  expect(match.view().turnMsLeft).toBe(30000)
  vi.advanceTimersByTime(29999)
  expect(match.view().auto).toBe(false)
  vi.advanceTimersByTime(1)
  expect(match.view().auto).toBe(true)
  expect(match.view().turnMsLeft).toBe(null)
  expect(match.act('a', { type: 'throw' })).toBe(false)
  vi.advanceTimersByTime(1000) // 컴퓨터가 대신 던진다
  expect(match.view().throwSeq).toBe(1)
})

test('시간 초과로 컴퓨터가 둔 다음 차례에는 다시 본인이 둔다', () => {
  const { match } = setup()
  vi.advanceTimersByTime(30000 + 1000 + 900 + 1000) // 시간 초과 → 컴퓨터 던지기 → 굴림 + 생각 → 이동
  expect(match.view().state.current).toBe(1)
  expect(match.view().auto).toBe(false)
  playTurn(match, 'b')
  const v = match.view()
  expect(v.state.current).toBe(0)
  expect(v.auto).toBe(false)
  expect(v.turnMsLeft).toBe(30000)
  expect(match.act('a', { type: 'throw' })).toBe(true)
})

test('던진 직후의 시간 제한은 굴림 시간만큼 늦게 끝난다', () => {
  const { match } = setup()
  match.act('a', { type: 'throw' })
  vi.advanceTimersByTime(30000)
  expect(match.view().auto).toBe(false)
  vi.advanceTimersByTime(900)
  expect(match.view().auto).toBe(true)
})

test('끊기면 바로 컴퓨터가 대신 두고, 다시 접속하면 그 차례는 컴퓨터가 마저 둔 뒤 다음 차례부터 본인이 둔다', () => {
  const { match } = setup()
  match.setConnected('a', false)
  expect(match.view().seats[0].status).toBe('away')
  expect(match.view().auto).toBe(true)
  match.setConnected('a', true)
  expect(match.view().seats[0].status).toBe('playing')
  expect(match.act('a', { type: 'throw' })).toBe(false) // 이 차례는 컴퓨터가 마저
  vi.advanceTimersByTime(1000 + 900 + 1000)
  expect(match.view().state.current).toBe(1)
  playTurn(match, 'b')
  expect(match.act('a', { type: 'throw' })).toBe(true)
})

test('끊긴 사람의 차례가 오면 컴퓨터가 두고, 그 차례 중에 돌아와도 컴퓨터가 마저 둔다', () => {
  const { match } = setup()
  match.setConnected('b', false)
  playTurn(match, 'a')
  expect(match.view().auto).toBe(true) // b 차례인데 b가 없다
  vi.advanceTimersByTime(1000) // 컴퓨터가 b 대신 던짐
  match.setConnected('b', true)
  const move = getLegalMoves(match.view().state)[0]
  expect(match.act('b', { type: 'move', move })).toBe(false)
})

test('완전히 나가면 다시 접속해도 끝까지 컴퓨터가 둔다', () => {
  const { match } = setup()
  match.leave('a')
  expect(match.view().seats[0].status).toBe('left')
  expect(match.seatOf('a')).toBe(-1)
  expect(match.seatOf('b')).toBe(1)
  match.setConnected('a', true)
  expect(match.view().seats[0].status).toBe('left')
  expect(match.act('a', { type: 'throw' })).toBe(false)
})

test('사람이 모두 끊기거나 나가면 onEnd({ winner: null })이 한 번 불린다', () => {
  const { match, ends } = setup()
  match.setConnected('a', false)
  expect(ends).toEqual([])
  match.leave('b')
  expect(ends).toEqual([{ winner: null }])
  vi.advanceTimersByTime(100000)
  match.setConnected('a', true)
  expect(ends.length).toBe(1)
})

test('우승자가 나오면 마지막 상태를 보낸 뒤 onEnd({ winner })', () => {
  // 0번 플레이어: 말 3개 완주, 1개 완주 대기 → 도 하나로 우승
  let s = createGame(['a', 'b'])
  s = setPiece(s, 0, 'done')
  s = setPiece(s, 1, 'done')
  s = setPiece(s, 2, 'done')
  s = setPiece(s, 3, 'waiting', 0, [0, 19, 0])
  const events = []
  const match = createMatch({
    seats: [human('a'), human('b')],
    random: repeatRandom('do'),
    initialState: s,
    onUpdate: (v) => events.push(['update', v.state.phase]),
    onEnd: (e) => events.push(['end', e.winner]),
  })
  match.start()
  playTurn(match, 'a')
  expect(events.slice(-2)).toEqual([
    ['update', 'over'],
    ['end', 0],
  ])
})
