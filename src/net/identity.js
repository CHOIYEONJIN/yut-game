// 닉네임과 플레이어 번호표
// 이름을 다루는 곳은 이 파일 하나뿐이다. 나중에 포털 로그인이 생기면 이 파일만 바꾸면 된다.
// - playerId(번호표): 처음 들어올 때 만든 긴 무작위 글자. 서버가 "다시 접속한 같은 사람"을 알아보는 데 쓴다.
// - 둘 다 이 브라우저의 저장소(localStorage)에 기억해 둔다.

// 저장소가 막혀 있을 때(사생활 보호 모드 등) 이번 접속 동안만 쓰는 임시 기억
const memory = new Map()

// 저장 이름. 개발 중에 주소에 ?player=2 를 붙이면 창마다 다른 사람처럼 쓰도록 이름 뒤에 .2를 붙인다.
function keyFor(base, { search, dev }) {
  const player = dev ? new URLSearchParams(search).get('player') : null
  return player ? `${base}.${player}` : base
}

function read(storage, key) {
  try {
    return storage.getItem(key)
  } catch {
    return memory.get(key) ?? null // 저장소를 못 쓰면 임시 기억을 쓴다
  }
}

function write(storage, key, value) {
  try {
    storage.setItem(key, value)
  } catch {
    memory.set(key, value) // 저장소를 못 쓰면 임시 기억에만 남는다
  }
}

const defaults = () => ({
  storage: globalThis.localStorage,
  search: globalThis.location?.search ?? '',
  dev: Boolean(import.meta.env?.DEV),
})

// 지금 이 사람의 { playerId, name } (이름을 아직 안 정했으면 name은 null)
export function getIdentity(options = {}) {
  const opts = { ...defaults(), ...options }
  const idKey = keyFor('yut.playerId', opts)
  let playerId = read(opts.storage, idKey)
  if (!playerId) {
    playerId = crypto.randomUUID()
    write(opts.storage, idKey, playerId)
  }
  return { playerId, name: read(opts.storage, keyFor('yut.name', opts)) }
}

// 닉네임을 기억한다
export function saveName(name, options = {}) {
  const opts = { ...defaults(), ...options }
  write(opts.storage, keyFor('yut.name', opts), name)
}
