import assert from 'node:assert/strict';
import test from 'node:test';
import AttributionTracker from '../src/attribution-tracker.js';

const originalGlobals = Object.fromEntries(
    ['window', 'document', 'navigator', 'sessionStorage'].map((name) => [
        name,
        Object.getOwnPropertyDescriptor(globalThis, name)
    ])
);

function createStorage() {
    const values = new Map();
    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            values.set(key, String(value));
        },
        removeItem(key) {
            values.delete(key);
        }
    };
}

function installBrowser({ url = 'https://example.com/', referrer = '', cookies = {} } = {}) {
    const cookieJar = new Map(Object.entries(cookies));
    const location = new URL(url);

    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: {
        location,
        cookieConsent: undefined
        }
    });
    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        writable: true,
        value: {
            globalPrivacyControl: false,
            doNotTrack: '0'
        }
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        writable: true,
        value: createStorage()
    });
    Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: {
        referrer,
        get cookie() {
            return [...cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
        },
        set cookie(serialized) {
            const [pair, ...attributes] = serialized.split(';');
            const separator = pair.indexOf('=');
            const name = pair.slice(0, separator).trim();
            const value = pair.slice(separator + 1).trim();
            const expires = attributes.find((attribute) => attribute.trim().toLowerCase().startsWith('expires='));

            if (!value || (expires && new Date(expires.split('=').slice(1).join('=')).getTime() <= Date.now())) {
                cookieJar.delete(name);
            } else {
                cookieJar.set(name, value);
            }
        }
        }
    });

    return {
        cookieJar,
        setUrl(nextUrl) {
            window.location = new URL(nextUrl);
        },
        setReferrer(nextReferrer) {
            document.referrer = nextReferrer;
        }
    };
}

test.afterEach(() => {
    for (const [name, descriptor] of Object.entries(originalGlobals)) {
        if (descriptor) {
            Object.defineProperty(globalThis, name, descriptor);
        } else {
            delete globalThis[name];
        }
    }
});

test('does not capture data without consent by default', () => {
    const browser = installBrowser({ url: 'https://example.com/?utm_source=newsletter' });
    const tracker = new AttributionTracker();

    assert.equal(tracker.getAll(), null);
    assert.equal(browser.cookieJar.size, 0);
});

test('captures campaign data after explicit consent', () => {
    installBrowser({
        url: 'https://example.com/pricing?utm_source=newsletter&utm_medium=email&ref=partner&gclid=abc123',
        referrer: 'https://partner.example/article'
    });
    const tracker = new AttributionTracker({ consent: true });
    const data = tracker.getAll();

    assert.equal(data.utm_source, 'newsletter');
    assert.equal(data.utm_medium, 'email');
    assert.equal(data.ref, 'partner');
    assert.equal(data.gclid, 'abc123');
    assert.equal(data.referrer, 'https://partner.example/article');
    assert.equal(data.landingPage, window.location.href);
    assert.match(data.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test('preserves first-touch values across later visits', () => {
    const browser = installBrowser({ url: 'https://example.com/?utm_source=first&utm_campaign=launch' });
    new AttributionTracker({ consent: true });

    browser.setUrl('https://example.com/?utm_source=second&utm_campaign=return');
    const tracker = new AttributionTracker({ consent: true });

    assert.equal(tracker.getAll().utm_source, 'first');
    assert.equal(tracker.getAll().utm_campaign, 'launch');
});

test('infers a referral label from an advertising click ID', () => {
    installBrowser({ url: 'https://example.com/?fbclid=abc123' });
    const tracker = new AttributionTracker({ consent: true });

    assert.equal(tracker.getRef(), 'Facebook');
});

test('infers a referral label from an external referrer', () => {
    installBrowser({
        url: 'https://example.com/signup',
        referrer: 'https://news.ycombinator.com/item?id=123'
    });
    const tracker = new AttributionTracker({ consent: true });

    assert.equal(tracker.getRef(), 'Ycombinator');
});

test('does not infer a referral label from the same site', () => {
    installBrowser({
        url: 'https://www.example.com/signup',
        referrer: 'https://example.com/pricing'
    });
    const tracker = new AttributionTracker({ consent: true });

    assert.equal(tracker.getRef(), null);
});

test('captures configured additional parameters', () => {
    installBrowser({ url: 'https://example.com/?affiliate_id=partner-42' });
    const tracker = new AttributionTracker({
        consent: true,
        additionalParams: ['affiliate_id']
    });

    assert.equal(tracker.getAll().affiliate_id, 'partner-42');
});

test('supports session storage', () => {
    installBrowser({ url: 'https://example.com/?utm_source=community' });
    const tracker = new AttributionTracker({ consent: true, useSessionStorage: true });

    assert.equal(tracker.getAll().utm_source, 'community');
    assert.equal(document.cookie, '');
});

test('clears stored data', () => {
    installBrowser({ url: 'https://example.com/?utm_source=community' });
    const tracker = new AttributionTracker({ consent: true });

    tracker.clear();
    assert.equal(tracker.getAll(), null);
});

test('returns null for malformed stored data', () => {
    installBrowser({ cookies: { attribution_data: '%7Bbroken' } });
    const tracker = new AttributionTracker({ consent: false });

    assert.equal(tracker.getAll(), null);
});

test('accepts a consent callback', () => {
    installBrowser({ url: 'https://example.com/?utm_source=callback' });
    const tracker = new AttributionTracker({ consent: () => true });

    assert.equal(tracker.getAll().utm_source, 'callback');
});

test('honors Global Privacy Control before automatic consent detection', () => {
    const browser = installBrowser({
        url: 'https://example.com/?utm_source=blocked',
        cookies: { cookie_consent: 'allow' }
    });
    navigator.globalPrivacyControl = true;
    const tracker = new AttributionTracker();

    assert.equal(tracker.getAll(), null);
    assert.equal(browser.cookieJar.has('attribution_data'), false);
});
