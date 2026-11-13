import { useEffect, useState } from 'react'

// True on phone-sized screens. Used to switch the sidebar to a bottom bar
// and open guest profiles full-screen instead of in a side panel.
export function useIsMobile(breakpoint = 820) {
  const get = () => (typeof window !== 'undefined' ? window.innerWidth < breakpoint : false)
  const [isMobile, setIsMobile] = useState(get)
  useEffect(() => {
    const onResize = () => setIsMobile(get())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakpoint])
  return isMobile
}
