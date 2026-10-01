import { useEffect, useState } from 'react'

const listeners = new Set()

export function toast(message) {
  listeners.forEach((fn) => fn(message))
}

export default function Toaster() {
  const [items, setItems] = useState([])

  useEffect(() => {
    const add = (message) => {
      const id = Date.now() + Math.random()
      setItems((prev) => [...prev, { id, message }])
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2400)
    }
    listeners.add(add)
    return () => listeners.delete(add)
  }, [])

  return (
    <div className="toaster" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast">
          {t.message}
        </div>
      ))}
    </div>
  )
}
