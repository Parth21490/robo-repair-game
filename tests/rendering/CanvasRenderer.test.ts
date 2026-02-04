/**
 * Unit tests for CanvasRenderer
 * Tests child-friendly Canvas 2D rendering functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CanvasRenderer } from '../../src/rendering/CanvasRenderer'

// Mock canvas and context
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn(),
} as unknown as HTMLCanvasElement

const mockContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
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
  strokeStyle: '',
  lineWidth: 1,
  font: '',
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
} as unknown as CanvasRenderingContext2D

describe('CanvasRenderer', () => {
  let renderer: CanvasRenderer

  beforeEach(() => {
    vi.clearAllMocks()
    mockCanvas.getContext = vi.fn(() => mockContext)
    renderer = new CanvasRenderer(mockCanvas)
  })

  describe('Initialization', () => {
    it('should initialize with child-friendly settings', async () => {
      await renderer.initialize()
      
      expect(mockContext.imageSmoothingEnabled).toBe(true)
      expect(mockContext.imageSmoothingQuality).toBe('high')
      expect(mockContext.lineCap).toBe('round')
      expect(mockContext.lineJoin).toBe('round')
      expect(mockContext.textAlign).toBe('left')
      expect(mockContext.textBaseline).toBe('top')
    })

    it('should throw error if 2D context is not available', () => {
      const failingCanvas = {
        ...mockCanvas,
        getContext: vi.fn(() => null)
      } as unknown as HTMLCanvasElement

      expect(() => new CanvasRenderer(failingCanvas)).toThrow('Failed to get 2D rendering context')
    })
  })

  describe('Basic Rendering', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should clear canvas with pleasant background gradient', () => {
      renderer.clear()
      
      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600)
      expect(mockContext.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 600)
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 800, 600)
    })

    it('should provide access to 2D context', () => {
      const context = renderer.getContext()
      expect(context).toBe(mockContext)
    })

    it('should return correct dimensions', () => {
      const dimensions = renderer.getDimensions()
      expect(dimensions).toEqual({ width: 800, height: 600 })
    })
  })

  describe('Child-Friendly UI Elements', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should draw rounded rectangles for child-friendly appearance', () => {
      renderer.drawRoundedRect(10, 10, 100, 50, 5)
      
      expect(mockContext.beginPath).toHaveBeenCalled()
      expect(mockContext.moveTo).toHaveBeenCalled()
      expect(mockContext.quadraticCurveTo).toHaveBeenCalled()
      expect(mockContext.closePath).toHaveBeenCalled()
    })

    it('should draw text with child-friendly styling', () => {
      renderer.drawChildFriendlyText('Hello Kids!', 50, 50, {
        fontSize: 24,
        color: '#FF6B6B',
        shadow: true
      })
      
      expect(mockContext.save).toHaveBeenCalled()
      expect(mockContext.restore).toHaveBeenCalled()
      expect(mockContext.fillText).toHaveBeenCalledWith('Hello Kids!', 50, 50)
    })

    it('should use Comic Sans font family for child appeal', () => {
      renderer.drawChildFriendlyText('Test', 0, 0)
      
      expect(mockContext.font).toContain('Comic Sans MS')
    })

    it('should add text shadow for better readability', () => {
      renderer.drawChildFriendlyText('Test', 0, 0, { shadow: true })
      
      expect(mockContext.shadowColor).toBe('rgba(255, 255, 255, 0.8)')
      expect(mockContext.shadowBlur).toBe(2)
    })
  })

  describe('Button Rendering', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should draw buttons with child-friendly styling', () => {
      renderer.drawButton(10, 10, 120, 40, 'Click Me!', {
        backgroundColor: '#4CAF50',
        textColor: 'white',
        fontSize: 18
      })
      
      expect(mockContext.save).toHaveBeenCalled()
      expect(mockContext.restore).toHaveBeenCalled()
      expect(mockContext.fill).toHaveBeenCalled()
      expect(mockContext.stroke).toHaveBeenCalled()
      expect(mockContext.fillText).toHaveBeenCalledWith('Click Me!', 70, 30)
    })

    it('should show pressed effect when button is pressed', () => {
      const fillSpy = vi.spyOn(mockContext, 'fill')
      
      renderer.drawButton(10, 10, 120, 40, 'Pressed', { isPressed: true })
      
      // Should not draw shadow when pressed
      expect(fillSpy).toHaveBeenCalledTimes(1) // Only button background, no shadow
    })

    it('should show hover effect when button is hovered', () => {
      renderer.drawButton(10, 10, 120, 40, 'Hover', { 
        isHovered: true,
        backgroundColor: '#4CAF50'
      })
      
      // Should lighten the background color
      expect(mockContext.fillStyle).not.toBe('#4CAF50')
    })

    it('should draw button shadow for depth', () => {
      const fillSpy = vi.spyOn(mockContext, 'fill')
      
      renderer.drawButton(10, 10, 120, 40, 'Normal', { isPressed: false })
      
      // Should draw shadow and button background
      expect(fillSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('Resize Handling', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should handle resize and maintain settings', () => {
      renderer.onResize(1024, 768)
      
      // Should re-apply child-friendly settings
      expect(mockContext.imageSmoothingEnabled).toBe(true)
      expect(mockContext.imageSmoothingQuality).toBe('high')
      expect(mockContext.lineCap).toBe('round')
      expect(mockContext.lineJoin).toBe('round')
    })
  })

  describe('Color Utilities', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should lighten colors for hover effects', () => {
      // Test the private lightenColor method through button hover
      renderer.drawButton(0, 0, 100, 50, 'Test', {
        backgroundColor: '#FF0000',
        isHovered: true
      })
      
      // The fillStyle should be different from the original color
      expect(mockContext.fillStyle).not.toBe('#FF0000')
    })
  })

  describe('Accessibility Features', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should use high contrast colors by default', () => {
      renderer.drawChildFriendlyText('Test', 0, 0)
      
      // Default text color should be dark for good contrast
      expect(mockContext.fillStyle).toBe('#2C3E50')
    })

    it('should use large font sizes for readability', () => {
      renderer.drawChildFriendlyText('Test', 0, 0)
      
      // Default font size should be large enough for children
      expect(mockContext.font).toContain('24px')
    })

    it('should support custom font sizes for different needs', () => {
      renderer.drawChildFriendlyText('Test', 0, 0, { fontSize: 32 })
      
      expect(mockContext.font).toContain('32px')
    })
  })

  describe('Performance Considerations', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should use save/restore for isolated styling', () => {
      renderer.drawChildFriendlyText('Test', 0, 0)
      
      expect(mockContext.save).toHaveBeenCalled()
      expect(mockContext.restore).toHaveBeenCalled()
    })

    it('should shutdown gracefully', () => {
      expect(() => renderer.shutdown()).not.toThrow()
    })
  })
})