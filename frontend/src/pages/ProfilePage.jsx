import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import { toast } from '../components/Toaster.jsx'
import { formatDate } from '../format.js'

function NicknameForm({ user, setUser }) {
  const [nickname, setNickname] = useState(user.nickname)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const changed = nickname.trim() && nickname.trim() !== user.nickname

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!changed) return
    setBusy(true)
    setError('')
    try {
      const data = await api('/users/me', { method: 'PATCH', body: { nickname: nickname.trim() } })
      setUser(data)
      toast('닉네임을 바꿨어요.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="profile-card form" onSubmit={handleSubmit}>
      <h3>닉네임 변경</h3>
      <label className="field">
        <span>닉네임</span>
        <input value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-primary" disabled={!changed || busy}>
        {busy ? '저장 중…' : '닉네임 저장'}
      </button>
    </form>
  )
}

function PasswordForm() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const tooShort = form.next && form.next.length < 6
  const mismatch = form.confirm && form.next !== form.confirm
  const canSubmit = form.current && form.next && form.confirm && !tooShort && !mismatch && !busy

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      await api('/users/me', { method: 'PATCH', body: { current_password: form.current, new_password: form.next } })
      setForm({ current: '', next: '', confirm: '' })
      toast('비밀번호를 바꿨어요.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="profile-card form" onSubmit={handleSubmit}>
      <h3>비밀번호 변경</h3>
      <label className="field">
        <span>현재 비밀번호</span>
        <input type="password" value={form.current} onChange={set('current')} autoComplete="current-password" />
      </label>
      <label className="field">
        <span>새 비밀번호</span>
        <input type="password" value={form.next} onChange={set('next')} autoComplete="new-password" placeholder="6자 이상" />
        {tooShort && <small className="hint error">비밀번호는 6자 이상이에요.</small>}
      </label>
      <label className="field">
        <span>새 비밀번호 확인</span>
        <input type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
        {mismatch && <small className="hint error">비밀번호가 일치하지 않아요.</small>}
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-primary" disabled={!canSubmit}>
        {busy ? '저장 중…' : '비밀번호 저장'}
      </button>
    </form>
  )
}

export default function ProfilePage() {
  const { user, setUser, ready, openLogin } = useAuth()

  useEffect(() => {
    if (ready && !user) openLogin('회원정보수정은 로그인 후 이용할 수 있어요.')
  }, [ready, user, openLogin])

  if (!ready) return null

  if (!user) {
    return (
      <section className="profile-page">
        <div className="empty">
          <p>로그인이 필요한 페이지예요.</p>
          <button className="btn btn-primary" onClick={() => openLogin()}>
            로그인하기
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="profile-page">
      <div className="profile-head">
        <div className="avatar" aria-hidden="true">
          {user.nickname.slice(0, 1)}
        </div>
        <div>
          <p className="eyebrow">MY ACCOUNT</p>
          <h1>{user.nickname}</h1>
          <p className="profile-sub">
            아이디 <b>{user.username}</b> · 가입일 {formatDate(user.created_at)}
          </p>
        </div>
      </div>

      <div className="profile-grid">
        <NicknameForm key={user.nickname} user={user} setUser={setUser} />
        <PasswordForm />
      </div>
    </section>
  )
}
