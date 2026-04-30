/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'

const fetchCreationsMock = vi.fn()
const deleteCreationMock = vi.fn()

vi.mock('../../src/auth/authSession.js', () => ({
  getAuthToken: () => 'test-jwt',
}))

vi.mock('../../src/services/creationsApi.js', () => ({
  fetchCreations: (...args) => fetchCreationsMock(...args),
  deleteCreation: (...args) => deleteCreationMock(...args),
}))

import MyCreationsPage from '../../src/components/MyCreationsPage.jsx'

const createDeferred = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const tick = async () => {
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const waitForText = async (container, text, tries = 20) => {
  for (let i = 0; i < tries; i += 1) {
    if (container.textContent?.includes(text)) return
    await tick()
  }
  throw new Error(`Timed out waiting for text: ${text}`)
}

const renderIntoDom = async (element) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  flushSync(() => {
    root.render(element)
  })
  await tick()

  return {
    container,
    cleanup: () => {
      root.unmount()
      container.remove()
    },
  }
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  fetchCreationsMock.mockReset()
  deleteCreationMock.mockReset()
})

describe('MyCreationsPage', () => {
  it('shows loading and then renders creations list', async () => {
    const deferred = createDeferred()
    fetchCreationsMock.mockReturnValueOnce(deferred.promise)

    const { container, cleanup } = await renderIntoDom(<MyCreationsPage refreshKey={0} />)

    expect(container.textContent).toContain('Loading…')
    expect(fetchCreationsMock).toHaveBeenCalledWith()

    deferred.resolve([
      { _id: 'c-1', title: 'First Draft', status: 'draft', editorPayload: { kind: 'image' }, updatedAt: new Date().toISOString() },
    ])
    await waitForText(container, 'First Draft')

    expect(container.textContent).toContain('First Draft')
    expect(container.textContent).toContain('Draft')
    cleanup()
  })

  it('renders error message when fetch fails', async () => {
    fetchCreationsMock.mockRejectedValueOnce(new Error('Could not load creations.'))
    const { container, cleanup } = await renderIntoDom(<MyCreationsPage refreshKey={0} />)

    await waitForText(container, 'Could not load creations.')
    cleanup()
  })

  it('opens delete dialog and cancels without deleting', async () => {
    fetchCreationsMock.mockResolvedValueOnce([
      { _id: 'c-1', title: 'Draft Keep', status: 'draft', editorPayload: { kind: 'image' }, updatedAt: new Date().toISOString() },
    ])

    const { container, cleanup } = await renderIntoDom(<MyCreationsPage refreshKey={0} />)
    await waitForText(container, 'Draft Keep')

    const deleteButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Delete')
    expect(deleteButton).toBeTruthy()
    deleteButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await tick()

    expect(container.textContent).toContain('Delete this creation?')
    const cancelButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Cancel')
    expect(cancelButton).toBeTruthy()
    cancelButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await tick()

    expect(deleteCreationMock).not.toHaveBeenCalled()
    expect(container.textContent).not.toContain('Delete this creation?')
    expect(container.textContent).toContain('Draft Keep')
    cleanup()
  })

  it('confirms delete and removes item from the list', async () => {
    fetchCreationsMock.mockResolvedValueOnce([
      { _id: 'c-1', title: 'Remove Me', status: 'draft', editorPayload: { kind: 'image' }, updatedAt: new Date().toISOString() },
    ])
    deleteCreationMock.mockResolvedValueOnce({ success: true, id: 'c-1' })

    const { container, cleanup } = await renderIntoDom(<MyCreationsPage refreshKey={0} />)
    await waitForText(container, 'Remove Me')

    const deleteButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Delete')
    expect(deleteButton).toBeTruthy()
    deleteButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await tick()

    const confirmButton = container.querySelector('.my-creations-modal .my-creations-modal-btn--danger')
    expect(confirmButton).toBeTruthy()
    confirmButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await waitForText(container, 'No saved stickers yet.')

    expect(deleteCreationMock).toHaveBeenCalledWith('c-1')
    expect(container.textContent).toContain('No saved stickers yet.')
    expect(container.textContent).not.toContain('Remove Me')
    cleanup()
  })
})
