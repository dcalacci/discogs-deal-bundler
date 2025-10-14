# Discogs Seller Filter Chrome Extension

Filter your Discogs wantlist by sellers who have the most of your wanted items!

## Features

- **Automatic seller analysis**: Counts how many of your wanted items each seller has
- **Sorted by quantity**: Sellers are listed from most items to least
- **Easy filtering**: Click checkboxes to show only items from specific sellers
- **Multiple selection**: Select multiple sellers to see combined results
- **Clean UI**: Integrates seamlessly with Discogs' existing sidebar

## Installation

### Option 1: Load Unpacked Extension (For Development)

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `discogs-seller-filter` folder
5. The extension is now installed!

### Option 2: Create Icons First (Recommended)

Before loading the extension, you should create icon files:

1. Create two PNG images named `icon48.png` and `icon128.png`
2. Place them in the extension folder
3. These can be simple icons (you can use any image editor or online icon generator)
4. Then follow Option 1 steps above

**Note**: If you don't create icons, you can remove the "icons" section from `manifest.json` or the extension may show warnings (but will still work).

## Usage

1. Navigate to your Discogs wantlist shopping page: https://www.discogs.com/shop/mywants
2. Wait for the page to load completely
3. Look for the new "Filter by Seller" section at the top of the left sidebar
4. You'll see all sellers listed with item counts in parentheses, e.g., "SellerName (5)"
5. Click checkboxes next to seller names to filter the listings
6. Use "Show All" to clear filters and see everything again

## How It Works

The extension:
1. Scans all marketplace listings on the mywants page
2. Extracts seller information from each listing
3. Counts items per seller and sorts them
4. Creates an interactive filter in the sidebar
5. Shows/hides listings based on your selections

## Troubleshooting

**Filter doesn't appear:**
- Make sure you're on the correct page (https://www.discogs.com/shop/mywants)
- Refresh the page
- Check if there are any items in your wantlist
- Open Chrome DevTools (F12) and check the Console for any errors

**Sellers not detected:**
- The page structure may have changed - the extension looks for `.shortcut_navigable` listings
- Check if Discogs has updated their HTML structure

**Filter disappears on page navigation:**
- The extension should automatically reinitialize, but you may need to refresh

## Development

To modify the extension:

1. Edit `content.js` to change functionality
2. Edit `styles.css` to change appearance
3. After making changes, go to `chrome://extensions/` and click the reload icon for this extension

## Files

- `manifest.json`: Extension configuration
- `content.js`: Main functionality (seller counting and filtering logic)
- `styles.css`: Visual styling for the filter UI
- `README.md`: This file

## Privacy

This extension:
- Only runs on discogs.com/shop/mywants pages
- Does not collect or transmit any data
- Does not require any special permissions
- Only reads and modifies the page you're viewing locally

## License

Free to use and modify for personal use.

## Version History

- **1.0**: Initial release
  - Seller counting and sorting
  - Checkbox filtering
  - Clean sidebar UI integration
