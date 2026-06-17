import { useEffect, useState } from 'react'
import api, { cop } from '../api'

export default function Dashboard() {
  const [data, setData] = useState(null)

  useEffect(() => { api.get('/dashboard').then(r => setData(r.data)) }, [])

  if (!data) return <div className="page-body"><p>Cargando...</p></div>

  const stats = [
    { label: 'Ventas hoy',       value: cop(data.ventas_hoy_total),   sub: `${data.ventas_hoy_count} transacciones`,   icon: 'fa-money-bill-wave', color: '#dcfce7', iconColor: '#16a34a' },
    { label: 'Ventas del mes',   value: cop(data.ventas_mes_total),   sub: `${data.ventas_mes_count} transacciones`,   icon: 'fa-chart-line',      color: '#dbeafe', iconColor: '#2563eb' },
    { label: 'Productos',        value: data.total_productos,          sub: `${data.stock_bajo} con stock bajo`,        icon: 'fa-boxes-stacking',  color: '#fef9c3', iconColor: '#d97706' },
    { label: 'Clientes',         value: data.total_clientes,           sub: 'registrados',                              icon: 'fa-users',           color: '#f3e8ff', iconColor: '#7c3aed' },
    { label: 'Pedidos pendientes',value: data.pedidos_pendientes,      sub: 'por confirmar',                            icon: 'fa-bag-shopping',    color: '#fee2e2', iconColor: '#dc2626' },
  ]

  return (
    <>
      <div className="topbar">
        <h4><i className="fa-solid fa-gauge-high me-2" />Dashboard</h4>
        <small className="text-muted">{new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</small>
      </div>
      <div className="page-body">
        <div className="row g-3 mb-4">
          {stats.map((s, i) => (
            <div key={i} className="col-6 col-md-4 col-xl">
              <div className="stat-card">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon" style={{ background: s.color }}>
                    <i className={`fa-solid ${s.icon}`} style={{ color: s.iconColor }} />
                  </div>
                  <div className="stat-value">{s.value}</div>
                </div>
                <div className="stat-label">{s.label}</div>
                <small className="text-muted">{s.sub}</small>
              </div>
            </div>
          ))}
        </div>

        <div className="table-card">
          <div className="p-3 border-bottom fw-semibold">Últimas ventas</div>
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th className="px-3">#</th>
                <th>Cliente</th>
                <th>Pago</th>
                <th>Total</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {data.ultimas_ventas.map(v => (
                <tr key={v.id}>
                  <td className="px-3 text-muted">#{v.id}</td>
                  <td>{v.cliente}</td>
                  <td><span className="badge bg-secondary">{v.tipo_pago}</span></td>
                  <td className="fw-semibold text-primary">{cop(v.total)}</td>
                  <td className="text-muted">{v.created_at?.slice(0, 16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
