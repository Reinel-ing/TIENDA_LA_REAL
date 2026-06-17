import { useEffect, useState } from 'react'
import api, { cop } from '../api'

export default function Caja() {
  const [data, setData] = useState(null)
  const [apertura, setApertura] = useState('')
  const [cierre, setCierre] = useState('')
  const [mov, setMov] = useState({ tipo: 'entrada', monto: '', concepto: '' })

  const load = () => api.get('/caja').then(r => setData(r.data))
  useEffect(() => { load() }, [])

  const abrir = async e => {
    e.preventDefault()
    await api.post('/caja/abrir', { monto_apertura: Number(apertura) })
    setApertura(''); load()
  }

  const cerrar = async () => {
    if (!confirm('¿Cerrar la caja?')) return
    await api.post(`/caja/${data.caja.id}/cerrar`, { monto_cierre: Number(cierre) })
    setCierre(''); load()
  }

  const agregarMov = async e => {
    e.preventDefault()
    await api.post(`/caja/${data.caja.id}/movimiento`, mov)
    setMov({ tipo: 'entrada', monto: '', concepto: '' }); load()
  }

  if (!data) return <div className="page-body"><p>Cargando...</p></div>

  const { caja, movimientos, total_entradas, total_salidas, ventas_total } = data
  const saldo = (caja?.monto_apertura || 0) + total_entradas - total_salidas

  return (
    <>
      <div className="topbar">
        <h4><i className="fa-solid fa-sack-dollar me-2" />Caja</h4>
        {caja && <span className="badge bg-success">Abierta</span>}
      </div>
      <div className="page-body">
        {!caja ? (
          <div className="row justify-content-center">
            <div className="col-md-4">
              <div className="table-card p-4">
                <h5 className="mb-3">Abrir caja</h5>
                <form onSubmit={abrir}>
                  <label className="form-label">Monto de apertura</label>
                  <input className="form-control mb-3" type="number" min="0" placeholder="$0"
                    value={apertura} onChange={e => setApertura(e.target.value)} />
                  <button className="btn btn-success w-100" type="submit">
                    <i className="fa-solid fa-lock-open me-2" />Abrir caja
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="row g-3">
            {/* Resumen */}
            <div className="col-md-4">
              <div className="stat-card mb-3">
                <div className="stat-label">Saldo actual</div>
                <div className="stat-value text-success">{cop(saldo)}</div>
                <hr />
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Apertura</span><span>{cop(caja.monto_apertura)}</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Ventas</span><span className="text-success">{cop(ventas_total)}</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Entradas</span><span className="text-success">{cop(total_entradas - ventas_total)}</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Salidas</span><span className="text-danger">−{cop(total_salidas)}</span>
                </div>
              </div>

              {/* Agregar movimiento */}
              <div className="table-card p-3 mb-3">
                <h6 className="mb-3">Movimiento</h6>
                <form onSubmit={agregarMov}>
                  <div className="d-flex gap-2 mb-2">
                    <button type="button" className={`btn btn-sm flex-fill ${mov.tipo === 'entrada' ? 'btn-success' : 'btn-outline-secondary'}`}
                      onClick={() => setMov(m => ({ ...m, tipo: 'entrada' }))}>Entrada</button>
                    <button type="button" className={`btn btn-sm flex-fill ${mov.tipo === 'salida' ? 'btn-danger' : 'btn-outline-secondary'}`}
                      onClick={() => setMov(m => ({ ...m, tipo: 'salida' }))}>Salida</button>
                  </div>
                  <input className="form-control form-control-sm mb-2" type="number" min="0" placeholder="Monto"
                    required value={mov.monto} onChange={e => setMov(m => ({ ...m, monto: e.target.value }))} />
                  <input className="form-control form-control-sm mb-2" placeholder="Concepto"
                    value={mov.concepto} onChange={e => setMov(m => ({ ...m, concepto: e.target.value }))} />
                  <button className="btn btn-primary btn-sm w-100" type="submit">Registrar</button>
                </form>
              </div>

              {/* Cerrar */}
              <div className="table-card p-3">
                <h6 className="mb-2">Cerrar caja</h6>
                <input className="form-control form-control-sm mb-2" type="number" min="0" placeholder="Monto de cierre"
                  value={cierre} onChange={e => setCierre(e.target.value)} />
                <button className="btn btn-danger btn-sm w-100" onClick={cerrar}>
                  <i className="fa-solid fa-lock me-2" />Cerrar caja
                </button>
              </div>
            </div>

            {/* Movimientos */}
            <div className="col-md-8">
              <div className="table-card">
                <div className="p-3 border-bottom fw-semibold">Movimientos</div>
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th className="px-3">Tipo</th>
                      <th>Concepto</th>
                      <th>Monto</th>
                      <th>Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map(m => (
                      <tr key={m.id}>
                        <td className="px-3">
                          <span className={`badge ${m.tipo === 'entrada' ? 'bg-success' : 'bg-danger'}`}>{m.tipo}</span>
                        </td>
                        <td>{m.concepto || '—'}</td>
                        <td className={`fw-semibold ${m.tipo === 'entrada' ? 'text-success' : 'text-danger'}`}>
                          {m.tipo === 'salida' ? '−' : '+'}{cop(m.monto)}
                        </td>
                        <td className="text-muted">{m.created_at?.slice(11, 16)}</td>
                      </tr>
                    ))}
                    {!movimientos.length && (
                      <tr><td colSpan={4} className="text-center text-muted py-3">Sin movimientos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
