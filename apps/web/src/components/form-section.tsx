import type { ReactNode } from "react";

interface FormSectionProps {
  children: ReactNode;
  description?: string;
  title: string;
}

export function FormSection({
  children,
  description,
  title,
}: FormSectionProps) {
  return (
    <section className="grid gap-5">
      <div>
        <h2 className="font-semibold text-xl">{title}</h2>
        {description ? (
          <p className="mt-2 text-muted text-sm leading-6">{description}</p>
        ) : null}
      </div>

      {children}
    </section>
  );
}
