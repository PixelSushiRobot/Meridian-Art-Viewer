# Meridian Art Viewer

A React-based web application for viewing Meridian artworks from the Art Blocks platform. This viewer allows users to explore Meridian artworks by entering token IDs between 0 and 999, with advanced color analysis features.

🌐 **[View Live Demo](https://pixelsushirobot.github.io/Meridian-Art-Viewer)**

## Features

- View Meridian artworks by entering token IDs (0-999)
- Direct links to Art Blocks platform for each artwork
- Responsive design using Chakra UI
- Real-time artwork loading and display
- Advanced color analysis:
  - Accurate background color detection from artwork borders
  - 8 distinct key colors extracted from the artwork
  - Smart color difference calculation to ensure unique colors
  - Optional white color detection
- Image Simplification:
  - Side-by-side view of original and simplified artwork
  - Adjustable grid-based simplification
  - Real-time color palette updates based on simplification level
  - Customizable grid size (5-50 cells)

## Technologies Used

- React
- TypeScript
- Chakra UI
- Color Thief (for color extraction)
- Create React App

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/PixelSushiRobot/Meridian-Art-Viewer.git
cd Meridian-Art-Viewer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Usage

1. Enter a token ID between 0 and 999 in the input field
2. Click "View Artwork" to load the corresponding Meridian artwork
3. Use the simplification slider to adjust the grid size:
   - Move left for more simplified view
   - Move right for more detailed view
4. Observe the color analysis:
   - Background color (detected from artwork borders)
   - 8 key colors extracted from the simplified artwork
5. Click "View on Art Blocks" to see the artwork on the official Art Blocks platform

## Color Analysis Details

The application performs sophisticated color analysis:
- Background color is detected by analyzing the artwork's border pixels
- Key colors are extracted from the simplified version of the artwork
- Color difference calculations ensure distinct and representative colors
- White is only included when it's a significant part of the artwork
- The palette updates in real-time as you adjust the simplification level

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
