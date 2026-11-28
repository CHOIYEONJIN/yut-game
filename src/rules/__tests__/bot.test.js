// 컴퓨터 플레이어(bot.js) 검사
import { test, expect } from 'vitest'
import { createGame } from '../game.js'
import { chooseMove, botStep } from '../bot.js'
import { setPiece, withPool, seededRandom } from './helpers.js'

test('잡을 수 있으면 잡는 수를 고른다', () => {
  // 0번 플레이어 말0이 3번 칸, 상대 말4가 5번 칸, 결과 [걸, 개] → 개를 써서 5번 칸의 상대를 잡는다
  let s = setPiece(createGame(['가', '나']), 0, 'board', 3, [0, 1, 2, 3])
  s = setPiece(s, 4, 'board', 5, [0, 1, 2, 3, 4, 5])
  s = withPool(s, ['geol', 'gae'])
  const m = chooseMove(s)
  expect(m.pieceId).toBe(0)
  expect(m.to).toBe(5)
})

test('잡을 수 없으면 완주하는 수를 고른다', () => {
  // 말0이 완주 대기, 말1이 판 위 2번 칸, 결과 [도]
  let s = setPiece(createGame(['가', '나']), 0, 'waiting', 0, [0, 19, 0])
  s = setPiece(s, 1, 'board', 2, [0, 1, 2])
  expect(chooseMove(withPool(s, ['do'])).finishes).toBe(true)
})

test('둘 다 없으면 이동 뒤 남은 칸이 가장 적은 수를 고른다', () => {
  // 말0이 4번 칸: 도로 5번 칸(지름길로 남은 칸 11)에 가는 것이, 새 말을 1번 칸(남은 칸 19)에 꺼내는 것보다 낫다
  const s = withPool(setPiece(createGame(['가', '나']), 0, 'board', 4, [0, 1, 2, 3, 4]), ['do'])
  expect(chooseMove(s).to).toBe(5)
})

test('움직일 수 있는 수가 없으면 null', () => {
  expect(chooseMove(createGame(['가', '나']))).toBe(null) // 던지기 단계
})

test('botStep만으로 2·3·4인 게임이 끝까지 간다 (시드 고정 100판)', () => {
  const names = [['가', '나'], ['가', '나', '다'], ['가', '나', '다', '라']]
  for (let seed = 1; seed <= 100; seed++) {
    const random = seededRandom(seed)
    let s = createGame(names[seed % 3])
    let steps = 0
    while (s.phase !== 'over') {
      const next = botStep(s, random)
      expect(next).not.toBe(s) // 컴퓨터는 언제나 무언가를 한다 (멈추지 않는다)
      s = next
      steps++
      expect(steps).toBeLessThan(5000)
    }
    expect(s.winner).not.toBe(null)
  }
}, 30000)
