import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      await register(form.email, form.password, form.full_name)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl text-gray-900">Create Account</h1>
          <p className="text-gold-600 text-xs tracking-widest uppercase mt-1">Join Tarun's Store</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 border border-gray-100 p-8">
          {error && <div className="bg-red-50 text-red-700 text-sm p-3 border border-red-200">{error}</div>}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Full Name</label>
            <input className="input-field" value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Email</label>
            <input type="email" className="input-field" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Password</label>
            <input type="password" className="input-field" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Confirm Password</label>
            <input type="password" className="input-field" value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-6">
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-gold-600 hover:text-gold-700">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
