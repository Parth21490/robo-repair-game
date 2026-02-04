/**
 * Property-based tests for UI Accessibility Compliance
 * **Feature: robo-pet-repair-shop, Property 6: UI Accessibility Consistency**
 * **Validates: Requirements 4.1, 4.2, 4.4, 4.5**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { UIRenderer, ButtonElement, TextElement, AccessibilityOptions } from '../../src/rendering/UIRenderer'

// Mock Canvas and Context for property tests
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

// Generators for property-based testing
const buttonPropsGenerator = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  x: fc.integer({ min: 0, max: 1000 }),
  y: fc.integer({ min: 0, max: 1000 }),
  width: fc.integer({ min: 10, max: 300 }),
  height: fc.integer({ min: 10, max: 100 }),
  text: fc.string({ minLength: 1, maxLength: 50 }),
  fontSize: fc.integer({ min: 8, max: 48 })
})

const textPropsGenerator = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  x: fc.integer({ min: 0, max: 1000 }),
  y: fc.integer({ min: 0, max: 1000 }),
  width: fc.integer({ min: 10, max: 500 }),
  height: fc.integer({ min: 10, max: 200 }),
  text: fc.string({ minLength: 1, maxLength: 100 }),
  fontSize: fc.integer({ min: 8, max: 48 })
})

const accessibilityOptionsGenerator = fc.record({
  highContrast: fc.boolean(),
  largeText: fc.boolean(),
  reducedMotion: fc.boolean(),
  keyboardNavigation: fc.boolean(),
  screenReaderSupport: fc.boolean()
})

const canvasSizeGenerator = fc.record({
  width: fc.integer({ min: 320, max: 2560 }), // Mobile to desktop
  height: fc.integer({ min: 240, max: 1440 })
})

describe('UI Accessibility Property Tests', () => {
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
  
  /**
   * Property 6: UI Accessibility Consistency
   * For any interactive element in the game, it should meet accessibility requirements 
   * (large size, high contrast, keyboard navigation, touch/mouse support) and provide 
   * audio narration when available.
   */
  describe('Property 6: UI Accessibility Consistency', () => {
    it('should enforce minimum touch target sizes for all buttons', () => {
      fc.assert(
        fc.property(buttonPropsGenerator, (props) => {
          const button = uiRenderer.createButton(props)
          
          // WCAG 2.1 AA requires minimum 44x44px touch targets
          expect(button.width).toBeGreaterThanOrEqual(44)
          expect(button.height).toBeGreaterThanOrEqual(44)
          
          // For children's games, we enforce even larger minimum sizes
          expect(button.width).toBeGreaterThanOrEqual(120)
          expect(button.height).toBeGreaterThanOrEqual(44)
        }),
        { numRuns: 15 } // Reduced from 100 as requested
      )
    })
    
    it('should provide high contrast colors when accessibility option is enabled', () => {
      fc.assert(
        fc.property(
          buttonPropsGenerator,
          accessibilityOptionsGenerator,
          (buttonProps, accessibilityOptions) => {
            // Set canvas to desktop size for consistent scaling
            canvas.width = 1200
            uiRenderer.onResize(1200, 600)
            
            uiRenderer.setAccessibilityOptions(accessibilityOptions)
            const button = uiRenderer.createButton(buttonProps)
            
            if (accessibilityOptions.highContrast) {
              // High contrast mode should use black/white/high contrast colors
              const highContrastColors = ['#000000', '#FFFFFF', '#00AA00', '#FF8800', '#CC0000', '#0066CC', '#FFFF00', '#F0F0F0']
              expect(highContrastColors).toContain(button.backgroundColor)
              expect(highContrastColors).toContain(button.textColor)
            } else {
              // Normal mode should use child-friendly bright colors
              const childFriendlyColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726', '#EF5350', '#9B59B6', '#F39C12', '#FFFFFF', '#2C3E50']
              expect(childFriendlyColors).toContain(button.backgroundColor)
            }
          }
        ),
        { numRuns: 15 }
      )
    })
    
    it('should scale elements appropriately for large text accessibility option', () => {
      fc.assert(
        fc.property(
          buttonPropsGenerator,
          fc.boolean(),
          (buttonProps, largeTextEnabled) => {
            // Set canvas to desktop size for consistent scaling
            canvas.width = 1200
            uiRenderer.onResize(1200, 600)
            
            uiRenderer.setAccessibilityOptions({ largeText: largeTextEnabled })
            const button = uiRenderer.createButton(buttonProps)
            
            const expectedScaleFactor = largeTextEnabled ? 1.25 : 1.0
            const expectedFontSize = (buttonProps.fontSize || 18) * expectedScaleFactor
            
            expect(button.fontSize).toBeCloseTo(expectedFontSize, 1)
          }
        ),
        { numRuns: 15 }
      )
    })
    
    it('should support keyboard navigation for all interactive elements', () => {
      fc.assert(
        fc.property(
          fc.array(buttonPropsGenerator, { minLength: 1, maxLength: 5 }),
          (buttonPropsArray) => {
            // Set canvas to desktop size for consistent scaling
            canvas.width = 1200
            uiRenderer.onResize(1200, 600)
            
            // Clear any existing elements
            uiRenderer.clear()
            
            // Create multiple buttons with unique IDs
            const buttons = buttonPropsArray.map((props, index) => 
              uiRenderer.createButton({ ...props, id: `button-${index}` })
            )
            
            // All buttons should be interactive
            buttons.forEach(button => {
              expect(button.interactive).toBe(true)
            })
            
            // Tab navigation should work
            const tabHandled = uiRenderer.handleKeyboardInput('Tab')
            expect(tabHandled).toBe(true)
            
            // At least one button should be focused after tab
            const focusedButtons = buttons.filter(button => button.focused)
            expect(focusedButtons.length).toBe(1)
            
            // Enter key should activate focused button
            const enterHandled = uiRenderer.handleKeyboardInput('Enter')
            expect(enterHandled).toBe(true)
          }
        ),
        { numRuns: 10 }
      )
    })
    
    it('should provide consistent touch and mouse support', () => {
      fc.assert(
        fc.property(buttonPropsGenerator, (props) => {
          // Set canvas to desktop size for consistent scaling
          canvas.width = 1200
          uiRenderer.onResize(1200, 600)
          
          // Clear any existing elements
          uiRenderer.clear()
          
          // Create button with fixed ID
          const buttonId = 'test-button'
          const button = uiRenderer.createButton({ ...props, id: buttonId })
          
          // Test mouse/touch down
          const centerX = button.x + button.width / 2
          const centerY = button.y + button.height / 2
          
          const downResult = uiRenderer.handlePointerInput(centerX, centerY, 'down')
          expect(downResult).toBe(buttonId)
          expect(button.pressed).toBe(true)
          
          // Test mouse/touch up
          const upResult = uiRenderer.handlePointerInput(centerX, centerY, 'up')
          expect(upResult).toBe(buttonId)
          expect(button.pressed).toBe(false)
          
          // Test hover
          uiRenderer.handlePointerInput(centerX, centerY, 'move')
          expect(button.hovered).toBe(true)
        }),
        { numRuns: 15 }
      )
    })
    
    it('should use child-friendly fonts and styling consistently', () => {
      fc.assert(
        fc.property(
          fc.oneof(buttonPropsGenerator, textPropsGenerator),
          (props) => {
            let element: ButtonElement | TextElement
            
            if ('text' in props && Math.random() > 0.5) {
              element = uiRenderer.createButton(props as any)
            } else {
              element = uiRenderer.createText(props as any)
            }
            
            // Should use child-friendly fonts
            if ('fontFamily' in element) {
              expect(element.fontFamily).toMatch(/Comic Sans MS|Bubblegum Sans|cursive/)
            }
            
            // Should have shadow enabled for readability
            if ('shadowEnabled' in element) {
              expect(element.shadowEnabled).toBe(true)
            }
            
            // Should have accessibility label
            if ('accessibilityLabel' in element) {
              expect(element.accessibilityLabel).toBeDefined()
              expect(element.accessibilityLabel).toBeTruthy()
            }
          }
        ),
        { numRuns: 15 }
      )
    })
    
    it('should adapt to different screen sizes responsively', () => {
      fc.assert(
        fc.property(
          canvasSizeGenerator,
          buttonPropsGenerator,
          (canvasSize, buttonProps) => {
            // Update canvas size
            canvas.width = canvasSize.width
            canvas.height = canvasSize.height
            uiRenderer.onResize(canvasSize.width, canvasSize.height)
            
            const button = uiRenderer.createButton(buttonProps)
            
            // Determine expected breakpoint
            let expectedScaleFactor = 1.0
            if (canvasSize.width <= 768) {
              expectedScaleFactor = 0.8 // Mobile
            } else if (canvasSize.width <= 1024) {
              expectedScaleFactor = 0.9 // Tablet
            } else {
              expectedScaleFactor = 1.0 // Desktop
            }
            
            const expectedFontSize = (buttonProps.fontSize || 18) * expectedScaleFactor
            expect(button.fontSize).toBeCloseTo(expectedFontSize, 1)
            
            // Touch targets should still meet minimum requirements even on mobile
            expect(button.width).toBeGreaterThanOrEqual(44 * expectedScaleFactor)
            expect(button.height).toBeGreaterThanOrEqual(44 * expectedScaleFactor)
          }
        ),
        { numRuns: 15 }
      )
    })
    
    it('should maintain focus indicators visibility', () => {
      fc.assert(
        fc.property(buttonPropsGenerator, (props) => {
          const button = uiRenderer.createButton(props)
          
          // Set focus
          uiRenderer.setFocus(button.id)
          expect(button.focused).toBe(true)
          
          // Render button to test focus indicator
          uiRenderer.renderButton(button)
          
          // Should draw focus indicator (dashed line)
          expect(ctx.setLineDash).toHaveBeenCalledWith([5, 5])
          expect(ctx.stroke).toHaveBeenCalled()
          
          // Focus indicator should be visible (bright color)
          expect(ctx.strokeStyle).toBe('#F39C12') // Highlight color
        }),
        { numRuns: 15 }
      )
    })
    
    it('should provide consistent color contrast ratios', () => {
      fc.assert(
        fc.property(
          buttonPropsGenerator,
          fc.boolean(),
          (props, highContrast) => {
            uiRenderer.setAccessibilityOptions({ highContrast })
            const button = uiRenderer.createButton(props)
            
            if (highContrast) {
              // High contrast mode should use maximum contrast combinations
              const isHighContrastCombo = 
                (button.backgroundColor === '#000000' && button.textColor === '#F0F0F0') ||
                (button.backgroundColor === '#FFFFFF' && button.textColor === '#000000') ||
                (button.backgroundColor === '#00AA00' && button.textColor === '#F0F0F0') ||
                (button.backgroundColor === '#CC0000' && button.textColor === '#F0F0F0')
              
              expect(isHighContrastCombo).toBe(true)
            } else {
              // Normal mode should still provide good contrast
              // Bright backgrounds should have dark or white text
              const brightBackgrounds = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726', '#F39C12']
              if (brightBackgrounds.includes(button.backgroundColor)) {
                expect(['#FFFFFF', '#2C3E50']).toContain(button.textColor)
              }
            }
          }
        ),
        { numRuns: 15 }
      )
    })
    
    it('should handle edge cases in element positioning and sizing', () => {
      fc.assert(
        fc.property(
          fc.record({
            x: fc.integer({ min: -100, max: 2000 }),
            y: fc.integer({ min: -100, max: 2000 }),
            width: fc.integer({ min: 1, max: 1000 }),
            height: fc.integer({ min: 1, max: 1000 })
          }),
          (bounds) => {
            const button = uiRenderer.createButton({
              id: 'edge-case-button',
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height,
              text: 'Edge Case'
            })
            
            // Should handle any position values
            expect(button.x).toBe(bounds.x)
            expect(button.y).toBe(bounds.y)
            
            // Should enforce minimum sizes regardless of input
            expect(button.width).toBeGreaterThanOrEqual(120)
            expect(button.height).toBeGreaterThanOrEqual(44)
            
            // Should be able to render without errors
            expect(() => uiRenderer.renderButton(button)).not.toThrow()
          }
        ),
        { numRuns: 15 }
      )
    })
  })
})