import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const cop = (v) => {
  const n = Number(v || 0)
  return `$${n.toLocaleString('es-CO')}`
}

export default api
