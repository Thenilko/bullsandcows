declare module 'glicko2' {
  export interface Glicko2Player {
    getRating(): number
    getRd(): number
    getVol(): number
  }
  export interface Glicko2Settings {
    tau?: number
    rating?: number
    rd?: number
    vol?: number
  }
  export class Glicko2 {
    constructor(settings?: Glicko2Settings)
    makePlayer(rating?: number, rd?: number, vol?: number): Glicko2Player
    updateRatings(matches: [Glicko2Player, Glicko2Player, number][]): void
  }
}
