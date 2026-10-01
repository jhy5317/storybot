const TOKEN_KEY = 'storybot_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

let onUnauthorized = () => {}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function errorMessage(body) {
  const detail = body?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return '입력값을 다시 확인해주세요.'
  return '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.'
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = tokenStore.get()
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없어요.')
  }

  if (res.status === 204) return null
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    // 토큰을 보냈는데 401이면 만료·무효 토큰 → 로그아웃 처리
    if (res.status === 401 && token) onUnauthorized()
    throw new ApiError(res.status, errorMessage(data))
  }

  return data
}
