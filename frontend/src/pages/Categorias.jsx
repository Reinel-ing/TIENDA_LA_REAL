import { useEffect, useState } from 'react'
import api from '../api'

export default function Categorias() {
  const [cats, setCats] = useState([])
  const [nombre, setNombre] = useState('')

  const load = () => api.get('/categorias').then(r => setCats(r.data))
  useEffect(() => { load() }, [])

  const crear = async e => {
    e.preventDefault()
    if (!nombre.trim()) return
    await api.post('/categorias', { nombre })
    setNombre('')
    load()
  }

  const eliminar = async id => {
    if (!confirm('¿Eliminar categoría? Los productos quedarán sin categoría.')) return
    await api.delete(`/categorias/${id}`)
    load()
  }

  return (
    <>
      <div className="topbar">
        <h4><i className="fa-solid fa-tags me-2" />Categorías</h4>
      </div>
      <div className="page-body">
        <div className="row g-3">
          <div className="col-md-4">
            <div className="table-card p-3">
              <h6 className="mb-3">Nueva categoría</h6>
              <form onSubmit={crear}>
                <div className="input-group">
                  <input className="form-control" placeholder="Nombre..." value={nombre} onChange={e => setNombre(e.target.value)} required />
                  <button className="btn btn-primary" type="submit">Agregar</button>
                </div>
              </form>
            </div>
          </div>
          <div className="col-md-8">
            <div className="table-card">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th className="px-3">Categoría</th>
                    <th>Productos</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cats.map(c => (
                    <tr key={c.id}>
                      <td className="px-3 fw-semibold">{c.nombre}</td>
                      <td><span className="badge bg-secondary">{c.total_productos}</span></td>
                      <td className="text-end pe-3">
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
        </div>
      </div>
    </>
  )
}
