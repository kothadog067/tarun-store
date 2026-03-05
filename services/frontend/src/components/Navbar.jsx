import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Search, User, Menu, X, LogOut, Package } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { productApi } from '../api'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { cart } = useCart()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleSearch = async (q) => {
    setSearchQuery(q)
    if (q.length < 2) { setSearchResults([]); return }
    try {
      const { data } = await productApi.search(q)
      setSearchResults(data.slice(0, 5))
    } catch { setSearchResults([]) }
  }

  const goToProduct = (id) => {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
    navigate(`/products/${id}`)
  }

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
    navigate('/')
  }

  const categories = [
    { label: 'Bags', value: 'bags' },
    { label: 'Watches', value: 'watches' },
    { label: 'Jewelry', value: 'jewelry' },
    { label: 'Electronics', value: 'electronics' },
    { label: 'Shoes', value: 'shoes' },
    { label: 'Accessories', value: 'accessories' },
    { label: 'Fragrance', value: 'fragrance' },
  ]

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      {/* Top bar */}
      <div className="bg-gray-900 text-center py-2">
        <p className="text-xs text-gold-400 tracking-widest uppercase">Free Worldwide Shipping on Orders Over $500</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Mobile menu button */}
          <button className="md:hidden text-gray-900" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo */}
          <Link to="/" className="flex-shrink-0 text-center">
            <span className="font-serif text-xl md:text-2xl font-bold text-gray-900 tracking-wide">
              TARUN'S STORE
            </span>
            <p className="text-xs text-gold-600 tracking-[0.3em] uppercase font-light -mt-1 hidden sm:block">Luxury Redefined</p>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/products" className="text-sm text-gray-700 hover:text-gold-600 transition-colors tracking-wide uppercase font-medium">
              All
            </Link>
            {categories.slice(0, 4).map(cat => (
              <Link
                key={cat.value}
                to={`/products?category=${cat.value}`}
                className="text-sm text-gray-700 hover:text-gold-600 transition-colors tracking-wide uppercase font-medium"
              >
                {cat.label}
              </Link>
            ))}
          </nav>

          {/* Right icons */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <button onClick={() => setSearchOpen(!searchOpen)} className="text-gray-700 hover:text-gold-600 transition-colors">
                <Search size={20} />
              </button>
              {searchOpen && (
                <div className="absolute right-0 top-8 w-80 bg-white border border-gray-200 shadow-2xl z-50">
                  <div className="p-3 border-b">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search luxury items..."
                      value={searchQuery}
                      onChange={e => handleSearch(e.target.value)}
                      className="w-full text-sm outline-none py-1"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div>
                      {searchResults.map(p => (
                        <button
                          key={p.id}
                          onClick={() => goToProduct(p.id)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                        >
                          <img src={p.image_url} alt={p.name} className="w-10 h-10 object-cover" />
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-gold-600">{p.brand} · ${p.price.toLocaleString()}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User */}
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="text-gray-700 hover:text-gold-600 transition-colors">
                <User size={20} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-8 w-48 bg-white border border-gray-200 shadow-2xl z-50">
                  {user ? (
                    <>
                      <div className="p-3 border-b">
                        <p className="text-sm font-medium">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <Link to="/orders" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 p-3 text-sm hover:bg-gray-50">
                        <Package size={14} /> My Orders
                      </Link>
                      <button onClick={handleLogout}
                        className="flex items-center gap-2 p-3 text-sm hover:bg-gray-50 w-full text-left text-red-600">
                        <LogOut size={14} /> Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setUserMenuOpen(false)}
                        className="block p-3 text-sm hover:bg-gray-50">Sign In</Link>
                      <Link to="/register" onClick={() => setUserMenuOpen(false)}
                        className="block p-3 text-sm hover:bg-gray-50 border-t">Create Account</Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Cart */}
            <Link to="/cart" className="relative text-gray-700 hover:text-gold-600 transition-colors">
              <ShoppingBag size={20} />
              {cart.item_count > 0 && (
                <span className="absolute -top-2 -right-2 bg-gold-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                  {cart.item_count > 9 ? '9+' : cart.item_count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t bg-white">
          {categories.map(cat => (
            <Link
              key={cat.value}
              to={`/products?category=${cat.value}`}
              onClick={() => setMenuOpen(false)}
              className="block px-6 py-3 text-sm uppercase tracking-wide text-gray-700 hover:text-gold-600 border-b border-gray-50"
            >
              {cat.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
