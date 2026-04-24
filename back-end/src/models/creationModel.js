import mongoose from 'mongoose'

const creationSchema = new mongoose.Schema(
	{
		ownerKey: {
			type: String,
			required: true,
			trim: true,
			index: true,
		},
		title: {
			type: String,
			required: true,
			trim: true,
			maxlength: 200,
		},
		status: {
			type: String,
			enum: ['draft', 'exported'],
			default: 'draft',
			required: true,
		},
		editorPayload: {
			type: mongoose.Schema.Types.Mixed,
			required: true,
		},
		exportAssetId: {
			type: String,
			default: null,
		},
		trackedMediaIds: {
			type: [String],
			default: [],
		},
	},
	{
		timestamps: true,
	}
)

creationSchema.index({ ownerKey: 1, updatedAt: -1 })

export const Creation = mongoose.model('Creation', creationSchema)