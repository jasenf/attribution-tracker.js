# Attribution Tracker

[![CI](https://github.com/jasenf/attribution-tracker.js/actions/workflows/ci.yml/badge.svg)](https://github.com/jasenf/attribution-tracker.js/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A small, dependency-free browser library for keeping the first marketing touch that brought someone to your site. It captures UTM parameters, supported advertising click IDs, the landing page, and the external referrer. It does not make network requests or send the data anywhere.

[Try the live demo](https://jasenf.github.io/attribution-tracker.js/) or [read the source](src/attribution-tracker.js).

## Install

### Script tag

```html
<script src="https://cdn.jsdelivr.net/gh/jasenf/attribution-tracker.js@v0.1.1/dist/attribution-tracker.js"></script>
<script>
  const tracker = new AttributionTracker({
    consent: () => window.cookieConsent === true
  });

  const attribution = tracker.getAll();
</script>
```

You can also download [`tracker.js`](tracker.js) and serve it from your own site.

### npm

```bash
npm install @feech/attribution-tracker
```

```javascript
import AttributionTracker from '@feech/attribution-tracker';

const tracker = new AttributionTracker({ consent: true });
console.log(tracker.getAll());
```

`consent: true` is appropriate only when your application has already received the required consent. In production, a callback tied to your consent manager is usually safer.

## What it stores

Given this first visit:

```text
https://example.com/pricing?utm_source=newsletter&utm_medium=email&ref=partner
```

`getAll()` returns an object like this:

```javascript
{
  utm_source: 'newsletter',
  utm_medium: 'email',
  ref: 'partner',
  referrer: 'https://partner.example/article',
  landingPage: 'https://example.com/pricing?utm_source=newsletter&utm_medium=email&ref=partner',
  timestamp: '2026-09-20T12:00:00.000Z'
}
```

First-touch values win. Later visits do not replace values that are already stored.

The default parameters are:

- UTM: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- Referral: `ref`
- Facebook and Meta: `fbclid`, `fb_source`, `fb_ref`, `mclid`
- Google Ads: `gclid`, `gclsrc`, `dclid`, `gad_source`
- X and Twitter: `twclid`, `tw_source`
- Reddit: `rdt_cid`, `rdt_source`

If `ref` is absent, the tracker can infer a short label from a supported click ID, a known `utm_source`, or an external referrer. An explicit `ref` always wins. `ref` is separate from `referrer`, which contains the original `document.referrer` URL.

## Configuration

```javascript
const tracker = new AttributionTracker({
  cookieDuration: 30,
  useSessionStorage: false,
  additionalParams: ['affiliate_id'],
  storageKey: 'attribution_data',
  consent: () => window.cookieConsent === true,
  requireConsent: true,
  debug: false,
  cookieSameSite: 'Lax',
  cookieSecure: true
});
```

| Option | Default | Description |
| --- | --- | --- |
| `cookieDuration` | `30` | Number of days before the first-party cookie expires. |
| `useSessionStorage` | `false` | Store data in `sessionStorage` instead of a cookie. |
| `additionalParams` | `[]` | Extra query parameters to capture. |
| `storageKey` | `attribution_data` | Cookie or session storage key. |
| `consent` | `undefined` | A boolean or callback that supplies the current consent decision. |
| `requireConsent` | `true` | When true, the tracker does nothing if it cannot find a consent decision. |
| `debug` | `false` | Write diagnostic messages to the browser console. Values are not logged unless this is true. |
| `cookieSameSite` | `Lax` | Cookie `SameSite` value: `Strict`, `Lax`, or `None`. |
| `cookieSecure` | HTTPS sites: `true` | Add the cookie `Secure` attribute. |

## Consent and privacy

Attribution Tracker is a storage utility, not a consent manager. It does not claim that a site is compliant with GDPR, ePrivacy rules, or any other law.

By default, the tracker requires consent before it captures or stores anything. It checks, in order:

1. The `consent` configuration value or callback.
2. Global Privacy Control and Do Not Track signals.
3. A boolean `window.cookieConsent` value.
4. Common `cookieconsent_status` and `cookie_consent` cookies.

If none of those supplies an affirmative decision, capture is skipped. Connect the `consent` callback to the consent manager used by your site:

```javascript
const tracker = new AttributionTracker({
  consent: () => Cookiebot.consent.marketing
});
```

Landing page URLs, referrers, advertising click IDs, and custom parameters can contain identifying or sensitive values. Decide what to capture, how long to retain it, and where it may be sent before using the library in production.

## API

| Method | Result |
| --- | --- |
| `getAll()` | The complete stored object, or `null`. |
| `getUtmParameters()` | Stored UTM parameters only. |
| `getAdPlatformParameters()` | Stored advertising platform parameters only. |
| `getRef()` | The explicit or inferred referral label. |
| `getReferrer()` | The original HTTP referrer URL. |
| `getLandingPage()` | The complete first landing page URL. |
| `getTimestamp()` | The ISO timestamp recorded on the first visit. |
| `clear()` | Removes the stored attribution data. |

## Examples

### Attach attribution to a form submission

```javascript
const tracker = new AttributionTracker({ consent: hasMarketingConsent });

form.addEventListener('submit', () => {
  const field = document.createElement('input');
  field.type = 'hidden';
  field.name = 'attribution';
  field.value = JSON.stringify(tracker.getAll());
  form.append(field);
});
```

### Use session storage

```javascript
const tracker = new AttributionTracker({
  consent: true,
  useSessionStorage: true
});
```

## Limits

- This is first-touch browser storage, not a complete multi-touch attribution system.
- It does not connect activity across browsers, devices, or cleared storage.
- Browser privacy controls can shorten or block storage.
- JavaScript-set cookies behave differently from server-set cookies in some browsers.
- The built-in registrable-domain helper covers common multi-part domains. It is not a complete public suffix implementation.
- The library does not submit attribution to a form, analytics service, or CRM unless your application does so.

## Browser support

The distributed browser build uses standard APIs available in current versions of Chrome, Edge, Firefox, and Safari. The library requires `URL`, `URLSearchParams`, cookies or `sessionStorage`, and modern JavaScript syntax.

## Development

The project has no runtime dependencies. Node.js 20 or newer is required for development.

```bash
npm test
npm run build
```

The build writes:

- `dist/attribution-tracker.esm.js` for package imports
- `dist/attribution-tracker.js` for script tags and CDNs
- `tracker.js` for backward compatibility

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

[MIT](LICENSE)
