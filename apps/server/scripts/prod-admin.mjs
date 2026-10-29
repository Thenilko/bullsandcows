// Production admin tasks, run by the operator from a laptop (never by the Worker):
//
//   node apps/server/scripts/prod-admin.mjs grant <email>                 gives <email> the admin role
//   node apps/server/scripts/prod-admin.mjs prune <email> [--apply]       keeps only <email>, then grant
//
// Without --apply `prune` only counts what it would delete. With --apply it first writes a data-only pg_dump of
// the public schema to local/backups/, then deletes every other profile (games, badges, farms… go with it by
// cascade) and every other Supabase auth user. Credentials come from git-ignored files, as for the deploy scripts:
// DATABASE_URL (local/deploy/database.url), SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (apps/server/.dev.vars);
// variables of the same names in the environment win (that is how it is tried against a local database).
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const ADMIN_ROLE = 'admin'
const PAGE_SIZE = 1000

const fail = (message) => {
  console.error(`✘ ${message}`)
  process.exit(1)
}

function devVar(name) {
  if (process.env[name]) return process.env[name]
  const text = readFileSync(join(ROOT, 'apps/server/.dev.vars'), 'utf8')
  const line = text.split('\n').find((l) => l.startsWith(`${name}=`))
  return line?.slice(name.length + 1).replace(/^"|"$/g, '').trim() || fail(`${name} липсва в apps/server/.dev.vars`)
}

function config() {
  const databaseUrl = process.env.DATABASE_URL || readFileSync(join(ROOT, 'local/deploy/database.url'), 'utf8').trim()
  if (!databaseUrl) fail('local/deploy/database.url е празен (виж scripts/deploy/02-migrate.sh)')
  const cfg = { databaseUrl, supabaseUrl: devVar('SUPABASE_URL'), serviceKey: devVar('SUPABASE_SERVICE_ROLE_KEY') }
  const dbHost = new URL(databaseUrl).hostname
  const authHost = new URL(cfg.supabaseUrl).hostname
  // A local database with the production Auth project (or the reverse) would delete the wrong users.
  if (isLocal(dbHost) !== isLocal(authHost)) fail(`базата (${dbHost}) и Supabase (${authHost}) са от различни среди`)
  console.log(`База: ${dbHost} · Supabase: ${authHost}`)
  return cfg
}

const isLocal = (host) => ['127.0.0.1', 'localhost', '::1', 'host.docker.internal'].includes(host)

/** Supabase Auth admin API with the service role key. */
function authAdmin({ supabaseUrl, serviceKey }) {
  const call = async (path, init = {}) => {
    const res = await fetch(new URL(`/auth/v1/admin/${path}`, supabaseUrl), {
      ...init,
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok && res.status !== 404) throw new Error(`Supabase ${init.method ?? 'GET'} ${path}: HTTP ${res.status}`)
    return res.status === 204 || res.status === 404 ? null : res.json()
  }
  return {
    async listUsers() {
      const users = []
      // Until an empty page: the server may cap per_page below PAGE_SIZE.
      for (let page = 1; ; page += 1) {
        const batch = (await call(`users?page=${page}&per_page=${PAGE_SIZE}`))?.users ?? []
        if (batch.length === 0) return users
        users.push(...batch)
      }
    },
    deleteUser: (id) => call(`users/${id}`, { method: 'DELETE' }),
    setAppMetadata: (id, appMetadata) =>
      call(`users/${id}`, { method: 'PUT', body: JSON.stringify({ app_metadata: appMetadata }) }),
  }
}

function findOne(users, email) {
  const wanted = email.trim().toLowerCase()
  const matches = users.filter((u) => (u.email ?? '').toLowerCase() === wanted)
  if (matches.length !== 1) fail(`очаквах точно един auth потребител с имейл ${email}, намерих ${matches.length}`)
  return matches[0]
}

async function grant(auth, user) {
  if (user.app_metadata?.role === ADMIN_ROLE) return console.log(`✓ ${user.email} вече е admin`)
  await auth.setAppMetadata(user.id, { ...user.app_metadata, role: ADMIN_ROLE })
  console.log(`✓ ${user.email} е admin (app_metadata.role). Излез и влез отново, за да вземеш нов токен.`)
}

async function counts(sql, keepId) {
  const [row] = await sql`
    select
      (select count(*) from profiles where id <> ${keepId})::int as profiles,
      (select count(*) from profiles where id <> ${keepId} and is_guest)::int as guests,
      (select count(*) from games where user_id <> ${keepId})::int as games,
      (select count(*) from duels where player_a is distinct from ${keepId}
                                   and player_b is distinct from ${keepId})::int as duels,
      (select count(*) from farms where owner_id <> ${keepId})::int as farms,
      (select count(*) from weekly_results where user_id <> ${keepId})::int as weekly_results,
      (select count(*) from profiles where id = ${keepId})::int as kept`
  return row
}

const majorOf = (text) => Number(/(\d+)\.\d+/.exec(text)?.[1] ?? 0)

function localPgDumpMajor() {
  try {
    return majorOf(execFileSync('pg_dump', ['--version'], { encoding: 'utf8' }))
  } catch {
    return 0
  }
}

/** pg_dump refuses a newer server: then the dump runs in the matching `postgres:<major>` image. */
function backup(databaseUrl, serverMajor) {
  const dir = join(ROOT, 'local/backups')
  mkdirSync(dir, { recursive: true })
  const name = `prod-public-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`
  // Data only, the app's tables only: the schema is in drizzle/*.sql.
  const args = ['--data-only', '--schema=public', '--no-owner']
  const stdio = ['ignore', 'inherit', 'inherit']
  // The password goes in PGPASSWORD, not on the command line (where `ps` shows it).
  const url = new URL(databaseUrl)
  const password = decodeURIComponent(url.password)
  url.password = ''
  const env = { ...process.env, PGPASSWORD: password }
  if (localPgDumpMajor() >= serverMajor) {
    execFileSync('pg_dump', [...args, '--file', join(dir, name), url.toString()], { stdio, env })
  } else {
    if (isLocal(url.hostname)) url.hostname = 'host.docker.internal'
    execFileSync(
      'docker',
      ['run', '--rm', '-e', 'PGPASSWORD', '-v', `${dir}:/out`, `postgres:${serverMajor}-alpine`, 'pg_dump', ...args, '--file', `/out/${name}`, url.toString()],
      { stdio, env },
    )
  }
  const file = join(dir, name)
  chmodSync(file, 0o600) // names and e-mails of every player
  if (statSync(file).size === 0) fail(`backup-ът е празен: ${file}`)
  return file
}

async function prune(cfg, auth, keep, { apply, allowNoProfile }) {
  const sql = postgres(cfg.databaseUrl, { max: 1, onnotice: () => undefined })
  try {
    const users = await auth.listUsers()
    const others = users.filter((u) => u.id !== keep.id)
    const before = await counts(sql, keep.id)
    console.log(`Запазва: ${keep.email} (${keep.id}), профил в базата: ${before.kept === 1 ? 'да' : 'НЕ'}`)
    console.log('Ще изтрие:')
    console.log(`  - ${others.length} auth потребители в Supabase`)
    console.log(`  - ${before.profiles} профила (от тях ${before.guests} гости) и всичко тяхно:`)
    console.log(`    ${before.games} игри, ${before.duels} дуела без теб, ${before.farms} чужди ферми, ${before.weekly_results} седмични резултата`)
    console.log('  Числата на деня и седмиците остават; дуелите ти срещу изтрити играчи остават с „изтрит играч“.')
    // A typo that matches another real account would otherwise wipe everyone else.
    if (before.kept !== 1 && !allowNoProfile) fail(`${keep.email} няма профил в базата; спирам (--allow-no-profile, ако е нарочно)`)
    if (!apply) return console.log('\nНищо не е изтрито. За изпълнение: добави --apply')

    const [{ version }] = await sql`select current_setting('server_version') as version`
    const file = backup(cfg.databaseUrl, majorOf(version))
    console.log(`✓ backup: ${file}`)
    await sql.begin(async (tx) => {
      await tx`delete from duels where player_a is distinct from ${keep.id} and player_b is distinct from ${keep.id}`
      await tx`delete from profiles where id <> ${keep.id}`
    })
    console.log('✓ базата е зачистена')

    // Re-listed after the database step: someone who signed up meanwhile goes too.
    const remaining = (await auth.listUsers()).filter((u) => u.id !== keep.id)
    let failed = 0
    for (const user of remaining) {
      await auth.deleteUser(user.id).catch((err) => {
        failed += 1
        console.error(`  ${user.id}: ${err.message}`)
      })
    }
    console.log(`✓ изтрити auth потребители: ${remaining.length - failed}${failed ? `, неуспешни: ${failed} (пусни пак)` : ''}`)

    const after = await counts(sql, keep.id)
    console.log(`Остават: профили ${after.kept + after.profiles}, игри на други ${after.games}`)
  } finally {
    await sql.end()
  }
  await grant(auth, keep).catch((err) => fail(`ролята не е дадена (${err.message}); пусни: prod-admin.mjs grant ${keep.email}`))
}

async function main() {
  const [command, email, ...flags] = process.argv.slice(2)
  if (!['grant', 'prune'].includes(command) || !email?.includes('@')) {
    fail('употреба: prod-admin.mjs grant <email> | prune <email> [--apply] [--allow-no-profile]')
  }
  const cfg = config()
  const auth = authAdmin(cfg)
  const keep = findOne(await auth.listUsers(), email)
  if (command === 'grant') return grant(auth, keep)
  return prune(cfg, auth, keep, { apply: flags.includes('--apply'), allowNoProfile: flags.includes('--allow-no-profile') })
}

await main().catch((err) => fail(err instanceof Error ? err.message : String(err)))
