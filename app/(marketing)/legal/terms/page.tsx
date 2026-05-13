export const metadata = { title: 'Terms · MCG Support' };

export default function TermsPage() {
  return (
    <article className="container-page max-w-3xl py-10 prose prose-slate dark:prose-invert">
      <h1>Terms of Use</h1>
      <p>
        The MCG Student Support Portal is provided to currently enrolled MCG Career College
        students for support purposes. By using it you agree to the following:
      </p>
      <ul>
        <li>You will only access your own student record.</li>
        <li>You will not attempt to circumvent access controls, scrape data, or interfere with the operation of the service.</li>
        <li>Information provided by the MCG Assistant is best-effort and not a substitute for advice from a licensed professional (immigration consultant, lawyer, doctor, counsellor).</li>
        <li>MCG may temporarily suspend access for security or maintenance reasons.</li>
      </ul>
      <p className="text-sm text-muted-foreground">Final terms pending legal review.</p>
    </article>
  );
}
