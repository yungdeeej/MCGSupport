'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, ShieldAlert, Wrench, UserCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

type ChatMessage =
  | { role: 'user'; text: string }
  | {
      role: 'assistant';
      text: string;
      tools: Array<{ name: string; ok?: boolean }>;
      citations?: Array<{ slug: string; title: string }>;
      confidence?: 'high' | 'medium' | 'low';
      reauthRequired?: string;
    };

export function Chat({ greeting }: { greeting: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!liveRef.current) return;
    liveRef.current.scrollTo({ top: liveRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setMessages((m) => [
      ...m,
      { role: 'user', text },
      { role: 'assistant', text: '', tools: [] },
    ]);
    setInput('');
    setStreaming(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId }),
      });
      if (!res.ok || !res.body) throw new Error(`http ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          if (!frame.startsWith('data:')) continue;
          const payload = frame.replace(/^data:\s?/, '');
          const evt = JSON.parse(payload);
          applyEvent(evt);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((m) => {
        const out = [...m];
        const last = out[out.length - 1];
        if (last?.role === 'assistant' && !last.text) {
          last.text = "I hit an error reaching the server. Mind trying that again? If it keeps happening, open a ticket.";
        }
        return out;
      });
    } finally {
      setStreaming(false);
    }
  }

  function applyEvent(evt: { type: string; [k: string]: unknown }) {
    setMessages((m) => {
      const out = [...m];
      const last = out[out.length - 1];
      if (!last || last.role !== 'assistant') return out;
      switch (evt.type) {
        case 'meta':
          setConversationId(evt.conversationId as number);
          break;
        case 'text_delta':
          last.text += String(evt.text ?? '');
          break;
        case 'tool_use_start':
          last.tools.push({ name: String(evt.name) });
          break;
        case 'tool_use_result': {
          const t = last.tools.find((x) => x.name === evt.name && x.ok === undefined);
          if (t) t.ok = Boolean(evt.ok);
          break;
        }
        case 'kb_citations':
          last.citations = evt.hits as Array<{ slug: string; title: string }>;
          break;
        case 'confidence':
          last.confidence = evt.level as 'high' | 'medium' | 'low';
          break;
        case 'reauth_required':
          last.reauthRequired = String(evt.tool);
          break;
        case 'error':
          last.text += `\n\n_⚠ ${String(evt.message)}_`;
          break;
      }
      return out;
    });
  }

  return (
    <div className="flex h-[calc(100dvh-12rem)] flex-col rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">MCG Assistant</p>
            <p className="text-xs text-muted-foreground">Powered by Claude · grounded in MCG data</p>
          </div>
        </div>
        <Link
          href="/tickets/new"
          className="text-xs font-medium text-secondary hover:underline"
        >
          Talk to a human →
        </Link>
      </div>

      <div ref={liveRef} aria-live="polite" className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">
            {greeting}
          </div>
        )}
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <UserBubble key={i} text={m.text} />
          ) : (
            <AssistantBubble key={i} message={m} streaming={streaming && i === messages.length - 1} />
          ),
        )}
      </div>

      <form
        className="flex items-end gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Textarea
          placeholder="Ask about your schedule, Moodle, payments, anything…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className="min-h-[44px] flex-1 resize-none"
          aria-label="Message"
        />
        <Button type="submit" disabled={streaming || !input.trim()} aria-label="Send">
          {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="flex items-start gap-2">
        <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          <p>{text}</p>
        </div>
        <UserCircle2 className="mt-1 h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
    </div>
  );
}

function AssistantBubble({ message, streaming }: { message: Extract<ChatMessage, { role: 'assistant' }>; streaming: boolean }) {
  return (
    <div className="flex max-w-[90%] flex-col gap-1">
      <div className="rounded-2xl rounded-tl-md bg-muted/40 px-4 py-3 text-sm leading-relaxed">
        {message.tools.length > 0 && (
          <ul className="mb-2 space-y-1">
            {message.tools.map((t, i) => (
              <li
                key={i}
                className="inline-flex items-center gap-1.5 rounded-md bg-background/60 px-2 py-0.5 text-xs text-muted-foreground"
              >
                <Wrench className="h-3 w-3" />
                <span className="font-mono">{t.name}</span>
                {t.ok === false && <span className="text-destructive">· failed</span>}
                {t.ok === true && <span className="text-success">· ok</span>}
                {t.ok === undefined && <Loader2 className="h-3 w-3 animate-spin" />}
              </li>
            ))}
          </ul>
        )}
        {message.reauthRequired && (
          <div className="mb-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-xs">
            <ShieldAlert className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
            Confirm it&apos;s you to see this.{' '}
            <Link href="/account/reauth" className="underline">
              Re-verify
            </Link>
          </div>
        )}
        <div className="prose prose-sm prose-slate max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text || (streaming ? '…' : '')}</ReactMarkdown>
        </div>
      </div>
      {message.citations && message.citations.length > 0 && (
        <div className="ml-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          <span>Looked at:</span>
          {message.citations.map((c) => (
            <Link key={c.slug} href={`/kb/${c.slug}`} className="underline">
              {c.title}
            </Link>
          ))}
        </div>
      )}
      {message.confidence === 'low' && (
        <div className="ml-1 text-xs text-muted-foreground">
          Not fully sure on this one —{' '}
          <Link href="/tickets/new" className="underline">
            talk to an advisor
          </Link>{' '}
          if I missed the mark.
        </div>
      )}
    </div>
  );
}
