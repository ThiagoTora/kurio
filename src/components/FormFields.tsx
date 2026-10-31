import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { fieldClass } from "@/components/ui/field-class";

const FieldLabel = ({
  htmlFor,
  text,
  required,
  hide,
}: {
  htmlFor: string;
  text: string;
  required?: boolean;
  hide?: boolean;
}) => (
  <Label htmlFor={htmlFor} className={hide ? "sr-only" : undefined}>
    {text}
    {required && (
      <span aria-hidden className="text-primary">
        {" "}
        *
      </span>
    )}
  </Label>
);

const FieldError = ({ id, error }: { id: string; error?: string }) =>
  error ? (
    <p id={id} className="mt-1 text-[11px] text-destructive">
      {error}
    </p>
  ) : null;

interface BaseProps {
  name: string;
  label: string;
  id?: string;
  required?: boolean;
  error?: string;
  defaultValue?: string;
}

export function TextField(
  p: BaseProps & {
    type?: string;
    placeholder?: string;
    hideLabel?: boolean;
    autoComplete?: string;
  },
) {
  const id = p.id ?? p.name;
  const errId = `${id}-error`;

  return (
    <div>
      <FieldLabel
        htmlFor={id}
        text={p.label}
        required={p.required}
        hide={p.hideLabel}
      />
      <Input
        id={id}
        name={p.name}
        type={p.type ?? "text"}
        placeholder={p.placeholder}
        defaultValue={p.defaultValue}
        autoComplete={p.autoComplete}
        aria-required={p.required}
        aria-invalid={!!p.error}
        aria-describedby={p.error ? errId : undefined}
        className={p.hideLabel ? "md:mt-[22px]" : undefined}
      />
      <FieldError id={errId} error={p.error} />
    </div>
  );
}

// <select> nativo: melhor UX no mobile e compatível com FormData
export function SelectField(
  p: BaseProps & { placeholder: string; options: [string, string][] },
) {
  const id = p.id ?? p.name;
  const errId = `${id}-error`;

  return (
    <div>
      <FieldLabel htmlFor={id} text={p.label} required={p.required} />
      <select
        id={id}
        name={p.name}
        defaultValue={p.defaultValue ?? ""}
        aria-required={p.required}
        aria-invalid={!!p.error}
        aria-describedby={p.error ? errId : undefined}
        className={fieldClass}
      >
        <option value="" disabled>
          {p.placeholder}
        </option>
        {p.options.map(([v, l]) => (
          <option key={v} value={v} className="bg-background">
            {l}
          </option>
        ))}
      </select>
      <FieldError id={errId} error={p.error} />
    </div>
  );
}

export function EnsField(p: Pick<BaseProps, "id" | "error" | "defaultValue">) {
  const id = p.id ?? "ensName";
  const errId = `${id}-error`;

  return (
    <div>
      <FieldLabel htmlFor={id} text="Nome ENS" required />
      <div className="flex gap-2">
        <select
          name="ensSuffix"
          aria-label="Sufixo ENS"
          className={cn(fieldClass, "w-20")}
        >
          <option value=".eth">.eth</option>
        </select>
        <Input
          id={id}
          name="ensName"
          defaultValue={p.defaultValue}
          aria-required
          aria-invalid={!!p.error}
          aria-describedby={p.error ? errId : undefined}
          className="min-w-0 flex-1"
        />
      </div>
      <FieldError id={errId} error={p.error} />
    </div>
  );
}

export function PasswordField(
  p: BaseProps & { placeholder?: string; autoComplete?: string },
) {
  const id = p.id ?? p.name;
  const errId = `${id}-error`;
  const labelId = useId();
  const [show, setShow] = useState(false);

  return (
    <div>
      <FieldLabel htmlFor={id} text={p.label} required={p.required} />
      <div className="relative">
        <Input
          id={id}
          name={p.name}
          type={show ? "text" : "password"}
          placeholder={p.placeholder}
          autoComplete={p.autoComplete}
          aria-required={p.required}
          aria-invalid={!!p.error}
          aria-describedby={p.error ? errId : undefined}
          className="pr-9"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-controls={id}
          aria-labelledby={labelId}
          className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          <span id={labelId} className="sr-only">
            {show ? "Ocultar senha" : "Mostrar senha"}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {!show && <path d="M3 3l18 18" />}
          </svg>
        </Button>
      </div>
      <FieldError id={errId} error={p.error} />
    </div>
  );
}
