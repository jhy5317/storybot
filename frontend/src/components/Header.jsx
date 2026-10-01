import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { toast } from './Toaster.jsx'

export default function Header() {
  const { user, ready, logout, openLogin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast('로그아웃했어요. 또 놀러 오세요!')
    navigate('/')
  }

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          <span className="logo-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28">
              <path d="M4 7c4-2 8-2 12 1v18c-4-3-8-3-12-1z" fill="var(--coral)" />
              <path d="M28 7c-4-2-8-2-12 1v18c4-3 8-3 12-1z" fill="var(--butter)" />
              <circle cx="24" cy="5" r="2" fill="var(--sky)" />
            </svg>
          </span>
          스토리봇
        </Link>

        {ready && (
          <nav className="nav">
            {user ? (
              <>
                <span className="nav-hello">
                  <strong>{user.nickname}</strong>님
                </span>
                <Link to="/profile" className="btn btn-ghost btn-sm">
                  회원정보수정
                </Link>
                <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => openLogin()}>
                  로그인
                </button>
                <Link to="/signup" className="btn btn-primary btn-sm">
                  회원가입
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}
