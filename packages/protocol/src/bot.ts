import { z } from 'zod'

/** Bounds the admin can set the bot to; wider values would make it absurd, not harder. */
export const BOT_CONFIG_LIMITS = {
  thinkMs: { min: 1000, max: 120_000 },
  lostHint: { min: 0, max: 1 },
  proSample: { min: 1, max: 50 },
} as const

const thinkMs = z
  .number()
  .int()
  .min(BOT_CONFIG_LIMITS.thinkMs.min)
  .max(BOT_CONFIG_LIMITS.thinkMs.max)
const chance = z.number().min(BOT_CONFIG_LIMITS.lostHint.min).max(BOT_CONFIG_LIMITS.lostHint.max)

/**
 * The duel bot's tuning (`game-core` `BotConfig`): the race think base per level 1–4 (ms, before the
 * jitter), the lost-hint chance per move for levels 1–3 and how many candidates the expert weighs.
 */
export const BotConfigDto = z
  .object({
    raceThinkMs: z.tuple([thinkMs, thinkMs, thinkMs, thinkMs]).readonly(),
    lostHint: z.tuple([chance, chance, chance]).readonly(),
    proSample: z
      .number()
      .int()
      .min(BOT_CONFIG_LIMITS.proSample.min)
      .max(BOT_CONFIG_LIMITS.proSample.max),
  })
  .strict()
export type BotConfigDto = z.infer<typeof BotConfigDto>

/** `GET/PUT/DELETE /api/admin/bot`: what new bot rooms use, and the built-in values. */
export const AdminBotConfigDto = z.object({
  config: BotConfigDto,
  defaults: BotConfigDto,
  /** True while nothing is saved (or what is saved equals the defaults). */
  isDefault: z.boolean(),
})
export type AdminBotConfigDto = z.infer<typeof AdminBotConfigDto>
