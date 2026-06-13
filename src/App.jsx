import { useState, useEffect } from 'react'
import { CartProvider } from './context/CartContext'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import MenuSection from './components/MenuSection'
import MediaShowcase from './components/MediaShowcase'
import Testimonials from './components/Testimonials'
import CTA from './components/CTA'
import RatingSection from './components/RatingSection'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import CheckoutModal from './components/CheckoutModal'
import Admin from './components/Admin'
import RiderPanel from './components/RiderPanel'

export default function App() {
  const [page, setPage] = useState(() => {
    const hash = window.location.hash
    if (hash === '#/admin') return 'admin'
    if (hash === '#/rider') return 'rider'
    return 'main'
  })

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash
      if (hash === '#/admin') {
        setPage('admin')
      } else if (hash === '#/rider') {
        setPage('rider')
      } else {
        setPage('main')
        const id = hash.slice(1)
        if (id) {
          const el = document.getElementById(id)
          if (el) el.scrollIntoView()
        }
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (page === 'admin') {
    return <Admin />
  }

  if (page === 'rider') {
    return <RiderPanel />
  }

  return (
    <CartProvider>
      <div className="min-h-screen bg-[#09090b] text-[#fafafa] overflow-x-hidden">
        <Navbar />
        <Hero />
        <MenuSection />
        <MediaShowcase />
        <Testimonials />
        <CTA />
        <RatingSection />
        <Footer />
        <CartDrawer />
        <CheckoutModal />
      </div>
    </CartProvider>
  )
}
