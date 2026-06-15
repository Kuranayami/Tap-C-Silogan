import { useState, useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import { CartProvider, useCheckout } from './context/CartContext'
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
import CashierPanel from './components/CashierPanel'
import RiderPanel from './components/RiderPanel'
import RestaurantPanel from './components/RestaurantPanel'
import LoginPage from './components/LoginPage'
import OrderTracking from './components/OrderTracking'
import UserProfile from './components/UserProfile'
import RiderProfile from './components/RiderProfile'
import CashierProfile from './components/CashierProfile'

function MainLayout() {
  const { openCheckout } = useCheckout()

  useEffect(() => {
    if (window.location.hash === '#/checkout') {
      openCheckout()
      window.location.hash = ''
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#FFFBDA] text-[#D48040] overflow-x-hidden">
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
  )
}

function AppContent() {
  const [page, setPage] = useState(() => {
    const hash = window.location.hash
    if (hash === '#/admin') return 'admin'
    if (hash === '#/cashier') return 'cashier'
    if (hash === '#/rider') return 'rider'
    if (hash === '#/restaurant') return 'restaurant'
    if (hash === '#/login') return 'login'
    if (hash === '#/login?redirect=checkout') return 'login-redirect'
    if (hash === '#/track') return 'track'
    if (hash === '#/profile') return 'profile'
    if (hash === '#/rider/profile') return 'rider-profile'
    if (hash === '#/cashier/profile') return 'cashier-profile'
    return 'main'
  })

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash
      if (hash === '#/admin') {
        setPage('admin')
      } else if (hash === '#/cashier') {
        setPage('cashier')
      } else if (hash === '#/rider') {
        setPage('rider')
      } else if (hash === '#/restaurant') {
        setPage('restaurant')
      } else if (hash === '#/login') {
        setPage('login')
      } else if (hash === '#/login?redirect=checkout') {
        setPage('login-redirect')
      } else if (hash === '#/track') {
        setPage('track')
      } else if (hash === '#/profile') {
        setPage('profile')
      } else if (hash === '#/rider/profile') {
        setPage('rider-profile')
      } else if (hash === '#/cashier/profile') {
        setPage('cashier-profile')
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

  if (page === 'cashier') {
    return <CashierPanel />
  }

  if (page === 'rider') {
    return <RiderPanel />
  }

  if (page === 'restaurant') {
    return <RestaurantPanel />
  }

  if (page === 'profile') {
    return <UserProfile onBack={() => { window.location.hash = '' }} />
  }

  if (page === 'rider-profile') {
    return <RiderProfile onBack={() => { window.location.hash = '#/rider' }} />
  }

  if (page === 'cashier-profile') {
    return <CashierProfile onBack={() => { window.location.hash = '#/cashier' }} />
  }

  if (page === 'login') {
    return <LoginPage onLogin={(user) => { window.location.hash = user && !user.phone ? '#/profile' : '' }} />
  }

  if (page === 'login-redirect') {
    return <LoginPage onLogin={(user) => { window.location.hash = user && !user.phone ? '#/profile' : '#/checkout' }} />
  }

  if (page === 'track') {
    return <OrderTracking />
  }

  return <MainLayout />
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  )
}