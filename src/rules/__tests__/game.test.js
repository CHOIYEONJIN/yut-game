// 게임 진행 규칙(game.js) 자동 검사
import { test, expect, describe } from 'vitest'
import { createGame, throwYut } from '../game.js'
import { fixedRandom } from './helpers.js'

describe('게임 만들기', () => {
  test('3명이면 말 12개, 모두 출발 전', () => {
    const s = createGame(['가', '나', '다'])
    expect(s.pieces.length).toBe(12)
    expect(s.pieces.every((p) => p.status === 'home')).toBe(true)
    expect(s.pieces[4].owner).toBe(1)
    expect(s.players[2]).toEqual({ name: '다', color: '#43a047' })
    expect(s).toMatchObject({ current: 0, phase: 'throw', throwsLeft: 1, pool: [], winner: null })
  })
})

describe('던지기 단계', () => {
  test('개가 나오면 이동 단계로', () => {
    const s = throwYut(createGame(['가', '나']), fixedRandom('gae'))
    expect(s.pool).toEqual(['gae'])
    expect(s.lastThrow).toBe('gae')
    expect(s.phase).toBe('move')
  })

  test('윷, 모가 나오면 계속 던지고 결과가 모인다', () => {
    let s = createGame(['가', '나'])
    s = throwYut(s, fixedRandom('yut'))
    expect(s.phase).toBe('throw')
    s = throwYut(s, fixedRandom('mo'))
    expect(s.phase).toBe('throw')
    s = throwYut(s, fixedRandom('geol'))
    expect(s.pool).toEqual(['yut', 'mo', 'geol'])
    expect(s.phase).toBe('move')
  })

  test('이동 단계에서는 던질 수 없다', () => {
    const s = throwYut(createGame(['가', '나']), fixedRandom('gae'))
    expect(throwYut(s, fixedRandom('mo'))).toEqual(s)
  })

  test('원래 상태는 바뀌지 않는다', () => {
    const s = createGame(['가', '나'])
    const copy = structuredClone(s)
    throwYut(s, fixedRandom('yut'))
    expect(s).toEqual(copy)
  })
})
