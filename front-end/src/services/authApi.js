import { getJson, postJson } from './backendMediaClient.js'
import { clearAuthToken, clearDevGuestSession, getAuthToken, setAuthToken } from '../auth/authSession.js'

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

export const logoutSession = () => {
  clearAuthToken()
  clearDevGuestSession()
}
