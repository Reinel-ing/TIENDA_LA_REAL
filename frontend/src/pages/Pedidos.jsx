import { useEffect, useState, useRef, useCallback } from 'react'
import api, { cop } from '../api'
import useAutoRefresh from '../hooks/useAutoRefresh'
import LiveBadge from '../components/LiveBadge'

const TABS = ['pendiente', 'confirmado', 'en_camino', 'entregado', 'cancelado']
const TAB_LABELS = {
  pendiente:  'Nuevos',
  confirmado: 'Confirmados',
  en_camino:  'En camino',
  entregado:  'Entregados',
  cancelado:  'Cancelados',
}

// Genera un sonido "ding ding" de notificación de pedido
function tocarAlarma(ctx) {
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') ctx.resume()
    const t = ctx.currentTime
    // Dos tonos ascendentes estilo "nueva venta"
    ;[
      [880,  0.00, 0.25],
      [1100, 0.28, 0.55],
      [880,  0.58, 0.80],
    ].forEach(([freq, ini, fin]) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, t + ini)
      gain.gain.linearRampToValueAtTime(0.55, t + ini + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + fin)
      osc.start(t + ini)
      osc.stop(t + fin + 0.05)
    })
  } catch (e) { /* navegador bloqueó el audio */ }
}

export default function Pedidos() {
  const [tab, setTab]         = useState('pendiente')
  const [data, setData]       = useState({ pedidos: [], conteos: {} })
  const [waLink, setWaLink]   = useState(null)
  const [comprobanteModal, setComprobanteModal] = useState(null)
  const [loadingImg, setLoadingImg] = useState(false)
  const [nuevos, setNuevos]   = useState(0)
  const [notifOn, setNotifOn] = useState(localStorage.getItem('tlr_notif') === '1')
  const prevPendientes = useRef(null)
  const audioCtx       = useRef(null)

  // Activa / desactiva notificaciones (requiere clic del usuario para AudioContext)
  const toggleNotif = async () => {
    if (!notifOn) {
      // Crear AudioContext la primera vez (requiere interacción)
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      // Pedir permiso de notificación del sistema
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission()
      }
      localStorage.setItem('tlr_notif', '1')
      setNotifOn(true)
      tocarAlarma(audioCtx.current) // sonido de prueba
    } else {
      localStorage.setItem('tlr_notif', '0')
      setNotifOn(false)
    }
  }

  const notificarNuevoPedido = useCallback((cantidad) => {
    if (!notifOn) return
    // Sonido
    tocarAlarma(audioCtx.current)
    // Notificación del sistema
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`🛒 ${cantidad} pedido${cantidad > 1 ? 's' : ''} nuevo${cantidad > 1 ? 's' : ''}`, {
        body: 'Tienda La Real — Entra a confirmar',
        icon: '/logo.jpg',
        tag: 'pedido-nuevo',
      })
    }
  }, [notifOn])

  const load = useCallback(() =>
    api.get('/pedidos', { params: { estado: tab } }).then(r => {
      setData(r.data)
      const n = r.data.conteos?.pendiente || 0
      if (prevPendientes.current !== null && n > prevPendientes.current) {
        const diff = n - prevPendientes.current
        setNuevos(diff)
        notificarNuevoPedido(diff)
        setTimeout(() => setNuevos(0), 6000)
      }
      prevPendientes.current = n
    }), [tab, notificarNuevoPedido])

  useEffect(() => { load() }, [load])
  const lastUpdated = useAutoRefresh(load, 15000)

  const confirmar = async id => {
    const r = await api.post(`/pedidos/${id}/confirmar`)
    if (r.data.success) {
      window.open(`/factura/${id}?print=1`, '_blank')
      if (r.data.wa_cliente) setWaLink(r.data.wa_cliente)
      else load()
    }
  }

  const cancelar = async id => {
    if (!confirm('¿Cancelar pedido?')) return
    await api.post(`/pedidos/${id}/cancelar`)
    load()
  }

  const verComprobante = async id => {
    setLoadingImg(true)
    setComprobanteModal({ id, imagen: null })
    try {
      const r = await api.get(`/pedidos/${id}/comprobante-img`)
      setComprobanteModal({ id, imagen: r.data.imagen })
    } catch {
      setComprobanteModal({ id, imagen: null, error: true })
    } finally { setLoadingImg(false) }
  }

  const verificarPago = async id => {
    await api.post(`/pedidos/${id}/verificar-pago`)
    window.open(`/factura/${id}?print=1`, '_blank')
    setComprobanteModal(null)
    load()
  }

  const avanzar = async id => {
    const r = await api.post(`/pedidos/${id}/avanzar`)
    if (r.data.success) {
      if (r.data.wa_cliente) setWaLink(r.data.wa_cliente)
      else load()
    }
  }

  return (
    <>
      <div className="topbar">
        <h4><i className="fa-solid fa-bag-shopping me-2" />Pedidos WhatsApp</h4>
        <div className="d-flex align-items-center gap-2">
          {nuevos > 0 && (
            <span className="badge bg-danger" style={{ fontSize: '.78rem', animation: 'blink .5s step-start infinite' }}>
              🔔 +{nuevos} nuevo{nuevos > 1 ? 's' : ''}
            </span>
          )}
          <LiveBadge lastUpdated={lastUpdated} />
          <button
            className={`btn btn-sm ${notifOn ? 'btn-success' : 'btn-outline-secondary'}`}
            onClick={toggleNotif}
            title={notifOn ? 'Notificaciones activas — clic para desactivar' : 'Activar alertas de sonido para nuevos pedidos'}
          >
            {notifOn ? <>🔔 <span className="btn-label">Sonido ON</span></> : <>🔕 <span className="btn-label">Sonido</span></>}
          </button>
          <a href="/catalogo" target="_blank" className="btn btn-sm btn-outline-success">
            <i className="fa-solid fa-store" /><span className="btn-label ms-1">Ver catálogo</span>
          </a>
        </div>
      </div>
      <div className="page-body">
        {/* Tabs */}
        <div className="d-flex gap-2 mb-3 flex-wrap">
          {TABS.map(t => (
            <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setTab(t)}>
              {TAB_LABELS[t]}
              {data.conteos[t] ? <span className="ms-1 badge bg-white text-dark">{data.conteos[t]}</span> : null}
            </button>
          ))}
        </div>

        <div className="table-card">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th className="px-3">#</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Entrega</th>
                <th>Items</th>
                <th>Total</th>
                <th>Comprobante</th>
                <th>Fecha</th>
                {(tab === 'pendiente' || tab === 'confirmado' || tab === 'en_camino') && <th></th>}
              </tr>
            </thead>
            <tbody>
              {data.pedidos.map(p => (
                <tr key={p.id}>
                  <td className="px-3 text-muted">#{p.id}</td>
                  <td className="fw-semibold">{p.cliente_nombre}</td>
                  <td>{p.cliente_telefono}</td>
                  <td>
                    {p.tipo_entrega === 'recoger'
                      ? <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>🏪 Recoger</span>
                      : <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>🛵 Domicilio</span>}
                  </td>
                  <td><span className="badge bg-secondary">{p.num_items}</span></td>
                  <td className="fw-semibold text-primary">{cop(p.total)}</td>
                  <td>
                    {p.tiene_comprobante ? (
                      p.pago_verificado ? (
                        <span className="badge bg-success">✓ Verificado</span>
                      ) : (
                        <button className="btn btn-sm btn-warning" onClick={() => verComprobante(p.id)}>
                          📸 Ver
                        </button>
                      )
                    ) : (
                      <span className="badge bg-light text-muted">Sin comprobante</span>
                    )}
                  </td>
                  <td className="text-muted">{p.created_at?.slice(0, 16)}</td>
                  {tab === 'pendiente' && (
                    <td className="text-end pe-3">
                      <button className="btn btn-sm btn-success me-1" onClick={() => confirmar(p.id)}>
                        <i className="fa-solid fa-check" /> Confirmar
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => cancelar(p.id)}>
                        <i className="fa-solid fa-xmark" />
                      </button>
                    </td>
                  )}
                  {tab === 'confirmado' && (
                    <td className="text-end pe-3">
                      <button className="btn btn-sm btn-primary" onClick={() => avanzar(p.id)}>
                        {p.tipo_entrega === 'recoger'
                          ? <><i className="fa-solid fa-store me-1" />Listo para recoger</>
                          : <><i className="fa-solid fa-motorcycle me-1" />Enviar a domicilio</>}
                      </button>
                    </td>
                  )}
                  {tab === 'en_camino' && (
                    <td className="text-end pe-3">
                      <button className="btn btn-sm btn-success" onClick={() => avanzar(p.id)}>
                        <i className="fa-solid fa-circle-check me-1" />Marcar entregado
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!data.pedidos.length && (
                <tr><td colSpan={9} className="text-center text-muted py-4">Sin pedidos en esta categoría</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal WhatsApp confirmación */}
      {waLink && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">📲 Notificar al cliente</h5>
                <button className="btn-close" onClick={() => { setWaLink(null); load() }} />
              </div>
              <div className="modal-body text-center">
                <p>¿Notificar al cliente por WhatsApp?</p>
                <a href={waLink} target="_blank" rel="noreferrer" className="btn btn-success btn-lg">
                  <i className="fa-brands fa-whatsapp me-2" />Enviar por WhatsApp
                </a>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => { setWaLink(null); load() }}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Comprobante */}
      {comprobanteModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">📸 Comprobante — Pedido #{comprobanteModal.id}</h5>
                <button className="btn-close" onClick={() => setComprobanteModal(null)} />
              </div>
              <div className="modal-body text-center">
                {loadingImg && <div className="p-4"><span className="spinner-border" /></div>}
                {comprobanteModal.error && <p className="text-danger">Error al cargar el comprobante.</p>}
                {comprobanteModal.imagen && (
                  <img src={comprobanteModal.imagen} alt="Comprobante"
                    style={{ maxWidth: '100%', maxHeight: 500, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                )}
              </div>
              <div className="modal-footer justify-content-between">
                <button className="btn btn-secondary" onClick={() => setComprobanteModal(null)}>Cerrar</button>
                {comprobanteModal.imagen && (
                  <button className="btn btn-success btn-lg" onClick={() => verificarPago(comprobanteModal.id)}>
                    <i className="fa-solid fa-circle-check me-2" />Verificar pago y confirmar pedido
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
