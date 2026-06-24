import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function Login() {
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const r = await api.post('/auth/login', { password })
      localStorage.setItem('tlr_token', r.data.token)
      navigate('/', { replace: true })
    } catch {
      setError('Contraseña incorrecta')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div className="text-center mb-4">
          <img src="/logo.jpg" alt="Tienda La Real"
            style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover',
              border: '4px solid #facc15', boxShadow: '0 0 40px rgba(250,204,21,.3)' }} />
          <h4 style={{ color: '#fff', margin: '16px 0 4px', fontWeight: 700, fontSize: '1.4rem' }}>
            Tienda La Real
          </h4>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '.88rem' }}>Panel Administrador</p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}>
          <h6 style={{ color: '#1e293b', marginBottom: 20, fontWeight: 600, textAlign: 'center' }}>
            <i className="fa-solid fa-lock me-2 text-primary" />Iniciar sesión
          </h6>

          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label fw-semibold small">Contraseña</label>
              <div className="input-group">
                <input
                  className={`form-control ${error ? 'is-invalid' : ''}`}
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="Ingresa tu contraseña"
                  autoFocus
                  autoComplete="current-password"
                />
                <button type="button" className="btn btn-outline-secondary"
                  onClick={() => setShowPw(s => !s)} tabIndex={-1}>
                  <i className={`fa-solid ${showPw ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
                {error && <div className="invalid-feedback">{error}</div>}
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold" disabled={loading || !password}>
              {loading
                ? <><span className="spinner-border spinner-border-sm me-2" />Verificando…</>
                : <><i className="fa-solid fa-right-to-bracket me-2" />Entrar</>}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
