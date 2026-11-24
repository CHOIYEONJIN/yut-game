// 윷 던지기(yut.js) 자동 검사
import { test, expect } from 'vitest'
import { rollYut, isBonus, RESULTS } from '../yut.js'

// 정해 둔 숫자를 차례대로 돌려주는 가짜 랜덤 (테스트에서 결과를 고정하기 위함)
function sequence(values) {
  let i = 0
  return () => values[i++]
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
