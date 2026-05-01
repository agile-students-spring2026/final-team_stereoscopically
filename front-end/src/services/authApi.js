import { getJson, patchJson, postJson } from './backendMediaClient.js'
import { clearAuthToken, getAuthToken, setAuthToken } from '../auth/authSession.js'

const pickToken = (body) =>
  (body && typeof body === 'object' && (body.token || body.accessToken)) || ''

export const register = async ({ email, password }) => {
  const body = await postJson({
    path: '/api/auth/register',
    payload: { email, password },
    skipAuth: true,
    fallbackErrorMessage: 'Registration failed',
  })
  const token = pickToken(body)
  if (!token) throw new Error('Invalid server response')
  setAuthToken(token)
  return fetchCurrentUser()
}

export const login = async ({ email, password }) => {
  const body = await postJson({
    path: '/api/auth/login',
    payload: { email, password },
    skipAuth: true,
    fallbackErrorMessage: 'Sign in failed',
  })
  const token = pickToken(body)
  if (!token) throw new Error('Invalid server response')
  setAuthToken(token)
  return fetchCurrentUser()
}

export const fetchCurrentUser = async () => {
  if (!getAuthToken()) return null
  return getJson({ path: '/api/me', fallbackErrorMessage: 'Could not load account' })
}

export const updateProfile = async (payload) =>
  patchJson({ path: '/api/me', payload, fallbackErrorMessage: 'Could not update profile' })

export const changeEmail = async ({ email }) => {
  const body = await patchJson({
    path: '/api/me/email',
    payload: { email },
    fallbackErrorMessage: 'Could not change email',
  })
  const token = pickToken(body)
  if (!token) throw new Error('Invalid server response')
  setAuthToken(token)
  return fetchCurrentUser()
}

export const changePassword = async ({ currentPassword, newPassword }) =>
  patchJson({
    path: '/api/me/password',
    payload: { currentPassword, newPassword },
    fallbackErrorMessage: 'Could not change password',
  })

export const verifyCurrentPassword = async ({ currentPassword }) =>
  postJson({
    path: '/api/me/password/verify',
    payload: { currentPassword },
    fallbackErrorMessage: 'Current password is incorrect',
    suppressUnauthorizedRedirect: true,
  })

export const logoutSession = () => {
  clearAuthToken()
}
