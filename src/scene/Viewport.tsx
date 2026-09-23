import { Canvas } from '@react-three/fiber'
import { ContactShadows, Grid, OrbitControls } from '@react-three/drei'
import { useDesignStore } from '../store/useDesignStore'
import { Carcass } from './Carcass'
import { PartMesh } from './PartMesh'

function Scene() {
  const cabinet = useDesignStore((s) => s.cabinet)
  const orbitEnabled = useDesignStore((s) => s.orbitEnabled)
  const select = useDesignStore((s) => s.select)

  return (
    <>
      <color attach="background" args={['#eef1f5']} />
      <hemisphereLight args={['#ffffff', '#b9c4d0', 1.1]} />
      <directionalLight
        position={[3, 5, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Clicking empty floor clears the selection. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]}
        receiveShadow
        onPointerDown={() => select(null)}
      >
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#e6eaf0" />
      </mesh>

      <Grid
        args={[20, 20]}
        cellSize={0.1}
        cellColor="#cdd5e0"
        sectionSize={1}
        sectionColor="#9fb0c4"
        fadeDistance={22}
        infiniteGrid
      />
      <ContactShadows position={[0, 0.002, 0]} opacity={0.35} scale={12} blur={2.4} far={4} />

      <Carcass />
      {cabinet.parts.map((part) => (
        <PartMesh key={part.id} part={part} cabinet={cabinet} />
      ))}

      <OrbitControls
        enabled={orbitEnabled}
        target={[0, 1, 0]}
        maxPolarAngle={Math.PI / 2 - 0.02}
        minDistance={0.8}
        maxDistance={15}
        makeDefault
      />
    </>
  )
}

export function Viewport() {
  return (
    <div className="viewport">
      <Canvas shadows camera={{ position: [2.6, 2.2, 3.4], fov: 45 }} dpr={[1, 2]}>
        <Scene />
      </Canvas>
    </div>
  )
}
