/**
 * WebGL Renderer - Enhanced renderer for visual effects when hardware acceleration is available
 * Falls back gracefully to Canvas 2D if WebGL is not supported
 */

export class WebGLRenderer {
  private canvas: HTMLCanvasElement
  private gl: WebGLRenderingContext
  private width: number = 0
  private height: number = 0
  private isInitialized: boolean = false
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    
    // Try to get WebGL context
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      throw new Error('WebGL not supported')
    }
    
    this.gl = gl as WebGLRenderingContext
  }
  
  /**
   * Initialize the WebGL renderer
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    this.width = this.canvas.width
    this.height = this.canvas.height
    
    // Set up WebGL viewport
    this.gl.viewport(0, 0, this.width, this.height)
    
    // Enable blending for transparency
    this.gl.enable(this.gl.BLEND)
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
    
    // Set clear color to match Canvas 2D background
    this.gl.clearColor(0.53, 0.81, 0.92, 1.0) // Sky blue
    
    this.isInitialized = true
    console.log('WebGL renderer initialized')
  }
  
  /**
   * Clear the WebGL canvas
   */
  clear(): void {
    if (!this.isInitialized) return
    
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
  }
  
  /**
   * Get the WebGL rendering context
   */
  getContext(): WebGLRenderingContext {
    return this.gl
  }
  
  /**
   * Handle canvas resize
   */
  onResize(width: number, height: number): void {
    this.width = width
    this.height = height
    
    if (this.isInitialized) {
      this.gl.viewport(0, 0, width, height)
    }
  }
  
  /**
   * Create and compile a shader
   */
  createShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type)
    if (!shader) return null
    
    this.gl.shaderSource(shader, source)
    this.gl.compileShader(shader)
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader))
      this.gl.deleteShader(shader)
      return null
    }
    
    return shader
  }
  
  /**
   * Create a shader program
   */
  createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    const program = this.gl.createProgram()
    if (!program) return null
    
    this.gl.attachShader(program, vertexShader)
    this.gl.attachShader(program, fragmentShader)
    this.gl.linkProgram(program)
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program linking error:', this.gl.getProgramInfoLog(program))
      this.gl.deleteProgram(program)
      return null
    }
    
    return program
  }
  
  /**
   * Basic vertex shader for 2D rendering
   */
  private getBasicVertexShader(): string {
    return `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      
      uniform vec2 u_resolution;
      
      varying vec2 v_texCoord;
      
      void main() {
        vec2 zeroToOne = a_position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        v_texCoord = a_texCoord;
      }
    `
  }
  
  /**
   * Basic fragment shader for 2D rendering
   */
  private getBasicFragmentShader(): string {
    return `
      precision mediump float;
      
      uniform sampler2D u_texture;
      uniform vec4 u_color;
      
      varying vec2 v_texCoord;
      
      void main() {
        gl_FragColor = texture2D(u_texture, v_texCoord) * u_color;
      }
    `
  }
  
  /**
   * Get canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height }
  }
  
  /**
   * Check if WebGL is properly initialized
   */
  isReady(): boolean {
    return this.isInitialized
  }
  
  /**
   * Shutdown the WebGL renderer
   */
  shutdown(): void {
    if (this.isInitialized && this.gl) {
      try {
        // Clean up WebGL resources
        const numTextureUnits = this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS) || 8
        for (let i = 0; i < numTextureUnits; i++) {
          this.gl.activeTexture(this.gl.TEXTURE0 + i)
          this.gl.bindTexture(this.gl.TEXTURE_2D, null)
        }
        
        this.gl.useProgram(null)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null)
      } catch (error) {
        console.warn('Error during WebGL cleanup:', error)
      }
      
      this.isInitialized = false
      console.log('WebGL renderer shutdown')
    }
  }
}