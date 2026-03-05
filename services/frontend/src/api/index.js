import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
})

// Attach auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Product API
export const productApi = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  search: (q) => api.get('/products/search', { params: { q } }),
  getBrands: () => api.get('/brands'),
  getCategories: () => api.get('/categories'),
  getReviews: (id) => api.get(`/products/${id}/reviews`),
  addReview: (id, review) => api.post(`/products/${id}/reviews`, review),
}

// Auth API
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verify: () => api.get('/auth/verify'),
}

// User API
export const userApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
}

// Cart API
export const cartApi = {
  getCart: (userId) => api.get(`/cart/${userId}`),
  addItem: (userId, item) => api.post(`/cart/${userId}/items`, item),
  updateItem: (userId, productId, qty) => api.put(`/cart/${userId}/items/${productId}`, { quantity: qty }),
  removeItem: (userId, productId) => api.delete(`/cart/${userId}/items/${productId}`),
  clearCart: (userId) => api.delete(`/cart/${userId}`),
}

// Order API
export const orderApi = {
  create: (data) => api.post('/orders', data),
  getById: (id) => api.get(`/orders/${id}`),
  getUserOrders: (userId) => api.get(`/orders/user/${userId}`),
}

// Payment API
export const paymentApi = {
  process: (data) => api.post('/payments/process', data),
}

export default api
