/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'

import ImageEditor from '../../src/components/image/ImageEditor'
import FilterMain from '../../src/components/FilterMain'
import GifSpeedControls from '../../src/components/gif/GifSpeedControls'
import GifEditor from '../../src/components/gif/GifEditor'

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

describe('editor consistency contracts', () => {
  it('renders image editor tool buttons in Crop -> Resize -> Filters order', () => {
    const html = renderToStaticMarkup(
      <ImageEditor
        imageSrc="https://example.com/image.png"
        onCropApply={vi.fn()}
        onOpenFilters={vi.fn()}
        onBack={vi.fn()}
        onSize={vi.fn()}
        onExport={vi.fn()}
      />
    )

    const cropIndex = html.indexOf('>Crop<')
    const resizeIndex = html.indexOf('>Resize<')
    const filtersIndex = html.indexOf('>Filters<')

    expect(cropIndex).toBeGreaterThan(-1)
    expect(resizeIndex).toBeGreaterThan(cropIndex)
    expect(filtersIndex).toBeGreaterThan(resizeIndex)
  })

  it('shows Reset Crop in crop mode when crop history exists and calls reset handler', async () => {
    const onResetCrop = vi.fn().mockResolvedValue(undefined)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const { container, cleanup } = await renderComponentToDom(
      <ImageEditor
        imageSrc="https://example.com/image.png"
        onCropApply={vi.fn()}
        onResetCrop={onResetCrop}
        onOpenFilters={vi.fn()}
        onBack={vi.fn()}
        onSize={vi.fn()}
        onExport={vi.fn()}
        showResetCrop
      />,
    )

    const getButton = (label) => Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.trim() === label)

    const cropButton = getButton('Crop')
    expect(cropButton).toBeTruthy()

    cropButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()

    const resetCropButton = getButton('Reset Crop')
    expect(resetCropButton).toBeTruthy()

    resetCropButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()

    expect(confirmSpy).toHaveBeenCalledWith('Reset crop will remove all edits made in this session. Continue?')
    expect(onResetCrop).toHaveBeenCalledTimes(1)

    cleanup()
  })

  it('does not reset crop when reset confirmation is canceled', async () => {
    const onResetCrop = vi.fn().mockResolvedValue(undefined)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    const { container, cleanup } = await renderComponentToDom(
      <ImageEditor
        imageSrc="https://example.com/image.png"
        onCropApply={vi.fn()}
        onResetCrop={onResetCrop}
        onOpenFilters={vi.fn()}
        onBack={vi.fn()}
        onSize={vi.fn()}
        onExport={vi.fn()}
        showResetCrop
      />,
    )

    const getButton = (label) => Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.trim() === label)

    const cropButton = getButton('Crop')
    expect(cropButton).toBeTruthy()

    cropButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()

    const resetCropButton = getButton('Reset Crop')
    expect(resetCropButton).toBeTruthy()

    resetCropButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()

    expect(confirmSpy).toHaveBeenCalledWith('Reset crop will remove all edits made in this session. Continue?')
    expect(onResetCrop).not.toHaveBeenCalled()

    cleanup()
  })

  it('renders image filter hub with Text label and Cancel action', async () => {
    const onCancel = vi.fn()

    const { container, cleanup } = await renderComponentToDom(
      <FilterMain
        onPresetFilters={vi.fn()}
        onText={vi.fn()}
        onColorFilters={vi.fn()}
        onCancel={onCancel}
      />
    )

    const labels = Array.from(container.querySelectorAll('button')).map((button) => button.textContent?.trim())
    expect(labels).toContain('Text')
    expect(labels).toContain('Cancel')

    const cancelButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Cancel')
    expect(cancelButton).toBeTruthy()

    cancelButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    cleanup()
  })

  it('renders GIF speed tool with Back, Cancel, and Apply actions', async () => {
    const onBack = vi.fn()
    const onCancel = vi.fn()
    const onApplySpeed = vi.fn()

    const { container, cleanup } = await renderComponentToDom(
      <GifSpeedControls
        videoFile={null}
        selectedSpeedPlaybackRate={1}
        onSelectSpeed={vi.fn()}
        onApplySpeed={onApplySpeed}
        onBack={onBack}
        onCancel={onCancel}
      />
    )

    const getButton = (label) => Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.trim() === label)

    const backButton = getButton('Back')
    const cancelButton = getButton('Cancel')
    const applyButton = getButton('Apply')

    expect(backButton).toBeTruthy()
    expect(cancelButton).toBeTruthy()
    expect(applyButton).toBeTruthy()

    backButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    cancelButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    applyButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onApplySpeed).toHaveBeenCalledWith(1)

    cleanup()
  })

  it('uses Export GIF terminal action wording in GIF editor', () => {
    const html = renderToStaticMarkup(
      <GifEditor
        videoFile={null}
        gifSessionState={{}}
        onCancel={vi.fn()}
        onCreateGif={vi.fn()}
        onOpenTrim={vi.fn()}
        onOpenResize={vi.fn()}
        onOpenFilters={vi.fn()}
      />
    )

    expect(html.includes('Export GIF')).toBe(true)
  })
})
