import { deleteJson, getJson, postJson } from './backendMediaClient.js'

export const searchUsers = async (query) =>
	getJson({
		path: `/api/users/search?q=${encodeURIComponent(query)}`,
		fallbackErrorMessage: 'Search failed',
	})

export const followUser = async (userId) =>
	postJson({
		path: `/api/users/${userId}/follow`,
		payload: {},
		fallbackErrorMessage: 'Could not follow user',
	})

export const unfollowUser = async (userId) =>
	deleteJson({
		path: `/api/users/${userId}/follow`,
		fallbackErrorMessage: 'Could not unfollow user',
	})

export const fetchFollowing = async () =>
	getJson({
		path: '/api/me/following',
		fallbackErrorMessage: 'Could not fetch following list',
	})

export const fetchPublicUserProfile = async (username) =>
	getJson({
		path: `/api/users/${encodeURIComponent(username)}`,
		fallbackErrorMessage: 'Could not fetch profile',
	})

export const fetchHomeFeed = async () =>
	getJson({
		path: '/api/me/feed',
		fallbackErrorMessage: 'Could not fetch feed',
	})

export const fetchUserPublishedCreations = async (username) =>
	getJson({
		path: `/api/users/${encodeURIComponent(username)}/creations`,
		fallbackErrorMessage: 'Could not fetch user creations',
	})

