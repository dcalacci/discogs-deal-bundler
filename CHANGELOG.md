# Changelog - Discogs Seller Filter Extension

## Version 1.1 - Enhanced Edition

### ✨ New Features
- **Robust Seller Detection**: Multiple fallback selectors to handle different Discogs page structures
- **Persistent Filters**: Your filter selections are automatically saved and restored between sessions
- **Better Error Handling**: Helpful user messages when things go wrong
- **Success Feedback**: Confirmation messages when the filter is created successfully
- **Enhanced UI**: Improved styling and user experience

### 🔧 Improvements
- **Multiple Selector Support**: Extension now tries 7+ different selectors to find seller names
- **localStorage Integration**: Filter selections persist across browser sessions
- **Better Sidebar Detection**: More robust detection of where to place the filter
- **User-Friendly Messages**: Clear feedback for success, errors, and troubleshooting
- **Console Logging**: Better debugging information for developers

### 🐛 Bug Fixes
- Fixed potential issues with seller name extraction
- Improved handling of edge cases in HTML structure
- Better error recovery when sidebar cannot be found

### 📁 Files Added/Modified
- `content.js` - Enhanced with robust seller detection and persistence
- `styles.css` - Existing styles (no changes needed)
- `manifest.json` - Existing configuration (no changes needed)
- `INSTALLATION.md` - New installation guide
- `test.html` - Test page for development
- `CHANGELOG.md` - This file

### 🚀 Installation
1. Open `icon-generator.html` in your browser to create icons
2. Download the generated `icon48.png` and `icon128.png` files
3. Place them in the extension folder
4. Load the extension in Chrome via `chrome://extensions/`

### 🎯 Usage
1. Navigate to https://www.discogs.com/shop/mywants
2. Wait for the "Filter by Seller" section to appear in the sidebar
3. Click checkboxes to filter by specific sellers
4. Your selections are automatically saved!

### 🔍 Technical Details
- **Seller Detection**: Tries multiple CSS selectors for maximum compatibility
- **Data Persistence**: Uses localStorage with key `discogs-seller-filter-selections`
- **Error Handling**: Graceful fallbacks and user-friendly error messages
- **Performance**: Efficient DOM manipulation and event handling

### 🛡️ Privacy & Security
- No data collection or transmission
- No special permissions required
- Only runs on discogs.com/shop/mywants pages
- All data stored locally in browser
