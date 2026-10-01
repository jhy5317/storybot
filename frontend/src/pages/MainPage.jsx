import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import Pagination from '../components/Pagination.jsx'
import StoryBotPanel from '../components/StoryBotPanel.jsx'
import StoryCard from '../components/StoryCard.jsx'
import StoryModal from '../components/StoryModal.jsx'

const PAGE_SIZE = 9

export default function MainPage() {
  const { user, ready } = useAuth()
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)

  const load = useCallback(async (target) => {
    try {
      const res = await api(`/stories?page=${target}&size=${PAGE_SIZE}`)
      // 마지막 페이지의 마지막 글을 지운 경우 이전 페이지로
      if (res.items.length === 0 && target > 1) {
        setPage(target - 1)
        return
      }
      setData(res)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [])

  // 로그인 상태가 바뀌면 좋아요·작성자 표시가 달라지므로 다시 불러온다
  useEffect(() => {
    if (ready) load(page)
  }, [page, ready, user?.id, load])

  const replaceStory = useCallback((next) => {
    setData((prev) =>
      prev ? { ...prev, items: prev.items.map((s) => (s.id === next.id ? { ...s, ...next } : s)) } : prev,
    )
  }, [])

  const handleSaved = () => {
    if (page === 1) load(1)
    else setPage(1)
  }

  const handleDeleted = () => {
    setOpenId(null)
    load(page)
  }

  const changePage = (p) => {
    setPage(p)
    document.getElementById('shelf')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <StoryBotPanel onSaved={handleSaved} />

      <section className="shelf" id="shelf">
        <div className="shelf-head">
          <h2>이야기 책장</h2>
          {data && <span className="shelf-count">모두 {data.total}편</span>}
        </div>

        {error && <p className="form-error">{error}</p>}

        {data && data.items.length === 0 && (
          <div className="empty">
            <p>아직 책장이 비어 있어요.</p>
            <p>첫 번째 이야기의 주인공이 되어보세요!</p>
          </div>
        )}

        {data && data.items.length > 0 && (
          <div className="card-grid">
            {data.items.map((story) => (
              <StoryCard key={story.id} story={story} onOpen={(s) => setOpenId(s.id)} onChange={replaceStory} />
            ))}
          </div>
        )}

        {data && <Pagination page={data.page} totalPages={data.total_pages} onChange={changePage} />}
      </section>

      <StoryModal
        storyId={openId}
        onClose={() => setOpenId(null)}
        onUpdated={replaceStory}
        onDeleted={handleDeleted}
      />
    </>
  )
}
