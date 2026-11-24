// Vite 설정 파일: 프로젝트를 실행하고 완성본(빌드)을 만드는 방법을 정한다.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // React 코드(JSX)를 브라우저가 이해하게 바꿔 주는 플러그인
  plugins: [react()],
  // 상대 경로로 빌드한다. 나중에 게임 모음 사이트의 어느 폴더(예: /games/yut/)에 넣어도 동작하게 하기 위함
  base: './',
  // 자동 테스트(Vitest) 설정: 규칙 코드는 브라우저 없이 Node에서 검사한다
  test: {
    environment: 'node',
  },
})
