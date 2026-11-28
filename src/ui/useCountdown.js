// 서버가 알려 준 "남은 시간(ms)"을 화면에서 스스로 줄여 가며 보여 주기 위한 훅
// ms가 null이면 null. key가 바뀌면(새 소식이 오면) 그 값부터 다시 센다.
import { useEffect, useState } from 'react'

export function useCountdown(ms, key) {
  const [left, setLeft] = useState(ms)
  useEffect(() => {
    setLeft(ms)
    if (ms === null || ms === undefined) return
    const startedAt = Date.now()
    const id = setInterval(() => setLeft(Math.max(0, ms - (Date.now() - startedAt))), 250)
    return () => clearInterval(id)
  }, [ms, key])
  return left === null || left === undefined ? null : Math.ceil(left / 1000) // 남은 초
}
