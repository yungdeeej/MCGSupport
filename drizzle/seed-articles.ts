export interface SeedArticle {
  slug: string;
  title: string;
  summary: string;
  category: string;
  visibility: 'public' | 'authenticated';
  contentMd: string;
}

export const seedArticles: SeedArticle[] = [
  {
    slug: 'reset-moodle-password',
    title: 'How to reset your Moodle password',
    summary: 'Step-by-step instructions to reset your Moodle password using the built-in self-serve link.',
    category: 'moodle',
    visibility: 'public',
    contentMd: `# How to reset your Moodle password

If you can't sign into Moodle, you can reset your password yourself in under 2 minutes. You don't need to call us.

## Step-by-step

1. Open **https://mcgcollege.lingellearning.ca/login** in your browser.
2. Below the sign-in form, click **"Forgotten your username or password?"**.
3. Enter the email MCG has on file for you — usually \`firstname.lastname@mcgcollege.com\` or \`@student.mcgcollege.com\`.
4. Click **Search**.
5. Watch your inbox. Reset emails come from \`noreply@mcgcollege.lingellearning.ca\` and usually arrive within 1–2 minutes. **Check your Spam/Junk folder** if you don't see it.
6. Click the link in the email and pick a new password. It must be at least 8 characters with mixed case + a number.

## Common gotchas

- **Wrong email**: If your name changed (marriage, preferred name), your Moodle email may still use the old one. The MCG Assistant can look up your profile if you're signed into this portal.
- **Email never arrives**: Check Spam and add \`noreply@mcgcollege.lingellearning.ca\` to your safe senders. If it's been 30 minutes, [open a ticket](/tickets/new) and we'll involve IT.
- **Link expired**: Reset links work once and expire in 30 minutes. Request a new one if needed.

## Still stuck?

Open a ticket and we'll help. Don't share your password with anyone — MCG staff never need it.
`,
  },
  {
    slug: 'first-time-moodle-login',
    title: 'Logging into Moodle for the first time',
    summary: 'New to Moodle? Here is exactly what you do to log in for the first time.',
    category: 'moodle',
    visibility: 'authenticated',
    contentMd: `# Logging into Moodle for the first time

Welcome! Here's how to sign into Moodle on day one.

1. Open **https://mcgcollege.lingellearning.ca/login**.
2. Username: usually your MCG email (\`firstname.lastname@mcgcollege.com\`).
3. Password: the temporary password emailed to you during admission. If you can't find it, use the [password reset flow](/kb/reset-moodle-password).
4. After your first sign-in, **set a strong password** of your own.
5. From your **Dashboard**, click any course tile to enter.

If you don't see your courses on day one, that's normal — instructors publish a few days before the term starts. Check back the morning of your first class.
`,
  },
  {
    slug: 'find-your-courses',
    title: 'Where do I find my courses in Moodle?',
    summary: 'Two ways to find every course you are enrolled in.',
    category: 'moodle',
    visibility: 'authenticated',
    contentMd: `# Finding your courses

Your enrolled courses appear in two places on Moodle:

- **Dashboard** (\`/my\`) — tiles for every course you're enrolled in. This is the fastest way day-to-day.
- **My courses** in the top navigation — a list view, useful when you've got many courses across terms.

If a course is missing:

1. Make sure the **term has started**. Courses appear ~3 days before term.
2. Check that your registration is complete in CampusLogin. The MCG Assistant can look up your program enrollment.
3. If both are fine and it's still missing, open a ticket — we'll loop in the academic team.
`,
  },
  {
    slug: 'join-live-classes',
    title: 'Joining live online classes',
    summary: 'How to join Zoom / virtual classroom sessions from inside Moodle.',
    category: 'moodle',
    visibility: 'authenticated',
    contentMd: `# Joining live online classes

Live sessions for your courses are linked **inside the Moodle course** — not in your email.

1. Open the course in Moodle.
2. Look for the **"Live class"** or **"Virtual classroom"** activity at the top.
3. Click it 5 minutes before class time. The link only goes active just before the session.
4. If prompted, allow camera and microphone access in your browser.

**Tip:** Use **Google Chrome** or **Microsoft Edge** for the best experience. Safari sometimes blocks audio.

If the link doesn't show, your instructor may have posted a separate Zoom link in the **Announcements** section.
`,
  },
  {
    slug: 'submit-assignments',
    title: 'How to submit an assignment in Moodle',
    summary: 'Step-by-step for uploading and submitting an assignment.',
    category: 'moodle',
    visibility: 'authenticated',
    contentMd: `# Submitting an assignment

1. Open the course in Moodle.
2. Click the **assignment** activity (a paper icon).
3. Click **Add submission**.
4. Drag your file into the upload box or click to browse. Most assignments accept PDF or DOCX. Stay under the file-size limit shown.
5. Click **Save changes**.
6. Click **Submit assignment** when prompted. You may need to confirm a declaration.
7. Look for the **green "Submitted for grading" banner** — that's your receipt.

You can usually edit your submission until the due date. After the due date, it locks.

If you missed a deadline due to illness or emergency, **don't email your instructor a file** — open a ticket so the academic team can record the accommodation properly.
`,
  },
  {
    slug: 'view-grades',
    title: 'Where do I see my grades?',
    summary: 'How to view grades for a single course and across all courses.',
    category: 'moodle',
    visibility: 'authenticated',
    contentMd: `# Viewing your grades

**Per course:**
1. Open the course in Moodle.
2. Open the course **menu** (three lines, top right) and choose **Grades**.

**All courses (overview):**
- Click your name in the top right → **Grades**. You'll see every course you're enrolled in.

You can also ask the MCG Assistant — *"what are my grades for {course code}?"* — and it'll pull them for you. (Heads up: that's a sensitive lookup, so you may be asked to re-verify it's you.)

## Grade disputes

If a grade looks wrong, first message your instructor inside Moodle. If you can't resolve it that way, **don't escalate in the assistant** — open a ticket in the **academic** category and a coordinator will pick it up.
`,
  },
  {
    slug: 'moodle-mobile-app',
    title: 'Using the Moodle mobile app',
    summary: 'How to set up the official Moodle app on iOS or Android.',
    category: 'moodle',
    visibility: 'public',
    contentMd: `# Using the Moodle mobile app

Download the **Moodle app** ([iOS](https://apps.apple.com/app/moodle/id633359593) / [Android](https://play.google.com/store/apps/details?id=com.moodle.moodlemobile)).

On first launch:
1. Tap **I'm a learner**.
2. Enter the site URL: \`https://mcgcollege.lingellearning.ca\`.
3. Sign in with your Moodle credentials.

The app is great for **viewing announcements** and **opening files** on the go. For submitting assignments and joining live classes, we still recommend the **desktop browser**.
`,
  },
  {
    slug: 'find-my-timetable',
    title: 'How to find your weekly timetable',
    summary: 'Three ways to view your class schedule.',
    category: 'schedule',
    visibility: 'authenticated',
    contentMd: `# Finding your weekly timetable

You have three ways to find your schedule:

1. **MCG Assistant** — just ask: *"what's my schedule this week?"*
2. **Moodle calendar** — click the calendar icon in the top right.
3. **Course pages** — each course page shows its meeting times near the top.

All MCG class times are in **Mountain Time (America/Edmonton)**. If you're traveling, plan accordingly.
`,
  },
  {
    slug: 'time-zones',
    title: 'What time zone are MCG classes in?',
    summary: 'All class times are Mountain Time. Quick conversion table.',
    category: 'schedule',
    visibility: 'public',
    contentMd: `# Class time zone

Every MCG class is scheduled in **Mountain Time (America/Edmonton)**. Daylight savings applies (UTC-7 in summer, UTC-6 in winter).

| If you're in… | Subtract / add |
|---|---|
| Vancouver / Pacific | 1 hour earlier than MT |
| Winnipeg / Central | 1 hour later than MT |
| Toronto / Eastern | 2 hours later than MT |
| Halifax / Atlantic | 3 hours later than MT |

The MCG Assistant always returns times in Mountain Time so you don't have to think about it.
`,
  },
  {
    slug: 'class-cancellation',
    title: 'What happens if a class is cancelled?',
    summary: 'How cancellations are communicated and what to do.',
    category: 'schedule',
    visibility: 'public',
    contentMd: `# Class cancellations

If a class is cancelled (instructor illness, snow day, etc.) the campus team will:

1. Post an **Announcement** in the affected Moodle course.
2. Send an email to all students enrolled.
3. Reschedule the session — usually within the same week.

If you've travelled to campus and the class is cancelled at short notice, just head back home — instructors will reschedule and send a recording where possible.

If you missed a notice and showed up to an empty classroom, [open a ticket](/tickets/new) so we can check the comms process.
`,
  },
  {
    slug: 'payment-plans',
    title: 'Payment plans and tuition options',
    summary: 'Overview of MCG payment plans — process, not amounts.',
    category: 'payments',
    visibility: 'authenticated',
    contentMd: `# Payment plans

MCG offers monthly payment plans for most programs. **Specific amounts and balances are not visible inside this portal** — they live in CampusLogin and the registrar's office.

To set up or change a payment plan:

1. [Open a ticket](/tickets/new) in the **Payments** category.
2. Include your program and preferred payment frequency.
3. A finance advisor will reach out within **one business day** (Mon–Fri, MT).

For questions like *"how much do I owe?"* or *"when's my next withdrawal?"* — the MCG Assistant **cannot** see those numbers. Open a ticket and we'll route you.

## StudentAid Alberta

If you're funded through StudentAid Alberta, all disbursements go through their portal, not ours. Check **studentaid.alberta.ca** for status.

## T2202 (tax slip)

T2202 slips are issued in **February** for the prior tax year. They appear in CampusLogin under **Documents**. Email follows automatically.
`,
  },
  {
    slug: 'late-fees',
    title: 'Late payment fees',
    summary: 'How late fees work — process not amounts.',
    category: 'payments',
    visibility: 'authenticated',
    contentMd: `# Late payment fees

If a scheduled tuition payment misses, MCG applies a late fee. **Exact amounts are not in this portal** — open a Payments ticket and finance will confirm.

What to do **before** a payment fails:

- If you know in advance, open a ticket *before* the due date. We can usually waive the fee with notice.
- Update your payment method in CampusLogin via your advisor.

If a fee has already been charged and you believe it's in error, open a ticket with the **date** and **amount** charged. Finance will review.
`,
  },
  {
    slug: 't2202-tax-slip',
    title: 'T2202 tax slip — what it is and when you get it',
    summary: 'Annual tax slip showing eligible tuition for the CRA.',
    category: 'payments',
    visibility: 'authenticated',
    contentMd: `# T2202 tax slip

The **T2202 (Tuition and Enrolment Certificate)** is the form Canadian post-secondary students use to claim tuition on their tax return.

- **When?** Issued by **February 28** for the prior tax year.
- **Where?** It appears under **Documents** in CampusLogin, and we email you a copy when it's ready.
- **What's on it?** Total eligible tuition + months of full-time/part-time enrolment.
- **CRA claim?** Use it when you file. If you've earned no income, you can carry forward or transfer to a parent/spouse (up to $5,000).

We don't issue T4As — only T2202.
`,
  },
  {
    slug: 'name-change',
    title: 'How to update your name',
    summary: 'Legal name change vs preferred name — what we can update and how.',
    category: 'account',
    visibility: 'authenticated',
    contentMd: `# Updating your name

There are two kinds of name change:

**Preferred name** (what your instructors call you, what shows on Moodle): we can update this with a [ticket](/tickets/new) in the **Account** category. We just need the new name.

**Legal name change** (what appears on your T2202, transcript, diploma): we need a **legal document** confirming the change (marriage certificate, court order, government-issued ID with the new name). Upload a scan with your ticket.

Allow up to 5 business days for the update to flow through all systems.
`,
  },
  {
    slug: 'email-update',
    title: 'Updating your contact email',
    summary: 'Change the email MCG uses to reach you.',
    category: 'account',
    visibility: 'authenticated',
    contentMd: `# Updating your email

Your **MCG email** (\`@mcgcollege.com\`) is your sign-in identifier — we don't change it.

Your **personal/backup email** (used for important notices when you can't reach your MCG account) can be updated by:

1. [Opening a ticket](/tickets/new) in the **Account** category.
2. Including the new personal email.
3. Confirming when an advisor emails the new address.

For security, we never change a sign-in email over chat. The change happens through a verified ticket.
`,
  },
  {
    slug: 'transcript-request',
    title: 'How to request a transcript',
    summary: 'Official transcripts: who, when, how much.',
    category: 'account',
    visibility: 'authenticated',
    contentMd: `# Requesting a transcript

To request an **official transcript**:

1. [Open a ticket](/tickets/new) in the **Academic** category.
2. Specify whether you need a **digital PDF** or a **mailed paper** copy.
3. Provide the recipient address or email.

Turnaround is **5 business days** for digital, **10 business days** for paper.

If you just need an **unofficial transcript** for your own reference, you can pull it from CampusLogin under **Documents**.
`,
  },
  {
    slug: 'withdrawal',
    title: 'Withdrawing from a course or program',
    summary: 'High-level process — withdrawals are always handled by a human.',
    category: 'account',
    visibility: 'authenticated',
    contentMd: `# Withdrawing from a course or program

Withdrawal is a serious decision and we **always** route it to a real advisor — the MCG Assistant won't try to handle it.

The process:

1. [Open a ticket](/tickets/new) and select **Account** category. In the description, say you'd like to withdraw and from what (course code or full program).
2. Your assigned advisor will reach out within **one business day** (Mon–Fri, MT) to talk through:
   - Tuition refund / outstanding balance
   - Impact on StudentAid (if applicable)
   - Impact on study permit (if you're an international student) — **this is important; don't skip the conversation**
   - Alternatives that might keep you on track

Withdrawals from individual courses follow MCG's published refund schedule. Your advisor will share the timeline that applies to you.
`,
  },
  {
    slug: 'cant-sign-in',
    title: "I can't sign in to the support portal",
    summary: 'What to try when the sign-in link isn’t working.',
    category: 'account',
    visibility: 'public',
    contentMd: `# Can't sign in?

Sign-in here uses **email magic links** — there's no password to remember.

If you're not receiving the link:

1. Check the email you used. We send to the address MCG has on file. If you've recently switched, your old email may still be active.
2. Look in **Spam/Junk**. Add \`no-reply@support.mcgcollege.com\` to your safe senders.
3. Links expire in **15 minutes** and work **once**. If you waited too long, just request a new one.
4. Still nothing? Email \`support@mcgcollege.com\` directly. We'll fix it on our side and re-send.

You'll never receive a password reset email from this portal — there are no passwords. Watch out for fake "MCG support" emails asking for one.
`,
  },
  {
    slug: 'campus-calgary',
    title: 'Calgary campus — hours, address, contact',
    summary: 'Calgary campus info: where it is, when it’s open, how to reach the team.',
    category: 'campus',
    visibility: 'public',
    contentMd: `# Calgary campus

**Address:** *(to be confirmed by DJ before launch)*

**Hours:** Monday–Friday, 8:30 AM – 5:00 PM Mountain Time. Closed weekends and statutory holidays.

**Parking:** *(to be confirmed)*

**Reception:** *(to be confirmed)*

For general questions, just open a ticket — campus-specific replies route to the Calgary team.
`,
  },
  {
    slug: 'campus-red-deer',
    title: 'Red Deer campus — hours, address, contact',
    summary: 'Red Deer campus info.',
    category: 'campus',
    visibility: 'public',
    contentMd: `# Red Deer campus

**Address:** *(to be confirmed)*

**Hours:** Monday–Friday, 8:30 AM – 5:00 PM MT.

For questions specific to the Red Deer campus, [open a ticket](/tickets/new) and select **Account** — your assigned advisor is the Red Deer team.
`,
  },
  {
    slug: 'campus-cold-lake',
    title: 'Cold Lake campus — hours, address, contact',
    summary: 'Cold Lake campus info.',
    category: 'campus',
    visibility: 'public',
    contentMd: `# Cold Lake campus

**Address:** *(to be confirmed)*

**Hours:** Monday–Friday, 8:30 AM – 5:00 PM MT.

For Cold Lake campus questions, [open a ticket](/tickets/new) and we'll route to the local team.
`,
  },
  {
    slug: 'campus-edmonton',
    title: 'Edmonton campus — hours, address, contact',
    summary: 'Edmonton campus info.',
    category: 'campus',
    visibility: 'public',
    contentMd: `# Edmonton campus

**Address:** *(to be confirmed)*

**Hours:** Monday–Friday, 8:30 AM – 5:00 PM MT.

Edmonton students: [open a ticket](/tickets/new) and we'll route to the Edmonton team.
`,
  },
  {
    slug: 'international-students-study-permit',
    title: 'I have a study permit question',
    summary: 'Why immigration questions always go to a human.',
    category: 'international',
    visibility: 'authenticated',
    contentMd: `# Study permit & IRCC questions

**The MCG Assistant cannot give immigration advice.** This isn't a limitation we're hiding — Canadian law restricts who can advise on immigration matters, and we take that seriously.

For any study permit, work permit, IRCC, or PR question:

1. [Open a ticket](/tickets/new) — select **International / study permit**.
2. The international student advisor will reach back within **one business day** (Mon–Fri, MT).
3. If your situation is urgent (permit expiring this week), say so in the ticket — it gets bumped to high priority.

If your question is **policy-level only** ("when do I need to apply for an extension?"), an advisor can guide you. For **case-level** questions ("will *my* application succeed?") we refer you to a regulated immigration consultant or lawyer.
`,
  },
  {
    slug: 'crisis-support',
    title: 'Mental health and crisis support',
    summary: 'Free 24/7 crisis lines, plus how to reach the MCG counselling team.',
    category: 'account',
    visibility: 'public',
    contentMd: `# If you're in crisis

If you're in immediate danger or having thoughts of suicide or self-harm, please reach out **right now**:

- **911** — for emergencies
- **9-8-8** — Canada Suicide Crisis Helpline (call or text, 24/7, free, bilingual)
- **Wellness Together Canada** — \`wellnesstogether.ca\` — free counselling, 24/7

You don't have to go through this alone.

## MCG counselling

MCG provides confidential student counselling at no cost to currently enrolled students. To book:

1. [Open a ticket](/tickets/new) — select **Account**, mark priority **high**.
2. We will route directly to the counselling team — your message stays confidential.
3. A counsellor will reach out within one business day.

The MCG Assistant will route mental-health conversations to a human as soon as it picks them up. It will not try to counsel you itself — that's not its job.
`,
  },
  {
    slug: 'privacy-overview',
    title: 'How MCG handles your data',
    summary: 'A plain-language summary of our privacy practices, aligned with PIPEDA.',
    category: 'account',
    visibility: 'public',
    contentMd: `# How we handle your data

This portal is built around three principles:

1. **Minimum data, on purpose.** We pull the student record we already have in CampusLogin. We don't ask you to enter the same info twice.
2. **You can see and download everything.** Visit **My account → Download my data** for a JSON dump of your record, tickets, AI conversations, and audit history.
3. **You can ask us to delete you.** After you graduate or withdraw, you can request hard deletion. We retain audit logs for 7 years per Alberta records guidance, but personal data tied to your record is removed.

## Where your data lives

- Identity & enrolment data: synced from **CampusLogin**.
- Course & grade data: pulled live from **Moodle** when you ask.
- Chat conversations: stored in **MCG's database**, in Canada.
- AI completions: routed through **Anthropic Claude**. We have a data-processing agreement; your data is not used to train Anthropic's models.

If you have a privacy concern, email **privacy@mcgcollege.com** or [open a ticket](/tickets/new).
`,
  },
  {
    slug: 'using-the-ai-assistant',
    title: 'Tips for using the MCG Assistant',
    summary: 'Get better answers, faster.',
    category: 'other',
    visibility: 'public',
    contentMd: `# Using the MCG Assistant

The Assistant works best when you:

- **Be specific.** "Schedule for tomorrow" is better than "tell me my classes."
- **Ask one thing at a time** if you can. It can multitask, but answers are crisper one question at a time.
- **Trust the citations.** When the Assistant shows "Looked at:", you can open the KB article it used. If the article is wrong, [open a ticket](/tickets/new) so we can fix it.
- **It will not handle**: tuition amounts, immigration advice, mental health counselling, academic appeals, withdrawals. All of those route to a human — that's intentional.

Press **Talk to a human** any time. There's no shame in skipping the AI.
`,
  },
];
