import { DEFAULT_BOT_CONFIG, type BotConfig } from '@bc/game-core'
import { BotConfigDto, type AdminBotConfigDto } from '@bc/protocol'
import type { SettingsRepo } from '../ports/repo'

const KEY = 'bot'

const sameConfig = (a: BotConfig, b: BotConfig): boolean =>
  a.proSample === b.proSample &&
  a.raceThinkMs.every((v, i) => v === b.raceThinkMs[i]) &&
  a.lostHint.every((v, i) => v === b.lostHint[i])

/**
 * The bot tuning new bot rooms use: what the admin saved, or the built-in values when nothing is
 * saved. A stored value that no longer validates (bounds changed since) is ignored with a log line.
 */
export async function loadBotConfig(settings: SettingsRepo): Promise<BotConfig> {
  const stored = await settings.get(KEY)
  if (stored === null) return DEFAULT_BOT_CONFIG
  const parsed = BotConfigDto.safeParse(stored)
  if (parsed.success) return parsed.data
  console.error('app_settings.bot is invalid; using the defaults')
  return DEFAULT_BOT_CONFIG
}

const view = (config: BotConfig): AdminBotConfigDto => ({
  config,
  defaults: DEFAULT_BOT_CONFIG,
  isDefault: sameConfig(config, DEFAULT_BOT_CONFIG),
})

/** `GET /api/admin/bot`. */
export async function adminBotConfig(settings: SettingsRepo): Promise<AdminBotConfigDto> {
  return view(await loadBotConfig(settings))
}

/** `PUT /api/admin/bot`: `config` is already validated. Only new bot rooms pick it up. */
export async function saveBotConfig(
  settings: SettingsRepo,
  config: BotConfigDto,
): Promise<AdminBotConfigDto> {
  await settings.put(KEY, config)
  return view(config)
}

/** `DELETE /api/admin/bot`: back to the built-in values. */
export async function resetBotConfig(settings: SettingsRepo): Promise<AdminBotConfigDto> {
  await settings.remove(KEY)
  return view(DEFAULT_BOT_CONFIG)
}
