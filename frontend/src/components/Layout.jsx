import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'

const nav = [
  { to: '/', icon: 'fa-gauge-high', label: 'Dashboard', exact: true },
  { section: 'Tienda' },
  { to: '/ventas', icon: 'fa-cash-register', label: 'Punto de Venta' },
  { to: '/inventario', icon: 'fa-boxes-stacking', label: 'Inventario' },
  { to: '/categorias', icon: 'fa-tags', label: 'Categorías' },
  { to: '/clientes', icon: 'fa-users', label: 'Clientes' },
  { section: 'Operaciones' },
  { to: '/caja', icon: 'fa-sack-dollar', label: 'Caja' },
  { to: '/pedidos', icon: 'fa-bag-shopping', label: 'Pedidos WhatsApp' },
  { to: '/transferencias', icon: 'fa-money-bill-transfer', label: 'Transferencias' },
  { to: '/promociones', icon: 'fa-bullhorn', label: 'Promociones' },
  { to: '/difusion', icon: 'fa-paper-plane', label: 'Difusión WhatsApp' },
  { to: '/ventas/historial', icon: 'fa-clock-rotate-left', label: 'Historial' },
  { to: '/reportes', icon: 'fa-chart-line', label: 'Reportes' },
  { to: '/configuracion', icon: 'fa-gear', label: 'Configuración' },
  { section: 'Público' },
  { to: '/catalogo', icon: 'fa-store', label: 'Catálogo', external: true },
]

export default function Layout() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const navigate = useNavigate()

  const logout = () => {
    localStorage.removeItem('tlr_token')
    navigate('/login', { replace: true })
  }

  return (
    <div>
      {/* Header móvil */}
      <div className="mobile-header">
        <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Menú">
          <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-bars'}`} />
        </button>
        <img src="/logo.jpg" alt="Logo" />
        <span>Tienda La Real</span>
      </div>

      {/* Overlay oscuro al abrir sidebar en móvil */}
      {open && <div className="sidebar-overlay" onClick={close} />}

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/logo.jpg" alt="Tienda La Real"
            style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', marginBottom: 8, border: '2px solid #facc15' }} />
          <h5 style={{ margin: 0 }}>Tienda La Real</h5>
          <small>Sistema POS</small>
        </div>
        <nav className="sidebar-nav">
          {nav.map((item, i) => {
            if (item.section) {
              return <div key={i} className="sidebar-section">{item.section}</div>
            }
            if (item.external) {
              return (
                <a key={i} href={item.to} target="_blank" rel="noreferrer" onClick={close}>
                  <i className={`fa-solid ${item.icon}`} />
                  {item.label}
                  <i className="fa-solid fa-arrow-up-right-from-square ms-auto" style={{ fontSize: '.65rem', opacity: .5 }} />
                </a>
              )
            }
            return (
              <NavLink key={i} to={item.to} end={item.exact} onClick={close}>
                <i className={`fa-solid ${item.icon}`} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* Cerrar sesión */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <button onClick={logout}
            style={{ width: '100%', background: 'rgba(239,68,68,.15)', border: 'none', borderRadius: 6,
              color: '#f87171', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
              fontSize: '.85rem', cursor: 'pointer' }}>
            <i className="fa-solid fa-right-from-bracket" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
