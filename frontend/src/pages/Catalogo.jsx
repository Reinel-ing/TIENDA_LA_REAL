import { useEffect, useState, useRef, useCallback } from 'react'
import api, { cop } from '../api'

const EMOJIS = { 'Lácteos': '🥛', 'Bebidas': '🥤', 'Cerveza': '🍺', 'Gaseosas': '🥤', 'Granos': '🌾', 'Carnes': '🥩', 'Verduras': '🥦', 'Frutas': '🍎', 'Aseo': '🧼', 'Panadería': '🍞', 'Snacks': '🍟', 'Otros': '📦' }
const getEmoji = cat => EMOJIS[cat] || '🛍️'

function groupByMarca(prods) {
  const groups = {}
  prods.forEach(p => {
    const key = (p.marca || '').trim()
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  })
  return Object.entries(groups).sort(([a], [b]) => {
    if (!a && b) return 1
    if (a && !b) return -1
    return a.localeCompare(b, 'es')
  })
}

// ── Carrusel de promociones ────────────────────────────────────────────────────
function Carrusel({ items }) {
  const [idx, setIdx] = useState(0)
  const timerRef = useRef()
  const touchRef = useRef(null)

  const next = useCallback(() => setIdx(i => (i + 1) % items.length), [items.length])
  const prev = () => setIdx(i => (i - 1 + items.length) % items.length)

  useEffect(() => {
    if (items.length <= 1) return
    timerRef.current = setInterval(next, 4500)
    return () => clearInterval(timerRef.current)
  }, [next, items.length])

  const resetTimer = () => {
    clearInterval(timerRef.current)
    if (items.length > 1) timerRef.current = setInterval(next, 4500)
  }

  const onTouchStart = e => { touchRef.current = e.touches[0].clientX }
  const onTouchEnd = e => {
    if (touchRef.current === null) return
    const diff = touchRef.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 45) { diff > 0 ? next() : prev(); resetTimer() }
    touchRef.current = null
  }

  const goTo = i => { setIdx(i); resetTimer() }

  if (!items.length) return null

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px 4px', marginBottom: 12 }}>
      <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', userSelect: 'none' }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

        <div style={{ display: 'flex', transition: 'transform .45s cubic-bezier(.4,0,.2,1)', transform: `translateX(-${idx * 100}%)` }}>
          {items.map(p => (
            <div key={p.id} style={{
              minWidth: '100%',
              height: 'clamp(160px, 36vw, 260px)',
              background: p.color_fondo,
              color: p.color_texto,
              display: 'flex', alignItems: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              {p.imagen && (
                <>
                  <img src={p.imagen} alt=""
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, height: '100%', width: '58%', objectFit: 'contain', objectPosition: 'center right' }} />
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${p.color_fondo} 38%, ${p.color_fondo}bb 55%, transparent 72%)` }} />
                </>
              )}
              <div style={{ position: 'relative', padding: 'clamp(14px, 3vw, 24px) clamp(18px, 4vw, 32px)', maxWidth: p.imagen ? '55%' : '100%' }}>
                <div style={{ fontWeight: 900, fontSize: 'clamp(1rem, 4vw, 1.55rem)', lineHeight: 1.2, letterSpacing: '-.01em' }}>
                  {p.titulo}
                </div>
                {p.descripcion && (
                  <div style={{ opacity: .9, marginTop: 6, fontSize: 'clamp(.78rem, 2.3vw, 1rem)' }}>
                    {p.descripcion}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {items.length > 1 && (
          <>
            <button onClick={() => { prev(); resetTimer() }}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.38)', border: 'none', borderRadius: '50%', width: 34, height: 34, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem' }}>
              <i className="fa-solid fa-chevron-left" />
            </button>
            <button onClick={() => { next(); resetTimer() }}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.38)', border: 'none', borderRadius: '50%', width: 34, height: 34, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem' }}>
              <i className="fa-solid fa-chevron-right" />
            </button>
          </>
        )}
      </div>

      {items.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {items.map((_, i) => (
            <div key={i} onClick={() => goTo(i)}
              style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 4, cursor: 'pointer', background: i === idx ? '#f59e0b' : '#cbd5e1', transition: 'all .3s' }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Popup bienvenida con bono ──────────────────────────────────────────────────
function BienvenidaPopup({ config, onClose }) {
  const pct = parseInt(config.bono_porcentaje || 10)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 22, maxWidth: 360, width: '100%', overflow: 'hidden', boxShadow: '0 30px 90px rgba(0,0,0,.45)', animation: 'popupIn .35s cubic-bezier(.34,1.56,.64,1) both' }}>
        <style>{`@keyframes popupIn { from { opacity:0; transform: scale(.85) translateY(20px) } to { opacity:1; transform: scale(1) translateY(0) } }`}</style>
        <div style={{ background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 55%, #fbbf24 100%)', padding: '28px 24px 20px', textAlign: 'center' }}>
          <img src="/logo.jpg" alt="Logo" style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff' }} />
          <h5 style={{ color: '#fff', margin: '10px 0 4px', fontWeight: 800, fontSize: '1.2rem' }}>¡Bienvenido!</h5>
          <p style={{ color: 'rgba(255,255,255,.9)', margin: 0, fontSize: '.88rem' }}>{config.nombre || 'Tienda La Real'}</p>
        </div>
        <div style={{ padding: '22px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.8rem', lineHeight: 1, marginBottom: 10 }}>🎁</div>
          <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderRadius: 14, padding: '14px 18px', marginBottom: 14, border: '2px solid #fbbf24' }}>
            <div style={{ fontWeight: 900, fontSize: '2.2rem', color: '#92400e', lineHeight: 1 }}>-{pct}%</div>
            <div style={{ fontWeight: 700, color: '#78350f', fontSize: '.88rem', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>En tu primera compra</div>
          </div>
          <p style={{ color: '#475569', fontSize: '.85rem', marginBottom: 18, lineHeight: 1.5 }}>
            {config.bono_texto || `¡Bono de bienvenida! Obtén ${pct}% de descuento en tu primera compra.`}
          </p>
          <button onClick={onClose} style={{ width: '100%', background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 0', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginBottom: 8 }}>
            🛒 Ver productos y aprovechar
          </button>
          <button onClick={onClose} style={{ background: 'transparent', color: '#94a3b8', border: 'none', fontSize: '.8rem', cursor: 'pointer', padding: 4 }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Catálogo principal ────────────────────────────────────────────────────────
export default function Catalogo() {
  const [productos, setProductos]     = useState([])
  const [categorias, setCategorias]   = useState([])
  const [config, setConfig]           = useState({})
  const [promociones, setPromociones] = useState([])
  const [catFil, setCatFil]           = useState('all')
  const [search, setSearch]           = useState('')
  const [cart, setCart]               = useState([])
  const navegandoRef                  = useRef(false)
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [step, setStep]               = useState('cart')
  const [form, setForm]               = useState({ nombre: '', telefono: '', direccion: '', notas: '', tipo_entrega: 'domicilio', metodo_pago: 'efectivo' })
  const [regForm, setRegForm]         = useState({ nombre: '', telefono: '' })
  const [regLoading, setRegLoading]   = useState(false)
  const [sending, setSending]         = useState(false)
  const [showPopup, setShowPopup]     = useState(false)
  const [esNuevo, setEsNuevo]         = useState(!localStorage.getItem('tlr_compro'))
  const [verificandoBono, setVerificandoBono] = useState(false)
  const bonoActivo  = config.bono_activo === '1' && esNuevo
  const bonoPct     = parseFloat(config.bono_porcentaje || 10)

  useEffect(() => {
    api.get('/productos/catalogo').then(r => {
      setProductos(r.data)
      const cats = [...new Set(r.data.map(p => p.categoria_nombre).filter(Boolean))]
      setCategorias(cats)
    })
    api.get('/config').then(r => {
      setConfig(r.data)
      if (r.data.bono_activo === '1' && !localStorage.getItem('tlr_compro') && !localStorage.getItem('tlr_bienvenida_vista')) {
        setTimeout(() => setShowPopup(true), 900)
      }
    })
    api.get('/promociones').then(r => setPromociones(r.data))
  }, [])

  // Avisa antes de cerrar/recargar la página si hay productos en el carrito.
  // Si el cliente confirma la recarga, la página se reinicia y el carrito
  // queda vacío (no se guarda). Si cancela, se queda con su carrito intacto.
  useEffect(() => {
    const handler = e => {
      if (cart.length > 0 && !navegandoRef.current) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [cart])

  const cerrarPopup = () => {
    setShowPopup(false)
    localStorage.setItem('tlr_bienvenida_vista', '1')
  }

  const verificarNuevo = async telefono => {
    const digits = telefono.replace(/\D/g, '')
    if (digits.length < 10) return
    setVerificandoBono(true)
    try {
      const r = await api.get('/catalogo/es-nuevo', { params: { telefono: digits } })
      setEsNuevo(r.data.nuevo)
      if (!r.data.nuevo) localStorage.setItem('tlr_compro', '1')
    } finally { setVerificandoBono(false) }
  }

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

  const total      = cart.reduce((s, i) => s + i.subtotal, 0)
  const descuento  = bonoActivo ? Math.round(total * bonoPct / 100) : 0
  const totalFinal = total - descuento
  const totalItems = cart.reduce((s, i) => s + i.cantidad, 0)

  const filteredProds = (catFil === 'all' ? productos : productos.filter(p => p.categoria_nombre === catFil))
    .filter(p => !search ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.marca || '').toLowerCase().includes(search.toLowerCase()))

  const irACheckout = () => {
    const saved = localStorage.getItem('tlr_cliente')
    if (saved) {
      try {
        const c = JSON.parse(saved)
        setForm(f => ({ ...f, nombre: c.nombre || f.nombre, telefono: c.telefono || f.telefono }))
      } catch {}
      setStep('checkout')
    } else {
      setStep('register')
    }
  }

  const onRegistrar = async e => {
    e.preventDefault()
    setRegLoading(true)
    try {
      const r = await api.post('/catalogo/registrar', regForm)
      const c = r.data.cliente
      localStorage.setItem('tlr_cliente', JSON.stringify(c))
      setForm(f => ({ ...f, nombre: c.nombre, telefono: c.telefono }))
      setStep('checkout')
    } catch {
      setStep('checkout')
    } finally {
      setRegLoading(false)
    }
  }

  const enviarPedido = async e => {
    e.preventDefault()
    if (!cart.length) return
    setSending(true)
    try {
      const notaExtra = bonoActivo
        ? `${form.notas ? form.notas + '\n' : ''}🎁 Bono primera compra -${bonoPct}% (-$${descuento.toLocaleString('es-CO')})`
        : form.notas
      const r = await api.post('/catalogo/pedido', { ...form, notas: notaExtra, total: totalFinal, items: cart })
      if (r.data.success) {
        navegandoRef.current = true
        localStorage.setItem('tlr_compro', '1')
        setCart([])
        window.location.href = `/catalogo/confirmado/${r.data.pedido_id}`
      }
    } finally { setSending(false) }
  }

  return (
    <div className="catalogo-page">
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes popupIn { from { opacity:0; transform: scale(.85) translateY(20px) } to { opacity:1; transform: scale(1) translateY(0) } }
      `}</style>

      {showPopup && <BienvenidaPopup config={config} onClose={cerrarPopup} />}

      {/* ── Header con búsqueda ── */}
      <div className="catalogo-header">
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <img src="/logo.jpg" alt="Logo"
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,.8)', flexShrink: 0 }} />
            <div>
              <h2 style={{ color: '#fff', margin: '0 0 2px', fontWeight: 800, fontSize: '1.2rem' }}>
                {config.nombre || 'Tienda La Real'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,.8)', margin: 0, fontSize: '.8rem' }}>
                {config.direccion}{config.ciudad ? ` · ${config.ciudad}` : ''}{config.horario ? ` · ${config.horario}` : ''}
              </p>
            </div>
          </div>

          {/* Botón pedir dirección por WhatsApp */}
          {config.whatsapp && (
            <a href={`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(`Hola! Quiero ir a la tienda a comprar, ¿me puede dar la dirección exacta o ubicación? Gracias 🙏`)}`}
              target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.18)', color: '#fff', borderRadius: 20, padding: '6px 16px', fontSize: '.8rem', fontWeight: 700, textDecoration: 'none', marginBottom: 12, border: '1px solid rgba(255,255,255,.35)' }}>
              <i className="fa-brands fa-whatsapp" style={{ fontSize: '1rem' }} />
              ¿Dónde queda la tienda?
            </a>
          )}

          {/* Barra de búsqueda */}
          <div style={{ position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#b45309', fontSize: '.85rem', pointerEvents: 'none' }} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar productos, marcas..."
              style={{ width: '100%', padding: '11px 36px 11px 38px', borderRadius: 14, border: 'none', fontSize: '.9rem', background: 'rgba(255,255,255,.95)', color: '#1e293b', outline: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '.8rem', padding: 4 }}>
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Carrusel */}
      {!search && promociones.length > 0 && (
        <div style={{ paddingTop: 16 }}>
          <Carrusel items={promociones} />
        </div>
      )}

      {/* Bono banner */}
      {bonoActivo && !showPopup && !search && (
        <div style={{ maxWidth: 900, margin: '0 auto 8px', padding: '0 14px' }}>
          <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '1.5px solid #fbbf24', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.3rem' }}>🎁</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, color: '#92400e', fontSize: '.88rem' }}>Bono primera compra: -{bonoPct}% de descuento</span>
              <span style={{ color: '#78350f', fontSize: '.8rem', marginLeft: 6 }}>— Se aplica automáticamente</span>
            </div>
          </div>
        </div>
      )}

      {/* Categorías */}
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

      {/* ── Productos agrupados por marca ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '8px 10px 110px' }}>
        {search && filteredProds.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔍</div>
            <p>No se encontró "<strong>{search}</strong>"</p>
          </div>
        )}

        {groupByMarca(filteredProds).map(([marca, prods]) => (
          <div key={marca || '__sin_marca__'}>
            {marca && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 8px' }}>
                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                <span style={{ fontWeight: 700, fontSize: '.78rem', color: '#92400e', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '.06em' }}>{marca}</span>
                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              </div>
            )}
            <div className="product-grid">
              {prods.map(p => (
                <div key={p.id} className={`prod-card ${p.stock === 0 ? 'agotado' : ''}`} onClick={() => addToCart(p)}>
                  <div className="prod-card-media">
                    {p.imagen
                      ? <img src={p.imagen} alt={p.nombre} className="prod-card-img" />
                      : <div style={{ fontSize: '2.2rem' }}>{getEmoji(p.categoria_nombre)}</div>}
                  </div>
                  <div className="prod-card-info">
                    {p.marca && <div className="prod-marca">{p.marca}</div>}
                    <div className="prod-name">{p.nombre}</div>
                    <div className="prod-price">{cop(p.precio_venta)}</div>
                    {bonoActivo && p.stock > 0 && (
                      <div style={{ fontSize: '.68rem', color: '#059669', fontWeight: 600, marginTop: 2 }}>
                        Con bono: {cop(p.precio_venta * (1 - bonoPct / 100))}
                      </div>
                    )}
                    {p.stock === 0 && <span className="badge bg-danger mt-1" style={{ fontSize: '.65rem' }}>Agotado</span>}
                  </div>
                  {p.stock > 0 && <div className="prod-add-btn">+</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Barra inferior de carrito (reemplaza FAB) ── */}
      {totalItems > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
          padding: '12px 20px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 -4px 20px rgba(0,0,0,.18)',
          animation: 'slideUp .3s cubic-bezier(.34,1.56,.64,1)',
        }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,.85)', fontSize: '.72rem', fontWeight: 600, marginBottom: 1 }}>
              {totalItems} producto{totalItems !== 1 ? 's' : ''} seleccionado{totalItems !== 1 ? 's' : ''}
            </div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-.01em' }}>{cop(totalFinal)}</div>
          </div>
          <button onClick={() => { setStep('cart'); setDrawerOpen(true) }}
            style={{ background: '#fff', color: '#d97706', border: 'none', borderRadius: 14, padding: '11px 22px', fontWeight: 700, fontSize: '.95rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
            Ver pedido <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
      )}

      {/* ── Drawer ── */}
      {drawerOpen && (
        <>
          <div className="overlay" onClick={() => setDrawerOpen(false)} />
          <div className="drawer">
            <div className="drawer-header">
              <strong>
                {step === 'cart' ? '🛒 Mi pedido' : step === 'register' ? '👤 Crear cuenta' : '📋 Mis datos'}
              </strong>
              <button className="btn-close" onClick={() => setDrawerOpen(false)} />
            </div>

            {/* ── Paso: carrito ── */}
            {step === 'cart' && (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: 12, minHeight: 0, WebkitOverflowScrolling: 'touch' }}>
                  {cart.map(item => (
                    <div key={item.producto_id} className="cart-item">
                      <div className="cart-item-name">{item.nombre}</div>
                      <div className="cart-qty">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => changeQty(item.producto_id, -1)}>−</button>
                        <span style={{ minWidth: 24, textAlign: 'center' }}>{item.cantidad}</span>
                        <button className="btn btn-sm btn-outline-secondary"
                          onClick={() => changeQty(item.producto_id, 1)}
                          disabled={item.cantidad >= item.stock}>+</button>
                      </div>
                      <div className="fw-semibold text-primary" style={{ minWidth: 70, textAlign: 'right' }}>{cop(item.subtotal)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 16, borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                  {bonoActivo && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '.85rem' }}>
                      <span style={{ color: '#059669', fontWeight: 600 }}>🎁 Bono primera compra (-{bonoPct}%)</span>
                      <span style={{ color: '#059669', fontWeight: 700 }}>-{cop(descuento)}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between mb-3 fw-bold">
                    <span>Total</span>
                    <span className="text-primary fs-5">{cop(totalFinal)}</span>
                  </div>
                  <button className="btn btn-success w-100 btn-lg" onClick={irACheckout}>
                    Continuar <i className="fa-solid fa-arrow-right ms-2" />
                  </button>
                </div>
              </>
            )}

            {/* ── Paso: registro ── */}
            {step === 'register' && (
              <form onSubmit={onRegistrar} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: 20, minHeight: 0, WebkitOverflowScrolling: 'touch' }}>
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '2px solid #fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 12px' }}>👤</div>
                    <h6 style={{ fontWeight: 800, color: '#1e293b', marginBottom: 4, fontSize: '1.05rem' }}>Crea tu cuenta</h6>
                    <p style={{ color: '#64748b', fontSize: '.85rem', margin: 0 }}>
                      Para hacer tu pedido y que podamos atenderte mejor
                    </p>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tu nombre completo *</label>
                    <input className="form-control form-control-lg" required
                      value={regForm.nombre}
                      onChange={e => setRegForm(f => ({ ...f, nombre: e.target.value }))}
                      placeholder="Ej: María García" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">WhatsApp *</label>
                    <input className="form-control form-control-lg" type="tel" required
                      value={regForm.telefono}
                      onChange={e => setRegForm(f => ({ ...f, telefono: e.target.value }))}
                      placeholder="Ej: 3001234567" />
                  </div>
                  <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 14px', fontSize: '.82rem', color: '#166534', border: '1px solid #bbf7d0' }}>
                    <i className="fa-solid fa-lock me-2" />
                    Tu información es privada y solo se usa para gestionar tu pedido.
                  </div>
                </div>
                <div style={{ padding: 16, borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  <button type="submit" className="btn btn-success w-100 btn-lg" disabled={regLoading} style={{ fontWeight: 700 }}>
                    {regLoading ? 'Guardando...' : 'Guardar y continuar →'}
                  </button>
                  <button type="button" className="btn btn-outline-secondary w-100" onClick={() => setStep('cart')}>
                    ← Volver al carrito
                  </button>
                </div>
              </form>
            )}

            {/* ── Paso: checkout ── */}
            {step === 'checkout' && (
              <form onSubmit={enviarPedido} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: 16, minHeight: 0, WebkitOverflowScrolling: 'touch' }}>

                  {/* Tipo de entrega */}
                  <div className="mb-4">
                    <label className="form-label small fw-bold text-uppercase" style={{ letterSpacing: '.05em', color: '#64748b' }}>¿Cómo lo quieres recibir?</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { val: 'domicilio', icon: '🛵', title: 'Domicilio', sub: `+$${parseInt(config.domicilio_costo || 1000).toLocaleString('es-CO')}` },
                        { val: 'recoger',   icon: '🏪', title: 'Lo recojo', sub: 'Gratis' },
                      ].map(op => (
                        <div key={op.val} onClick={() => setForm(f => ({ ...f, tipo_entrega: op.val }))}
                          style={{
                            border: `2px solid ${form.tipo_entrega === op.val ? '#f59e0b' : '#e2e8f0'}`,
                            borderRadius: 14, padding: '14px 10px', textAlign: 'center', cursor: 'pointer',
                            background: form.tipo_entrega === op.val ? '#fffbeb' : '#fafafa',
                            transition: 'all .18s',
                          }}>
                          <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>{op.icon}</div>
                          <div style={{ fontWeight: 700, fontSize: '.88rem', color: '#1e293b' }}>{op.title}</div>
                          <div style={{ fontSize: '.72rem', color: form.tipo_entrega === op.val ? '#d97706' : '#94a3b8', fontWeight: 600 }}>{op.sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Datos personales */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tu nombre *</label>
                    <input className="form-control" required value={form.nombre}
                      onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">WhatsApp *</label>
                    <input className="form-control" type="tel" required value={form.telefono}
                      onChange={e => {
                        setForm(f => ({ ...f, telefono: e.target.value }))
                        verificarNuevo(e.target.value)
                      }} />
                    {verificandoBono && (
                      <div className="small text-muted mt-1">
                        <span className="spinner-border spinner-border-sm me-1" style={{ width: '0.7rem', height: '0.7rem' }} />Verificando bono…
                      </div>
                    )}
                    {!verificandoBono && form.telefono.replace(/\D/g,'').length >= 10 && config.bono_activo === '1' && (
                      esNuevo
                        ? <div className="small text-success fw-semibold mt-1">🎁 Bono primera compra aplicado (-{bonoPct}%)</div>
                        : <div className="small text-warning fw-semibold mt-1">⚠️ Este número ya tiene una compra — bono no aplica</div>
                    )}
                  </div>

                  {/* Dirección solo si es domicilio */}
                  {form.tipo_entrega === 'domicilio' && (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Dirección de entrega *</label>
                      <input className="form-control" required value={form.direccion}
                        onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
                        placeholder="Ej: Calle 5 #12-34, Barrio..." />
                    </div>
                  )}

                  {/* Método de pago */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-uppercase" style={{ letterSpacing: '.05em', color: '#64748b' }}>Método de pago</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        { val: 'efectivo',    icon: '💵', label: 'Efectivo', sub: config.domicilio_activo !== '0' && form.tipo_entrega === 'domicilio' ? 'Pagas al recibir' : 'Pagas en tienda' },
                        ...(config.nequi       ? [{ val: 'nequi',       icon: '📱', label: 'Nequi',       sub: config.nequi }]       : []),
                        ...(config.daviplata   ? [{ val: 'daviplata',   icon: '📱', label: 'Daviplata',   sub: config.daviplata }]   : []),
                        ...(config.bancolombia ? [{ val: 'bancolombia', icon: '🏦', label: 'Bancolombia', sub: config.bancolombia }] : []),
                      ].map(op => (
                        <div key={op.val} onClick={() => setForm(f => ({ ...f, metodo_pago: op.val }))}
                          style={{
                            border: `2px solid ${form.metodo_pago === op.val ? '#22c55e' : '#e2e8f0'}`,
                            borderRadius: 12, padding: '11px 14px', cursor: 'pointer',
                            background: form.metodo_pago === op.val ? '#f0fdf4' : '#fafafa',
                            display: 'flex', alignItems: 'center', gap: 12, transition: 'all .18s',
                          }}>
                          <span style={{ fontSize: '1.4rem' }}>{op.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '.88rem', color: '#1e293b' }}>{op.label}</div>
                            <div style={{ fontSize: '.75rem', color: '#64748b' }}>{op.sub}</div>
                          </div>
                          {form.metodo_pago === op.val && (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '.7rem', flexShrink: 0 }}>
                              <i className="fa-solid fa-check" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Notas <span className="text-muted">(opcional)</span></label>
                    <input className="form-control" value={form.notas}
                      onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                      placeholder="Indicaciones especiales..." />
                  </div>

                  {/* Resumen */}
                  <div className="p-3 rounded" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <small className="fw-semibold text-success">Resumen del pedido:</small>
                    {cart.map(i => (
                      <div key={i.producto_id} className="small">{i.nombre} x{i.cantidad} — {cop(i.subtotal)}</div>
                    ))}
                    {bonoActivo && <div className="small text-success fw-semibold">🎁 Bono -${descuento.toLocaleString('es-CO')}</div>}
                    <div className="fw-bold mt-1">Total: {cop(totalFinal)}</div>
                  </div>
                </div>

                <div style={{ padding: 16, borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  <button type="button" className="btn btn-outline-secondary w-100" onClick={() => setStep('cart')}>
                    ← Volver
                  </button>
                  <button type="submit" className="btn btn-success w-100 btn-lg" disabled={sending}>
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20, marginRight: 8 }}>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M11.99 2C6.476 2 2 6.477 2 11.99c0 1.74.458 3.37 1.255 4.785L2 22l5.375-1.241A9.959 9.959 0 0011.99 22C17.523 22 22 17.523 22 11.99 22 6.477 17.523 2 11.99 2z"/>
                    </svg>
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
