// 끝까지 플레이 검사: 무작위로 수백 판을 끝까지 두면서 규칙이 깨지지 않는지 확인한다
import { test, expect } from 'vitest'
import { createGame, throwYut, getLegalMoves, applyMove } from '../game.js'

// 같은 씨앗(seed)이면 항상 같은 숫자가 나오는 랜덤 (테스트를 매번 똑같이 재현하기 위함)
function seededRandom(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 매 순간 지켜져야 하는 규칙들
function checkInvariants(s) {
  for (const p of s.pieces) {
    if (p.status === 'home' || p.status === 'done') expect(p.pos).toBe(null)
    if (p.status === 'waiting') expect(p.pos).toBe(0)
    if (p.status === 'board') {
      expect(p.pos).toBeGreaterThan(0)
      expect(p.pos).toBeLessThanOrEqual(28)
      expect(p.history[p.history.length - 1]).toBe(p.pos) // 기록의 마지막 = 현재 칸
      expect(p.history[0]).toBe(0) // 기록은 출발점에서 시작
    }
  }
  // 한 칸에는 한 플레이어의 말만 있을 수 있다 (도착하면 잡으니까)
  const ownerAt = new Map()
  for (const p of s.pieces) {
    if (p.pos === null) continue
    if (ownerAt.has(p.pos)) expect(ownerAt.get(p.pos)).toBe(p.owner)
    ownerAt.set(p.pos, p.owner)
  }
}

// 한 판을 끝까지 둔다. 어떤 상황이 나왔는지 세어서 돌려준다.
function playGame(names, seed, seen) {
  const random = seededRandom(seed)
  let s = createGame(names)
  for (let step = 0; step < 20000; step++) {
    checkInvariants(s)
    if (s.phase === 'over') return s
    if (s.phase === 'throw') {
      s = throwYut(s, random)
      if (s.lastThrow === 'nak') seen.nak++
      if (s.message === '움직일 수 있는 말이 없습니다.') seen.pass++
      continue
    }
    const moves = getLegalMoves(s)
    // 이동 단계에서는 언제나 움직일 수 있는 말이 있어야 한다 (없으면 자동으로 다음 차례로 넘어가므로)
    expect(moves.length).toBeGreaterThan(0)
    const move = moves[Math.floor(random() * moves.length)]
    const result = s.pool[move.resultIndex]
    const mover = s.pieces[move.pieceId]
    // 상황 세기
    if (result === 'backdo' && mover.status === 'board' && mover.pos === 1) seen.backdoToStart++
    if (result === 'backdo' && mover.status === 'board' && mover.pos >= 20) seen.backdoOnShortcut++
    if (mover.status === 'waiting') seen.waitingFinished++
    if (move.route === 'shortcut') seen.shortcut++
    if (move.to === 0) {
      const enemyWaiting = s.pieces.some((p) => p.owner !== s.current && p.status === 'waiting')
      if (enemyWaiting) seen.waitingCaught++
    }
    const next = applyMove(s, move)
    expect(next).not.toBe(s) // 가능한 이동은 반드시 적용되어야 한다
    s = next
    if (s.message === '움직일 수 있는 말이 없습니다.') seen.pass++
  }
  throw new Error('게임이 끝나지 않았다')
}

for (const names of [['가', '나'], ['가', '나', '다'], ['가', '나', '다', '라']]) {
  test(`${names.length}명 게임을 끝까지 진행할 수 있다 (100판)`, () => {
    const seen = { nak: 0, pass: 0, backdoToStart: 0, backdoOnShortcut: 0, waitingFinished: 0, waitingCaught: 0, shortcut: 0 }
    for (let seed = 1; seed <= 100; seed++) {
      const end = playGame(names, seed * 7919 + names.length, seen)
      const winnerPieces = end.pieces.filter((p) => p.owner === end.winner)
      expect(winnerPieces.every((p) => p.status === 'done')).toBe(true)
    }
    // 중요한 상황들이 실제로 여러 번 나왔는지 확인 (규칙이 한 번도 안 쓰였다면 검사가 의미 없으므로)
    for (const [name, count] of Object.entries(seen)) {
      expect(count, name).toBeGreaterThan(0)
    }
  }, 30000) // 100판을 두므로 시간이 걸린다. 기본 제한(5초) 대신 30초까지 기다린다
}
