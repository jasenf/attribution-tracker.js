# Next.js App Router example

This example captures selected first-touch values in a Client Component and sends them to a Server Action as hidden form fields. It targets Next.js 16.3.6 and React 19.3.0.

```bash
npm install
npm run dev
```

Open `http://localhost:3000/?utm_source=newsletter&utm_campaign=launch`, grant the demo consent, and submit the form. The result shows the attribution fields received by the Server Action.

The consent buttons are a test control, not a consent manager. In a real application, replace the local `consent` state with your consent management platform's current decision and change callback. Decide whether the tracker belongs under your analytics, marketing, or another storage category based on your own use and policy.

The tracker runs inside `app/lead-form.js` because it needs browser APIs. Next.js pages and layouts are Server Components by default. The Server Action allowlists four attribution values and trims their length before returning them. Replace the example return value with your validated CRM or database write.

The example checks Global Privacy Control and Do Not Track even after its demo consent is granted. It also clears the stored first touch when consent is withdrawn. It intentionally does not send the full landing page or referrer, since URLs can contain sensitive query data.

References: [Next.js Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [Next.js forms and Server Actions](https://nextjs.org/docs/app/guides/forms), and [React `useActionState`](https://react.dev/reference/react/useActionState).
