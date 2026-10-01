import { useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import { toast } from './Toaster.jsx'

const LENGTH_LABEL = { 100: '짧게', 200: '보통', 300: '길게' }

function lengthLabel(value) {
  if (value < 150) return LENGTH_LABEL[100]
  if (value < 250) return LENGTH_LABEL[200]
  return LENGTH_LABEL[300]
}

function creativityLabel(value) {
  if (value < 0.8) return '차분하게'
  if (value <= 1.2) return '적당히'
  return '엉뚱하게'
}

export default function StoryBotPanel({ onSaved }) {
  const { user, openLogin } = useAuth()
  const [prompt, setPrompt] = useState('')
  const [maxTokens, setMaxTokens] = useState(200)
  const [temperature, setTemperature] = useState(1.0)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!user) {
      openLogin('스토리는 로그인 후 만들 수 있어요.')
      return
    }
    if (generating) return

    setGenerating(true)
    setError('')
    try {
      const data = await api('/storybot/generate', {
        method: 'POST',
        body: { prompt, max_new_tokens: maxTokens, temperature },
      })
      setResult(data)
      setTitle('')
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('제목을 지어주세요.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api('/stories', {
        method: 'POST',
        body: { title: title.trim(), prompt: result.prompt, content: result.content },
      })
      toast('책장에 이야기를 꽂아두었어요!')
      setResult(null)
      setTitle('')
      setPrompt('')
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="storybot">
      <div className="storybot-intro">
        <p className="eyebrow">STORYBOT</p>
        <h1 className="hero-title">
          오늘 밤,
          <br />
          어떤 이야기를 <em>들려줄까요?</em>
        </h1>
        <p className="hero-sub">
          첫 문장을 영어로 적어주면 스토리봇이 이어서 동화를 써요.
          <br />
          비워두면 스토리봇이 처음부터 자유롭게 지어요.
        </p>
      </div>

      <form className="storybot-card" onSubmit={handleGenerate}>
        <label className="field">
          <span>이야기의 첫 문장</span>
          <textarea
            rows={3}
            maxLength={300}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Once upon a time, there was a little bunny named Lily..."
            disabled={generating}
          />
        </label>

        <div className="sliders">
          <label className="slider">
            <span>
              이야기 길이 <b>{lengthLabel(maxTokens)}</b>
            </span>
            <input
              type="range"
              min={100}
              max={300}
              step={10}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              disabled={generating}
            />
          </label>
          <label className="slider">
            <span>
              상상력 <b>{creativityLabel(temperature)}</b>
            </span>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              disabled={generating}
            />
          </label>
        </div>

        <button className="btn btn-primary btn-block btn-lg" disabled={generating}>
          {generating ? '이야기를 짓는 중…' : user ? '이야기 만들기' : '로그인하고 이야기 만들기'}
        </button>
        {error && !result && <p className="form-error">{error}</p>}
      </form>

      {generating && (
        <div className="generating" role="status">
          <div className="book-anim" aria-hidden="true">
            <span className="page p1" />
            <span className="page p2" />
            <span className="page p3" />
          </div>
          <p>스토리봇이 책장을 넘기며 이야기를 쓰고 있어요…</p>
        </div>
      )}

      {result && !generating && (
        <div className="result">
          <div className="paper">
            <p className="paper-label">방금 완성된 이야기</p>
            <p className="story-text">{result.content}</p>
          </div>
          <div className="result-actions">
            <input
              className="title-input"
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="이야기 제목을 지어주세요"
            />
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중…' : '저장하기'}
            </button>
          </div>
          {error && <p className="form-error">{error}</p>}
        </div>
      )}
    </section>
  )
}
