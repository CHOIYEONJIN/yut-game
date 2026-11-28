// 닉네임과 플레이어 번호표(identity.js) 검사
import { test, expect } from 'vitest'
import { getIdentity, saveName } from '../identity.js'

// 브라우저 저장소(localStorage) 흉내
function fakeStorage() {
  const data = {}
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v)
    },
  }
}

test('처음이면 새 playerId를 만들어 저장하고, 다음에는 같은 값을 돌려준다', () => {
  const storage = fakeStorage()
  const first = getIdentity({ storage, search: '', dev: false })
  expect(first.playerId).toMatch(/^[0-9a-f-]{36}$/)
  expect(first.name).toBe(null)
  expect(storage.data['yut.playerId']).toBe(first.playerId)
  expect(getIdentity({ storage, search: '', dev: false }).playerId).toBe(first.playerId)
})

test('saveName 뒤에는 name을 돌려준다', () => {
  const storage = fakeStorage()
  saveName('연진', { storage, search: '', dev: false })
  expect(getIdentity({ storage, search: '', dev: false }).name).toBe('연진')
})

test('개발 중에 ?player=2를 붙이면 다른 playerId를 쓴다', () => {
  const storage = fakeStorage()
  const normal = getIdentity({ storage, search: '', dev: true })
  const second = getIdentity({ storage, search: '?player=2', dev: true })
  expect(second.playerId).not.toBe(normal.playerId)
  expect(storage.data['yut.playerId.2']).toBe(second.playerId)
  saveName('둘째', { storage, search: '?player=2', dev: true })
  expect(getIdentity({ storage, search: '', dev: true }).name).toBe(null)
})

test('개발이 아니면 ?player=2를 무시한다', () => {
  const storage = fakeStorage()
  const normal = getIdentity({ storage, search: '', dev: false })
  expect(getIdentity({ storage, search: '?player=2', dev: false }).playerId).toBe(normal.playerId)
})

test('저장소가 막혀 있어도 오류 없이 playerId를 돌려준다', () => {
  const blocked = {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
  }
  const id = getIdentity({ storage: blocked, search: '', dev: false })
  expect(id.playerId).toMatch(/^[0-9a-f-]{36}$/)
  expect(() => saveName('연진', { storage: blocked, search: '', dev: false })).not.toThrow()
})
