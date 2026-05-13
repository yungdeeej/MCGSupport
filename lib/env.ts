import { z } from 'zod';

/**
 * Strict env validation. The app refuses to start if any required key is
 * missing or malformed in production. We tolerate missing values in dev so
 * that contributors can run the front-end without every secret wired up.
 */
const isProd = process.env.NODE_ENV === 'production';

const required = (name: string) =>
  isProd
    ? z.string().min(1, `${name} required in production`)
    : z.string().min(1).optional().default('');

const url = (name: string, fallback?: string) =>
  isProd
    ? z.string().url(`${name} must be a valid URL`)
    : z
        .string()
        .url()
        .optional()
        .default(fallback ?? '');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: url('APP_URL', 'http://localhost:3000'),

  DATABASE_URL: required('DATABASE_URL'),

  CAMPUSLOGIN_API_KEY: required('CAMPUSLOGIN_API_KEY'),
  CAMPUSLOGIN_BASE_URL: url('CAMPUSLOGIN_BASE_URL', 'https://connectorapi.campuslogin.com'),
  CAMPUSLOGIN_ORG_ID: z.coerce.number().int().positive().default(900),
  CAMPUSLOGIN_STUDENT_MAILLIST_ID: z.coerce.number().int().positive().optional(),

  MOODLE_BASE_URL: url('MOODLE_BASE_URL', 'https://mcgcollege.lingellearning.ca'),
  MOODLE_API_TOKEN: required('MOODLE_API_TOKEN'),

  ANTHROPIC_API_KEY: required('ANTHROPIC_API_KEY'),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-5'),

  OPENAI_API_KEY: required('OPENAI_API_KEY'),
  OPENAI_EMBED_MODEL: z.string().default('text-embedding-3-small'),

  RESEND_API_KEY: required('RESEND_API_KEY'),
  RESEND_FROM_EMAIL: z.string().default('MCG Support <no-reply@support.mcgcollege.com>'),

  SENTRY_DSN: z.string().optional().default(''),

  SESSION_SECRET: isProd
    ? z.string().min(32, 'SESSION_SECRET must be at least 32 chars')
    : z.string().min(16).optional().default('dev-session-secret-do-not-use-in-prod-please'),
  ENCRYPTION_KEY: isProd
    ? z.string().min(32)
    : z.string().min(16).optional().default('dev-encryption-key-do-not-use-in-prod'),

  SUPPORT_HELPDESK_EMAIL: z.string().email().default('dj.gupta@mcgcollege.com'),
  DEV_LOG_MAGIC_LINKS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof schema>;

function parseEnv(): Env {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`\n❌ Invalid environment configuration:\n${issues}\n`);
    if (isProd) process.exit(1);
    // Fail soft in dev — return parsed defaults so the dev server still boots.
    return schema.parse({ ...process.env });
  }
  return result.data;
}

export const env: Env = parseEnv();
