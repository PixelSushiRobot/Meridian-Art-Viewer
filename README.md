# Meridian Art Viewer

A React-based viewer for Art Blocks' Meridian collection that analyzes and visualizes the color composition of each artwork.

**Live Demo**: [https://pixelsushirobot.github.io/Meridian-Art-Viewer/](https://pixelsushirobot.github.io/Meridian-Art-Viewer/)

## Features

- View any Meridian artwork by ID (0-999)
- Automatic color palette extraction using node-vibrant
- Smart background color detection
- Color visualization with proportional representation
- Vertical position-based color ordering
- Interactive color swatches with hover effects
- Percentage breakdown of color usage

## Technical Details

- Built with React and TypeScript
- Uses Chakra UI for styling
- Implements node-vibrant for color extraction
- Canvas-based image analysis for accurate color detection
- Optimized for frequent pixel reading operations

## Getting Started

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

1. Enter a Meridian artwork ID (0-999) in the input field
2. Click "View Artwork" or press Enter
3. The artwork will be displayed along with:
   - Original artwork image
   - Background color detection
   - Color visualization
   - Color swatches with percentages

## Color Analysis Features

- Background color detection using corner sampling
- Vertical position tracking for each color
- Minimum 10% height for better visibility
- Equal padding on all sides
- Smart color filtering to remove similar colors
- Black and white detection for monochrome elements

## Dependencies

- React
- Chakra UI
- node-vibrant
- TypeScript

## License

MIT License - See [LICENSE](LICENSE) file for details

## Author

[PixelSushiRobot](https://github.com/PixelSushiRobot)
