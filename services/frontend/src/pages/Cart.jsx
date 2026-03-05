import React from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function Cart() {
  const { cart, updateItem, removeItem } = useCart()

  if (cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <ShoppingBag size={64} className="mx-auto text-gray-200 mb-6" />
        <h1 className="font-serif text-3xl text-gray-900 mb-3">Your bag is empty</h1>
        <p className="text-gray-500 mb-8">Discover our curated selection of luxury items.</p>
        <Link to="/products" className="btn-primary inline-flex items-center gap-2">
          Continue Shopping <ArrowRight size={16} />
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="section-title mb-8">Shopping Bag ({cart.item_count})</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <div key={item.product_id} className="flex gap-5 border border-gray-100 p-4">
              <div className="w-24 h-24 flex-shrink-0 bg-gray-50">
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gold-600 uppercase tracking-widest mb-1">{item.brand}</p>
                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-lg font-semibold text-gray-900 mt-1 price-tag">${item.price.toLocaleString()}</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center border border-gray-200">
                    <button onClick={() => updateItem(item.product_id, item.quantity - 1)}
                      className="px-3 py-1 text-gray-500 hover:bg-gray-50">
                      <Minus size={14} />
                    </button>
                    <span className="px-3 py-1 text-sm min-w-[2rem] text-center">{item.quantity}</span>
                    <button onClick={() => updateItem(item.product_id, item.quantity + 1)}
                      className="px-3 py-1 text-gray-500 hover:bg-gray-50">
                      <Plus size={14} />
                    </button>
                  </div>
                  <button onClick={() => removeItem(item.product_id)}
                    className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900 price-tag">${(item.price * item.quantity).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 p-6 sticky top-24">
            <h2 className="font-serif text-xl mb-6">Order Summary</h2>
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cart.item_count} items)</span>
                <span className="price-tag">${cart.subtotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (8.5%)</span>
                <span className="price-tag">${cart.tax?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-green-600">{cart.subtotal >= 500 ? 'Free' : '$25.00'}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-semibold text-gray-900 text-base">
                <span>Total</span>
                <span className="price-tag">${cart.total?.toLocaleString()}</span>
              </div>
            </div>
            <Link to="/checkout" className="btn-primary w-full flex items-center justify-center gap-2">
              Checkout <ArrowRight size={16} />
            </Link>
            <Link to="/products" className="block text-center mt-4 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
