import { expect, test, describe, vi, afterEach } from 'vitest'
import axios from 'axios'
import { decode } from 'jsonwebtoken'
import { HTTPError, electermSync } from '../src/electerm-sync'

/**
 * Provider-level tests: every sync type supported by electerm
 *   - github  (gist)
 *   - gitee   (gist)
 *   - custom  (self-hosted sync server)
 *   - cloud   (electerm sync site, e.g. https://sync.electerm.org)
 *
 * All of them run fully offline — axios.request is mocked and we assert
 * on the request config the library produced (url, method, data, headers).
 */

interface Captured {
  url?: string
  method?: string
  data?: any
  headers?: Record<string, string>
}

function mockAxios (response: any = { data: { ok: true } }) {
  const axiosInstance = axios.create()
  const captured: Captured = {}
  const spy = vi.spyOn(axiosInstance, 'request').mockImplementation(async (config: any) => {
    captured.url = config.url
    captured.method = config.method
    captured.data = config.data
    captured.headers = config.headers
    return response
  })
  return { axiosInstance, captured, spy }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('github gist', () => {
  test('test: lists one gist from api.github.com', async () => {
    const { axiosInstance, captured } = mockAxios({ data: [{ id: 'g1' }] })
    const res = await electermSync(axiosInstance, 'github', 'test', [], 'gh-token')
    expect(captured.url).toBe('https://api.github.com/gists?per_page=1')
    expect(captured.method).toBe('GET')
    expect(captured.headers?.Authorization).toBe('token gh-token')
    expect(captured.headers?.['Content-Type']).toBe('application/json')
    expect(captured.headers?.['X-User-Agent']).toBe('electerm-sync/v2.0.0')
    expect(res).toEqual([{ id: 'g1' }])
  })

  test('create: posts a new gist', async () => {
    const { axiosInstance, captured } = mockAxios()
    const gistsData = { description: 'd', files: { 'a.txt': { content: 'hi' } } }
    await electermSync(axiosInstance, 'github', 'create', [gistsData], 'gh-token')
    expect(captured.url).toBe('https://api.github.com/gists')
    expect(captured.method).toBe('POST')
    expect(captured.data).toEqual(gistsData)
  })

  test('update: patches the gist by id', async () => {
    const { axiosInstance, captured } = mockAxios()
    const gistsData = { files: { 'a.txt': { content: 'v2' } } }
    await electermSync(axiosInstance, 'github', 'update', ['abc123', gistsData], 'gh-token')
    expect(captured.url).toBe('https://api.github.com/gists/abc123')
    expect(captured.method).toBe('PATCH')
    expect(captured.data).toEqual(gistsData)
  })

  test('getOne: fetches the gist by id', async () => {
    const { axiosInstance, captured } = mockAxios()
    await electermSync(axiosInstance, 'github', 'getOne', ['abc123'], 'gh-token')
    expect(captured.url).toBe('https://api.github.com/gists/abc123')
    expect(captured.method).toBe('GET')
  })

  test('unsupported func throws', async () => {
    const { axiosInstance } = mockAxios()
    await expect(
      electermSync(axiosInstance, 'github', 'delete', [], 'gh-token')
    ).rejects.toThrow('Unsupported func: delete')
  })
})

describe('gitee gist', () => {
  test('test: lists one gist from gitee api v5', async () => {
    const { axiosInstance, captured } = mockAxios()
    await electermSync(axiosInstance, 'gitee', 'test', [], 'gitee-token')
    expect(captured.url).toBe('https://gitee.com/api/v5/gists?per_page=1')
    expect(captured.method).toBe('GET')
    expect(captured.headers?.Authorization).toBe('token gitee-token')
  })

  test('create: posts a new gist', async () => {
    const { axiosInstance, captured } = mockAxios()
    const gistsData = { description: 'd', files: { 'a.txt': { content: 'hi' } } }
    await electermSync(axiosInstance, 'gitee', 'create', [gistsData], 'gitee-token')
    expect(captured.url).toBe('https://gitee.com/api/v5/gists')
    expect(captured.method).toBe('POST')
    expect(captured.data).toEqual(gistsData)
  })

  test('update: patches the gist by id', async () => {
    const { axiosInstance, captured } = mockAxios()
    const gistsData = { files: { 'a.txt': { content: 'v2' } } }
    await electermSync(axiosInstance, 'gitee', 'update', ['gid', gistsData], 'gitee-token')
    expect(captured.url).toBe('https://gitee.com/api/v5/gists/gid')
    expect(captured.method).toBe('PATCH')
    expect(captured.data).toEqual(gistsData)
  })

  test('getOne: fetches the gist by id', async () => {
    const { axiosInstance, captured } = mockAxios()
    await electermSync(axiosInstance, 'gitee', 'getOne', ['gid'], 'gitee-token')
    expect(captured.url).toBe('https://gitee.com/api/v5/gists/gid')
    expect(captured.method).toBe('GET')
  })
})

describe('custom sync server', () => {
  // connection string format: token####server####userId####algorithm
  const conn = 'my-secret####https://sync.example.com/api/sync####user-42'

  test('create: PUTs the payload to the server url', async () => {
    const { axiosInstance, captured } = mockAxios()
    const payload = { bookmarks: [{ id: 'b1' }] }
    await electermSync(axiosInstance, 'custom', 'create', [payload], conn)
    expect(captured.url).toBe('https://sync.example.com/api/sync')
    expect(captured.method).toBe('PUT')
    expect(captured.data).toEqual(payload)
  })

  test('getOne: GETs the server url and adopts userId from args', async () => {
    const { axiosInstance, captured } = mockAxios({ data: { content: 'encrypted' } })
    const res = await electermSync(axiosInstance, 'custom', 'getOne', ['user-42'], conn)
    expect(captured.url).toBe('https://sync.example.com/api/sync')
    expect(captured.method).toBe('GET')
    expect(res).toEqual({ content: 'encrypted' })
    // Authorization must be a JWT signed with the secret, carrying the user id
    const auth = captured.headers?.Authorization as string
    expect(auth.startsWith('Bearer ')).toBe(true)
    const tk = auth.slice('Bearer '.length)
    const payload = decode(tk) as { id: string } | null
    expect(payload?.id).toBe('user-42')
  })

  test('update: PUTs payload, 2-arg form adopts userId from args', async () => {
    const { axiosInstance, captured } = mockAxios()
    const payload = { bookmarks: [] }
    await electermSync(axiosInstance, 'custom', 'update', ['user-99', payload], conn)
    expect(captured.url).toBe('https://sync.example.com/api/sync')
    expect(captured.method).toBe('PUT')
    expect(captured.data).toEqual(payload)
    const auth = captured.headers?.Authorization as string
    const tk = auth.slice('Bearer '.length)
    const jwtPayload = decode(tk) as { id: string } | null
    expect(jwtPayload?.id).toBe('user-99')
  })

  test('update: 1-arg form keeps userId from the connection string', async () => {
    const { axiosInstance, captured } = mockAxios()
    await electermSync(axiosInstance, 'custom', 'update', [{ a: 1 }], conn)
    const auth = captured.headers?.Authorization as string
    const tk = auth.slice('Bearer '.length)
    const jwtPayload = decode(tk) as { id: string } | null
    expect(jwtPayload?.id).toBe('user-42')
    expect(captured.data).toEqual({ a: 1 })
  })

  test('test: POSTs the server url and adopts userId from args', async () => {
    const { axiosInstance, captured } = mockAxios()
    await electermSync(axiosInstance, 'custom', 'test', ['user-42'], conn)
    expect(captured.url).toBe('https://sync.example.com/api/sync')
    expect(captured.method).toBe('POST')
    const auth = captured.headers?.Authorization as string
    const tk = auth.slice('Bearer '.length)
    const jwtPayload = decode(tk) as { id: string } | null
    expect(jwtPayload?.id).toBe('user-42')
  })

  test('no userId: sends the raw secret as Bearer token', async () => {
    const { axiosInstance, captured } = mockAxios()
    const connNoUser = 'my-secret####https://sync.example.com/api/sync'
    await electermSync(axiosInstance, 'custom', 'getOne', [], connNoUser)
    expect(captured.headers?.Authorization).toBe('Bearer my-secret')
  })

  test('algorithm field is honored (HS512)', async () => {
    const { axiosInstance, captured } = mockAxios()
    const conn512 = 'my-secret####https://sync.example.com/api/sync####user-42####HS512'
    await electermSync(axiosInstance, 'custom', 'getOne', ['user-42'], conn512)
    const auth = captured.headers?.Authorization as string
    const tk = auth.slice('Bearer '.length)
    const header = decode(tk, { complete: true })?.header
    expect(header?.alg).toBe('HS512')
  })

  test('defaults to HS256 when algorithm field is omitted', async () => {
    const { axiosInstance, captured } = mockAxios()
    await electermSync(axiosInstance, 'custom', 'getOne', ['user-42'], conn)
    const auth = captured.headers?.Authorization as string
    const tk = auth.slice('Bearer '.length)
    const header = decode(tk, { complete: true })?.header
    expect(header?.alg).toBe('HS256')
  })

  test('unsupported func throws', async () => {
    const { axiosInstance } = mockAxios()
    await expect(
      electermSync(axiosInstance, 'custom', 'purge', [], conn)
    ).rejects.toThrow('Unsupported func: purge')
  })
})

describe('electerm sync site (cloud)', () => {
  // electerm builds the cloud connection string as AccessToken####ApiUrl
  // and calls the lib with type 'cloud', passing userId as args[0].
  const conn = 'cloud-secret####https://sync.electerm.org/api/sync'

  test('type cloud goes through the custom server code path', async () => {
    const { axiosInstance, captured } = mockAxios({ data: { content: 'encrypted' } })
    const payload = { bookmarks: [] }
    const res = await electermSync(axiosInstance, 'cloud', 'create', [payload], conn)
    expect(captured.url).toBe('https://sync.electerm.org/api/sync')
    expect(captured.method).toBe('PUT')
    expect(captured.data).toEqual(payload)
    expect(res).toEqual({ content: 'encrypted' })
  })

  test('getOne: GETs the cloud url with userId from args', async () => {
    const { axiosInstance, captured } = mockAxios()
    await electermSync(axiosInstance, 'cloud', 'getOne', ['user-42'], conn)
    expect(captured.url).toBe('https://sync.electerm.org/api/sync')
    expect(captured.method).toBe('GET')
    const auth = captured.headers?.Authorization as string
    const tk = auth.slice('Bearer '.length)
    const jwtPayload = decode(tk) as { id: string } | null
    expect(jwtPayload?.id).toBe('user-42')
  })

  test('empty userId arg keeps the raw secret as Bearer token', async () => {
    // electerm sets args[0] = '' for cloud before calling the lib
    const { axiosInstance, captured } = mockAxios()
    await electermSync(axiosInstance, 'cloud', 'getOne', [''], conn)
    expect(captured.headers?.Authorization).toBe('Bearer cloud-secret')
  })

  test('test: POSTs the cloud url', async () => {
    const { axiosInstance, captured } = mockAxios()
    await electermSync(axiosInstance, 'cloud', 'test', [''], conn)
    expect(captured.url).toBe('https://sync.electerm.org/api/sync')
    expect(captured.method).toBe('POST')
  })
})

describe('run() dispatch and error mapping', () => {
  test('any unknown type falls back to the custom/cloud path', async () => {
    const { axiosInstance, captured } = mockAxios()
    await electermSync(axiosInstance, 'whatever', 'getOne', ['u1'], 'sec####https://s.example.com/api/sync')
    expect(captured.url).toBe('https://s.example.com/api/sync')
  })

  test('request returns res.data, not the full response', async () => {
    const { axiosInstance } = mockAxios({ status: 200, data: { a: 1 }, headers: {}, config: {} })
    const res = await electermSync(axiosInstance, 'github', 'test', [], 't')
    expect(res).toEqual({ a: 1 })
  })

  test('http error responses become HTTPError with status/statusText', async () => {
    const axiosInstance = axios.create()
    vi.spyOn(axiosInstance, 'request').mockRejectedValue({
      response: {
        status: 401,
        statusText: 'Unauthorized',
        data: { message: 'Bad credentials' },
        config: { url: 'https://api.github.com/gists', method: 'GET' }
      }
    })
    try {
      await electermSync(axiosInstance, 'github', 'test', [], 'bad-token')
      expect.unreachable('should have thrown')
    } catch (e: any) {
      expect(e).toBeInstanceOf(HTTPError)
      expect(e.status).toBe(401)
      expect(e.statusText).toBe('Unauthorized')
      expect(e.message).toContain('Bad credentials')
    }
  })
})
