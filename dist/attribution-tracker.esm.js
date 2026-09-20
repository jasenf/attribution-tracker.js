/** Attribution Tracker v0.1.0 | MIT License | https://github.com/jasenf/attribution-tracker.js */
class AttributionTracker {
    constructor(config = {}) {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            throw new Error('AttributionTracker requires a browser environment.');
        }

        this.config = {
            cookieDuration: 30,
            useSessionStorage: false,
            additionalParams: [],
            storageKey: 'attribution_data',
            consent: undefined,
            requireConsent: true,
            debug: false,
            cookieSameSite: 'Lax',
            cookieSecure: window.location.protocol === 'https:',
            ...config
        };

        this.utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
        this.referralParams = ['ref'];
        this.adPlatformParams = {
            facebook: ['fbclid', 'fb_source', 'fb_ref'],
            google: ['gclid', 'gclsrc', 'dclid', 'gad_source'],
            twitter: ['twclid', 'tw_source'],
            reddit: ['rdt_cid', 'rdt_source'],
            meta: ['mclid']
        };
        this.platformNames = {
            facebook: 'Facebook',
            google: 'Google',
            twitter: 'Twitter',
            reddit: 'Reddit',
            meta: 'Meta'
        };
        this.utmSourceNames = {
            facebook: 'Facebook',
            fb: 'Facebook',
            instagram: 'Instagram',
            ig: 'Instagram',
            meta: 'Meta',
            google: 'Google',
            googleads: 'Google',
            adwords: 'Google',
            twitter: 'Twitter',
            x: 'Twitter',
            reddit: 'Reddit'
        };
        this.referrerHostNames = [
            { suffix: 'facebook.com', name: 'Facebook' },
            { suffix: 'fb.com', name: 'Facebook' },
            { suffix: 'instagram.com', name: 'Instagram' },
            { suffix: 'googleadservices.com', name: 'Google' },
            { suffix: 'doubleclick.net', name: 'Google' },
            { suffix: 'google.com', name: 'Google' },
            { suffix: 'twitter.com', name: 'Twitter' },
            { suffix: 't.co', name: 'Twitter' },
            { suffix: 'x.com', name: 'Twitter' },
            { suffix: 'reddit.com', name: 'Reddit' }
        ];
        this.multiPartTlds = [
            'co.uk', 'org.uk', 'ac.uk', 'gov.uk',
            'com.au', 'net.au', 'org.au',
            'co.nz', 'co.jp', 'co.kr', 'co.in',
            'com.br', 'com.mx', 'com.ar',
            'co.za', 'com.sg', 'com.hk'
        ];

        this.initialize();
    }

    log(message, value) {
        if (!this.config.debug || typeof console === 'undefined') {
            return;
        }

        if (value === undefined) {
            console.debug(`AttributionTracker: ${message}`);
        } else {
            console.debug(`AttributionTracker: ${message}`, value);
        }
    }

    initialize() {
        if (!this.hasConsent()) {
            this.log('capture skipped because consent was not granted');
            return;
        }

        const existingData = this.getStoredData();
        const currentData = this.captureCurrentData(existingData || {});

        if (Object.keys(currentData).length === 0) {
            return;
        }

        const mergedData = { ...currentData, ...(existingData || {}) };
        this.storeData(mergedData);
        this.log('attribution stored', mergedData);
    }

    hasConsent() {
        if (typeof this.config.consent === 'function') {
            try {
                return Boolean(this.config.consent());
            } catch (error) {
                this.log('consent callback failed', error);
                return false;
            }
        }

        if (typeof this.config.consent === 'boolean') {
            return this.config.consent;
        }

        if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1') {
            return false;
        }

        if (typeof window.cookieConsent === 'boolean') {
            return window.cookieConsent;
        }

        const acceptedValues = new Set(['allow', 'allowed', 'accept', 'accepted', 'true', 'yes']);
        const rejectedValues = new Set(['deny', 'denied', 'decline', 'declined', 'false', 'no']);
        const consentCookieNames = new Set(['cookieconsent_status', 'cookie_consent']);

        for (const cookie of document.cookie.split(';')) {
            const separator = cookie.indexOf('=');
            if (separator === -1) {
                continue;
            }

            const name = cookie.slice(0, separator).trim();
            if (!consentCookieNames.has(name)) {
                continue;
            }

            const value = cookie.slice(separator + 1).trim().toLowerCase();
            if (acceptedValues.has(value)) {
                return true;
            }
            if (rejectedValues.has(value)) {
                return false;
            }
        }

        return !this.config.requireConsent;
    }

    checkCookieConsent() {
        return this.hasConsent();
    }

    captureCurrentData(existingData = this.getStoredData() || {}) {
        const data = {};
        const urlParams = new URLSearchParams(window.location.search);
        const captureIfNew = (param) => {
            if (urlParams.has(param) && !existingData[param]) {
                data[param] = urlParams.get(param);
            }
        };

        this.utmParams.forEach(captureIfNew);
        this.referralParams.forEach(captureIfNew);
        Object.values(this.adPlatformParams).flat().forEach(captureIfNew);
        this.config.additionalParams.forEach(captureIfNew);

        if (!existingData.referrer && document.referrer) {
            data.referrer = document.referrer;
        }

        if (!existingData.landingPage) {
            data.landingPage = window.location.href;
            data.timestamp = new Date().toISOString();
        }

        this.inferRef(data, existingData);
        return data;
    }

    inferRef(data, existingData) {
        if (data.ref || existingData.ref) {
            return;
        }

        const combined = { ...existingData, ...data };
        for (const [platform, params] of Object.entries(this.adPlatformParams)) {
            if (params.some((param) => combined[param])) {
                data.ref = this.platformNames[platform];
                return;
            }
        }

        const utmSource = (combined.utm_source || '').toLowerCase();
        if (utmSource && this.utmSourceNames[utmSource]) {
            data.ref = this.utmSourceNames[utmSource];
            return;
        }

        const hostname = this.getHostname(combined.referrer || document.referrer);
        if (!hostname) {
            return;
        }

        if (hostname === 'google.com' || hostname.endsWith('.google.com') || hostname.startsWith('google.')) {
            data.ref = 'Google';
            return;
        }

        const hostMatch = this.referrerHostNames.find((entry) => (
            hostname === entry.suffix || hostname.endsWith(`.${entry.suffix}`)
        ));
        if (hostMatch) {
            data.ref = hostMatch.name;
            return;
        }

        this.inferRefFromReferrerDomain(data, hostname);
    }

    inferRefFromReferrerDomain(data, hostname) {
        if (!this.isPublicHostname(hostname)) {
            return;
        }

        const currentHost = this.getHostname(window.location.href);
        if (this.getRegistrableDomain(hostname) === this.getRegistrableDomain(currentHost)) {
            return;
        }

        const label = this.getDomainLabel(hostname);
        if (label) {
            data.ref = this.formatDomainName(label);
        }
    }

    isPublicHostname(hostname) {
        if (!hostname || hostname === 'localhost' || !hostname.includes('.')) {
            return false;
        }

        return !/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
    }

    getRegistrableDomain(hostname) {
        if (!hostname) {
            return '';
        }

        const host = hostname.toLowerCase();
        const matchedTld = this.multiPartTlds.find((tld) => host === tld || host.endsWith(`.${tld}`));
        if (matchedTld) {
            if (host === matchedTld) {
                return host;
            }

            const withoutTld = host.slice(0, -(matchedTld.length + 1));
            return `${withoutTld.split('.').pop()}.${matchedTld}`;
        }

        const parts = host.split('.').filter(Boolean);
        return parts.length < 2 ? host : parts.slice(-2).join('.');
    }

    getDomainLabel(hostname) {
        return this.getRegistrableDomain(hostname).split('.')[0] || '';
    }

    formatDomainName(label) {
        return label.split('-').map((part) => (
            part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part
        )).join('-');
    }

    getHostname(url) {
        if (!url) {
            return '';
        }

        try {
            return new URL(url).hostname.toLowerCase();
        } catch {
            return '';
        }
    }

    storeData(data) {
        if (this.config.useSessionStorage) {
            this.storeInSession(data);
        } else {
            this.storeInCookie(data);
        }
    }

    storeInCookie(data) {
        const expires = new Date();
        expires.setDate(expires.getDate() + this.config.cookieDuration);
        const sameSite = ['Strict', 'Lax', 'None'].includes(this.config.cookieSameSite)
            ? this.config.cookieSameSite
            : 'Lax';
        const secure = this.config.cookieSecure ? '; Secure' : '';
        const value = encodeURIComponent(JSON.stringify(data));

        document.cookie = `${this.config.storageKey}=${value}; Expires=${expires.toUTCString()}; Path=/; SameSite=${sameSite}${secure}`;
    }

    storeInSession(data) {
        try {
            sessionStorage.setItem(this.config.storageKey, JSON.stringify(data));
        } catch (error) {
            this.log('session storage write failed', error);
        }
    }

    getStoredData() {
        if (this.config.useSessionStorage) {
            try {
                return this.parseStoredValue(sessionStorage.getItem(this.config.storageKey));
            } catch (error) {
                this.log('session storage read failed', error);
                return null;
            }
        }

        for (const cookie of document.cookie.split(';')) {
            const separator = cookie.indexOf('=');
            if (separator === -1) {
                continue;
            }

            const name = cookie.slice(0, separator).trim();
            if (name !== this.config.storageKey) {
                continue;
            }

            const value = cookie.slice(separator + 1).trim();
            try {
                return this.parseStoredValue(decodeURIComponent(value));
            } catch (error) {
                this.log('cookie read failed', error);
                return null;
            }
        }

        return null;
    }

    parseStoredValue(value) {
        if (!value) {
            return null;
        }

        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
        } catch (error) {
            this.log('stored attribution was not valid JSON', error);
            return null;
        }
    }

    getUtmParameters() {
        const data = this.getStoredData();
        if (!data) {
            return null;
        }

        return Object.fromEntries(Object.entries(data).filter(([key]) => this.utmParams.includes(key)));
    }

    getAdPlatformParameters() {
        const data = this.getStoredData();
        if (!data) {
            return null;
        }

        const allAdParams = Object.values(this.adPlatformParams).flat();
        return Object.fromEntries(Object.entries(data).filter(([key]) => allAdParams.includes(key)));
    }

    getRef() {
        return this.getStoredData()?.ref || null;
    }

    getReferrer() {
        return this.getStoredData()?.referrer || null;
    }

    getLandingPage() {
        return this.getStoredData()?.landingPage || null;
    }

    getTimestamp() {
        return this.getStoredData()?.timestamp || null;
    }

    getAll() {
        return this.getStoredData();
    }

    clear() {
        if (this.config.useSessionStorage) {
            try {
                sessionStorage.removeItem(this.config.storageKey);
            } catch (error) {
                this.log('session storage clear failed', error);
            }
            return;
        }

        const secure = this.config.cookieSecure ? '; Secure' : '';
        document.cookie = `${this.config.storageKey}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=${this.config.cookieSameSite}${secure}`;
    }
}

export { AttributionTracker };
export default AttributionTracker;
