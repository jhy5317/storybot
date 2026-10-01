import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import Modal from './Modal.jsx'
import { toast } from './Toaster.jsx'

export default function LoginModal() {
  const { loginOpen, loginNotice, closeLogin, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (loginOpen) {
      setPassword('')
      setError('')
    }
  }, [loginOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) {
      setError('아이디와 비밀번호를 입력해주세요.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await login(username, password)
      closeLogin()
      toast('반가워요! 오늘은 어떤 이야기를 만들어볼까요?')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={loginOpen} onClose={closeLogin} className="login-modal" label="로그인">
      <div className="login-deco" aria-hidden="true">
        <span className="moon" />
        <span className="star s1" />
        <span className="star s2" />
        <span className="star s3" />
      </div>
      <h2 className="modal-title">다시 만나서 반가워요</h2>
      <p className="modal-sub">로그인하고 나만의 동화를 만들어보세요.</p>
      {loginNotice && <p className="notice">{loginNotice}</p>}

      <form onSubmit={handleSubmit} className="form">
        <label className="field">
          <span>아이디</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
        </label>
        <label className="field">
          <span>비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? '확인하는 중…' : '로그인'}
        </button>
      </form>

      <p className="modal-foot">
        아직 회원이 아니신가요?{' '}
        <Link to="/signup" onClick={closeLogin}>
          회원가입
        </Link>
      </p>
    </Modal>
  )
}
