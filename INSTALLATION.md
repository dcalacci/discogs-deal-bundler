# Installation Guide for Discogs Seller Filter

## Quick Start

1. **Create Icons** (Optional but recommended):
   - Open `icon-generator.html` in your browser
   - Click "Generate Icons"
   - Download both `icon48.png` and `icon128.png`
   - Place them in this folder

2. **Install Extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select this `discogs-seller-filter` folder
   - The extension is now installed!

3. **Use the Extension**:
   - Go to https://www.discogs.com/shop/mywants
   - Look for the "Filter by Seller" section in the left sidebar
   - Click checkboxes to filter by sellers
   - Your selections are automatically saved!

## Features

✅ **Smart Seller Detection**: Automatically finds and counts items per seller  
✅ **Sorted by Quantity**: Sellers with most items appear first  
✅ **Persistent Filters**: Your selections are remembered between sessions  
✅ **Multiple Selection**: Choose multiple sellers to see combined results  
✅ **Clean UI**: Integrates seamlessly with Discogs' design  
✅ **Error Handling**: Helpful messages if something goes wrong  

## Troubleshooting

**Filter doesn't appear?**
- Make sure you're on https://www.discogs.com/shop/mywants
- Refresh the page
- Check that you have items in your wantlist
- Open Chrome DevTools (F12) and check Console for errors

**No sellers detected?**
- The page structure may have changed
- Check Console for "Could not find seller name" messages
- Try refreshing the page

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: None required (runs only on discogs.com)
- **Storage**: Uses localStorage to remember your selections
- **Compatibility**: Works with all modern Chrome versions

## Privacy

This extension:
- Only runs on discogs.com/shop/mywants pages
- Does not collect or transmit any data
- Does not require any special permissions
- Only reads and modifies the page you're viewing locally
