// 결과 화면: 우승자를 보여 준다
export default function ResultScreen({ winner, onRestart }) {
  return (
    <div className="result">
      <span className="result-stone" style={{ background: winner.color }} aria-hidden="true" />
      <h1 className="title">{winner.name} 우승!</h1>
      <p>말 4개를 가장 먼저 모두 완주시켰습니다.</p>
      <button type="button" className="primary" onClick={onRestart}>다시 하기</button>
    </div>
  )
}
