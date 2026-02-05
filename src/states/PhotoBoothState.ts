/**
 * Photo Booth State - Photo capture and editing for completed Robo-Pets
 * Allows players to take pictures with backgrounds, props, and editing tools
 * Saves photos to local gallery storage for sharing achievements
 */

import { BaseGameState } from '@/engine/GameState'
import { Renderer } from '@/rendering/Renderer'
import { InputEvent, ClickableElement } from '@/input/InputHandler'
import { AudioManager } from '@/audio/AudioManager'
import { RobotPet } from '@/pets/RobotPet'
import { Vector2D, AgeGroup } from '@/pets/types'

export interface PhotoBoothBackground {
  id: string
  name: string
  imageUrl: string
  thumbnail: string
  category: 'nature' | 'space' | 'workshop' | 'fantasy' | 'city'
  isUnlocked: boolean
  unlockRequirement?: string
}

export interface PhotoBoothProp {
  id: string
  name: string
  icon: string
  type: 'decoration' | 'toy' | 'tool' | 'effect'
  position: Vector2D
  scale: number
  rotation: number
  isPlaced: boolean
  isUnlocked: boolean
  category: 'basic' | 'premium' | 'special'
}

export interface PhotoFilter {
  id: string
  name: string
  displayName: string
  intensity: number
  isActive: boolean
  category: 'color' | 'artistic' | 'fun'
}

export interface PhotoFrame {
  id: string
  name: string
  displayName: string
  borderWidth: number
  borderColor: string
  pattern: 'solid' | 'dashed' | 'decorative'
  isSelected: boolean
}
export interface PhotoSticker {
  id: string
  name: string
  emoji: string
  position: Vector2D
  scale: number
  rotation: number
  isPlaced: boolean
  category: 'emoji' | 'shapes' | 'text'
}

export interface PetPose {
  id: string
  name: string
  displayName: string
  animationFrame: number
  isSelected: boolean
}

export interface PhotoData {
  id: string
  petId: string
  backgroundId: string
  props: PhotoBoothProp[]
  stickers: PhotoSticker[]
  filters: PhotoFilter[]
  frame?: PhotoFrame
  petPosition: Vector2D
  petPose: PetPose
  timestamp: Date
  imageBlob?: Blob
  thumbnail?: Blob
}

export interface PhotoBoothProgress {
  photosTaken: number
  backgroundsUnlocked: number
  propsUnlocked: number
  filtersUnlocked: number
  currentPhoto?: PhotoData
  isCapturing: boolean
  isEditing: boolean
}

export type PhotoBoothPanel = 'backgrounds' | 'props' | 'poses' | 'filters' | 'stickers' | 'frames' | 'gallery'

export class PhotoBoothState extends BaseGameState {
  public readonly name = 'PhotoBooth'
  
  private currentPet: RobotPet | null = null
  private ageGroup: AgeGroup = AgeGroup.MIDDLE
  private progress: PhotoBoothProgress
  
  // Photo booth assets
  private backgrounds: PhotoBoothBackground[] = []
  private props: PhotoBoothProp[] = []
  private filters: PhotoFilter[] = []
  private frames: PhotoFrame[] = []
  private stickers: PhotoSticker[] = []
  private poses: PetPose[] = []
  
  // Current selections
  private selectedBackground: PhotoBoothBackground | null = null
  private selectedPose: PetPose | null = null
  private selectedFrame: PhotoFrame | null = null
  private activeFilters: PhotoFilter[] = []
  private placedProps: PhotoBoothProp[] = []
  private placedStickers: PhotoSticker[] = []
  
  // UI state
  private currentPanel: PhotoBoothPanel = 'backgrounds'
  private animationTime: number = 0
  private petPosition: Vector2D = { x: 400, y: 300 }
  private isDraggingPet: boolean = false
  private dragOffset: Vector2D = { x: 0, y: 0 }
  
  // UI elements and areas
  private photoArea: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 0, height: 0 }
  private panelArea: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 0, height: 0 }
  private toolbarArea: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 0, height: 0 }
  
  // Control buttons
  private captureButton: ClickableElement | null = null
  private saveButton: ClickableElement | null = null
  private resetButton: ClickableElement | null = null
  private backButton: ClickableElement | null = null
  private galleryButton: ClickableElement | null = null
  
  // Audio system
  private audioManager?: AudioManager
  
  constructor(audioManager?: AudioManager) {
    super()
    this.audioManager = audioManager
    
    this.progress = {
      photosTaken: 0,
      backgroundsUnlocked: 0,
      propsUnlocked: 0,
      filtersUnlocked: 0,
      isCapturing: false,
      isEditing: false
    }
  }
  
  /**
   * Initialize photo booth session with a pet and age group
   */
  public initializePhotoBooth(pet: RobotPet, ageGroup: AgeGroup): void {
    this.currentPet = pet
    this.ageGroup = ageGroup
    
    // Reset progress
    this.progress = {
      photosTaken: 0,
      backgroundsUnlocked: 0,
      propsUnlocked: 0,
      filtersUnlocked: 0,
      isCapturing: false,
      isEditing: false
    }
    
    // Set up photo booth assets
    this.setupBackgrounds()
    this.setupProps()
    this.setupFilters()
    this.setupFrames()
    this.setupStickers()
    this.setupPoses()
    
    // Set default selections
    this.selectedBackground = this.backgrounds.find(b => b.isUnlocked) || this.backgrounds[0]
    this.selectedPose = this.poses[0]
    
    console.log(`Photo booth initialized for ${pet.name} (${ageGroup})`)
  }
  protected onEnter(): void {
    console.log('Entered Photo Booth State')
    
    if (!this.currentPet) {
      console.error('No pet assigned to photo booth state')
      return
    }
    
    // Reset state
    this.animationTime = 0
    this.currentPanel = 'backgrounds'
    this.isDraggingPet = false
    this.progress.isCapturing = false
    this.progress.isEditing = false
    
    // Set up UI elements
    this.setupUI()
    
    // Play entry audio
    if (this.audioManager) {
      try {
        this.audioManager.playSound('photo_booth_start', { volume: 0.6 })
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
    
    // Show initial guidance
    this.showInitialGuidance()
  }
  
  protected onUpdate(deltaTime: number): void {
    this.animationTime += deltaTime
    
    // Update animations
    this.updateAnimations(deltaTime)
    
    // Update pet position if dragging
    if (this.isDraggingPet) {
      this.updatePetDragging()
    }
  }
  
  protected onRender(renderer: Renderer): void {
    const ctx = renderer.getContext()
    const { width, height } = ctx.canvas
    
    // Clear background
    this.drawBackground(ctx, width, height)
    
    // Draw photo area with background
    this.drawPhotoArea(ctx, width, height)
    
    // Draw pet in photo area
    this.drawPetInPhoto(ctx, width, height)
    
    // Draw placed props and stickers
    this.drawPlacedItems(ctx, width, height)
    
    // Draw active filters and frame
    this.drawFiltersAndFrame(ctx, width, height)
    
    // Draw UI panels
    this.drawUIPanel(ctx, width, height)
    
    // Draw toolbar
    this.drawToolbar(ctx, width, height)
    
    // Draw control buttons
    this.drawControlButtons(ctx, width, height)
    
    // Draw debug info in development
    if (import.meta.env.DEV) {
      this.drawDebugInfo(ctx, width, height)
    }
  }
  
  protected onExit(): void {
    console.log('Exited Photo Booth State')
    
    // Save any pending work
    this.saveCurrentPhoto()
  }
  
  protected onHandleInput(input: InputEvent): boolean {
    // Handle pointer input
    if (input.type === 'pointer_down' && input.x !== undefined && input.y !== undefined) {
      return this.handlePointerDown(input.x, input.y)
    }
    
    if (input.type === 'pointer_move' && input.x !== undefined && input.y !== undefined) {
      return this.handlePointerMove(input.x, input.y)
    }
    
    if (input.type === 'pointer_up' && input.x !== undefined && input.y !== undefined) {
      return this.handlePointerUp(input.x, input.y)
    }
    
    // Handle keyboard input
    if (input.type === 'key_down') {
      return this.handleKeyDown(input.key || '')
    }
    
    return false
  }
  
  /**
   * Set up photo booth backgrounds
   */
  private setupBackgrounds(): void {
    this.backgrounds = [
      {
        id: 'workshop',
        name: 'Repair Workshop',
        imageUrl: '/backgrounds/workshop.jpg',
        thumbnail: '/backgrounds/workshop_thumb.jpg',
        category: 'workshop',
        isUnlocked: true
      },
      {
        id: 'nature_park',
        name: 'Nature Park',
        imageUrl: '/backgrounds/nature_park.jpg',
        thumbnail: '/backgrounds/nature_park_thumb.jpg',
        category: 'nature',
        isUnlocked: true
      },
      {
        id: 'space_station',
        name: 'Space Station',
        imageUrl: '/backgrounds/space_station.jpg',
        thumbnail: '/backgrounds/space_station_thumb.jpg',
        category: 'space',
        isUnlocked: this.progress.photosTaken >= 3
      },
      {
        id: 'fantasy_castle',
        name: 'Fantasy Castle',
        imageUrl: '/backgrounds/fantasy_castle.jpg',
        thumbnail: '/backgrounds/fantasy_castle_thumb.jpg',
        category: 'fantasy',
        isUnlocked: this.progress.photosTaken >= 5,
        unlockRequirement: 'Take 5 photos'
      },
      {
        id: 'city_skyline',
        name: 'City Skyline',
        imageUrl: '/backgrounds/city_skyline.jpg',
        thumbnail: '/backgrounds/city_skyline_thumb.jpg',
        category: 'city',
        isUnlocked: this.progress.photosTaken >= 10,
        unlockRequirement: 'Take 10 photos'
      }
    ]
  }
  
  /**
   * Set up photo booth props
   */
  private setupProps(): void {
    const baseProps = [
      // Basic decorations
      { id: 'balloons', name: 'Balloons', icon: '🎈', type: 'decoration', category: 'basic' },
      { id: 'confetti', name: 'Confetti', icon: '🎊', type: 'effect', category: 'basic' },
      { id: 'party_hat', name: 'Party Hat', icon: '🎉', type: 'decoration', category: 'basic' },
      
      // Toys
      { id: 'teddy_bear', name: 'Teddy Bear', icon: '🧸', type: 'toy', category: 'basic' },
      { id: 'rubber_duck', name: 'Rubber Duck', icon: '🦆', type: 'toy', category: 'basic' },
      { id: 'toy_car', name: 'Toy Car', icon: '🚗', type: 'toy', category: 'premium' },
      
      // Tools (thematic)
      { id: 'wrench', name: 'Wrench', icon: '🔧', type: 'tool', category: 'basic' },
      { id: 'gear', name: 'Gear', icon: '⚙️', type: 'tool', category: 'basic' },
      { id: 'toolbox', name: 'Toolbox', icon: '🧰', type: 'tool', category: 'premium' },
      
      // Special effects
      { id: 'sparkles', name: 'Sparkles', icon: '✨', type: 'effect', category: 'premium' },
      { id: 'rainbow', name: 'Rainbow', icon: '🌈', type: 'effect', category: 'special' },
      { id: 'fireworks', name: 'Fireworks', icon: '🎆', type: 'effect', category: 'special' }
    ]
    
    this.props = baseProps.map(prop => ({
      ...prop,
      position: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
      isPlaced: false,
      isUnlocked: this.getPropUnlockStatus(prop.category as 'basic' | 'premium' | 'special')
    }))
  }
  /**
   * Set up photo filters
   */
  private setupFilters(): void {
    this.filters = [
      // Color filters
      { id: 'none', name: 'none', displayName: 'Original', intensity: 0, isActive: true, category: 'color' },
      { id: 'sepia', name: 'sepia', displayName: 'Vintage', intensity: 0.8, isActive: false, category: 'color' },
      { id: 'grayscale', name: 'grayscale', displayName: 'Black & White', intensity: 1.0, isActive: false, category: 'color' },
      { id: 'warm', name: 'warm', displayName: 'Warm', intensity: 0.6, isActive: false, category: 'color' },
      { id: 'cool', name: 'cool', displayName: 'Cool', intensity: 0.6, isActive: false, category: 'color' },
      
      // Artistic filters
      { id: 'blur', name: 'blur', displayName: 'Soft Focus', intensity: 0.5, isActive: false, category: 'artistic' },
      { id: 'sharpen', name: 'sharpen', displayName: 'Sharp', intensity: 0.7, isActive: false, category: 'artistic' },
      { id: 'emboss', name: 'emboss', displayName: 'Emboss', intensity: 0.8, isActive: false, category: 'artistic' },
      
      // Fun filters
      { id: 'rainbow', name: 'rainbow', displayName: 'Rainbow', intensity: 0.9, isActive: false, category: 'fun' },
      { id: 'neon', name: 'neon', displayName: 'Neon Glow', intensity: 0.8, isActive: false, category: 'fun' },
      { id: 'sparkle', name: 'sparkle', displayName: 'Sparkle', intensity: 0.7, isActive: false, category: 'fun' }
    ]
  }
  
  /**
   * Set up photo frames
   */
  private setupFrames(): void {
    this.frames = [
      { id: 'none', name: 'none', displayName: 'No Frame', borderWidth: 0, borderColor: '', pattern: 'solid', isSelected: true },
      { id: 'simple_black', name: 'simple_black', displayName: 'Simple Black', borderWidth: 8, borderColor: '#000000', pattern: 'solid', isSelected: false },
      { id: 'simple_white', name: 'simple_white', displayName: 'Simple White', borderWidth: 8, borderColor: '#FFFFFF', pattern: 'solid', isSelected: false },
      { id: 'colorful', name: 'colorful', displayName: 'Colorful', borderWidth: 12, borderColor: '#FF6B6B', pattern: 'solid', isSelected: false },
      { id: 'dashed', name: 'dashed', displayName: 'Dashed', borderWidth: 6, borderColor: '#4ECDC4', pattern: 'dashed', isSelected: false },
      { id: 'decorative', name: 'decorative', displayName: 'Decorative', borderWidth: 16, borderColor: '#FFD700', pattern: 'decorative', isSelected: false }
    ]
  }
  
  /**
   * Set up photo stickers
   */
  private setupStickers(): void {
    const emojiStickers = [
      '⭐', '❤️', '😊', '🎉', '🌟', '💎', '🔥', '⚡', '🌈', '🎈',
      '🎊', '🎁', '🏆', '👑', '💫', '🌸', '🦋', '🐾', '🎵', '💝'
    ]
    
    const shapeStickers = [
      '●', '■', '▲', '♦', '★', '♥', '♠', '♣', '♪', '☀'
    ]
    
    this.stickers = [
      ...emojiStickers.map((emoji, index) => ({
        id: `emoji_${index}`,
        name: `emoji_${index}`,
        emoji,
        position: { x: 0, y: 0 },
        scale: 1,
        rotation: 0,
        isPlaced: false,
        category: 'emoji' as const
      })),
      ...shapeStickers.map((emoji, index) => ({
        id: `shape_${index}`,
        name: `shape_${index}`,
        emoji,
        position: { x: 0, y: 0 },
        scale: 1,
        rotation: 0,
        isPlaced: false,
        category: 'shapes' as const
      }))
    ]
  }
  
  /**
   * Set up pet poses
   */
  private setupPoses(): void {
    this.poses = [
      { id: 'default', name: 'default', displayName: 'Default', animationFrame: 0, isSelected: true },
      { id: 'happy', name: 'happy', displayName: 'Happy', animationFrame: 1, isSelected: false },
      { id: 'excited', name: 'excited', displayName: 'Excited', animationFrame: 2, isSelected: false },
      { id: 'playful', name: 'playful', displayName: 'Playful', animationFrame: 3, isSelected: false },
      { id: 'proud', name: 'proud', displayName: 'Proud', animationFrame: 4, isSelected: false },
      { id: 'sleepy', name: 'sleepy', displayName: 'Sleepy', animationFrame: 5, isSelected: false }
    ]
  }
  
  /**
   * Set up UI elements
   */
  private setupUI(): void {
    const canvasWidth = 800 // Default width
    const canvasHeight = 600 // Default height
    
    // Photo area (center-left)
    this.photoArea = {
      x: 50,
      y: 50,
      width: 400,
      height: 300
    }
    
    // Panel area (right side)
    this.panelArea = {
      x: 470,
      y: 50,
      width: 300,
      height: 400
    }
    
    // Toolbar area (bottom)
    this.toolbarArea = {
      x: 50,
      y: 370,
      width: 400,
      height: 60
    }
    
    // Control buttons
    this.captureButton = {
      x: canvasWidth - 200,
      y: canvasHeight - 100,
      width: 150,
      height: 40,
      id: 'capture_button',
      callback: () => this.capturePhoto(),
      isEnabled: true,
      ariaLabel: 'Capture photo'
    }
    
    this.saveButton = {
      x: canvasWidth - 200,
      y: canvasHeight - 150,
      width: 150,
      height: 40,
      id: 'save_button',
      callback: () => this.savePhoto(),
      isEnabled: false,
      ariaLabel: 'Save photo'
    }
    
    this.resetButton = {
      x: canvasWidth - 370,
      y: canvasHeight - 100,
      width: 150,
      height: 40,
      id: 'reset_button',
      callback: () => this.resetPhoto(),
      isEnabled: true,
      ariaLabel: 'Reset photo'
    }
    
    this.galleryButton = {
      x: canvasWidth - 370,
      y: canvasHeight - 150,
      width: 150,
      height: 40,
      id: 'gallery_button',
      callback: () => this.showGallery(),
      isEnabled: true,
      ariaLabel: 'View gallery'
    }
    
    this.backButton = {
      x: 20,
      y: canvasHeight - 60,
      width: 100,
      height: 40,
      id: 'back_button',
      callback: () => this.goBack(),
      isEnabled: true,
      ariaLabel: 'Go back'
    }
  }
  /**
   * Handle pointer down events
   */
  private handlePointerDown(x: number, y: number): boolean {
    // Check UI buttons first
    if (this.captureButton && this.isPointInBounds(x, y, this.captureButton)) {
      this.captureButton.callback({ type: 'pointer_down', x, y, timestamp: performance.now() })
      return true
    }
    
    if (this.saveButton && this.saveButton.isEnabled && this.isPointInBounds(x, y, this.saveButton)) {
      this.saveButton.callback({ type: 'pointer_down', x, y, timestamp: performance.now() })
      return true
    }
    
    if (this.resetButton && this.isPointInBounds(x, y, this.resetButton)) {
      this.resetButton.callback({ type: 'pointer_down', x, y, timestamp: performance.now() })
      return true
    }
    
    if (this.galleryButton && this.isPointInBounds(x, y, this.galleryButton)) {
      this.galleryButton.callback({ type: 'pointer_down', x, y, timestamp: performance.now() })
      return true
    }
    
    if (this.backButton && this.isPointInBounds(x, y, this.backButton)) {
      this.backButton.callback({ type: 'pointer_down', x, y, timestamp: performance.now() })
      return true
    }
    
    // Check panel tabs
    if (this.isPointInPanelTab(x, y, 'backgrounds')) {
      this.currentPanel = 'backgrounds'
      return true
    }
    if (this.isPointInPanelTab(x, y, 'props')) {
      this.currentPanel = 'props'
      return true
    }
    if (this.isPointInPanelTab(x, y, 'poses')) {
      this.currentPanel = 'poses'
      return true
    }
    if (this.isPointInPanelTab(x, y, 'filters')) {
      this.currentPanel = 'filters'
      return true
    }
    if (this.isPointInPanelTab(x, y, 'stickers')) {
      this.currentPanel = 'stickers'
      return true
    }
    if (this.isPointInPanelTab(x, y, 'frames')) {
      this.currentPanel = 'frames'
      return true
    }
    
    // Check panel content interactions
    if (this.isPointInBounds(x, y, this.panelArea)) {
      return this.handlePanelInteraction(x, y)
    }
    
    // Check pet dragging in photo area
    if (this.isPointInBounds(x, y, this.photoArea)) {
      const petBounds = this.getPetBounds()
      if (this.isPointInBounds(x, y, petBounds)) {
        this.isDraggingPet = true
        this.dragOffset = {
          x: x - this.petPosition.x,
          y: y - this.petPosition.y
        }
        return true
      }
      
      // Check for placed props/stickers interaction
      return this.handlePhotoAreaInteraction(x, y)
    }
    
    return false
  }
  
  /**
   * Handle pointer move events
   */
  private handlePointerMove(x: number, y: number): boolean {
    // Update pet position if dragging
    if (this.isDraggingPet) {
      this.petPosition = {
        x: x - this.dragOffset.x,
        y: y - this.dragOffset.y
      }
      
      // Keep pet within photo area bounds
      this.constrainPetToPhotoArea()
      return true
    }
    
    return false
  }
  
  /**
   * Handle pointer up events
   */
  private handlePointerUp(x: number, y: number): boolean {
    if (this.isDraggingPet) {
      this.isDraggingPet = false
      this.playSound('pet_placed')
      return true
    }
    
    return false
  }
  
  /**
   * Handle keyboard input
   */
  private handleKeyDown(key: string): boolean {
    switch (key) {
      case '1':
        this.currentPanel = 'backgrounds'
        return true
      case '2':
        this.currentPanel = 'props'
        return true
      case '3':
        this.currentPanel = 'poses'
        return true
      case '4':
        this.currentPanel = 'filters'
        return true
      case '5':
        this.currentPanel = 'stickers'
        return true
      case '6':
        this.currentPanel = 'frames'
        return true
      case 'c':
      case 'C':
        this.capturePhoto()
        return true
      case 's':
      case 'S':
        if (this.saveButton?.isEnabled) {
          this.savePhoto()
        }
        return true
      case 'r':
      case 'R':
        this.resetPhoto()
        return true
      case 'g':
      case 'G':
        this.showGallery()
        return true
      case 'Escape':
        this.goBack()
        return true
      case 'Tab':
        this.switchPanel()
        return true
      case 'ArrowLeft':
        this.movePet(-10, 0)
        return true
      case 'ArrowRight':
        this.movePet(10, 0)
        return true
      case 'ArrowUp':
        this.movePet(0, -10)
        return true
      case 'ArrowDown':
        this.movePet(0, 10)
        return true
      default:
        return false
    }
  }
  
  /**
   * Handle panel interactions
   */
  private handlePanelInteraction(x: number, y: number): boolean {
    const relativeX = x - this.panelArea.x
    const relativeY = y - this.panelArea.y
    
    switch (this.currentPanel) {
      case 'backgrounds':
        return this.handleBackgroundSelection(relativeX, relativeY)
      case 'props':
        return this.handlePropSelection(relativeX, relativeY)
      case 'poses':
        return this.handlePoseSelection(relativeX, relativeY)
      case 'filters':
        return this.handleFilterSelection(relativeX, relativeY)
      case 'stickers':
        return this.handleStickerSelection(relativeX, relativeY)
      case 'frames':
        return this.handleFrameSelection(relativeX, relativeY)
      case 'gallery':
        return this.handleGalleryInteraction(relativeX, relativeY)
      default:
        return false
    }
  }
  
  /**
   * Handle photo area interactions
   */
  private handlePhotoAreaInteraction(x: number, y: number): boolean {
    // Check placed stickers first (they're on top)
    for (let i = this.placedStickers.length - 1; i >= 0; i--) {
      const sticker = this.placedStickers[i]
      const stickerBounds = this.getStickerBounds(sticker)
      if (this.isPointInBounds(x, y, stickerBounds)) {
        // Remove sticker on click
        this.placedStickers.splice(i, 1)
        this.playSound('sticker_removed')
        return true
      }
    }
    
    // Check placed props
    for (let i = this.placedProps.length - 1; i >= 0; i--) {
      const prop = this.placedProps[i]
      const propBounds = this.getPropBounds(prop)
      if (this.isPointInBounds(x, y, propBounds)) {
        // Remove prop on click
        this.placedProps.splice(i, 1)
        this.playSound('prop_removed')
        return true
      }
    }
    
    return false
  }
  /**
   * Handle background selection
   */
  private handleBackgroundSelection(x: number, y: number): boolean {
    const itemHeight = 60
    const padding = 10
    const startY = 40 // Account for tab height
    
    const index = Math.floor((y - startY) / (itemHeight + padding))
    const unlockedBackgrounds = this.backgrounds.filter(b => b.isUnlocked)
    
    if (index >= 0 && index < unlockedBackgrounds.length) {
      this.selectedBackground = unlockedBackgrounds[index]
      this.playSound('background_selected')
      return true
    }
    
    return false
  }
  
  /**
   * Handle prop selection
   */
  private handlePropSelection(x: number, y: number): boolean {
    const itemHeight = 50
    const padding = 10
    const startY = 40
    
    const index = Math.floor((y - startY) / (itemHeight + padding))
    const unlockedProps = this.props.filter(p => p.isUnlocked)
    
    if (index >= 0 && index < unlockedProps.length) {
      const selectedProp = unlockedProps[index]
      
      // Add prop to photo area
      const newProp: PhotoBoothProp = {
        ...selectedProp,
        position: {
          x: this.photoArea.x + this.photoArea.width / 2,
          y: this.photoArea.y + this.photoArea.height / 2
        },
        isPlaced: true
      }
      
      this.placedProps.push(newProp)
      this.playSound('prop_placed')
      return true
    }
    
    return false
  }
  
  /**
   * Handle pose selection
   */
  private handlePoseSelection(x: number, y: number): boolean {
    const itemHeight = 50
    const padding = 10
    const startY = 40
    
    const index = Math.floor((y - startY) / (itemHeight + padding))
    
    if (index >= 0 && index < this.poses.length) {
      // Deselect all poses
      this.poses.forEach(p => p.isSelected = false)
      
      // Select new pose
      this.poses[index].isSelected = true
      this.selectedPose = this.poses[index]
      this.playSound('pose_selected')
      return true
    }
    
    return false
  }
  
  /**
   * Handle filter selection
   */
  private handleFilterSelection(x: number, y: number): boolean {
    const itemHeight = 50
    const padding = 10
    const startY = 40
    
    const index = Math.floor((y - startY) / (itemHeight + padding))
    
    if (index >= 0 && index < this.filters.length) {
      const selectedFilter = this.filters[index]
      
      // Toggle filter
      selectedFilter.isActive = !selectedFilter.isActive
      
      // If activating a color filter, deactivate others in same category
      if (selectedFilter.isActive && selectedFilter.category === 'color') {
        this.filters.forEach(f => {
          if (f.id !== selectedFilter.id && f.category === 'color') {
            f.isActive = false
          }
        })
      }
      
      this.updateActiveFilters()
      this.playSound('filter_applied')
      return true
    }
    
    return false
  }
  
  /**
   * Handle sticker selection
   */
  private handleStickerSelection(x: number, y: number): boolean {
    const cols = 5
    const stickerSize = 40
    const padding = 10
    const startY = 40
    
    const col = Math.floor(x / (stickerSize + padding))
    const row = Math.floor((y - startY) / (stickerSize + padding))
    const index = row * cols + col
    
    if (index >= 0 && index < this.stickers.length) {
      const selectedSticker = this.stickers[index]
      
      // Add sticker to photo area
      const newSticker: PhotoSticker = {
        ...selectedSticker,
        position: {
          x: this.photoArea.x + this.photoArea.width / 2,
          y: this.photoArea.y + this.photoArea.height / 2
        },
        isPlaced: true
      }
      
      this.placedStickers.push(newSticker)
      this.playSound('sticker_placed')
      return true
    }
    
    return false
  }
  
  /**
   * Handle frame selection
   */
  private handleFrameSelection(x: number, y: number): boolean {
    const itemHeight = 50
    const padding = 10
    const startY = 40
    
    const index = Math.floor((y - startY) / (itemHeight + padding))
    
    if (index >= 0 && index < this.frames.length) {
      // Deselect all frames
      this.frames.forEach(f => f.isSelected = false)
      
      // Select new frame
      this.frames[index].isSelected = true
      this.selectedFrame = this.frames[index]
      this.playSound('frame_selected')
      return true
    }
    
    return false
  }
  
  /**
   * Handle gallery interactions
   */
  private handleGalleryInteraction(x: number, y: number): boolean {
    // TODO: Implement gallery interaction
    return false
  }
  
  /**
   * Capture photo
   */
  private capturePhoto(): void {
    if (this.progress.isCapturing) return
    
    this.progress.isCapturing = true
    
    // Play camera sound
    this.playSound('camera_shutter')
    
    // Create photo data
    const photoData: PhotoData = {
      id: `photo_${Date.now()}`,
      petId: this.currentPet?.id || '',
      backgroundId: this.selectedBackground?.id || '',
      props: [...this.placedProps],
      stickers: [...this.placedStickers],
      filters: this.activeFilters.map(f => ({ ...f })),
      frame: this.selectedFrame ? { ...this.selectedFrame } : undefined,
      petPosition: { ...this.petPosition },
      petPose: this.selectedPose ? { ...this.selectedPose } : this.poses[0],
      timestamp: new Date()
    }
    
    // Simulate photo capture process
    setTimeout(() => {
      this.progress.currentPhoto = photoData
      this.progress.isCapturing = false
      this.progress.isEditing = true
      
      // Enable save button
      if (this.saveButton) {
        this.saveButton.isEnabled = true
      }
      
      this.playSound('photo_captured')
      console.log('Photo captured successfully')
    }, 500)
  }
  
  /**
   * Save photo to gallery
   */
  private savePhoto(): void {
    if (!this.progress.currentPhoto) return
    
    try {
      // Get existing photos
      const savedPhotosJson = localStorage.getItem('robo_pet_photo_gallery')
      const savedPhotos = savedPhotosJson ? JSON.parse(savedPhotosJson) : []
      
      // Add current photo
      savedPhotos.push(this.progress.currentPhoto)
      
      // Save back to localStorage
      localStorage.setItem('robo_pet_photo_gallery', JSON.stringify(savedPhotos))
      
      // Update progress
      this.progress.photosTaken++
      this.progress.isEditing = false
      this.progress.currentPhoto = undefined
      
      // Disable save button
      if (this.saveButton) {
        this.saveButton.isEnabled = false
      }
      
      this.playSound('photo_saved')
      console.log('Photo saved to gallery')
      
      // Check for new unlocks
      this.checkUnlocks()
      
    } catch (error) {
      console.error('Failed to save photo:', error)
      this.playSound('error')
    }
  }
  /**
   * Reset photo composition
   */
  private resetPhoto(): void {
    // Clear placed items
    this.placedProps = []
    this.placedStickers = []
    
    // Reset filters
    this.filters.forEach(f => f.isActive = f.id === 'none')
    this.updateActiveFilters()
    
    // Reset frame
    this.frames.forEach(f => f.isSelected = f.id === 'none')
    this.selectedFrame = this.frames[0]
    
    // Reset pet position and pose
    this.petPosition = {
      x: this.photoArea.x + this.photoArea.width / 2,
      y: this.photoArea.y + this.photoArea.height / 2
    }
    this.poses.forEach(p => p.isSelected = p.id === 'default')
    this.selectedPose = this.poses[0]
    
    // Clear current photo
    this.progress.currentPhoto = undefined
    this.progress.isEditing = false
    
    // Disable save button
    if (this.saveButton) {
      this.saveButton.isEnabled = false
    }
    
    this.playSound('reset')
    console.log('Photo composition reset')
  }
  
  /**
   * Show photo gallery
   */
  private showGallery(): void {
    this.currentPanel = 'gallery'
    this.playSound('button_click')
  }
  
  /**
   * Go back to previous state
   */
  private goBack(): void {
    // TODO: Transition back to customization state or menu
    console.log('Going back from photo booth')
    this.playSound('button_click')
  }
  
  /**
   * Save current photo work
   */
  private saveCurrentPhoto(): void {
    if (this.progress.currentPhoto && this.progress.isEditing) {
      // Auto-save current work
      this.savePhoto()
    }
  }
  
  // Helper methods
  
  private getPropUnlockStatus(category: 'basic' | 'premium' | 'special'): boolean {
    switch (category) {
      case 'basic': return true
      case 'premium': return this.progress.photosTaken >= 2
      case 'special': return this.progress.photosTaken >= 5
      default: return false
    }
  }
  
  private updateActiveFilters(): void {
    this.activeFilters = this.filters.filter(f => f.isActive && f.id !== 'none')
  }
  
  private constrainPetToPhotoArea(): void {
    const petBounds = this.getPetBounds()
    const margin = 20
    
    if (petBounds.x < this.photoArea.x + margin) {
      this.petPosition.x = this.photoArea.x + margin + petBounds.width / 2
    }
    if (petBounds.x + petBounds.width > this.photoArea.x + this.photoArea.width - margin) {
      this.petPosition.x = this.photoArea.x + this.photoArea.width - margin - petBounds.width / 2
    }
    if (petBounds.y < this.photoArea.y + margin) {
      this.petPosition.y = this.photoArea.y + margin + petBounds.height / 2
    }
    if (petBounds.y + petBounds.height > this.photoArea.y + this.photoArea.height - margin) {
      this.petPosition.y = this.photoArea.y + this.photoArea.height - margin - petBounds.height / 2
    }
  }
  
  private movePet(deltaX: number, deltaY: number): void {
    this.petPosition.x += deltaX
    this.petPosition.y += deltaY
    this.constrainPetToPhotoArea()
    this.playSound('pet_moved')
  }
  
  private switchPanel(): void {
    const panels: PhotoBoothPanel[] = ['backgrounds', 'props', 'poses', 'filters', 'stickers', 'frames', 'gallery']
    const currentIndex = panels.indexOf(this.currentPanel)
    this.currentPanel = panels[(currentIndex + 1) % panels.length]
  }
  
  private checkUnlocks(): void {
    // Check for background unlocks
    this.backgrounds.forEach(bg => {
      if (!bg.isUnlocked) {
        if (bg.id === 'space_station' && this.progress.photosTaken >= 3) {
          bg.isUnlocked = true
          this.showUnlockNotification(`New background unlocked: ${bg.name}!`)
        } else if (bg.id === 'fantasy_castle' && this.progress.photosTaken >= 5) {
          bg.isUnlocked = true
          this.showUnlockNotification(`New background unlocked: ${bg.name}!`)
        } else if (bg.id === 'city_skyline' && this.progress.photosTaken >= 10) {
          bg.isUnlocked = true
          this.showUnlockNotification(`New background unlocked: ${bg.name}!`)
        }
      }
    })
    
    // Check for prop unlocks
    this.props.forEach(prop => {
      if (!prop.isUnlocked) {
        prop.isUnlocked = this.getPropUnlockStatus(prop.category)
      }
    })
  }
  
  private showUnlockNotification(message: string): void {
    console.log(`🎉 ${message}`)
    this.playSound('unlock')
    // TODO: Show visual notification
  }
  
  private showInitialGuidance(): void {
    console.log('Welcome to the Photo Booth! Choose a background and pose your pet for the perfect picture!')
  }
  
  private playSound(soundId: string): void {
    if (this.audioManager) {
      try {
        this.audioManager.playSound(soundId, { volume: 0.5 })
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
  }
  
  private isPointInBounds(x: number, y: number, bounds: { x: number, y: number, width: number, height: number }): boolean {
    return x >= bounds.x && x <= bounds.x + bounds.width && 
           y >= bounds.y && y <= bounds.y + bounds.height
  }
  
  private isPointInPanelTab(x: number, y: number, panel: PhotoBoothPanel): boolean {
    const tabWidth = 80
    const tabHeight = 30
    const tabY = this.panelArea.y - tabHeight
    
    const panels: PhotoBoothPanel[] = ['backgrounds', 'props', 'poses', 'filters', 'stickers', 'frames', 'gallery']
    const panelIndex = panels.indexOf(panel)
    if (panelIndex === -1) return false
    
    const tabX = this.panelArea.x + panelIndex * (tabWidth + 5)
    
    return x >= tabX && x <= tabX + tabWidth && y >= tabY && y <= tabY + tabHeight
  }
  
  private getPetBounds(): { x: number, y: number, width: number, height: number } {
    const petSize = 80 // Default pet size
    return {
      x: this.petPosition.x - petSize / 2,
      y: this.petPosition.y - petSize / 2,
      width: petSize,
      height: petSize
    }
  }
  
  private getPropBounds(prop: PhotoBoothProp): { x: number, y: number, width: number, height: number } {
    const propSize = 40 * prop.scale
    return {
      x: prop.position.x - propSize / 2,
      y: prop.position.y - propSize / 2,
      width: propSize,
      height: propSize
    }
  }
  
  private getStickerBounds(sticker: PhotoSticker): { x: number, y: number, width: number, height: number } {
    const stickerSize = 30 * sticker.scale
    return {
      x: sticker.position.x - stickerSize / 2,
      y: sticker.position.y - stickerSize / 2,
      width: stickerSize,
      height: stickerSize
    }
  }
  
  private updateAnimations(deltaTime: number): void {
    // Update any UI animations here
  }
  
  private updatePetDragging(): void {
    // Pet dragging is handled in handlePointerMove
  }
  // Rendering methods
  
  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#F0F8FF')
    gradient.addColorStop(1, '#E6F3FF')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }
  
  private drawPhotoArea(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save()
    
    // Photo area background (selected background or default)
    if (this.selectedBackground) {
      // For now, use a solid color representing the background
      const backgroundColors: { [key: string]: string } = {
        'workshop': '#8B4513',
        'nature_park': '#228B22',
        'space_station': '#191970',
        'fantasy_castle': '#9370DB',
        'city_skyline': '#708090'
      }
      
      ctx.fillStyle = backgroundColors[this.selectedBackground.id] || '#87CEEB'
    } else {
      ctx.fillStyle = '#87CEEB' // Default sky blue
    }
    
    ctx.fillRect(this.photoArea.x, this.photoArea.y, this.photoArea.width, this.photoArea.height)
    
    // Photo area border
    ctx.strokeStyle = '#4A4A4A'
    ctx.lineWidth = 3
    ctx.strokeRect(this.photoArea.x, this.photoArea.y, this.photoArea.width, this.photoArea.height)
    
    // Photo area label
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 16px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Photo Area', this.photoArea.x + this.photoArea.width / 2, this.photoArea.y - 10)
    
    ctx.restore()
  }
  
  private drawPetInPhoto(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.currentPet) return
    
    ctx.save()
    
    // Draw pet (simplified representation)
    const petSize = 80
    const petX = this.petPosition.x - petSize / 2
    const petY = this.petPosition.y - petSize / 2
    
    // Pet body
    ctx.fillStyle = '#4ECDC4'
    ctx.beginPath()
    ctx.roundRect(petX, petY, petSize, petSize, 15)
    ctx.fill()
    
    // Pet border
    ctx.strokeStyle = this.isDraggingPet ? '#FFD700' : '#2C3E50'
    ctx.lineWidth = this.isDraggingPet ? 3 : 2
    ctx.stroke()
    
    // Pet face (emoji representation based on pose)
    ctx.font = '32px Arial'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#2C3E50'
    
    const poseEmojis: { [key: string]: string } = {
      'default': '🤖',
      'happy': '😊',
      'excited': '🤩',
      'playful': '😄',
      'proud': '😎',
      'sleepy': '😴'
    }
    
    const emoji = poseEmojis[this.selectedPose?.id || 'default'] || '🤖'
    ctx.fillText(emoji, this.petPosition.x, this.petPosition.y + 8)
    
    // Pet name
    ctx.font = 'bold 12px Comic Sans MS, cursive, sans-serif'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(this.currentPet.name, this.petPosition.x, petY + petSize + 15)
    
    ctx.restore()
  }
  
  private drawPlacedItems(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Draw placed props
    this.placedProps.forEach(prop => {
      ctx.save()
      
      const propSize = 40 * prop.scale
      const propX = prop.position.x - propSize / 2
      const propY = prop.position.y - propSize / 2
      
      // Prop background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.beginPath()
      ctx.roundRect(propX, propY, propSize, propSize, 8)
      ctx.fill()
      
      // Prop icon
      ctx.font = `${propSize * 0.6}px Arial`
      ctx.textAlign = 'center'
      ctx.fillStyle = '#2C3E50'
      ctx.fillText(prop.icon, prop.position.x, prop.position.y + propSize * 0.2)
      
      ctx.restore()
    })
    
    // Draw placed stickers
    this.placedStickers.forEach(sticker => {
      ctx.save()
      
      const stickerSize = 30 * sticker.scale
      
      // Sticker
      ctx.font = `${stickerSize}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText(sticker.emoji, sticker.position.x, sticker.position.y + stickerSize * 0.3)
      
      ctx.restore()
    })
  }
  
  private drawFiltersAndFrame(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Apply filters (simplified visual representation)
    if (this.activeFilters.length > 0) {
      ctx.save()
      
      this.activeFilters.forEach(filter => {
        switch (filter.id) {
          case 'sepia':
            ctx.globalCompositeOperation = 'multiply'
            ctx.fillStyle = `rgba(222, 184, 135, ${filter.intensity * 0.3})`
            ctx.fillRect(this.photoArea.x, this.photoArea.y, this.photoArea.width, this.photoArea.height)
            break
          case 'grayscale':
            // Note: Canvas doesn't have built-in grayscale, this is a visual indicator
            ctx.globalCompositeOperation = 'multiply'
            ctx.fillStyle = `rgba(128, 128, 128, ${filter.intensity * 0.2})`
            ctx.fillRect(this.photoArea.x, this.photoArea.y, this.photoArea.width, this.photoArea.height)
            break
          case 'warm':
            ctx.globalCompositeOperation = 'multiply'
            ctx.fillStyle = `rgba(255, 200, 150, ${filter.intensity * 0.2})`
            ctx.fillRect(this.photoArea.x, this.photoArea.y, this.photoArea.width, this.photoArea.height)
            break
          case 'cool':
            ctx.globalCompositeOperation = 'multiply'
            ctx.fillStyle = `rgba(150, 200, 255, ${filter.intensity * 0.2})`
            ctx.fillRect(this.photoArea.x, this.photoArea.y, this.photoArea.width, this.photoArea.height)
            break
        }
      })
      
      ctx.restore()
    }
    
    // Draw frame
    if (this.selectedFrame && this.selectedFrame.id !== 'none') {
      ctx.save()
      
      const frame = this.selectedFrame
      const frameX = this.photoArea.x - frame.borderWidth
      const frameY = this.photoArea.y - frame.borderWidth
      const frameWidth = this.photoArea.width + frame.borderWidth * 2
      const frameHeight = this.photoArea.height + frame.borderWidth * 2
      
      ctx.strokeStyle = frame.borderColor
      ctx.lineWidth = frame.borderWidth
      
      if (frame.pattern === 'dashed') {
        ctx.setLineDash([10, 5])
      }
      
      ctx.strokeRect(frameX, frameY, frameWidth, frameHeight)
      
      if (frame.pattern === 'decorative') {
        // Add decorative corners
        ctx.fillStyle = frame.borderColor
        const cornerSize = frame.borderWidth * 2
        
        // Top-left corner
        ctx.fillRect(frameX, frameY, cornerSize, cornerSize)
        // Top-right corner
        ctx.fillRect(frameX + frameWidth - cornerSize, frameY, cornerSize, cornerSize)
        // Bottom-left corner
        ctx.fillRect(frameX, frameY + frameHeight - cornerSize, cornerSize, cornerSize)
        // Bottom-right corner
        ctx.fillRect(frameX + frameWidth - cornerSize, frameY + frameHeight - cornerSize, cornerSize, cornerSize)
      }
      
      ctx.restore()
    }
  }
  private drawUIPanel(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save()
    
    // Panel background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.beginPath()
    ctx.roundRect(this.panelArea.x, this.panelArea.y, this.panelArea.width, this.panelArea.height, 10)
    ctx.fill()
    
    // Panel border
    ctx.strokeStyle = '#BDC3C7'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Draw panel tabs
    this.drawPanelTabs(ctx)
    
    // Draw panel content based on current panel
    switch (this.currentPanel) {
      case 'backgrounds':
        this.drawBackgroundsPanel(ctx)
        break
      case 'props':
        this.drawPropsPanel(ctx)
        break
      case 'poses':
        this.drawPosesPanel(ctx)
        break
      case 'filters':
        this.drawFiltersPanel(ctx)
        break
      case 'stickers':
        this.drawStickersPanel(ctx)
        break
      case 'frames':
        this.drawFramesPanel(ctx)
        break
      case 'gallery':
        this.drawGalleryPanel(ctx)
        break
    }
    
    ctx.restore()
  }
  
  private drawPanelTabs(ctx: CanvasRenderingContext2D): void {
    const panels: { id: PhotoBoothPanel, name: string, icon: string }[] = [
      { id: 'backgrounds', name: 'BG', icon: '🏞️' },
      { id: 'props', name: 'Props', icon: '🎭' },
      { id: 'poses', name: 'Pose', icon: '🤸' },
      { id: 'filters', name: 'Filter', icon: '🎨' },
      { id: 'stickers', name: 'Stick', icon: '⭐' },
      { id: 'frames', name: 'Frame', icon: '🖼️' },
      { id: 'gallery', name: 'Gallery', icon: '📸' }
    ]
    
    const tabWidth = 40
    const tabHeight = 30
    const tabY = this.panelArea.y - tabHeight
    
    panels.forEach((panel, index) => {
      const tabX = this.panelArea.x + index * (tabWidth + 2)
      const isActive = this.currentPanel === panel.id
      
      // Tab background
      ctx.fillStyle = isActive ? '#3498DB' : '#ECF0F1'
      ctx.beginPath()
      ctx.roundRect(tabX, tabY, tabWidth, tabHeight, 5)
      ctx.fill()
      
      // Tab border
      ctx.strokeStyle = isActive ? '#2980B9' : '#BDC3C7'
      ctx.lineWidth = 1
      ctx.stroke()
      
      // Tab icon
      ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.fillStyle = isActive ? 'white' : '#2C3E50'
      ctx.fillText(panel.icon, tabX + tabWidth / 2, tabY + tabHeight / 2 + 5)
    })
  }
  
  private drawBackgroundsPanel(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    
    // Panel title
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 16px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Backgrounds', this.panelArea.x + this.panelArea.width / 2, this.panelArea.y + 25)
    
    // Background list
    const startY = this.panelArea.y + 40
    const itemHeight = 60
    const padding = 10
    
    this.backgrounds.forEach((background, index) => {
      if (!background.isUnlocked) return
      
      const itemY = startY + index * (itemHeight + padding)
      const isSelected = this.selectedBackground?.id === background.id
      
      // Item background
      ctx.fillStyle = isSelected ? '#E3F2FD' : '#F8F9FA'
      ctx.beginPath()
      ctx.roundRect(this.panelArea.x + 10, itemY, this.panelArea.width - 20, itemHeight, 8)
      ctx.fill()
      
      // Item border
      ctx.strokeStyle = isSelected ? '#2196F3' : '#DEE2E6'
      ctx.lineWidth = isSelected ? 2 : 1
      ctx.stroke()
      
      // Background preview (colored rectangle)
      const previewSize = 40
      const previewX = this.panelArea.x + 20
      const previewY = itemY + 10
      
      const backgroundColors: { [key: string]: string } = {
        'workshop': '#8B4513',
        'nature_park': '#228B22',
        'space_station': '#191970',
        'fantasy_castle': '#9370DB',
        'city_skyline': '#708090'
      }
      
      ctx.fillStyle = backgroundColors[background.id] || '#87CEEB'
      ctx.fillRect(previewX, previewY, previewSize, previewSize)
      
      ctx.strokeStyle = '#2C3E50'
      ctx.lineWidth = 1
      ctx.strokeRect(previewX, previewY, previewSize, previewSize)
      
      // Background name
      ctx.fillStyle = '#2C3E50'
      ctx.font = '14px Comic Sans MS, cursive, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(background.name, previewX + previewSize + 10, itemY + 25)
      
      // Category
      ctx.fillStyle = '#7F8C8D'
      ctx.font = '12px Comic Sans MS, cursive, sans-serif'
      ctx.fillText(background.category, previewX + previewSize + 10, itemY + 45)
    })
    
    ctx.restore()
  }
  
  private drawPropsPanel(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    
    // Panel title
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 16px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Props', this.panelArea.x + this.panelArea.width / 2, this.panelArea.y + 25)
    
    // Props list
    const startY = this.panelArea.y + 40
    const itemHeight = 50
    const padding = 10
    const unlockedProps = this.props.filter(p => p.isUnlocked)
    
    unlockedProps.forEach((prop, index) => {
      const itemY = startY + index * (itemHeight + padding)
      
      // Item background
      ctx.fillStyle = '#F8F9FA'
      ctx.beginPath()
      ctx.roundRect(this.panelArea.x + 10, itemY, this.panelArea.width - 20, itemHeight, 8)
      ctx.fill()
      
      // Item border
      ctx.strokeStyle = '#DEE2E6'
      ctx.lineWidth = 1
      ctx.stroke()
      
      // Prop icon
      ctx.font = '24px Arial'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#2C3E50'
      ctx.fillText(prop.icon, this.panelArea.x + 40, itemY + 32)
      
      // Prop name
      ctx.font = '14px Comic Sans MS, cursive, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(prop.name, this.panelArea.x + 70, itemY + 25)
      
      // Prop type
      ctx.fillStyle = '#7F8C8D'
      ctx.font = '12px Comic Sans MS, cursive, sans-serif'
      ctx.fillText(prop.type, this.panelArea.x + 70, itemY + 40)
    })
    
    ctx.restore()
  }
  
  private drawPosesPanel(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    
    // Panel title
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 16px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Pet Poses', this.panelArea.x + this.panelArea.width / 2, this.panelArea.y + 25)
    
    // Poses list
    const startY = this.panelArea.y + 40
    const itemHeight = 50
    const padding = 10
    
    this.poses.forEach((pose, index) => {
      const itemY = startY + index * (itemHeight + padding)
      const isSelected = pose.isSelected
      
      // Item background
      ctx.fillStyle = isSelected ? '#E3F2FD' : '#F8F9FA'
      ctx.beginPath()
      ctx.roundRect(this.panelArea.x + 10, itemY, this.panelArea.width - 20, itemHeight, 8)
      ctx.fill()
      
      // Item border
      ctx.strokeStyle = isSelected ? '#2196F3' : '#DEE2E6'
      ctx.lineWidth = isSelected ? 2 : 1
      ctx.stroke()
      
      // Pose preview (emoji)
      const poseEmojis: { [key: string]: string } = {
        'default': '🤖',
        'happy': '😊',
        'excited': '🤩',
        'playful': '😄',
        'proud': '😎',
        'sleepy': '😴'
      }
      
      ctx.font = '24px Arial'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#2C3E50'
      ctx.fillText(poseEmojis[pose.id] || '🤖', this.panelArea.x + 40, itemY + 32)
      
      // Pose name
      ctx.font = '14px Comic Sans MS, cursive, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(pose.displayName, this.panelArea.x + 70, itemY + 30)
    })
    
    ctx.restore()
  }
  private drawFiltersPanel(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    
    // Panel title
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 16px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Filters', this.panelArea.x + this.panelArea.width / 2, this.panelArea.y + 25)
    
    // Filters list
    const startY = this.panelArea.y + 40
    const itemHeight = 50
    const padding = 10
    
    this.filters.forEach((filter, index) => {
      const itemY = startY + index * (itemHeight + padding)
      const isActive = filter.isActive
      
      // Item background
      ctx.fillStyle = isActive ? '#E8F5E8' : '#F8F9FA'
      ctx.beginPath()
      ctx.roundRect(this.panelArea.x + 10, itemY, this.panelArea.width - 20, itemHeight, 8)
      ctx.fill()
      
      // Item border
      ctx.strokeStyle = isActive ? '#4CAF50' : '#DEE2E6'
      ctx.lineWidth = isActive ? 2 : 1
      ctx.stroke()
      
      // Filter preview (colored circle)
      const previewSize = 20
      const previewX = this.panelArea.x + 25
      const previewY = itemY + 15
      
      const filterColors: { [key: string]: string } = {
        'none': '#FFFFFF',
        'sepia': '#DEB887',
        'grayscale': '#808080',
        'warm': '#FFA500',
        'cool': '#87CEEB',
        'blur': '#E6E6FA',
        'sharpen': '#FF6347',
        'emboss': '#D3D3D3',
        'rainbow': '#FF69B4',
        'neon': '#00FF00',
        'sparkle': '#FFD700'
      }
      
      ctx.fillStyle = filterColors[filter.id] || '#CCCCCC'
      ctx.beginPath()
      ctx.arc(previewX + previewSize / 2, previewY + previewSize / 2, previewSize / 2, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.strokeStyle = '#2C3E50'
      ctx.lineWidth = 1
      ctx.stroke()
      
      // Filter name
      ctx.fillStyle = '#2C3E50'
      ctx.font = '14px Comic Sans MS, cursive, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(filter.displayName, previewX + previewSize + 10, itemY + 25)
      
      // Active indicator
      if (isActive) {
        ctx.fillStyle = '#4CAF50'
        ctx.font = '12px Arial'
        ctx.fillText('✓', this.panelArea.x + this.panelArea.width - 30, itemY + 25)
      }
    })
    
    ctx.restore()
  }
  
  private drawStickersPanel(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    
    // Panel title
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 16px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Stickers', this.panelArea.x + this.panelArea.width / 2, this.panelArea.y + 25)
    
    // Stickers grid
    const startY = this.panelArea.y + 40
    const cols = 5
    const stickerSize = 40
    const padding = 10
    
    this.stickers.slice(0, 20).forEach((sticker, index) => { // Show first 20 stickers
      const col = index % cols
      const row = Math.floor(index / cols)
      const stickerX = this.panelArea.x + 20 + col * (stickerSize + padding)
      const stickerY = startY + row * (stickerSize + padding)
      
      // Sticker background
      ctx.fillStyle = '#F8F9FA'
      ctx.beginPath()
      ctx.roundRect(stickerX, stickerY, stickerSize, stickerSize, 8)
      ctx.fill()
      
      // Sticker border
      ctx.strokeStyle = '#DEE2E6'
      ctx.lineWidth = 1
      ctx.stroke()
      
      // Sticker emoji
      ctx.font = '24px Arial'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#2C3E50'
      ctx.fillText(sticker.emoji, stickerX + stickerSize / 2, stickerY + stickerSize / 2 + 8)
    })
    
    ctx.restore()
  }
  
  private drawFramesPanel(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    
    // Panel title
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 16px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Frames', this.panelArea.x + this.panelArea.width / 2, this.panelArea.y + 25)
    
    // Frames list
    const startY = this.panelArea.y + 40
    const itemHeight = 50
    const padding = 10
    
    this.frames.forEach((frame, index) => {
      const itemY = startY + index * (itemHeight + padding)
      const isSelected = frame.isSelected
      
      // Item background
      ctx.fillStyle = isSelected ? '#E3F2FD' : '#F8F9FA'
      ctx.beginPath()
      ctx.roundRect(this.panelArea.x + 10, itemY, this.panelArea.width - 20, itemHeight, 8)
      ctx.fill()
      
      // Item border
      ctx.strokeStyle = isSelected ? '#2196F3' : '#DEE2E6'
      ctx.lineWidth = isSelected ? 2 : 1
      ctx.stroke()
      
      // Frame preview
      const previewSize = 30
      const previewX = this.panelArea.x + 25
      const previewY = itemY + 10
      
      if (frame.id !== 'none') {
        // Draw frame preview
        ctx.strokeStyle = frame.borderColor
        ctx.lineWidth = Math.max(1, frame.borderWidth / 2)
        
        if (frame.pattern === 'dashed') {
          ctx.setLineDash([5, 3])
        }
        
        ctx.strokeRect(previewX, previewY, previewSize, previewSize)
        
        if (frame.pattern === 'decorative') {
          // Add small decorative corners
          ctx.fillStyle = frame.borderColor
          const cornerSize = 3
          ctx.fillRect(previewX, previewY, cornerSize, cornerSize)
          ctx.fillRect(previewX + previewSize - cornerSize, previewY, cornerSize, cornerSize)
          ctx.fillRect(previewX, previewY + previewSize - cornerSize, cornerSize, cornerSize)
          ctx.fillRect(previewX + previewSize - cornerSize, previewY + previewSize - cornerSize, cornerSize, cornerSize)
        }
        
        ctx.setLineDash([]) // Reset dash pattern
      } else {
        // No frame indicator
        ctx.strokeStyle = '#BDC3C7'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.strokeRect(previewX, previewY, previewSize, previewSize)
        ctx.setLineDash([])
      }
      
      // Frame name
      ctx.fillStyle = '#2C3E50'
      ctx.font = '14px Comic Sans MS, cursive, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(frame.displayName, previewX + previewSize + 10, itemY + 30)
    })
    
    ctx.restore()
  }
  
  private drawGalleryPanel(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    
    // Panel title
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 16px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Photo Gallery', this.panelArea.x + this.panelArea.width / 2, this.panelArea.y + 25)
    
    // Gallery stats
    ctx.fillStyle = '#7F8C8D'
    ctx.font = '12px Comic Sans MS, cursive, sans-serif'
    ctx.fillText(`${this.progress.photosTaken} photos taken`, this.panelArea.x + this.panelArea.width / 2, this.panelArea.y + 45)
    
    // Gallery grid (placeholder)
    const startY = this.panelArea.y + 60
    const cols = 3
    const thumbSize = 60
    const padding = 10
    
    // Show placeholder thumbnails
    for (let i = 0; i < Math.min(9, this.progress.photosTaken); i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const thumbX = this.panelArea.x + 20 + col * (thumbSize + padding)
      const thumbY = startY + row * (thumbSize + padding)
      
      // Thumbnail background
      ctx.fillStyle = '#E8E8E8'
      ctx.fillRect(thumbX, thumbY, thumbSize, thumbSize)
      
      // Thumbnail border
      ctx.strokeStyle = '#BDC3C7'
      ctx.lineWidth = 1
      ctx.strokeRect(thumbX, thumbY, thumbSize, thumbSize)
      
      // Photo icon
      ctx.font = '24px Arial'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#7F8C8D'
      ctx.fillText('📸', thumbX + thumbSize / 2, thumbY + thumbSize / 2 + 8)
    }
    
    // Empty slots
    for (let i = this.progress.photosTaken; i < 9; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const thumbX = this.panelArea.x + 20 + col * (thumbSize + padding)
      const thumbY = startY + row * (thumbSize + padding)
      
      // Empty slot
      ctx.strokeStyle = '#BDC3C7'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.strokeRect(thumbX, thumbY, thumbSize, thumbSize)
      ctx.setLineDash([])
      
      // Plus icon
      ctx.font = '24px Arial'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#BDC3C7'
      ctx.fillText('+', thumbX + thumbSize / 2, thumbY + thumbSize / 2 + 8)
    }
    
    ctx.restore()
  }
  
  private drawToolbar(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save()
    
    // Toolbar background
    ctx.fillStyle = 'rgba(52, 73, 94, 0.9)'
    ctx.beginPath()
    ctx.roundRect(this.toolbarArea.x, this.toolbarArea.y, this.toolbarArea.width, this.toolbarArea.height, 10)
    ctx.fill()
    
    // Toolbar content
    ctx.fillStyle = 'white'
    ctx.font = 'bold 14px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'left'
    
    const instructions = [
      '🖱️ Drag pet to move',
      '🎨 Click panels to customize',
      '📸 Capture when ready'
    ]
    
    instructions.forEach((instruction, index) => {
      ctx.fillText(instruction, this.toolbarArea.x + 20, this.toolbarArea.y + 20 + index * 15)
    })
    
    ctx.restore()
  }
  
  private drawControlButtons(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const buttons = [this.captureButton, this.saveButton, this.resetButton, this.galleryButton, this.backButton]
    
    buttons.forEach(button => {
      if (button) {
        this.drawButton(ctx, button)
      }
    })
  }
  
  private drawButton(ctx: CanvasRenderingContext2D, button: ClickableElement): void {
    ctx.save()
    
    // Button background
    const gradient = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.height)
    if (!button.isEnabled) {
      gradient.addColorStop(0, '#BDC3C7')
      gradient.addColorStop(1, '#95A5A6')
    } else {
      gradient.addColorStop(0, '#3498DB')
      gradient.addColorStop(1, '#2980B9')
    }
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.roundRect(button.x, button.y, button.width, button.height, 8)
    ctx.fill()
    
    // Button border
    ctx.strokeStyle = button.isEnabled ? '#2980B9' : '#7F8C8D'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Button text
    ctx.fillStyle = button.isEnabled ? 'white' : '#7F8C8D'
    ctx.font = 'bold 14px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // Get button text from ID
    const buttonTexts: { [key: string]: string } = {
      'capture_button': '📸 Capture',
      'save_button': '💾 Save',
      'reset_button': '🔄 Reset',
      'gallery_button': '🖼️ Gallery',
      'back_button': '← Back'
    }
    
    const text = buttonTexts[button.id] || button.id
    ctx.fillText(text, button.x + button.width / 2, button.y + button.height / 2)
    
    ctx.restore()
  }
  
  private drawDebugInfo(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, height - 120, 300, 120)
    
    ctx.fillStyle = 'white'
    ctx.font = '12px monospace'
    ctx.textAlign = 'left'
    
    const debugInfo = [
      `Panel: ${this.currentPanel}`,
      `Pet: ${this.petPosition.x.toFixed(0)}, ${this.petPosition.y.toFixed(0)}`,
      `Background: ${this.selectedBackground?.name || 'None'}`,
      `Pose: ${this.selectedPose?.displayName || 'None'}`,
      `Props: ${this.placedProps.length}`,
      `Stickers: ${this.placedStickers.length}`,
      `Filters: ${this.activeFilters.length}`,
      `Photos: ${this.progress.photosTaken}`,
      `Dragging: ${this.isDraggingPet}`,
      `Development Build`
    ]
    
    debugInfo.forEach((info, index) => {
      ctx.fillText(info, 10, height - 105 + index * 12)
    })
    
    ctx.restore()
  }
}