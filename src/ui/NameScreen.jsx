// 닉네임 정하기 (처음 한 번만. 이 기기가 기억한다)
import { useState } from 'react'

export default function NameScreen({ onSave }) {
  const [name, setName] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const text = name.trim()
    if (text) onSave(text)
  }

  return (
    <form className="setup" onSubmit={submit}>
      <h1 className="title">윷놀이</h1>
      <label className="field">
        <span className="hint">닉네임을 정해 주세요 (최대 10글자)</span>
        <input value={name} maxLength={10} autoFocus onChange={(e) => setName(e.target.value)} />
      </label>
      <button type="submit" className="primary" disabled={!name.trim()}>
        들어가기
      </button>
    </form>
  )
}
