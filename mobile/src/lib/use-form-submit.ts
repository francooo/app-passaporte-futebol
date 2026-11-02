import { useState } from "react";
import type { z } from "zod";
import { fieldErrors, type FieldErrors } from "@shared/schemas";
import { ApiRequestError } from "./api";

/**
 * Valida com o mesmo schema zod do servidor (shared/schemas.ts) e chama a ação.
 * Erros por campo vindos da API aparecem junto aos campos, como no web.
 */
export function useFormSubmit<S extends z.ZodType>(schema: S, action: (data: z.output<S>) => Promise<string | void>) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(values: z.input<S>) {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setMessage(null);
      return;
    }
    setErrors({});
    setMessage(null);
    setPending(true);
    try {
      const result = await action(parsed.data);
      if (result) setMessage({ text: result, ok: true });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setErrors(error.body.fields ?? {});
        setMessage({ text: error.body.message, ok: false });
      } else {
        setMessage({ text: "Algo deu errado. Tente de novo.", ok: false });
      }
    } finally {
      setPending(false);
    }
  }

  return { errors, message, pending, submit, error: (field: string) => errors[field]?.[0] };
}
