/* eslint-disable no-undef */
import assert from 'node:assert/strict'
import http from 'node:http'
import { app } from '../src/index.js'

function startServer(port = 0) {
  return new Promise(resolve => {
    const server = http.createServer(app)
    server.listen(port, () => resolve(server))
  })
}

async function requestJson(baseUrl, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const json = await res.json()
  return { status: res.status, json }
}

async function run() {
  // Start on random port
  const server = await startServer(0)
  const { port } = server.address()
  const base = `http://127.0.0.1:${port}`

  // 1) Missing listings
  {
    const { status, json } = await requestJson(base, '/analyze', { listings: [] })
    assert.equal(status, 400)
    assert.equal(json.error, 'listings required')
  }

  // 2) Happy path with two sellers
  {
    const payload = {
      token: 'dummy',
      listings: [
        { listingId: '1', release: 'A', seller: 's1', price: '$10.00', shipping: '$5.00' },
        { listingId: '2', release: 'B', seller: 's2', price: '€20.00', shipping: '€10.00' },
        { listingId: '3', release: 'C', seller: 's1', price: '$4.00', shipping: '$0.00' }
      ]
    }
    const { status, json } = await requestJson(base, '/analyze', payload)
    assert.equal(status, 200)
    assert.ok(Array.isArray(json.sellers))
    assert.equal(json.totals.numListings, 3)
    assert.equal(json.totals.numSellers, 2)
    const s1 = json.sellers.find(s => s.seller === 's1')
    assert.ok(s1)
    assert.equal(s1.count, 2)
    // totals are numeric sums of price + shipping
    assert.equal(Number.isFinite(s1.totalPrice), true)
  }

  // 3) Dedup by listingId handled upstream; server should still aggregate all provided
  {
    const payload = {
      listings: [
        { listingId: 'dup', seller: 's', price: '$1', shipping: '$1' },
        { listingId: 'dup', seller: 's', price: '$1', shipping: '$1' }
      ]
    }
    const { status, json } = await requestJson(base, '/analyze', payload)
    assert.equal(status, 200)
    const s = json.sellers[0]
    assert.equal(s.count, 2)
  }

  server.close()
  console.log('All tests passed')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})


