import { useEffect, useRef, useState } from 'react'

/**
 * Refresca datos automáticamente cada `ms` ms y cuando el usuario
 * vuelve a la pestaña. Devuelve el timestamp de la última actualización.
 */
export default function useAutoRefresh(fn, ms = 30000) {
  const [lastUpdated, setLastUpdated] = useState(Date.now())
  const ref = useRef(fn)
  ref.current = fn

  useEffect(() => {
    const tick = () => { ref.current(); setLastUpdated(Date.now()) }
    const id = setInterval(tick, ms)
    const onVisibility = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [ms])

  return lastUpdated
}
