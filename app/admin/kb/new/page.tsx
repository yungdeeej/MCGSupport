import { KbEditor } from '@/components/admin/KbEditor';

export default function NewArticle() {
  return (
    <div className="container-page max-w-4xl py-8">
      <h1 className="text-2xl font-semibold tracking-tightish">New article</h1>
      <div className="mt-6">
        <KbEditor article={null} />
      </div>
    </div>
  );
}
