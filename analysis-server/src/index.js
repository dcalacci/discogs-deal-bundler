import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import axios from 'axios'

dotenv.config()

const app = express()

// More explicit CORS configuration
app.use(cors({
  origin: ['https://www.discogs.com', 'https://discogs.com'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Add explicit OPTIONS handler for preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://www.discogs.com')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.sendStatus(200)
})

app.use(express.json({ limit: '2mb' }))

const PORT = process.env.PORT || 4002
const DISCOGS_API = 'https://api.discogs.com'

function parseCurrencyToUSD(value) {
  // naive parser; returns number and currency symbol code
  if (!value) return { amount: 0, currency: 'USD' }
  const trimmed = String(value).trim()
  const currencyMatch = trimmed.match(/^[^0-9\-]*?/)
  const symbol = currencyMatch ? currencyMatch[0].trim() : ''
  const num = parseFloat(trimmed.replace(/[^0-9.,-]/g, '').replace(',', '.'))
  return { amount: isNaN(num) ? 0 : num, currency: symbol || 'USD' }
}

function normalizePrices(items) {
  return items.map(it => {
    const price = parseCurrencyToUSD(it.price)
    const shipping = parseCurrencyToUSD(it.shipping)
    return { ...it, priceParsed: price, shippingParsed: shipping }
  })
}

function scoreSeller(agg) {
  // Basic scoring: more unique listings and lower average total price
  const releaseScore = agg.uniqueListings.size * 10
  const avg = agg.totalPrice / Math.max(1, agg.count)
  const priceScore = Math.max(0, 100 - avg)
  const itemScore = agg.count * 2
  return releaseScore + priceScore + itemScore
}

app.post('/analyze', async (req, res) => {
  try {
    // Add CORS headers explicitly for this endpoint
    res.header('Access-Control-Allow-Origin', 'https://www.discogs.com')
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    console.log('Received analyze request from origin:', req.headers.origin)
    const { token, listings } = req.body || {}
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return res.status(400).json({ error: 'token required' })
    }
    if (!Array.isArray(listings) || listings.length === 0) {
      return res.status(400).json({ error: 'listings required' })
    }
    // Optional token for future enrichment
    const effectiveToken = token.trim()
    const items = normalizePrices(listings)

    const sellerMap = new Map()
    for (const it of items) {
      const sellerKey = (it.seller || '').trim()
      if (!sellerKey) continue
      if (!sellerMap.has(sellerKey)) {
        sellerMap.set(sellerKey, {
          seller: sellerKey,
          sellerRatings: it.sellerRatings || '',
          items: [],
          count: 0,
          totalPrice: 0,
          uniqueListings: new Set(),
        })
      }
      const entry = sellerMap.get(sellerKey)
      const totalThis = (it.priceParsed?.amount || 0) + (it.shippingParsed?.amount || 0)
      entry.items.push({
        listingId: it.listingId,
        release: it.release || '',
        price: it.price,
        shipping: it.shipping,
        total: totalThis,
      })
      entry.count += 1
      entry.totalPrice += totalThis
      if (it.listingId) entry.uniqueListings.add(it.listingId)
    }

    const sellers = Array.from(sellerMap.values()).map(s => ({
      ...s,
      uniqueCount: s.uniqueListings.size,
      avgTotal: s.totalPrice / Math.max(1, s.count),
    }))
    sellers.forEach(s => (s.score = scoreSeller(s)))
    sellers.sort((a, b) => b.score - a.score)

    return res.json({
      sellers,
      totals: {
        numSellers: sellers.length,
        numListings: items.length,
      },
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'internal_error' })
  }
})

// optional: enrich endpoint to fetch inventory by seller and cross-match releases (future work)
app.get('/health', (req, res) => res.json({ status: 'ok' }))

// Only start the server when not under tests
export { app }
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Discogs analysis server running on :${PORT}`)
  })
}

