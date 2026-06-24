import { useEffect, useState } from 'react'
import api, { cop } from '../api'
import useAutoRefresh from '../hooks/useAutoRefresh'
import LiveBadge from '../components/LiveBadge'

export default function VentasHistorial() {
  const today = new Date().toISOString().slice(0, 10)
  const [desde, setDesde] = useState(today)
  const [hasta, setHasta] = useState(today)
  const [data, setData] = useState({ ventas: [], total_periodo: 0 })

  const load = () => api.get('/ventas', { params: { desde, hasta } }).then(r => setData(r.data))
  useEffect(() => { load() }, [desde, hasta])
  const lastUpdated = useAutoRefresh(load, 30000)

  return (
    <>
      <div className="topbar">
        <h4><i className="fa-solid fa-clock-rotate-left me-2" />Historial de ventas</h4>
        <LiveBadge lastUpdated={lastUpdated} />
      </div>
      <div className="page-body">
        <div className="d-flex gap-2 mb-3 align-items-center flex-wrap">
          <label className="small text-muted">Desde</label>
          <input type="date" className="form-control form-control-sm" style={{ maxWidth: 160 }} value={desde} onChange={e => setDesde(e.target.value)} />
          <label className="small text-muted">Hasta</label>
          <input type="date" className="form-control form-control-sm" style={{ maxWidth: 160 }} value={hasta} onChange={e => setHasta(e.target.value)} />
          <div className="ms-auto fw-bold text-primary fs-5">{cop(data.total_periodo)}</div>
        </div>
        <div className="table-card">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th className="px-3">#</th>
                <th>Cliente</th>
                <th>Forma de pago</th>
                <th>Total</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {data.ventas.map(v => (
                <tr key={v.id}>
                  <td className="px-3 text-muted">#{v.id}</td>
                  <td>{v.cliente}</td>
                  <td><span className="badge bg-secondary">{v.tipo_pago}</span></td>
                  <td className="fw-semibold text-primary">{cop(v.total)}</td>
                  <td className="text-muted">{v.created_at?.slice(0, 16)}</td>
                </tr>
              ))}
              {!data.ventas.length && (
                <tr><td colSpan={5} className="text-center text-muted py-4">Sin ventas en el período</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
