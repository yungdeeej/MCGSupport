import { z, ZodType, ZodTypeAny } from 'zod';

/**
 * Minimal Zod → JSON Schema converter for the subset of types we use in tool
 * input schemas. We avoid pulling in a full library to keep deps lean and to
 * have full control over the output shape Anthropic's tool_use expects.
 */
export function zodToJsonSchema(schema: ZodType<unknown>): Record<string, unknown> {
  return convert(schema as ZodTypeAny);
}

function convert(schema: ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return convert(schema._def.innerType);
  }
  if (schema instanceof z.ZodDefault) {
    return convert(schema._def.innerType);
  }
  if (schema instanceof z.ZodString) {
    const out: Record<string, unknown> = { type: 'string' };
    for (const check of schema._def.checks ?? []) {
      if (check.kind === 'min') out.minLength = check.value;
      if (check.kind === 'max') out.maxLength = check.value;
      if (check.kind === 'email') out.format = 'email';
      if (check.kind === 'url') out.format = 'uri';
    }
    return out;
  }
  if (schema instanceof z.ZodNumber) {
    return { type: 'number' };
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }
  if (schema instanceof z.ZodEnum) {
    return { type: 'string', enum: schema._def.values };
  }
  if (schema instanceof z.ZodLiteral) {
    return { const: schema._def.value };
  }
  if (schema instanceof z.ZodArray) {
    return { type: 'array', items: convert(schema._def.type) };
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema._def.shape();
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [k, v] of Object.entries(shape) as Array<[string, ZodTypeAny]>) {
      properties[k] = convert(v);
      if (!(v instanceof z.ZodOptional) && !(v instanceof z.ZodDefault)) required.push(k);
    }
    return {
      type: 'object',
      properties,
      ...(required.length ? { required } : {}),
      additionalProperties: false,
    };
  }
  if (schema instanceof z.ZodUnion) {
    return { anyOf: schema._def.options.map((o: ZodTypeAny) => convert(o)) };
  }
  return {};
}
