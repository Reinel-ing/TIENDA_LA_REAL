import { useEffect, useState, useRef } from 'react'
import api, { cop } from '../api'

export default function Ventas() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [clientes, setClientes] = useState([])
  const [cart, setCart] = useState([])
  const [q, setQ] = useState('')
  const [catFil, setCatFil] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [tipoPago, setTipoPago] = useState('efectivo')
  const [procesando, setProcesando] = useState(false)
  const [confirmado, setConfirmado] = useState(null)
  const searchRef = useRef()

  useEffect(() => {
    api.get('/categorias').then(r => setCategorias(r.data))
    api.get('/clientes').then(r => setClientes(r.data))
  }, [])

  useEffect(() => {
    api.get('/productos/buscar', { params: { q, cat: catFil } }).then(r => setProductos(r.data))
  }, [q, catFil])

  const addToCart = p => {
    if (p.stock === 0) return
    setCart(c => {
      const ex = c.find(i => i.producto_id === p.id)
      if (ex) {
        if (ex.cantidad >= p.stock) return c
        return c.map(i => i.producto_id === p.id
          ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
          : i)
      }
      return [...c, { producto_id: p.id, nombre: p.nombre, precio_unitario: p.precio_venta, cantidad: 1, subtotal: p.precio_venta, stock: p.stock }]
    })
  }

  const changeQty = (id, delta) => setCart(c => c
    .map(i => i.producto_id === id ? { ...i, cantidad: i.cantidad + delta, subtotal: (i.cantidad + delta) * i.precio_unitario } : i)
    .filter(i => i.cantidad > 0))

  const total = cart.reduce((s, i) => s + i.subtotal, 0)

  const cobrar = async () => {
    if (!cart.length) return
    setProcesando(true)
    try {
      const r = await api.post('/ventas', { cliente_id: clienteId || null, total, tipo_pago: tipoPago, items: cart })
      setConfirmado(r.data.venta_id)
      setCart([])
      setClienteId('')
      setTipoPago('efectivo')
      // Refrescar productos para actualizar stock
      api.get('/productos/buscar', { params: { q, cat: catFil } }).then(r => setProductos(r.data))
    } finally { setProcesando(false) }
  }

  if (confirmado) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '80vh' }}>
        <div className="text-center">
          <div style={{ fontSize: '4rem' }}>✅</div>
          <h3 className="mt-3">¡Venta #{confirmado} registrada!</h3>
          <button className="btn btn-primary mt-3" onClick={() => setConfirmado(null)}>
            <i className="fa-solid fa-plus me-2" />Nueva venta
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="topbar">
        <h4><i className="fa-solid fa-cash-register me-2" />Punto de Venta</h4>
      </div>
      <div className="page-body" style={{ paddingBottom: 0 }}>
        <div className="pos-layout">
          {/* Catálogo */}
          <div className="pos-panel">
            <div className="pos-panel-header">
              <div className="d-flex gap-2">
                <input ref={searchRef} className="form-control form-control-sm" placeholder="Buscar producto o código..."
                  value={q} onChange={e => setQ(e.target.value)} />
                <select className="form-select form-select-sm" style={{ maxWidth: 160 }}
                  value={catFil} onChange={e => setCatFil(e.target.value)}>
                  <option value="">Todas</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="pos-products">
              {productos.map(p => (
                <div key={p.id} className={`pos-prod ${p.stock === 0 ? 'agotado' : ''}`} onClick={() => addToCart(p)}>
                  <div style={{ fontSize: '1.6rem' }}>🛍️</div>
                  <div className="pos-prod-name">{p.nombre}</div>
                  <div className="pos-prod-price">{cop(p.precio_venta)}</div>
                  <div className="pos-prod-stock">Stock: {p.stock}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Carrito */}
          <div className="pos-panel">
            <div className="pos-panel-header">
              <strong>Carrito</strong> <span className="text-muted small">({cart.length} items)</span>
            </div>
            <div className="cart-items">
              {cart.length === 0 && (
                <p className="text-center text-muted mt-4">Toca un producto para agregarlo</p>
              )}
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
            <div className="pos-footer">
              <div className="mb-2">
                <select className="form-select form-select-sm mb-2" value={clienteId} onChange={e => setClienteId(e.target.value)}>
                  <option value="">Cliente general</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <div className="d-flex gap-2">
                  {['efectivo', 'transferencia', 'nequi', 'daviplata'].map(t => (
                    <button key={t} className={`btn btn-sm flex-fill ${tipoPago === t ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setTipoPago(t)} style={{ fontSize: '.72rem', padding: '4px 2px', textTransform: 'capitalize' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="fw-bold">TOTAL</span>
                <span className="fw-bold fs-5 text-primary">{cop(total)}</span>
              </div>
              <button className="btn btn-success w-100" onClick={cobrar}
                disabled={!cart.length || procesando}>
                <i className="fa-solid fa-check me-2" />
                {procesando ? 'Procesando...' : 'Cobrar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
