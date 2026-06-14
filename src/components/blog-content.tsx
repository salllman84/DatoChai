import React from 'react';

interface BlogContentProps {
  content: string;
}

export function BlogContent({ content }: BlogContentProps) {
  return (
    <div 
      className="prose prose-slate dark:prose-invert max-w-none prose-img:rounded-xl prose-img:shadow-lg prose-a:text-[#0073aa] hover:prose-a:text-blue-600 prose-headings:font-bold prose-table:border-collapse prose-td:border prose-th:border prose-td:p-3 prose-th:p-3 prose-th:bg-slate-100 dark:prose-th:bg-slate-800"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}