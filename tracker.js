class AttributionTracker {
    constructor(config = {}) {
        console.debug('AttributionTracker: constructor start', config);
        this.config = {
            cookieDuration: config.cookieDuration || 30, // days
            useSessionStorage: config.useSessionStorage || false,
            additionalParams: config.additionalParams || [],
            storageKey: config.storageKey || 'attribution_data',
            ...config
        };

        // Standard UTM parameters
        this.utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

        // Ad platform specific parameters
        this.adPlatformParams = {
            facebook: ['fbclid', 'fb_source', 'fb_ref'],
            google: ['gclid', 'gclsrc', 'dclid', 'gad_source'],
            twitter: ['twclid', 'tw_source'],
            reddit: ['rdt_cid', 'rdt_source'],
            meta: ['mclid']
        };

        this.initialize();
        console.debug('AttributionTracker: constructor end');
    }

    initialize() {
        console.debug('AttributionTracker: initialize start');
        const hasConsent = this.checkCookieConsent();
        
        // Get and normalize any existing data first
        const existingData = this.getStoredData();
        if (existingData && hasConsent) {
            // Re-store the decoded data to normalize the cookie
            this.storeInCookie(existingData);
        }

        const currentData = this.captureCurrentData();
        if (Object.keys(currentData).length > 0) {
            // Merge current data with existing (now normalized) data
            const mergedData = { ...currentData, ...(existingData || {}) };

            if (this.config.useSessionStorage) {
                this.storeInSession(mergedData);
            } else if (hasConsent) {
                this.storeInCookie(mergedData);
            }
        }
        console.debug('AttributionTracker: initialize end');
    }

    captureCurrentData() {
        console.debug('AttributionTracker: captureCurrentData start');
        const data = {};
        const existingData = this.getStoredData() || {};
        const urlParams = new URLSearchParams(window.location.search);
        
        // Only capture params that don't already exist
        const captureIfNew = (param) => {
            if (urlParams.has(param) && !existingData[param]) {
                data[param] = urlParams.get(param);
            }
        };

        // Capture UTM parameters
        this.utmParams.forEach(captureIfNew);

        // Capture ad platform parameters
        Object.values(this.adPlatformParams).flat().forEach(captureIfNew);

        // Capture additional configured parameters
        this.config.additionalParams.forEach(captureIfNew);

        // Only capture referrer and landing page if not already stored
        if (!existingData.referrer && document.referrer) {
            data.referrer = document.referrer;
        }
        
        if (!existingData.landingPage) {
            data.landingPage = window.location.href;
            data.timestamp = new Date().toISOString();
        }

        console.debug('AttributionTracker: captureCurrentData end', data);
        return data;
    }

    checkCookieConsent() {
        console.debug('AttributionTracker: checkCookieConsent start');
        // Check for common cookie consent mechanisms
        // This should be customized based on the website's consent management
        if (window.cookieConsent !== undefined) {
            return window.cookieConsent;
        }
        
        // Check for common consent cookies
        const commonConsentCookies = ['cookieconsent_status', 'cookie_consent'];
        const cookies = document.cookie.split(';');
        
        for (const cookie of cookies) {
            const [name, value] = cookie.split('=').map(c => c.trim());
            if (commonConsentCookies.includes(name) && value === 'allow') {
                return true;
            }
        }

        const result = true; // Default to true if no consent mechanism is found
        console.debug('AttributionTracker: checkCookieConsent end', result);
        return result;
    }

    storeInCookie(data) {
        console.debug('AttributionTracker: storeInCookie start', data);
        const expires = new Date();
        expires.setDate(expires.getDate() + this.config.cookieDuration);
        
        document.cookie = `${this.config.storageKey}=${JSON.stringify(data)}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
        console.debug('AttributionTracker: storeInCookie end');
    }

    storeInSession(data) {
        console.debug('AttributionTracker: storeInSession start', data);
        sessionStorage.setItem(this.config.storageKey, JSON.stringify(data));
        console.debug('AttributionTracker: storeInSession end');
    }

    getStoredData() {
        console.debug('AttributionTracker: getStoredData start');
        if (this.config.useSessionStorage) {
            const data = sessionStorage.getItem(this.config.storageKey);
            const result = data ? JSON.parse(data) : null;
            console.debug('AttributionTracker: getStoredData end', result);
            return result;
        }

        console.debug('Raw cookie string:', document.cookie);
        const cookies = document.cookie.split(';');
        console.debug('Split cookies:', cookies);

        for (const cookie of cookies) {
            console.debug('Processing cookie:', cookie);
            const name = cookie.substring(0, cookie.indexOf('=')).trim();
            const value = cookie.substring(cookie.indexOf('=') + 1).trim();
            console.debug('Parsed cookie name:', name);
            console.debug('Parsed cookie value:', value);
            
            if (name === this.config.storageKey && value) {
                console.debug('Found matching cookie. Storage key:', this.config.storageKey);
                try {
                    console.debug('Attempting to decode:', value);
                    // Try to detect if the value is URL encoded
                    const decodedValue = value.includes('%') ? decodeURIComponent(value) : value;
                    console.debug('Decoded value:', decodedValue);
                    const result = JSON.parse(decodedValue);
                    console.debug('Parsed result:', result);
                    return result;
                } catch (e) {
                    console.error('Parse error details:', {
                        error: e,
                        errorName: e.name,
                        errorMessage: e.message,
                        value,
                        decodedValue: value.includes('%') ? decodeURIComponent(value) : value
                    });
                    return null;
                }
            }
        }
        console.debug('AttributionTracker: getStoredData end - no matching cookie found');
        return null;
    }

    // Utility methods for accessing specific data
    getUtmParameters() {
        const data = this.getStoredData();
        if (!data) return null;

        return Object.fromEntries(
            Object.entries(data).filter(([key]) => this.utmParams.includes(key))
        );
    }

    getAdPlatformParameters() {
        const data = this.getStoredData();
        if (!data) return null;

        const allAdParams = Object.values(this.adPlatformParams).flat();
        return Object.fromEntries(
            Object.entries(data).filter(([key]) => allAdParams.includes(key))
        );
    }

    getReferrer() {
        const data = this.getStoredData();
        return data?.referrer || null;
    }

    getLandingPage() {
        const data = this.getStoredData();
        return data?.landingPage || null;
    }

    getTimestamp() {
        const data = this.getStoredData();
        return data?.timestamp || null;
    }

    // Get all stored attribution data
    getAll() {
        return this.getStoredData();
    }

    // Clear stored attribution data
    clear() {
        if (this.config.useSessionStorage) {
            sessionStorage.removeItem(this.config.storageKey);
        } else {
            document.cookie = `${this.config.storageKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
    }
}