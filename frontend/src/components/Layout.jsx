import { Outlet, NavLink, useLocation } from 'react-router-dom'

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
  { to: '/ventas/historial', icon: 'fa-clock-rotate-left', label: 'Historial' },
  { to: '/reportes', icon: 'fa-chart-line', label: 'Reportes' },
  { section: 'Público' },
  { to: '/catalogo', icon: 'fa-store', label: 'Catálogo', external: true },
]

export default function Layout() {
  return (
    <div>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h5>🛒 Tienda La Real</h5>
          <small>Sistema POS</small>
        </div>
        <nav className="sidebar-nav">
          {nav.map((item, i) => {
            if (item.section) {
              return <div key={i} className="sidebar-section">{item.section}</div>
            }
            if (item.external) {
              return (
                <a key={i} href={item.to} target="_blank" rel="noreferrer">
                  <i className={`fa-solid ${item.icon}`} />
                  {item.label}
                  <i className="fa-solid fa-arrow-up-right-from-square ms-auto" style={{ fontSize: '.65rem', opacity: .5 }} />
                </a>
              )
            }
            return (
              <NavLink
                key={i}
                to={item.to}
                end={item.exact}
              >
                <i className={`fa-solid ${item.icon}`} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
