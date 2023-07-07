import ElectermSync from '../src/electerm-sync'
import { readFileSync } from 'fs'

describe('ElectermSync', () => {
  const tk = readFileSync(
    process.cwd() + '/electerm-sync-server-node/.env'
  ).toString()
  const arr = tk.split('\n')
  let sec = arr.find(p => p.startsWith('JWT_SECRET')) || ''
  sec = sec.slice(11)
  let uid = arr.find(p => p.startsWith('JWT_USERS')) || ''
  uid = uid.slice(10).split(',')[0]
  const token = [
    sec,
    'http://127.0.0.1:7837/api/sync',
    uid
  ].join('####')
  const electermSync = new ElectermSync(token)
  const dataSample = { someKey: 'someValue' }
  const dataUpdate = { someKey: 'newValue' }
  describe('create', () => {
    it('should create data', async () => {
      const response = await electermSync.create(dataSample, {})

      expect(response.status).toBe(200)
      // Add more expect() statements to check response data
    })
  })

  describe('getOne', () => {
    it('get user data 1', async () => {
      const response = await electermSync.getOne(uid, {})

      expect(response.status).toBe(200)
      expect(response.data.someKey).toBe(dataSample.someKey)
      // Add more expect() statements to check response data
    })
  })

  describe('update', () => {
    it('should update data for a user', async () => {
      const response = await electermSync.update(uid, dataUpdate, {})

      expect(response.status).toBe(200)
      // Add more expect() statements to check response data
    })
  })

  describe('getOne1', () => {
    it('get user data 2', async () => {
      const response = await electermSync.getOne(uid, {})

      expect(response.status).toBe(200)
      expect(response.data.someKey).toBe(dataUpdate.someKey)
      // Add more expect() statements to check response data
    })
  })

  describe('test api', () => {
    it('test api should work', async () => {
      const response = await electermSync.test({})

      expect(response.status).toBe(200)
      expect(response.data).toBe('test ok')
      // Add more expect() statements to check response data
    })
  })

  // Add more test cases for the rest of the methods
})
