import { z } from 'zod'

export interface Env {
  ASSETS: Fetcher
  QUEUE: DurableObjectNamespace
  DUEL: DurableObjectNamespace
  HYPERDRIVE?: Hyperdrive
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  DAILY_SALT: string
  AUTH_MODE: 'supabase' | 'fake'
  REPO_MODE: 'postgres' | 'memory'
  APP_ORIGIN: string
  ENVIRONMENT: 'production' | 'preview' | 'dev' | 'test'
}

const MIN_SALT_LENGTH = 16

/** Fake auth and the memory repo are never allowed outside these. */
const LOCAL_ENVIRONMENTS: readonly Env['ENVIRONMENT'][] = ['dev', 'test']

const binding = <T>() =>
  z.custom<T>((value) => typeof value === 'object' && value !== null, {
    message: 'binding is missing',
  })

const secret = (min = 1) =>
  z.string({ error: 'is missing' }).min(min, { error: `needs at least ${min} characters` })

const EnvSchema = z
  .object({
    ASSETS: binding<Fetcher>(),
    QUEUE: binding<DurableObjectNamespace>(),
    DUEL: binding<DurableObjectNamespace>(),
    HYPERDRIVE: binding<Hyperdrive>().optional(),
    SUPABASE_URL: z.url({ error: 'must be a URL' }),
    SUPABASE_ANON_KEY: secret(),
    SUPABASE_SERVICE_ROLE_KEY: secret(),
    DAILY_SALT: secret(MIN_SALT_LENGTH),
    AUTH_MODE: z.enum(['supabase', 'fake']),
    REPO_MODE: z.enum(['postgres', 'memory']),
    APP_ORIGIN: z.url({ error: 'must be a URL' }),
    ENVIRONMENT: z.enum(['production', 'preview', 'dev', 'test']),
  })
  .superRefine((env, ctx) => {
    const isLocal = LOCAL_ENVIRONMENTS.includes(env.ENVIRONMENT)
    if (!isLocal && env.AUTH_MODE === 'fake') {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_MODE'],
        message: '"fake" is only allowed in dev and test',
      })
    }
    if (!isLocal && env.REPO_MODE === 'memory') {
      ctx.addIssue({
        code: 'custom',
        path: ['REPO_MODE'],
        message: '"memory" is only allowed in dev and test',
      })
    }
    if (env.REPO_MODE === 'postgres' && !env.HYPERDRIVE) {
      ctx.addIssue({
        code: 'custom',
        path: ['HYPERDRIVE'],
        message: 'binding is required for REPO_MODE "postgres"',
      })
    }
  })

/** Issues name the key and the rule only; values (secrets) never appear in the message. */
const describeIssues = (issues: readonly z.core.$ZodIssue[]): string =>
  issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ')

export function parseEnv(raw: unknown): Env {
  const result = EnvSchema.safeParse(raw)
  if (!result.success)
    throw new Error(`Invalid worker environment: ${describeIssues(result.error.issues)}`)
  return result.data
}
