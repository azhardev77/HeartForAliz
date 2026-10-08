export const heartVertexShader = `
    uniform float uTime;
    uniform float uSize;
    attribute float random;
    attribute float random1;
    attribute float aScale;
    attribute float aSpeed;
    attribute vec3 aColor;
    varying vec3 vColor;
    varying vec2 vUv;

    void main() {
      vColor = aColor;
      vUv = uv;

      float t = aSpeed + uTime;
      float x = 16.0 * pow(sin(t), 3.0);
      float y = 13.0 * cos(t) - 5.0 * cos(2.0 * t) - 2.0 * cos(3.0 * t) - cos(4.0 * t);
      float z = (random - 0.5) * 4.0;
      
      vec3 pos = vec3(x, y, z) * 0.12; 
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      mvPosition.xy += position.xy * aScale * uSize;
      
      gl_Position = projectionMatrix * mvPosition;
    }
`;

export const heartFragmentShader = `
    varying vec3 vColor;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      float d = distance(uv, vec2(0.5, 0.5));
      if(d > 0.5) discard;
      
      float strength = 0.05 / d;
      
      float rayX = max(0.0, 1.0 - abs(uv.x - 0.5) * 20.0);
      float rayY = max(0.0, 1.0 - abs(uv.y - 0.5) * 20.0);
      strength += (rayX * rayY) * 2.0;

      gl_FragColor = vec4(strength * vColor, 1.0);
    }
`;

export const particleVertexShader = `
    uniform float uTime;
    uniform float uSize;
    attribute float phi;
    attribute float random;
    attribute float random1;
    attribute float aScale;
    attribute vec3 aColor;
    varying vec3 vColor;
    varying vec2 vUv;

    void main() {
      vColor = aColor;
      vUv = uv;

      float x = phi + sin(uTime * random * 2.0 + random1 * 10.0) * 1.5;
      float y = (fract(random + uTime * 0.05) - 0.5) * 15.0; 
      float z = (random1 - 0.5) * 15.0;
      
      vec3 pos = vec3(x, y, z);
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      mvPosition.xy += position.xy * aScale * uSize;
      gl_Position = projectionMatrix * mvPosition;
    }
`;

export const particleFragmentShader = `
    varying vec3 vColor;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      float d = distance(uv, vec2(0.5, 0.5));
      if(d > 0.5) discard;
      float strength = 0.05 / d;
      gl_FragColor = vec4(strength * vColor, 1.0);
    }
`;
