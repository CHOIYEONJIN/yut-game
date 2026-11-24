// 화면 선택 도우미(selection.js) 자동 검사
import { test, expect } from 'vitest'
import { createGame, getLegalMoves } from '../../rules/game.js'
import { usableResults, stacksOnOwnPiece } from '../selection.js'
import { setPiece, withPool } from '../../rules/__tests__/helpers.js'

test('판에 말이 없으면 [빽도, 개] 중 개만 쓸 수 있다', () => {
  const s = withPool(createGame(['가', '나']), ['backdo', 'gae'])
  expect(usableResults(s, getLegalMoves(s))).toEqual(['gae'])
})

test('내 말이 있는 칸으로 가는 이동은 "업기"로 표시한다', () => {
  let s = setPiece(createGame(['가', '나']), 0, 'board', 1, [0, 1])
  s = withPool(setPiece(s, 1, 'board', 3, [0, 1, 2, 3]), ['gae'])
  const move = getLegalMoves(s).find((m) => m.pieceId === 0)
  expect(stacksOnOwnPiece(s, move)).toBe(true)
  const other = getLegalMoves(s).find((m) => m.pieceId === 1)
  expect(stacksOnOwnPiece(s, other)).toBe(false)
})
