import { useEffect, useState } from 'react'
import api, { cop } from '../api'

const EMOJIS = { 'Lácteos': '🥛', 'Bebidas': '🥤', 'Granos': '🌾', 'Carnes': '🥩', 'Verduras': '🥦', 'Frutas': '🍎', 'Aseo': '🧼', 'Panadería': '🍞', 'Snacks': '🍟', 'Otros': '📦' }
const getEmoji = cat => EMOJIS[cat] || '🛍️'

export default function Catalogo() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [config, setConfig] = useState({})
  const [catFil, setCatFil] = useState('all')
  const [cart, setCart] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [step, setStep] = useState('cart') // 'cart' | 'checkout'
  const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '', notas: '' })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    api.get('/productos/catalogo').then(r => {
      setProductos(r.data)
      const cats = [...new Set(r.data.map(p => p.categoria_nombre).filter(Boolean))]
      setCategorias(cats)
    })
    api.get('/config').then(r => setConfig(r.data))
  }, [])

  const addToCart = p => {
    if (p.stock === 0) return
    setCart(c => {
      const ex = c.find(i => i.producto_id === p.id)
      if (ex) return ex.cantidad >= p.stock ? c
        : c.map(i => i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario } : i)
      return [...c, { producto_id: p.id, nombre: p.nombre, precio_unitario: p.precio_venta, cantidad: 1, subtotal: p.precio_venta, stock: p.stock }]
    })
    setDrawerOpen(true)
  }

  const changeQty = (id, d) => setCart(c =>
    c.map(i => i.producto_id === id ? { ...i, cantidad: i.cantidad + d, subtotal: (i.cantidad + d) * i.precio_unitario } : i)
      .filter(i => i.cantidad > 0))

  const total = cart.reduce((s, i) => s + i.subtotal, 0)
  const totalItems = cart.reduce((s, i) => s + i.cantidad, 0)

  const visible = catFil === 'all' ? productos : productos.filter(p => p.categoria_nombre === catFil)

  const enviarPedido = async e => {
    e.preventDefault()
    if (!cart.length) return
    setSending(true)
    try {
      const r = await api.post('/catalogo/pedido', { ...form, total, items: cart })
      if (r.data.success) {
        window.location.href = `/catalogo/confirmado/${r.data.pedido_id}`
      }
    } finally { setSending(false) }
  }

  return (
    <div className="catalogo-page">
      {/* Header */}
      <div className="catalogo-header">
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 className="mb-1" style={{ color: '#fff' }}>{config.nombre || 'Tienda'}</h2>
          <p className="mb-0" style={{ color: 'rgba(255,255,255,.75)', fontSize: '.9rem' }}>
            {config.direccion} · {config.horario}
          </p>
        </div>
      </div>

      {/* Category pills */}
      <div className="cat-pills">
        <span className={`cat-pill ${catFil === 'all' ? 'active' : ''}`} onClick={() => setCatFil('all')}>
          Todos ({productos.length})
        </span>
        {categorias.map(c => (
          <span key={c} className={`cat-pill ${catFil === c ? 'active' : ''}`} onClick={() => setCatFil(c)}>
            {getEmoji(c)} {c}
          </span>
        ))}
      </div>

      {/* Products */}
      <div className="product-grid" style={{ maxWidth: 900, margin: '0 auto' }}>
        {visible.map(p => (
          <div key={p.id} className={`prod-card ${p.stock === 0 ? 'agotado' : ''}`} onClick={() => addToCart(p)}>
            <div className="prod-emoji">{getEmoji(p.categoria_nombre)}</div>
            <div className="prod-name">{p.nombre}</div>
            <div className="prod-price">{cop(p.precio_venta)}</div>
            {p.stock === 0 && <div className="badge bg-danger mt-1">Agotado</div>}
          </div>
        ))}
      </div>

      {/* Cart FAB */}
      {totalItems > 0 && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100 }}>
          <button className="btn btn-primary btn-lg rounded-circle shadow-lg" style={{ width: 60, height: 60, position: 'relative' }}
            onClick={() => setDrawerOpen(true)}>
            <i className="fa-solid fa-cart-shopping" />
            <span className="cart-badge">{totalItems}</span>
          </button>
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && (
        <>
          <div className="overlay" onClick={() => setDrawerOpen(false)} />
          <div className="drawer">
            <div className="drawer-header">
              <strong>{step === 'cart' ? '🛒 Mi pedido' : '📋 Mis datos'}</strong>
              <button className="btn-close" onClick={() => setDrawerOpen(false)} />
            </div>

            {step === 'cart' ? (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                  {cart.map(item => (
                    <div key={item.producto_id} className="cart-item">
                      <div className="cart-item-name">{item.nombre}</div>
                      <div className="cart-qty">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => changeQty(item.producto_id, -1)}>−</button>
                        <span style={{ minWidth: 24, textAlign: 'center' }}>{item.cantidad}</span>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => changeQty(item.producto_id, 1)}
                          disabled={item.cantidad >= item.stock}>+</button>
                      </div>
                      <div className="fw-semibold text-primary" style={{ minWidth: 70, textAlign: 'right' }}>{cop(item.subtotal)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 16, borderTop: '1px solid #e2e8f0' }}>
                  <div className="d-flex justify-content-between mb-3 fw-bold">
                    <span>Total</span>
                    <span className="text-primary fs-5">{cop(total)}</span>
                  </div>
                  <button className="btn btn-success w-100 btn-lg" onClick={() => setStep('checkout')}>
                    Continuar <i className="fa-solid fa-arrow-right ms-2" />
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={enviarPedido} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                  {[['nombre', 'Tu nombre *', true, 'text'], ['telefono', 'WhatsApp *', true, 'tel'], ['direccion', 'Dirección', false, 'text'], ['notas', 'Notas', false, 'text']].map(([k, lbl, req, type]) => (
                    <div key={k} className="mb-3">
                      <label className="form-label small fw-semibold">{lbl}</label>
                      <input className="form-control" type={type} required={req}
                        value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                    </div>
                  ))}
                  <div className="p-3 rounded" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <small className="fw-semibold text-success">Resumen:</small>
                    {cart.map(i => <div key={i.producto_id} className="small">{i.nombre} x{i.cantidad} — {cop(i.subtotal)}</div>)}
                    <div className="fw-bold mt-1">Total: {cop(total)}</div>
                  </div>
                </div>
                <div style={{ padding: 16, borderTop: '1px solid #e2e8f0' }}>
                  <button type="button" className="btn btn-outline-secondary w-100 mb-2" onClick={() => setStep('cart')}>
                    ← Volver
                  </button>
                  <button type="submit" className="btn btn-success w-100 btn-lg" disabled={sending}>
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20, marginRight: 8 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.99 2C6.476 2 2 6.477 2 11.99c0 1.74.458 3.37 1.255 4.785L2 22l5.375-1.241A9.959 9.959 0 0011.99 22C17.523 22 22 17.523 22 11.99 22 6.477 17.523 2 11.99 2z"/></svg>
                    {sending ? 'Enviando...' : 'Hacer pedido por WhatsApp'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  )
}
