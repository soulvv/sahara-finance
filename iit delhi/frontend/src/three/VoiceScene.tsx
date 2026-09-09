import { SafeCanvas } from "./SafeCanvas";
import { VoiceCore } from "./VoiceCore";

/**
 * The OmniDimension voice scene. Loaded lazily (React.lazy) so that
 * three.js stays out of the initial bundle and only downloads when the
 * voice sheet is first opened.
 */
export default function VoiceScene() {
  return (
    <SafeCanvas camera={{ position: [0, 0, 3], fov: 45 }}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[2, 2, 2]} intensity={2} />
      <VoiceCore />
    </SafeCanvas>
  );
}
