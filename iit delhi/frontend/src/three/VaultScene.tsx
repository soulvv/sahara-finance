import { SafeCanvas } from "./SafeCanvas";
import { SecureVault } from "./SecureVault";

/**
 * The payment-confirmation vault scene. Loaded lazily (React.lazy) so that
 * three.js stays out of the initial bundle.
 */
export default function VaultScene({ open }: { open: boolean }) {
  return (
    <SafeCanvas camera={{ position: [0, 0, 3], fov: 45 }}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[2, 2, 2]} intensity={2} />
      <SecureVault isOpen={open} />
    </SafeCanvas>
  );
}
