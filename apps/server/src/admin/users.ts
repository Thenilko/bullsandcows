import { levelFromXp } from '@bc/game-core'
import type { AdminUsersPageDto } from '@bc/protocol'
import type { Repo } from '../ports/repo'

export const ADMIN_USERS_PAGE = 25

/** One page of every profile, most recently active first, with the total for the pager. */
export async function adminUsers(repo: Repo, offset: number): Promise<AdminUsersPageDto> {
  const [rows, counts] = await Promise.all([
    repo.admin.users({ limit: ADMIN_USERS_PAGE, offset }),
    repo.admin.userCount(),
  ])
  return {
    users: rows.map(({ xp, ...u }) => ({ ...u, level: levelFromXp(xp) })),
    total: counts,
    offset,
    pageSize: ADMIN_USERS_PAGE,
  }
}
