// 테스트용 도우미 함수들 (게임 코드에서는 쓰지 않는다)

// rollYut이 원하는 결과를 내도록 만드는 가짜 랜덤
// (yut.js 규칙: random() < 0.5 이면 배, 0번 가락 하나만 배면 빽도)
const ROLLS = {
  backdo: [0.1, 0.9, 0.9, 0.9],
  do: [0.9, 0.1, 0.9, 0.9],
  gae: [0.1, 0.1, 0.9, 0.9],
  geol: [0.1, 0.1, 0.1, 0.9],
  yut: [0.1, 0.1, 0.1, 0.1],
  mo: [0.9, 0.9, 0.9, 0.9],
  nak: [0.1, 0.1, 0.9, 0.9, 0.01, 0.6], // 다섯 번째 숫자가 0.05보다 작으면 낙
}

export function fixedRandom(result) {
  const values = ROLLS[result]
  let i = 0
  return () => values[i++ % values.length]
}

// 테스트 상태를 꾸미기 위해 말 하나의 상태를 직접 바꾼다 (원래 상태를 바꾸지 않고 새 상태를 돌려줌)
export function setPiece(state, id, status, pos = null, history = []) {
  const next = structuredClone(state)
  next.pieces[id] = { ...next.pieces[id], status, pos, history }
  return next
}

// 테스트에서 이동 단계로 바로 들어가기 위해 모인 결과를 정해 준다
export function withPool(state, pool) {
  return { ...structuredClone(state), phase: 'move', throwsLeft: 0, pool: [...pool] }
}

// 같은 씨앗(seed)이면 항상 같은 숫자가 나오는 랜덤 (테스트를 매번 똑같이 재현하기 위함)
export function seededRandom(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 던질 때마다 계속 같은 결과가 나오게 하는 가짜 랜덤 (여러 번 던지는 테스트용, 낙은 나오지 않음)
// 한 번 던질 때 숫자를 5개 쓴다: 가락 4개 + 낙인지 확인 1개(0.9 → 낙 아님)
export function repeatRandom(result) {
  const values = [...ROLLS[result].slice(0, 4), 0.9]
  let i = 0
  return () => values[i++ % values.length]
}
