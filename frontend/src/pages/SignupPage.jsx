import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import { toast } from '../components/Toaster.jsx'

const USERNAME_RE = /^[a-zA-Z0-9_]{4,20}$/

function validate(form, usernameState) {
  const errors = {}
  if (form.username && !USERNAME_RE.test(form.username)) errors.username = '영문, 숫자, _ 로 4~20자로 입력해주세요.'
  else if (usernameState === 'taken') errors.username = '이미 사용 중인 아이디예요.'
  if (form.password && form.password.length < 6) errors.password = '비밀번호는 6자 이상이에요.'
  if (form.passwordConfirm && form.password !== form.passwordConfirm) errors.passwordConfirm = '비밀번호가 일치하지 않아요.'
  if (form.nickname.length > 20) errors.nickname = '닉네임은 20자 이하로 지어주세요.'
  return errors
}

export default function SignupPage() {
  const { user, ready, signup, openLogin } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '', passwordConfirm: '', nickname: '' })
  const [usernameState, setUsernameState] = useState('idle') // idle | checking | available | taken
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

  // 아이디 입력이 멈추면 중복 확인
  useEffect(() => {
    if (!USERNAME_RE.test(form.username)) {
      setUsernameState('idle')
      return
    }
    setUsernameState('checking')
    const timer = setTimeout(async () => {
      try {
        const res = await api(`/auth/check-username?username=${encodeURIComponent(form.username)}`)
        setUsernameState(res.available ? 'available' : 'taken')
      } catch {
        setUsernameState('idle')
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [form.username])

  if (ready && user) return <Navigate to="/" replace />

  const errors = validate(form, usernameState)
  const filled = form.username && form.password && form.passwordConfirm && form.nickname.trim()
  const canSubmit = filled && Object.keys(errors).length === 0 && usernameState === 'available' && !loading

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setSubmitError('')
    try {
      await signup({ username: form.username, password: form.password, nickname: form.nickname.trim() })
      toast(`${form.nickname.trim()}님, 스토리봇에 오신 걸 환영해요!`)
      navigate('/')
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-side" aria-hidden="true">
        <div className="auth-side-inner">
          <p className="eyebrow">JOIN STORYBOT</p>
          <h1>
            나만의 동화책을
            <br />
            채워볼까요?
          </h1>
          <p>가입하면 스토리봇과 함께 이야기를 만들고, 마음에 드는 이야기에 좋아요를 남길 수 있어요.</p>
          <div className="stack-books">
            <span className="b b1" />
            <span className="b b2" />
            <span className="b b3" />
          </div>
        </div>
      </div>

      <form className="auth-card form" onSubmit={handleSubmit} noValidate>
        <h2 className="modal-title">회원가입</h2>

        <label className="field">
          <span>아이디</span>
          <input value={form.username} onChange={set('username')} autoComplete="username" placeholder="영문, 숫자, _ 4~20자" />
          {errors.username ? (
            <small className="hint error">{errors.username}</small>
          ) : usernameState === 'checking' ? (
            <small className="hint">확인하는 중…</small>
          ) : usernameState === 'available' ? (
            <small className="hint ok">사용할 수 있는 아이디예요.</small>
          ) : null}
        </label>

        <label className="field">
          <span>비밀번호</span>
          <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" placeholder="6자 이상" />
          {errors.password && <small className="hint error">{errors.password}</small>}
        </label>

        <label className="field">
          <span>비밀번호 확인</span>
          <input type="password" value={form.passwordConfirm} onChange={set('passwordConfirm')} autoComplete="new-password" />
          {errors.passwordConfirm ? (
            <small className="hint error">{errors.passwordConfirm}</small>
          ) : (
            form.passwordConfirm && <small className="hint ok">비밀번호가 일치해요.</small>
          )}
        </label>

        <label className="field">
          <span>닉네임</span>
          <input value={form.nickname} onChange={set('nickname')} placeholder="이야기에 표시될 이름" />
          {errors.nickname && <small className="hint error">{errors.nickname}</small>}
        </label>

        {submitError && <p className="form-error">{submitError}</p>}

        <button className="btn btn-primary btn-block btn-lg" disabled={!canSubmit}>
          {loading ? '가입하는 중…' : '가입하고 시작하기'}
        </button>

        <p className="modal-foot">
          이미 회원이신가요?{' '}
          <button type="button" className="link-btn" onClick={() => openLogin()}>
            로그인
          </button>
        </p>
      </form>
    </section>
  )
}
