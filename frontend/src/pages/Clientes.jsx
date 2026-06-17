import { useEffect, useState } from 'react'
import api from '../api'

const empty = { nombre: '', telefono: '', email: '', direccion: '' }

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/clientes', { params: { q } }).then(r => setClientes(r.data))
  useEffect(() => { load() }, [q])

  const openNew  = () => { setForm(empty); setModal('new') }
  const openEdit = c => { setForm({ ...c }); setModal(c.id) }
  const close    = () => setModal(null)
  const campo    = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      if (modal === 'new') await api.post('/clientes', form)
      else await api.put(`/clientes/${modal}`, form)
      await load(); close()
    } finally { setSaving(false) }
  }

  const eliminar = async id => {
    if (!confirm('¿Eliminar cliente?')) return
    await api.delete(`/clientes/${id}`); load()
  }

  return (
    <>
      <div className="topbar">
        <h4><i className="fa-solid fa-users me-2" />Clientes</h4>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <i className="fa-solid fa-plus me-1" />Nuevo cliente
        </button>
      </div>
      <div className="page-body">
        <input className="form-control form-control-sm mb-3" style={{ maxWidth: 280 }}
          placeholder="Buscar..." value={q} onChange={e => setQ(e.target.value)} />
        <div className="table-card">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th className="px-3">Nombre</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Dirección</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.id}>
                  <td className="px-3 fw-semibold">{c.nombre}</td>
                  <td>{c.telefono || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td className="text-muted">{c.direccion || '—'}</td>
                  <td className="text-end pe-3">
                    <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => openEdit(c)}>
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(c.id)}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={save}>
                <div className="modal-header">
                  <h5 className="modal-title">{modal === 'new' ? 'Nuevo cliente' : 'Editar cliente'}</h5>
                  <button type="button" className="btn-close" onClick={close} />
                </div>
                <div className="modal-body">
                  {[['nombre', 'Nombre *', true], ['telefono', 'Teléfono'], ['email', 'Email'], ['direccion', 'Dirección']].map(([k, lbl, req]) => (
                    <div key={k} className="mb-3">
                      <label className="form-label">{lbl}</label>
                      <input className="form-control" required={!!req} value={form[k]} onChange={e => campo(k, e.target.value)} />
                    </div>
                  ))}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={close}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
