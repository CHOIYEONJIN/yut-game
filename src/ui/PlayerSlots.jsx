// 대기 화면의 4자리 목록 (들어온 사람 + 빈자리)
import { PLAYER_COLORS } from '../rules/game.js'

const MAX = 4

export default function PlayerSlots({ players, notes = [] }) {
  return (
    <ul className="slots-list">
      {Array.from({ length: MAX }, (_, i) => (
        <li key={i} className={players[i] ? 'slot-row' : 'slot-row empty'}>
          <span className="dot" style={{ background: players[i] ? PLAYER_COLORS[i] : 'transparent' }} aria-hidden="true" />
          {players[i] ?? '빈자리'}
          {notes[i] && <span className="waiting-badge">{notes[i]}</span>}
        </li>
      ))}
    </ul>
  )
}
