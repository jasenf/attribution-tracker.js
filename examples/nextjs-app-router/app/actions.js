'use server';

const attributionFields = [
  'attribution_utm_source',
  'attribution_utm_medium',
  'attribution_utm_campaign',
  'attribution_ref'
];

export async function submitLead(previousState, formData) {
  const email = String(formData.get('email') || '').trim();
  const attribution = {};

  for (const name of attributionFields) {
    const value = formData.get(name);
    if (typeof value === 'string' && value) {
      attribution[name.replace('attribution_', '')] = value.slice(0, 500);
    }
  }

  // Replace this return value with a validated write to your CRM or database.
  return {
    message: email ? `Received a test lead for ${email}.` : 'Email is required.',
    attribution
  };
}
