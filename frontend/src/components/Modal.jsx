import { useEffect, useRef } from 'react'

// 모달이 겹쳐 열렸을 때 ESC는 가장 위의 모달만 닫는다
const openStack = []

export default function Modal({ open, onClose, className = '', children, label }) {
  const id = useRef(Symbol('modal'))
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const self = id.current
    openStack.push(self)
    const onKey = (e) => e.key === 'Escape' && openStack.at(-1) === self && closeRef.current()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      openStack.splice(openStack.indexOf(self), 1)
      document.removeEventListener('keydown', onKey)
      if (openStack.length === 0) document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={label}>
        <button className="modal-close" onClick={onClose} aria-label="닫기">
          ×
        </button>
        {children}
      </div>
    </div>
  )
}
