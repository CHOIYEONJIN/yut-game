# 윷놀이

웹 브라우저로 2~4명이 각자의 기기에서 함께 하는 온라인 윷놀이입니다.

- **빠른대전**: 모르는 사람과 바로 시작. 2명 이상 모이면 30초 뒤 빈자리를 컴퓨터가 채워 시작하고, 혼자면 "컴퓨터와 바로 하기"
- **친선대전**: 초대코드를 만들어 친구들끼리 (2~4명)

**바로 플레이:** https://choiyeonjin.github.io/yut-game/

## 규칙 요약

- 각자 말 4개. 먼저 4개를 모두 완주시키면 승리
- 빽도(뒤로 1칸), 도, 개, 걸, 윷, 모. 윷과 모가 나오거나 상대 말을 잡으면 한 번 더 던짐
- 낙(약 5%): 더 던지지 못하고, 모은 결과가 없으면 차례를 건너뜀
- 모서리(5, 10번 칸)에서 출발할 때 지름길과 바깥길 중 선택
- 출발점에 정확히 도착하면 "완주 대기". 도 이상이 나오면 완주, 빽도면 온 길로 한 칸 뒤로

자세한 규칙은 [CLAUDE.md](CLAUDE.md)에 있습니다.

## 내 컴퓨터에서 실행하기

[Node.js](https://nodejs.org/)가 설치되어 있어야 합니다.

터미널 두 개를 열고 각각 실행합니다.

```
npm install
npm run server
```

```
npm run dev
```

`npm run server`는 게임 서버(http://localhost:3001), `npm run dev`는 화면(http://localhost:5173)입니다.
화면 주소를 브라우저에서 엽니다.

혼자서 여러 사람처럼 시험해 보려면 창마다 주소 끝에 `?player=1`, `?player=2`처럼 다른 번호를 붙입니다
(개발 중에만 동작).

| 명령어 | 하는 일 |
|---|---|
| `npm run server` | 게임 서버 실행 |
| `npm run dev` | 화면을 개발용으로 실행 (코드를 고치면 바로 반영) |
| `npm test` | 규칙과 서버 자동 검사 |
| `npm run build` | 완성본을 `dist/` 폴더에 만들기 |

## 폴더 구조

- `src/rules/`: 게임 규칙 (화면과 무관한 순수 자바스크립트, 테스트 포함)
- `src/ui/`: 화면 (React)
- `src/net/`: 화면이 서버와 주고받는 코드, 닉네임 기억
- `server/`: 게임 서버 (Node.js + Socket.IO). 규칙은 `src/rules/`를 그대로 씀
- `docs/`: 설계 문서와 구현 계획

빌드 결과물은 상대 경로로 만들어지므로, 게임 모음 사이트의 어느 폴더(예: `/games/yut/`)에 넣어도 동작합니다.

## 서버 주소 설정 (배포)

- 화면이 접속할 서버 주소는 빌드할 때 `VITE_SERVER_URL`로 정합니다.
  GitHub에서는 저장소 Settings → Secrets and variables → Actions → Variables에 `VITE_SERVER_URL`을 넣습니다.
- 서버는 환경변수 `PORT`(포트)와 `ALLOWED_ORIGIN`(접속을 허락할 화면 주소, 예: `https://choiyeonjin.github.io`)을 씁니다.
