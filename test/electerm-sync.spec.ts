import { expect, test, describe } from 'vitest'
import axios from 'axios'
import { electermSync } from '../src/electerm-sync'

describe('electermSync', () => {
  const axiosInstance = axios.create()

  const githubToken = process.env.GITHUB_TOKEN || ''
  const giteeToken = process.env.GITEE_TOKEN || ''

  const customSyncToken = `${process.env.CUSTOM_SYNC_SERVER_SECRET}####${process.env.CUSTOM_SYNC_SERVER_USERNAME}####${process.env.CUSTOM_SYNC_SERVER_URL}`
  const cloudSyncToken = `${process.env.ELECTERM_CLOUD_SECRET}####${process.env.ELECTERM_CLOUD_URL}`

  const gistData = {
    description: 'sync electerm data test',
    files: { 'placeholder.js': { content: 'console.log("test")' } },
    public: false
  }

  let githubGistId = ''
  let giteeGistId = ''

  // =============== GITHUB ===============
  describe('GitHub Sync', () => {
    test('test', async () => {
      const res = await electermSync(axiosInstance, 'github', 'test', [], githubToken)
      expect(Array.isArray(res)).toBe(true)
    })

    test('create', async () => {
      const res = await electermSync(axiosInstance, 'github', 'create', [gistData], githubToken)
      expect(res.id).toBeDefined()
      githubGistId = res.id
    })

    test('update', async () => {
      expect(githubGistId).toBeTruthy()
      const updateData = {
        description: 'sync electerm data test updated',
        files: { 'placeholder.js': { content: 'console.log("test updated")' } }
      }
      const res = await electermSync(axiosInstance, 'github', 'update', [githubGistId, updateData], githubToken)
      expect(res.description).toBe('sync electerm data test updated')
    })

    test('getOne', async () => {
      expect(githubGistId).toBeTruthy()
      const res = await electermSync(axiosInstance, 'github', 'getOne', [githubGistId], githubToken)
      expect(res.id).toBe(githubGistId)
    })
  })

  // =============== GITEE ===============
  describe('Gitee Sync', () => {
    test('test', async () => {
      // Gitee might return array of gists or throws if invalid
      const res = await electermSync(axiosInstance, 'gitee', 'test', [], giteeToken)
      expect(Array.isArray(res)).toBe(true)
    })

    test('create', async () => {
      const res = await electermSync(axiosInstance, 'gitee', 'create', [gistData], giteeToken)
      expect(res.id).toBeDefined()
      giteeGistId = res.id
    })

    test('update', async () => {
      expect(giteeGistId).toBeTruthy()
      const updateData = {
        description: 'sync electerm data test updated',
        files: { 'placeholder.js': { content: 'console.log("test updated")' } }
      }
      const res = await electermSync(axiosInstance, 'gitee', 'update', [giteeGistId, updateData], giteeToken)
      expect(res.description).toBe('sync electerm data test updated')
    })

    test('getOne', async () => {
      expect(giteeGistId).toBeTruthy()
      const res = await electermSync(axiosInstance, 'gitee', 'getOne', [giteeGistId], giteeToken)
      expect(res.id).toBe(giteeGistId)
    })
  })

  // =============== CUSTOM ===============
  describe('Custom Sync', () => {
    test('test', async () => {
      const res = await electermSync(axiosInstance, 'custom', 'test', [], customSyncToken)
      expect(res).toBeDefined()
    })

    test('update', async () => {
      const userId = process.env.CUSTOM_SYNC_SERVER_URL || 'username1'
      const updateData = {
        raw: 'somedata'
      }
      const res = await electermSync(axiosInstance, 'custom', 'update', [userId, updateData], customSyncToken)
      expect(res).toBeDefined()
    })

    test('getOne', async () => {
      const userId = process.env.CUSTOM_SYNC_SERVER_URL || 'username1'
      const res = await electermSync(axiosInstance, 'custom', 'getOne', [userId], customSyncToken)
      expect(res).toBeDefined()
    })
  })

  // =============== CLOUD ===============
  describe('Cloud Sync', () => {
    test('test', async () => {
      const res = await electermSync(axiosInstance, 'cloud', 'test', [''], cloudSyncToken)
      expect(res).toBeDefined()
    }, 10000)

    test('update', async () => {
      const updateData = {
        raw: 'somedata_cloud'
      }
      const res = await electermSync(axiosInstance, 'cloud', 'update', ['', updateData], cloudSyncToken)
      expect(res).toBeDefined()
    }, 10000)

    test('getOne', async () => {
      const res = await electermSync(axiosInstance, 'cloud', 'getOne', [''], cloudSyncToken)
      expect(res).toBeDefined()
    }, 10000)
  })
})
