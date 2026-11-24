// 윷 던지기 규칙

// 결과별로 움직이는 칸 수 (빽도는 뒤로 1칸). 낙은 움직이지 않으므로 여기에 없다.
export const RESULTS = { backdo: -1, do: 1, gae: 2, geol: 3, yut: 4, mo: 5 }

// 화면에 보여줄 한국어 이름
export const RESULT_LABELS = { backdo: '빽도', do: '도', gae: '개', geol: '걸', yut: '윷', mo: '모', nak: '낙' }

// 낙이 나올 확률 (약 5%, 스무 번에 한 번꼴)
export const NAK_CHANCE = 0.05

// 윷가락 4개를 던진다. random: 0~1 사이 숫자를 돌려주는 함수 (테스트에서는 정해진 숫자를 넣음)
// 돌려주는 값:
// - faces: 가락마다 배(평평한 면)가 위로 나왔는지 [true/false x4]. 0번 가락에는 빽도 표시가 있다.
// - out: 가락마다 판(멍석) 밖으로 나갔는지 [true/false x4]. 낙일 때만 하나가 true.
// - result: 'backdo' | 'do' | 'gae' | 'geol' | 'yut' | 'mo' | 'nak'
// random을 부르는 순서: ① 가락 4개의 면 ② 낙인지 ③ (낙이면) 어느 가락이 나갔는지
export function throwSticks(random = Math.random) {
  const faces = [random(), random(), random(), random()].map((r) => r < 0.5)
  const out = [false, false, false, false]
  // 낙: 가락이 판 밖으로 나가면 다른 가락과 상관없이 낙이다
  if (random() < NAK_CHANCE) {
    out[Math.floor(random() * 4)] = true
    return { faces, out, result: 'nak' }
  }
  return { faces, out, result: resultFromFaces(faces) }
}

// 가락 4개의 면으로 결과를 정한다
// 확률(낙이 아닐 때): 빽도 1/16, 도 3/16, 개 6/16, 걸 4/16, 윷 1/16, 모 1/16
function resultFromFaces(faces) {
  const count = faces.filter(Boolean).length
  if (count === 0) return 'mo'
  if (count === 1) return faces[0] ? 'backdo' : 'do' // 표시된 0번 가락 하나만 배면 빽도
  if (count === 2) return 'gae'
  if (count === 3) return 'geol'
  return 'yut'
}

// 결과만 필요할 때 쓰는 짧은 버전
export function rollYut(random = Math.random) {
  return throwSticks(random).result
}

// 윷이나 모가 나오면 한 번 더 던진다
export function isBonus(result) {
  return result === 'yut' || result === 'mo'
}
