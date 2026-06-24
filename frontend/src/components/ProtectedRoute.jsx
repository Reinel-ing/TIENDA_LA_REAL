import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import api from '../api'

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('checking') // 'checking' | 'ok' | 'denied'

  useEffect(() => {
    const token = localStorage.getItem('tlr_token')
    if (!token) { setStatus('denied'); return }
    api.post('/auth/check', { token })
      .then(r => setStatus(r.data.ok ? 'ok' : 'denied'))
      .catch(() => setStatus('denied'))
  }, [])

  if (status === 'checking') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
        <span className="spinner-border text-primary" />
      </div>
    )
  }
  if (status === 'denied') return <Navigate to="/login" replace />
  return children
}
