import sharp from 'sharp'

const MIN_TEXT_SIZE_PX = 8
const MAX_TEXT_SIZE_PX = 160
const MAX_TEXT_LENGTH = 300
const DEFAULT_TEXT_COLOR = '#FFFFFF'
const DEFAULT_FONT_FAMILY = 'Arial'
const SUPPORTED_FONT_FAMILIES = new Set(['Arial', 'Helvetica', 'Georgia'])

const escapeXml = (value) =>
	String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const normalizeColor = (rawColor) => {
	if (typeof rawColor !== 'string') {
		return DEFAULT_TEXT_COLOR
	}

	const trimmed = rawColor.trim()
	if (!/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
		return DEFAULT_TEXT_COLOR
	}

	return trimmed.toUpperCase()
}

const normalizeFontFamily = (rawFontFamily) => {
	if (typeof rawFontFamily !== 'string') {
		return DEFAULT_FONT_FAMILY
	}

	const trimmed = rawFontFamily.trim()
	if (!SUPPORTED_FONT_FAMILIES.has(trimmed)) {
		return DEFAULT_FONT_FAMILY
	}

	return trimmed
}

const buildTextOverlaySvg = ({ width, height, text, x, y, fontFamily, fontSize, color }) => {
	const lines = String(text).split(/\r?\n/)
	const safeX = clamp(x, 0, 1) * width
	const safeY = clamp(y, 0, 1) * height
	const lineHeight = Math.max(1, Math.round(fontSize * 1.2))
	const yStart = safeY - ((lines.length - 1) * lineHeight) / 2

	const textNodes = lines
		.map((line, index) => {
			const lineY = yStart + index * lineHeight
			return `<text x="${safeX}" y="${lineY}" text-anchor="middle" dominant-baseline="middle">${escapeXml(line)}</text>`
		})
		.join('')

	return `
		<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
			<style>
				text {
					font-family: ${fontFamily};
					font-size: ${fontSize}px;
					fill: ${color};
				}
			</style>
			${textNodes}
		</svg>
	`
}

export const normalizeTextOverlayRequest = ({ text, x, y, fontFamily, fontSize, color }) => {
	if (typeof text !== 'string') {
		return { error: { status: 400, error: 'Invalid text payload.', code: 'INVALID_TEXT_PAYLOAD' } }
	}

	if (text.length > MAX_TEXT_LENGTH) {
		return {
			error: {
				status: 400,
				error: `Text is too long. Maximum allowed length is ${MAX_TEXT_LENGTH} characters.`,
				code: 'INVALID_TEXT_PAYLOAD',
			},
		}
	}

	const xNum = Number(x)
	const yNum = Number(y)

	if (!Number.isFinite(xNum) || !Number.isFinite(yNum) || xNum < 0 || xNum > 1 || yNum < 0 || yNum > 1) {
		return { error: { status: 400, error: 'Invalid text position.', code: 'INVALID_POSITION' } }
	}

	const requestedFontSize = fontSize == null ? 36 : Number(fontSize)
	if (!Number.isFinite(requestedFontSize) || requestedFontSize < MIN_TEXT_SIZE_PX || requestedFontSize > MAX_TEXT_SIZE_PX) {
		return {
			error: {
				status: 400,
				error: `Invalid font size. Must be between ${MIN_TEXT_SIZE_PX} and ${MAX_TEXT_SIZE_PX}.`,
				code: 'INVALID_FONT_SIZE',
			},
		}
	}

	return {
		value: {
			text,
			x: xNum,
			y: yNum,
			fontFamily: normalizeFontFamily(fontFamily),
			fontSize: Math.round(requestedFontSize),
			color: normalizeColor(color),
		},
	}
}

export const renderTextOverlayBuffer = async ({ imageBuffer, text, x, y, fontFamily, fontSize, color }) => {
	const imagePipeline = sharp(imageBuffer).rotate()
	const metadata = await imagePipeline.metadata()
	const width = metadata.width
	const height = metadata.height

	if (!width || !height) {
		throw new Error('Unable to determine image dimensions for text overlay.')
	}

	const overlaySvg = buildTextOverlaySvg({
		width,
		height,
		text,
		x,
		y,
		fontFamily,
		fontSize,
		color,
	})

	const buffer = await imagePipeline
		.composite([{ input: Buffer.from(overlaySvg) }])
		.png()
		.toBuffer()

	return {
		buffer,
		width,
		height,
	}
}
