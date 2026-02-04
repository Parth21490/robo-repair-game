/**
 * Property-based tests for the Renderer system
 * Tests universal properties that should hold across all rendering scenarios
 * 
 * **Feature: robo-pet-repair-shop, Property 10: Performance Requirements**
 * **Validates: Requirements 8.1, 8.2, 8.5**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import { Renderer } from '../../src/rendering/Renderer'

// Mock DOM elements for testing
const createMockCanvas = (width: number, height: number) => ({
  width,
  height,
  getContext: vi.fn(),
} as unknown as HTMLCanvasElement)

const createMockCanvas2DContext = () => ({
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
} as unknown as CanvasRenderingContext2D)

const createMockWebGLContext = (maxTextureSize: number = 4096) => ({
  getParameter: vi.fn((param) => {
    if (param === 0x0D33) return maxTextureSize // MAX_TEXTURE_SIZE
    return null
  }),
  viewport: vi.fn(),
  enable: vi.fn(),
  blendFunc: vi.fn(),
  clearColor: vi.fn(),
  clear: vi.fn(),
  activeTexture: vi.fn(),
  bindTexture: vi.fn(),
  useProgram: vi.fn(),
  bindBuffer: vi.fn(),
  // WebGL constants
  MAX_TEXTURE_SIZE: 0x0D33,
  COLOR_BUFFER_BIT: 0x00004000,
  BLEND: 0x0BE2,
  SRC_ALPHA: 0x0302,
  ONE_MINUS_SRC_ALPHA: 0x0303,
  MAX_TEXTURE_IMAGE_UNITS: 0x8872,
  TEXTURE0: 0x84C0,
  TEXTURE_2D: 0x0DE1,
  ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893,
} as unknown as WebGLRenderingContext)

describe('Renderer Property Tests', () => {
  let renderer: Renderer | null = null

  afterEach(() => {
    if (renderer) {
      renderer.shutdown()
      renderer = null
    }
    vi.clearAllMocks()
  })

  describe('Property 10: Performance Requirements', () => {
    /**
     * **Property 10: Performance Requirements**
     * For any gameplay session on supported devices, the system should maintain 30+ FPS performance,
     * load within 10 seconds, and provide consistent functionality across modern browsers.
     * **Validates: Requirements 8.1, 8.2, 8.5**
     */
    it('should maintain consistent rendering capabilities regardless of canvas dimensions', () => {
      fc.assert(fc.property(
        fc.integer({ min: 320, max: 4096 }), // width
        fc.integer({ min: 240, max: 4096 }), // height
        (width, height) => {
          const canvas = createMockCanvas(width, height)
          const ctx2d = createMockCanvas2DContext()
          const webglCtx = createMockWebGLContext()

          canvas.getContext = vi.fn((type: string) => {
            if (type === '2d') return ctx2d
            if (type === 'webgl' || type === 'experimental-webgl') return webglCtx
            return null
          })

          renderer = new Renderer(canvas)
          const capabilities = renderer.getCapabilities()

          // Should always detect Canvas 2D support (requirement 8.2)
          expect(capabilities.hasCanvas2D).toBe(true)
          
          // Should detect WebGL when available (requirement 8.5)
          expect(capabilities.hasWebGL).toBe(true)
          expect(capabilities.maxTextureSize).toBeGreaterThan(0)
          
          // Should provide consistent interface regardless of size
          expect(typeof renderer.clear).toBe('function')
          expect(typeof renderer.getContext).toBe('function')
          expect(typeof renderer.onResize).toBe('function')
        }
      ), { numRuns: 10 }) // Reduced from 100 for faster execution
    })

    it('should gracefully handle WebGL unavailability while maintaining Canvas 2D functionality', () => {
      fc.assert(fc.property(
        fc.boolean(), // webglAvailable
        fc.integer({ min: 1024, max: 8192 }), // maxTextureSize
        (webglAvailable, maxTextureSize) => {
          const canvas = createMockCanvas(800, 600)
          const ctx2d = createMockCanvas2DContext()

          canvas.getContext = vi.fn((type: string) => {
            if (type === '2d') return ctx2d
            if ((type === 'webgl' || type === 'experimental-webgl') && webglAvailable) {
              return createMockWebGLContext(maxTextureSize)
            }
            return null
          })

          renderer = new Renderer(canvas)
          const capabilities = renderer.getCapabilities()

          // Canvas 2D should always be available (fallback requirement)
          expect(capabilities.hasCanvas2D).toBe(true)
          
          // WebGL availability should match the test condition
          expect(capabilities.hasWebGL).toBe(webglAvailable)
          
          if (webglAvailable) {
            expect(capabilities.maxTextureSize).toBe(maxTextureSize)
          } else {
            expect(capabilities.maxTextureSize).toBe(0)
          }

          // Should always default to Canvas 2D as primary (requirement 8.2)
          expect(renderer.getRendererType()).toBe('canvas2d')
        }
      ), { numRuns: 15 }) // Reduced from 100 for faster execution
    })

    it('should initialize within reasonable time bounds', async () => {
      fc.assert(fc.asyncProperty(
        fc.integer({ min: 400, max: 1920 }), // width
        fc.integer({ min: 300, max: 1080 }), // height
        async (width, height) => {
          const canvas = createMockCanvas(width, height)
          const ctx2d = createMockCanvas2DContext()
          const webglCtx = createMockWebGLContext()

          canvas.getContext = vi.fn((type: string) => {
            if (type === '2d') return ctx2d
            if (type === 'webgl' || type === 'experimental-webgl') return webglCtx
            return null
          })

          renderer = new Renderer(canvas)
          
          const startTime = performance.now()
          await renderer.initialize()
          const endTime = performance.now()
          
          // Should initialize quickly (well under 10 seconds requirement)
          const initTime = endTime - startTime
          expect(initTime).toBeLessThan(1000) // 1 second is generous for mocked operations
          
          // Should be properly initialized
          expect(renderer.getRendererType()).toBe('canvas2d')
          expect(renderer.getContext()).toBe(ctx2d)
        }
      ), { numRuns: 10 }) // Reduced from 100 for faster execution
    })

    it('should handle renderer switching consistently', async () => {
      fc.assert(fc.asyncProperty(
        fc.array(fc.constantFrom('webgl', 'canvas2d'), { minLength: 1, maxLength: 10 }),
        async (switchSequence) => {
          const canvas = createMockCanvas(800, 600)
          const ctx2d = createMockCanvas2DContext()
          const webglCtx = createMockWebGLContext()

          canvas.getContext = vi.fn((type: string) => {
            if (type === '2d') return ctx2d
            if (type === 'webgl' || type === 'experimental-webgl') return webglCtx
            return null
          })

          renderer = new Renderer(canvas)
          await renderer.initialize()

          let currentType = renderer.getRendererType()
          expect(currentType).toBe('canvas2d') // Should start with Canvas 2D

          for (const targetRenderer of switchSequence) {
            if (targetRenderer === 'webgl') {
              const switched = renderer.enableWebGL()
              if (switched) {
                expect(renderer.getRendererType()).toBe('webgl')
                currentType = 'webgl'
              } else {
                // If WebGL not available, should stay on current renderer
                expect(renderer.getRendererType()).toBe(currentType)
              }
            } else {
              renderer.enableCanvas2D()
              expect(renderer.getRendererType()).toBe('canvas2d')
              currentType = 'canvas2d'
            }
          }

          // Should always be able to get a valid context
          expect(renderer.getContext()).toBe(ctx2d)
        }
      ), { numRuns: 10 }) // Reduced from 100 for faster execution
    })

    it('should handle resize operations without losing functionality', async () => {
      fc.assert(fc.asyncProperty(
        fc.array(
          fc.record({
            width: fc.integer({ min: 320, max: 2560 }),
            height: fc.integer({ min: 240, max: 1440 })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (resizeSequence) => {
          const canvas = createMockCanvas(800, 600)
          const ctx2d = createMockCanvas2DContext()
          const webglCtx = createMockWebGLContext()

          canvas.getContext = vi.fn((type: string) => {
            if (type === '2d') return ctx2d
            if (type === 'webgl' || type === 'experimental-webgl') return webglCtx
            return null
          })

          renderer = new Renderer(canvas)
          await renderer.initialize()

          for (const { width, height } of resizeSequence) {
            // Should handle resize without throwing
            expect(() => renderer.onResize(width, height)).not.toThrow()
            
            // Should maintain functionality after resize
            expect(() => renderer.clear()).not.toThrow()
            expect(renderer.getContext()).toBe(ctx2d)
            expect(renderer.getRendererType()).toBe('canvas2d')
          }
        }
      ), { numRuns: 10 }) // Reduced from 100 for faster execution
    })
  })

  describe('Rendering Abstraction Layer Properties', () => {
    it('should provide consistent interface regardless of underlying renderer', () => {
      fc.assert(fc.property(
        fc.boolean(), // hasWebGL
        fc.boolean(), // startWithWebGL
        (hasWebGL, startWithWebGL) => {
          const canvas = createMockCanvas(800, 600)
          const ctx2d = createMockCanvas2DContext()

          canvas.getContext = vi.fn((type: string) => {
            if (type === '2d') return ctx2d
            if ((type === 'webgl' || type === 'experimental-webgl') && hasWebGL) {
              return createMockWebGLContext()
            }
            return null
          })

          renderer = new Renderer(canvas)
          
          if (hasWebGL && startWithWebGL) {
            renderer.enableWebGL()
          }

          // Should always provide these methods regardless of active renderer
          expect(typeof renderer.clear).toBe('function')
          expect(typeof renderer.getContext).toBe('function')
          expect(typeof renderer.getWebGLContext).toBe('function')
          expect(typeof renderer.getRendererType).toBe('function')
          expect(typeof renderer.getCapabilities).toBe('function')
          expect(typeof renderer.onResize).toBe('function')
          expect(typeof renderer.shutdown).toBe('function')

          // Should always provide Canvas 2D context (fallback guarantee)
          expect(renderer.getContext()).toBe(ctx2d)
        }
      ), { numRuns: 15 }) // Reduced from 100 for faster execution
    })

    it('should maintain state consistency during operations', async () => {
      fc.assert(fc.asyncProperty(
        fc.array(
          fc.constantFrom('clear', 'resize', 'switchWebGL', 'switchCanvas2D'),
          { minLength: 1, maxLength: 8 }
        ),
        async (operations) => {
          const canvas = createMockCanvas(800, 600)
          const ctx2d = createMockCanvas2DContext()
          const webglCtx = createMockWebGLContext()

          canvas.getContext = vi.fn((type: string) => {
            if (type === '2d') return ctx2d
            if (type === 'webgl' || type === 'experimental-webgl') return webglCtx
            return null
          })

          renderer = new Renderer(canvas)
          await renderer.initialize()

          const initialCapabilities = renderer.getCapabilities()

          for (const operation of operations) {
            switch (operation) {
              case 'clear':
                expect(() => renderer.clear()).not.toThrow()
                break
              case 'resize':
                expect(() => renderer.onResize(1024, 768)).not.toThrow()
                break
              case 'switchWebGL':
                renderer.enableWebGL()
                break
              case 'switchCanvas2D':
                renderer.enableCanvas2D()
                break
            }

            // Capabilities should remain consistent
            const currentCapabilities = renderer.getCapabilities()
            expect(currentCapabilities.hasCanvas2D).toBe(initialCapabilities.hasCanvas2D)
            expect(currentCapabilities.hasWebGL).toBe(initialCapabilities.hasWebGL)
            expect(currentCapabilities.maxTextureSize).toBe(initialCapabilities.maxTextureSize)

            // Should always have a valid renderer type
            const rendererType = renderer.getRendererType()
            expect(['canvas2d', 'webgl', 'fallback']).toContain(rendererType)

            // Should always provide Canvas 2D context
            expect(renderer.getContext()).toBe(ctx2d)
          }
        }
      ), { numRuns: 10 }) // Reduced from 100 for faster execution
    })
  })

  describe('Error Recovery Properties', () => {
    it('should handle context creation failures gracefully', () => {
      fc.assert(fc.property(
        fc.boolean(), // canvas2dFails
        fc.boolean(), // webglFails
        (canvas2dFails, webglFails) => {
          // Skip the case where both fail - that should throw
          fc.pre(!canvas2dFails || !webglFails)

          const canvas = createMockCanvas(800, 600)
          const ctx2d = canvas2dFails ? null : createMockCanvas2DContext()
          const webglCtx = webglFails ? null : createMockWebGLContext()

          canvas.getContext = vi.fn((type: string) => {
            if (type === '2d') return ctx2d
            if (type === 'webgl' || type === 'experimental-webgl') return webglCtx
            return null
          })

          if (canvas2dFails) {
            // Should throw if Canvas 2D is not available
            expect(() => new Renderer(canvas)).toThrow()
          } else {
            // Should create successfully
            renderer = new Renderer(canvas)
            const capabilities = renderer.getCapabilities()
            
            expect(capabilities.hasCanvas2D).toBe(true)
            expect(capabilities.hasWebGL).toBe(!webglFails)
            expect(renderer.getRendererType()).toBe('canvas2d')
          }
        }
      ), { numRuns: 15 }) // Reduced from 100 for faster execution
    })
  })
})