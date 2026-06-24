import { useEffect, useState } from 'react'
import api from '../api'

const FIELDS = [
  { key: 'nombre',      label: 'Nombre de la tienda', icon: 'fa-store',         type: 'text',  placeholder: 'Tienda La Real' },
  { key: 'whatsapp',    label: 'Número WhatsApp',     icon: 'fa-whatsapp',      type: 'text',  placeholder: '573001234567  (sin + ni espacios)', brand: true },
  { key: 'nequi',       label: 'Nequi',               icon: 'fa-mobile-screen', type: 'text',  placeholder: '300 123 4567' },
  { key: 'daviplata',   label: 'Daviplata',            icon: 'fa-mobile-screen', type: 'text',  placeholder: '300 123 4567' },
  { key: 'bancolombia', label: 'Bancolombia (cuenta)', icon: 'fa-building-columns', type: 'text', placeholder: 'No. de cuenta' },
  { key: 'ciudad',      label: 'Ciudad',              icon: 'fa-location-dot',  type: 'text',  placeholder: 'Valledupar' },
  { key: 'direccion',       label: 'Dirección',              icon: 'fa-map-pin',    type: 'text', placeholder: 'Calle 1 # 2-3, Barrio...' },
  { key: 'horario',         label: 'Horario',                icon: 'fa-clock',      type: 'text', placeholder: 'Lun–Sáb 7am–9pm' },
  { key: 'domicilio_costo', label: 'Costo domicilio ($)',    icon: 'fa-motorcycle', type: 'text', placeholder: '1000' },
  { key: 'url_tienda',      label: 'URL de la tienda',       icon: 'fa-link',       type: 'text', placeholder: 'https://tiendalarealco.pythonanywhere.com' },
]

export default function Configuracion() {
  const [form, setForm]         = useState({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [resetInput, setResetInput]   = useState('')
  const [resetting, setResetting]     = useState(false)
  const [resetDone, setResetDone]     = useState(false)
  const [newPw, setNewPw]             = useState('')
  const [newPw2, setNewPw2]           = useState('')
  const [pwMsg, setPwMsg]             = useState(null)

  useEffect(() => {
    api.get('/config').then(r => { setForm(r.data); setLoading(false) })
  }, [])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const save = async e => {
    e.preventDefault()
    setSaving(true)
    await api.put('/config', form)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const resetDatos = async () => {
    if (resetInput !== 'BORRAR') return
    setResetting(true)
    try {
      await api.delete('/reset-datos', { data: { confirmar: 'BORRAR-TODO' } })
      setResetDone(true)
      setResetInput('')
    } catch {
      alert('Error al borrar los datos.')
    } finally { setResetting(false) }
  }

  const waPreview = form.whatsapp
    ? `https://wa.me/${form.whatsapp.replace(/\D/g, '')}`
    : null

  return (
    <>
      <div className="topbar">
        <h4><i className="fa-solid fa-gear me-2" />Configuración de la tienda</h4>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="text-center p-5"><span className="spinner-border" /></div>
        ) : (
          <>
            <form onSubmit={save}>
              <div className="row g-4">
                {/* Columna izquierda */}
                <div className="col-12 col-lg-7">
                  <div className="table-card p-4">
                    <h6 className="fw-bold mb-3 text-muted text-uppercase" style={{ fontSize: '.75rem', letterSpacing: '.05em' }}>
                      Datos de la tienda
                    </h6>
                    {FIELDS.map(f => (
                      <div className="mb-3" key={f.key}>
                        <label className="form-label fw-semibold small">
                          <i className={`fa-${f.brand ? 'brands' : 'solid'} ${f.icon} me-1 text-muted`} />
                          {f.label}
                          {f.key === 'whatsapp' && <span className="badge bg-success ms-2">Requerido</span>}
                        </label>
                        <input
                          className="form-control"
                          type={f.type}
                          value={form[f.key] || ''}
                          placeholder={f.placeholder}
                          onChange={e => set(f.key, e.target.value)}
                        />
                      </div>
                    ))}

                    <div className="d-flex gap-2 mt-4">
                      <button type="submit" className="btn btn-primary px-4" disabled={saving}>
                        {saving
                          ? <><span className="spinner-border spinner-border-sm me-2" />Guardando…</>
                          : <><i className="fa-solid fa-floppy-disk me-2" />Guardar cambios</>}
                      </button>
                      {saved && (
                        <span className="align-self-center text-success fw-semibold">
                          <i className="fa-solid fa-circle-check me-1" />¡Guardado!
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Columna derecha: vista previa */}
                <div className="col-12 col-lg-5">
                  <div className="table-card p-4">
                    <h6 className="fw-bold mb-3 text-muted text-uppercase" style={{ fontSize: '.75rem', letterSpacing: '.05em' }}>
                      Vista previa
                    </h6>

                    <div className="p-3 rounded-3 mb-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <div className="fw-bold mb-1" style={{ color: '#15803d' }}>
                        <i className="fa-brands fa-whatsapp me-1" />WhatsApp del negocio
                      </div>
                      {form.whatsapp ? (
                        <>
                          <div className="text-muted small mb-2">+{form.whatsapp.replace(/\D/g, '')}</div>
                          <a href={waPreview} target="_blank" rel="noreferrer"
                            className="btn btn-sm btn-success">
                            Probar enlace WhatsApp
                          </a>
                        </>
                      ) : (
                        <div className="text-muted small">Ingresa tu número para activar WhatsApp</div>
                      )}
                    </div>

                    <div className="p-3 rounded-3 mb-3" style={{ background: '#faf5ff', border: '1px solid #e9d5ff' }}>
                      <div className="fw-bold mb-2" style={{ color: '#7c3aed' }}>
                        <i className="fa-solid fa-mobile-screen me-1" />Métodos de pago digital
                      </div>
                      {form.nequi && <div className="small mb-1"><span className="badge me-1" style={{ background: '#7c3aed' }}>Nequi</span>{form.nequi}</div>}
                      {form.daviplata && <div className="small mb-1"><span className="badge me-1" style={{ background: '#0ea5e9' }}>Daviplata</span>{form.daviplata}</div>}
                      {form.bancolombia && <div className="small mb-1"><span className="badge bg-warning text-dark me-1">Bancolombia</span>{form.bancolombia}</div>}
                      {!form.nequi && !form.daviplata && !form.bancolombia && (
                        <div className="text-muted small">Sin métodos configurados — solo efectivo</div>
                      )}
                    </div>

                    <div className="p-3 rounded-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div className="fw-bold mb-2">
                        <i className="fa-solid fa-store me-1" />{form.nombre || 'Tienda La Real'}
                      </div>
                      {form.ciudad && <div className="small text-muted"><i className="fa-solid fa-location-dot me-1" />{form.ciudad}</div>}
                      {form.direccion && <div className="small text-muted"><i className="fa-solid fa-map-pin me-1" />{form.direccion}</div>}
                      {form.horario && <div className="small text-muted"><i className="fa-solid fa-clock me-1" />{form.horario}</div>}
                    </div>
                  </div>

                  <div className="table-card p-4 mt-3">
                    <h6 className="fw-bold mb-2 text-muted text-uppercase" style={{ fontSize: '.75rem', letterSpacing: '.05em' }}>
                      ¿Cómo funciona?
                    </h6>
                    <ul className="small text-muted mb-0 ps-3">
                      <li className="mb-1">El número de WhatsApp se usa para que los clientes te contacten desde el catálogo.</li>
                      <li className="mb-1">Nequi/Daviplata/Bancolombia aparecen como opciones de pago en el catálogo.</li>
                      <li>Los cambios se aplican inmediatamente en el catálogo público.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </form>

            {/* Bono de bienvenida */}
            <div className="mt-4" style={{ border: '1.5px solid #d1fae5', borderRadius: 12, padding: 24, background: '#f0fdf4' }}>
              <h6 className="fw-bold mb-1" style={{ color: '#065f46' }}>
                <i className="fa-solid fa-gift me-2" />Bono de bienvenida (primera compra)
              </h6>
              <p className="small text-muted mb-3">
                Aparece como popup al abrir el catálogo y aplica el descuento automáticamente al primer pedido de cada cliente.
              </p>
              <div className="row g-2 align-items-end">
                <div className="col-auto">
                  <label className="form-label small fw-semibold">Activar bono</label>
                  <div className="form-check form-switch mt-1">
                    <input className="form-check-input" type="checkbox" role="switch"
                      style={{ width: '3em', height: '1.6em' }}
                      checked={form.bono_activo === '1'}
                      onChange={e => set('bono_activo', e.target.checked ? '1' : '0')} />
                  </div>
                </div>
                <div className="col-auto">
                  <label className="form-label small fw-semibold">Descuento (%)</label>
                  <div className="input-group input-group-sm" style={{ maxWidth: 110 }}>
                    <input className="form-control form-control-sm" type="number" min="1" max="99"
                      value={form.bono_porcentaje || '10'}
                      onChange={e => set('bono_porcentaje', e.target.value)} />
                    <span className="input-group-text">%</span>
                  </div>
                </div>
                <div className="col-12 col-md">
                  <label className="form-label small fw-semibold">Mensaje del popup</label>
                  <input className="form-control form-control-sm"
                    value={form.bono_texto || ''}
                    placeholder="Ej: ¡Bono de bienvenida! Se aplica automáticamente."
                    onChange={e => set('bono_texto', e.target.value)} />
                </div>
              </div>
              <div className="mt-3">
                <button type="button" className="btn btn-sm btn-success" onClick={save} disabled={saving}>
                  {saving
                    ? <><span className="spinner-border spinner-border-sm me-1" />Guardando…</>
                    : <><i className="fa-solid fa-floppy-disk me-1" />Guardar bono</>}
                </button>
                {saved && <span className="ms-2 small text-success fw-semibold"><i className="fa-solid fa-circle-check me-1" />¡Guardado!</span>}
              </div>
            </div>

            {/* Cambiar contraseña */}
            <div className="mt-4" style={{ border: '1.5px solid #bfdbfe', borderRadius: 12, padding: 24, background: '#eff6ff' }}>
              <h6 className="fw-bold mb-1" style={{ color: '#1e40af' }}>
                <i className="fa-solid fa-key me-2" />Cambiar contraseña del administrador
              </h6>
              <p className="small text-muted mb-3">La contraseña por defecto es <code>admin123</code>. Cámbiala por una segura.</p>
              <div className="row g-2">
                <div className="col-md-4">
                  <input className="form-control form-control-sm" type="password" placeholder="Nueva contraseña"
                    value={newPw} onChange={e => setNewPw(e.target.value)} />
                </div>
                <div className="col-md-4">
                  <input className="form-control form-control-sm" type="password" placeholder="Repetir contraseña"
                    value={newPw2} onChange={e => setNewPw2(e.target.value)} />
                </div>
                <div className="col-auto">
                  <button className="btn btn-primary btn-sm"
                    disabled={!newPw || newPw !== newPw2}
                    onClick={async () => {
                      await api.put('/config', { admin_password: newPw })
                      setNewPw(''); setNewPw2('')
                      setPwMsg('✅ Contraseña actualizada')
                      setTimeout(() => setPwMsg(null), 3000)
                    }}>
                    Guardar contraseña
                  </button>
                </div>
              </div>
              {newPw && newPw2 && newPw !== newPw2 && (
                <div className="small text-danger mt-1">Las contraseñas no coinciden</div>
              )}
              {pwMsg && <div className="small text-success mt-1 fw-semibold">{pwMsg}</div>}
            </div>

            {/* Zona de peligro */}
            <div className="mt-4" style={{ border: '1.5px solid #fca5a5', borderRadius: 12, padding: 24, background: '#fff5f5' }}>
              <h6 className="fw-bold text-danger mb-1">
                <i className="fa-solid fa-triangle-exclamation me-2" />Zona de peligro — Borrar todos los datos
              </h6>
              <p className="small text-muted mb-3">
                Esto elimina <strong>todos los productos, ventas, pedidos, clientes y movimientos de caja</strong>.
                La configuración de la tienda se conserva. Esta acción es <strong>irreversible</strong>.
              </p>

              {resetDone ? (
                <div className="alert alert-success mb-0">
                  <i className="fa-solid fa-circle-check me-2" />Datos borrados correctamente. Ya puedes ingresar tus productos y datos reales.
                </div>
              ) : (
                <div className="d-flex gap-2 align-items-center">
                  <input
                    className="form-control form-control-sm"
                    style={{ maxWidth: 200 }}
                    placeholder='Escribe "BORRAR" para confirmar'
                    value={resetInput}
                    onChange={e => setResetInput(e.target.value)}
                  />
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={resetInput !== 'BORRAR' || resetting}
                    onClick={resetDatos}
                  >
                    {resetting
                      ? <><span className="spinner-border spinner-border-sm me-1" />Borrando…</>
                      : <><i className="fa-solid fa-trash me-1" />Borrar todo</>}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
