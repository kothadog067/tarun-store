import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { CreditCard, Lock, CheckCircle } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { orderApi, paymentApi } from '../api'

export default function Checkout() {
  const { cart, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1=info, 2=payment, 3=success
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orderId, setOrderId] = useState(null)

  const [info, setInfo] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    address: '',
    city: '',
    country: 'USA',
  })

  const [payment, setPayment] = useState({
    card_number: '',
    expiry: '',
    cvv: '',
    card_name: '',
  })

  if (cart.items.length === 0 && step !== 3) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <p className="text-gray-500">Your cart is empty.</p>
        <Link to="/products" className="text-gold-600 mt-2 block">Continue Shopping</Link>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <p className="text-gray-700 mb-4">Please sign in to checkout.</p>
        <Link to="/login" className="btn-primary">Sign In</Link>
      </div>
    )
  }

  const handleInfoSubmit = (e) => {
    e.preventDefault()
    if (!info.full_name || !info.email || !info.address || !info.city) {
      setError('Please fill in all required fields.')
      return
    }
    setError('')
    setStep(2)
  }

  const handlePaymentSubmit = async (e) => {
    e.preventDefault()
    if (!payment.card_number || !payment.expiry || !payment.cvv) {
      setError('Please fill in all payment details.')
      return
    }
    setError('')
    setLoading(true)

    try {
      // Create order
      const orderData = {
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        items: cart.items.map(i => ({
          product_id: i.product_id,
          name: i.name,
          brand: i.brand,
          price: i.price,
          quantity: i.quantity,
          image_url: i.image_url,
        })),
        subtotal: cart.subtotal,
        tax: cart.tax,
        total: cart.total,
        shipping_address: info.address,
        shipping_city: info.city,
        shipping_country: info.country,
      }
      const { data: order } = await orderApi.create(orderData)

      // Process payment
      await paymentApi.process({
        order_id: order.id,
        user_id: user.id,
        amount: cart.total,
        currency: 'USD',
        payment_method: 'card',
        card_last_four: payment.card_number.slice(-4),
        card_brand: 'Visa',
      })

      setOrderId(order.id)
      await clearCart()
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.detail || 'Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 3) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
        <h1 className="font-serif text-3xl text-gray-900 mb-3">Order Confirmed!</h1>
        <p className="text-gray-600 mb-2">Thank you for your purchase.</p>
        <p className="text-sm text-gray-500 mb-8">Order ID: <span className="font-mono font-medium">{orderId?.slice(0, 8).toUpperCase()}</span></p>
        <p className="text-sm text-gray-500 mb-8">A confirmation email has been sent to <strong>{info.email}</strong></p>
        <div className="flex gap-4 justify-center">
          <Link to="/orders" className="btn-primary">View Orders</Link>
          <Link to="/products" className="btn-outline">Continue Shopping</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="section-title mb-8">Checkout</h1>

      {/* Steps */}
      <div className="flex items-center gap-4 mb-10">
        {['Shipping', 'Payment'].map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 text-sm ${step === i + 1 ? 'text-gold-600 font-medium' : step > i + 1 ? 'text-green-600' : 'text-gray-400'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === i + 1 ? 'bg-gold-600 text-white' : step > i + 1 ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>{i + 1}</span>
              {s}
            </div>
            {i < 1 && <div className="flex-1 h-px bg-gray-200" />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Form */}
        <div className="lg:col-span-2">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-4 mb-6 border border-red-200">{error}</div>
          )}

          {step === 1 && (
            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <h2 className="font-serif text-xl mb-4">Shipping Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Full Name *</label>
                  <input className="input-field" value={info.full_name} onChange={e => setInfo(f => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Email *</label>
                  <input type="email" className="input-field" value={info.email} onChange={e => setInfo(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Street Address *</label>
                  <input className="input-field" value={info.address} onChange={e => setInfo(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">City *</label>
                  <input className="input-field" value={info.city} onChange={e => setInfo(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Country</label>
                  <select className="input-field" value={info.country} onChange={e => setInfo(f => ({ ...f, country: e.target.value }))}>
                    <option>USA</option><option>UK</option><option>Canada</option><option>France</option><option>UAE</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full mt-6">Continue to Payment</button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <h2 className="font-serif text-xl mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-gold-600" /> Payment Details
              </h2>
              <div className="bg-gray-50 border border-gray-200 p-4 rounded text-sm text-gray-600 flex items-center gap-2 mb-2">
                <Lock size={14} className="text-green-600" />
                Demo mode — no real charges. Use any 16-digit card number.
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Cardholder Name</label>
                <input className="input-field" placeholder="John Smith" value={payment.card_name}
                  onChange={e => setPayment(f => ({ ...f, card_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Card Number</label>
                <input className="input-field" placeholder="4242 4242 4242 4242" maxLength={19}
                  value={payment.card_number}
                  onChange={e => setPayment(f => ({ ...f, card_number: e.target.value.replace(/\D/g, '').slice(0,16) }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Expiry</label>
                  <input className="input-field" placeholder="MM/YY" maxLength={5} value={payment.expiry}
                    onChange={e => setPayment(f => ({ ...f, expiry: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">CVV</label>
                  <input className="input-field" placeholder="123" maxLength={4} value={payment.cvv}
                    onChange={e => setPayment(f => ({ ...f, cvv: e.target.value.replace(/\D/g, '').slice(0,4) }))} />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button type="button" onClick={() => setStep(1)} className="btn-outline flex-1">Back</button>
                <button type="submit" disabled={loading} className="btn-gold flex-1 flex items-center justify-center gap-2">
                  <Lock size={14} />
                  {loading ? 'Processing...' : `Pay $${cart.total?.toLocaleString()}`}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 p-5 sticky top-24">
            <h3 className="font-serif text-lg mb-4">Your Order</h3>
            <div className="space-y-3 mb-4">
              {cart.items.map(item => (
                <div key={item.product_id} className="flex items-center gap-3 text-sm">
                  <div className="w-12 h-12 bg-white flex-shrink-0">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-gray-500 text-xs">Qty {item.quantity}</p>
                  </div>
                  <p className="font-medium price-tag">${(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-2 text-sm text-gray-600">
              <div className="flex justify-between"><span>Subtotal</span><span>${cart.subtotal?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>${cart.tax?.toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold text-gray-900 text-base border-t pt-2 mt-2">
                <span>Total</span><span>${cart.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
