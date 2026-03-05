import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Shield, Truck, RefreshCw, Star } from 'lucide-react'
import { productApi } from '../api'
import ProductCard from '../components/ProductCard'

const BRANDS = [
  { name: 'Gucci', color: 'bg-green-900' },
  { name: 'Louis Vuitton', color: 'bg-amber-900' },
  { name: 'Rolex', color: 'bg-emerald-900' },
  { name: 'Hermès', color: 'bg-orange-900' },
  { name: 'Chanel', color: 'bg-gray-900' },
  { name: 'Cartier', color: 'bg-red-900' },
  { name: 'Apple', color: 'bg-slate-800' },
]

const CATEGORIES = [
  { name: 'Bags', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80', value: 'bags' },
  { name: 'Watches', image: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=400&q=80', value: 'watches' },
  { name: 'Jewelry', image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80', value: 'jewelry' },
  { name: 'Electronics', image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80', value: 'electronics' },
]

export default function Home() {
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    productApi.getAll({ featured: true, limit: 8 })
      .then(({ data }) => setFeatured(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80"
            alt="Luxury fashion"
            className="w-full h-full object-cover opacity-30"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-32 md:py-48">
          <div className="max-w-2xl">
            <p className="text-gold-400 uppercase tracking-[0.4em] text-sm mb-4 font-light">New Collection 2025</p>
            <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight mb-6">
              Luxury<br />
              <span className="text-gold-400">Redefined</span>
            </h1>
            <p className="text-gray-300 text-lg mb-10 leading-relaxed max-w-lg">
              Discover the world's most coveted brands. From Gucci to Rolex, curated for those who demand only the finest.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/products" className="btn-gold inline-flex items-center gap-2">
                Shop Now <ArrowRight size={16} />
              </Link>
              <Link to="/products?featured=true" className="btn-outline border-white text-white hover:bg-white hover:text-gray-900 inline-flex items-center gap-2">
                View Featured
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Brands strip */}
      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 uppercase tracking-widest mr-4">As seen at</span>
            {BRANDS.map(brand => (
              <Link
                key={brand.name}
                to={`/products?brand=${brand.name}`}
                className="px-5 py-2 text-sm font-medium text-gray-700 hover:text-gold-600 transition-colors tracking-wide border-r last:border-0 border-gray-300"
              >
                {brand.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-gold-600 uppercase tracking-widest text-xs mb-2">Browse by Category</p>
          <h2 className="section-title">Shop by Collection</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map(cat => (
            <Link key={cat.value} to={`/products?category=${cat.value}`} className="group relative overflow-hidden aspect-square bg-gray-100">
              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors duration-300" />
              <div className="absolute inset-0 flex items-end p-5">
                <div>
                  <h3 className="text-white font-serif text-xl font-semibold">{cat.name}</h3>
                  <p className="text-gold-300 text-xs uppercase tracking-widest mt-1 group-hover:text-gold-200 transition-colors">
                    Explore →
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 pb-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-gold-600 uppercase tracking-widest text-xs mb-2">Hand-picked for You</p>
            <h2 className="section-title">Featured Pieces</h2>
          </div>
          <Link to="/products?featured=true" className="text-sm text-gray-600 hover:text-gold-600 transition-colors hidden sm:flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="skeleton aspect-square" />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {featured.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>

      {/* Promo Banner */}
      <section className="bg-gray-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-gold-400 uppercase tracking-[0.4em] text-xs mb-4">Exclusive Offer</p>
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
            The New Season<br />Has Arrived
          </h2>
          <p className="text-gray-400 mb-8 text-lg">Explore our latest arrivals from Chanel, Hermès, and more.</p>
          <Link to="/products" className="btn-gold inline-flex items-center gap-2">
            Discover Now <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Trust badges */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { icon: <Shield size={28} className="text-gold-600" />, title: '100% Authentic', desc: 'Every item is guaranteed authentic with certificates of authenticity.' },
            { icon: <Truck size={28} className="text-gold-600" />, title: 'Free Express Shipping', desc: 'Complimentary worldwide shipping on all orders over $500.' },
            { icon: <RefreshCw size={28} className="text-gold-600" />, title: 'Hassle-free Returns', desc: '14-day returns on all items. No questions asked.' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="flex justify-center mb-4">{item.icon}</div>
              <h3 className="font-serif text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
