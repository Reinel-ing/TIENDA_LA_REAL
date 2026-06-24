import { useEffect, useState } from 'react'
import api from '../api'

const PLANTILLAS = [
  {
    id: 'promo',
    label: 'Promocion Tienda La Real',
    texto: '\u{1F389}\u{1F38A} ¡Hola! Somos Tienda La Real y tenemos promociones especiales para ti. \u{1F38A}\u{1F389}\n\n\u{1F525} Aprovecha nuestros precios especiales en bebidas, gaseosas, energizantes, jugos y mucho más.\n\n✅ Productos siempre frescos y bien fríos\n✅ Excelente atención\n✅ Promociones por tiempo limitado\n\n\u{1F6F5} Realizamos domicilios por solo $1.000 adicionales para que recibas tus productos sin salir de casa.\n\n\u{1F3EA} O si lo prefieres, puedes acercarte a nuestra tienda, donde estaremos encantados de atenderte de la mejor manera.\n\n\u{1F4F1} ¡Haz tu pedido ahora respondiendo este mensaje o vísítanos! Te esperamos.',
  },
  {
    id: 'producto',
    label: 'Nuevo producto',
    texto: '\u{1F195} ¡Hola! En Tienda La Real acabamos de agregar un producto nuevo.\n\n[Nombre del producto y precio]\n\n¡Haz tu pedido ahora respondiendo este mensaje!',
  },
  {
    id: 'domicilio',
    label: 'Domicilio $1.000',
    texto: '\u{1F6F5} ¡Hola! Te recordamos que en Tienda La Real hacemos domicilios por solo $1.000 adicionales.\n\nPide lo que necesites y te lo llevamos a tu casa \u{1F3E0}\n\n¡Escribenos aquí mismo!',
  },
  {
    id: 'libre',
    label: 'Mensaje libre',
    texto: '',
  },
]

function formatWa(telefono) {
  const d = telefono.replace(/\D/g, '')
  if (d.length === 10) return `57${d}`
  if (d.length === 12 && d.startsWith('57')) return d
  return d
}

function waHref(telefono, mensaje) {
  return `https://wa.me/${formatWa(telefono)}?text=${encodeURIComponent(mensaje)}`
}

export default function Difusion() {
  const [suscriptores, setSuscriptores] = useState([])
  const [loading, setLoading]           = useState(true)
  const [plantilla, setPlantilla]       = useState('promo')
  const [mensaje, setMensaje]           = useState(PLANTILLAS[0].texto)
  const [q, setQ]                       = useState('')
  const [copiado, setCopiado]           = useState(false)
  const [enviados, setEnviados]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('tlr_dif_enviados') || '{}') } catch { return {} }
  })

  // Broadcast secuencial
  const [broadcast, setBroadcast]       = useState(false)
  const [bIdx, setBIdx]                 = useState(0)
  const [bLista, setBLista]             = useState([])

  useEffect(() => {
    api.get('/suscriptores')
      .then(r => setSuscriptores(r.data))
      .finally(() => setLoading(false))
  }, [])

  const cambiarPlantilla = id => {
    setPlantilla(id)
    const p = PLANTILLAS.find(p => p.id === id)
    if (p?.texto) setMensaje(p.texto)
  }

  const marcarEnviado = tel => {
    const nuevo = { ...enviados, [tel]: true }
    setEnviados(nuevo)
    localStorage.setItem('tlr_dif_enviados', JSON.stringify(nuevo))
    return nuevo
  }

  const enviarA = s => {
    window.open(waHref(s.telefono, mensaje), '_blank', 'noopener')
    marcarEnviado(s.telefono)
  }

  // Iniciar broadcast a todos
  const iniciarBroadcast = () => {
    if (!mensaje.trim() || filtrados.length === 0) return
    const lista = filtrados.filter(s => !enviados[s.telefono])
    if (lista.length === 0) {
      alert('Ya enviaste a todos los clientes de la lista. Haz clic en "Reiniciar" para volver a enviar.')
      return
    }
    setBLista(lista)
    setBIdx(0)
    setBroadcast(true)
    // Abrir WhatsApp del primero (permitido porque viene de un clic)
    window.open(waHref(lista[0].telefono, mensaje), '_blank', 'noopener')
    marcarEnviado(lista[0].telefono)
  }

  // Siguiente en el broadcast
  const siguienteBroadcast = () => {
    const next = bIdx + 1
    if (next >= bLista.length) {
      setBroadcast(false)
      return
    }
    setBIdx(next)
    window.open(waHref(bLista[next].telefono, mensaje), '_blank', 'noopener')
    marcarEnviado(bLista[next].telefono)
  }

  const copiarNumeros = async () => {
    const nums = filtrados.map(s => s.telefono).join('\n')
    await navigator.clipboard.writeText(nums)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  const limpiar = () => {
    setEnviados({})
    localStorage.removeItem('tlr_dif_enviados')
  }

  const filtrados = suscriptores.filter(s =>
    !q ||
    (s.nombre || '').toLowerCase().includes(q.toLowerCase()) ||
    (s.telefono || '').includes(q)
  )

  const yaEnviadosCount = filtrados.filter(s => enviados[s.telefono]).length
  const pendientes      = filtrados.filter(s => !enviados[s.telefono]).length

  return (
    <>
      <div className="topbar">
        <h4><i className="fa-brands fa-whatsapp me-2" />Difusión WhatsApp</h4>
        <span className="badge bg-success" style={{ fontSize: '.85rem' }}>
          {suscriptores.length} cliente{suscriptores.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="page-body">
        <div className="row g-3">

          {/* ── Compositor de mensaje ── */}
          <div className="col-lg-5">
            <div className="table-card p-3">
              <div className="fw-semibold mb-3">
                <i className="fa-solid fa-pen-to-square me-2 text-primary" />Componer mensaje
              </div>

              <div className="mb-3">
                <div className="small fw-semibold text-muted mb-2">Plantilla</div>
                <div className="d-flex flex-wrap gap-2">
                  {PLANTILLAS.map(p => (
                    <button key={p.id}
                      className={`btn btn-sm ${plantilla === p.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => cambiarPlantilla(p.id)}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <div className="small fw-semibold text-muted mb-2">Mensaje</div>
                <textarea className="form-control" rows={9}
                  value={mensaje}
                  onChange={e => setMensaje(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  style={{ fontSize: '.9rem', resize: 'vertical', lineHeight: 1.6 }}
                />
                <div className="text-muted small mt-1 text-end">{mensaje.length} caracteres</div>
              </div>

              {mensaje.trim() && (
                <div>
                  <div className="small fw-semibold text-muted mb-2">Vista previa</div>
                  <div style={{
                    background: '#dcf8c6', borderRadius: '12px 12px 4px 12px',
                    padding: '10px 14px', fontSize: '.85rem', whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word', boxShadow: '0 1px 2px rgba(0,0,0,.15)', maxWidth: 340,
                  }}>
                    {mensaje}
                    <div className="text-muted small mt-1 text-end" style={{ fontSize: '.7rem' }}>
                      {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} ✓✓
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Lista de suscriptores ── */}
          <div className="col-lg-7">
            <div className="table-card">
              <div className="p-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="fw-semibold">
                  <i className="fa-solid fa-users me-2 text-success" />
                  Suscriptores
                  {yaEnviadosCount > 0 && (
                    <span className="ms-2 badge bg-success">
                      {yaEnviadosCount}/{filtrados.length} enviados
                    </span>
                  )}
                </div>
                <div className="d-flex gap-2 flex-wrap align-items-center">
                  {yaEnviadosCount > 0 && (
                    <button className="btn btn-sm btn-outline-secondary" onClick={limpiar}>
                      <i className="fa-solid fa-rotate-left me-1" />Reiniciar
                    </button>
                  )}
                  <button className="btn btn-sm btn-outline-primary" onClick={copiarNumeros}
                    disabled={!filtrados.length}>
                    <i className={`fa-solid ${copiado ? 'fa-check' : 'fa-copy'} me-1`} />
                    {copiado ? '¡Copiado!' : 'Copiar números'}
                  </button>
                  {/* BOTÓN PRINCIPAL */}
                  <button
                    className="btn btn-sm btn-success"
                    onClick={iniciarBroadcast}
                    disabled={!mensaje.trim() || filtrados.length === 0}
                    style={{ fontWeight: 700 }}>
                    <i className="fa-brands fa-whatsapp me-1" />
                    Difundir a todos
                    {pendientes > 0 && <span className="ms-1 badge bg-white text-success">{pendientes}</span>}
                  </button>
                </div>
              </div>

              <div className="px-3 py-2 border-bottom">
                <input className="form-control form-control-sm"
                  placeholder="Buscar por nombre o teléfono..."
                  value={q} onChange={e => setQ(e.target.value)} />
              </div>

              {loading ? (
                <div className="text-center p-5"><span className="spinner-border text-success" /></div>
              ) : filtrados.length === 0 ? (
                <div className="text-center text-muted py-5">
                  {suscriptores.length === 0
                    ? <><div style={{ fontSize: '2.5rem' }}>📭</div><p>Aún no hay clientes con pedidos</p></>
                    : <><div style={{ fontSize: '2rem' }}>🔍</div><p>Sin resultados</p></>}
                </div>
              ) : (
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th className="px-3">Cliente</th>
                      <th>Teléfono</th>
                      <th>Pedidos</th>
                      <th>Origen</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((s, i) => {
                      const ya = enviados[s.telefono]
                      return (
                        <tr key={i} style={ya ? { background: '#f0fdf4' } : {}}>
                          <td className="px-3 fw-semibold">{s.nombre || '—'}</td>
                          <td className="text-muted">{s.telefono}</td>
                          <td><span className="badge bg-secondary">{s.total_pedidos}</span></td>
                          <td>
                            {s.origen === 'whatsapp'
                              ? <span className="badge" style={{ background: '#dcfce7', color: '#16a34a' }}>WhatsApp</span>
                              : <span className="badge" style={{ background: '#dbeafe', color: '#2563eb' }}>POS</span>}
                          </td>
                          <td className="pe-3 text-end">
                            {ya
                              ? <span className="badge bg-success"><i className="fa-solid fa-check me-1" />Enviado</span>
                              : <button className="btn btn-sm btn-success" onClick={() => enviarA(s)}
                                  disabled={!mensaje.trim()}>
                                  <i className="fa-brands fa-whatsapp me-1" />Enviar
                                </button>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              {suscriptores.length > 0 && (
                <div className="p-3 border-top text-muted small" style={{ background: '#fffbeb' }}>
                  <i className="fa-solid fa-lightbulb me-2 text-warning" />
                  <strong>Tip:</strong> Usa <em>"Copiar números"</em> para pegar los teléfonos en WhatsApp
                  y crear una <strong>Lista de difusión</strong> — así llegas a todos de una sola vez.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal broadcast secuencial ── */}
      {broadcast && bLista.length > 0 && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: 18, overflow: 'hidden' }}>

              {/* Header verde */}
              <div style={{ background: 'linear-gradient(135deg,#15803d,#16a34a)', padding: '20px 24px', color: '#fff' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                      <i className="fa-brands fa-whatsapp me-2" />Difundiendo mensaje
                    </div>
                    <div style={{ opacity: .8, fontSize: '.85rem', marginTop: 2 }}>
                      {bIdx + 1} de {bLista.length} clientes
                    </div>
                  </div>
                  <button className="btn-close btn-close-white" onClick={() => setBroadcast(false)} />
                </div>
                {/* Barra de progreso */}
                <div style={{ background: 'rgba(255,255,255,.25)', borderRadius: 8, height: 8, marginTop: 14 }}>
                  <div style={{
                    background: '#fff', borderRadius: 8, height: 8,
                    width: `${((bIdx + 1) / bLista.length) * 100}%`,
                    transition: 'width .4s',
                  }} />
                </div>
              </div>

              <div className="modal-body text-center p-4">
                {bIdx + 1 < bLista.length ? (
                  <>
                    <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
                    <div className="fw-bold" style={{ fontSize: '1.1rem' }}>
                      WhatsApp abierto para:
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#15803d', margin: '8px 0 4px' }}>
                      {bLista[bIdx].nombre}
                    </div>
                    <div className="text-muted mb-3">{bLista[bIdx].telefono}</div>
                    <p className="text-muted small mb-4">
                      Envía el mensaje en WhatsApp y luego vuelve aquí para continuar con el siguiente cliente.
                    </p>
                    <button className="btn btn-success btn-lg w-100" onClick={siguienteBroadcast}
                      style={{ fontWeight: 700, borderRadius: 12 }}>
                      Siguiente: {bLista[bIdx + 1]?.nombre}
                      <i className="fa-solid fa-arrow-right ms-2" />
                    </button>
                    <button className="btn btn-link text-muted mt-2 w-100" onClick={() => setBroadcast(false)}>
                      Pausar difusión
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
                    <div className="fw-bold fs-5 mb-2">¡Difusión completada!</div>
                    <p className="text-muted">
                      Enviaste el mensaje a los <strong>{bLista.length}</strong> clientes.
                    </p>
                    <button className="btn btn-success w-100 btn-lg" onClick={() => setBroadcast(false)}
                      style={{ borderRadius: 12, fontWeight: 700 }}>
                      Listo
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
