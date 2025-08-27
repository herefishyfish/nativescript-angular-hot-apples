/**
 * AppScene - Apple Event Logo Animation for NativeScript
 *
 * Mobile-adapted version of the interactive heat map effect using Three.js shaders.
 * The animation combines:
 * - A video texture showing thermal-like patterns
 * - An Apple logo mask to shape the effect
 * - Touch tracking for heat generation
 * - Custom fragment shader for color gradient mapping
 * - Smooth interpolation and animation timing
 */

import * as THREE from "three";
import { DrawRenderer } from "../renderer/DrawRenderer";
import { AppRenderer } from "../renderer/AppRenderer";
import { ApplicationSettings } from "@nativescript/core";
import "@nativescript/canvas-media";

export class AppScene extends THREE.Scene {
  // Core Three.js components
  rendererWrapper: AppRenderer; // Wrapper for WebGL renderer
  camera: THREE.OrthographicCamera; // 2D orthographic camera for UI-style rendering
  drawRenderer!: DrawRenderer; // Custom renderer for touch trail effects
  heat!: THREE.Mesh; // Main mesh with heat map shader material

  video!: HTMLVideoElement; // HTML5 video element for background texture
  videoTexture!: THREE.VideoTexture; // Three.js video texture wrapper
  maskTexture!: THREE.Texture; // Apple logo mask texture

  // State flags
  textureReady = false; // True when all textures are loaded
  videoReady = false; // True when video is ready to play
  debugMode = false; // Debug mode to show raw textures

  // Animation values with smooth interpolation
  blendVideo = { value: 0, target: 1 }; // Video opacity blend factor
  amount = { value: 0, target: 1 }; // Overall effect intensity
  touch = {
    position: new THREE.Vector3(0, 0, 0),
    target: new THREE.Vector3(0, 0, 0),
  }; // Touch position tracking
  move = { value: 1, target: 1 }; // Movement-based opacity modifier

  // Interaction state
  hold = false; // True when touch is active
  heatUp = 0; // Heat accumulation from touch interaction
  animationTime = 0; // Animation time counter

  // Color palette - Apple's thermal gradient colors (black to red/orange spectrum)
  private readonly paletteHex = [
    "000000",
    "073dff",
    "53d5fd",
    "fefcdd",
    "ffec6a",
    "f9d400",
    "a61904",
  ];

  // Animation parameters - will be loaded from controls
  parameters = {
    // Visual parameters
    effectIntensity: 1.0, // Overall effect intensity multiplier
    contrastPower: 0.8, // Shader power/contrast adjustment
    colorSaturation: 1.3, // Color saturation boost
    heatSensitivity: 0.5, // Touch interaction heat sensitivity
    videoBlendAmount: 1.0, // Video texture blend factor
    gradientShift: 0.0, // Gradient color shift

    // Behavioral parameters
    heatDecay: 0.95, // How quickly heat cools down
    interactionRadius: 1.0, // Size of interaction area
    reactivity: 1.2, // How reactive the effect is to movement
  };

  /**
   * Convert hex color string to RGB values normalized to 0-1 range
   */
  private hexToRGB(hex: string) {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3)
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return [r, g, b];
  }

  constructor(rendererWrapper: AppRenderer) {
    super();
    this.rendererWrapper = rendererWrapper;

    // Set up orthographic camera for 2D-style rendering
    this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1, 1);
    this.camera.position.z = 1;
  }

  // Utility functions for smooth animation interpolation
  lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
  }
  lerpSpeed(base: number, dt: number) {
    let n = base * dt * 60;
    return n > 1 ? 1 : n < 0 ? 0 : n;
  }

  /**
   * Load controls from saved settings
   */
  private loadControlsFromSettings() {
    try {
      const saved = ApplicationSettings.getString('thermalControls');
      if (saved) {
        const controls = JSON.parse(saved);
        // Update parameters with saved values
        this.parameters.effectIntensity = controls.effectIntensity || this.parameters.effectIntensity;
        this.parameters.colorSaturation = controls.colorSaturation || this.parameters.colorSaturation;
        this.parameters.heatSensitivity = controls.heatSensitivity || this.parameters.heatSensitivity;
        this.parameters.heatDecay = controls.heatDecay || this.parameters.heatDecay;
        this.parameters.interactionRadius = controls.interactionRadius || this.parameters.interactionRadius;
        this.parameters.gradientShift = controls.gradientShift || this.parameters.gradientShift;
      }
    } catch (error) {
      console.log('Could not load controls:', error);
    }
  }

  /**
   * Initialize the scene - Load assets, create materials, set up interactions
   */
  async init() {
    console.log("Initializing AppScene...");

    try {
      // Load controls from saved settings
      this.loadControlsFromSettings();

      // Set black background for the WebGL canvas
      this.rendererWrapper.renderer.setClearColor(0x000000);

      // Initialize the draw renderer for touch trail effects
      // Using higher radiusRatio and mobile-optimized settings for tighter control
      this.drawRenderer = new DrawRenderer(256, {
        radiusRatio: 1000, // Higher ratio = smaller interaction radius
        isMobile: false,
      });

      // Load textures
      await this.loadAssets(
        this.rendererWrapper.width,
        this.rendererWrapper.height
      );

      // Create the main heat map mesh with shader material
      this.addHeat();

      // Set up camera projection for current viewport size
      this.onResize(this.rendererWrapper.width, this.rendererWrapper.height);

      // Start the animation immediately with higher initial values
      this.amount.value = 0.3; // Start more visible
      this.amount.target = 1; // Full effect intensity
      this.blendVideo.value = 0.5; // Start more visible
      this.blendVideo.target = 1; // Show video texture
      this.textureReady = true;

    } catch (error) {
      console.error("Error initializing AppScene:", error);
    }
  }

  /**
   * Load textures for mobile environment
   */
  async loadAssets(width: number, height: number) {
    // Load the Apple logo mask texture from assets
    this.maskTexture = new THREE.TextureLoader().load(
      __ANDROID__ ? "~/assets/logo_1756270548_img_1.png" : "~/assets/logo__dcojfwkzna2q.png"
    );
    // Create video element using NativeScript canvas-media

    // Create and configure the background video element
    this.video = document.createElement("video");
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.autoplay = true;
    this.video.controls = false;
    this.video.loop = true;
    this.video.width = width;
    this.video.height = height;
    this.video.src = "~/assets/largetall_2x.mp4";

    this.onVideoReady();
  }

  /**
   * Called when video is loaded and ready to play
   * Creates the video texture and starts the animation
   */
  onVideoReady() {
    if (this.videoReady) return;

    // Create Three.js video texture from HTML video element
    this.videoTexture = new THREE.VideoTexture(this.video);
    
    // this.videoTexture.minFilter = THREE.LinearFilter;
    // this.videoTexture.magFilter = THREE.LinearFilter;
    // this.videoTexture.format = THREE.RGBFormat;

    // Set animation targets to start the effect
    this.amount.target = 1; // Full effect intensity
    this.blendVideo.value = 1; // Show video texture
    this.videoReady = true;
    this.textureReady = true;

    // Update UI state and start video playback
    this.video.play();//.catch(() => {});
    // this.mediaButtonState(); // Set initial button text
  }

  /**
   * Create the main heat map mesh with custom shader material
   */
  addHeat() {
    // Convert hex colors to RGB values for shader uniforms
    const c1 = this.hexToRGB(this.paletteHex[0]); // Black
    const c2 = this.hexToRGB(this.paletteHex[1]); // Deep blue
    const c3 = this.hexToRGB(this.paletteHex[2]); // Cyan
    const c4 = this.hexToRGB(this.paletteHex[3]); // Light yellow
    const c5 = this.hexToRGB(this.paletteHex[4]); // Yellow
    const c6 = this.hexToRGB(this.paletteHex[5]); // Orange
    const c7 = this.hexToRGB(this.paletteHex[6]); // Red

    // Shader uniforms
    const uniforms: any = {
      blendVideo: { value: 0 },
      drawMap: { value: this.drawRenderer.getTexture() },
      textureMap: { value: this.videoTexture },
      maskMap: { value: this.maskTexture },
      scale: { value: [1, 1] },
      offset: { value: [0, 0] },
      opacity: { value: 1 },
      amount: { value: 0 },
      // Thermal gradient colors
      color1: { value: c1 },
      color2: { value: c2 },
      color3: { value: c3 },
      color4: { value: c4 },
      color5: { value: c5 },
      color6: { value: c6 },
      color7: { value: c7 },
      // Gradient blend points and fade ranges
      blend: { value: [0.4, 0.7, 0.81, 0.91] },
      fade: { value: [1, 1, 0.72, 0.52] },
      maxBlend: { value: [0.8, 0.87, 0.5, 0.27] },
      power: { value: 0.8 },
      rnd: { value: 0 },
      heat: { value: [0, 0, 0, 1.02] },
      stretch: { value: [1, 1, 0, 0] },
      // Controllable parameters
      effectIntensity: { value: 1.0 },
      colorSaturation: { value: 1.3 },
      gradientShift: { value: 0.0 },
      interactionSize: { value: 1.0 },
    };

    // Vertex shader
    const vertexShader = `
      varying vec2 vUv;
      varying vec4 vClipPosition;
      
      void main(){
        vUv = uv;
        vClipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = vClipPosition;
      }
    `;

    // Fragment shader - adapted for mobile performance
    const fragmentShader = this.debugMode
      ? `
      precision mediump float;
      
      // Input textures
      uniform sampler2D drawMap;
      uniform sampler2D textureMap;
      uniform sampler2D maskMap;
      
      // Animation parameters
      uniform float amount;
      uniform vec2 scale;
      uniform vec2 offset;
      
      varying vec2 vUv;
      varying vec4 vClipPosition;
      
      void main(){
        // Convert clip space to UV coordinates for draw texture sampling
        vec2 duv = vClipPosition.xy / vClipPosition.w;
        duv = 0.5 + duv * 0.5;
        
        // Apply scaling to UV coordinates for mask texture
        vec2 uv = vUv;
        uv -= 0.5;
        uv /= scale;
        uv += 0.5;
        uv += offset;
        
        // Sample all textures
        vec4 mask = texture2D(maskMap, uv);
        // Flip X coordinate for video texture to fix horizontal mirroring
        vec2 flippedUv = vec2(1.0 - uv.x, uv.y);
        vec4 video = texture2D(textureMap, flippedUv);
        vec4 draw = texture2D(drawMap, duv);
        
        // Debug visualization - show different textures in different areas
        vec3 final = vec3(0.0);
        
        if (vUv.x < 0.33) {
          // Left third: Show mask texture (green channel as white)
          final = vec3(mask.g);
        } else if (vUv.x < 0.66) {
          // Middle third: Show video texture
          final = video.rgb;
        } else {
          // Right third: Show draw texture (heat interaction)
          final = draw.rgb;
        }
        
        // Add grid lines for reference
        float grid = 0.0;
        if (abs(vUv.x - 0.33) < 0.01 || abs(vUv.x - 0.66) < 0.01) grid = 1.0;
        if (abs(vUv.y - 0.5) < 0.01) grid = 1.0;
        final = mix(final, vec3(1.0, 1.0, 0.0), grid);
        
        // Show UV coordinates in corners for reference
        if (vUv.x < 0.1 && vUv.y < 0.1) final = vec3(1.0, 0.0, 0.0); // Red corner
        if (vUv.x > 0.9 && vUv.y < 0.1) final = vec3(0.0, 1.0, 0.0); // Green corner
        if (vUv.x < 0.1 && vUv.y > 0.9) final = vec3(0.0, 0.0, 1.0); // Blue corner
        if (vUv.x > 0.9 && vUv.y > 0.9) final = vec3(1.0, 1.0, 1.0); // White corner
        
        gl_FragColor = vec4(final, 1.0);
      }
    `
      : `
      precision mediump float;
      
      // Input textures
      uniform sampler2D drawMap;
      uniform sampler2D textureMap;
      uniform sampler2D maskMap;
      
      // Animation parameters
      uniform float blendVideo;
      uniform float amount;
      uniform float opacity;
      uniform vec2 scale;
      uniform vec2 offset;
      
      // Color palette
      uniform vec3 color1, color2, color3, color4, color5, color6, color7;
      uniform vec4 blend, fade, maxBlend;
      uniform float power, rnd;
      uniform vec4 heat, stretch;
      
      // Controllable parameters
      uniform float effectIntensity;
      uniform float colorSaturation;
      uniform float gradientShift;
      uniform float interactionSize;
      
      varying vec2 vUv;
      varying vec4 vClipPosition;
      
      // Convert RGB to luminance for saturation adjustment
      vec3 linearRgbToLuminance(vec3 c){
        float f = dot(c, vec3(0.2126729, 0.7151522, 0.0721750));
        return vec3(f);
      }
      
      // Adjust color saturation
      vec3 saturation(vec3 c, float s){
        return mix(linearRgbToLuminance(c), c, s);
      }
      
      // Create thermal color gradient based on temperature value
      vec3 gradient(float t){
        t = clamp(t + gradientShift, 0.0, 1.0);
        
        float p1 = blend.x, p2 = blend.y, p3 = blend.z, p4 = blend.w;
        float p5 = maxBlend.x, p6 = maxBlend.y;
        float f1 = fade.x, f2 = fade.y, f3 = fade.z, f4 = fade.w;
        float f5 = maxBlend.z, f6 = maxBlend.w;
        
        // Smooth transitions between color stops
        float b1 = smoothstep(p1 - f1*0.5, p1 + f1*0.5, t);
        float b2 = smoothstep(p2 - f2*0.5, p2 + f2*0.5, t);
        float b3 = smoothstep(p3 - f3*0.5, p3 + f3*0.5, t);
        float b4 = smoothstep(p4 - f4*0.5, p4 + f4*0.5, t);
        float b5 = smoothstep(p5 - f5*0.5, p5 + f5*0.5, t);
        float b6 = smoothstep(p6 - f6*0.5, p6 + f6*0.5, t);
        
        // Blend colors based on temperature
        vec3 col = color1;
        col = mix(col, color2, b1);
        col = mix(col, color3, b2);
        col = mix(col, color4, b3);
        col = mix(col, color5, b4);
        col = mix(col, color6, b5);
        col = mix(col, color7, b6);
        
        return col;
      }
      
      void main(){
        // Convert clip space to UV coordinates for draw texture sampling
        vec2 duv = vClipPosition.xy / vClipPosition.w;
        duv = 0.5 + duv * 0.5;
        
        // Apply scaling to UV coordinates for mask texture
        vec2 uv = vUv;
        uv -= 0.5;
        uv /= scale;
        uv += 0.5;
        uv += offset;
        
        // Calculate opacity and amount factors
        float o = clamp(opacity, 0.0, 1.0);
        float a = clamp(amount, 0.0, 1.0);
        float v = o * a;
        
        // Sample the Apple logo mask (green channel) - remove duplicate offset
        vec4 tex = texture2D(maskMap, uv);
        float mask = tex.g;
        
        // Debug: show raw mask values and force some visibility
        if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
          // We're inside the texture bounds - show something
          mask = max(mask, 0.3);  // Force visibility inside texture bounds
        } else {
          // Outside texture bounds
          mask = 0.1;
        }
        
        // Sample touch interaction data
        vec3 draw = texture2D(drawMap, duv).rgb;
        float heatDraw = draw.b;
        heatDraw *= mix(0.1, 1.0, mask);
        heatDraw *= interactionSize;
        
        // Debug: add base heat for visibility testing
        heatDraw = max(heatDraw, 0.2 * a);  // Always show some heat when active
        
        // Sample background video with slight distortion from heat
        vec2 off = draw.rg * 0.01;
        // Flip X coordinate for video texture to fix horizontal mirroring
        vec2 flippedVideoUv = vec2(1.0 - (uv.x + off.x), uv.y + off.y);
        vec3 video = texture2D(textureMap, flippedVideoUv).rgb;
        
        // Enhance heat effect based on video content
        float h = mix(pow(1.0 - video.r, 1.5), 1.0, 0.2) * 1.25;
        heatDraw *= h;
        
        // Create base temperature map from video
        float map = video.r;
        map = pow(map, power);
        
        // Apply vertical gradient mask
        float msk = smoothstep(0.2, 0.5, uv.y);
        map = mix(map * 0.91, map, msk);
        map = mix(0.0, map, v);
        
        // Apply circular fade from center
        float fade = distance(vUv, vec2(0.5, 0.52));
        fade = smoothstep(0.5, 0.62, 1.0 - fade);
        
        // Generate final color using gradient function
        vec3 final = gradient(map + heatDraw);
        final = saturation(final, colorSaturation);
        final *= fade;
        final = mix(vec3(0.0), final, a * effectIntensity);
        
        // Debug: ensure some visibility
        final = max(final, vec3(0.05 * a));  // Always show some glow when active
        
        gl_FragColor = vec4(final, 1.0);
      }
    `;

    console.log(`Using ${this.debugMode ? "DEBUG" : "NORMAL"} shader mode`);

    // Create shader material
    const heatMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      transparent: true,
    });

    // Create mesh and add to scene
    this.heat = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), heatMaterial);
    this.add(this.heat);
  }

  onResize(width: number, height: number) {
    const r = width / height;
    let a, s;
    if (r >= 1) {
      s = 1;
      a = 1 * r;
    } else {
      a = 1;
      s = 1 / r;
    }
    this.camera.left = -a / 2;
    this.camera.right = a / 2;
    this.camera.top = s / 2;
    this.camera.bottom = -s / 2;
    this.camera.near = -1;
    this.camera.far = 1;
    this.camera.updateProjectionMatrix();

    console.log(`Resized to ${width}x${height}, aspect ratio: ${r.toFixed(2)}`);
  }

  /**
   * Toggle debug mode and recreate the shader
   */
  toggleDebugMode() {
    this.debugMode = !this.debugMode;
    console.log(`Debug mode: ${this.debugMode ? "ON" : "OFF"}`);

    // Recreate the heat mesh with the new shader
    if (this.heat) {
      this.remove(this.heat);
      this.heat.geometry.dispose();
      if (this.heat.material instanceof THREE.Material) {
        this.heat.material.dispose();
      }
    }
    this.addHeat();
  }

  /**
   * Update touch position from canvas component
   */
  updateTouchPosition(x: number, y: number, isActive: boolean) {
    // x, y are in 0-1 range from canvas component

    // Convert to normalized coordinates (-1 to 1) for Three.js world space
    const normalizedX = (x - 0.5) * 2;
    const normalizedY = -(y - 0.5) * 2; // Flip Y for WebGL

    this.touch.target.set(normalizedX, normalizedY, 0);
    this.hold = isActive;

    // For draw renderer, pass the 0-1 coordinates directly (not normalized)
    // Y should be flipped to match WebGL texture coordinates
    const drawX = x;
    const drawY = 1.0 - y; // Flip Y to match WebGL texture coordinates

    // Update draw renderer with UV-space coordinates (normalized=false means 0-1 range)
    this.drawRenderer.updatePosition({ x: drawX, y: drawY }, false);
  }

  /**
   * Main animation loop - called every frame
   */
  update(dt: number) {
    if (!this.textureReady) return;

    // Update animation time
    this.animationTime += dt;

    if (this.videoReady) {
      // Loop video between specific time points for seamless playback
      if (this.video.currentTime >= 11.95) this.video.currentTime = 2.95;
    }

    // Smooth touch position interpolation
    this.touch.position.lerp(this.touch.target, this.lerpSpeed(0.8, dt));

    // Update movement-based animation targets
    this.move.target = this.hold ? 0.95 : 1.0;

    // Smooth interpolation of animation values
    this.move.value = this.lerp(
      this.move.value,
      this.move.target,
      this.lerpSpeed(0.01, dt)
    );

    // Fade in effect intensity on startup - make this faster and more visible
    if (this.amount.value < this.amount.target) {
      this.amount.value = this.lerp(
        this.amount.value,
        this.amount.target,
        0.05
      ); // Faster lerp
    }

    // Update draw renderer with current touch position
    this.drawRenderer.updatePosition(this.touch.position, true);

    // Accumulate heat when touch is active
    if (this.hold) {
      this.heatUp += this.parameters.heatSensitivity * dt * 60;
      if (this.heatUp > 1.3) this.heatUp = 1.3; // Cap maximum heat
    }

    // Update draw renderer with current heat level
    this.drawRenderer.updateDraw(this.heatUp);

    // Smooth video blend interpolation
    this.blendVideo.value = this.lerp(
      this.blendVideo.value,
      this.blendVideo.target,
      this.lerpSpeed(0.1, dt)
    );

    // Update shader uniforms
    if (this.heat) {
      const u = (this.heat.material as THREE.ShaderMaterial).uniforms as any;
      u.rnd.value = Math.random();
      u.opacity.value = this.move.value;
      u.power.value = this.parameters.contrastPower;
      u.amount.value = this.amount.value;
			u.blendVideo.value = this.parameters.videoBlendAmount;
			if (this.videoTexture) u.textureMap.value = this.videoTexture;

      // Update controllable parameters
      u.effectIntensity.value = this.parameters.effectIntensity;
      u.colorSaturation.value = this.parameters.colorSaturation;
      u.gradientShift.value = this.parameters.gradientShift;
      u.interactionSize.value = this.parameters.interactionRadius;
    }

    // Cool down heat over time
    this.heatUp *= this.parameters.heatDecay;
    if (this.heatUp < 0.001) this.heatUp = 0;

    // Reset interaction state for next frame
    this.drawRenderer.updateDirection({ x: 0, y: 0 });
    this.hold = false;
  }

  /**
   * Update a parameter value
   */
  setParameter(name: keyof typeof this.parameters, value: number) {
    this.parameters[name] = value;
  }

  /**
   * Reset all parameters to their default values
   */
  resetParameters() {
    this.parameters = {
      effectIntensity: 1.0,
      contrastPower: 0.8,
      colorSaturation: 1.3,
      heatSensitivity: 0.8,
      videoBlendAmount: 1.0,
      gradientShift: 0.0,
      heatDecay: 0.92,
      interactionRadius: 1.5,
      reactivity: 1.2,
    };
  }

  dispose() {
    if (this.drawRenderer) {
      this.drawRenderer.dispose();
    }
    if (this.videoTexture) {
      this.videoTexture.dispose();
    }
    if (this.maskTexture) {
      this.maskTexture.dispose();
    }
  }
}
