import { useEffect, useState } from 'react'
import api, { cop } from '../api'

const empty = { nombre: '', descripcion: '', precio_compra: '', precio_venta: '', stock: '', stock_minimo: 5, categoria_id: '', codigo_barras: '' }

export default function Inventario() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [modal, setModal] = useState(null) // null | objeto producto
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/productos', { params: { q, categoria: cat } }).then(r => setProductos(r.data))

  useEffect(() => {
    api.get('/categorias').then(r => setCategorias(r.data))
  }, [])
  useEffect(() => { load() }, [q, cat])

  const openNew = () => { setForm(empty); setModal('new') }
  const openEdit = p => { setForm({ ...p, categoria_id: p.categoria_id ?? '' }); setModal(p.id) }
  const closeModal = () => setModal(null)

  const save = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      if (modal === 'new') await api.post('/productos', form)
      else await api.put(`/productos/${modal}`, form)
      await load()
      closeModal()
    } finally { setSaving(false) }
  }

  const eliminar = async id => {
    if (!confirm('¿Eliminar producto?')) return
    await api.delete(`/productos/${id}`)
    await load()
  }

  const campo = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <div className="topbar">
        <h4><i className="fa-solid fa-boxes-stacking me-2" />Inventario</h4>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <i className="fa-solid fa-plus me-1" />Nuevo producto
        </button>
      </div>
      <div className="page-body">
        {/* Filtros */}
        <div className="d-flex gap-2 mb-3 flex-wrap">
          <input className="form-control form-control-sm" style={{ maxWidth: 240 }}
            placeholder="Buscar..." value={q} onChange={e => setQ(e.target.value)} />
          <select className="form-select form-select-sm" style={{ maxWidth: 200 }}
            value={cat} onChange={e => setCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <span className="text-muted align-self-center small">{productos.length} productos</span>
        </div>

        <div className="table-card">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th className="px-3">Producto</th>
                <th>Categoría</th>
                <th>Precio venta</th>
                <th>Stock</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {productos.map(p => (
                <tr key={p.id}>
                  <td className="px-3">
                    <div className="fw-semibold">{p.nombre}</div>
                    {p.codigo_barras && <small className="text-muted">{p.codigo_barras}</small>}
                  </td>
                  <td className="text-muted">{p.categoria_nombre || '—'}</td>
                  <td className="fw-semibold text-primary">{cop(p.precio_venta)}</td>
                  <td>{p.stock}</td>
                  <td>
                    {p.stock === 0
                      ? <span className="badge bg-danger">Agotado</span>
                      : p.stock <= p.stock_minimo
                        ? <span className="badge bg-warning text-dark">Stock bajo</span>
                        : <span className="badge bg-success">OK</span>}
                  </td>
                  <td className="text-end pe-3">
                    <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => openEdit(p)}>
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(p.id)}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={save}>
                <div className="modal-header">
                  <h5 className="modal-title">{modal === 'new' ? 'Nuevo producto' : 'Editar producto'}</h5>
                  <button type="button" className="btn-close" onClick={closeModal} />
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Nombre *</label>
                      <input className="form-control" required value={form.nombre} onChange={e => campo('nombre', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Precio compra</label>
                      <input className="form-control" type="number" min="0" value={form.precio_compra} onChange={e => campo('precio_compra', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Precio venta *</label>
                      <input className="form-control" type="number" min="0" required value={form.precio_venta} onChange={e => campo('precio_venta', e.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Stock</label>
                      <input className="form-control" type="number" min="0" value={form.stock} onChange={e => campo('stock', e.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Stock mínimo</label>
                      <input className="form-control" type="number" min="0" value={form.stock_minimo} onChange={e => campo('stock_minimo', e.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Categoría</label>
                      <select className="form-select" value={form.categoria_id} onChange={e => campo('categoria_id', e.target.value)}>
                        <option value="">Sin categoría</option>
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Código de barras</label>
                      <input className="form-control" value={form.codigo_barras} onChange={e => campo('codigo_barras', e.target.value)} />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Descripción</label>
                      <textarea className="form-control" rows={2} value={form.descripcion} onChange={e => campo('descripcion', e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
