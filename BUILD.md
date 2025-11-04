# Building the Extension

This extension now uses Preact components and Vite for building. The code is split into modular components for easier maintenance.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the extension:
```bash
npm run build
```

This will compile `src/content.jsx` and all its components into `content.js` in the root directory.

3. For development with auto-rebuild:
```bash
npm run dev
```

## Project Structure

```
src/
  components/          # Preact UI components
    FilterContainer.jsx
    ConfigRow.jsx
    BudgetRow.jsx
    SellerList.jsx
  hooks/              # Custom Preact hooks
    useAnalysis.js
  utils/              # Utility functions
    storage.js        # localStorage helpers
    scraping.js       # Scraping utilities
    pageScraping.js   # Page navigation/scraping
    dom.js            # DOM manipulation helpers
  content.jsx         # Main entry point
```

## Development Workflow

1. Make changes to components in `src/`
2. Run `npm run build` to compile
3. Reload the extension in Chrome
4. Test your changes

The built `content.js` file is what gets loaded by the extension.

