import * as THREE from 'three'

export interface DrawRendererOptions {
  radiusRatio?: number
  isMobile?: boolean
}

export class DrawRenderer {
  camera: THREE.OrthographicCamera
  renderTargetA: THREE.WebGLRenderTarget
  renderTargetB: THREE.WebGLRenderTarget
  material: THREE.ShaderMaterial
  scene: THREE.Scene
  options: DrawRendererOptions

  constructor(size = 256, options: DrawRendererOptions = {}) {
    this.options = options
    this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1, 1)
    this.camera.position.z = 1

    const rtOpts: THREE.RenderTargetOptions = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      colorSpace: THREE.LinearSRGBColorSpace,
      depthBuffer: false,
      stencilBuffer: false,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearMipmapLinearFilter,
      generateMipmaps: true
    }

    this.renderTargetA = new THREE.WebGLRenderTarget(size, size, rtOpts)
    this.renderTargetB = new THREE.WebGLRenderTarget(size, size, rtOpts)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uRadius: { value: new THREE.Vector3(-8, 0.9, 150) },
        uPosition: { value: new THREE.Vector2(0, 0) },
        uDirection: { value: new THREE.Vector4(0, 0, 0, 0) },
        uResolution: { value: new THREE.Vector3(0, 0, 0) },
        uTexture: { value: null },
        uSizeDamping: { value: 0.8 },
        uFadeDamping: { value: 0.98 },
        uDraw: { value: 0 }
      },
      vertexShader: `
        precision highp float; 
        varying vec2 vUv; 
        void main(){ 
          vUv = uv; 
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
        }
      `,
      fragmentShader: `
        precision highp float; 
        uniform float uDraw; 
        uniform vec3 uRadius; 
        uniform vec3 uResolution; 
        uniform vec2 uPosition; 
        uniform vec4 uDirection; 
        uniform float uSizeDamping; 
        uniform float uFadeDamping; 
        uniform sampler2D uTexture; 
        varying vec2 vUv; 
        
        void main(){ 
          float aspect = uResolution.x / uResolution.y; 
          vec2 pos = uPosition; 
          pos.y /= aspect; 
          vec2 uv = vUv; 
          uv.y /= aspect; 
          float dist = distance(pos, uv) / (uRadius.z / uResolution.x); 
          dist = smoothstep(uRadius.x, uRadius.y, dist); 
          vec3 dir = uDirection.xyz * uDirection.w; 
          vec2 offset = vec2((-dir.x) * (1.0 - dist), (dir.y) * (1.0 - dist)); 
          vec4 color = texture(uTexture, vUv + (offset * 0.01)); 
          color *= uFadeDamping; 
          color.r += offset.x; 
          color.g += offset.y; 
          color.rg = clamp(color.rg, -1.0, 1.0); 
          color.b += uDraw * (1.0 - dist); 
          gl_FragColor = vec4(color.rgb, 1.0); 
        }
      `,
      depthTest: false,
      transparent: true
    })

    this.scene = new THREE.Scene()
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material))
  }

  updateRadius(px = 0) { 
    this.material.uniforms.uRadius.value.z = px 
  }
  
  updateDraw(v = 0) { 
    (this.material.uniforms.uDraw.value as number) = v 
  }
  
  updatePosition(p: { x: number, y: number }, normalized = false) {
    let x = p.x, y = p.y
    if (normalized) { 
      x = 0.5 * p.x + 0.5
      y = 0.5 * p.y + 0.5 
    }
    this.material.uniforms.uPosition.value.set(x, y)
  }
  
  updateDirection(d: { x: number, y: number }) { 
    this.material.uniforms.uDirection.value.set(d.x, d.y, 0, 100) 
  }
  
  resize(w: number, h: number) {
    const ratio = h / (this.options.radiusRatio ?? 1000)
    // Reduced mobile radius to match web interaction size better
    const radius = (this.options.isMobile ? 240 : 240) * ratio
    this.updateRadius(radius)
    this.material.uniforms.uResolution.value.set(w, h, 1)
  }
  
  getTexture() { 
    return this.renderTargetB.texture 
  }
  
  render(renderer: THREE.WebGLRenderer) {
    this.material.uniforms.uTexture.value = this.renderTargetB.texture
    const prev = renderer.getRenderTarget()
    renderer.setRenderTarget(this.renderTargetA)
    if (renderer.autoClear) renderer.clear()
    renderer.render(this.scene, this.camera)
    renderer.setRenderTarget(prev)
    const tmp = this.renderTargetA
    this.renderTargetA = this.renderTargetB
    this.renderTargetB = tmp
  }

  dispose() {
    this.renderTargetA.dispose()
    this.renderTargetB.dispose()
    this.material.dispose()
  }
}
