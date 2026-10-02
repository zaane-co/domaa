import GradientWaves from "@/components/GradientWaves";

// WebGL ocean-wave backdrop, pinned to the viewport behind both layouts. Not
// pointer-events-none, so the shader's mouse parallax still responds wherever
// the content leaves the background exposed.
export function HeroBackground() {
  return (
    <div className="fixed inset-0 -z-10" aria-hidden>
      <GradientWaves
        horizonColor="#001cc9"
        waveColor="#ffffff"
        crestColor="#FFFFFF"
        speed={0.4}
        amplitude={2.5}
        waveScale={0.6}
        waveRatio={0.9}
        swell={35}
        turbulence={20}
        tilt={1.11}
        zoom={1.0}
        height={5.5}
        fogDepth={15}
        detail="medium"
        brightness={1.0}
        opacity={1.0}
        mouseInteraction={true}
        parallaxStrength={0.5}
        grain={true}
        grainIntensity={0.05}
      />
    </div>
  );
}
