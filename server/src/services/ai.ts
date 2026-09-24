import { generateText, Output } from 'ai';
import type { z } from 'zod';
import { config } from '../utils/config';

type GenerateTypedOptions<S extends z.ZodTypeAny> = {
  schema: S;
  prompt: string;
  system?: string;
  /** Optional name/description guide the model toward the right shape. */
  name?: string;
  description?: string;
  model?: string;
  abortSignal?: AbortSignal;
};

/**
 * Ask the model for a JSON object and get it back validated against `schema`.
 * The return type is inferred from the schema, so callers never touch raw text.
 * Throws NoObjectGeneratedError if the model output doesn't match.
 */
export async function generateTyped<S extends z.ZodTypeAny>(opts: GenerateTypedOptions<S>): Promise<z.infer<S>> {
  if (!config.ai.enabled) throw new Error('AI_GATEWAY_API_KEY is not set');
  const { output } = await generateText({
    model: opts.model ?? config.ai.model,
    system: opts.system,
    prompt: opts.prompt,
    abortSignal: opts.abortSignal,
    output: Output.object({ schema: opts.schema, name: opts.name, description: opts.description }),
  });
  return output as z.infer<S>;
}
