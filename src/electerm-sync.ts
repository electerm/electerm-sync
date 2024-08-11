// based on tyler's work: https://github.com/tylerlong/ringcentral-js-concise
import axios, { type AxiosInstance } from 'axios'
import { sign, type Algorithm } from 'jsonwebtoken'
import { type Config } from './types'

const version: string = process.env.version || ''

export class HTTPError extends Error {
  status: number
  statusText: string
  data: Object
  config: Config
  constructor (status: number, statusText: string, data: Object, config: Config) {
    super(`status: ${status}
statusText: ${statusText}
data: ${JSON.stringify(data, null, 2)}
config: ${JSON.stringify(config, null, 2)}`)
    this.status = status
    this.statusText = statusText
    this.data = data
    this.config = config
  }
}

class ElectermSync {
  algorithm: Algorithm
  token: string
  server: string
  userId: string
  _axios: AxiosInstance
  userAgentHeader: string

  constructor (
    str: string,
    userAgentHeader = `electerm-sync/v${version}`
  ) {
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
    this.userAgentHeader = userAgentHeader
    this._axios = axios.create()
    const request = this._axios.request.bind(this._axios)
    this._axios.request = async (config) => {
      try {
        return await request(config)
      } catch (e: any) {
        if (e.response) {
          throw new HTTPError(e.response.status, e.response.statusText, e.response.data, e.response.config)
        } else {
          throw e
        }
      }
    }
  }

  async request (config: Config): Promise<any> {
    return await this._axios.request({
      ...config,
      headers: this._patchHeaders(config.headers)
    })
  }

  async create (data: Object, conf: Config): Promise<any> {
    return await this.request({
      url: this.server,
      method: 'PUT',
      data,
      ...conf
    })
  }

  async update (userId: string, data: Object, conf: Config) {
    this.userId = userId
    return await this.request({
      url: this.server,
      method: 'PUT',
      data,
      ...conf
    })
  }

  async getOne (userId: string, conf: Config): Promise<any> {
    this.userId = userId
    return await this.request({
      url: this.server,
      method: 'GET',
      ...conf
    })
  }

  async test (conf: Config): Promise<any> {
    return await this.request({
      url: this.server,
      method: 'POST',
      ...conf
    })
  }

  _patchHeaders (headers: Config = {}) {
    return {
      'Content-Type': 'application/json',
      ...this._authHeader(),
      'X-User-Agent': this.userAgentHeader,
      ...headers
    }
  }

  _authHeader () {
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

export default ElectermSync
