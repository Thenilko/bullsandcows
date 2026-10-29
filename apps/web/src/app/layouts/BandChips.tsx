const ROW = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } as const

/** PasMobile `isBand`: the screen's name and a short note as chips over the scene (phones only). */
export function BandChips({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={ROW} data-testid="band">
      <span className="ps-hud" style={{ fontSize: 15 }}>
        {title}
      </span>
      <span className="ps-hud">{sub}</span>
    </div>
  )
}

/** Desk.dc.html `caption`: one chip over the wide scene on the desktop screens that are not a game. */
export function SceneCaption({ text }: { text: string }) {
  return (
    <span className="ps-hud" style={{ fontSize: 15 }} data-testid="scene-caption">
      {text}
    </span>
  )
}
