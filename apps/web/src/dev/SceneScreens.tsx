import { PastureScene, type PastureSceneProps } from '../components/scene'
import { Confetti } from '../components/ui'
import { IDLE_SCENE, PLAY_SCENE, RESULT_SCENE } from './sceneStates'

const FRAME_STYLE = { position: 'relative', overflow: 'hidden', background: '#A9D6F0', aspectRatio: '390 / 380', width: '100%', maxWidth: 520 } as const

function Framed({ scene, confetti = false }: { scene: PastureSceneProps; confetti?: boolean }) {
  return (
    <div style={FRAME_STYLE}>
      <PastureScene {...scene} />
      <Confetti active={confetti} />
    </div>
  )
}

export const SceneIdle = () => <Framed scene={IDLE_SCENE} />
export const ScenePlay = () => <Framed scene={PLAY_SCENE} />
export const SceneResult = () => <Framed scene={RESULT_SCENE} confetti />
