import { NewTicketForm } from '@/components/tickets/NewTicketForm';

export const metadata = { title: 'New ticket · MCG Support' };

export default function NewTicketPage() {
  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-2xl font-semibold tracking-tightish">Open a ticket</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell us what&apos;s going on. We aim to respond within 4 business hours during 9–5 MT.
      </p>
      <div className="mt-6">
        <NewTicketForm />
      </div>
    </div>
  );
}
