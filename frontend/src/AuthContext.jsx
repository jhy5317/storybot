import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, setUnauthorizedHandler, tokenStore } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginNotice, setLoginNotice] = useState('')

  const openLogin = useCallback((notice = '') => {
    setLoginNotice(notice)
    setLoginOpen(true)
  }, [])

  const closeLogin = useCallback(() => setLoginOpen(false), [])

  const applyToken = useCallback((data) => {
    tokenStore.set(data.access_token)
    setUser(data.user)
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear()
      setUser(null)
      openLogin('로그인이 만료되었어요. 다시 로그인해주세요.')
    })

    // 새로고침·재방문 시 저장된 토큰으로 로그인 상태 복원
    if (!tokenStore.get()) {
      setReady(true)
      return
    }
    api('/users/me')
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setReady(true))
  }, [openLogin])

  const login = useCallback(
    async (username, password) => {
      const data = await api('/auth/login', { method: 'POST', body: { username, password } })
      applyToken(data)
    },
    [applyToken],
  )

  const signup = useCallback(
    async (form) => {
      const data = await api('/auth/signup', { method: 'POST', body: form })
      applyToken(data)
    },
    [applyToken],
  )

  const value = { user, setUser, ready, login, signup, logout, loginOpen, loginNotice, openLogin, closeLogin }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
