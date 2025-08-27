import * as THREE from 'three'

export class AppRenderer {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene | null = null
  camera: THREE.Camera | null = null
  onUpdate: ((dt: number) => void) | null = null
  width: number
  height: number

  constructor(context: any, width: number, height: number) {
    this.width = width
    this.height = height
    
    this.renderer = new THREE.WebGLRenderer({
      context: context,
      alpha: false,
      antialias: false,
      logarithmicDepthBuffer: false,
      powerPreference: "default"
    })
    
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.setSize(width, height, false)
    this.renderer.setClearColor(0x000000, 1)
    
    this.startRenderLoop()
  }

  setScene(scene: THREE.Scene) { 
    this.scene = scene 
  }
  
  setCamera(camera: THREE.Camera) { 
    this.camera = camera 
  }

  handleResize(width: number, height: number) {
    this.width = width
    this.height = height
    this.renderer.setSize(width, height, false)
    
    const anyScene = this.scene as any
    if (anyScene?.onResize) {
      anyScene.onResize(width, height)
    }
  }

  private startRenderLoop() {
    let lastTime = 0
    
    const loop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000 // Convert to seconds
      lastTime = currentTime

      try {
        // Update scene logic
        this.onUpdate?.(Math.min(deltaTime, 1/30)) // Cap delta to 30fps minimum

        if (!this.scene || !this.camera) {
          requestAnimationFrame(loop)
          return
        }

        // Handle custom draw renderer if present
        const anyScene = this.scene as any
        if (anyScene.drawRenderer) {
          anyScene.drawRenderer.resize(this.width, this.height)
          anyScene.drawRenderer.render(this.renderer)
        }

        // Render the main scene
        this.renderer.autoClear = true
        this.renderer.render(this.scene, this.camera)
      } catch (error) {
        console.error("Render loop error:", error)
      }

      requestAnimationFrame(loop)
    }

    requestAnimationFrame(loop)
  }

  dispose() {
    if (this.renderer) {
      this.renderer.dispose()
    }
  }
}
