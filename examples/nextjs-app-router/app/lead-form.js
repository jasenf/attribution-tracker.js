'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import AttributionTracker from '@feech/attribution-tracker';
import { submitLead } from './actions';

const initialResult = { message: '', attribution: {} };
const allowedFields = ['utm_source', 'utm_medium', 'utm_campaign', 'ref'];

function privacySignalBlocksStorage() {
  return navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
}

function selectAttribution(data) {
  return Object.fromEntries(
    allowedFields
      .filter((key) => data?.[key])
      .map((key) => [key, data[key]])
  );
}

export default function LeadForm() {
  const [result, formAction, pending] = useActionState(submitLead, initialResult);
  const [consent, setConsent] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [attribution, setAttribution] = useState({});
  const trackerRef = useRef(null);

  useEffect(() => {
    const privacyBlocked = privacySignalBlocksStorage();
    setBlocked(privacyBlocked);

    if (!consent || privacyBlocked) return;

    const tracker = new AttributionTracker({
      consent: () => consent && !privacySignalBlocksStorage()
    });

    trackerRef.current = tracker;
    setAttribution(selectAttribution(tracker.getAll()));
  }, [consent]);

  function withdrawConsent() {
    trackerRef.current?.clear();
    trackerRef.current = null;
    setAttribution({});
    setConsent(false);
  }

  return (
    <section>
      <div className="consent-row">
        <button
          type="button"
          onClick={() => setConsent(true)}
          disabled={consent || blocked}
        >
          Grant demo consent
        </button>
        <button type="button" onClick={withdrawConsent} disabled={!consent}>
          Withdraw consent and clear
        </button>
      </div>

      <p className="status" aria-live="polite">
        {blocked
          ? 'A browser privacy signal blocks attribution storage.'
          : consent
            ? `Stored fields: ${Object.keys(attribution).join(', ') || 'none on this URL'}`
            : 'Attribution storage is off until consent is granted.'}
      </p>

      <form action={formAction}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" defaultValue="reader@example.com" required />

        {Object.entries(attribution).map(([key, value]) => (
          <input key={key} type="hidden" name={`attribution_${key}`} value={value} />
        ))}

        <button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send test lead'}
        </button>
      </form>

      {result.message && (
        <div className="result" aria-live="polite">
          <p>{result.message}</p>
          <pre>{JSON.stringify(result.attribution, null, 2)}</pre>
        </div>
      )}
    </section>
  );
}
