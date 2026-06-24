import { useEffect, useState, useRef } from 'react'
import api from '../api'

const COLORES_FONDO = [
  '#1e40af', '#7c3aed', '#dc2626', '#059669', '#d97706',
  '#db2777', '#0891b2', '#c2410c', '#1e293b', '#065f46',
]
const COLORES_TEXTO = ['#ffffff', '#1e293b', '#facc15', '#fed7aa', '#bbf7d0']

const EMPTY = {
  titulo: '', descripcion: '', color_fondo: '#1e40af',
  color_texto: '#ffffff', imagen: '', activo: 1, orden: 0,
}

export default function Promociones() {
  const [lista, setLista]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [saving, setSaving]   = useState(false)
  const [delId, setDelId]     = useState(null)
  const fileRef = useRef()

  const cargar = () => {
    setLoading(true)
    api.get('/promociones?admin=1').then(r => { setLista(r.data); setLoading(false) })
  }
  useEffect(() => { cargar() }, [])

  const abrir  = (p = EMPTY) => setModal({ ...p })
  const cerrar = () => setModal(null)

  const handleImg = e => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 3 * 1024 * 1024) { alert('Imagen muy grande (máx 3 MB)'); return }
    const reader = new FileReader()
    reader.onload = ev => setModal(m => ({ ...m, imagen: ev.target.result }))
    reader.readAsDataURL(f)
  }

  const guardar = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      if (modal.id) await api.put(`/promociones/${modal.id}`, modal)
      else          await api.post('/promociones', modal)
      cargar(); cerrar()
    } finally { setSaving(false) }
  }

  const eliminar = async id => {
    await api.delete(`/promociones/${id}`)
    setDelId(null); cargar()
  }

  const toggleActivo = async p => {
    await api.put(`/promociones/${p.id}`, { ...p, activo: p.activo ? 0 : 1 })
    cargar()
  }

  const BannerPreview = ({ p, style = {} }) => (
    <div style={{
      background: p.color_fondo, color: p.color_texto,
      borderRadius: 14, minHeight: 100,
      display: 'flex', alignItems: 'center',
      position: 'relative', overflow: 'hidden', ...style
    }}>
      {p.imagen && (
        <>
          <img src={p.imagen} alt=""
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0,
              height: '100%', width: '55%',
              objectFit: 'contain', objectPosition: 'center right',
            }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to right, ${p.color_fondo} 38%, ${p.color_fondo}bb 55%, transparent 72%)`,
          }} />
        </>
      )}
      <div style={{ position: 'relative', padding: '16px 20px', maxWidth: p.imagen ? '58%' : '100%' }}>
        <div style={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>
          {p.titulo || 'Título de la promoción'}
        </div>
        {p.descripcion && (
          <div style={{ opacity: .88, fontSize: '.82rem', marginTop: 4 }}>{p.descripcion}</div>
        )}
      </div>
    </div>
  )

  return (
    <>
      <div className="topbar">
        <h4><i className="fa-solid fa-bullhorn me-2" />Promociones del catálogo</h4>
        <button className="btn btn-primary btn-sm" onClick={() => abrir()}>
          <i className="fa-solid fa-plus me-1" />Nueva promoción
        </button>
      </div>

      <div className="page-body">
        <div className="alert alert-info d-flex gap-2 align-items-start mb-4" style={{ borderRadius: 12 }}>
          <i className="fa-solid fa-circle-info fa-lg mt-1" />
          <div>
            <strong>Carrusel de promociones</strong> — Los banners aparecen deslizantes en la parte superior del catálogo público.
            Úsalos para anunciar ofertas, descuentos o eventos especiales.
          </div>
        </div>

        {loading ? (
          <div className="text-center p-5"><span className="spinner-border" /></div>
        ) : lista.length === 0 ? (
          <div className="text-center py-5">
            <i className="fa-solid fa-bullhorn text-muted" style={{ fontSize: '3rem', opacity: .25 }} />
            <p className="text-muted mt-3 mb-3">Aún no tienes promociones creadas</p>
            <button className="btn btn-primary" onClick={() => abrir()}>
              <i className="fa-solid fa-plus me-2" />Crear primera promoción
            </button>
          </div>
        ) : (
          <div className="row g-3">
            {lista.map(p => (
              <div key={p.id} className="col-12 col-md-6">
                <div style={{ opacity: p.activo ? 1 : 0.55 }}>
                  <BannerPreview p={p} />
                </div>
                <div className="d-flex align-items-center gap-2 mt-2">
                  {!p.activo && (
                    <span className="badge bg-secondary">
                      <i className="fa-solid fa-eye-slash me-1" />Oculta
                    </span>
                  )}
                  <div className="ms-auto d-flex gap-2">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => abrir(p)}>
                      <i className="fa-solid fa-pen me-1" />Editar
                    </button>
                    <button className={`btn btn-sm ${p.activo ? 'btn-outline-success' : 'btn-outline-secondary'}`}
                      onClick={() => toggleActivo(p)} title={p.activo ? 'Desactivar' : 'Activar'}>
                      <i className={`fa-solid ${p.activo ? 'fa-eye' : 'fa-eye-slash'}`} />
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setDelId(p.id)}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,.55)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fa-solid fa-bullhorn me-2" />
                  {modal.id ? 'Editar promoción' : 'Nueva promoción'}
                </h5>
                <button className="btn-close" onClick={cerrar} />
              </div>
              <form onSubmit={guardar}>
                <div className="modal-body">
                  <div className="row g-4">
                    {/* Izquierda: campos */}
                    <div className="col-12 col-md-7">
                      <div className="mb-3">
                        <label className="form-label fw-semibold small">Título *</label>
                        <input className="form-control" required value={modal.titulo}
                          onChange={e => setModal(m => ({ ...m, titulo: e.target.value }))}
                          placeholder="Ej: ¡Oferta del día! 🔥 20% en bebidas" />
                      </div>

                      <div className="mb-3">
                        <label className="form-label fw-semibold small">Descripción</label>
                        <input className="form-control" value={modal.descripcion}
                          onChange={e => setModal(m => ({ ...m, descripcion: e.target.value }))}
                          placeholder="Ej: Solo hoy, no te lo pierdas" />
                      </div>

                      <div className="mb-3">
                        <label className="form-label fw-semibold small">Color de fondo</label>
                        <div className="d-flex gap-2 flex-wrap align-items-center">
                          {COLORES_FONDO.map(c => (
                            <div key={c} onClick={() => setModal(m => ({ ...m, color_fondo: c, imagen: '' }))}
                              style={{
                                width: 30, height: 30, borderRadius: 8, background: c, cursor: 'pointer',
                                border: modal.color_fondo === c && !modal.imagen ? '3px solid #facc15' : '2px solid transparent',
                                boxShadow: '0 1px 4px rgba(0,0,0,.2)'
                              }} />
                          ))}
                          <input type="color" value={modal.color_fondo}
                            onChange={e => setModal(m => ({ ...m, color_fondo: e.target.value, imagen: '' }))}
                            style={{ width: 30, height: 30, padding: 1, borderRadius: 8, cursor: 'pointer' }} />
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="form-label fw-semibold small">Color de texto</label>
                        <div className="d-flex gap-2 align-items-center">
                          {COLORES_TEXTO.map(c => (
                            <div key={c} onClick={() => setModal(m => ({ ...m, color_texto: c }))}
                              style={{
                                width: 30, height: 30, borderRadius: 8, background: c, cursor: 'pointer',
                                border: modal.color_texto === c ? '3px solid #3b82f6' : '2px solid #e2e8f0',
                              }} />
                          ))}
                          <input type="color" value={modal.color_texto}
                            onChange={e => setModal(m => ({ ...m, color_texto: e.target.value }))}
                            style={{ width: 30, height: 30, padding: 1, borderRadius: 8, cursor: 'pointer' }} />
                        </div>
                      </div>
                    </div>

                    {/* Derecha: imagen + preview */}
                    <div className="col-12 col-md-5">
                      <div className="mb-3">
                        <label className="form-label fw-semibold small">Imagen de fondo (opcional)</label>
                        <input ref={fileRef} type="file" accept="image/*" className="d-none" onChange={handleImg} />
                        <div
                          style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: 12, textAlign: 'center', cursor: 'pointer', minHeight: 110 }}
                          onClick={() => fileRef.current.click()}>
                          {modal.imagen ? (
                            <>
                              <img src={modal.imagen} alt="preview"
                                style={{ maxHeight: 80, maxWidth: '100%', borderRadius: 8, objectFit: 'cover' }} />
                              <button type="button" className="btn btn-sm btn-link text-danger d-block mx-auto mt-1"
                                onClick={e => { e.stopPropagation(); setModal(m => ({ ...m, imagen: '' })) }}>
                                Quitar imagen
                              </button>
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-image text-muted" style={{ fontSize: '2rem', opacity: .35 }} />
                              <p className="small text-muted mt-2 mb-0">Clic para subir imagen</p>
                              <p className="small text-muted mb-0" style={{ opacity: .6 }}>Máx 3 MB</p>
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="form-label fw-semibold small">Vista previa</label>
                        <BannerPreview p={modal} style={{ minHeight: 80, borderRadius: 10 }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={cerrar}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving
                      ? <><span className="spinner-border spinner-border-sm me-2" />Guardando…</>
                      : <><i className="fa-solid fa-floppy-disk me-2" />Guardar</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {delId && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,.55)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center py-4">
                <i className="fa-solid fa-triangle-exclamation text-warning" style={{ fontSize: '2.5rem' }} />
                <h5 className="mt-3">¿Eliminar promoción?</h5>
                <p className="text-muted">Esta acción no se puede deshacer.</p>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button className="btn btn-secondary" onClick={() => setDelId(null)}>Cancelar</button>
                <button className="btn btn-danger" onClick={() => eliminar(delId)}>
                  <i className="fa-solid fa-trash me-2" />Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
