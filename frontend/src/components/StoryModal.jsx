import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { formatDate } from '../format.js'
import LikeButton from './LikeButton.jsx'
import Modal from './Modal.jsx'
import { toast } from './Toaster.jsx'

export default function StoryModal({ storyId, onClose, onUpdated, onDeleted }) {
  const [story, setStory] = useState(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('view') // view | edit | confirm-delete
  const [form, setForm] = useState({ title: '', content: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!storyId) return
    setStory(null)
    setError('')
    setMode('view')
    // 상세 조회 시 서버에서 조회수가 1 증가한다
    api(`/stories/${storyId}`)
      .then((data) => {
        setStory(data)
        onUpdated(data)
      })
      .catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId])

  const update = (next) => {
    setStory(next)
    onUpdated(next)
  }

  const startEdit = () => {
    setForm({ title: story.title, content: story.content })
    setError('')
    setMode('edit')
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('제목과 내용을 모두 채워주세요.')
      return
    }
    setBusy(true)
    try {
      const data = await api(`/stories/${story.id}`, { method: 'PATCH', body: form })
      update(data)
      setMode('view')
      toast('이야기를 고쳤어요.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    try {
      await api(`/stories/${story.id}`, { method: 'DELETE' })
      toast('이야기를 책장에서 꺼냈어요.')
      onDeleted(story.id)
    } catch (err) {
      setError(err.message)
      setMode('view')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={Boolean(storyId)} onClose={onClose} className="story-modal" label="스토리 상세">
      {!story && !error && <p className="loading-text">책을 펼치는 중…</p>}
      {!story && error && <p className="form-error">{error}</p>}

      {story && mode !== 'edit' && (
        <>
          <p className="eyebrow">{story.author_nickname}의 이야기</p>
          <h2 className="story-title">{story.title}</h2>
          <div className="story-meta">
            <span>{formatDate(story.created_at)}</span>
            {new Date(story.updated_at) - new Date(story.created_at) > 1000 && <span>· 수정됨</span>}
            <span>· 조회 {story.view_count}</span>
          </div>
          {story.prompt && (
            <p className="story-prompt">
              <span>첫 문장</span> {story.prompt}
            </p>
          )}
          <div className="paper paper-modal">
            <p className="story-text">{story.content}</p>
          </div>

          <div className="story-actions">
            <LikeButton story={story} onChange={update} size="lg" />
            {story.is_owner && mode === 'view' && (
              <div className="owner-actions">
                <button className="btn btn-ghost btn-sm" onClick={startEdit}>
                  수정
                </button>
                <button className="btn btn-danger-ghost btn-sm" onClick={() => setMode('confirm-delete')}>
                  삭제
                </button>
              </div>
            )}
          </div>

          {mode === 'confirm-delete' && (
            <div className="confirm">
              <p>이 이야기를 정말 삭제할까요? 삭제하면 되돌릴 수 없어요.</p>
              <div className="confirm-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setMode('view')} disabled={busy}>
                  취소
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={busy}>
                  {busy ? '삭제 중…' : '삭제하기'}
                </button>
              </div>
            </div>
          )}
          {error && <p className="form-error">{error}</p>}
        </>
      )}

      {story && mode === 'edit' && (
        <div className="form">
          <h2 className="modal-title">이야기 고쳐 쓰기</h2>
          <label className="field">
            <span>제목</span>
            <input
              value={form.title}
              maxLength={100}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="field">
            <span>내용</span>
            <textarea
              rows={10}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="confirm-actions">
            <button className="btn btn-ghost" onClick={() => setMode('view')} disabled={busy}>
              취소
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={busy}>
              {busy ? '저장 중…' : '저장하기'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
