import { type AxiosInstance } from 'axios'
import { sign, type Algorithm } from 'jsonwebtoken'
import { type Config } from './types'

/**
 * Axios config may contain non-serializable objects such as
 * httpsAgent (SocksProxyAgent / HttpsProxyAgent) which have circular
 * references.  Instead of maintaining a fragile blacklist of known
 * problematic keys, we use a strict whitelist approach:
 *   - Keep primitive values (string / number / boolean) as-is.
 *   - Keep only the two core object keys — `headers` and `data` —
 *     round-tripped through JSON to strip any hidden non-serializable
 *     members.  If even those fail, skip the value entirely.
 *   - All other object / function / symbol values are ignored.
 * This guarantees the result is always JSON-serializable regardless
 * of what axios puts into the config.
 *
 * Header values matching SENSITIVE_HEADERS (case-insensitively) are
 * redacted: HTTPError instances end up in UI dialogs and logs, and the
 * Authorization header carries the user's cloud JWT / GitHub token.
 */
const CORE_OBJECT_KEYS = ['headers', 'data']
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'proxy-authorization', 'x-auth-token', 'x-api-key']
const REDACTED = '[redacted]'

function redactHeaders (headers: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const key of Object.keys(headers)) {
    out[key] = SENSITIVE_HEADERS.includes(key.toLowerCase()) ? REDACTED : headers[key]
  }
  return out
}

function sanitizeConfig (config: any): Config {
  if (config === null || config === undefined || typeof config !== 'object') {
    return config
  }
  const safe: Record<string, any> = {}
  for (const key of Object.keys(config)) {
    const value = config[key]
    const type = typeof value
    if (type === 'string' || type === 'number' || type === 'boolean') {
      safe[key] = value
    } else if (CORE_OBJECT_KEYS.includes(key) && value !== null && type === 'object') {
      try {
        const cloned = JSON.parse(JSON.stringify(value))
        safe[key] = key === 'headers' ? redactHeaders(cloned) : cloned
      } catch {
        // Even a core object key may contain circular refs — skip it.
      }
    }
    // Skip all other object / function / symbol / undefined values.
  }
  return safe as Config
}

/**
 * Server error bodies arrive in several shapes: { error: { message } },
 * { message }, or plain text. Pull out the human-readable part and cap its
 * length — a failed sync upload carries the whole 200KB+ request body as
 * `data`, which would otherwise flood the error dialog.
 */
const MAX_SERVER_MESSAGE = 300

function serverMessage (data: any): string {
  if (data === null || data === undefined) {
    return ''
  }
  let msg = ''
  if (typeof data === 'string') {
    msg = data
  } else if (typeof data === 'object') {
    const err = (data as any).error
    if (err !== null && err !== undefined && typeof err === 'object' && typeof err.message === 'string') {
      msg = err.message
    } else if (typeof (data as any).message === 'string') {
      msg = (data as any).message
    } else if (Object.keys(data as object).length > 0) {
      try {
        msg = JSON.stringify(data)
      } catch {
        msg = ''
      }
    }
  } else {
    msg = String(data)
  }
  msg = msg.trim()
  if (msg.length > MAX_SERVER_MESSAGE) {
    msg = msg.slice(0, MAX_SERVER_MESSAGE) + `... (${msg.length} chars)`
  }
  return msg
}

export class HTTPError extends Error {
  status: number
  statusText: string
  data: Object
  config: Config
  constructor (status: number, statusText: string, data: Object, config: Config) {
    // Keep the message short and credential-free: status, statusText and the
    // server's own message only. The request config (with its Authorization
    // header and full payload) stays available on `.config`, redacted.
    const detail = serverMessage(data)
    super(`status: ${status}\nstatusText: ${statusText}${detail === '' ? '' : `\ndata: ${detail}`}`)
    this.status = status
    this.statusText = statusText
    this.data = data
    this.config = sanitizeConfig(config)
  }
}

class ElectermSyncCore {
  algorithm: Algorithm
  token: string
  server: string
  userId: string
  _axios: AxiosInstance
  userAgentHeader: string
  type: string

  constructor (
    str: string,
    axiosInstance: AxiosInstance,
    type: string,
    userAgentHeader = 'electerm-sync/v2.0.0'
  ) {
    if (type === 'github') {
      this.token = str
      this.server = 'https://api.github.com'
      this.userId = ''
      this.algorithm = 'HS256'
    } else if (type === 'gitee') {
      this.token = str
      this.server = 'https://gitee.com/api/v5'
      this.userId = ''
      this.algorithm = 'HS256'
    } else {
      const [
        token,
        server,
        userId = '',
        algorithm = 'HS256'
      ] = str.split('####')
      this.token = token
      this.server = server
      this.userId = userId
      this.algorithm = algorithm as Algorithm
    }
    this.type = type
    this.userAgentHeader = userAgentHeader
    this._axios = axiosInstance

    // We do not monkey-patch _axios.request here to avoid mutating the user-provided instance permanently.
    // Instead, we handle errors in our local `request` wrapper.
  }

  async request (config: Config): Promise<any> {
    try {
      const res = await this._axios.request({
        ...config,
        headers: this._patchHeaders(config.headers)
      })
      return res.data
    } catch (e: any) {
      if (e.response !== undefined && e.response !== null) {
        throw new HTTPError(e.response.status, e.response.statusText, e.response.data, e.response.config)
      }
      // Sanitize non-serializable properties (e.g. httpsAgent) before re-throwing
      // so downstream JSON.stringify does not fail on circular references.
      if (e.config !== undefined && e.config !== null) {
        e.config = sanitizeConfig(e.config)
      }
      throw e
    }
  }

  async run (func: string, args: any[]): Promise<any> {
    if (this.type === 'github') {
      return await this._runGithub(func, args)
    } else if (this.type === 'gitee') {
      return await this._runGitee(func, args)
    } else {
      return await this._runCustomOrCloud(func, args)
    }
  }

  async _runGithub (func: string, args: any[]): Promise<any> {
    if (func === 'test') {
      return await this.request({
        url: `${this.server}/gists?per_page=1`,
        method: 'GET'
      })
    } else if (func === 'create') {
      const gistsData = args[0]
      return await this.request({
        url: `${this.server}/gists`,
        method: 'POST',
        data: gistsData
      })
    } else if (func === 'update') {
      const gistId = args[0]
      const gistsData = args[1]
      return await this.request({
        url: `${this.server}/gists/${gistId as string}`,
        method: 'PATCH',
        data: gistsData
      })
    } else if (func === 'getOne') {
      const gistId = args[0]
      return await this.request({
        url: `${this.server}/gists/${gistId as string}`,
        method: 'GET'
      })
    }
    throw new Error(`Unsupported func: ${func}`)
  }

  async _runGitee (func: string, args: any[]): Promise<any> {
    // Gitee uses ?access_token= for simplicity or Authorization header. We will use Authorization header as standard.
    if (func === 'test') {
      return await this.request({
        url: `${this.server}/gists?per_page=1`,
        method: 'GET'
      })
    } else if (func === 'create') {
      const gistsData = args[0]
      return await this.request({
        url: `${this.server}/gists`,
        method: 'POST',
        data: gistsData
      })
    } else if (func === 'update') {
      const gistId = args[0]
      const gistsData = args[1]
      return await this.request({
        url: `${this.server}/gists/${gistId as string}`,
        method: 'PATCH',
        data: gistsData
      })
    } else if (func === 'getOne') {
      const gistId = args[0]
      return await this.request({
        url: `${this.server}/gists/${gistId as string}`,
        method: 'GET'
      })
    }
    throw new Error(`Unsupported func: ${func}`)
  }

  async _runCustomOrCloud (func: string, args: any[]): Promise<any> {
    if (func === 'test') {
      if (args.length > 0) {
        this.userId = args[0]
      }
      return await this.request({
        url: this.server,
        method: 'POST'
      })
    } else if (func === 'create') {
      const data = args[0]
      return await this.request({
        url: this.server,
        method: 'PUT',
        data
      })
    } else if (func === 'update') {
      if (args.length > 1) {
        this.userId = args[0]
      }
      const data = args.length > 1 ? args[1] : args[0]
      return await this.request({
        url: this.server,
        method: 'PUT',
        data
      })
    } else if (func === 'getOne') {
      if (args.length > 0) {
        this.userId = args[0]
      }
      return await this.request({
        url: this.server,
        method: 'GET'
      })
    }
    throw new Error(`Unsupported func: ${func}`)
  }

  _patchHeaders (headers: any = {}): any {
    const auth = this._authHeader()
    return {
      'Content-Type': 'application/json',
      ...auth,
      'X-User-Agent': this.userAgentHeader,
      ...headers
    }
  }

  _authHeader (): Record<string, string> {
    if (this.type === 'github' || this.type === 'gitee') {
      return {
        Authorization: `token ${this.token}`
      }
    }
    const tk = this.userId !== ''
      ? sign({
        id: this.userId,
        exp: Date.now() + 1000000
      }, this.token, { algorithm: this.algorithm })
      : this.token

    return {
      Authorization: `Bearer ${tk}`
    }
  }
}

export async function electermSync (
  axiosInstance: AxiosInstance,
  type: string,
  func: string,
  args: any[],
  token: string
): Promise<any> {
  const syncCore = new ElectermSyncCore(token, axiosInstance, type)
  return await syncCore.run(func, args)
}
