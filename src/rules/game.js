// 게임 진행 규칙
// 이 파일은 화면(React)에 대해 전혀 모른다. "현재 상태 + 행동"을 받아 "새 상태"를 돌려줄 뿐이다.
// 상태는 평범한 객체라서, 2단계에서 그대로 서버로 보내고 받을 수 있다.
import { rollYut, isBonus } from './yut.js'

// 플레이어 색 (순서대로 빨강, 파랑, 초록, 노랑)
export const PLAYER_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fdd835']

// 플레이어 한 명당 말 개수
export const PIECES_PER_PLAYER = 4

// 새 게임 상태를 만든다. names: 플레이어 이름 목록 (2~4명)
export function createGame(names) {
  const players = names.map((name, i) => ({ name, color: PLAYER_COLORS[i] }))
  const pieces = []
  players.forEach((_, owner) => {
    for (let k = 0; k < PIECES_PER_PLAYER; k++) {
      // status: 'home'(출발 전) | 'board'(판 위) | 'waiting'(완주 대기) | 'done'(완주)
      // history: 지나온 칸 기록 (빽도 때 온 길로 되돌아가기 위해 저장)
      pieces.push({ id: pieces.length, owner, status: 'home', pos: null, history: [] })
    }
  })
  return {
    players,
    pieces,
    current: 0, // 지금 차례인 플레이어 번호
    phase: 'throw', // 'throw'(던지기) | 'move'(말 옮기기) | 'over'(게임 끝)
    throwsLeft: 1, // 던지기 단계에서 더 던질 수 있는 횟수
    pool: [], // 모인 윷 결과들
    lastThrow: null, // 방금 던진 결과 (화면 표시용)
    winner: null, // 우승한 플레이어 번호
    message: '', // 화면에 보여줄 안내 문구
  }
}

// 윷을 한 번 던진다. 던지기 단계가 아니면 아무것도 바꾸지 않는다.
export function throwYut(state, random = Math.random) {
  if (state.phase !== 'throw') return state
  const next = structuredClone(state)
  const result = rollYut(random)
  next.pool.push(result)
  next.lastThrow = result
  next.message = ''
  next.throwsLeft -= 1
  // 윷이나 모면 한 번 더 던진다
  if (isBonus(result)) next.throwsLeft += 1
  // 더 던질 것이 없으면 모인 결과를 쓰는 이동 단계로 넘어간다
  if (next.throwsLeft === 0) next.phase = 'move'
  return next
}
