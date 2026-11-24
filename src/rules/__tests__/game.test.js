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

// ---------------- Task 5: 가능한 이동과 기본 이동 ----------------
import { getLegalMoves, applyMove } from '../game.js'
import { setPiece, withPool } from './helpers.js'

// 2인 게임: 말 0~3은 플레이어 0, 말 4~7은 플레이어 1
const twoPlayers = () => createGame(['가', '나'])
// 가능한 이동 목록에서 (말, 길)로 하나를 찾는다
const find = (moves, pieceId, route = null) => moves.find((m) => m.pieceId === pieceId && m.route === route)

describe('가능한 이동', () => {
  test('출발 전 말만 있을 때 개 → 새 말 하나가 2번 칸으로', () => {
    const moves = getLegalMoves(withPool(twoPlayers(), ['gae']))
    expect(moves).toEqual([{ resultIndex: 0, pieceId: 0, route: null, to: 2, finishes: false }])
  })

  test('출발 전 말만 있을 때 빽도 → 쓸 수 없음', () => {
    expect(getLegalMoves(withPool(twoPlayers(), ['backdo']))).toEqual([])
  })

  test('던지기 단계에서는 이동이 없다', () => {
    expect(getLegalMoves(twoPlayers())).toEqual([])
  })

  test('[빽도, 개]: 개로 말을 꺼낸 뒤에는 빽도를 쓸 수 있다', () => {
    let s = withPool(twoPlayers(), ['backdo', 'gae'])
    const moves = getLegalMoves(s)
    expect(moves.map((m) => m.resultIndex)).toEqual([1])
    s = applyMove(s, moves[0])
    expect(s.pool).toEqual(['backdo'])
    expect(getLegalMoves(s)).toEqual([{ resultIndex: 0, pieceId: 0, route: null, to: 1, finishes: false }])
  })

  test('1번 칸에서 빽도 → 0번 칸 완주 대기', () => {
    let s = withPool(setPiece(twoPlayers(), 0, 'board', 1, [0, 1]), ['backdo'])
    const [move] = getLegalMoves(s)
    expect(move.to).toBe(0)
    s = applyMove(s, move)
    expect(s.pieces[0]).toMatchObject({ status: 'waiting', pos: 0 })
  })

  test('지름길 위에서 빽도 → 온 길로 한 칸', () => {
    const s = withPool(setPiece(twoPlayers(), 0, 'board', 24, [0, 1, 2, 3, 4, 5, 20, 21, 22, 23, 24]), ['backdo'])
    expect(getLegalMoves(s)[0].to).toBe(23)
  })

  test('15번 칸에서 빽도 → 온 길에 따라 24 또는 14', () => {
    const viaShortcut = withPool(setPiece(twoPlayers(), 0, 'board', 15, [0, 1, 2, 3, 4, 5, 20, 21, 22, 23, 24, 15]), ['backdo'])
    expect(getLegalMoves(viaShortcut)[0].to).toBe(24)
    const viaOuter = withPool(setPiece(twoPlayers(), 0, 'board', 15, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]), ['backdo'])
    expect(getLegalMoves(viaOuter)[0].to).toBe(14)
  })

  test('5번 칸에서 걸 → 지름길(22)과 바깥길(8) 두 가지', () => {
    const moves = getLegalMoves(withPool(setPiece(twoPlayers(), 0, 'board', 5, [0, 1, 2, 3, 4, 5]), ['geol']))
    const mine = moves.filter((m) => m.pieceId === 0)
    expect(mine.length).toBe(2)
    expect(find(mine, 0, 'shortcut').to).toBe(22)
    expect(find(mine, 0, 'outer').to).toBe(8)
  })

  test('5번 칸에서 빽도 → 길 선택 없이 4번 칸 하나', () => {
    const moves = getLegalMoves(withPool(setPiece(twoPlayers(), 0, 'board', 5, [0, 1, 2, 3, 4, 5]), ['backdo']))
    expect(moves).toEqual([{ resultIndex: 0, pieceId: 0, route: null, to: 4, finishes: false }])
  })

  test('19번 칸: 도는 0번 칸(완주 대기), 개는 완주', () => {
    const s = setPiece(twoPlayers(), 0, 'board', 19, [0, 19])
    expect(find(getLegalMoves(withPool(s, ['do'])), 0)).toMatchObject({ to: 0, finishes: false })
    expect(find(getLegalMoves(withPool(s, ['gae'])), 0)).toMatchObject({ to: null, finishes: true })
  })

  test('완주 대기 말은 빽도로도 완주', () => {
    let s = withPool(setPiece(twoPlayers(), 0, 'waiting', 0, [0, 19, 0]), ['backdo'])
    const move = find(getLegalMoves(s), 0)
    expect(move).toMatchObject({ to: null, finishes: true })
    s = applyMove(s, move)
    expect(s.pieces[0]).toMatchObject({ status: 'done', pos: null })
  })

  test('같은 턴: 걸로 완주 대기가 된 말을 남은 개로 완주', () => {
    let s = withPool(setPiece(twoPlayers(), 0, 'board', 17, [0, 17]), ['geol', 'gae'])
    s = applyMove(s, find(getLegalMoves(s), 0))
    expect(s.pieces[0].status).toBe('waiting')
    const move = find(getLegalMoves(s), 0)
    expect(move).toMatchObject({ finishes: true })
    s = applyMove(s, move)
    expect(s.pieces[0].status).toBe('done')
  })

  test('업힌 말은 대표 하나로 함께 움직인다', () => {
    let s = setPiece(twoPlayers(), 0, 'board', 3, [0, 3])
    s = withPool(setPiece(s, 1, 'board', 3, [0, 3]), ['do'])
    const moves = getLegalMoves(s).filter((m) => m.pieceId === 0 || m.pieceId === 1)
    expect(moves.map((m) => m.pieceId)).toEqual([0])
    s = applyMove(s, moves[0])
    expect(s.pieces[0].pos).toBe(4)
    expect(s.pieces[1].pos).toBe(4)
  })

  test('같은 결과가 여러 개면 첫 번째 것만 후보', () => {
    const moves = getLegalMoves(withPool(twoPlayers(), ['gae', 'gae']))
    expect(moves.map((m) => m.resultIndex)).toEqual([0])
  })

  test('목록에 없는 이동은 무시한다', () => {
    const s = withPool(twoPlayers(), ['gae'])
    expect(applyMove(s, { resultIndex: 0, pieceId: 5, route: null })).toEqual(s)
  })
})
