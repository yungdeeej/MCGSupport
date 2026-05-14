export const metadata = { title: 'Accessibility · MCG Support' };

export default function AccessibilityPage() {
  return (
    <article className="container-page max-w-3xl py-10 prose prose-slate dark:prose-invert">
      <h1>Accessibility</h1>
      <p>
        We design and build the MCG Support Portal to the WCAG 2.1 AA standard. That includes
        keyboard navigation throughout, visible focus rings, sufficient colour contrast, and
        screen-reader-friendly markup.
      </p>
      <p>
        If you hit a barrier — a button you can&apos;t reach with the keyboard, a colour that&apos;s
        hard to read, a screen-reader bug — please <a href="/tickets/new">open a ticket</a> or
        email <a href="mailto:accessibility@mcgcollege.com">accessibility@mcgcollege.com</a> so
        we can fix it.
      </p>
    </article>
  );
}
