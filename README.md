# 🏴‍☠️ Shipwrecked Sketches - Live Canvas Translator

_An enhanced pirate-themed drawing app with voice-controlled drawing and AI-powered translation for villagers_

## ✨ Features

### 🎨 Voice-Controlled Drawing

- **Microphone Integration**: Draw with your voice! Volume controls brush width, pitch controls color
- **Real-time Audio Analysis**: Visual feedback showing current volume and pitch
- **Dynamic Stroke Properties**: Brush changes based on your voice characteristics

### 🔮 AI-Powered Translation

- **Multiple AI Models**: Choose from Qwen 2.5-vl, Gemini 2.0 Flash, Mistral, or Llama vision models
- **Pirate-Themed Responses**: AI speaks like a pirate and uses appropriate emojis
- **Safe Content**: Family-friendly descriptions suitable for all ages
- **Villager Communication**: Designed to help communicate with island villagers

### 🎯 Enhanced UI

- **Pirate Theme**: Full pirate aesthetic with treasure maps, compass, and nautical elements
- **Responsive Design**: Works on desktop and mobile devices
- **Visual Effects**: Ink splatters, animated backgrounds, and decorative elements
- **Toast Notifications**: Pirate-themed feedback messages

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (preferred package manager)
- OpenRouter API key for AI features

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   cd challenge-2
   pnpm install
   ```

3. Set up environment variables:

   ```bash
   # Create .env.local file
   NEXT_PUBLIC_KEY=your_openrouter_api_key_here
   ```

4. Run the development server:

   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎮 How to Use

### Drawing

1. **Enable Microphone**: Click the microphone button to enable voice-controlled drawing
2. **Start Drawing**: Click and drag on the canvas to draw
3. **Voice Effects**:
   - Speak louder for thicker lines
   - Change pitch (high/low voice) for different colors
4. **Clear Canvas**: Use the "Clear Map" button to start over

### AI Translation

1. **Select Model**: Choose your preferred AI model from the dropdown
2. **Draw Something**: Create your sketch on the canvas
3. **Translate**: Click "Analyze Sketch" to get a pirate-themed description
4. **View Results**: The AI interpretation will appear in the translation panel

### Tips

- 🎤 Grant microphone permissions for the best experience
- 🎨 Try different vocal tones to create varied artwork
- 🔄 Experiment with different AI models for varied responses
- 🏴‍☠️ The AI responds in pirate speak - perfect for the theme!

## 🛠 Technology Stack

- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS with custom pirate theme
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Audio**: Web Audio API for microphone analysis
- **AI Integration**: OpenRouter API with multiple vision models
- **Canvas**: HTML5 Canvas for drawing functionality

## 🌟 Enhanced Features from LiveCanvas

This project incorporates the LiveCanvas functionality from the villager project:

- ✅ Voice-controlled drawing with real-time audio analysis
- ✅ OpenRouter AI integration with multiple model options
- ✅ Pirate-themed system prompts for appropriate responses
- ✅ Enhanced UI with villager character integration
- ✅ Safe, family-friendly content filtering

## 🎯 API Integration

The app uses OpenRouter API to access multiple AI vision models:

- **Qwen 2.5-vl**: Excellent for detailed image analysis
- **Gemini 2.0 Flash**: Fast and reliable responses
- **Mistral Small 3.2**: Balanced performance and quality
- **Llama 3.2 Vision**: Meta's latest vision model

## 🔧 Development

### Environment Variables

```bash
NEXT_PUBLIC_KEY=your_openrouter_api_key
```

### Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## 🎨 Customization

The pirate theme can be customized by modifying:

- **Colors**: Update Tailwind classes in components
- **Fonts**: Modify font families in the style props
- **Animations**: Adjust animation durations and effects
- **AI Prompts**: Update the system prompt for different character voices

## 🤝 Contributing

This project combines the whimsical sketch tool with LiveCanvas functionality. Feel free to:

- Add new AI models
- Enhance the voice analysis features
- Improve the pirate theme
- Add new drawing tools

## 📜 License

This project is for educational and demonstration purposes. Please ensure you have proper API keys and follow OpenRouter's usage guidelines.
