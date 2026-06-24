import { useEffect, useState, useRef } from 'react'
import api, { cop } from '../api'
import useAutoRefresh from '../hooks/useAutoRefresh'
import LiveBadge from '../components/LiveBadge'

const empty = { nombre: '', descripcion: '', precio_compra: '', precio_venta: '', stock: '', stock_minimo: 5, categoria_id: '', codigo_barras: '', imagen: '', marca: '' }

function fmtPeso(v) {
  const n = Number(v)
  if (!v || isNaN(n)) return ''
  return `$${n.toLocaleString('es-CO')}`
}

export default function Inventario() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [imgPreview, setImgPreview] = useState('')
  const [scanMode, setScanMode] = useState(false)
  const [barcodeMsg, setBarcodeMsg] = useState(null)
  const fileRef = useRef()
  const barcodeRef = useRef()

  const load = () => api.get('/productos', { params: { q, categoria: cat } }).then(r => setProductos(r.data))

  useEffect(() => { api.get('/categorias').then(r => setCategorias(r.data)) }, [])
  useEffect(() => { load() }, [q, cat])
  const lastUpdated = useAutoRefresh(load, 30000)

  const openNew = () => { setForm(empty); setImgPreview(''); setModal('new') }
  const openEdit = p => {
    setForm({ ...p, categoria_id: p.categoria_id ?? '' })
    setImgPreview(p.imagen || '')
    setModal(p.id)
  }
  const closeModal = () => { setModal(null); setImgPreview(''); setScanMode(false); setBarcodeMsg(null) }

  const activarScan = () => {
    setScanMode(true)
    setBarcodeMsg(null)
    setTimeout(() => barcodeRef.current?.focus(), 50)
  }

  const checkBarcode = async codigo => {
    if (!codigo.trim()) return
    try {
      const r = await api.get('/productos/scan', { params: { codigo: codigo.trim() } })
      if (r.data && r.data.id !== form.id) {
        setBarcodeMsg({ ok: false, msg: `Ya existe: ${r.data.nombre}` })
      } else {
        setBarcodeMsg({ ok: true, msg: '✓ Código disponible' })
      }
    } catch { setBarcodeMsg(null) }
    setScanMode(false)
  }

  const handleImg = e => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { alert('La imagen no puede superar 3 MB'); return }
    const reader = new FileReader()
    reader.onload = ev => {
      setImgPreview(ev.target.result)
      setForm(f => ({ ...f, imagen: ev.target.result }))
    }
    reader.readAsDataURL(file)
  }

  const removeImg = () => { setImgPreview(''); setForm(f => ({ ...f, imagen: '' })); if (fileRef.current) fileRef.current.value = '' }

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
    if (!confirm('¿Eliminar producto? Esta acción no se puede deshacer.')) return
    try {
      await api.delete(`/productos/${id}`)
      await load()
    } catch (err) {
      const msg = err?.response?.data?.error || 'No se pudo eliminar el producto.'
      alert(`Error: ${msg}`)
    }
  }

  const campo = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <div className="topbar">
        <h4><i className="fa-solid fa-boxes-stacking me-2" />Inventario</h4>
        <div className="d-flex gap-2 align-items-center">
          <LiveBadge lastUpdated={lastUpdated} />
          <button className="btn btn-primary btn-sm" onClick={openNew}>
          <i className="fa-solid fa-plus me-1" />Nuevo producto
          </button>
        </div>
      </div>
      <div className="page-body">
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

        {productos.length === 0 && !q && !cat && (
          <div className="text-center py-5" style={{ background: '#fff', borderRadius: 12, border: '2px dashed #cbd5e1' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📦</div>
            <h5 className="text-muted">No tienes productos aún</h5>
            <p className="text-muted small mb-3">Haz clic en <strong>Nuevo producto</strong> para agregar tu primer producto</p>
            <button className="btn btn-primary" onClick={openNew}>
              <i className="fa-solid fa-plus me-2" />Agregar primer producto
            </button>
          </div>
        )}

        {(productos.length > 0 || q || cat) && (
          <div className="table-card">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th className="px-3" style={{ width: 56 }}></th>
                  <th>Producto</th>
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
                      {p.imagen
                        ? <img src={p.imagen} alt={p.nombre} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                        : <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🛍️</div>}
                    </td>
                    <td>
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
        )}
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

                    {/* Imagen */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">Foto del producto</label>
                      <div className="d-flex gap-3 align-items-center">
                        {imgPreview
                          ? <img src={imgPreview} alt="preview" style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                          : <div style={{ width: 80, height: 80, borderRadius: 10, background: '#f1f5f9', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📷</div>}
                        <div>
                          <button type="button" className="btn btn-sm btn-outline-primary d-block mb-1"
                            onClick={() => fileRef.current?.click()}>
                            <i className="fa-solid fa-upload me-1" />Subir foto
                          </button>
                          {imgPreview && (
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={removeImg}>
                              <i className="fa-solid fa-trash me-1" />Quitar
                            </button>
                          )}
                          <div className="text-muted small mt-1">JPG, PNG · máx 3 MB</div>
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" className="d-none" onChange={handleImg} />
                      </div>
                    </div>

                    <div className="col-md-8">
                      <label className="form-label">Nombre *</label>
                      <input className="form-control" required value={form.nombre} onChange={e => campo('nombre', e.target.value)} placeholder="Ej: Arroz 500g" />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Marca <span className="text-muted small">(opcional)</span></label>
                      <input className="form-control" value={form.marca} onChange={e => campo('marca', e.target.value)} placeholder="Ej: Diana, Roa..." />
                    </div>

                    {/* Precio compra */}
                    <div className="col-md-6">
                      <label className="form-label">Precio de compra <span className="text-muted small">(lo que te costó)</span></label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input className="form-control" type="number" min="0" step="any"
                          value={form.precio_compra}
                          onChange={e => campo('precio_compra', e.target.value)}
                          placeholder="0" />
                      </div>
                      {form.precio_compra > 0 && (
                        <div className="text-muted small mt-1">{fmtPeso(form.precio_compra)}</div>
                      )}
                    </div>

                    {/* Precio venta */}
                    <div className="col-md-6">
                      <label className="form-label">Precio de venta * <span className="text-muted small">(al cliente)</span></label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input className="form-control" type="number" min="0" step="any" required
                          value={form.precio_venta}
                          onChange={e => campo('precio_venta', e.target.value)}
                          placeholder="Ej: 25000" />
                      </div>
                      {form.precio_venta > 0 && (
                        <div className="fw-semibold text-primary small mt-1">{fmtPeso(form.precio_venta)}</div>
                      )}
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Stock actual</label>
                      <input className="form-control" type="number" min="0" value={form.stock} onChange={e => campo('stock', e.target.value)} placeholder="0" />
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
                      <label className="form-label">Código de barras <span className="text-muted small">(opcional)</span></label>
                      <div className="input-group">
                        <input
                          ref={barcodeRef}
                          className="form-control"
                          value={form.codigo_barras}
                          onChange={e => { campo('codigo_barras', e.target.value); setBarcodeMsg(null) }}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); checkBarcode(form.codigo_barras) } }}
                          placeholder={scanMode ? '⚡ Escanea ahora…' : 'Escribe o escanea'}
                          style={scanMode ? { borderColor: '#16a34a', background: '#f0fdf4', fontWeight: 600 } : {}}
                          autoComplete="off"
                        />
                        <button type="button"
                          className={`btn btn-sm ${scanMode ? 'btn-success' : 'btn-outline-secondary'}`}
                          onClick={activarScan}
                          title="Activar lector de código de barras">
                          <i className="fa-solid fa-barcode" />
                        </button>
                      </div>
                      {scanMode && (
                        <div className="small mt-1" style={{ color: '#16a34a', fontWeight: 600 }}>
                          <i className="fa-solid fa-circle-dot me-1" style={{ animation: 'blink 1s step-start infinite' }} />
                          Esperando escaneo… (Enter para confirmar)
                        </div>
                      )}
                      {barcodeMsg && (
                        <div className={`small mt-1 fw-semibold ${barcodeMsg.ok ? 'text-success' : 'text-danger'}`}>
                          {barcodeMsg.msg}
                        </div>
                      )}
                    </div>
                    <div className="col-12">
                      <label className="form-label">Descripción <span className="text-muted small">(opcional)</span></label>
                      <textarea className="form-control" rows={2} value={form.descripcion} onChange={e => campo('descripcion', e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar producto'}
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
