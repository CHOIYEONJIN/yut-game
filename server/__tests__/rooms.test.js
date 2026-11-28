// 친선대전 방(rooms.js) 검사
import { test, expect } from 'vitest'
import { createRooms, CODE_LETTERS } from '../rooms.js'

const p = (id) => ({ playerId: id, name: id })

function setup(random) {
  const started = []
  const rooms = createRooms({ startMatch: (code, seats) => started.push({ code, seats }), random })
  return { rooms, started }
}

// 정해 둔 숫자들을 차례로 돌려주는 랜덤
const sequence = (values) => {
  let i = 0
  return () => values[i++ % values.length]
}

test('초대코드는 정해진 글자 모음의 4글자이고, 이미 있는 코드와 겹치지 않는다', () => {
  expect(CODE_LETTERS).toBe('ABCDEFGHJKLMNPQRSTUVWXYZ23456789')
  // 처음 두 번은 AAAA가 나오고, 그다음 BBBB가 나오는 랜덤
  const b = 1 / 32
  const { rooms } = setup(sequence([0, 0, 0, 0, 0, 0, 0, 0, b, b, b, b]))
  const first = rooms.create(p('a'))
  const second = rooms.create(p('b'))
  expect(first).toBe('AAAA')
  expect(second).toBe('BBBB')
  const { rooms: real } = setup(Math.random)
  for (let i = 0; i < 50; i++) expect(real.create(p(`x${i}`))).toMatch(/^[A-HJ-NP-Z2-9]{4}$/)
})

test('코드로 들어가면 들어온 순서대로 목록에 보인다, 소문자로 입력해도 된다', () => {
  const { rooms } = setup()
  const code = rooms.create(p('a'))
  expect(rooms.join(code.toLowerCase(), p('b'))).toEqual({ ok: true })
  expect(rooms.view(code)).toEqual({ code, players: ['a', 'b'], hostIndex: 0, started: false })
  expect(rooms.codeOf('b')).toBe(code)
  expect(rooms.members(code)).toEqual(['a', 'b'])
})

test('없는 코드, 꽉 찬 방, 시작한 방은 이유를 알려 준다', () => {
  const { rooms } = setup()
  expect(rooms.join('ZZZZ', p('a'))).toEqual({ ok: false, error: 'NOT_FOUND' })
  const code = rooms.create(p('a'))
  ;['b', 'c', 'd'].forEach((id) => rooms.join(code, p(id)))
  expect(rooms.join(code, p('e'))).toEqual({ ok: false, error: 'FULL' })
  const code2 = rooms.create(p('f'))
  rooms.join(code2, p('g'))
  rooms.start('f')
  expect(rooms.join(code2, p('h'))).toEqual({ ok: false, error: 'STARTED' })
})

test('방장만, 2명 이상일 때만 시작할 수 있다', () => {
  const { rooms, started } = setup()
  const code = rooms.create(p('a'))
  expect(rooms.start('a')).toBe(false) // 혼자
  rooms.join(code, p('b'))
  expect(rooms.start('b')).toBe(false) // 방장 아님
  expect(rooms.start('a')).toBe(true)
  expect(rooms.start('a')).toBe(false) // 이미 시작
  expect(started).toEqual([
    {
      code,
      seats: [
        { playerId: 'a', name: 'a', kind: 'human' },
        { playerId: 'b', name: 'b', kind: 'human' },
      ],
    },
  ])
  expect(rooms.view(code).started).toBe(true)
  rooms.end(code)
  expect(rooms.view(code)).toBe(null)
  expect(rooms.codeOf('a')).toBe(null)
})

test('시작 전에 방장이 나가면 다음 사람이 방장이 되고, 모두 나가면 방이 사라진다', () => {
  const { rooms } = setup()
  const code = rooms.create(p('a'))
  rooms.join(code, p('b'))
  rooms.join(code, p('c'))
  expect(rooms.leave('a')).toBe(code)
  expect(rooms.view(code)).toEqual({ code, players: ['b', 'c'], hostIndex: 0, started: false })
  rooms.leave('b')
  rooms.leave('c')
  expect(rooms.view(code)).toBe(null)
  expect(rooms.join(code, p('d'))).toEqual({ ok: false, error: 'NOT_FOUND' })
})
