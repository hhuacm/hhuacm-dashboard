import { ExternalLink } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  emptyText: string;
  markdown: string;
}

const isHttpUrl = (href: string | undefined) =>
  href?.startsWith("http://") || href?.startsWith("https://");

const markdownComponents: Components = {
  a: ({ children, href }) => {
    const isExternal = isHttpUrl(href);

    return (
      <a
        className="inline-flex max-w-full items-center gap-1 break-all font-medium text-accent underline-offset-4 hover:underline focus-visible:underline"
        href={href}
        rel={isExternal ? "noopener noreferrer" : undefined}
        target={isExternal ? "_blank" : undefined}
      >
        <span>{children}</span>
        {isExternal ? <ExternalLink className="size-3.5 shrink-0" /> : null}
      </a>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-border border-l-2 pl-3 text-muted">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-default px-1.5 py-0.5 font-mono text-[0.875em] text-foreground">
      {children}
    </code>
  ),
  h1: ({ children }) => (
    <h1 className="font-semibold text-base text-foreground leading-7">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-semibold text-foreground text-sm leading-6">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-medium text-foreground text-sm leading-6">
      {children}
    </h3>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  ol: ({ children }) => (
    <ol className="grid list-decimal gap-1 pl-5 text-foreground">{children}</ol>
  ),
  p: ({ children }) => <p className="text-foreground">{children}</p>,
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-md border border-border bg-surface-secondary p-3 font-mono text-sm leading-6">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="min-w-full border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border">{children}</tbody>
  ),
  td: ({ children, style }) => (
    <td
      className="border-border border-r px-3 py-2 last:border-r-0"
      style={style}
    >
      {children}
    </td>
  ),
  th: ({ children, style }) => (
    <th
      className="border-border border-r bg-surface-secondary px-3 py-2 font-semibold text-foreground last:border-r-0"
      style={style}
    >
      {children}
    </th>
  ),
  thead: ({ children }) => (
    <thead className="border-border border-b">{children}</thead>
  ),
  ul: ({ children }) => (
    <ul className="grid list-disc gap-1 pl-5 text-foreground">{children}</ul>
  ),
};

export function MarkdownContent({ emptyText, markdown }: MarkdownContentProps) {
  const content = markdown.trim();

  if (!content) {
    return <p className="text-muted text-sm">{emptyText}</p>;
  }

  return (
    <div className="wrap-break-word grid gap-3 text-sm leading-6">
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
