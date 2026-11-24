// 시작 화면: 인원(2~4명)을 고르고 이름을 입력한다
import { useState } from 'react'
import { PLAYER_COLORS } from '../rules/game.js'

export default function SetupScreen({ onStart }) {
  const [count, setCount] = useState(2) // 플레이어 수
  const [names, setNames] = useState(['', '', '', '']) // 입력한 이름 (최대 4명)

  // 이름 칸 하나를 바꾼다
  const changeName = (i, value) => setNames(names.map((n, k) => (k === i ? value : n)))

  // 시작: 빈 이름은 "플레이어1" 같은 기본 이름으로 채운다
  const start = (e) => {
    e.preventDefault()
    const finalNames = names.slice(0, count).map((n, i) => n.trim() || `플레이어${i + 1}`)
    onStart(finalNames)
  }

  return (
    <form className="setup" onSubmit={start}>
      <h1 className="title">윷놀이</h1>

      <fieldset className="setup-count">
        <legend>몇 명이 하나요?</legend>
        {[2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            className={count === n ? 'chip active' : 'chip'}
            aria-pressed={count === n}
            onClick={() => setCount(n)}
          >
            {n}명
          </button>
        ))}
      </fieldset>

      <fieldset className="setup-names">
        <legend>이름</legend>
        {Array.from({ length: count }, (_, i) => (
          <label key={i} className="name-row">
            <span className="dot" style={{ background: PLAYER_COLORS[i] }} aria-hidden="true" />
            <input
              value={names[i]}
              maxLength={10}
              placeholder={`플레이어${i + 1}`}
              onChange={(e) => changeName(i, e.target.value)}
            />
          </label>
        ))}
      </fieldset>

      <button type="submit" className="primary">게임 시작</button>
    </form>
  )
}
