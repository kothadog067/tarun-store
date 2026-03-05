import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, Heart, Star } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function ProductCard({ product }) {
  const { addItem } = useCart()
  const [adding, setAdding] = useState(false)
  const [wished, setWished] = useState(false)

  const handleAddToCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setAdding(true)
    await addItem(product, 1)
    setTimeout(() => setAdding(false), 1000)
  }

  const discount = product.original_price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : null

  return (
    <Link to={`/products/${product.id}`} className="group block">
      <div className="card-hover bg-white">
        {/* Image */}
        <div className="relative overflow-hidden bg-gray-50 aspect-square">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {discount && (
            <span className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 font-medium">
              -{discount}%
            </span>
          )}
          {product.is_featured && (
            <span className="absolute top-3 right-3 bg-gold-600 text-white text-xs px-2 py-1 font-medium tracking-wider">
              FEATURED
            </span>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
          <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex">
            <button
              onClick={handleAddToCart}
              disabled={adding}
              className="flex-1 bg-gray-900 text-white py-3 text-xs uppercase tracking-widest font-medium hover:bg-gold-600 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBag size={14} />
              {adding ? 'Added!' : 'Add to Bag'}
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWished(!wished) }}
              className="bg-white px-4 border-l border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Heart size={16} className={wished ? 'fill-red-500 text-red-500' : 'text-gray-500'} />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-xs text-gold-600 uppercase tracking-widest font-medium mb-1">{product.brand}</p>
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 group-hover:text-gold-700 transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-1 mb-2">
            <div className="flex">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={11} className={s <= Math.round(product.rating) ? 'fill-gold-500 text-gold-500' : 'text-gray-300'} />
              ))}
            </div>
            <span className="text-xs text-gray-500">({product.review_count})</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-gray-900 price-tag">${product.price.toLocaleString()}</span>
            {product.original_price && (
              <span className="text-sm text-gray-400 line-through price-tag">${product.original_price.toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
