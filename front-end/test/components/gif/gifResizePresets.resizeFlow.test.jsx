/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import GifResizePresets from '../../../src/components/gif/GifResizePresets'

vi.mock('../../../src/hooks/useVideoPreviewUrl', () => ({
  default: () => 'blob:https://example.com/mock-video-url',
}))

const renderComponentToDom = async (element) => {
  const container = document.createElement('div')
  document.body.appendChild(container)

  const root = createRoot(container)
  flushSync(() => {
    root.render(element)
  })
  await Promise.resolve()

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
})

describe('GifResizePresets resize flow', () => {
  it('renders transparent border option and standard actions', async () => {
    const { container, cleanup } = await renderComponentToDom(
      <GifResizePresets
        initialPreset="square"
        initialBorderColor="#000000"
        videoFile={null}
        onApply={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(container.textContent).toContain('Resize')
    expect(container.textContent).toContain('Border color')

    const labels = Array.from(container.querySelectorAll('button')).map((button) => button.textContent?.trim())
    expect(labels).toContain('Transparent')
    expect(labels).toContain('Cancel')
    expect(labels).toContain('Reset')
    expect(labels).toContain('Apply')

    cleanup()
  })

  it('applies selected transparent border option', async () => {
    const onApply = vi.fn()

    const { container, cleanup } = await renderComponentToDom(
      <GifResizePresets
        initialPreset="landscape"
        initialBorderColor="#000000"
        videoFile={null}
        onApply={onApply}
        onCancel={vi.fn()}
      />,
    )

    const getButtonExact = (label) => Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.trim() === label)

    const portraitButton = getButtonExact('Portrait (9:16)')
    expect(portraitButton).toBeTruthy()
    portraitButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()

    const transparentButton = getButtonExact('Transparent')
    expect(transparentButton).toBeTruthy()
    transparentButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()

    const applyButton = getButtonExact('Apply')
    expect(applyButton).toBeTruthy()
    applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onApply).toHaveBeenCalledWith({
      preset: 'portrait',
      borderColor: 'transparent',
    })

    cleanup()
  })
})
