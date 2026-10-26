import type { FarmDto, FarmMemberDto, NudgeDto } from '@bc/protocol'

const member = (over: Partial<FarmMemberDto> & Pick<FarmMemberDto, 'userId' | 'username'>): FarmMemberDto => ({
  level: 12,
  rankKey: 'shepherd',
  avatarSpecies: 'cow',
  role: 'member',
  you: false,
  joinedAt: 0,
  today: null,
  weekPoints: 0,
  nudged: false,
  ...over,
})

/** „Фермата на Петрови“ of the PasExtras artboards (Р4 / ПД4): five members, three played today. */
export const farmFixture: FarmDto = {
  id: 'farm-1',
  name: 'Фермата на Петрови',
  code: 'K7Q2M',
  role: 'member',
  maxMembers: 12,
  dailyNumber: 127,
  members: [
    member({ userId: 'tati', username: 'Тати', role: 'owner', level: 27, rankKey: 'steward', avatarSpecies: 'bull', joinedAt: 1, today: { attempts: 4, secs: 72, won: true }, weekPoints: 2140 }),
    member({ userId: 'mira', username: 'Мира', you: true, level: 21, rankKey: 'pastor', joinedAt: 2, today: { attempts: 5, secs: 96, won: true }, weekPoints: 1980 }),
    member({ userId: 'mama', username: 'Мама', level: 14, rankKey: 'shepherd', joinedAt: 3, today: { attempts: 6, secs: 161, won: true }, weekPoints: 1720 }),
    member({ userId: 'bobi', username: 'Боби', level: 6, rankKey: 'herdsman', avatarSpecies: 'bull', joinedAt: 4, weekPoints: 640 }),
    member({ userId: 'ani', username: 'Баба Ани', level: 13, rankKey: 'shepherd', joinedAt: 5, nudged: true, weekPoints: 410 }),
  ],
}

/** П5 / ПД7: Мира is the owner there. */
export const farmOwnerFixture: FarmDto = {
  ...farmFixture,
  role: 'owner',
  // The founder joined first.
  members: [...farmFixture.members]
    .sort((a, b) => Number(b.you) - Number(a.you))
    .map((m) => ({ ...m, role: m.userId === 'mira' ? 'owner' : 'member' })),
}

/** П3 / ПД6: just created, only the owner. */
export const farmCreatedFixture: FarmDto = { ...farmOwnerFixture, members: farmOwnerFixture.members.filter((m) => m.you) }

/** П4 / ПД8: Тати nudged, three of five played. */
export const nudgeFixture: NudgeDto = {
  fromUserId: 'tati',
  fromUsername: 'Тати',
  fromRankKey: 'steward',
  fromSpecies: 'bull',
  played: 3,
  members: 5,
}
