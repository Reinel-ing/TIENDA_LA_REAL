import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import api, { cop } from '../api'

export default function Factura() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const autoPrint = searchParams.get('print') === '1'
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get(`/factura/${id}`).then(r => {
      setData(r.data)
      if (autoPrint) setTimeout(() => window.print(), 700)
    })
  }, [id, autoPrint])
  if (!data) return <div className="text-center p-5">Cargando...</div>

  const { pedido, items, config } = data

  const imprimir = () => window.print()

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
      `}</style>

      {/* Botón imprimir (no aparece al imprimir) */}
      <div className="no-print text-center pt-3 pb-1">
        <button className="btn btn-primary" onClick={imprimir}>
          <i className="fa-solid fa-print me-2" />Imprimir factura
        </button>
      </div>

      <div style={{ background: '#f1f5f9', minHeight: '100vh', padding: '16px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
          {/* Header */}
          <div style={{ background: '#1e40af', color: '#fff', padding: '28px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <img src="/logo.jpg" alt="Logo" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #facc15', flexShrink: 0 }} />
              <div>
                <h4 className="mb-0">{config?.nombre}</h4>
                <small style={{ opacity: .8 }}>{config?.direccion}{config?.ciudad ? ` · ${config.ciudad}` : ''}</small>
                {config?.horario && <div style={{ opacity: .7, fontSize: '.8rem', marginTop: 2 }}>{config.horario}</div>}
              </div>
            </div>
            <div className="mt-3 d-flex justify-content-between">
              <div>
                <div style={{ opacity: .7, fontSize: '.75rem' }}>FACTURA</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>#{pedido.id}</div>
              </div>
              <div className="text-end">
                <div style={{ opacity: .7, fontSize: '.75rem' }}>FECHA</div>
                <div>{pedido.created_at?.slice(0, 16)}</div>
              </div>
            </div>
          </div>

          {/* Cliente */}
          <div className="p-4 border-bottom">
            <div className="row">
              <div className="col-6">
                <div className="small text-muted mb-1">CLIENTE</div>
                <div className="fw-semibold">{pedido.cliente_nombre}</div>
                <div className="small text-muted">{pedido.cliente_telefono}</div>
              </div>
              {pedido.cliente_direccion && (
                <div className="col-6">
                  <div className="small text-muted mb-1">DIRECCIÓN</div>
                  <div className="small">{pedido.cliente_direccion}</div>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="p-4">
            <table className="table table-sm mb-0">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="text-center">Cant.</th>
                  <th className="text-end">Precio</th>
                  <th className="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map(i => (
                  <tr key={i.id}>
                    <td>{i.producto_nombre}</td>
                    <td className="text-center">{i.cantidad}</td>
                    <td className="text-end">{cop(i.precio_unitario)}</td>
                    <td className="text-end fw-semibold">{cop(i.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-end fw-bold border-top pt-2">TOTAL</td>
                  <td className="text-end fw-bold fs-5 text-primary border-top pt-2">{cop(pedido.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {pedido.notas && (
            <div className="px-4 pb-3">
              <div className="small text-muted">Notas: {pedido.notas}</div>
            </div>
          )}

          <div className="text-center pb-4 text-muted small">
            Gracias por tu compra ❤️ · {config?.nombre}
          </div>
        </div>
      </div>
    </>
  )
}
