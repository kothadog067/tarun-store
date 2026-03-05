import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { productApi } from '../api'
import ProductCard from '../components/ProductCard'

const CATEGORIES = ['bags', 'watches', 'jewelry', 'electronics', 'shoes', 'accessories', 'fragrance']
const BRANDS = ['Apple', 'Cartier', 'Chanel', 'Gucci', 'Hermes', 'Louis Vuitton', 'Rolex']
const PRICE_RANGES = [
  { label: 'All Prices', min: null, max: null },
  { label: 'Under $500', min: null, max: 500 },
  { label: '$500 – $2,000', min: 500, max: 2000 },
  { label: '$2,000 – $10,000', min: 2000, max: 10000 },
  { label: 'Over $10,000', min: 10000, max: null },
]

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const category = searchParams.get('category') || ''
  const brand = searchParams.get('brand') || ''
  const featured = searchParams.get('featured') === 'true' ? true : undefined
  const minPrice = searchParams.get('min_price') ? Number(searchParams.get('min_price')) : undefined
  const maxPrice = searchParams.get('max_price') ? Number(searchParams.get('max_price')) : undefined

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (category) params.category = category
      if (brand) params.brand = brand
      if (featured) params.featured = true
      if (minPrice) params.min_price = minPrice
      if (maxPrice) params.max_price = maxPrice
      const { data } = await productApi.getAll(params)
      setProducts(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [category, brand, featured, minPrice, maxPrice])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const setFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams)
    if (value) newParams.set(key, value)
    else newParams.delete(key)
    setSearchParams(newParams)
  }

  const clearFilters = () => setSearchParams({})

  const hasFilters = category || brand || featured || minPrice || maxPrice

  const pageTitle = category
    ? category.charAt(0).toUpperCase() + category.slice(1)
    : brand || (featured ? 'Featured' : 'All Products')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">{pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-1">{products.length} items</p>
        </div>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-2 text-sm text-gray-600 border border-gray-300 px-4 py-2 hover:border-gray-900 transition-colors"
        >
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>

      {/* Active filters */}
      {hasFilters && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-xs text-gray-500">Active:</span>
          {category && <FilterChip label={category} onRemove={() => setFilter('category', '')} />}
          {brand && <FilterChip label={brand} onRemove={() => setFilter('brand', '')} />}
          {featured && <FilterChip label="Featured" onRemove={() => setFilter('featured', '')} />}
          <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700">Clear all</button>
        </div>
      )}

      <div className="flex gap-8">
        {/* Sidebar filters */}
        {filtersOpen && (
          <aside className="w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <FilterSection title="Category">
                <button onClick={() => setFilter('category', '')} className={`filter-btn ${!category ? 'text-gold-600 font-medium' : 'text-gray-600'}`}>All</button>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setFilter('category', c)}
                    className={`filter-btn capitalize ${category === c ? 'text-gold-600 font-medium' : 'text-gray-600'}`}>
                    {c}
                  </button>
                ))}
              </FilterSection>

              <FilterSection title="Brand">
                <button onClick={() => setFilter('brand', '')} className={`filter-btn ${!brand ? 'text-gold-600 font-medium' : 'text-gray-600'}`}>All</button>
                {BRANDS.map(b => (
                  <button key={b} onClick={() => setFilter('brand', b)}
                    className={`filter-btn ${brand === b ? 'text-gold-600 font-medium' : 'text-gray-600'}`}>
                    {b}
                  </button>
                ))}
              </FilterSection>

              <FilterSection title="Price">
                {PRICE_RANGES.map((range, i) => (
                  <button key={i}
                    onClick={() => {
                      setFilter('min_price', range.min)
                      setFilter('max_price', range.max)
                    }}
                    className={`filter-btn ${minPrice === range.min && maxPrice === range.max ? 'text-gold-600 font-medium' : 'text-gray-600'}`}>
                    {range.label}
                  </button>
                ))}
              </FilterSection>
            </div>
          </aside>
        )}

        {/* Products grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="skeleton aspect-square" />
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">No products found</p>
              <button onClick={clearFilters} className="mt-4 text-gold-600 hover:text-gold-700 text-sm">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map(product => <ProductCard key={product.id} product={product} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterSection({ title, children }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3 font-medium">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-3 py-1 capitalize">
      {label}
      <button onClick={onRemove} className="hover:text-red-500"><X size={12} /></button>
    </span>
  )
}
