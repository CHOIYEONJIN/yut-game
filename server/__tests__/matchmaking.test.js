// 빠른대전 줄(matchmaking.js) 검사. 가짜 시계 사용.
import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { createQueue } from '../matchmaking.js'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const p = (id) => ({ playerId: id, name: id })

function setup() {
  const started = []
  const updates = []
  const queue = createQueue({ startMatch: (seats) => started.push(seats), onUpdate: (v) => updates.push(v) })
  return { queue, started, updates }
}

test('혼자면 아무리 기다려도 시작하지 않는다', () => {
  const { queue, started } = setup()
  queue.join(p('a'))
  vi.advanceTimersByTime(10 * 60 * 1000)
  expect(started).toEqual([])
  expect(queue.view()).toEqual({ players: ['a'], msLeft: null })
})

test('혼자일 때 컴퓨터와 바로 하기를 누르면 사람 1 + 컴퓨터 3으로 시작한다', () => {
  const { queue, started } = setup()
  queue.join(p('a'))
  expect(queue.startWithBots('a')).toBe(true)
  expect(started.length).toBe(1)
  expect(started[0].map((s) => s.kind)).toEqual(['human', 'bot', 'bot', 'bot'])
  expect(started[0].map((s) => s.name)).toEqual(['a', '컴퓨터1', '컴퓨터2', '컴퓨터3'])
  expect(started[0][0].playerId).toBe('a')
  expect(queue.has('a')).toBe(false)
})

test('2명이 되면 30초 뒤 컴퓨터 2명을 채워 시작한다', () => {
  const { queue, started } = setup()
  queue.join(p('a'))
  queue.join(p('b'))
  expect(queue.view().msLeft).toBe(30000)
  vi.advanceTimersByTime(10000)
  expect(queue.view().msLeft).toBe(20000)
  vi.advanceTimersByTime(19999)
  expect(started).toEqual([])
  vi.advanceTimersByTime(1)
  expect(started[0].map((s) => s.name)).toEqual(['a', 'b', '컴퓨터1', '컴퓨터2'])
  expect(queue.members()).toEqual([])
})

test('4명이 차면 바로 시작한다', () => {
  const { queue, started } = setup()
  ;['a', 'b', 'c', 'd'].forEach((id) => queue.join(p(id)))
  expect(started[0].map((s) => s.kind)).toEqual(['human', 'human', 'human', 'human'])
  vi.advanceTimersByTime(30000)
  expect(started.length).toBe(1) // 세던 시간이 끝나도 다시 시작하지 않는다
})

test('세는 중에 1명으로 줄면 세기를 멈춘다', () => {
  const { queue, started } = setup()
  queue.join(p('a'))
  queue.join(p('b'))
  queue.leave('b')
  expect(queue.view()).toEqual({ players: ['a'], msLeft: null })
  vi.advanceTimersByTime(30000)
  expect(started).toEqual([])
})

test('사람이 2명 이상이면 컴퓨터와 바로 하기는 무시한다', () => {
  const { queue, started } = setup()
  queue.join(p('a'))
  queue.join(p('b'))
  expect(queue.startWithBots('a')).toBe(false)
  expect(started).toEqual([])
  vi.advanceTimersByTime(30000)
  expect(started.length).toBe(1)
})

test('같은 사람이 두 번 들어와도 한 번만 들어간다', () => {
  const { queue } = setup()
  queue.join(p('a'))
  queue.join(p('a'))
  expect(queue.view().players).toEqual(['a'])
  expect(queue.view().msLeft).toBe(null)
})

test('시작한 사람들은 줄에서 빠지고, 새로 온 사람은 새 줄을 만든다', () => {
  const { queue, started } = setup()
  ;['a', 'b', 'c', 'd'].forEach((id) => queue.join(p(id)))
  queue.join(p('e'))
  expect(queue.members()).toEqual(['e'])
  expect(queue.view()).toEqual({ players: ['e'], msLeft: null })
  expect(started.length).toBe(1)
})

test('줄이 바뀔 때마다 onUpdate로 알린다', () => {
  const { queue, updates } = setup()
  queue.join(p('a'))
  queue.join(p('b'))
  expect(updates.at(-1)).toEqual({ players: ['a', 'b'], msLeft: 30000 })
})
