import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <h3 className="font-serif text-2xl mb-2">TARUN'S STORE</h3>
            <p className="text-gold-400 text-xs tracking-widest uppercase mb-4">Luxury Redefined</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              The world's finest luxury brands, curated for the discerning few.
            </p>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-widest text-gold-400 mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              {['Bags', 'Watches', 'Jewelry', 'Electronics', 'Shoes', 'Accessories', 'Fragrance'].map(c => (
                <li key={c}>
                  <Link to={`/products?category=${c.toLowerCase()}`} className="hover:text-white transition-colors">{c}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-widest text-gold-400 mb-4">Brands</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              {['Gucci', 'Louis Vuitton', 'Rolex', 'Hermes', 'Chanel', 'Cartier', 'Apple'].map(b => (
                <li key={b}>
                  <Link to={`/products?brand=${b}`} className="hover:text-white transition-colors">{b}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-widest text-gold-400 mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/orders" className="hover:text-white transition-colors">Track Order</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Returns & Exchanges</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Authenticity</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-gray-500">© 2025 Tarun's Store. All rights reserved.</p>
          <p className="text-xs text-gray-600 mt-2 sm:mt-0">Powered by love and observability</p>
        </div>
      </div>
    </footer>
  )
}
