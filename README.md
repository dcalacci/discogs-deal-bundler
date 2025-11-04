# Discogs Seller Filter & Budget Optimizer

A Chrome extension that helps you find the best deals on your Discogs wantlist by analyzing sellers and optimizing purchases within your budget.

## Features

### 🎯 Budget Optimization
- **Smart Budget Allocation**: Find the best combination of releases within your budget
- **Shipping Optimization**: Accounts for shipping costs (paid once per seller)
- **Currency Conversion**: Real-time conversion of prices to USD
- **Release Deduplication**: Ensures you don't buy the same release twice

### 🚫 Ignore List
- **Custom Filtering**: Ignore releases you don't want to see
- **Persistent Storage**: Your ignore list persists between sessions
- **Easy Management**: Simple restore functionality

### 📊 Seller Analysis
- **Seller Rankings**: See which sellers have the most items from your wantlist
- **Price Analysis**: Compare total costs including shipping
- **Efficiency Metrics**: Items per dollar calculations

### 🔄 Real-time Data
- **Live Scraping**: Automatically scrapes all pages of your wantlist
- **Dynamic Updates**: Responds to pagination and new listings
- **Cached Results**: Server-side caching for faster subsequent requests

## Installation

### Chrome Extension

1. **Download the extension files**
2. **Open Chrome Extensions page**: `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top right)
4. **Click "Load unpacked"** and select the `discogs-seller-filter` directory
5. **Pin the extension** to your toolbar for easy access

### Analysis Server

1. **Navigate to server directory**:
   ```bash
   cd analysis-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Server runs on**: `http://localhost:4002`

## Usage

### 1. Setup
1. **Go to Discogs**: Navigate to `https://www.discogs.com/shop/mywants`
2. **Open Extension**: Click the extension icon in your browser toolbar
3. **Configure Server**: Enter your analysis server URL (e.g., `http://localhost:4002`)
4. **Add API Token**: Enter your Discogs API token

### 2. Analyze Sellers
1. **Click "Analyze Sellers"** to scrape all listings from your wantlist
2. **Wait for completion** - the extension will automatically paginate through all results
3. **View results** - see seller rankings and item counts

### 3. Budget Optimization
1. **Set your budget** using the slider
2. **Click "🎯 Find Best Deals"** to run optimization
3. **Review results** - see optimized selections with costs and efficiency
4. **Use action buttons**:
   - **Add to Cart**: Direct link to add items to Discogs cart
   - **View**: View the listing on Discogs
   - **Ignore**: Add release to ignore list

### 4. Manage Ignore List
- **View ignored releases** in the section below seller results
- **Restore releases** by clicking the "Restore" button
- **Ignored releases** are automatically excluded from future optimizations

## API Configuration

### Discogs API Token
1. **Go to Discogs Settings**: `https://www.discogs.com/settings/developers`
2. **Create Personal Access Token**
3. **Copy the token** and paste it into the extension settings

### Server Configuration
- **Default URL**: `http://localhost:4002`
- **Custom Server**: Use ngrok or deploy to your preferred hosting service
- **CORS**: Server is configured to accept requests from `discogs.com`

## Technical Details

### Chrome Extension
- **Content Script**: Injects UI into Discogs pages
- **Local Storage**: Persists settings and ignore list
- **Event Delegation**: Handles dynamic button clicks
- **Scraping**: Automatically handles pagination and new content

### Analysis Server
- **Express.js**: REST API server
- **Currency Conversion**: Real-time exchange rates from `exchangerate-api.com`
- **Caching**: In-memory and disk-based caching for API responses
- **Rate Limiting**: Handles Discogs API rate limits with exponential backoff

### Data Flow
1. **Extension scrapes** wantlist data from Discogs
2. **Data sent to server** for analysis and optimization
3. **Server processes** data with currency conversion and optimization algorithms
4. **Results displayed** in extension with interactive buttons

## File Structure

```
discogs-seller-filter/
├── manifest.json          # Chrome extension configuration
├── content.js            # Main extension logic
├── styles.css           # Extension styling
├── analysis-server/     # Node.js analysis server
│   ├── src/
│   │   └── index.js     # Express server with optimization logic
│   ├── package.json     # Server dependencies
│   └── listing-cache.json # Cached API responses
└── README.md           # This file
```

## Optimization Algorithm

The budget optimization uses a **greedy approach**:

1. **Group by seller** to handle shipping costs properly
2. **Calculate efficiency** (items per dollar) for each seller combination
3. **Sort by efficiency** to prioritize best deals
4. **Select combinations** that fit within budget
5. **Ensure uniqueness** - no duplicate releases selected
6. **Account for shipping** - paid once per seller

## Troubleshooting

### Extension Issues
- **"No marketplace listings found"**: Ensure you're on the correct Discogs page
- **Buttons not working**: Check that the server is running and accessible
- **CORS errors**: Verify server URL and CORS configuration

### Server Issues
- **Port conflicts**: Change port in `analysis-server/src/index.js`
- **API rate limits**: Server handles this automatically with caching
- **Currency conversion**: Check internet connection for exchange rate API

### Performance
- **Slow optimization**: Large wantlists may take time to process
- **Memory usage**: Server caches data for faster subsequent requests
- **Browser performance**: Extension uses efficient event delegation

## Development

### Running Tests
```bash
cd analysis-server
npm test
```

### Server Endpoints
- `POST /analyze` - Basic seller analysis
- `POST /optimize` - Budget optimization with API data
- `POST /optimize-fast` - Budget optimization with scraped data
- `GET /health` - Server health check

### Extension Development
- **Reload extension** after making changes
- **Check console** for debugging information
- **Test on different Discogs pages** to ensure compatibility

## Contributing

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. **Check the troubleshooting section**
2. **Review console logs** for error messages
3. **Verify server connectivity**
4. **Test with a small budget** first

---

**Happy record hunting! 🎵**