import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import axios from 'axios'
import fs from 'fs'
import path from 'path'

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

// Cache for listing data to avoid repeated API calls
const CACHE_FILE = path.join(process.cwd(), 'listing-cache.json')
let listingCache = new Map()

// Load cache from disk on startup
function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf8')
      const cacheData = JSON.parse(data)
      listingCache = new Map(Object.entries(cacheData))
      console.log(`Loaded ${listingCache.size} cached listings from disk`)
    }
  } catch (error) {
    console.warn('Failed to load cache from disk:', error.message)
  }
}

// Save cache to disk
function saveCache() {
  try {
    const cacheData = Object.fromEntries(listingCache)
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2))
    console.log(`Saved ${listingCache.size} listings to cache`)
  } catch (error) {
    console.warn('Failed to save cache to disk:', error.message)
  }
}

// Load cache on startup
loadCache()

function parseCurrencyToUSD(value) {
  if (!value) return { amount: 0, currency: 'USD' }
  const trimmed = String(value).trim()
  
  // Extract currency symbol (€, $, £, etc.)
  const currencyMatch = trimmed.match(/^[€$£¥₹₽₩₪₫₨₦₡₱₴₸₼₾₿]/)
  const symbol = currencyMatch ? currencyMatch[0] : ''
  
  // Extract numeric value, handling both comma and dot as decimal separators
  const numericMatch = trimmed.match(/[\d,.-]+/)
  if (!numericMatch) return { amount: 0, currency: symbol || 'USD' }
  
  let numStr = numericMatch[0]
  // Handle European format (comma as decimal separator)
  if (numStr.includes(',') && numStr.includes('.')) {
    // Format like "1,234.56" - comma is thousands separator
    numStr = numStr.replace(/,/g, '')
  } else if (numStr.includes(',') && !numStr.includes('.')) {
    // Format like "12,34" - comma is decimal separator
    numStr = numStr.replace(',', '.')
  }
  
  const num = parseFloat(numStr)
  return { amount: isNaN(num) ? 0 : num, currency: symbol || 'USD' }
}

function normalizePrices(items) {
  return items.map(it => {
    const price = parseCurrencyToUSD(it.price)
    const shipping = parseCurrencyToUSD(it.shipping)
    return { ...it, priceParsed: price, shippingParsed: shipping }
  })
}

async function fetchListingsFromAPI(listings, token) {
  const enrichedListings = []

  // Helper: fetch with retries and improved backoff (handles 429)
  async function fetchWithRetry(listingId, attempt = 1) {
    // Check cache first
    if (listingCache.has(listingId)) {
      return listingCache.get(listingId)
    }

    const maxAttempts = 3
    try {
      const response = await axios.get(`https://api.discogs.com/marketplace/listings/${listingId}` , {
        params: { token },
        headers: {
          'User-Agent': 'DiscogsSellerFilter/1.0 (+https://github.com/your-repo)'
        },
        validateStatus: (s) => s >= 200 && s < 300 || s === 429
      })

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers['retry-after'] || '0', 10)
        // More aggressive backoff: use retry-after header or exponential backoff
        const backoffMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(5000 * Math.pow(2, attempt - 1), 30000)
        console.log(`Rate limited for listing ${listingId}, backing off for ${backoffMs}ms (attempt ${attempt})`)
        
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, backoffMs))
          return fetchWithRetry(listingId, attempt + 1)
        }
        throw new Error('429 Too Many Requests')
      }

      const data = response.data
      // Cache the successful response
      listingCache.set(listingId, data)
      return data
    } catch (err) {
      if (attempt < maxAttempts) {
        // Exponential backoff for other errors too
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        await new Promise(r => setTimeout(r, backoffMs))
        return fetchWithRetry(listingId, attempt + 1)
      }
      throw err
    }
  }

  // Process in very small batches to avoid throttling
  const batchSize = 2
  for (let i = 0; i < listings.length; i += batchSize) {
    const batch = listings.slice(i, i + batchSize)
    const promises = batch.map(async (listing) => {
      try {
        const data = await fetchWithRetry(listing.listingId)
        // Prefer original_price/shipping_price formatted/value when available
        const priceCurrency = data.original_price?.curr_abbr || data.price?.currency
        const priceValue = data.original_price?.value ?? data.price?.value
        const shippingCurrency = data.original_shipping_price?.curr_abbr || data.shipping_price?.currency
        const shippingValue = data.original_shipping_price?.value ?? data.shipping_price?.value

        return {
          listingId: listing.listingId,
          release: listing.release || data.release?.description || data.release?.title || 'Unknown Release',
          seller: listing.seller || data.seller?.username || 'Unknown Seller',
          sellerRatings: listing.sellerRatings || (data.seller?.stats ? `(${data.seller.stats.total} ratings) ${data.seller.stats.rating}%` : ''),
          price: (priceCurrency && priceValue != null) ? `${priceCurrency}${priceValue}` : (listing.price || '0'),
          shipping: (shippingCurrency && shippingValue != null) ? `${shippingCurrency}${shippingValue}` : (listing.shipping || '0')
        }
      } catch (error) {
        console.warn(`Failed to fetch listing ${listing.listingId}:`, error.message)
        return {
          listingId: listing.listingId,
          release: listing.release || 'Unknown Release',
          seller: listing.seller || 'Unknown Seller',
          sellerRatings: listing.sellerRatings || '',
          price: listing.price || '0',
          shipping: listing.shipping || '0'
        }
      }
    })

    const batchResults = await Promise.all(promises)
    enrichedListings.push(...batchResults)

    // Longer delay between batches to be more respectful
    if (i + batchSize < listings.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // Save cache to disk after processing
  saveCache()
  return enrichedListings
}

function scoreSeller(agg) {
  // Basic scoring: more unique listings and lower average total price
  const releaseScore = agg.uniqueListings.size * 10
  const avg = agg.totalPrice / Math.max(1, agg.count)
  const priceScore = Math.max(0, 100 - avg)
  const itemScore = agg.count * 2
  return releaseScore + priceScore + itemScore
}

function optimizeBudget(items, budget) {
  // Group items by seller to handle shipping properly
  const bySeller = new Map()
  items.forEach(item => {
    const seller = item.seller || 'Unknown'
    if (!bySeller.has(seller)) {
      bySeller.set(seller, [])
    }
    bySeller.get(seller).push(item)
  })

  // Create seller combinations with proper shipping calculation
  const sellerCombinations = []
  bySeller.forEach((sellerItems, seller) => {
    // Sort items by total cost (price + shipping) ascending
    const sortedItems = sellerItems
      .map(item => ({
        ...item,
        totalCost: (item.priceParsed?.amount || 0) + (item.shippingParsed?.amount || 0)
      }))
      .sort((a, b) => a.totalCost - b.totalCost)

    // Generate all possible combinations for this seller
    for (let count = 1; count <= sortedItems.length; count++) {
      const selected = sortedItems.slice(0, count)
      const itemCost = selected.reduce((sum, item) => sum + (item.priceParsed?.amount || 0), 0)
      const shippingCost = selected[0]?.shippingParsed?.amount || 0 // Only pay shipping once per seller
      const totalCost = itemCost + shippingCost
      
      if (totalCost <= budget) {
        sellerCombinations.push({
          seller,
          items: selected,
          itemCost,
          shippingCost,
          totalCost,
          itemCount: selected.length,
          efficiency: selected.length / totalCost // items per dollar
        })
      }
    }
  })

  // Use a greedy approach to find the best combination
  // Sort by efficiency (items per dollar) descending
  sellerCombinations.sort((a, b) => b.efficiency - a.efficiency)

  const selected = []
  const usedSellers = new Set()
  let remainingBudget = budget
  let totalCost = 0
  let totalItems = 0

  for (const combination of sellerCombinations) {
    if (usedSellers.has(combination.seller)) continue
    if (combination.totalCost > remainingBudget) continue

    selected.push(combination)
    usedSellers.add(combination.seller)
    remainingBudget -= combination.totalCost
    totalCost += combination.totalCost
    totalItems += combination.itemCount
  }

  // Calculate summary
  const itemCost = selected.reduce((sum, combo) => sum + combo.itemCost, 0)
  const shippingCost = selected.reduce((sum, combo) => sum + combo.shippingCost, 0)
  
  return {
    selected: selected.flatMap(combo => combo.items),
    summary: {
      totalItems,
      totalCost,
      itemCost,
      shippingCost,
      remainingBudget,
      efficiency: totalCost > 0 ? totalItems / totalCost : 0,
      sellersUsed: selected.length
    },
    bySeller: selected.reduce((acc, combo) => {
      acc[combo.seller] = {
        items: combo.items,
        itemCost: combo.itemCost,
        shippingCost: combo.shippingCost,
        totalCost: combo.totalCost,
        itemCount: combo.itemCount
      }
      return acc
    }, {})
  }
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

// Budget optimization endpoint
app.post('/optimize', async (req, res) => {
  try {
    // Add CORS headers explicitly for this endpoint
    res.header('Access-Control-Allow-Origin', 'https://www.discogs.com')
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    console.log('Received optimize request from origin:', req.headers.origin)
    const { token, listings, budget } = req.body || {}
    
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return res.status(400).json({ error: 'token required' })
    }
    if (!Array.isArray(listings) || listings.length === 0) {
      return res.status(400).json({ error: 'listings required' })
    }
    if (!budget || typeof budget !== 'number' || budget <= 0) {
      return res.status(400).json({ error: 'budget must be a positive number' })
    }

    // Fetch actual listing data from Discogs API
    console.log(`Fetching data for ${listings.length} listings from Discogs API...`)
    const enrichedListings = await fetchListingsFromAPI(listings, token)
    console.log('Sample enriched listings:', enrichedListings.slice(0, 3))
    
    const items = normalizePrices(enrichedListings)
    console.log('Sample normalized items:', items.slice(0, 3))
    console.log('Budget:', budget)
    
    // Filter out items with price 0
    const validItems = items.filter(item => (item.priceParsed?.amount || 0) > 0)
    console.log(`Filtered ${items.length - validItems.length} items with price 0, ${validItems.length} valid items remaining`)
    
    const optimizationResult = optimizeBudget(validItems, budget)
    console.log('Optimization result summary:', optimizationResult.summary)
    
    return res.json(optimizationResult)
  } catch (e) {
    console.error('Optimization error:', e)
    res.status(500).json({ error: 'optimization_failed' })
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

