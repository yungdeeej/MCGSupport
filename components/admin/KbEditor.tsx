'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { KbArticle } from '@/lib/db/schema';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

const CATEGORIES = ['moodle', 'schedule', 'payments', 'account', 'academic', 'international', 'campus', 'other'];

export function KbEditor({ article }: { article: KbArticle | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(article?.title ?? '');
  const [slug, setSlug] = useState(article?.slug ?? '');
  const [summary, setSummary] = useState(article?.summary ?? '');
  const [category, setCategory] = useState(article?.category ?? 'other');
  const [visibility, setVisibility] = useState(article?.visibility ?? 'authenticated');
  const [contentMd, setContentMd] = useState<string>(article?.contentMd ?? '');
  const [published, setPublished] = useState(article?.published ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(article ? `/api/admin/kb/${article.id}` : '/api/admin/kb', {
        method: article ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, slug, summary, category, visibility, contentMd, published }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setError(j?.error ?? 'Save failed');
        return;
      }
      const j = await res.json();
      router.push(`/admin/kb/${j.id ?? article?.id}/edit`);
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="visibility">Visibility</Label>
          <select id="visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as 'public' | 'authenticated')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
            <option value="public">Public</option>
            <option value="authenticated">Authenticated only</option>
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="summary">Summary</Label>
          <Input id="summary" value={summary ?? ''} onChange={(e) => setSummary(e.target.value)} placeholder="One-sentence summary for previews & SEO" />
        </div>
      </div>
      <div data-color-mode="light">
        <Label>Content</Label>
        <MDEditor value={contentMd} onChange={(v) => setContentMd(v ?? '')} height={460} preview="live" />
      </div>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4" />
          Published
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={save} disabled={loading || !title || !slug}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
        </Button>
      </div>
    </div>
  );
}
