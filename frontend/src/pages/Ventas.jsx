import { useEffect, useState, useRef } from 'react'
import api, { cop } from '../api'
import useAutoRefresh from '../hooks/useAutoRefresh'
import LiveBadge from '../components/LiveBadge'

function abrirRecibo(venta, items, config) {
  const f = n => `$${Number(n).toLocaleString('es-CO')}`
  const lineas = items.map(i =>
    `<tr><td>${i.producto_nombre}</td><td style="text-align:center">${i.cantidad}</td>` +
    `<td style="text-align:right">${f(i.precio_unitario)}</td>` +
    `<td style="text-align:right"><b>${f(i.subtotal)}</b></td></tr>`
  ).join('')
  const logoUrl = window.location.origin + '/logo.jpg'
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Recibo #${venta.id}</title>
<style>
  body{font-family:'Courier New',monospace;font-size:13px;width:320px;margin:0 auto;padding:16px;color:#111}
  h2{text-align:center;font-size:17px;margin:0 0 2px}
  .c{text-align:center} .r{text-align:right}
  hr{border:none;border-top:1px dashed #555;margin:8px 0}
  table{width:100%;border-collapse:collapse}
  td,th{padding:3px 2px;vertical-align:top}
  .big{font-size:16px;font-weight:bold}
  img.logo{display:block;margin:0 auto 6px;width:70px;height:70px;border-radius:50%;object-fit:cover}
  @media print{body{width:100%;padding:0}}
</style></head><body>
<img class="logo" src="${logoUrl}" alt="Logo" />
<h2>${config.nombre || 'Tienda La Real'}</h2>
${config.ciudad ? `<p class="c" style="margin:2px 0">${config.ciudad}</p>` : ''}
${config.direccion ? `<p class="c" style="margin:2px 0">${config.direccion}</p>` : ''}
${config.horario ? `<p class="c" style="margin:2px 0">${config.horario}</p>` : ''}
<hr>
<p style="margin:3px 0"><b>Recibo:</b> #${venta.id}</p>
<p style="margin:3px 0"><b>Fecha:</b> ${(venta.created_at || '').slice(0,16)}</p>
<p style="margin:3px 0"><b>Cliente:</b> ${venta.cliente_nombre}</p>
<p style="margin:3px 0"><b>Pago:</b> ${venta.tipo_pago}</p>
<hr>
<table>
  <thead><tr><th>Producto</th><th style="text-align:center">Cant</th><th style="text-align:right">Precio</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${lineas}</tbody>
</table>
<hr>
<table><tr>
  <td class="big">TOTAL</td>
  <td class="r big">${f(venta.total)}</td>
</tr></table>
<hr>
<p class="c" style="margin-top:12px">¡Gracias por su compra!</p>
<p class="c">${config.nombre || 'Tienda La Real'}</p>
<script>window.onload=()=>{window.print();}<\/script>
</body></html>`
  const w = window.open('', '_blank', 'width=400,height=650,toolbar=0,menubar=0')
  if (w) { w.document.write(html); w.document.close() }
}

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
  const [recibo, setRecibo] = useState(null)
  const [mobileTab, setMobileTab] = useState('productos')
  const [scanCode, setScanCode] = useState('')
  const [scanFlash, setScanFlash] = useState(null)
  const searchRef = useRef()
  const scanRef = useRef()

  useEffect(() => {
    api.get('/categorias').then(r => setCategorias(r.data))
    api.get('/clientes').then(r => setClientes(r.data))
  }, [])

  const loadProductos = () => api.get('/productos/buscar', { params: { q, cat: catFil } }).then(r => setProductos(r.data))
  useEffect(() => { loadProductos() }, [q, catFil])
  const lastUpdated = useAutoRefresh(loadProductos, 30000)

  const showFlash = (ok, msg) => {
    setScanFlash({ ok, msg })
    setTimeout(() => setScanFlash(null), 2500)
  }

  const addByCode = async codigo => {
    const code = codigo.trim()
    if (!code) return
    try {
      const r = await api.get('/productos/scan', { params: { codigo: code } })
      if (r.data) {
        const p = r.data
        if (p.stock === 0) {
          showFlash(false, `Sin stock: ${p.nombre}`)
        } else {
          addToCart(p)
          showFlash(true, `✓ ${p.nombre}`)
        }
      } else {
        showFlash(false, `Código no encontrado: ${code}`)
      }
    } catch { showFlash(false, 'Error al buscar') }
    setScanCode('')
    setTimeout(() => scanRef.current?.focus(), 50)
  }

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
    // En móvil, ir al carrito al agregar
    if (window.innerWidth <= 768) setMobileTab('carrito')
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
      const vid = r.data.venta_id
      const rec = await api.get(`/ventas/${vid}/recibo`)
      setRecibo(rec.data)
      setCart([])
      setClienteId('')
      setTipoPago('efectivo')
      setMobileTab('productos')
      api.get('/productos/buscar', { params: { q, cat: catFil } }).then(r => setProductos(r.data))
    } finally { setProcesando(false) }
  }

  const cerrarRecibo = () => setRecibo(null)

  return (
    <>
      <div className="topbar">
        <h4><i className="fa-solid fa-cash-register me-2" />Punto de Venta</h4>
        <LiveBadge lastUpdated={lastUpdated} />
      </div>
      {/* Pestañas móvil */}
      <div className="d-md-none" style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', background: '#fff', position: 'sticky', top: 56, zIndex: 40 }}>
        <button onClick={() => setMobileTab('productos')}
          style={{ flex: 1, padding: '10px', border: 'none', background: 'none', fontWeight: 600, fontSize: '.88rem',
            borderBottom: mobileTab === 'productos' ? '2px solid #2563eb' : '2px solid transparent',
            color: mobileTab === 'productos' ? '#2563eb' : '#64748b' }}>
          <i className="fa-solid fa-boxes-stacking me-1" />Productos
        </button>
        <button onClick={() => setMobileTab('carrito')}
          style={{ flex: 1, padding: '10px', border: 'none', background: 'none', fontWeight: 600, fontSize: '.88rem',
            borderBottom: mobileTab === 'carrito' ? '2px solid #2563eb' : '2px solid transparent',
            color: mobileTab === 'carrito' ? '#2563eb' : '#64748b', position: 'relative' }}>
          <i className="fa-solid fa-cart-shopping me-1" />Carrito
          {cart.length > 0 && <span style={{ marginLeft: 4, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: '.68rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{cart.reduce((s,i)=>s+i.cantidad,0)}</span>}
        </button>
      </div>

      <div className="page-body" style={{ paddingBottom: 0 }}>
        <div className="pos-layout">
          {/* Catálogo */}
          <div className={`pos-panel ${mobileTab === 'carrito' ? 'pos-mobile-hidden' : ''}`}>
            <div className="pos-panel-header">
              {/* Barra de escaneo */}
              <div style={{ marginBottom: 8 }}>
                <div className="d-flex gap-2 align-items-center">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text"
                      style={{ background: '#f0fdf4', borderColor: '#86efac', color: '#16a34a' }}>
                      <i className="fa-solid fa-barcode" />
                    </span>
                    <input
                      ref={scanRef}
                      className="form-control form-control-sm"
                      placeholder="Escanea código de barras aquí…"
                      value={scanCode}
                      onChange={e => setScanCode(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addByCode(scanCode) } }}
                      style={{ borderColor: '#86efac', background: '#f0fdf4' }}
                      autoComplete="off"
                    />
                  </div>
                  {scanFlash && (
                    <div style={{
                      padding: '4px 10px', borderRadius: 8, fontSize: '.78rem', fontWeight: 700,
                      whiteSpace: 'nowrap', flexShrink: 0,
                      background: scanFlash.ok ? '#dcfce7' : '#fee2e2',
                      color: scanFlash.ok ? '#166534' : '#991b1b',
                      border: `1px solid ${scanFlash.ok ? '#86efac' : '#fca5a5'}`,
                    }}>
                      {scanFlash.msg}
                    </div>
                  )}
                </div>
              </div>
              {/* Búsqueda manual */}
              <div className="d-flex gap-2">
                <input ref={searchRef} className="form-control form-control-sm" placeholder="Buscar por nombre..."
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
                  {p.imagen
                    ? <img src={p.imagen} alt={p.nombre} style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', marginBottom: 4 }} />
                    : <div style={{ fontSize: '1.6rem' }}>🛍️</div>}
                  <div className="pos-prod-name">{p.nombre}</div>
                  <div className="pos-prod-price">{cop(p.precio_venta)}</div>
                  <div className="pos-prod-stock">Stock: {p.stock}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Carrito */}
          <div className={`pos-panel ${mobileTab === 'productos' ? 'pos-mobile-hidden' : ''}`}>
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

      {/* Modal recibo */}
      {recibo && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header" style={{ background: '#1e40af', color: '#fff' }}>
                <h5 className="modal-title">
                  <i className="fa-solid fa-circle-check me-2" />Venta #{recibo.venta.id} registrada
                </h5>
              </div>
              <div className="modal-body">
                {/* Recibo preview */}
                <div style={{ fontFamily: 'monospace', fontSize: 13, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: 16 }}>
                  <div className="text-center mb-2">
                    <img src="/logo.jpg" alt="Logo" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid #facc15' }} />
                  </div>
                  <div className="text-center fw-bold" style={{ fontSize: 15 }}>{recibo.config.nombre}</div>
                  {recibo.config.direccion && <div className="text-center text-muted small">{recibo.config.direccion}</div>}
                  <hr style={{ borderTop: '1px dashed #94a3b8', margin: '8px 0' }} />
                  <div><b>Recibo:</b> #{recibo.venta.id}</div>
                  <div><b>Fecha:</b> {recibo.venta.created_at?.slice(0, 16)}</div>
                  <div><b>Cliente:</b> {recibo.venta.cliente_nombre}</div>
                  <div><b>Pago:</b> <span className="text-capitalize">{recibo.venta.tipo_pago}</span></div>
                  <hr style={{ borderTop: '1px dashed #94a3b8', margin: '8px 0' }} />
                  <table style={{ width: '100%', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <th>Producto</th><th className="text-center">Cant</th><th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recibo.items.map(i => (
                        <tr key={i.id}>
                          <td>{i.producto_nombre}</td>
                          <td className="text-center">{i.cantidad}</td>
                          <td className="text-end">{cop(i.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <hr style={{ borderTop: '1px dashed #94a3b8', margin: '8px 0' }} />
                  <div className="d-flex justify-content-between">
                    <span className="fw-bold" style={{ fontSize: 15 }}>TOTAL</span>
                    <span className="fw-bold text-primary" style={{ fontSize: 15 }}>{cop(recibo.venta.total)}</span>
                  </div>
                  <div className="text-center text-muted mt-2 small">¡Gracias por su compra!</div>
                </div>
              </div>
              <div className="modal-footer justify-content-between">
                <button className="btn btn-outline-secondary" onClick={cerrarRecibo}>
                  <i className="fa-solid fa-plus me-1" />Nueva venta
                </button>
                <button className="btn btn-primary" onClick={() => abrirRecibo(recibo.venta, recibo.items, recibo.config)}>
                  <i className="fa-solid fa-print me-2" />Imprimir recibo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
