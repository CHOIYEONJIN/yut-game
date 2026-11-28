// 결과 화면: 우승자를 보여 준다 (사람이 모두 나가 끝난 게임이면 winner가 null)
export default function ResultScreen({ winner, onBack }) {
  return (
    <div className="result">
      {winner ? (
        <>
          <span className="result-stone" style={{ background: winner.color }} aria-hidden="true" />
          <h1 className="title">{winner.name} 우승!</h1>
          <p>말 4개를 가장 먼저 모두 완주시켰습니다.</p>
        </>
      ) : (
        <h1 className="title">게임이 끝났습니다</h1>
      )}
      <button type="button" className="primary" onClick={onBack}>
        입구로
      </button>
    </div>
  )
}
