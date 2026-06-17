import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api, { cop } from '../api'

export default function CatalogoConfirmado() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    api.get(`/catalogo/pedido/${id}`)
      .then(r => setData(r.data))
      .catch(() => setErr(true))
  }, [id])

  if (err) return <div className="text-center p-5"><h4>Pedido no encontrado</h4><Link to="/catalogo">Volver al catálogo</Link></div>
  if (!data) return <div className="text-center p-5">Cargando...</div>

  const { pedido, items, wa_link, config } = data

  return (
    <div style={{ background: '#f0fdf4', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 480, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
        <div className="text-center mb-4">
          <div style={{ fontSize: '3.5rem' }}>🎉</div>
          <h3 className="mt-2">¡Pedido recibido!</h3>
          <p className="text-muted">Pedido #{pedido.id} — {config?.nombre}</p>
        </div>

        <div className="mb-3 p-3 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          {items.map(i => (
            <div key={i.id} className="d-flex justify-content-between mb-1 small">
              <span>{i.producto_nombre} x{i.cantidad}</span>
              <span className="fw-semibold">{cop(i.subtotal)}</span>
            </div>
          ))}
          <hr className="my-2" />
          <div className="d-flex justify-content-between fw-bold">
            <span>Total</span>
            <span className="text-success fs-5">{cop(pedido.total)}</span>
          </div>
        </div>

        <p className="text-center text-muted small mb-3">
          Confirma tu pedido por WhatsApp para que lo preparemos:
        </p>

        <a href={wa_link} target="_blank" rel="noreferrer"
          className="btn btn-success btn-lg w-100 mb-3"
          style={{ borderRadius: 50, fontSize: '1rem' }}>
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22, marginRight: 10 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.99 2C6.476 2 2 6.477 2 11.99c0 1.74.458 3.37 1.255 4.785L2 22l5.375-1.241A9.959 9.959 0 0011.99 22C17.523 22 22 17.523 22 11.99 22 6.477 17.523 2 11.99 2z"/></svg>
          Confirmar por WhatsApp
        </a>

        <div className="text-center">
          <Link to="/catalogo" className="text-muted small">← Volver al catálogo</Link>
        </div>
      </div>
    </div>
  )
}
