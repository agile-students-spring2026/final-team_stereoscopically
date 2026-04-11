import sharp from 'sharp'

const IDENTITY = [
	[1, 0, 0],
	[0, 1, 0],
	[0, 0, 1],
]
const SEPIA_CORE = [
	[0.393, 0.769, 0.189],
	[0.349, 0.686, 0.168],
	[0.272, 0.534, 0.131],
]

const blendSepiaMatrix = (strength) => {
	const s = Math.min(1, Math.max(0, strength))
	return SEPIA_CORE.map((row, i) =>
		row.map((cell, j) => (1 - s) * IDENTITY[i][j] + s * cell),
	)
}

/**
 * Applies one-shot color adjustments (absolute parameters; no cumulative stacking).
 * @param {Buffer} buffer
 * @param {object} opts
 */
export const applyImageAdjustments = async (buffer, opts) => {
	const {
		brightness = 1,
		contrast = 1,
		saturation = 1,
		hue = 0,
		grayscale = 0,
		sepia = 0,
		sharpness = 1,
	} = opts

	let pipeline = sharp(buffer).rotate().ensureAlpha()

	if (sepia > 0) {
		pipeline = pipeline.recomb(blendSepiaMatrix(sepia))
	}

	if (grayscale >= 1) {
		pipeline = pipeline.grayscale()
	}

	pipeline = pipeline.modulate({
		brightness,
		saturation,
		hue: Number.isFinite(hue) ? hue : 0,
	})

	if (Number.isFinite(contrast) && contrast !== 1) {
		const c = Math.min(4, Math.max(0.25, contrast))
		pipeline = pipeline.linear(c, 128 * (1 - c))
	}

	if (Number.isFinite(sharpness) && sharpness > 1) {
		const sigma = Math.min(3, (sharpness - 1) * 2 + 0.3)
		pipeline = pipeline.sharpen({ sigma })
	}

	return pipeline.png().toBuffer()
}

export const PRESET_ADJUSTMENTS = {
	noir: {
		grayscale: 1,
		contrast: 1.4,
		brightness: 0.95,
		saturation: 0,
	},
	sepia: {
		sepia: 0.9,
		contrast: 1.1,
		brightness: 1.05,
		saturation: 0.9,
	},
	vivid: {
		saturation: 1.4,
		contrast: 1.2,
		brightness: 1.1,
		sharpness: 1.1,
	},
	fade: {
		contrast: 0.8,
		brightness: 1.1,
		saturation: 0.8,
	},
}
