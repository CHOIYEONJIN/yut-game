// 윷놀이 게임 서버 시작점
// 실행: npm run server  (주소 http://localhost:3001)
// 환경변수: PORT(포트 번호), ALLOWED_ORIGIN(접속을 허락할 화면 주소, 예: https://choiyeonjin.github.io)
import http from 'node:http'
import { pathToFileURL } from 'node:url'
import { Server } from 'socket.io'
import { createHub } from './hub.js'

// 서버를 켠다. port에 0을 주면 비어 있는 아무 포트나 쓴다 (테스트용)
export function createServer({ port = 3001, allowedOrigin = '*', timing = {} } = {}) {
  // 주소로 직접 들어오면 서버가 켜져 있다는 글만 보여 준다 (호스팅 서비스의 상태 확인용)
  const httpServer = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('윷놀이 서버가 켜져 있습니다')
  })
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigin },
    // 5초마다 "살아 있니?"를 묻고, 5초 안에 대답이 없으면 끊긴 것으로 본다 (약 10초 안에 알아챔)
    pingInterval: 5000,
    pingTimeout: 5000,
  })
  const hub = createHub(io, timing)
  return new Promise((resolve) => {
    httpServer.listen(port, () => {
      resolve({
        port: httpServer.address().port,
        close: () =>
          new Promise((done) => {
            hub.close()
            io.close(() => done())
          }),
      })
    })
  })
}

// 이 파일을 직접 실행했을 때만 서버를 켠다 (테스트에서 import할 때는 켜지 않음)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createServer({
    port: Number(process.env.PORT) || 3001,
    allowedOrigin: process.env.ALLOWED_ORIGIN || '*',
  }).then(({ port }) => console.log(`윷놀이 서버가 ${port}번 포트에서 켜졌습니다`))
}
