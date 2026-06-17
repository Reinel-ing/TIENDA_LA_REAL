import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const cop = (v) => {
  const n = Number(v || 0)
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000)    return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString('es-CO')}`
}

export default api
