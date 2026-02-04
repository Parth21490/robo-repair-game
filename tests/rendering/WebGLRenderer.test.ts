/**
 * Unit tests for WebGLRenderer
 * Tests WebGL enhancement functionality with graceful fallback
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WebGLRenderer } from '../../src/rendering/WebGLRenderer'

// Mock canvas
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn(),
} as unknown as HTMLCanvasElement

// Mock WebGL context
const mockWebGLContext = {
  viewport: vi.fn(),
  enable: vi.fn(),
  blendFunc: vi.fn(),
  clearColor: vi.fn(),
  clear: vi.fn(),
  createShader: vi.fn(),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn(),
  getShaderInfoLog: vi.fn(),
  deleteShader: vi.fn(),
  createProgram: vi.fn(),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn(),
  getProgramInfoLog: vi.fn(),
  deleteProgram: vi.fn(),
  getParameter: vi.fn(),
  activeTexture: vi.fn(),
  bindTexture: vi.fn(),
  useProgram: vi.fn(),
  bindBuffer: vi.fn(),
  // WebGL constants
  BLEND: 0x0BE2,
  SRC_ALPHA: 0x0302,
  ONE_MINUS_SRC_ALPHA: 0x0303,
  COLOR_BUFFER_BIT: 0x00004000,
  COMPILE_STATUS: 0x8B81,
  LINK_STATUS: 0x8B82,
  VERTEX_SHADER: 0x8B31,
  FRAGMENT_SHADER: 0x8B30,
  MAX_TEXTURE_IMAGE_UNITS: 0x8872,
  TEXTURE0: 0x84C0,
  TEXTURE_2D: 0x0DE1,
  ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893,
} as unknown as WebGLRenderingContext

describe('WebGLRenderer', () => {
  let renderer: WebGLRenderer

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with WebGL context', () => {
      mockCanvas.getContext = vi.fn((type: string) => {
        if (type === 'webgl' || type === 'experimental-webgl') {
          return mockWebGLContext
        }
        return null
      })

      renderer = new WebGLRenderer(mockCanvas)
      expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl')
    })

    it('should throw error if WebGL is not supported', () => {
      mockCanvas.getContext = vi.fn(() => null)

      expect(() => new WebGLRenderer(mockCanvas)).toThrow('WebGL not supported')
    })

    it('should try experimental-webgl as fallback', () => {
      let callCount = 0
      mockCanvas.getContext = vi.fn((type: string) => {
        callCount++
        if (callCount === 1 && type === 'webgl') return null
        if (callCount === 2 && type === 'experimental-webgl') return mockWebGLContext
        return null
      })

      renderer = new WebGLRenderer(mockCanvas)
      expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl')
      expect(mockCanvas.getContext).toHaveBeenCalledWith('experimental-webgl')
    })
  })

  describe('WebGL Setup', () => {
    beforeEach(() => {
      mockCanvas.getContext = vi.fn(() => mockWebGLContext)
      renderer = new WebGLRenderer(mockCanvas)
    })

    it('should initialize WebGL settings correctly', async () => {
      await renderer.initialize()

      expect(mockWebGLContext.viewport).toHaveBeenCalledWith(0, 0, 800, 600)
      expect(mockWebGLContext.enable).toHaveBeenCalledWith(mockWebGLContext.BLEND)
      expect(mockWebGLContext.blendFunc).toHaveBeenCalledWith(
        mockWebGLContext.SRC_ALPHA,
        mockWebGLContext.ONE_MINUS_SRC_ALPHA
      )
      expect(mockWebGLContext.clearColor).toHaveBeenCalledWith(0.53, 0.81, 0.92, 1.0)
    })

    it('should not initialize twice', async () => {
      await renderer.initialize()
      await renderer.initialize()

      // viewport should only be called once
      expect(mockWebGLContext.viewport).toHaveBeenCalledTimes(1)
    })

    it('should report ready status after initialization', async () => {
      expect(renderer.isReady()).toBe(false)
      await renderer.initialize()
      expect(renderer.isReady()).toBe(true)
    })
  })

  describe('Basic Rendering', () => {
    beforeEach(async () => {
      mockCanvas.getContext = vi.fn(() => mockWebGLContext)
      renderer = new WebGLRenderer(mockCanvas)
      await renderer.initialize()
    })

    it('should clear the WebGL canvas', () => {
      renderer.clear()
      expect(mockWebGLContext.clear).toHaveBeenCalledWith(mockWebGLContext.COLOR_BUFFER_BIT)
    })

    it('should provide access to WebGL context', () => {
      const context = renderer.getContext()
      expect(context).toBe(mockWebGLContext)
    })

    it('should return correct dimensions', () => {
      const dimensions = renderer.getDimensions()
      expect(dimensions).toEqual({ width: 800, height: 600 })
    })

    it('should not clear if not initialized', () => {
      const uninitializedRenderer = new WebGLRenderer(mockCanvas)
      uninitializedRenderer.clear()
      
      expect(mockWebGLContext.clear).not.toHaveBeenCalled()
    })
  })

  describe('Shader Management', () => {
    beforeEach(async () => {
      mockCanvas.getContext = vi.fn(() => mockWebGLContext)
      renderer = new WebGLRenderer(mockCanvas)
      await renderer.initialize()
    })

    it('should create and compile shaders successfully', () => {
      const mockShader = {} as WebGLShader
      mockWebGLContext.createShader = vi.fn(() => mockShader)
      mockWebGLContext.getShaderParameter = vi.fn(() => true)

      const shader = renderer.createShader(mockWebGLContext.VERTEX_SHADER, 'shader source')

      expect(mockWebGLContext.createShader).toHaveBeenCalledWith(mockWebGLContext.VERTEX_SHADER)
      expect(mockWebGLContext.shaderSource).toHaveBeenCalledWith(mockShader, 'shader source')
      expect(mockWebGLContext.compileShader).toHaveBeenCalledWith(mockShader)
      expect(shader).toBe(mockShader)
    })

    it('should handle shader compilation failure', () => {
      const mockShader = {} as WebGLShader
      mockWebGLContext.createShader = vi.fn(() => mockShader)
      mockWebGLContext.getShaderParameter = vi.fn(() => false)
      mockWebGLContext.getShaderInfoLog = vi.fn(() => 'Compilation error')

      const shader = renderer.createShader(mockWebGLContext.VERTEX_SHADER, 'bad shader')

      expect(mockWebGLContext.deleteShader).toHaveBeenCalledWith(mockShader)
      expect(shader).toBe(null)
    })

    it('should create shader programs successfully', () => {
      const mockProgram = {} as WebGLProgram
      const mockVertexShader = {} as WebGLShader
      const mockFragmentShader = {} as WebGLShader
      
      mockWebGLContext.createProgram = vi.fn(() => mockProgram)
      mockWebGLContext.getProgramParameter = vi.fn(() => true)

      const program = renderer.createProgram(mockVertexShader, mockFragmentShader)

      expect(mockWebGLContext.createProgram).toHaveBeenCalled()
      expect(mockWebGLContext.attachShader).toHaveBeenCalledWith(mockProgram, mockVertexShader)
      expect(mockWebGLContext.attachShader).toHaveBeenCalledWith(mockProgram, mockFragmentShader)
      expect(mockWebGLContext.linkProgram).toHaveBeenCalledWith(mockProgram)
      expect(program).toBe(mockProgram)
    })

    it('should handle program linking failure', () => {
      const mockProgram = {} as WebGLProgram
      const mockVertexShader = {} as WebGLShader
      const mockFragmentShader = {} as WebGLShader
      
      mockWebGLContext.createProgram = vi.fn(() => mockProgram)
      mockWebGLContext.getProgramParameter = vi.fn(() => false)
      mockWebGLContext.getProgramInfoLog = vi.fn(() => 'Linking error')

      const program = renderer.createProgram(mockVertexShader, mockFragmentShader)

      expect(mockWebGLContext.deleteProgram).toHaveBeenCalledWith(mockProgram)
      expect(program).toBe(null)
    })
  })

  describe('Resize Handling', () => {
    beforeEach(async () => {
      mockCanvas.getContext = vi.fn(() => mockWebGLContext)
      renderer = new WebGLRenderer(mockCanvas)
      await renderer.initialize()
    })

    it('should handle resize correctly', () => {
      renderer.onResize(1024, 768)
      expect(mockWebGLContext.viewport).toHaveBeenCalledWith(0, 0, 1024, 768)
    })

    it('should not resize if not initialized', () => {
      const uninitializedRenderer = new WebGLRenderer(mockCanvas)
      uninitializedRenderer.onResize(1024, 768)
      
      // Should not call viewport since not initialized, but dimensions should be updated
      const dimensions = uninitializedRenderer.getDimensions()
      expect(dimensions).toEqual({ width: 1024, height: 768 })
    })

    it('should update dimensions after resize', () => {
      renderer.onResize(1024, 768)
      const dimensions = renderer.getDimensions()
      expect(dimensions).toEqual({ width: 1024, height: 768 })
    })
  })

  describe('Resource Cleanup', () => {
    beforeEach(async () => {
      mockCanvas.getContext = vi.fn(() => mockWebGLContext)
      mockWebGLContext.getParameter = vi.fn((param) => {
        if (param === mockWebGLContext.MAX_TEXTURE_IMAGE_UNITS) return 8
        return null
      })
      renderer = new WebGLRenderer(mockCanvas)
      await renderer.initialize()
    })

    it('should clean up WebGL resources on shutdown', () => {
      renderer.shutdown()

      expect(mockWebGLContext.activeTexture).toHaveBeenCalled()
      expect(mockWebGLContext.bindTexture).toHaveBeenCalledWith(mockWebGLContext.TEXTURE_2D, null)
      expect(mockWebGLContext.useProgram).toHaveBeenCalledWith(null)
      expect(mockWebGLContext.bindBuffer).toHaveBeenCalledWith(mockWebGLContext.ARRAY_BUFFER, null)
      expect(mockWebGLContext.bindBuffer).toHaveBeenCalledWith(mockWebGLContext.ELEMENT_ARRAY_BUFFER, null)
    })

    it('should mark as not ready after shutdown', () => {
      expect(renderer.isReady()).toBe(true)
      renderer.shutdown()
      expect(renderer.isReady()).toBe(false)
    })

    it('should handle shutdown when not initialized', () => {
      const uninitializedRenderer = new WebGLRenderer(mockCanvas)
      expect(() => uninitializedRenderer.shutdown()).not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle context creation returning null', () => {
      mockCanvas.getContext = vi.fn(() => null)
      expect(() => new WebGLRenderer(mockCanvas)).toThrow('WebGL not supported')
    })

    it('should handle shader creation failure', () => {
      mockCanvas.getContext = vi.fn(() => mockWebGLContext)
      renderer = new WebGLRenderer(mockCanvas)
      
      mockWebGLContext.createShader = vi.fn(() => null)
      
      const shader = renderer.createShader(mockWebGLContext.VERTEX_SHADER, 'source')
      expect(shader).toBe(null)
    })

    it('should handle program creation failure', () => {
      mockCanvas.getContext = vi.fn(() => mockWebGLContext)
      renderer = new WebGLRenderer(mockCanvas)
      
      mockWebGLContext.createProgram = vi.fn(() => null)
      
      const program = renderer.createProgram({} as WebGLShader, {} as WebGLShader)
      expect(program).toBe(null)
    })
  })

  describe('Performance Considerations', () => {
    beforeEach(async () => {
      mockCanvas.getContext = vi.fn(() => mockWebGLContext)
      renderer = new WebGLRenderer(mockCanvas)
      await renderer.initialize()
    })

    it('should use appropriate clear color for child-friendly appearance', async () => {
      await renderer.initialize()
      
      // Should use sky blue color matching Canvas 2D background
      expect(mockWebGLContext.clearColor).toHaveBeenCalledWith(0.53, 0.81, 0.92, 1.0)
    })

    it('should enable blending for transparency support', async () => {
      await renderer.initialize()
      
      expect(mockWebGLContext.enable).toHaveBeenCalledWith(mockWebGLContext.BLEND)
      expect(mockWebGLContext.blendFunc).toHaveBeenCalledWith(
        mockWebGLContext.SRC_ALPHA,
        mockWebGLContext.ONE_MINUS_SRC_ALPHA
      )
    })
  })
})