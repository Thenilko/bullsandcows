import { useUnlocks } from '../pasture/unlockStore'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { buildResult } from '../../screens/result/resultModel'
import { fallbackDistribution, wonGame } from '../../test/fixtures'
import { useBadgeToasts } from '../badges/toastStore'
import { shareLabels } from './shareLabels'
import { shareFromResult } from './shareModel'
import { NOTICE_MS, useShare } from './useShare'

const postShare = vi.fn()
vi.mock('./api', () => ({ postShare: (body: unknown) => postShare(body), postShareLanding: vi.fn() }))
const renderSharePng = vi.fn()
vi.mock('./sharePng', () => ({ renderSharePng: () => renderSharePng() }))

const model = shareFromResult(buildResult(wonGame, fallbackDistribution))
const labels = shareLabels(model, i18n.getFixedT('bg'), 'bg')
const PNG = new Blob(['png'], { type: 'image/png' })

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { ...renderHook(() => useShare(model, labels), { wrapper }), invalidate }
}

function setNavigator(key: 'share' | 'canShare' | 'clipboard', value: unknown) {
  Object.defineProperty(navigator, key, { value, configurable: true })
}

beforeEach(() => {
  postShare.mockReset().mockResolvedValue({ counted: true, newBadges: [{ key: 'teller', tier: 1 }], newUnlocks: ['dog'] })
  renderSharePng.mockReset().mockResolvedValue(PNG)
  useBadgeToasts.getState().clear()
  useUnlocks.getState().clear()
  setNavigator('share', undefined)
  setNavigator('canShare', undefined)
  setNavigator('clipboard', { writeText: vi.fn(async () => undefined) })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:png')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('useShare', () => {
  it('copies the text, reports the copy channel and queues the new badge', async () => {
    const { result, invalidate } = setup()
    await act(() => result.current.copy())
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(model.text)
    expect(result.current.notice?.kind).toBe('copied')
    expect(postShare).toHaveBeenCalledWith({ gameId: 'g1', channel: 'copy' })
    await waitFor(() => expect(useBadgeToasts.getState().queue).toEqual([{ key: 'teller', tier: 1 }]))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['badges'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['pasture'] })
    expect(useUnlocks.getState().queue).toEqual(['dog'])
  })

  it('shows „failed“ when the clipboard is unavailable and reports nothing', async () => {
    setNavigator('clipboard', { writeText: vi.fn(async () => Promise.reject(new Error('denied'))) })
    const { result } = setup()
    await act(() => result.current.copy())
    expect(result.current.notice?.kind).toBe('failed')
    expect(postShare).not.toHaveBeenCalled()
  })

  it('falls back to the clipboard without navigator.share', async () => {
    const { result } = setup()
    await act(() => result.current.share())
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(model.text)
    expect(postShare).toHaveBeenCalledWith({ gameId: 'g1', channel: 'copy' })
  })

  it('shares the picture with the text when files can be shared', async () => {
    const share = vi.fn<(data: { files?: File[]; text: string }) => Promise<void>>(async () => undefined)
    setNavigator('share', share)
    setNavigator('canShare', () => true)
    const { result } = setup()
    await act(() => result.current.share())
    const data = share.mock.calls[0]?.[0]
    expect(data?.text).toBe(model.text)
    expect(data?.files?.[0]?.name).toBe('bikove-i-kravi-127.png')
    expect(postShare).toHaveBeenCalledWith({ gameId: 'g1', channel: 'native' })
  })

  it('shares only the text when files are not supported, and stays quiet on abort', async () => {
    const share = vi.fn(async () => {
      throw new DOMException('cancelled', 'AbortError')
    })
    setNavigator('share', share)
    const { result } = setup()
    await act(() => result.current.share())
    expect(share).toHaveBeenCalledWith({ text: model.text })
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
    expect(postShare).not.toHaveBeenCalled()
    expect(result.current.notice).toBeNull()
  })

  it('downloads the picture under the file name and reports the image channel', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const { result } = setup()
    await act(() => result.current.save())
    expect(renderSharePng).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(result.current.notice?.kind).toBe('saved')
    expect(postShare).toHaveBeenCalledWith({ gameId: 'g1', channel: 'image' })
    // The second action reuses the rendered picture.
    await act(() => result.current.save())
    expect(renderSharePng).toHaveBeenCalledTimes(1)
  })

  it('clears the notice after a moment', async () => {
    vi.useFakeTimers()
    const { result } = setup()
    await act(() => result.current.copy())
    expect(result.current.notice).not.toBeNull()
    act(() => vi.advanceTimersByTime(NOTICE_MS))
    expect(result.current.notice).toBeNull()
  })
})
