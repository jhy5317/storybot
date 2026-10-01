import { useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

export default function LikeButton({ story, onChange, size = 'sm' }) {
  const { user, openLogin } = useAuth()
  const [busy, setBusy] = useState(false)

  const handleClick = async (e) => {
    e.stopPropagation()
    if (!user) {
      openLogin('좋아요는 로그인 후 누를 수 있어요.')
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const data = await api(`/stories/${story.id}/like`, { method: 'POST' })
      onChange({ ...story, liked: data.liked, like_count: data.like_count })
    } catch {
      // 401은 api.js에서 로그인 팝업으로 처리
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      className={`like-btn like-${size} ${story.liked ? 'liked' : ''}`}
      onClick={handleClick}
      aria-pressed={story.liked}
      aria-label={story.liked ? '좋아요 취소' : '좋아요'}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" />
      </svg>
      <span>{story.like_count}</span>
    </button>
  )
}
