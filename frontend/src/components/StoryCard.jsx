import { formatDate } from '../format.js'
import LikeButton from './LikeButton.jsx'

const TINTS = ['tint-coral', 'tint-butter', 'tint-sky', 'tint-mint']

export default function StoryCard({ story, onOpen, onChange }) {
  return (
    <article
      className={`story-card ${TINTS[story.id % TINTS.length]}`}
      onClick={() => onOpen(story)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(story)}
      tabIndex={0}
    >
      <div className="card-spine" aria-hidden="true" />
      <h3 className="card-title">{story.title}</h3>
      <p className="card-preview">{story.content}</p>
      <div className="card-meta">
        <span className="card-author">{story.author_nickname}</span>
        <span>{formatDate(story.created_at)}</span>
      </div>
      <div className="card-stats">
        <span className="views" title="조회수">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8z" />
          </svg>
          {story.view_count}
        </span>
        <LikeButton story={story} onChange={onChange} />
      </div>
    </article>
  )
}
