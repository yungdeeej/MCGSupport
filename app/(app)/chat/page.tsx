import { Chat } from '@/components/chat/Chat';
import { db } from '@/lib/db';
import { students } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export const metadata = { title: 'Assistant · MCG Support' };

export default async function ChatPage() {
  const session = await getSession();
  let firstName: string | null = null;
  if (session?.userType === 'student') {
    const [s] = await db
      .select({ firstName: students.firstName })
      .from(students)
      .where(eq(students.id, session.userId))
      .limit(1);
    firstName = s?.firstName ?? null;
  }
  return (
    <div className="container-page max-w-3xl py-6 sm:py-10">
      <Chat greeting={firstName ? `Hi ${firstName} — what's on your mind?` : "Hi — what's on your mind?"} />
    </div>
  );
}
