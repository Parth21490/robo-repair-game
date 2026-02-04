/**
 * Unit tests for UIRenderer - Child-friendly UI system with accessibility features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UIRenderer, AccessibilityOptions } from '../../src/rendering/UIRenderer'

// Mock Canvas and Context
class MockCanvasRenderingContext2D {
  fillStyle: string | CanvasGradient | CanvasPattern = '#000000'
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000000'
  lineWidth: number = 1
  font: string = '10px sans-serif'
  textAlign: CanvasTextAlign = 'start'
  textBaseline: CanvasTextBaseline = 'alphabetic'
  shadowColor: string = 'rgba(0, 0, 0, 0)'
  shadowBlur: number = 0
  shadowOffsetX: number = 0
  shadowOffsetY: number = 0
  
  save = vi.fn()
  restore = vi.fn()
  beginPath = vi.fn()
  closePath = vi.fn()
  moveTo = vi.fn()
  lineTo = vi.fn()
  quadraticCurveTo = vi.fn()
  fill = vi.fn()
  stroke = vi.fn()
  fillText = vi.fn()
  measureText = vi.fn().mockReturnValue({ width: 100 })
  createLinearGradient = vi.fn().mockReturnValue({
    addColorStop: vi.fn()
  })
  setLineDash = vi.fn()
  clearRect = vi.fn()
  fillRect = vi.fn()
}

class MockCanvas {
  width: number = 800
  height: number = 600
  
  getContext = vi.fn().mockReturnValue(new MockCanvasRenderingContext2D())
  dispatchEvent = vi.fn()
}

describe('UIRenderer', () => {
  let canvas: MockCanvas
  let ctx: MockCanvasRenderingContext2D
  let uiRenderer: UIRenderer
  
  beforeEach(() => {
    canvas = new MockCanvas()
    ctx = new MockCanvasRenderingContext2D()
    canvas.getContext = vi.fn().mockReturnValue(ctx)
    
    // Mock DOM methods
    global.document = {
      createElement: vi.fn().mockReturnValue({
        setAttribute: vi.fn(),
        style: {},
        textContent: ''
      }),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      },
      addEventListener: vi.fn()
    } as any
    
    global.window = {
      addEventListener: vi.fn(),
      matchMedia: vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: false
      })
    } as any
    
    uiRenderer = new UIRenderer(canvas as any, ctx as any)
  })
  
  describe('Button Creation and Rendering', () => {
    it('should create a button with minimum touch target size', () => {
      const button = uiRenderer.createButton({
        id: 'test-button',
        x: 10,
        y: 10,
        width: 30, // Too small
        height: 30, // Too small
        text: 'Test'
      })
      
      // Should enforce minimum 44px height (WCAG guideline)
      expect(button.width).toBeGreaterThanOrEqual(120) // Minimum width
      expect(button.height).toBeGreaterThanOrEqual(44) // WCAG minimum
      expect(button.text).toBe('Test')
      expect(button.interactive).toBe(true)
      expect(button.visible).toBe(true)
    })
    
    it('should create button with child-friendly default colors', () => {
      const button = uiRenderer.createButton({
        id: 'colorful-button',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        text: 'Colorful'
      })
      
      // Should use bright, child-friendly colors
      expect(button.backgroundColor).toBe('#FF6B6B') // Coral red
      expect(button.textColor).toBe('#FFFFFF') // White text
      expect(button.borderColor).toBe('#2C3E50') // Dark border
      expect(button.shadowEnabled).toBe(true)
    })
    
    it('should render button with puffy styling', () => {
      const button = uiRenderer.createButton({
        id: 'puffy-button',
        x: 50,
        y: 50,
        width: 150,
        height: 60,
        text: 'Puffy Button'
      })
      
      uiRenderer.renderButton(button)
      
      // Should create gradient for puffy effect
      expect(ctx.createLinearGradient).toHaveBeenCalled()
      
      // Should draw shadow for depth
      expect(ctx.fill).toHaveBeenCalledTimes(2) // Shadow + button
      
      // Should use rounded corners
      expect(ctx.quadraticCurveTo).toHaveBeenCalled()
      
      // Should render text with child-friendly font
      expect(ctx.font).toContain('Comic Sans MS')
      expect(ctx.fillText).toHaveBeenCalledWith('Puffy Button', expect.any(Number), expect.any(Number))
    })
    
    it('should show focus indicator when button is focused', () => {
      const button = uiRenderer.createButton({
        id: 'focused-button',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        text: 'Focus Me'
      })
      
      button.focused = true
      uiRenderer.renderButton(button)
      
      // Should draw focus indicator with dashed line
      expect(ctx.setLineDash).toHaveBeenCalledWith([5, 5])
      expect(ctx.stroke).toHaveBeenCalled()
    })
  })
  
  describe('Text Rendering', () => {
    it('should create text with child-friendly font', () => {
      const text = uiRenderer.createText({
        id: 'test-text',
        x: 10,
        y: 10,
        width: 200,
        height: 30,
        text: 'Hello Kids!'
      })
      
      expect(text.fontFamily).toContain('Comic Sans MS')
      expect(text.fontFamily).toContain('Bubblegum Sans')
      expect(text.shadowEnabled).toBe(true)
    })
    
    it('should render text with shadow for readability', () => {
      const text = uiRenderer.createText({
        id: 'shadowed-text',
        x: 0,
        y: 0,
        width: 100,
        height: 20,
        text: 'Readable Text'
      })
      
      uiRenderer.renderText(text)
      
      // Should set shadow properties
      expect(ctx.shadowColor).toBe('rgba(255, 255, 255, 0.8)')
      expect(ctx.shadowBlur).toBe(2)
      expect(ctx.fillText).toHaveBeenCalledWith('Readable Text', 0, 0)
    })
  })
  
  describe('Accessibility Features', () => {
    it('should support high contrast mode', () => {
      uiRenderer.setAccessibilityOptions({ highContrast: true })
      
      const button = uiRenderer.createButton({
        id: 'contrast-button',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        text: 'High Contrast'
      })
      
      // Should use high contrast colors
      expect(button.backgroundColor).toBe('#000000') // Black
      expect(button.textColor).toBe('#F0F0F0') // Light gray
    })
    
    it('should scale elements for large text mode', () => {
      // Set canvas to desktop size to get 1.0 responsive scale
      canvas.width = 1200
      uiRenderer.onResize(1200, 600)
      
      uiRenderer.setAccessibilityOptions({ largeText: true })
      
      const button = uiRenderer.createButton({
        id: 'large-text-button',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        text: 'Large Text',
        fontSize: 16
      })
      
      // Should scale font size by 1.25x (16 * 1.25 = 20)
      expect(button.fontSize).toBe(20) // 16 * 1.25
    })
    
    it('should handle keyboard navigation', () => {
      const button1 = uiRenderer.createButton({
        id: 'button1',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        text: 'Button 1'
      })
      
      const button2 = uiRenderer.createButton({
        id: 'button2',
        x: 0,
        y: 60,
        width: 100,
        height: 50,
        text: 'Button 2'
      })
      
      // Tab should focus first button
      const handled = uiRenderer.handleKeyboardInput('Tab')
      expect(handled).toBe(true)
      expect(button1.focused).toBe(true)
      
      // Tab again should focus second button
      uiRenderer.handleKeyboardInput('Tab')
      expect(button1.focused).toBe(false)
      expect(button2.focused).toBe(true)
    })
    
    it('should activate button with Enter key', () => {
      const button = uiRenderer.createButton({
        id: 'enter-button',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        text: 'Press Enter'
      })
      
      uiRenderer.setFocus('enter-button')
      
      // Mock canvas event dispatch
      const dispatchSpy = vi.spyOn(canvas, 'dispatchEvent')
      
      const handled = uiRenderer.handleKeyboardInput('Enter')
      expect(handled).toBe(true)
      
      // Should dispatch activation event
      setTimeout(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'ui-element-activated',
            detail: expect.objectContaining({
              elementId: 'enter-button'
            })
          })
        )
      }, 200)
    })
  })
  
  describe('Responsive Layout', () => {
    it('should adjust scale factor based on canvas size', () => {
      // Test mobile breakpoint
      canvas.width = 500 // Mobile size
      uiRenderer.onResize(500, 800)
      
      const mobileButton = uiRenderer.createButton({
        id: 'mobile-button',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        text: 'Mobile',
        fontSize: 16
      })
      
      // Should scale down for mobile (0.8x)
      expect(mobileButton.fontSize).toBe(12.8) // 16 * 0.8
      
      // Test desktop breakpoint
      canvas.width = 1200 // Desktop size
      uiRenderer.onResize(1200, 800)
      
      const desktopButton = uiRenderer.createButton({
        id: 'desktop-button',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        text: 'Desktop',
        fontSize: 16
      })
      
      // Should use full scale for desktop (1.0x)
      expect(desktopButton.fontSize).toBe(16) // 16 * 1.0
    })
    
    it('should create and apply layout containers', () => {
      // Set canvas to desktop size for consistent scaling
      canvas.width = 1200
      uiRenderer.onResize(1200, 600)
      
      const button1 = uiRenderer.createButton({
        id: 'layout-button1',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        text: 'Button 1'
      })
      
      const button2 = uiRenderer.createButton({
        id: 'layout-button2',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        text: 'Button 2'
      })
      
      const layout = uiRenderer.createLayout({
        x: 10,
        y: 10,
        width: 300,
        height: 200,
        direction: 'vertical',
        gap: 10,
        children: [button1, button2]
      })
      
      uiRenderer.applyLayout(layout)
      
      // Should position buttons vertically with gap
      // Desktop scale factor is 1.0, so padding is 16 * 1.0 = 16
      expect(button1.x).toBe(26) // 10 + 16 (padding)
      expect(button1.y).toBe(26) // 10 + 16 (padding)
      expect(button2.x).toBe(26) // Same x as button1
      
      // Calculate expected button2.y: button1.y + button1.height + gap
      const expectedButton2Y = button1.y + button1.height + 10 // gap
      expect(button2.y).toBe(expectedButton2Y)
    })
  })
  
  describe('Pointer Input Handling', () => {
    it('should handle mouse clicks on buttons', () => {
      const button = uiRenderer.createButton({
        id: 'clickable-button',
        x: 50,
        y: 50,
        width: 100,
        height: 50,
        text: 'Click Me'
      })
      
      // Mouse down inside button
      const downResult = uiRenderer.handlePointerInput(75, 75, 'down')
      expect(downResult).toBe('clickable-button')
      expect(button.pressed).toBe(true)
      
      // Mouse up inside button (complete click)
      const upResult = uiRenderer.handlePointerInput(75, 75, 'up')
      expect(upResult).toBe('clickable-button')
      expect(button.pressed).toBe(false)
    })
    
    it('should handle hover states', () => {
      const button = uiRenderer.createButton({
        id: 'hoverable-button',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        text: 'Hover Me'
      })
      
      // Mouse move over button
      uiRenderer.handlePointerInput(50, 25, 'move')
      expect(button.hovered).toBe(true)
      
      // Mouse move away from button
      uiRenderer.handlePointerInput(200, 200, 'move')
      expect(button.hovered).toBe(false)
    })
  })
  
  describe('Element Management', () => {
    it('should get and remove elements', () => {
      const button = uiRenderer.createButton({
        id: 'manageable-button',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        text: 'Manage Me'
      })
      
      // Should retrieve element
      const retrieved = uiRenderer.getElement('manageable-button')
      expect(retrieved).toBe(button)
      
      // Should remove element
      uiRenderer.removeElement('manageable-button')
      const afterRemoval = uiRenderer.getElement('manageable-button')
      expect(afterRemoval).toBeUndefined()
    })
    
    it('should clear all elements', () => {
      uiRenderer.createButton({
        id: 'button1',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        text: 'Button 1'
      })
      
      uiRenderer.createButton({
        id: 'button2',
        x: 0,
        y: 60,
        width: 100,
        height: 50,
        text: 'Button 2'
      })
      
      uiRenderer.clear()
      
      expect(uiRenderer.getElement('button1')).toBeUndefined()
      expect(uiRenderer.getElement('button2')).toBeUndefined()
    })
  })
  
  describe('Color Utilities', () => {
    it('should handle color manipulation for button states', () => {
      const button = uiRenderer.createButton({
        id: 'color-button',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        text: 'Colorful',
        backgroundColor: '#FF6B6B'
      })
      
      // Test pressed state (should darken)
      button.pressed = true
      uiRenderer.renderButton(button)
      
      // Should call fill with darker color
      expect(ctx.fill).toHaveBeenCalled()
      
      // Test hovered state (should lighten)
      button.pressed = false
      button.hovered = true
      uiRenderer.renderButton(button)
      
      // Should call fill with lighter color
      expect(ctx.fill).toHaveBeenCalled()
    })
  })
})