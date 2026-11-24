// 윷 던지기 규칙

// 결과별로 움직이는 칸 수 (빽도는 뒤로 1칸)
export const RESULTS = { backdo: -1, do: 1, gae: 2, geol: 3, yut: 4, mo: 5 }

// 화면에 보여줄 한국어 이름
export const RESULT_LABELS = { backdo: '빽도', do: '도', gae: '개', geol: '걸', yut: '윷', mo: '모' }

// 실제 윷가락 4개를 던지는 것처럼 결과를 만든다.
// random: 0~1 사이 숫자를 돌려주는 함수. 테스트에서는 정해진 숫자를 넣어 결과를 고정한다.
// 각 가락은 random() < 0.5 이면 "배"(평평한 면)가 위로 나온 것.
// 0번 가락에는 빽도 표시가 있어서, 그 가락 하나만 배가 나오면 빽도가 된다.
// 확률: 빽도 1/16, 도 3/16, 개 6/16, 걸 4/16, 윷 1/16, 모 1/16
export function rollYut(random = Math.random) {
  const flats = [random(), random(), random(), random()].map((r) => r < 0.5)
  const count = flats.filter(Boolean).length
  if (count === 0) return 'mo'
  if (count === 1) return flats[0] ? 'backdo' : 'do'
  if (count === 2) return 'gae'
  if (count === 3) return 'geol'
  return 'yut'
}

// 윷이나 모가 나오면 한 번 더 던진다
export function isBonus(result) {
  return result === 'yut' || result === 'mo'
}
