import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import api, { cop } from '../api'

const PAGO_INFO = {
  efectivo:    { icon: '💵', label: 'Efectivo', color: '#166534', bg: '#f0fdf4' },
  nequi:       { icon: '📱', label: 'Nequi',    color: '#7c3aed', bg: '#f5f3ff' },
  daviplata:   { icon: '📱', label: 'Daviplata',color: '#b45309', bg: '#fffbeb' },
  bancolombia: { icon: '🏦', label: 'Bancolombia', color: '#1e40af', bg: '#eff6ff' },
}

function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M11.99 2C6.476 2 2 6.477 2 11.99c0 1.74.458 3.37 1.255 4.785L2 22l5.375-1.241A9.959 9.959 0 0011.99 22C17.523 22 22 17.523 22 11.99 22 6.477 17.523 2 11.99 2z"/>
    </svg>
  )
}

export default function CatalogoConfirmado() {
  const { id } = useParams()
  const [data, setData]       = useState(null)
  const [err, setErr]         = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded]   = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [copiado, setCopiado]     = useState('')
  const [cancelando, setCancelando] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    api.get(`/catalogo/pedido/${id}`)
      .then(r => setData(r.data))
      .catch(() => setErr(true))
  }, [id])

  // Polling cada 12 s para reflejar cambios de estado del admin
  useEffect(() => {
    if (!id) return
    const timer = setInterval(() => {
      api.get(`/catalogo/pedido/${id}`)
        .then(r => setData(r.data))
        .catch(() => {})
    }, 12000)
    return () => clearInterval(timer)
  }, [id])

  if (err) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: '3rem' }}>😕</div>
      <h4 style={{ color: '#1e293b' }}>Pedido no encontrado</h4>
      <Link to="/catalogo" style={{ color: '#d97706', fontWeight: 600 }}>← Volver al catálogo</Link>
    </div>
  )

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner-border text-warning mb-3" />
        <div style={{ color: '#64748b', fontSize: '.9rem' }}>Cargando tu pedido…</div>
      </div>
    </div>
  )

  const { pedido, items, wa_link, config } = data
  const metodo      = pedido.metodo_pago || 'efectivo'
  const tipoEntrega = pedido.tipo_entrega || 'domicilio'
  const pagoInfo    = PAGO_INFO[metodo] || PAGO_INFO.efectivo
  const esPagoDig   = metodo !== 'efectivo'
  const numeroPago  = config?.[metodo] || ''

  const ESTADO_STEP = { pendiente: 1, confirmado: 2, en_camino: 3, listo: 3, entregado: 4 }
  const stepsDone = ESTADO_STEP[pedido.estado] || 1
  const cancelado   = pedido.estado === 'cancelado'
  const cancelable  = pedido.estado === 'pendiente' || pedido.estado === 'confirmado'

  const STATUS_INFO = {
    pendiente:  { bg: '#fef3c7', color: '#92400e', icon: '⏳', text: 'Tu pedido está siendo revisado' },
    confirmado: { bg: '#dbeafe', color: '#1e40af', icon: '👨‍🍳', text: 'Estamos preparando tu pedido' },
    en_camino:  { bg: '#dcfce7', color: '#166534', icon: '🛵', text: '¡Tu pedido ya salió! Está en camino' },
    listo:      { bg: '#dcfce7', color: '#166534', icon: '🏪', text: '¡Tu pedido está listo para recoger!' },
    entregado:  { bg: '#f0fdf4', color: '#15803d', icon: '🎉', text: '¡Pedido entregado! ¡Gracias por tu compra!' },
    cancelado:  { bg: '#fee2e2', color: '#dc2626', icon: '❌', text: 'Tu pedido fue cancelado' },
  }
  const statusInfo = STATUS_INFO[pedido.estado] || STATUS_INFO.pendiente

  const trackSteps = [
    { icon: '✅', label: 'Pedido recibido' },
    { icon: '👨‍🍳', label: 'Confirmado y preparando' },
    { icon: tipoEntrega === 'domicilio' ? '🛵' : '🏪', label: tipoEntrega === 'domicilio' ? 'En camino a tu dirección' : 'Listo para recoger' },
    { icon: '🎉', label: '¡Pedido entregado!' },
  ]

  const copiar = async txt => {
    await navigator.clipboard.writeText(txt)
    setCopiado(txt)
    setTimeout(() => setCopiado(''), 2500)
  }

  const cancelarPedido = async () => {
    if (!confirm('¿Seguro que quieres cancelar tu pedido? Esta acción no se puede deshacer.')) return
    setCancelando(true)
    try {
      const r = await api.post(`/catalogo/pedido/${id}/cancelar`)
      if (r.data.success) {
        if (r.data.wa_tienda) window.open(r.data.wa_tienda, '_blank')
        const fresh = await api.get(`/catalogo/pedido/${id}`)
        setData(fresh.data)
      }
    } catch (e) {
      alert(e?.response?.data?.error || 'No se pudo cancelar el pedido. Intenta de nuevo.')
    } finally { setCancelando(false) }
  }

  const handleFile = async e => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setUploadErr('Máx 5 MB'); return }
    setUploading(true); setUploadErr('')
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        await api.post(`/pedidos/${id}/comprobante`, { imagen: ev.target.result })
        setUploaded(true)
      } catch { setUploadErr('Error al subir. Intenta de nuevo.') }
      finally  { setUploading(false) }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <style>{`
        @keyframes checkDraw { to { stroke-dashoffset: 0 } }
        @keyframes circlePop { 0%{transform:scale(.5);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #15803d 0%, #16a34a 60%, #22c55e 100%)', padding: '40px 20px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Círculos decorativos */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,.05)' }} />

        {/* Check animado */}
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 88, height: 88, borderRadius: '50%', background: 'rgba(255,255,255,.15)', marginBottom: 16, animation: 'circlePop .6s ease both' }}>
          <svg viewBox="0 0 52 52" style={{ width: 52, height: 52 }}>
            <circle cx="26" cy="26" r="24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" />
            <polyline points="14,27 22,35 38,18" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="40" strokeDashoffset="40"
              style={{ animation: 'checkDraw .5s .4s ease forwards' }} />
          </svg>
        </div>

        <h2 style={{ color: '#fff', fontWeight: 900, margin: '0 0 4px', fontSize: '1.5rem', animation: 'fadeUp .5s .3s both' }}>
          ¡Pedido recibido!
        </h2>
        <p style={{ color: 'rgba(255,255,255,.85)', margin: '0 0 6px', fontSize: '.9rem', animation: 'fadeUp .5s .4s both' }}>
          Pedido <strong>#{pedido.id}</strong> · {config?.nombre}
        </p>
        <p style={{ color: 'rgba(255,255,255,.7)', margin: 0, fontSize: '.8rem', animation: 'fadeUp .5s .5s both' }}>
          {new Date(pedido.created_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>

      {/* ── Contenido ── */}
      <div style={{ maxWidth: 480, margin: '-40px auto 0', padding: '0 16px 40px', position: 'relative' }}>

        {/* ── Resumen del pedido ── */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,.08)', marginBottom: 14, animation: 'fadeUp .5s .3s both' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>🧾 Tu pedido</div>
            {tipoEntrega === 'domicilio'
              ? <span style={{ fontSize: '.75rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', borderRadius: 20, padding: '3px 12px' }}>🛵 Domicilio</span>
              : <span style={{ fontSize: '.75rem', fontWeight: 700, background: '#dbeafe', color: '#1e40af', borderRadius: 20, padding: '3px 12px' }}>🏪 Recoger en tienda</span>}
          </div>

          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f1f5f9' }}>
            {items.map((i, idx) => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: idx ? '1px solid #f8fafc' : 'none', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                <span style={{ fontSize: '.85rem', color: '#374151' }}>{i.producto_nombre} <span style={{ color: '#94a3b8' }}>×{i.cantidad}</span></span>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '.88rem' }}>{cop(i.subtotal)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
              <span style={{ fontWeight: 800, color: '#1e293b' }}>Total</span>
              <span style={{ fontWeight: 900, color: '#16a34a', fontSize: '1.1rem' }}>{cop(pedido.total)}</span>
            </div>
          </div>

          {pedido.cliente_direccion && tipoEntrega === 'domicilio' && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef3c7', borderRadius: 10, fontSize: '.82rem', color: '#92400e' }}>
              🛵 <strong>Entrega a:</strong> {pedido.cliente_direccion}
            </div>
          )}
          {tipoEntrega === 'recoger' && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: '#dbeafe', borderRadius: 10, fontSize: '.82rem', color: '#1e40af' }}>
              🏪 <strong>Retira en:</strong> {config?.direccion || 'nuestra tienda'}{config?.ciudad ? `, ${config.ciudad}` : ''}
            </div>
          )}
          {pedido.notas && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 10, fontSize: '.8rem', color: '#64748b' }}>
              📝 {pedido.notas}
            </div>
          )}
        </div>

        {/* ── Botón principal WhatsApp ── */}
        <a href={wa_link} target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg, #15803d, #16a34a)', color: '#fff', borderRadius: 18, padding: '16px', fontWeight: 800, fontSize: '1rem', textDecoration: 'none', marginBottom: 14, boxShadow: '0 6px 20px rgba(22,163,74,.35)', animation: 'fadeUp .5s .4s both' }}>
          <WaIcon />
          Confirmar pedido por WhatsApp
        </a>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '.78rem', marginBottom: 14 }}>
          Se abrirá WhatsApp con el mensaje completo listo para enviar
        </p>

        {/* ── Pago digital ── */}
        {esPagoDig && (
          <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,.08)', marginBottom: 14, animation: 'fadeUp .5s .45s both' }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b', marginBottom: 14 }}>
              {pagoInfo.icon} Pagar con {pagoInfo.label}
            </div>
            {numeroPago && (
              <div style={{ background: pagoInfo.bg, borderRadius: 14, padding: '14px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '.72rem', fontWeight: 600, color: pagoInfo.color, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>Número {pagoInfo.label}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: pagoInfo.color, letterSpacing: '.08em' }}>{numeroPago}</div>
                </div>
                <button onClick={() => copiar(numeroPago)}
                  style={{ background: pagoInfo.color, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: '.82rem', cursor: 'pointer', flexShrink: 0 }}>
                  {copiado === numeroPago ? '✓ Copiado' : '📋 Copiar'}
                </button>
              </div>
            )}

            {/* Subir comprobante */}
            <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#1e293b', marginBottom: 8 }}>📸 Sube tu comprobante</div>
            <p style={{ color: '#64748b', fontSize: '.82rem', marginBottom: 12, margin: '0 0 12px' }}>
              Después de pagar, sube aquí la captura de pantalla.
            </p>
            {uploaded ? (
              <div style={{ background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: 14, padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 6 }}>✅</div>
                <div style={{ fontWeight: 700, color: '#166534' }}>¡Comprobante recibido!</div>
                <div style={{ color: '#4ade80', fontSize: '.82rem', marginTop: 4 }}>Lo verificaremos y prepararemos tu pedido pronto.</div>
              </div>
            ) : (
              <>
                <input ref={fileRef} type="file" accept="image/*" className="d-none" onChange={handleFile} />
                <button onClick={() => fileRef.current.click()} disabled={uploading}
                  style={{ width: '100%', background: uploading ? '#e2e8f0' : pagoInfo.bg, border: `2px dashed ${pagoInfo.color}`, borderRadius: 14, padding: '14px', cursor: uploading ? 'not-allowed' : 'pointer', color: pagoInfo.color, fontWeight: 700, fontSize: '.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .18s' }}>
                  {uploading
                    ? <><span className="spinner-border spinner-border-sm" />Subiendo…</>
                    : <><i className="fa-solid fa-cloud-arrow-up" />Seleccionar imagen</>}
                </button>
                {uploadErr && <div style={{ color: '#dc2626', fontSize: '.8rem', marginTop: 6 }}>{uploadErr}</div>}
              </>
            )}
          </div>
        )}

        {/* ── Efectivo info ── */}
        {!esPagoDig && (
          <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,.08)', marginBottom: 14, animation: 'fadeUp .5s .45s both' }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b', marginBottom: 10 }}>💵 Pago en efectivo</div>
            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '12px 14px', color: '#166534', fontSize: '.88rem', fontWeight: 600 }}>
              {tipoEntrega === 'domicilio'
                ? '✅ Pagarás al recibir tu domicilio. Prepara el dinero exacto.'
                : '✅ Pagarás al retirar en tienda. Te esperamos.'}
            </div>
          </div>
        )}

        {/* ── Banner estado actual ── */}
        <div style={{ background: statusInfo.bg, borderRadius: 16, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, animation: 'fadeUp .5s .45s both' }}>
          <span style={{ fontSize: '1.6rem' }}>{statusInfo.icon}</span>
          <span style={{ fontWeight: 700, color: statusInfo.color, fontSize: '.92rem' }}>{statusInfo.text}</span>
        </div>

        {/* ── Pasos / estado ── */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px', boxShadow: '0 4px 24px rgba(0,0,0,.08)', marginBottom: 14, animation: 'fadeUp .5s .5s both' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b', marginBottom: 16 }}>📍 Estado de tu pedido</div>
          {trackSteps.map((s, i) => {
            const done = i + 1 <= stepsDone
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 0', borderBottom: i < trackSteps.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: done ? '#f0fdf4' : '#f8fafc', border: `2px solid ${done ? '#22c55e' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: done ? 700 : 500, color: done ? '#166534' : '#94a3b8', fontSize: '.87rem' }}>{s.label}</span>
                </div>
                {done && <i className="fa-solid fa-check" style={{ color: '#22c55e', fontSize: '.8rem' }} />}
              </div>
            )
          })}
          <div style={{ marginTop: 12, fontSize: '.72rem', color: '#94a3b8', textAlign: 'center' }}>
            🔄 Se actualiza automáticamente
          </div>
        </div>

        {/* ── Pedir dirección si va a recoger ── */}
        {tipoEntrega === 'recoger' && config?.whatsapp && (
          <a href={`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(`Hola! Hice el pedido #${pedido.id} y voy a ir a recogerlo. ¿Me puede dar la dirección exacta o ubicación? Gracias 🙏`)}`}
            target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 20, padding: '16px 20px', boxShadow: '0 4px 24px rgba(0,0,0,.08)', marginBottom: 14, textDecoration: 'none', color: '#1e293b', animation: 'fadeUp .5s .55s both' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>📍</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '.92rem', color: '#1e293b' }}>¿Dónde queda la tienda?</div>
              <div style={{ fontSize: '.78rem', color: '#16a34a', marginTop: 2, fontWeight: 600 }}>Toca aquí y te enviamos la dirección por WhatsApp</div>
            </div>
            <i className="fa-brands fa-whatsapp" style={{ color: '#16a34a', fontSize: '1.3rem' }} />
          </a>
        )}

        {/* ── Cancelar mi pedido ── */}
        {cancelable && (
          <button onClick={cancelarPedido} disabled={cancelando}
            style={{ width: '100%', background: '#fff', color: '#dc2626', border: '1.5px solid #fecaca', borderRadius: 16, padding: '14px', fontWeight: 700, fontSize: '.9rem', cursor: cancelando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14, boxShadow: '0 2px 10px rgba(0,0,0,.05)', animation: 'fadeUp .5s .55s both' }}>
            {cancelando
              ? <><span className="spinner-border spinner-border-sm" />Cancelando…</>
              : <><i className="fa-solid fa-circle-xmark" />Cancelar mi pedido</>}
          </button>
        )}
        {cancelado && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 16, padding: '16px', textAlign: 'center', marginBottom: 14, animation: 'fadeUp .5s .55s both' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>❌</div>
            <div style={{ fontWeight: 800, color: '#dc2626' }}>Pedido cancelado</div>
            <div style={{ color: '#b91c1c', fontSize: '.82rem', marginTop: 4 }}>Tu pedido fue cancelado. Si fue un error, haz un nuevo pedido desde el catálogo.</div>
          </div>
        )}

        {/* ── Volver al catálogo ── */}
        <div style={{ textAlign: 'center', animation: 'fadeUp .5s .6s both' }}>
          <Link to="/catalogo"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#d97706', borderRadius: 14, padding: '12px 28px', fontWeight: 700, fontSize: '.9rem', textDecoration: 'none', boxShadow: '0 2px 10px rgba(0,0,0,.06)', border: '1.5px solid #fde68a' }}>
            <i className="fa-solid fa-arrow-left" />
            Volver al catálogo
          </Link>
          <p style={{ color: '#94a3b8', fontSize: '.75rem', marginTop: 12 }}>
            ¡Gracias por tu compra en {config?.nombre}! ❤️
          </p>
        </div>
      </div>
    </div>
  )
}
