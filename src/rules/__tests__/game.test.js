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

  test('완주 대기 말에 빽도 → 바깥길로 왔으면 19번 칸으로 되돌아간다', () => {
    let s = withPool(setPiece(twoPlayers(), 0, 'waiting', 0, [0, 18, 19, 0]), ['backdo'])
    const move = find(getLegalMoves(s), 0)
    expect(move).toMatchObject({ to: 19, finishes: false })
    s = applyMove(s, move)
    expect(s.pieces[0]).toMatchObject({ status: 'board', pos: 19, history: [0, 18, 19] })
  })

  test('완주 대기 말에 빽도 → 10번 지름길로 왔으면 28번 칸으로', () => {
    const s = withPool(setPiece(twoPlayers(), 0, 'waiting', 0, [0, 10, 25, 26, 22, 27, 28, 0]), ['backdo'])
    expect(find(getLegalMoves(s), 0)).toMatchObject({ to: 28, finishes: false })
  })

  test('1번 칸에서 빽도로 완주 대기가 된 말은 더 뒤로 갈 곳이 없어 빽도를 못 쓴다', () => {
    const s = withPool(setPiece(twoPlayers(), 0, 'waiting', 0, [0]), ['backdo'])
    expect(getLegalMoves(s)).toEqual([])
  })

  test('완주 대기 말은 도 이상이면 완주', () => {
    let s = withPool(setPiece(twoPlayers(), 0, 'waiting', 0, [0, 19, 0]), ['do'])
    const move = find(getLegalMoves(s), 0)
    expect(move).toMatchObject({ to: null, finishes: true })
    s = applyMove(s, move)
    expect(s.pieces[0]).toMatchObject({ status: 'done', pos: null })
  })

  test('완주 대기 말이 빽도로 되돌아간 칸의 상대 말을 잡는다', () => {
    let s = setPiece(twoPlayers(), 0, 'waiting', 0, [0, 19, 0])
    s = withPool(setPiece(s, 4, 'board', 19, [0, 19]), ['backdo'])
    s = applyMove(s, find(getLegalMoves(s), 0))
    expect(s.pieces[4].status).toBe('home')
    expect(s.phase).toBe('throw')
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

// ---------------- Task 6: 잡기, 업기, 턴 진행, 승리 ----------------
import { passUnusable, getGroupAt } from '../game.js'

describe('잡기', () => {
  test('상대 말이 있는 칸에 멈추면 잡고 한 번 더 던진다', () => {
    let s = setPiece(twoPlayers(), 0, 'board', 1, [0, 1])
    s = withPool(setPiece(s, 4, 'board', 3, [0, 3]), ['gae'])
    s = applyMove(s, find(getLegalMoves(s), 0))
    expect(s.pieces[4]).toMatchObject({ status: 'home', pos: null, history: [] })
    expect(s).toMatchObject({ current: 0, phase: 'throw', throwsLeft: 1 })
  })

  test('업힌 상대 말 두 개를 함께 잡는다', () => {
    let s = setPiece(twoPlayers(), 0, 'board', 1, [0, 1])
    s = setPiece(s, 4, 'board', 3, [0, 3])
    s = withPool(setPiece(s, 5, 'board', 3, [0, 3]), ['gae'])
    s = applyMove(s, find(getLegalMoves(s), 0))
    expect(s.pieces[4].status).toBe('home')
    expect(s.pieces[5].status).toBe('home')
  })

  test('빽도로 간 칸의 상대 말도 잡는다', () => {
    let s = setPiece(twoPlayers(), 0, 'board', 7, [0, 6, 7])
    s = withPool(setPiece(s, 4, 'board', 6, [0, 6]), ['backdo'])
    s = applyMove(s, find(getLegalMoves(s), 0))
    expect(s.pieces[4].status).toBe('home')
    expect(s.phase).toBe('throw')
  })

  test('0번 칸에 정확히 도착하면 상대의 완주 대기 말을 잡고, 내 말이 완주 대기', () => {
    let s = setPiece(twoPlayers(), 0, 'board', 19, [0, 19])
    s = withPool(setPiece(s, 4, 'waiting', 0, [0, 19, 0]), ['do'])
    s = applyMove(s, find(getLegalMoves(s), 0))
    expect(s.pieces[4].status).toBe('home')
    expect(s.pieces[0]).toMatchObject({ status: 'waiting', pos: 0 })
    expect(s.phase).toBe('throw')
  })

  test('0번 칸을 지나쳐 완주하면 상대 완주 대기 말을 잡지 않는다', () => {
    let s = setPiece(twoPlayers(), 0, 'board', 19, [0, 19])
    s = withPool(setPiece(s, 4, 'waiting', 0, [0, 19, 0]), ['gae'])
    s = applyMove(s, find(getLegalMoves(s), 0))
    expect(s.pieces[4].status).toBe('waiting')
    expect(s.pieces[0].status).toBe('done')
  })

  test('마지막 결과로 잡아도 턴이 끝나지 않고 던지기로, 윷이면 계속', () => {
    let s = setPiece(twoPlayers(), 0, 'board', 1, [0, 1])
    s = withPool(setPiece(s, 4, 'board', 3, [0, 3]), ['gae'])
    s = applyMove(s, find(getLegalMoves(s), 0))
    expect(s.pool).toEqual([])
    expect(s).toMatchObject({ current: 0, phase: 'throw' })
    s = throwYut(s, fixedRandom('yut'))
    expect(s.phase).toBe('throw')
  })
})

describe('업기', () => {
  test('내 완주 대기 말에 합류하면 함께 완주 대기, 남은 결과로 함께 완주', () => {
    let s = setPiece(twoPlayers(), 0, 'waiting', 0, [0, 19, 0])
    s = withPool(setPiece(s, 1, 'board', 19, [0, 19]), ['do', 'gae'])
    s = applyMove(s, find(getLegalMoves(s), 1))
    expect(s.pieces[0]).toMatchObject({ status: 'waiting', pos: 0 })
    expect(s.pieces[1]).toMatchObject({ status: 'waiting', pos: 0 })
    const move = getLegalMoves(s).find((m) => m.pieceId === 0)
    s = applyMove(s, move)
    expect(s.pieces[0].status).toBe('done')
    expect(s.pieces[1].status).toBe('done')
  })

  test('업으면 지나온 칸 기록은 움직인 말의 기록을 따른다', () => {
    let s = setPiece(twoPlayers(), 0, 'board', 3, [0, 1, 2, 3])
    s = withPool(setPiece(s, 1, 'board', 1, [0, 1]), ['gae'])
    s = applyMove(s, find(getLegalMoves(s), 1))
    expect(s.pieces[0].history).toEqual([0, 1, 2, 3])
    expect(s.pieces[1].history).toEqual([0, 1, 2, 3])
    expect(getGroupAt(s, 3).map((p) => p.id)).toEqual([0, 1])
  })
})

describe('턴 진행', () => {
  test('결과를 다 쓰면 다음 플레이어 (2인: 0 → 1), 방금 던진 결과도 지운다', () => {
    let s = { ...withPool(twoPlayers(), ['gae']), lastThrow: 'gae' }
    s = applyMove(s, getLegalMoves(s)[0])
    expect(s).toMatchObject({ current: 1, phase: 'throw', throwsLeft: 1, pool: [], lastThrow: null })
  })

  test('3인: 마지막 플레이어 다음은 처음 플레이어', () => {
    let s = { ...withPool(createGame(['가', '나', '다']), ['gae']), current: 2 }
    s = applyMove(s, getLegalMoves(s)[0])
    expect(s.current).toBe(0)
  })

  test('결과가 남아 있으면 이동 단계 유지', () => {
    let s = withPool(twoPlayers(), ['gae', 'do'])
    s = applyMove(s, getLegalMoves(s)[0])
    expect(s).toMatchObject({ current: 0, phase: 'move', pool: ['do'] })
  })

  test('쓸 수 있는 결과가 없으면 턴 넘기기', () => {
    const s = passUnusable(withPool(twoPlayers(), ['backdo']))
    expect(s).toMatchObject({ current: 1, phase: 'throw', throwsLeft: 1, pool: [] })
    expect(s.message).toBe('쓸 수 있는 결과가 없어 턴이 넘어갑니다')
  })

  test('쓸 수 있는 결과가 있으면 턴을 넘길 수 없다', () => {
    const s = withPool(twoPlayers(), ['gae'])
    expect(passUnusable(s)).toEqual(s)
  })
})

describe('승리', () => {
  test('4번째 말이 완주하면 게임 끝, 그 뒤로는 아무것도 바뀌지 않는다', () => {
    let s = twoPlayers()
    for (const id of [0, 1, 2]) s = setPiece(s, id, 'done')
    s = withPool(setPiece(s, 3, 'board', 19, [0, 19]), ['gae', 'do'])
    s = applyMove(s, find(getLegalMoves(s), 3))
    expect(s).toMatchObject({ phase: 'over', winner: 0 })
    expect(throwYut(s, fixedRandom('gae'))).toEqual(s)
    expect(getLegalMoves(s)).toEqual([])
    expect(applyMove(s, { resultIndex: 0, pieceId: 4, route: null })).toEqual(s)
  })
})

describe('안내 문구', () => {
  test('잡으면 한 번 더 던지라고 알려 준다', () => {
    let s = setPiece(twoPlayers(), 0, 'board', 1, [0, 1])
    s = withPool(setPiece(s, 4, 'board', 3, [0, 3]), ['gae'])
    s = applyMove(s, find(getLegalMoves(s), 0))
    expect(s.message).toBe('상대 말을 잡았습니다! 한 번 더 던지세요')
  })
})

describe('낙', () => {
  test('모은 결과가 없을 때 낙 → 차례를 건너뛴다', () => {
    const s = throwYut(createGame(['가', '나']), fixedRandom('nak'))
    expect(s).toMatchObject({ current: 1, phase: 'throw', throwsLeft: 1, pool: [], lastThrow: 'nak' })
    expect(s.message).toBe('낙! 가의 차례를 건너뜁니다')
  })

  test('윷 다음에 낙 → 모은 윷은 쓰고 더 던지지 않는다', () => {
    let s = throwYut(createGame(['가', '나']), fixedRandom('yut'))
    s = throwYut(s, fixedRandom('nak'))
    expect(s).toMatchObject({ current: 0, phase: 'move', throwsLeft: 0, pool: ['yut'], lastThrow: 'nak' })
    expect(s.message).toBe('낙! 모은 결과만 쓰고 차례가 끝납니다')
  })

  test('던진 가락 모양을 화면용으로 저장한다', () => {
    const s = throwYut(createGame(['가', '나']), fixedRandom('nak'))
    expect(s.lastSticks).toEqual({ faces: [true, true, false, false], out: [false, false, true, false] })
  })
})
