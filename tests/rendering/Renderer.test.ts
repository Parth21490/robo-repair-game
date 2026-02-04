/**
 * Unit tests for the Renderer system
 * Tests Canvas 2D primary rendering with WebGL fallback detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Renderer } from '../../src/rendering/Renderer'

// Mock canvas and contexts
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn(),
} as unknown as HTMLCanvasElement

const mockCanvas2DContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high',
  lineCap: 'round',
  lineJoin: 'round',
  textAlign: 'left',
  textBaseline: 'top',
  fillStyle: '',
} as unknown as CanvasRenderingContext2D

const mockWebGLContext = {
  getParameter: vi.fn(),
  MAX_TEXTURE_SIZE: 0x0D33,
  viewport: vi.fn(),
  enable: vi.fn(),
  blendFunc: vi.fn(),
  clearColor: vi.fn(),
  clear: vi.fn(),
  COLOR_BUFFER_BIT: 0x00004000,
  BLEND: 0x0BE2,
  SRC_ALPHA: 0x0302,
  ONE_MINUS_SRC_ALPHA: 0x0303,
} as unknown as WebGLRenderingContext

describe('Renderer', () => {
  let renderer: Renderer

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (renderer) {
      renderer.shutdown()
    }
  })

  describe('Canvas 2D Primary Rendering', () => {
    beforeEach(() => {
      mockCanvas.getContext = vi.fn((type: string) => {
        if (type === '2d') return mockCanvas2DContext
        // Simulate WebGL not available for this test suite
        return null
      })
      renderer = new Renderer(mockCanvas)
    })

    it('should initialize with Canvas 2D as primary renderer', async () => {
      await renderer.initialize()
      
      expect(renderer.getRendererType()).toBe('canvas2d')
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d')
    })

    it('should provide Canvas 2D context', () => {
      const context = renderer.getContext()
      expect(context).toBe(mockCanvas2DContext)
    })

    it('should detect Canvas 2D capabilities', () => {
      const capabilities = renderer.getCapabilities()
      expect(capabilities.hasCanvas2D).toBe(true)
      expect(capabilities.hasWebGL).toBe(false)
    })

    it('should clear canvas with background gradient', () => {
      renderer.clear()
      
      expect(mockCanvas2DContext.clearRect).toHaveBeenCalledWith(0, 0, 0, 0)
      expect(mockCanvas2DContext.createLinearGradient).toHaveBeenCalled()
      expect(mockCanvas2DContext.fillRect).toHaveBeenCalledWith(0, 0, 0, 0)
    })

    it('should handle resize correctly', () => {
      renderer.onResize(1024, 768)
      // Canvas renderer should handle resize without errors
      expect(() => renderer.onResize(1024, 768)).not.toThrow()
    })
  })

  describe('WebGL Fallback Detection', () => {
    beforeEach(() => {
      mockCanvas.getContext = vi.fn((type: string) => {
        if (type === '2d') return mockCanvas2DContext
        if (type === 'webgl' || type === 'experimental-webgl') return mockWebGLContext
        return null
      })
      
      mockWebGLContext.getParameter = vi.fn((param) => {
        if (param === mockWebGLContext.MAX_TEXTURE_SIZE) return 4096
        return null
      })
      
      renderer = new Renderer(mockCanvas)
    })

    it('should detect WebGL capabilities when available', () => {
      const capabilities = renderer.getCapabilities()
      expect(capabilities.hasWebGL).toBe(true)
      expect(capabilities.hasCanvas2D).toBe(true)
      expect(capabilities.maxTextureSize).toBe(4096)
    })

    it('should initialize both renderers when WebGL is available', async () => {
      await renderer.initialize()
      
      expect(renderer.getRendererType()).toBe('canvas2d') // Still primary
      expect(renderer.getWebGLContext()).toBe(mockWebGLContext)
    })

    it('should allow switching to WebGL renderer', async () => {
      await renderer.initialize()
      
      const switched = renderer.enableWebGL()
      expect(switched).toBe(true)
      expect(renderer.getRendererType()).toBe('webgl')
    })

    it('should allow switching back to Canvas 2D', async () => {
      await renderer.initialize()
      renderer.enableWebGL()
      renderer.enableCanvas2D()
      
      expect(renderer.getRendererType()).toBe('canvas2d')
    })
  })

  describe('Graceful Fallback', () => {
    beforeEach(() => {
      mockCanvas.getContext = vi.fn((type: string) => {
        if (type === '2d') return mockCanvas2DContext
        // Simulate WebGL not available
        return null
      })
      renderer = new Renderer(mockCanvas)
    })

    it('should fallback to Canvas 2D when WebGL is not available', async () => {
      await renderer.initialize()
      
      expect(renderer.getRendererType()).toBe('canvas2d')
      expect(renderer.getWebGLContext()).toBe(null)
    })

    it('should not allow switching to WebGL when not available', async () => {
      await renderer.initialize()
      
      const switched = renderer.enableWebGL()
      expect(switched).toBe(false)
      expect(renderer.getRendererType()).toBe('canvas2d')
    })

    it('should detect limited capabilities without WebGL', () => {
      const capabilities = renderer.getCapabilities()
      expect(capabilities.hasWebGL).toBe(false)
      expect(capabilities.hasCanvas2D).toBe(true)
      expect(capabilities.maxTextureSize).toBe(0)
    })
  }))

  describe('Error Handling', () => {
    it('should handle Canvas 2D context creation failure', () => {
      const failingCanvas = {
        ...mockCanvas,
        getContext: vi.fn(() => null)
      } as unknown as HTMLCanvasElement

      expect(() => new Renderer(failingCanvas)).toThrow('Failed to get 2D rendering context')
    })

    it('should handle WebGL initialization failure gracefully', async () => {
      mockCanvas.getContext = vi.fn((type: string) => {
        if (type === '2d') return mockCanvas2DContext
        if (type === 'webgl' || type === 'experimental-webgl') {
          // Return a context that fails during initialization
          return {
            ...mockWebGLContext,
            viewport: vi.fn(() => { throw new Error('WebGL error') })
          }
        }
        return null
      })

      renderer = new Renderer(mockCanvas)
      
      // Should not throw, should fallback gracefully
      await expect(renderer.initialize()).resolves.not.toThrow()
      expect(renderer.getRendererType()).toBe('canvas2d')
    })
  })

  describe('Requirements Validation', () => {
    beforeEach(() => {
      mockCanvas.getContext = vi.fn((type: string) => {
        if (type === '2d') return mockCanvas2DContext
        if (type === 'webgl' || type === 'experimental-webgl') return mockWebGLContext
        return null
      })
      renderer = new Renderer(mockCanvas)
    })

    it('should meet requirement 8.2: Canvas 2D as primary renderer', async () => {
      await renderer.initialize()
      // Canvas 2D should be the primary renderer for reliability
      expect(renderer.getRendererType()).toBe('canvas2d')
    })

    it('should meet requirement 8.5: WebGL fallback detection', () => {
      const capabilities = renderer.getCapabilities()
      // Should detect WebGL capabilities for enhanced effects
      expect(capabilities.hasWebGL).toBe(true)
      expect(typeof capabilities.maxTextureSize).toBe('number')
    })

    it('should provide rendering abstraction layer', () => {
      // Should provide unified interface regardless of underlying renderer
      expect(typeof renderer.clear).toBe('function')
      expect(typeof renderer.getContext).toBe('function')
      expect(typeof renderer.getCapabilities).toBe('function')
      expect(typeof renderer.onResize).toBe('function')
    })
  })
})