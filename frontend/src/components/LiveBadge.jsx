import { useEffect, useState } from 'react'

export default function LiveBadge({ lastUpdated }) {
  const [ago, setAgo] = useState(0)

  useEffect(() => {
    setAgo(0)
    const id = setInterval(() => {
      setAgo(s => s + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [lastUpdated])

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: '.72rem', color: '#16a34a', fontWeight: 600,
      background: '#dcfce7', padding: '3px 10px', borderRadius: 999,
      border: '1px solid #bbf7d0',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: '#16a34a',
        display: 'inline-block', animation: 'blink 2s step-start infinite',
      }} />
      En vivo{ago > 0 ? ` · hace ${ago}s` : ''}
    </span>
  )
}
