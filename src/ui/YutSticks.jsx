// 윷가락 4개를 멍석 위에 그리는 화면 부품
// - sticks: { faces: [배인지 x4], out: [판 밖인지 x4] } (아직 안 던졌으면 null)
// - rolling: 지금 굴러가는 중인지 (true면 굴러가는 움직임을 보여 주고 결과 글자는 숨긴다)
// - rollKey: 던질 때마다 바뀌는 숫자 (움직임을 처음부터 다시 시작하기 위해 사용)
// - resultLabel: 결과 글자 (예: '개', '낙')

const STICK_W = 30
const STICK_H = 120
const GAP = 22
const MAT = { x: 20, y: 16, w: 300, h: 150 } // 멍석(윷을 던지는 판) 위치와 크기

export default function YutSticks({ sticks, rolling, rollKey, resultLabel }) {
  const faces = sticks?.faces ?? [false, false, false, false]
  const out = sticks?.out ?? [false, false, false, false]
  const totalW = STICK_W * 4 + GAP * 3
  const startX = MAT.x + (MAT.w - totalW) / 2

  return (
    <div className="yut-area">
      <svg className="yut-svg" viewBox="0 0 400 190" role="img" aria-label={rolling ? '윷을 던지는 중' : `윷 결과 ${resultLabel ?? '없음'}`}>
        {/* 멍석: 짚으로 엮은 판. 가로줄로 엮은 느낌을 낸다 */}
        <rect x={MAT.x} y={MAT.y} width={MAT.w} height={MAT.h} rx="10" className="mat" />
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1={MAT.x + 8} x2={MAT.x + MAT.w - 8} y1={MAT.y + 15 * (i + 1)} y2={MAT.y + 15 * (i + 1)} className="mat-weave" />
        ))}

        {faces.map((flat, i) => {
          // 판 밖으로 나간 가락은 멍석 오른쪽 바깥에 비스듬히 놓는다
          const x = out[i] ? MAT.x + MAT.w + 22 : startX + i * (STICK_W + GAP)
          const y = out[i] ? MAT.y + 40 : MAT.y + (MAT.h - STICK_H) / 2
          const tilt = out[i] ? 28 : (i - 1.5) * 4 // 살짝 삐뚤게 놓아 손으로 던진 느낌
          return (
            <g key={`${rollKey}-${i}`} transform={`translate(${x} ${y}) rotate(${tilt} ${STICK_W / 2} ${STICK_H / 2})`}>
              <g
                className={`stick${rolling ? ' rolling' : ''}${sticks ? '' : ' idle'}`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                {flat ? <FlatSide marked={i === 0} /> : <RoundSide />}
              </g>
            </g>
          )
        })}
      </svg>
      {/* key가 바뀌면 글자가 새로 그려져서 "툭" 나타나는 움직임이 다시 나온다 */}
      <p key={`${rollKey}-${rolling}`} className="yut-result" aria-live="polite">
        {rolling ? ' ' : resultLabel ?? ' '}
      </p>
    </div>
  )
}

// 배(평평한 면): 밝은 나무색, 가운데에 ✕ 무늬 세 개
// marked가 true면 빽도 가락이라서 빨간 표시를 하나 더 그린다
function FlatSide({ marked }) {
  return (
    <>
      <rect width={STICK_W} height={STICK_H} rx="12" className="stick-flat" />
      {[30, 60, 90].map((cy) => (
        <g key={cy} className="stick-mark">
          <line x1={STICK_W / 2 - 6} y1={cy - 6} x2={STICK_W / 2 + 6} y2={cy + 6} />
          <line x1={STICK_W / 2 + 6} y1={cy - 6} x2={STICK_W / 2 - 6} y2={cy + 6} />
        </g>
      ))}
      {marked && <circle cx={STICK_W / 2} cy="12" r="5" className="stick-backdo" />}
    </>
  )
}

// 등(둥근 면): 짙은 나무색, 가운데가 볼록한 느낌의 줄
function RoundSide() {
  return (
    <>
      <rect width={STICK_W} height={STICK_H} rx="12" className="stick-round" />
      <rect x={STICK_W / 2 - 4} y="10" width="8" height={STICK_H - 20} rx="4" className="stick-shine" />
    </>
  )
}
