import mongoose from 'mongoose'

const creationSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			default: null,
		},
		/** Stable browser id for drafts when not signed in. Omitted once bound to userId. */
		ownerKey: {
			type: String,
			trim: true,
		},
		title: {
			type: String,
			required: true,
			trim: true,
			maxlength: 200,
		},
		status: {
			type: String,
			enum: ['draft', 'exported', 'published'],
			default: 'draft',
			required: true,
		},
		likedBy: {
			type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
			default: [],
		},
		publishedAt: {
			type: Date,
			default: null,
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

creationSchema.index({ userId: 1, updatedAt: -1 })
creationSchema.index({ ownerKey: 1, updatedAt: -1 })
creationSchema.index({ status: 1, publishedAt: -1 })
creationSchema.index({ userId: 1, status: 1, publishedAt: -1 })

export const Creation = mongoose.model('Creation', creationSchema)