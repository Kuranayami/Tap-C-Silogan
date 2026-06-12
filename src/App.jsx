import { useState, useEffect } from 'react'
import { CartProvider } from './context/CartContext'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import MenuSection from './components/MenuSection'
import MediaShowcase from './components/MediaShowcase'
import Testimonials from './components/Testimonials'
import CTA from './components/CTA'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import CheckoutModal from './components/CheckoutModal'
import Admin from './components/Admin'

export default function App() {
  const [page, setPage] = useState(() => {
    const hash = window.location.hash
    if (hash === '#/admin') return 'admin'
    return 'main'
  })

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash
      setPage(hash === '#/admin' ? 'admin' : 'main')
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (page === 'admin') {
    return <Admin />
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
        <Footer />
        <CartDrawer />
        <CheckoutModal />
      </div>
    </CartProvider>
  )
}
