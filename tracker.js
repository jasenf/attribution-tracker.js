class AttributionTracker {
    constructor(config = {}) {
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
    }

    initialize() {
        // Check if we have user consent for cookies
        const hasConsent = this.checkCookieConsent();
        
        // Get current URL parameters and referrer
        const currentData = this.captureCurrentData();

        // If we have data to store
        if (Object.keys(currentData).length > 0) {
            // Store based on user preferences and consent
            if (this.config.useSessionStorage) {
                this.storeInSession(currentData);
            } else if (hasConsent) {
                this.storeInCookie(currentData);
            }
        }
    }

    captureCurrentData() {
        const data = {};
        
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        
        // Capture UTM parameters
        this.utmParams.forEach(param => {
            if (urlParams.has(param)) {
                data[param] = urlParams.get(param);
            }
        });

        // Capture ad platform parameters
        Object.entries(this.adPlatformParams).forEach(([platform, params]) => {
            params.forEach(param => {
                if (urlParams.has(param)) {
                    data[param] = urlParams.get(param);
                }
            });
        });

        // Capture additional configured parameters
        this.config.additionalParams.forEach(param => {
            if (urlParams.has(param)) {
                data[param] = urlParams.get(param);
            }
        });

        // Capture referrer if available
        if (document.referrer) {
            data.referrer = document.referrer;
        }

        // Capture full landing URL
        data.landingPage = window.location.href;
        data.timestamp = new Date().toISOString();

        return data;
    }

    checkCookieConsent() {
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

        return false; // Default to false if no consent mechanism is found
    }

    storeInCookie(data) {
        const expires = new Date();
        expires.setDate(expires.getDate() + this.config.cookieDuration);
        
        document.cookie = `${this.config.storageKey}=${JSON.stringify(data)}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
    }

    storeInSession(data) {
        sessionStorage.setItem(this.config.storageKey, JSON.stringify(data));
    }

    getStoredData() {
        if (this.config.useSessionStorage) {
            const data = sessionStorage.getItem(this.config.storageKey);
            return data ? JSON.parse(data) : null;
        }

        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.split('=').map(c => c.trim());
            if (name === this.config.storageKey) {
                return JSON.parse(decodeURIComponent(value));
            }
        }
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