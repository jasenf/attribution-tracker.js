# Attribution Parameter Tracker

A lightweight, configurable JavaScript utility for capturing and storing marketing attribution parameters, ad platform tracking IDs, and referrer information. This tracker respects user privacy settings and provides flexible storage options.

## Why Use This?

Marketing attribution can be complex, especially when dealing with multiple advertising platforms and traffic sources. This utility:

- Automatically captures UTM parameters from your marketing campaigns
- Tracks the common `ref` query parameter used by newsletters, affiliates, and many hosts
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
    additionalParams: [],            // Extra query keys to store on the same object (`ref` is already tracked)
    storageKey: 'attribution_data'   // Key used for storage (default: 'attribution_data')
});
```

### Configuration Details

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| cookieDuration | number | 30 | Number of days before the cookie expires |
| useSessionStorage | boolean | false | If true, uses sessionStorage instead of cookies |
| additionalParams | string[] | [] | Extra query keys to store alongside the defaults. `ref` is already tracked |
| storageKey | string | 'attribution_data' | Key used for cookie or sessionStorage |

## Tracked Parameters

### UTM Parameters
- utm_source
- utm_medium
- utm_campaign
- utm_content
- utm_term

### Referral Parameters
- ref

`ref` is captured automatically. You do not need to add it to `additionalParams`.

If the URL has `?ref=`, that value is stored. If `ref` is missing, the tracker fills it with a business name when first-touch data already points at a known source:

- Ad platform parameters: `fbclid` becomes Facebook, `gclid` becomes Google, `twclid` becomes Twitter, `rdt_cid` becomes Reddit, `mclid` becomes Meta
- Known `utm_source` values such as `facebook`, `instagram`, `google`, `twitter`, or `reddit`
- A first-touch HTTP referrer from a matching host, such as `facebook.com` or `google.com`
- Any other first-touch HTTP referrer whose registrable domain is not the current site. `www.medium.com` becomes Medium, `news.ycombinator.com` becomes Ycombinator. Same-site referrers are ignored, including `www` to apex on your own domain.

An explicit `?ref=` wins. `ref` is still separate from `referrer`, which is the HTTP `document.referrer` URL.

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

## Stored data object

`getAll()` is the main way to read what the tracker captured. It returns the stored object, or `null` if nothing has been saved yet.

Only keys that were present on first touch are included. Extra keys from `additionalParams` land on the same object.

```javascript
const tracker = new AttributionTracker();
const attribution = tracker.getAll();

// Typical shape after a first visit from a campaign URL:
// {
//   utm_source: "newsletter",
//   utm_medium: "email",
//   utm_campaign: "spring",
//   utm_content: "header-cta",
//   utm_term: "attribution",
//   ref: "partner-site",
//   gclid: "abc123",
//   referrer: "https://example.com/article",
//   landingPage: "https://yoursite.com/pricing?utm_source=newsletter&ref=partner-site",
//   timestamp: "2026-09-20T12:00:00.000Z"
// }

attribution.ref
attribution.utm_source
attribution.gclid
attribution.referrer
attribution.landingPage
attribution.timestamp
```

| Key | Source | Notes |
|-----|--------|-------|
| utm_source, utm_medium, utm_campaign, utm_content, utm_term | Query string | Standard UTM fields |
| ref | Query string, or inferred | `?ref=` if present. Otherwise a known platform name, or the referrer's second-level domain (Medium from `www.medium.com`) when the referrer is not your own site. Not the same as `referrer` |
| fbclid, fb_source, fb_ref, mclid | Query string | Facebook / Meta |
| gclid, gclsrc, dclid, gad_source | Query string | Google Ads |
| twclid, tw_source | Query string | Twitter |
| rdt_cid, rdt_source | Query string | Reddit |
| any `additionalParams` value | Query string | Your custom keys, same top-level object |
| referrer | `document.referrer` | First-touch HTTP referrer URL |
| landingPage | `window.location.href` | Full first-touch URL, including query string |
| timestamp | Capture time | ISO 8601 string set with `landingPage` |

First-touch values win. If `utm_source` or `ref` is already stored, a later visit does not overwrite it. An inferred `ref` is only written when `ref` is still empty.

## Methods

### Main Methods

#### `getAll()`
Returns the stored attribution object described above, or `null`.

```javascript
const attribution = tracker.getAll();

if (attribution) {
    const source = attribution.utm_source || attribution.ref || 'direct';
    const landingPage = attribution.landingPage;
}
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

#### `getRef()`
Returns the stored `ref` value, or `null`. This is the query `?ref=`, or the inferred business name / second-level domain.

```javascript
const ref = tracker.getRef();
```

This is not the HTTP referrer. Use `getReferrer()` for that URL, or `getAll().ref` if you already have the object.

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
const attribution = tracker.getAll();
console.log(attribution.ref);
console.log(attribution.utm_source);
console.log(attribution.landingPage);
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

const attribution = tracker.getAll();
attribution.ref
attribution.affiliate_id
attribution.custom_source

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