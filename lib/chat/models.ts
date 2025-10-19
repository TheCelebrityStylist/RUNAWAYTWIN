const DEFAULT_MODEL_SEQUENCE = ["gpt-4.1", "gpt-4o", "gpt-4.1-mini", "gpt-4o-mini", "gpt-4.1-nano"];

function parseModelList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[|,\s]+/)
    .map((model) => model.trim())
    .filter(Boolean);
}

function dedupe(models: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const model of models) {
    const lower = model.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    output.push(model);
  }
  return output;
}

export function resolveModelCandidates(): string[] {
  const envPrimary = process.env.OPENAI_MODEL;
  const envSecondary = parseModelList(process.env.OPENAI_MODEL_FALLBACKS);
  const legacySecondary = parseModelList(process.env.OPENAI_SECONDARY_MODELS);
  const override = parseModelList(process.env.OPENAI_MODEL_CHAIN);

  const models = dedupe([
    envPrimary?.trim() ?? "",
    ...override,
    ...envSecondary,
    ...legacySecondary,
    ...DEFAULT_MODEL_SEQUENCE,
  ].filter(Boolean));

  return models.length ? models : DEFAULT_MODEL_SEQUENCE;
}

export function formatModelNotice(model: string | null | undefined): string {
  if (!model) return "Switching couture brain…";
  return `Switching to ${model} for a sharper atelier take…`;
}

export function describePrimaryModel(): string {
  const [first] = resolveModelCandidates();
  return first || "gpt-4o";
}

export { DEFAULT_MODEL_SEQUENCE };
