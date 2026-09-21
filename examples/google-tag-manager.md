# Use Attribution Tracker with Google Tag Manager

This recipe captures a visitor's first UTM values after consent, makes selected values available to GTM, and adds them to a native HTML form. It does not send an analytics event or submit a form by itself.

It assumes you already have a consent manager connected to a GTM web container. The consent manager must make the current decision available to page code and emit an event when consent is granted. Adapt the function and event names below to your setup. There is no universal GTM variable that represents every consent manager's decision.

## 1. Connect the consent decision

Before the tracker tag runs, define `window.hasAttributionConsent` using your consent manager's API. It must return `true` only while the storage category you selected for this tracker is granted. For example, if your site already maintains a boolean `window.cookieConsent`:

```html
<script>
  window.hasAttributionConsent = function () {
    return window.cookieConsent === true;
  };
</script>
```

That example is not a consent banner. Use your site's actual consent decision. When a visitor grants consent after page load, have the consent manager push this event **after** it updates its GTM consent state:

```js
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({ event: 'attribution_consent_granted' });
```

If consent is withdrawn, update the decision returned by `hasAttributionConsent` immediately, clear the stored attribution, and clear the selected data-layer values. For example, in your consent manager's revocation handler:

```js
window.attributionTracker?.clear();
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  attribution: {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    ref: null
  }
});
```

Review any other tags that consumed those values before revocation.

## 2. Create the GTM tag and triggers

Create a **Custom HTML** tag named `Attribution Tracker - capture and form fields`. Paste the code below. Add two firing triggers:

1. **Initialization - All Pages**, for visitors whose consent was already granted before this page loaded.
2. **Custom Event** with event name `attribution_consent_granted`, for visitors who grant consent on this page.

Under **Advanced settings > Consent settings**, select **Require additional consent for tag to fire** and add the consent type your site uses for this first-party storage. `analytics_storage` is one common choice, but use the category that matches your consent policy and CMP configuration. Keep the site's CMP on its own **Consent Initialization** trigger; this tracker tag does not set GTM consent state.

```html
<script>
(function () {
  function allowed() {
    return typeof window.hasAttributionConsent === 'function' &&
      window.hasAttributionConsent() === true &&
      navigator.globalPrivacyControl !== true &&
      navigator.doNotTrack !== '1';
  }

  function publish(tracker) {
    var data = tracker.getAll() || {};
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'attribution_tracker_ready',
      attribution: {
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        utm_campaign: data.utm_campaign || null,
        ref: data.ref || null
      }
    });
  }

  if (!allowed() || window.__attributionTrackerLoading) return;
  if (window.attributionTracker) {
    window.attributionTracker.initialize();
    publish(window.attributionTracker);
    return;
  }
  window.__attributionTrackerLoading = true;

  var script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/gh/jasenf/attribution-tracker.js@v0.1.1/dist/attribution-tracker.js';
  script.onload = function () {
    window.__attributionTrackerLoading = false;
    if (!allowed() || typeof window.AttributionTracker !== 'function') return;

    var tracker = new window.AttributionTracker({ consent: allowed });
    window.attributionTracker = tracker;
    publish(tracker);

    document.addEventListener('submit', function (event) {
      var form = event.target;
      if (!allowed() || !form.matches('form[data-attribution]')) return;

      form.querySelectorAll('[data-attribution-field]').forEach(function (field) {
        field.remove();
      });

      var current = tracker.getAll() || {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'ref'].forEach(function (key) {
        if (!current[key]) return;
        var field = document.createElement('input');
        field.type = 'hidden';
        field.name = 'attribution_' + key;
        field.value = current[key];
        field.setAttribute('data-attribution-field', '');
        form.appendChild(field);
      });
    }, true);
  };
  script.onerror = function () {
    window.__attributionTrackerLoading = false;
  };
  document.head.appendChild(script);
})();
</script>
```

The pinned browser URL is a GitHub-backed jsDelivr URL, not an npm CDN path. The loading guard prevents a second script or form listener when both triggers fire. A later consent-granted event refreshes capture and data-layer values using the existing tracker. If the library fails to load, another consent event or page load can retry it.

## 3. Read selected values in GTM

Create **Data Layer Variable** variables with **Version 2** and these exact names:

| GTM variable name | Data Layer Variable Name |
| --- | --- |
| `DLV - attribution source` | `attribution.utm_source` |
| `DLV - attribution medium` | `attribution.utm_medium` |
| `DLV - attribution campaign` | `attribution.utm_campaign` |
| `DLV - attribution ref` | `attribution.ref` |

The values become available on the `attribution_tracker_ready` custom event, not necessarily on the initial page-view event because the script loads asynchronously. Only attach these values to another tag after checking that tag's purpose, consent settings, and destination. The tracker itself makes no network request.

If consent is granted only after the visitor has navigated away from the tagged landing URL, that earlier URL cannot be recovered by this browser-only recipe. Capture begins on the page where consent is granted.

## 4. Add fields to a native form

Add `data-attribution` to the form you want to enrich:

```html
<form data-attribution action="/lead" method="post">
  <input name="email" type="email" required>
  <button type="submit">Send</button>
</form>
```

On a normal browser `submit` event, the tag adds up to four hidden fields: `attribution_utm_source`, `attribution_utm_medium`, `attribution_utm_campaign`, and `attribution_ref`. Remove or change that allowlist to match the data you actually need. The example deliberately omits full landing-page and referrer URLs, which can contain sensitive query data.

This handoff is for native HTML form submissions. A form framework that constructs its own payload or bypasses the browser `submit` event needs its own integration. The external script must also finish loading before submission. For a non-GTM form example, see [the plain HTML form](form-hidden-fields.html).

## Test before publishing the container

Use GTM Preview and a test URL such as `?utm_source=newsletter&utm_campaign=guide`:

1. With consent denied, confirm that the tracker tag does not fire, no `attribution_tracker_ready` event appears, and no `attribution_data` cookie is set.
2. Grant consent on the same page. Confirm the custom event triggers the tag once and `attribution_tracker_ready` contains the expected values.
3. Submit a test form with `data-attribution`. Confirm the request contains the selected hidden fields exactly once.
4. Withdraw consent. Confirm no new fields are added and the stored attribution is cleared by your CMP's revocation handler.
5. Repeat with Global Privacy Control or Do Not Track enabled. The snippet above blocks capture even if the CMP reports consent.

GTM's [consent settings](https://support.google.com/tagmanager/answer/10718549), [Custom HTML tags](https://support.google.com/tagmanager/answer/6107167), [custom-event triggers](https://support.google.com/tagmanager/answer/7679219), and [data-layer variables](https://support.google.com/tagmanager/answer/7683362) document the controls used here. Google recommends [previewing and testing form behavior](https://support.google.com/tagmanager/answer/7679102) before publishing.
