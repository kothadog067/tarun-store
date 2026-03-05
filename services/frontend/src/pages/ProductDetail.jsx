import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShoppingBag, Star, Shield, Truck, RotateCcw, ChevronRight } from 'lucide-react'
import { productApi } from '../api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'

export default function ProductDetail() {
  const { id } = useParams()
  const { addItem } = useCart()
  const { user } = useAuth()
  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const [addedMsg, setAddedMsg] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      productApi.getById(id),
      productApi.getReviews(id),
    ]).then(([prod, revs]) => {
      setProduct(prod.data)
      setReviews(revs.data)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleAddToCart = async () => {
    setAdding(true)
    await addItem(product, qty)
    setAdding(false)
    setAddedMsg(true)
    setTimeout(() => setAddedMsg(false), 2000)
  }

  const submitReview = async (e) => {
    e.preventDefault()
    if (!user) return
    setSubmittingReview(true)
    try {
      await productApi.addReview(id, {
        user_id: user.id,
        user_name: user.full_name,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      })
      const { data } = await productApi.getReviews(id)
      setReviews(data)
      const { data: updatedProduct } = await productApi.getById(id)
      setProduct(updatedProduct)
      setReviewForm({ rating: 5, comment: '' })
    } catch (e) { console.error(e) }
    finally { setSubmittingReview(false) }
  }

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="skeleton aspect-square" />
        <div className="space-y-4">
          <div className="skeleton h-6 w-1/3" />
          <div className="skeleton h-10 w-3/4" />
          <div className="skeleton h-6 w-1/4" />
        </div>
      </div>
    </div>
  )

  if (!product) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Product not found</p>
      <Link to="/products" className="text-gold-600 mt-2 block">Back to products</Link>
    </div>
  )

  const discount = product.original_price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link to="/" className="hover:text-gray-900">Home</Link>
        <ChevronRight size={14} />
        <Link to="/products" className="hover:text-gray-900">Products</Link>
        <ChevronRight size={14} />
        <Link to={`/products?category=${product.category}`} className="hover:text-gray-900 capitalize">{product.category}</Link>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
        {/* Image */}
        <div className="space-y-4">
          <div className="bg-gray-50 aspect-square overflow-hidden">
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Info */}
        <div>
          <p className="text-gold-600 uppercase tracking-widest text-xs font-medium mb-2">{product.brand}</p>
          <h1 className="font-serif text-3xl md:text-4xl text-gray-900 mb-4">{product.name}</h1>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={16} className={s <= Math.round(product.rating) ? 'fill-gold-500 text-gold-500' : 'text-gray-300'} />
              ))}
            </div>
            <span className="text-sm text-gray-500">{product.rating} ({product.review_count} reviews)</span>
          </div>

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-semibold text-gray-900 price-tag">${product.price.toLocaleString()}</span>
            {product.original_price && (
              <span className="text-lg text-gray-400 line-through price-tag">${product.original_price.toLocaleString()}</span>
            )}
            {discount && (
              <span className="bg-red-100 text-red-700 text-sm px-2 py-0.5 font-medium">Save {discount}%</span>
            )}
          </div>

          <p className="text-gray-600 leading-relaxed mb-8">{product.description}</p>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {product.tags.map(tag => (
                <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 capitalize">{tag}</span>
              ))}
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <label className="text-sm uppercase tracking-widest text-gray-500">Qty</label>
            <div className="flex items-center border border-gray-300">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-4 py-2 text-gray-600 hover:bg-gray-50">-</button>
              <span className="px-4 py-2 min-w-[3rem] text-center">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="px-4 py-2 text-gray-600 hover:bg-gray-50">+</button>
            </div>
            <span className="text-sm text-gray-500">{product.stock} in stock</span>
          </div>

          {/* Add to cart */}
          <button
            onClick={handleAddToCart}
            disabled={adding || addedMsg}
            className={`w-full flex items-center justify-center gap-3 py-4 text-sm uppercase tracking-widest font-medium transition-colors ${
              addedMsg ? 'bg-green-600 text-white' : 'bg-gray-900 text-white hover:bg-gold-600'
            }`}
          >
            <ShoppingBag size={18} />
            {addedMsg ? 'Added to Bag!' : adding ? 'Adding...' : 'Add to Bag'}
          </button>

          {/* Trust indicators */}
          <div className="mt-8 space-y-3 border-t pt-6">
            {[
              { icon: <Shield size={16} className="text-gold-600" />, text: '100% Authentic — Certificate included' },
              { icon: <Truck size={16} className="text-gold-600" />, text: 'Free Express Shipping' },
              { icon: <RotateCcw size={16} className="text-gold-600" />, text: '14-day hassle-free returns' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                {item.icon} {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="border-t pt-12">
        <h2 className="section-title mb-8">Customer Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-500 mb-8">No reviews yet. Be the first!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {reviews.map(r => (
              <div key={r.id} className="border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900">{r.user_name}</p>
                  <div className="flex">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={12} className={s <= r.rating ? 'fill-gold-500 text-gold-500' : 'text-gray-300'} />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 text-sm">{r.comment}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}

        {user ? (
          <form onSubmit={submitReview} className="max-w-lg">
            <h3 className="font-serif text-xl mb-4">Write a Review</h3>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Rating</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button" onClick={() => setReviewForm(f => ({ ...f, rating: s }))}>
                    <Star size={24} className={s <= reviewForm.rating ? 'fill-gold-500 text-gold-500' : 'text-gray-300'} />
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className="input-field mb-4 h-24 resize-none"
              placeholder="Share your experience..."
              value={reviewForm.comment}
              onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
            />
            <button type="submit" disabled={submittingReview} className="btn-primary">
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        ) : (
          <p className="text-gray-500 text-sm">
            <Link to="/login" className="text-gold-600 hover:underline">Sign in</Link> to leave a review.
          </p>
        )}
      </div>
    </div>
  )
}
