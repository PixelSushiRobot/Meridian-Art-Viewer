import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Vibrant } from "node-vibrant/browser";
import {
  ChakraProvider,
  Box,
  Flex,
  Input,
  Button,
  Image as ChakraImage,
  Container,
  Heading,
  useToast,
  Link,
  Grid,
  GridItem,
  Text,
  Divider,
} from '@chakra-ui/react';

function App() {
  const [artworkId, setArtworkId] = useState('');
  const [artworkUrl, setArtworkUrl] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [keyColors, setKeyColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toast = useToast();

  // Extract colors using node-vibrant
  const extractColors = useCallback(async (imageUrl: string) => {
    setLoading(true);
    try {
      console.log('Attempting to extract colors from:', imageUrl);

      // First, get the background color from the image border
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Create canvas to sample border pixels
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Sample pixels from all four borders
      const borderPixels: { r: number; g: number; b: number }[] = [];
      
      // Top and bottom borders
      for (let x = 0; x < canvas.width; x++) {
        const topData = ctx.getImageData(x, 0, 1, 1).data;
        const bottomData = ctx.getImageData(x, canvas.height - 1, 1, 1).data;
        borderPixels.push({ r: topData[0], g: topData[1], b: topData[2] });
        borderPixels.push({ r: bottomData[0], g: bottomData[1], b: bottomData[2] });
      }
      
      // Left and right borders
      for (let y = 0; y < canvas.height; y++) {
        const leftData = ctx.getImageData(0, y, 1, 1).data;
        const rightData = ctx.getImageData(canvas.width - 1, y, 1, 1).data;
        borderPixels.push({ r: leftData[0], g: leftData[1], b: leftData[2] });
        borderPixels.push({ r: rightData[0], g: rightData[1], b: rightData[2] });
      }

      // Find the most common border color
      const colorCounts = new Map<string, { color: string; count: number }>();
      borderPixels.forEach(pixel => {
        const colorKey = `rgb(${pixel.r},${pixel.g},${pixel.b})`;
        const existing = colorCounts.get(colorKey);
        if (existing) {
          existing.count++;
        } else {
          colorCounts.set(colorKey, { color: colorKey, count: 1 });
        }
      });

      let mostCommonColor = '#FFFFFF';
      let maxCount = 0;
      colorCounts.forEach(({ color, count }) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommonColor = color;
        }
      });

      console.log('Detected background color:', mostCommonColor);
      setBackgroundColor(mostCommonColor);

      // First, analyze the image for white and black areas
      const whiteAnalysisImg = new Image();
      whiteAnalysisImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        whiteAnalysisImg.onload = resolve;
        whiteAnalysisImg.onerror = reject;
        whiteAnalysisImg.src = imageUrl;
      });

      const whiteAnalysisCanvas = document.createElement('canvas');
      const whiteAnalysisCtx = whiteAnalysisCanvas.getContext('2d')!;
      whiteAnalysisCanvas.width = whiteAnalysisImg.width;
      whiteAnalysisCanvas.height = whiteAnalysisImg.height;
      whiteAnalysisCtx.drawImage(whiteAnalysisImg, 0, 0);

      // Sample pixels to find white and black areas
      const imageData = whiteAnalysisCtx.getImageData(0, 0, whiteAnalysisCanvas.width, whiteAnalysisCanvas.height).data;
      let whitePixelCount = 0;
      let blackPixelCount = 0;
      let totalPixels = 0;
      const whiteThreshold = 240; // Slightly lower threshold for white
      const blackThreshold = 30; // Threshold for black
      
      for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const brightness = (r + g + b) / 3;
        
        if (brightness >= whiteThreshold) {
          whitePixelCount++;
        } else if (brightness <= blackThreshold) {
          blackPixelCount++;
        }
        totalPixels++;
      }

      // Calculate white and black color percentages
      const whitePercentage = (whitePixelCount / totalPixels) * 100;
      const blackPercentage = (blackPixelCount / totalPixels) * 100;
      
      // For black and white images, lower the threshold for considering a color significant
      const isMonochromatic = (whitePercentage + blackPercentage) > 90;
      const significantThreshold = isMonochromatic ? 3 : 5; // Lower threshold for B&W images

      // Get the vibrant palette
      const v = Vibrant.from(imageUrl)
        .quality(1)
        .maxColorCount(32)
        .useQuantizer('mmcq');

      const palette = await v.getPalette();
      
      // Organize colors by category with priority for Meridian's style
      const standardColors = [
        palette.Vibrant?.hex,
        palette.DarkVibrant?.hex,
        palette.LightVibrant?.hex,
        palette.Muted?.hex,
        palette.DarkMuted?.hex,
        palette.LightMuted?.hex
      ].filter((color): color is string => {
        if (!color) return false;
        
        const rgb = color.match(/\w\w/g)?.map((x: string) => parseInt(x, 16)) || [];
        if (rgb.length !== 3) return false;

        const [r, g, b] = rgb;
        const brightness = (r + g + b) / 3;
        
        // Skip colors that are too close to pure black or white
        if (brightness >= whiteThreshold || brightness <= blackThreshold) {
          return false;
        }

        // For B&W images, be more lenient with color acceptance
        if (isMonochromatic) {
          return true;
        }

        // Standard color filtering for color images
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const chroma = max - min;
        return chroma > 5 && brightness >= 20 && brightness < whiteThreshold;
      });

      // Build the final color array including black and white when significant
      const finalColors: string[] = [];
      
      // Add black if significant and actually present
      if (blackPercentage >= significantThreshold) {
        // Only add pure black or very close to black
        const pureBlack = '#000000';
        finalColors.push(pureBlack);
      }
      
      // Add standard colors, ensuring no browns or dark colors are labeled as black
      finalColors.push(...standardColors.filter(color => {
        const rgb = color.match(/\w\w/g)?.map((x: string) => parseInt(x, 16)) || [];
        if (rgb.length !== 3) return false;

        const [r, g, b] = rgb;
        const brightness = (r + g + b) / 3;
        
        // Ensure we don't include colors that are too close to black
        // This prevents dark browns and other dark colors from being filtered
        return brightness > blackThreshold;
      }));
      
      // Add white if significant
      if (whitePercentage >= significantThreshold) {
        const pureWhite = '#FFFFFF';
        finalColors.push(pureWhite);
      }

      console.log('Color percentages:', { white: whitePercentage, black: blackPercentage });
      console.log('Is monochromatic:', isMonochromatic);
      console.log('Final colors:', finalColors);
      setKeyColors(finalColors);

    } catch (error) {
      console.error('Detailed error extracting colors:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      toast({
        title: 'Error',
        description: `Failed to extract colors: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Effect to extract colors when artwork URL changes
  useEffect(() => {
    if (artworkUrl) {
      extractColors(artworkUrl);
    }
  }, [artworkUrl, extractColors]);

  const fetchArtwork = async () => {
    if (!artworkId || isNaN(Number(artworkId)) || Number(artworkId) < 0 || Number(artworkId) > 999) {
      toast({
        title: 'Invalid artwork ID',
        description: 'Please enter a number between 0 and 999',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const formattedTokenId = artworkId.toString().padStart(3, '0');
      const imageUrl = `https://media.artblocks.io/163000${formattedTokenId}.png`;
      
      // Preload the image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      console.log('Image loaded successfully:', imageUrl);
      setArtworkUrl(imageUrl);
    } catch (error) {
      console.error('Error loading image:', error);
      toast({
        title: 'Error',
        description: 'Failed to load the artwork image. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Update the color swatches display to show labels
  const colorCategories = [
    'Black',
    'Vibrant',
    'Dark Vibrant',
    'Light Vibrant',
    'Muted',
    'Dark Muted',
    'Light Muted',
    'White'
  ];

  // Helper function to get color label
  const getColorLabel = (color: string, index: number) => {
    // Only label as black if it's pure black or extremely close to black
    if (color === '#000000') return 'Black';
    if (color === '#FFFFFF') return 'White';

    // For all other colors, use the vibrant categories
    const standardColorIndex = keyColors.indexOf(color) - (keyColors.includes('#000000') ? 1 : 0);
    return colorCategories[standardColorIndex + 1]; // +1 to skip the 'Black' category if color isn't black
  };

  return (
    <ChakraProvider>
      <Box minH="100vh" bg="gray.50" py={8}>
        <Container maxW="container.xl">
          <Grid templateColumns={{ base: "1fr", md: "350px 1fr" }} gap={8}>
            {/* Left Column - Input and Info */}
            <GridItem>
              <Box position="sticky" top={8}>
                <Heading as="h1" size="lg" mb={6} color="gray.700">
                  Meridian Art Viewer
                </Heading>
                <Box 
                  bg="white" 
                  p={6} 
                  borderRadius="lg" 
                  boxShadow="sm"
                  border="1px"
                  borderColor="gray.100"
                >
                  <Text mb={4} color="gray.600" fontSize="sm">
                    Enter an artwork ID between 0 and 999 to view the Meridian artwork and its color palette.
                  </Text>
                  <Input
                    placeholder="Enter artwork ID"
                    value={artworkId}
                    onChange={(e) => setArtworkId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        fetchArtwork();
                      }
                    }}
                    size="lg"
                    type="number"
                    min={0}
                    max={999}
                    bg="white"
                    boxShadow="sm"
                    mb={4}
                  />
                  <Button
                    onClick={() => {
                      setLoading(true);
                      fetchArtwork().finally(() => setLoading(false));
                    }}
                    size="lg"
                    colorScheme="blue"
                    w="100%"
                    boxShadow="sm"
                    isLoading={loading}
                    mb={6}
                  >
                    View Artwork
                  </Button>

                  {artworkId && (
                    <Text mt={4} fontSize="sm" color="gray.500" textAlign="center">
                      Viewing Meridian #{artworkId.padStart(3, '0')}
                    </Text>
                  )}
                </Box>
              </Box>
            </GridItem>

            {/* Right Column - Artwork and Colors */}
            <GridItem>
              {artworkUrl ? (
                <Box
                  bg="white"
                  borderRadius="lg"
                  overflow="hidden"
                  boxShadow="sm"
                  border="1px"
                  borderColor="gray.100"
                >
                  <Grid templateColumns={{ base: "1fr", lg: "3fr 1fr" }} gap={6} p={6}>
                    {/* Original Image */}
                    <Box>
                      <ChakraImage
                        src={artworkUrl}
                        alt={`Meridian Artwork #${artworkId}`}
                        w="100%"
                        h="auto"
                        objectFit="contain"
                        borderRadius="md"
                        crossOrigin="anonymous"
                      />
                    </Box>

                    {/* Color Swatches */}
                    <Box>
                      {/* Background Color */}
                      <Box mb={4}>
                        <Text fontSize="sm" color="gray.600" mb={2}>
                          Background Color
                        </Text>
                        <Box
                          w="100%"
                          paddingBottom="20%"
                          position="relative"
                          mb={2}
                        >
                          <Box
                            position="absolute"
                            top={0}
                            left={0}
                            right={0}
                            bottom={0}
                            borderRadius="md"
                            bg={backgroundColor}
                            boxShadow="md"
                            border="1px solid"
                            borderColor="gray.200"
                          />
                        </Box>
                        <Text
                          fontSize="xs"
                          color="gray.600"
                          fontFamily="mono"
                          textAlign="center"
                        >
                          {backgroundColor.toUpperCase()}
                        </Text>
                      </Box>

                      <Divider my={6} />

                      {/* Key Colors */}
                      <Box>
                        <Text fontSize="sm" color="gray.600" mb={2}>
                          Key Colors
                        </Text>
                        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                          {keyColors.map((color, index) => (
                            <Box key={index}>
                              <Box
                                w="100%"
                                paddingBottom="100%"
                                position="relative"
                                mb={2}
                              >
                                <Box
                                  position="absolute"
                                  top={0}
                                  left={0}
                                  right={0}
                                  bottom={0}
                                  borderRadius="md"
                                  bg={color}
                                  boxShadow="md"
                                  border="1px solid"
                                  borderColor="gray.200"
                                />
                              </Box>
                              <Text
                                fontSize="xs"
                                color="gray.600"
                                fontFamily="mono"
                                textAlign="center"
                                mb={1}
                              >
                                {getColorLabel(color, index)}
                              </Text>
                              <Text
                                fontSize="xs"
                                color="gray.600"
                                fontFamily="mono"
                                textAlign="center"
                              >
                                {color.toUpperCase()}
                              </Text>
                            </Box>
                          ))}
                        </Grid>
                      </Box>
                    </Box>
                  </Grid>

                  <Box borderTop="1px" borderColor="gray.100" p={6}>
                    <Flex justify="space-between" align="center">
                      <Link
                        href={`https://www.artblocks.io/token/0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270/163000${artworkId.padStart(3, '0')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="blue.500"
                        fontSize="sm"
                      >
                        View on Art Blocks →
                      </Link>
                    </Flex>
                  </Box>
                </Box>
              ) : (
                <Flex 
                  height="100%" 
                  align="center" 
                  justify="center"
                  bg="white"
                  borderRadius="lg"
                  border="1px"
                  borderColor="gray.100"
                  p={8}
                >
                  <Text color="gray.500">
                    Enter an artwork ID to view the Meridian artwork
                  </Text>
                </Flex>
              )}
            </GridItem>
          </Grid>
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default App;
