/**
 * Main Renderer class with Canvas 2D primary and WebGL fallback
 * Provides unified rendering interface for the game
 */

import { CanvasRenderer } from './CanvasRenderer'
import { WebGLRenderer } from './WebGLRenderer'

export type RendererType = 'canvas2d' | 'webgl' | 'fallback'

export interface RenderingCapabilities {
  hasWebGL: boolean
  hasCanvas2D: boolean
  maxTextureSize: number
  supportsBlending: boolean
  supportsFilters: boolean
}

export class Renderer {
  private canvas: HTMLCanvasElement
  private canvasRenderer: CanvasRenderer
  private webglRenderer: WebGLRenderer | null = null
  private currentRenderer: CanvasRenderer | WebGLRenderer
  private capabilities: RenderingCapabilities
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.canvasRenderer = new CanvasRenderer(canvas)
    this.capabilities = this.detectCapabilities()
    
    // Try to create WebGL renderer if supported
    if (this.capabilities.hasWebGL) {
      try {
        this.webglRenderer = new WebGLRenderer(canvas)
      } catch (error) {
        console.warn('WebGL renderer creation failed, falling back to Canvas 2D:', error)
        this.webglRenderer = null
      }
    }
    
    // Use Canvas 2D as primary renderer (more reliable for educational games)
    this.currentRenderer = this.canvasRenderer
  }
  
  /**
   * Initialize the renderer
   */
  async initialize(): Promise<void> {
    try {
      await this.canvasRenderer.initialize()
      
      if (this.webglRenderer) {
        try {
          await this.webglRenderer.initialize()
        } catch (error) {
          console.warn('WebGL renderer initialization failed, using Canvas 2D only:', error)
          this.webglRenderer = null
        }
      }
      
      console.log(`Renderer initialized: ${this.getRendererType()}`)
      console.log('Capabilities:', this.capabilities)
      
    } catch (error) {
      console.error('Renderer initialization failed:', error)
      throw error
    }
  }
  
  /**
   * Switch to WebGL renderer if available (for enhanced effects)
   */
  enableWebGL(): boolean {
    if (this.webglRenderer && this.capabilities.hasWebGL) {
      this.currentRenderer = this.webglRenderer
      console.log('Switched to WebGL renderer')
      return true
    }
    return false
  }
  
  /**
   * Switch back to Canvas 2D renderer
   */
  enableCanvas2D(): void {
    this.currentRenderer = this.canvasRenderer
    console.log('Switched to Canvas 2D renderer')
  }
  
  /**
   * Clear the canvas
   */
  clear(): void {
    this.currentRenderer.clear()
  }
  
  /**
   * Get the rendering context (Canvas 2D context)
   */
  getContext(): CanvasRenderingContext2D {
    return this.canvasRenderer.getContext()
  }
  
  /**
   * Get WebGL context if available
   */
  getWebGLContext(): WebGLRenderingContext | null {
    return this.webglRenderer?.getContext() || null
  }
  
  /**
   * Get current renderer type
   */
  getRendererType(): RendererType {
    if (this.currentRenderer === this.webglRenderer) {
      return 'webgl'
    } else if (this.currentRenderer === this.canvasRenderer) {
      return 'canvas2d'
    }
    return 'fallback'
  }
  
  /**
   * Get rendering capabilities
   */
  getCapabilities(): RenderingCapabilities {
    return { ...this.capabilities }
  }
  
  /**
   * Handle canvas resize
   */
  onResize(width: number, height: number): void {
    this.canvasRenderer.onResize(width, height)
    if (this.webglRenderer) {
      this.webglRenderer.onResize(width, height)
    }
  }
  
  /**
   * Shutdown the renderer
   */
  shutdown(): void {
    this.canvasRenderer.shutdown()
    if (this.webglRenderer) {
      this.webglRenderer.shutdown()
    }
  }
  
  /**
   * Detect rendering capabilities
   */
  private detectCapabilities(): RenderingCapabilities {
    const capabilities: RenderingCapabilities = {
      hasWebGL: false,
      hasCanvas2D: false,
      maxTextureSize: 0,
      supportsBlending: false,
      supportsFilters: false,
    }
    
    // Test Canvas 2D support
    try {
      const testCanvas = document.createElement('canvas')
      const ctx2d = testCanvas.getContext('2d')
      capabilities.hasCanvas2D = !!ctx2d
      capabilities.supportsBlending = !!ctx2d?.globalCompositeOperation
      capabilities.supportsFilters = 'filter' in (ctx2d || {})
    } catch (error) {
      console.warn('Canvas 2D detection failed:', error)
    }
    
    // Test WebGL support
    try {
      const testCanvas = document.createElement('canvas')
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')
      if (gl) {
        const webglContext = gl as WebGLRenderingContext
        capabilities.hasWebGL = true
        try {
          capabilities.maxTextureSize = webglContext.getParameter(webglContext.MAX_TEXTURE_SIZE) || 2048
        } catch (error) {
          console.warn('WebGL parameter detection failed:', error)
          capabilities.maxTextureSize = 2048 // Safe default
        }
      }
    } catch (error) {
      console.warn('WebGL detection failed:', error)
    }
    
    return capabilities
  }
}