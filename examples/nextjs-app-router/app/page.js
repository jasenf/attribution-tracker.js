import LeadForm from './lead-form';

export default function Page() {
  return (
    <main>
      <h1>Next.js first-touch attribution</h1>
      <p>
        Add UTM parameters to this page, grant the demo consent, and submit the form.
        The selected attribution values go to a Server Action with the lead.
      </p>
      <LeadForm />
    </main>
  );
}
