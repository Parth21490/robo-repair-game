/**
 * Test setup for Vitest
 * Configures the testing environment for Robo-Pet Repair Shop
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

// Mock DOM APIs that might not be available in test environment
beforeAll(() => {
  // Mock Canvas API
  global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    roundRect: vi.fn(),
    canvas: {
      width: 800,
      height: 600,
    },
  }))
  
  // Mock WebGL API
  const mockWebGLContext = {
    viewport: vi.fn(),
    enable: vi.fn(),
    blendFunc: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    createShader: vi.fn(() => ({})),
    createProgram: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    useProgram: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getProgramParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    getProgramInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),
    deleteProgram: vi.fn(),
    getParameter: vi.fn((param) => {
      // Mock common WebGL parameters
      if (param === 0x0D33) return 4096 // MAX_TEXTURE_SIZE
      return 0
    }),
    activeTexture: vi.fn(),
    bindTexture: vi.fn(),
    bindBuffer: vi.fn(),
    // WebGL constants
    BLEND: 0x0BE2,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    COLOR_BUFFER_BIT: 0x00004000,
    COMPILE_STATUS: 0x8B81,
    LINK_STATUS: 0x8B82,
    MAX_TEXTURE_SIZE: 0x0D33,
    TEXTURE0: 0x84C0,
    TEXTURE_2D: 0x0DE1,
    ARRAY_BUFFER: 0x8892,
    ELEMENT_ARRAY_BUFFER: 0x8893,
  }

  // Mock Canvas getContext to return WebGL context when requested
  const originalGetContext = global.HTMLCanvasElement.prototype.getContext
  global.HTMLCanvasElement.prototype.getContext = vi.fn((contextType, options) => {
    if (contextType === 'webgl' || contextType === 'experimental-webgl') {
      return mockWebGLContext
    }
    return originalGetContext.call(this, contextType, options)
  })

  // Mock Web Audio API
  global.AudioContext = vi.fn(() => ({
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      gain: { value: 1 },
    })),
    createOscillator: vi.fn(() => ({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 440 },
      type: 'sine',
    })),
    createBufferSource: vi.fn(() => ({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      buffer: null,
      loop: false,
      playbackRate: { value: 1 },
      onended: null,
    })),
    createStereoPanner: vi.fn(() => ({
      connect: vi.fn(),
      pan: { value: 0 },
    })),
    createBiquadFilter: vi.fn(() => ({
      connect: vi.fn(),
      type: 'lowpass',
      frequency: { value: 350 },
    })),
    decodeAudioData: vi.fn(() => Promise.resolve({})),
    destination: {},
    currentTime: 0,
    state: 'running',
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  }))
  
  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn((callback) => {
    return setTimeout(callback, 16) // ~60fps
  })
  
  global.cancelAnimationFrame = vi.fn((id) => {
    clearTimeout(id)
  })
  
  // Mock performance API
  global.performance = {
    ...global.performance,
    now: vi.fn(() => Date.now()),
  }
  
  // Mock navigator.vibrate
  Object.defineProperty(global.navigator, 'vibrate', {
    value: vi.fn(),
    writable: true,
  })
  
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  }
  
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })
  
  // Mock fetch for audio loading
  global.fetch = vi.fn(() =>
    Promise.resolve({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    })
  )
  
  console.log('🧪 Test environment setup complete')
})

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  vi.clearAllMocks()
  
  // Clean up DOM
  document.body.innerHTML = ''
  
  // Reset any global state
  if (global.localStorage) {
    global.localStorage.clear()
  }
})

// Global test utilities
declare global {
  var testUtils: {
    createMockCanvas: () => HTMLCanvasElement
    createMockAudioContext: () => AudioContext
    waitForNextFrame: () => Promise<void>
    simulatePointerEvent: (element: HTMLElement, type: string, x: number, y: number) => void
  }
}

global.testUtils = {
  /**
   * Create a mock canvas element for testing
   */
  createMockCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    return canvas
  },
  
  /**
   * Create a mock AudioContext for testing
   */
  createMockAudioContext(): AudioContext {
    return new AudioContext()
  },
  
  /**
   * Wait for the next animation frame
   */
  async waitForNextFrame(): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => resolve())
    })
  },
  
  /**
   * Simulate a pointer event on an element
   */
  simulatePointerEvent(element: HTMLElement, type: string, x: number, y: number): void {
    const event = new PointerEvent(type, {
      clientX: x,
      clientY: y,
      bubbles: true,
    })
    element.dispatchEvent(event)
  },
}