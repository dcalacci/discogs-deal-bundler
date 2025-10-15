# Discogs Analysis Server

Small Express server that ranks sellers given scraped listing rows from the Discogs "Shop items I want" page.

## Run

```bash
cd analysis-server
npm install
npm run start
# or: npm run dev
```

Server defaults to `http://localhost:4001`.

## POST /analyze

Request body:

```json
{
  "token": "optional_discogs_token_for_future_enrichment",
  "listings": [
    {
      "listingId": "3803362961",
      "release": "Relight My Fire",
      "seller": "Vinyl.street",
      "sellerRatings": ", (18854 ratings) 99.8%",
      "price": "€3.50",
      "shipping": "€9.00"
    }
  ]
}
```

Response:

```json
{
  "sellers": [
    {
      "seller": "Vinyl.street",
      "sellerRatings": ", (18854 ratings) 99.8%",
      "items": [ { "listingId": "3803362961", "release": "Relight My Fire", "price": "€3.50", "shipping": "€9.00", "total": 12.5 } ],
      "count": 1,
      "totalPrice": 12.5,
      "uniqueListings": {},
      "uniqueCount": 1,
      "avgTotal": 12.5,
      "score": 120.0
    }
  ],
  "totals": { "numSellers": 1, "numListings": 1 }
}
```

Scoring favors more unique listings and lower average total (price + shipping).

## Notes

- Currency parsing is naive, values are treated numerically without conversion.
- The `token` field is reserved for future enrichment using Discogs API.

