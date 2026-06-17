import { useEffect, useState } from 'react'
import api, { cop } from '../api'

const TABS = ['pendiente', 'confirmado', 'cancelado']

export default function Pedidos() {
  const [tab, setTab] = useState('pendiente')
  const [data, setData] = useState({ pedidos: [], conteos: {} })
  const [waLink, setWaLink] = useState(null)

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
                <tr><td colSpan={7} className="text-center text-muted py-4">Sin pedidos {tab}s</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal WhatsApp */}
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
    </>
  )
}
