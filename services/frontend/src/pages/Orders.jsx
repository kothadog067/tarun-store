import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, ChevronDown, ChevronUp } from 'lucide-react'
import { orderApi } from '../api'
import { useAuth } from '../context/AuthContext'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function Orders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    if (!user) { setLoading(false); return }
    orderApi.getUserOrders(user.id)
      .then(({ data }) => setOrders(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <p className="text-gray-700 mb-4">Please sign in to view your orders.</p>
        <Link to="/login" className="btn-primary">Sign In</Link>
      </div>
    )
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 w-full" />)}
    </div>
  )

  if (orders.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <Package size={64} className="mx-auto text-gray-200 mb-6" />
        <h1 className="font-serif text-3xl text-gray-900 mb-3">No orders yet</h1>
        <p className="text-gray-500 mb-8">Start shopping to see your orders here.</p>
        <Link to="/products" className="btn-primary">Shop Now</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="section-title mb-8">My Orders</h1>
      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="border border-gray-200">
            <div
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpanded(e => ({ ...e, [order.id]: !e[order.id] }))}
            >
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-medium text-gray-900 font-mono text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <span className={`text-xs px-3 py-1 font-medium capitalize ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                  {order.status}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-semibold text-gray-900 price-tag">${order.total?.toLocaleString()}</p>
                {expanded[order.id] ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </div>
            </div>

            {expanded[order.id] && (
              <div className="border-t border-gray-100 p-5">
                <div className="space-y-3 mb-4">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      {item.image_url && (
                        <div className="w-12 h-12 bg-gray-50 flex-shrink-0">
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-gray-500 text-xs">{item.brand} · Qty {item.quantity}</p>
                      </div>
                      <p className="font-medium price-tag">${(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4 text-sm text-gray-600 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Shipping to</p>
                    <p>{order.shipping_address}, {order.shipping_city}</p>
                  </div>
                  {order.tracking_number && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Tracking</p>
                      <p className="font-mono">{order.tracking_number}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
