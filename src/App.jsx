// 앱 전체: 시작 화면 → 게임 화면 → 결과 화면을 전환한다
import { useState } from 'react'
import SetupScreen from './ui/SetupScreen.jsx'
import GameScreen from './ui/GameScreen.jsx'
import ResultScreen from './ui/ResultScreen.jsx'
import { createGame } from './rules/game.js'

export default function App() {
  const [game, setGame] = useState(null) // 게임 상태 (시작 전에는 null)

  // 시작 전
  if (!game) return <SetupScreen onStart={(names) => setGame(createGame(names))} />

  // 게임이 끝났으면 결과 화면
  if (game.phase === 'over') {
    return <ResultScreen winner={game.players[game.winner]} onRestart={() => setGame(null)} />
  }

  return <GameScreen state={game} onChange={setGame} />
}
