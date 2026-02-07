# 🤖 Robo-Pet Repair Shop

An educational web-based game for children ages 3-12 that teaches problem-solving skills through robotic pet repair and customization.

## 🎮 Game Overview

Robo-Pet Repair Shop is a child-friendly educational game where players:
- Diagnose problems with broken robotic pets
- Use various tools to repair them
- Customize their pets with colors and accessories
- Take photos with their completed creations
- Learn basic mechanical concepts and problem-solving skills

## 🛠️ Technical Stack

- **Frontend**: TypeScript with ES6+ modules
- **Rendering**: HTML5 Canvas (primary) with WebGL enhancement
- **Audio**: Web Audio API with HTML5 Audio fallback
- **Build System**: Vite for development and production
- **Testing**: Vitest for unit tests, fast-check for property-based testing
- **Storage**: LocalStorage for progress, IndexedDB for photo gallery

## 🚀 Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd robo-pet-repair-shop
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run unit and property-based tests
- `npm run test:ui` - Run tests with UI interface
- `npm run test:coverage` - Run tests with coverage report

## 🏗️ Architecture

### Core Systems

- **Game Engine**: Main game loop with 30+ FPS performance
- **State Manager**: Handles transitions between game modes
- **Renderer**: Dual Canvas 2D/WebGL rendering system
- **Input Handler**: Unified mouse, touch, and keyboard input
- **Audio Manager**: High-fidelity audio with haptic feedback

### Game States

- **Menu State**: Main menu and settings
- **Diagnostic State**: Problem identification phase
- **Repair State**: Tool-based repair mechanics
- **Customization State**: Pet personalization
- **Photo Booth State**: Photo capture and editing

## 🧪 Testing

The project uses a comprehensive testing strategy:

### Unit Tests
- Test specific functionality and edge cases
- Mock browser APIs for consistent testing
- Focus on component integration

### Property-Based Tests
- Validate universal correctness properties
- Test performance requirements across various conditions
- Ensure system stability under different scenarios

Run tests:
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest tests/engine/GameEngine.test.ts
```

## 🎨 Design Principles

### Child-Friendly Design
- Large, colorful buttons with clear icons
- Comic Sans MS font for readability
- High contrast colors for accessibility
- Simple vocabulary and audio narration

### Accessibility Features
- Keyboard navigation support
- Screen reader compatibility
- Touch and mouse input support
- Volume controls and mute options
- Reduced motion mode support

### Performance Optimization
- Target 30+ FPS on devices from 2019+
- Canvas 2D for reliable performance
- WebGL enhancement when available
- Efficient resource management

## 🔒 Privacy & Safety

- **No PII Collection**: No personally identifiable information stored
- **Local Storage Only**: All data stays on the device
- **COPPA Compliant**: Meets children's privacy requirements
- **No External Links**: Safe, contained environment
- **No Advertisements**: Clean, distraction-free experience

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

Minimum requirements:
- ES2020 support
- Canvas 2D API
- LocalStorage
- Modern CSS features

## 🎯 Educational Goals

### STEM Learning Outcomes
- **Problem-Solving**: Diagnostic thinking and systematic troubleshooting
- **Mechanical Concepts**: Understanding of basic repair and maintenance
- **Creativity**: Self-expression through customization
- **Confidence Building**: Positive reinforcement and achievable challenges

### Age-Appropriate Difficulty
- **Ages 3-5**: Simple problems with visual cues
- **Ages 6-8**: Multi-step repairs with guided hints
- **Ages 9-12**: Complex diagnostics with minimal assistance

## 🤝 Contributing

This project follows educational game development best practices:

1. **Child Safety First**: All features must be age-appropriate
2. **Accessibility**: Ensure features work for all abilities
3. **Performance**: Maintain smooth gameplay on older devices
4. **Testing**: Include both unit and property-based tests
5. **Documentation**: Keep code well-documented for maintainability

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Designed for educational use in schools and homes
- Built with modern web technologies for reliability
- Focused on inclusive design and accessibility
- Inspired by the need for quality educational games

---

**Made with ❤️ for young learners everywhere**