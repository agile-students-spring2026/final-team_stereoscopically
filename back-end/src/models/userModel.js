import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
	{
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
			maxlength: 320,
		},
		passwordHash: {
			type: String,
			required: true,
		},
		displayName: {
			type: String,
			default: '',
			trim: true,
			maxlength: 100,
		},
		avatarUrl: {
			type: String,
			default: '',
			trim: true,
			maxlength: 2048,
		},
		bio: {
			type: String,
			default: '',
			trim: true,
			maxlength: 500,
		},
	},
	{
		timestamps: true,
	}
)

export const User = mongoose.model('User', userSchema)
