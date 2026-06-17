import { useEffect, useState } from 'react'
import api, { cop } from '../api'

const HOY = new Date().toISOString().slice(0, 10)
const HACE7 = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)

const METODO_LABEL = {
  nequi:        { label: 'Nequi',        color: '#7c3aed', bg: '#f3e8ff', icon: '📱' },
  daviplata:    { label: 'Daviplata',     color: '#0ea5e9', bg: '#e0f2fe', icon: '📱' },
  transferencia:{ label: 'Transferencia', color: '#0891b2', bg: '#cffafe', icon: '🏦' },
  whatsapp:     { label: 'WhatsApp',      color: '#16a34a', bg: '#dcfce7', icon: '💬' },
}
const getMetodo = m => METODO_LABEL[m] || { label: m, color: '#64748b', bg: '#f1f5f9', icon: '💳' }

export default function Transferencias() {
  const [data, setData]   = useState(null)
  const [desde, setDesde] = useState(HACE7)
  const [hasta, setHasta] = useState(HOY)
  const [tab, setTab]     = useState('todo') // 'todo' | 'ventas' | 'pedidos'

  const load = () =>
    api.get('/transferencias', { params: { desde, hasta } }).then(r => setData(r.data))

  useEffect(() => { load() }, [desde, hasta])

  const filas = !data ? [] :
    tab === 'ventas'  ? data.ventas :
    tab === 'pedidos' ? data.pedidos :
    [...data.ventas, ...data.pedidos].sort((a, b) => b.created_at.localeCompare(a.created_at))

  const resumen = data?.resumen || {}
  const granTotal = data?.gran_total || 0

  return (
    <>
      <div className="topbar">
        <h4><i className="fa-solid fa-money-bill-transfer me-2" />Transferencias digitales</h4>
      </div>

      <div className="page-body">
        {/* Filtro fechas */}
        <div className="table-card mb-3 p-3">
          <div className="row g-2 align-items-end">
            <div className="col-auto">
              <label className="form-label small fw-semibold mb-1">Desde</label>
              <input type="date" className="form-control form-control-sm" value={desde}
                onChange={e => setDesde(e.target.value)} />
            </div>
            <div className="col-auto">
              <label className="form-label small fw-semibold mb-1">Hasta</label>
              <input type="date" className="form-control form-control-sm" value={hasta}
                onChange={e => setHasta(e.target.value)} />
            </div>
            <div className="col-auto">
              <button className="btn btn-sm btn-outline-secondary"
                onClick={() => { setDesde(HOY); setHasta(HOY) }}>Hoy</button>
            </div>
            <div className="col-auto">
              <button className="btn btn-sm btn-outline-secondary"
                onClick={() => { setDesde(HACE7); setHasta(HOY) }}>Últimos 7 días</button>
            </div>
          </div>
        </div>

        {/* Tarjetas resumen */}
        {data && (
          <div className="row g-3 mb-3">
            {/* Gran total */}
            <div className="col-12 col-md-3">
              <div className="stat-card" style={{ borderLeft: '4px solid #1e40af' }}>
                <div className="stat-label">Total recibido</div>
                <div className="stat-value">{cop(granTotal)}</div>
                <div className="stat-sub">{filas.length} transacciones</div>
              </div>
            </div>
            {/* Por método */}
            {Object.entries(resumen).map(([m, total]) => {
              const meta = getMetodo(m)
              return (
                <div key={m} className="col-6 col-md-2">
                  <div className="stat-card" style={{ borderLeft: `4px solid ${meta.color}` }}>
                    <div className="stat-label">{meta.icon} {meta.label}</div>
                    <div className="stat-value" style={{ color: meta.color }}>{cop(total)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Tabs */}
        <div className="d-flex gap-2 mb-3">
          {[['todo','Todos'], ['ventas','POS'], ['pedidos','WhatsApp']].map(([k, lbl]) => (
            <button key={k} className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setTab(k)}>{lbl}</button>
          ))}
        </div>

        {/* Tabla */}
        <div className="table-card">
          {!data ? (
            <div className="text-center p-4"><span className="spinner-border spinner-border-sm" /></div>
          ) : (
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th className="px-3">#</th>
                  <th>Origen</th>
                  <th>Método</th>
                  <th>Cliente</th>
                  <th>Items</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filas.map(f => {
                  const meta = getMetodo(f.tipo_pago)
                  return (
                    <tr key={`${f.origen}-${f.id}`}>
                      <td className="px-3 text-muted">#{f.id}</td>
                      <td>
                        {f.origen === 'venta'
                          ? <span className="badge bg-primary">POS</span>
                          : <span className="badge bg-success">WhatsApp</span>}
                      </td>
                      <td>
                        <span className="badge" style={{ background: meta.bg, color: meta.color }}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td className="fw-semibold">{f.cliente}</td>
                      <td><span className="badge bg-secondary">{f.num_items}</span></td>
                      <td className="fw-bold text-success">{cop(f.total)}</td>
                      <td>
                        {f.origen === 'pedido'
                          ? (f.pago_verificado
                              ? <span className="badge bg-success">Verificado</span>
                              : <span className="badge bg-warning text-dark">Pendiente</span>)
                          : <span className="badge bg-light text-muted">Completada</span>}
                      </td>
                      <td className="text-muted small">{f.created_at?.slice(0, 16)}</td>
                    </tr>
                  )
                })}
                {filas.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted py-4">
                    Sin transferencias en el período seleccionado
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
