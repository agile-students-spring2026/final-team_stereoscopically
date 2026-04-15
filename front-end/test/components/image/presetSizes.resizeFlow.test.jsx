/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import PresetSizes from '../../../src/components/image/PresetSizes'

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

describe('PresetSizes resize flow', () => {
  it('renders Resize title, preview media, and standard actions', async () => {
    const { container, cleanup } = await renderComponentToDom(
      <PresetSizes
        imageSrc="https://example.com/image.png"
        onApply={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(container.textContent).toContain('Resize')
    expect(container.textContent).toContain('Choose a size and border color, then apply.')
    expect(container.querySelector('img[alt="Resize preview"]')).toBeTruthy()

    const labels = Array.from(container.querySelectorAll('button')).map((button) => button.textContent?.trim())
    expect(labels).toContain('Cancel')
    expect(labels).toContain('Reset')
    expect(labels).toContain('Apply')

    cleanup()
  })

  it('applies selected preset and border color', async () => {
    const onApply = vi.fn()

    const { container, cleanup } = await renderComponentToDom(
      <PresetSizes
        imageSrc="https://example.com/image.png"
        initialPreset={{ id: 'discord-emoji', width: 128, height: 128 }}
        initialLetterboxColor="transparent"
        onApply={onApply}
        onCancel={vi.fn()}
      />,
    )

    const getButtonExact = (label) => Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.trim() === label)
    const getButtonContains = (label) => Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes(label))

    const whatsappButton = getButtonContains('WhatsApp Sticker')
    expect(whatsappButton).toBeTruthy()
    whatsappButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()

    const whiteButton = getButtonExact('White')
    expect(whiteButton).toBeTruthy()
    whiteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()

    const applyButton = getButtonExact('Apply')
    expect(applyButton).toBeTruthy()
    applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onApply).toHaveBeenCalledWith({
      preset: {
        id: 'whatsapp',
        label: 'WhatsApp Sticker',
        width: 512,
        height: 512,
      },
      letterboxColor: '#ffffff',
    })

    cleanup()
  })
})
