# Attribution Parameter Tracker

A lightweight, configurable JavaScript utility for capturing and storing marketing attribution parameters, ad platform tracking IDs, and referrer information. This tracker respects user privacy settings and provides flexible storage options.

## Why Use This?

Marketing attribution can be complex, especially when dealing with multiple advertising platforms and traffic sources. This utility:

- Automatically captures UTM parameters from your marketing campaigns
- Tracks ad platform-specific parameters (Facebook, Google Ads, Twitter, Reddit, Meta)
- Stores the initial HTTP referrer and complete landing page URL
- Respects user privacy settings and GDPR compliance
- Provides flexible storage options (cookies or sessionStorage)
- Offers easy access to stored attribution data
- Works with any website or application
- Requires no external dependencies

## Installation

```javascript
// Include the AttributionTracker class in your project
// Initialize it when your application loads
const tracker = new AttributionTracker();
```

## Configuration Options

The tracker accepts a configuration object with the following options:

```javascript
const tracker = new AttributionTracker({
    cookieDuration: 30,              // Number of days to store data (default: 30)
    useSessionStorage: false,        // Use sessionStorage instead of cookies (default: false)
    additionalParams: [],            // Array of additional URL parameters to track
    storageKey: 'attribution_data'   // Key used for storage (default: 'attribution_data')
});
```

### Configuration Details

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| cookieDuration | number | 30 | Number of days before the cookie expires |
| useSessionStorage | boolean | false | If true, uses sessionStorage instead of cookies |
| additionalParams | string[] | [] | Additional URL parameters to track |
| storageKey | string | 'attribution_data' | Key used for cookie or sessionStorage |

## Tracked Parameters

### UTM Parameters
- utm_source
- utm_medium
- utm_campaign
- utm_content
- utm_term

### Ad Platform Parameters

#### Facebook/Meta
- fbclid
- fb_source
- fb_ref
- mclid

#### Google Ads
- gclid
- gclsrc
- dclid
- gad_source

#### Twitter
- twclid
- tw_source

#### Reddit
- rdt_cid
- rdt_source

## Methods

### Main Methods

#### `getAll()`
Returns all stored attribution data as an object.

```javascript
const allData = tracker.getAll();
```

#### `getUtmParameters()`
Returns only UTM parameters from stored data.

```javascript
const utmData = tracker.getUtmParameters();
```

#### `getAdPlatformParameters()`
Returns only ad platform-specific parameters.

```javascript
const adData = tracker.getAdPlatformParameters();
```

#### `getReferrer()`
Returns the initial HTTP referrer URL.

```javascript
const referrer = tracker.getReferrer();
```

#### `getLandingPage()`
Returns the full landing page URL where tracking began.

```javascript
const landingPage = tracker.getLandingPage();
```

#### `getTimestamp()`
Returns the timestamp when the attribution data was captured.

```javascript
const timestamp = tracker.getTimestamp();
```

#### `clear()`
Clears all stored attribution data.

```javascript
tracker.clear();
```

## Cookie Consent and Privacy

⚠️ **Important Note About Cookie Consent**

The included cookie consent checker is a generic implementation that may need to be modified based on your specific Consent Management Platform (CMP). The current implementation:

1. Checks for a global `window.cookieConsent` variable
2. Looks for common consent cookies
3. Defaults to false if no consent is found

You should modify the `checkCookieConsent()` method to integrate with your specific CMP. Example implementations:

```javascript
// OneTrust example
checkCookieConsent() {
    return OnetrustActiveGroups.includes('C0002');
}

// Cookiebot example
checkCookieConsent() {
    return Cookiebot.consent.marketing;
}

// Custom implementation
checkCookieConsent() {
    return yourConsentFunction();
}
```

## Usage Examples

### Basic Implementation
```javascript
// Initialize tracker
const tracker = new AttributionTracker();

// Later, when you need the data
const allAttributionData = tracker.getAll();
console.log('Attribution Data:', allAttributionData);
```

### Custom Configuration
```javascript
// Initialize with custom settings
const tracker = new AttributionTracker({
    cookieDuration: 60,
    useSessionStorage: true,
    additionalParams: ['affiliate_id', 'custom_source'],
    storageKey: 'my_attribution_data'
});

// Get specific data types
const utmData = tracker.getUtmParameters();
const adData = tracker.getAdPlatformParameters();
const referrer = tracker.getReferrer();
```

### E-commerce Implementation
```javascript
// Initialize tracker
const tracker = new AttributionTracker();

// When processing an order
function processOrder(orderData) {
    const attributionData = tracker.getAll();
    
    // Combine order and attribution data
    const enrichedOrderData = {
        ...orderData,
        attribution: attributionData
    };
    
    // Send to your analytics or order processing system
    sendToAnalytics(enrichedOrderData);
}
```

## Best Practices

1. Initialize the tracker as early as possible in your application lifecycle
2. Customize the cookie consent checker for your specific CMP
3. Consider using sessionStorage for shorter user sessions
4. Clear old attribution data when appropriate (e.g., after conversion)
5. Regularly check stored data format and validity

## Browser Compatibility

The tracker uses standard web APIs and is compatible with all modern browsers. Key requirements:

- `URLSearchParams` API
- `sessionStorage` API
- JSON parsing/stringifying
- Cookie handling

## Contributing

Feel free to submit issues and enhancement requests.

## License

MIT License - feel free to use this in your projects.