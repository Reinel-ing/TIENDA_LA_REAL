import { useEffect, useState } from 'react'
import api, { cop } from '../api'

const TABS = ['pendiente', 'confirmado', 'cancelado']

export default function Pedidos() {
  const [tab, setTab] = useState('pendiente')
  const [data, setData] = useState({ pedidos: [], conteos: {} })
  const [waLink, setWaLink] = useState(null)
  const [comprobanteModal, setComprobanteModal] = useState(null) // { id, imagen }
  const [loadingImg, setLoadingImg] = useState(false)

  const load = () => api.get('/pedidos', { params: { estado: tab } }).then(r => setData(r.data))
  useEffect(() => { load() }, [tab])

  const confirmar = async id => {
    const r = await api.post(`/pedidos/${id}/confirmar`)
    if (r.data.success) {
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
    setComprobanteModal(null)
    load()
  }

  return (
    <>
      <div className="topbar">
        <h4><i className="fa-solid fa-bag-shopping me-2" />Pedidos WhatsApp</h4>
        <a href="/catalogo" target="_blank" className="btn btn-sm btn-outline-success">
          <i className="fa-solid fa-store me-1" />Ver catálogo
        </a>
      </div>
      <div className="page-body">
        {/* Tabs */}
        <div className="d-flex gap-2 mb-3">
          {TABS.map(t => (
            <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
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
                <th>Items</th>
                <th>Total</th>
                <th>Comprobante</th>
                <th>Fecha</th>
                {tab === 'pendiente' && <th></th>}
              </tr>
            </thead>
            <tbody>
              {data.pedidos.map(p => (
                <tr key={p.id}>
                  <td className="px-3 text-muted">#{p.id}</td>
                  <td className="fw-semibold">{p.cliente_nombre}</td>
                  <td>{p.cliente_telefono}</td>
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
                </tr>
              ))}
              {!data.pedidos.length && (
                <tr><td colSpan={8} className="text-center text-muted py-4">Sin pedidos {tab}s</td></tr>
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
                <h5 className="modal-title">Pedido confirmado ✅</h5>
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
