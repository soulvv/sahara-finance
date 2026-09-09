// Simple noise and deformation shader for the Voice Core
export const voiceVertexShader = `
uniform float uTime;
uniform float uAmplitude;
uniform int uState; // 0=idle, 1=listening, 2=processing/thinking, 3=speaking, 4=success, 5=error

varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vPosition;

// Classic 3D noise (Simplex)
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 1.0/7.0;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

void main() {
  vNormal = normal;
  vUv = uv;
  
  vec3 pos = position;
  float noiseFreq = 2.0;
  float noiseAmp = 0.1;
  vec3 noisePos = vec3(pos.x * noiseFreq + uTime, pos.y * noiseFreq + uTime, pos.z * noiseFreq);
  
  if (uState == 1 || uState == 3) {
    // Listening / Speaking -> audio reactive
    noiseAmp = 0.1 + (uAmplitude * 0.4);
    noiseFreq = 3.0;
    pos += normal * snoise(noisePos) * noiseAmp;
  } else if (uState == 2) {
    // Processing / Thinking -> pulse
    float pulse = sin(uTime * 5.0) * 0.05 + 0.05;
    pos += normal * pulse;
  } else if (uState == 4) {
    // Success -> calm, settled breathing (the sphere "stabilizes")
    pos += normal * snoise(noisePos * 0.5) * 0.03;
  } else if (uState == 5) {
    // Error -> nearly still, subdued
    pos += normal * snoise(noisePos * 0.4) * 0.015;
  } else {
    // Idle -> slow breathe
    pos += normal * snoise(noisePos * 0.5) * 0.05;
  }
  
  vPosition = pos;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const voiceFragmentShader = `
uniform vec3 uColorMain;
uniform vec3 uColorGlow;
uniform vec3 uColorSuccess;
uniform vec3 uColorError;
uniform float uTime;
uniform int uState; // 0=idle, 1=listening, 2=processing/thinking, 3=speaking, 4=success, 5=error
uniform float uAmplitude;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);

  vec3 color = uColorMain;
  if (uState == 1 || uState == 3) {
    // Boost glow based on amplitude
    color = mix(uColorMain, uColorGlow, intensity + (uAmplitude * 0.5));
  } else if (uState == 2) {
    // Processing ring
    float ring = fract(vPosition.y * 5.0 - uTime * 2.0);
    if (ring > 0.8) color = uColorGlow;
  } else if (uState == 4) {
    // Success — soft, stabilized confirmation glow
    float breathe = 0.5 + 0.2 * sin(uTime * 1.5);
    color = mix(uColorSuccess, uColorGlow, breathe * 0.25);
  } else if (uState == 5) {
    // Error — calm attention, no alarm
    color = mix(uColorMain, uColorError, 0.5 + intensity * 0.3);
  } else {
    color = mix(uColorMain, uColorGlow, intensity * 0.5);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;
