/**
 * Integration test for the rendering system
 * Tests the complete Canvas renderer with WebGL fallback detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Renderer } from '../../src/rendering/Renderer'

describe('Rendering System Integration', () => {
  let canvas: HTMLCanvasElement
  let renderer: Renderer

  beforeEach(() => {
    // Create a real canvas element for integration testing
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    document.body.appendChild(canvas)
  })

  afterEach(() => {
    if (renderer) {
      renderer.shutdown()
    }
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas)
    }
  })

  it('should create renderer with Canvas 2D as primary', () => {
    renderer = new Renderer(canvas)
    
    expect(renderer.getRendererType()).toBe('canvas2d')
    expect(renderer.getContext()).toBeTruthy()
  })

  it('should initialize successfully', async () => {
    renderer = new Renderer(canvas)
    
    await expect(renderer.initialize()).resolves.not.toThrow()
    expect(renderer.getRendererType()).toBe('canvas2d')
  })

  it('should detect rendering capabilities', () => {
    renderer = new Renderer(canvas)
    const capabilities = renderer.getCapabilities()
    
    expect(capabilities.hasCanvas2D).toBe(true)
    expect(typeof capabilities.hasWebGL).toBe('boolean')
    expect(typeof capabilities.maxTextureSize).toBe('number')
    expect(typeof capabilities.supportsBlending).toBe('boolean')
    expect(typeof capabilities.supportsFilters).toBe('boolean')
  })

  it('should handle clear operations', async () => {
    renderer = new Renderer(canvas)
    await renderer.initialize()
    
    expect(() => renderer.clear()).not.toThrow()
  })

  it('should handle resize operations', async () => {
    renderer = new Renderer(canvas)
    await renderer.initialize()
    
    expect(() => renderer.onResize(1024, 768)).not.toThrow()
    expect(() => renderer.clear()).not.toThrow()
  })

  it('should provide consistent interface', async () => {
    renderer = new Renderer(canvas)
    await renderer.initialize()
    
    // Test all public methods exist and work
    expect(typeof renderer.clear).toBe('function')
    expect(typeof renderer.getContext).toBe('function')
    expect(typeof renderer.getWebGLContext).toBe('function')
    expect(typeof renderer.getRendererType).toBe('function')
    expect(typeof renderer.getCapabilities).toBe('function')
    expect(typeof renderer.onResize).toBe('function')
    expect(typeof renderer.enableWebGL).toBe('function')
    expect(typeof renderer.enableCanvas2D).toBe('function')
    expect(typeof renderer.shutdown).toBe('function')
    
    // Test they don't throw
    expect(() => renderer.clear()).not.toThrow()
    expect(() => renderer.getContext()).not.toThrow()
    expect(() => renderer.getWebGLContext()).not.toThrow()
    expect(() => renderer.getRendererType()).not.toThrow()
    expect(() => renderer.getCapabilities()).not.toThrow()
    expect(() => renderer.onResize(800, 600)).not.toThrow()
    expect(() => renderer.enableCanvas2D()).not.toThrow()
    expect(() => renderer.shutdown()).not.toThrow()
  })

  it('should meet requirement 8.2: Canvas 2D as primary renderer', async () => {
    renderer = new Renderer(canvas)
    await renderer.initialize()
    
    // Canvas 2D should be the primary renderer for reliability
    expect(renderer.getRendererType()).toBe('canvas2d')
    expect(renderer.getContext()).toBeTruthy()
  })

  it('should meet requirement 8.5: WebGL fallback detection', () => {
    renderer = new Renderer(canvas)
    const capabilities = renderer.getCapabilities()
    
    // Should detect WebGL capabilities for enhanced effects
    expect(typeof capabilities.hasWebGL).toBe('boolean')
    expect(typeof capabilities.maxTextureSize).toBe('number')
    
    if (capabilities.hasWebGL) {
      // If WebGL is available, should be able to switch to it
      const switched = renderer.enableWebGL()
      expect(typeof switched).toBe('boolean')
    }
  })

  it('should provide rendering abstraction layer', () => {
    renderer = new Renderer(canvas)
    
    // Should provide unified interface regardless of underlying renderer
    const capabilities = renderer.getCapabilities()
    expect(capabilities).toHaveProperty('hasCanvas2D')
    expect(capabilities).toHaveProperty('hasWebGL')
    expect(capabilities).toHaveProperty('maxTextureSize')
    expect(capabilities).toHaveProperty('supportsBlending')
    expect(capabilities).toHaveProperty('supportsFilters')
  })
})