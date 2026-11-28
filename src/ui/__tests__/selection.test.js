// 화면 선택 도우미(selection.js) 자동 검사
import { test, expect } from 'vitest'
import { createGame, getLegalMoves } from '../../rules/game.js'
import { stacksOnOwnPiece, pieceChoices } from '../selection.js'
import { setPiece, withPool } from '../../rules/__tests__/helpers.js'

test('내 말이 있는 칸으로 가는 이동은 "업기"로 표시한다', () => {
  let s = setPiece(createGame(['가', '나']), 0, 'board', 1, [0, 1])
  s = withPool(setPiece(s, 1, 'board', 3, [0, 1, 2, 3]), ['gae'])
  const move = getLegalMoves(s).find((m) => m.pieceId === 0)
  expect(stacksOnOwnPiece(s, move)).toBe(true)
  const other = getLegalMoves(s).find((m) => m.pieceId === 1)
  expect(stacksOnOwnPiece(s, other)).toBe(false)
})

test('말을 고르면 모인 결과들로 갈 수 있는 자리가 모두 나오고, 자리마다 쓸 결과가 붙는다', () => {
  // 1번 칸의 말, 모인 결과 [도, 걸] → 2번 칸(도), 4번 칸(걸)
  let s = setPiece(createGame(['가', '나']), 0, 'board', 1, [0, 1])
  s = withPool(s, ['do', 'geol'])
  const choices = pieceChoices(s, getLegalMoves(s), 0)
  expect(choices.map((c) => [c.result, c.move.to])).toEqual([
    ['do', 2],
    ['geol', 4],
  ])
})

test('같은 자리로 가는 결과가 여럿이면 가장 작은 결과 하나만 남긴다 (완주)', () => {
  // 19번 칸의 말, [윷, 개] → 둘 다 완주 → 개로 완주
  let s = setPiece(createGame(['가', '나']), 0, 'board', 19, [0, 1, 19])
  s = withPool(s, ['yut', 'gae'])
  const choices = pieceChoices(s, getLegalMoves(s), 0)
  expect(choices.length).toBe(1)
  expect(choices[0].result).toBe('gae')
  expect(choices[0].move.finishes).toBe(true)
})

test('고르지 않은 말이나 움직일 수 없는 말이면 빈 목록', () => {
  const s = withPool(createGame(['가', '나']), ['do'])
  expect(pieceChoices(s, getLegalMoves(s), null)).toEqual([])
  expect(pieceChoices(s, getLegalMoves(s), 5)).toEqual([]) // 상대 말
})
