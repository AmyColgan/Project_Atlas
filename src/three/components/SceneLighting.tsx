export function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.55} color="#cfe0ff" />
      <hemisphereLight args={["#bcd4ff", "#3a3226", 0.4]} />
      <directionalLight
        position={[18, 26, 12]}
        intensity={1.4}
        color="#fff2d6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0015}
      />
    </>
  );
}
