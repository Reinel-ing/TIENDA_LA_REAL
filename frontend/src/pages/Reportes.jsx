import { useEffect, useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import api, { cop } from '../api'
import useAutoRefresh from '../hooks/useAutoRefresh'
import LiveBadge from '../components/LiveBadge'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

export default function Reportes() {
  const [data, setData] = useState(null)
  const load = () => api.get('/reportes').then(r => setData(r.data))
  useEffect(() => { load() }, [])
  const lastUpdated = useAutoRefresh(load, 60000)

  if (!data) return <div className="page-body"><p>Cargando...</p></div>

  const semanaChart = {
    labels: data.ventas_semana.map(d => d.fecha?.slice(5)),
    datasets: [{
      label: 'Ventas ($)',
      data: data.ventas_semana.map(d => d.total),
      backgroundColor: '#3b82f6', borderRadius: 6,
    }],
  }

  const pagoChart = {
    labels: data.por_tipo_pago.map(p => p.tipo_pago),
    datasets: [{
      data: data.por_tipo_pago.map(p => p.total),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    }],
  }

  return (
    <>
      <div className="topbar">
        <h4><i className="fa-solid fa-chart-line me-2" />Reportes</h4>
        <LiveBadge lastUpdated={lastUpdated} />
      </div>
      <div className="page-body">
        {/* Stats hoy / mes */}
        <div className="row g-3 mb-4">
          {[
            { label: 'Ventas hoy', count: data.stats_hoy.ventas, total: data.stats_hoy.total, color: '#dcfce7', icon: 'fa-sun', ic: '#16a34a' },
            { label: 'Ventas del mes', count: data.stats_mes.ventas, total: data.stats_mes.total, color: '#dbeafe', icon: 'fa-calendar', ic: '#2563eb' },
          ].map((s, i) => (
            <div key={i} className="col-md-6 col-xl-3">
              <div className="stat-card">
                <div className="d-flex gap-3 align-items-center mb-1">
                  <div className="stat-icon" style={{ background: s.color }}>
                    <i className={`fa-solid ${s.icon}`} style={{ color: s.ic }} />
                  </div>
                  <div>
                    <div className="stat-value">{cop(s.total)}</div>
                    <div className="stat-label">{s.label} · {s.count} transacciones</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="row g-3 mb-4">
          {/* Gráfica semana */}
          <div className="col-md-8">
            <div className="table-card p-3">
              <div className="fw-semibold mb-3">Ventas últimos 7 días</div>
              <Bar data={semanaChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </div>
          </div>
          {/* Formas de pago */}
          <div className="col-md-4">
            <div className="table-card p-3">
              <div className="fw-semibold mb-3">Forma de pago (mes)</div>
              {data.por_tipo_pago.length
                ? <Doughnut data={pagoChart} options={{ plugins: { legend: { position: 'bottom' } } }} />
                : <p className="text-muted text-center">Sin datos</p>}
            </div>
          </div>
        </div>

        <div className="row g-3">
          {/* Top productos */}
          <div className="col-md-7">
            <div className="table-card">
              <div className="p-3 border-bottom fw-semibold">Top productos del mes</div>
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th className="px-3">#</th>
                    <th>Producto</th>
                    <th>Unidades</th>
                    <th>Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_productos.map((p, i) => (
                    <tr key={i}>
                      <td className="px-3 text-muted">{i + 1}</td>
                      <td className="fw-semibold">{p.nombre}</td>
                      <td>{p.total_vendido}</td>
                      <td className="text-primary fw-semibold">{cop(p.total_ingresos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Stock bajo */}
          <div className="col-md-5">
            <div className="table-card">
              <div className="p-3 border-bottom fw-semibold text-danger">
                <i className="fa-solid fa-triangle-exclamation me-2" />Stock bajo
              </div>
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th className="px-3">Producto</th>
                    <th>Stock</th>
                    <th>Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stock_bajo.map((p, i) => (
                    <tr key={i}>
                      <td className="px-3">{p.nombre}</td>
                      <td><span className="badge bg-danger">{p.stock}</span></td>
                      <td className="text-muted">{p.stock_minimo}</td>
                    </tr>
                  ))}
                  {!data.stock_bajo.length && <tr><td colSpan={3} className="text-center text-muted py-3">Todo OK</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
