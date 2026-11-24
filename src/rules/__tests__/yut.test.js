// 윷 던지기(yut.js) 자동 검사
import { test, expect } from 'vitest'
import { rollYut, isBonus, RESULTS, RESULT_LABELS, throwSticks } from '../yut.js'

// 정해 둔 숫자를 차례대로 돌려주는 가짜 랜덤 (테스트에서 결과를 고정하기 위함)
function sequence(values) {
  let i = 0
  return () => values[i++] ?? 0.9 // 정해 둔 숫자가 끝나면 0.9 (낙이 아님)
}

test('배가 0개면 모', () => expect(rollYut(sequence([0.9, 0.9, 0.9, 0.9]))).toBe('mo'))
test('배가 4개면 윷', () => expect(rollYut(sequence([0.1, 0.1, 0.1, 0.1]))).toBe('yut'))
test('표시 가락 하나만 배면 빽도', () => expect(rollYut(sequence([0.1, 0.9, 0.9, 0.9]))).toBe('backdo'))
test('다른 가락 하나만 배면 도', () => expect(rollYut(sequence([0.9, 0.1, 0.9, 0.9]))).toBe('do'))
test('배가 2개면 개', () => expect(rollYut(sequence([0.1, 0.1, 0.9, 0.9]))).toBe('gae'))
test('배가 3개면 걸', () => expect(rollYut(sequence([0.1, 0.1, 0.1, 0.9]))).toBe('geol'))
test('윷과 모만 한 번 더', () => {
  expect(isBonus('yut')).toBe(true)
  expect(isBonus('mo')).toBe(true)
  expect(isBonus('geol')).toBe(false)
  expect(isBonus('backdo')).toBe(false)
})
test('결과별 칸 수', () => expect(RESULTS).toEqual({ backdo: -1, do: 1, gae: 2, geol: 3, yut: 4, mo: 5 }))

// ---------------- 낙 ----------------
test('다섯 번째 숫자가 0.05보다 작으면 낙', () => {
  expect(rollYut(sequence([0.1, 0.1, 0.9, 0.9, 0.01, 0.6]))).toBe('nak')
})

test('낙이면 가락 하나가 판 밖으로 나간다', () => {
  const t = throwSticks(sequence([0.1, 0.1, 0.9, 0.9, 0.01, 0.6]))
  expect(t.result).toBe('nak')
  expect(t.out).toEqual([false, false, true, false]) // 0.6 * 4 = 2번 가락
  expect(t.faces).toEqual([true, true, false, false])
})

test('낙이 아니면 밖으로 나간 가락이 없다', () => {
  const t = throwSticks(sequence([0.1, 0.1, 0.9, 0.9, 0.5]))
  expect(t).toEqual({ faces: [true, true, false, false], out: [false, false, false, false], result: 'gae' })
})

test('낙은 칸 수가 없고, 한 번 더 던지지 않는다', () => {
  expect(RESULTS.nak).toBeUndefined()
  expect(isBonus('nak')).toBe(false)
  expect(RESULT_LABELS.nak).toBe('낙')
})
