// 윷판 이동 규칙(board.js) 자동 검사
import { test, expect } from 'vitest'
import { walk, remainingSteps, routeOptions } from '../board.js'

test('바깥 길', () => expect(walk(3, 2, null)).toEqual({ path: [4, 5], finished: false }))
test('5에서 지름길', () => expect(walk(5, 3, 'shortcut').path).toEqual([20, 21, 22]))
test('5에서 바깥길', () => expect(walk(5, 2, 'outer').path).toEqual([6, 7]))
test('5를 지나가면 바깥길', () => expect(walk(4, 3, null).path).toEqual([5, 6, 7]))
test('10에서 지름길', () => expect(walk(10, 2, 'shortcut').path).toEqual([25, 26]))
test('10에서 바깥길', () => expect(walk(10, 2, 'outer').path).toEqual([11, 12]))
test('중앙에서 시작하면 출구', () => expect(walk(22, 2, null).path).toEqual([27, 28]))
test('21에서 중앙 통과', () => expect(walk(21, 3, null).path).toEqual([22, 23, 24]))
test('26에서 중앙 통과', () => expect(walk(26, 3, null).path).toEqual([22, 27, 28]))
test('24 다음은 15', () => expect(walk(24, 2, null).path).toEqual([15, 16]))
test('정확히 0 도착은 완주 아님', () =>
  expect(walk(17, 3, null)).toEqual({ path: [18, 19, 0], finished: false }))
test('0을 지나치면 완주', () => expect(walk(18, 4, null).finished).toBe(true))
test('28에서 도는 0, 개는 완주', () => {
  expect(walk(28, 1, null)).toEqual({ path: [0], finished: false })
  expect(walk(28, 2, null).finished).toBe(true)
})
test('출발 전 말은 0에서 시작', () => expect(walk(0, 1, null).path).toEqual([1]))
test('남은 칸 수', () => {
  expect(remainingSteps(1, null)).toBe(19)
  expect(remainingSteps(5, 'shortcut')).toBe(11) // 20,21,22,23,24,15,16,17,18,19,0
  expect(remainingSteps(5, 'outer')).toBe(15)
  expect(remainingSteps(10, 'shortcut')).toBe(6) // 25,26,22,27,28,0
  expect(remainingSteps(22, null)).toBe(3)
  expect(remainingSteps(21, null)).toBe(9) // 22,23,24,15,...,0
})
test('길 선택지', () => {
  expect(routeOptions(5)).toEqual(['shortcut', 'outer'])
  expect(routeOptions(10)).toEqual(['shortcut', 'outer'])
  expect(routeOptions(22)).toEqual([null])
  expect(routeOptions(3)).toEqual([null])
})
