// 윷놀이 방 입구: 빠른대전 / 친선대전(초대코드 발급, 초대코드 입장)
import { useState } from 'react'

// 서버가 보낸 에러 코드를 화면 문구로 바꾼다
const ROOM_ERRORS = {
  NOT_FOUND: '없는 초대코드예요',
  FULL: '방이 꽉 찼어요 (4명)',
  STARTED: '이미 게임을 시작한 방이에요',
}

export default function EntranceScreen({ name, error, onQuick, onCreate, onJoin }) {
  const [friendly, setFriendly] = useState(false) // 친선대전 메뉴를 펼쳤는지
  const [code, setCode] = useState('')

  const join = (e) => {
    e.preventDefault()
    if (code.trim()) onJoin(code.trim().toUpperCase())
  }

  return (
    <div className="setup">
      <h1 className="title">윷놀이</h1>
      <p className="hint">{name}님, 어떻게 할까요?</p>

      {!friendly ? (
        <div className="menu">
          <button type="button" className="primary" onClick={onQuick}>
            빠른대전
          </button>
          <p className="hint">모르는 사람과 바로 시작해요. 빈자리는 컴퓨터가 채워요.</p>
          <button type="button" className="primary" onClick={() => setFriendly(true)}>
            친선대전
          </button>
          <p className="hint">초대코드로 친구들끼리 해요.</p>
        </div>
      ) : (
        <div className="menu">
          <button type="button" className="primary" onClick={onCreate}>
            초대코드 발급
          </button>
          <form className="code-form" onSubmit={join}>
            <input
              value={code}
              maxLength={4}
              placeholder="예: 4F7K"
              aria-label="초대코드"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <button type="submit" className="primary" disabled={!code.trim()}>
              초대코드 입장
            </button>
          </form>
          {error && (
            <p className="message" role="alert">
              {ROOM_ERRORS[error] ?? '들어갈 수 없어요'}
            </p>
          )}
          <button type="button" className="chip" onClick={() => setFriendly(false)}>
            뒤로
          </button>
        </div>
      )}
    </div>
  )
}
