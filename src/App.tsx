import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
} from '@chakra-ui/react';
import ColorThief from 'colorthief';

function App() {
  const [artworkId, setArtworkId] = useState('');
  const [artworkUrl, setArtworkUrl] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [keyColors, setKeyColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [gridSize, setGridSize] = useState(20); // Default grid size (higher = more detailed)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toast = useToast();

  // Convert RGB array to HEX
  const rgbToHex = useCallback((r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }, []);

  // Simplify image into grid
  const simplifyImage = useCallback((img: HTMLImageElement): HTMLCanvasElement => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    
    // Set canvas size to match image
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Draw original image
    ctx.drawImage(img, 0, 0);
    
    const cellWidth = Math.floor(canvas.width / gridSize);
    const cellHeight = Math.floor(canvas.height / gridSize);
    
    // For each grid cell
    for (let y = 0; y < canvas.height; y += cellHeight) {
      for (let x = 0; x < canvas.width; x += cellWidth) {
        // Get the average color of the cell
        const cellData = ctx.getImageData(x, y, cellWidth, cellHeight).data;
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let i = 0; i < cellData.length; i += 4) {
          r += cellData[i];
          g += cellData[i + 1];
          b += cellData[i + 2];
          count++;
        }
        
        // Calculate average color
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        
        // Fill the cell with the average color
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, cellWidth, cellHeight);
      }
    }
    
    return canvas;
  }, [gridSize]);

  // Extract colors using ColorThief
  const extractColors = useCallback(async (imageUrl: string) => {
    setLoading(true);
    try {
      const colorThief = new ColorThief();
      const img = document.createElement('img');
      img.crossOrigin = 'Anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Simplify the image first
      const simplifiedCanvas = simplifyImage(img);
      
      // Get the dominant color for background from original image borders
      const getBorderColors = (img: HTMLImageElement): [number, number, number][] => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const borderPixels: [number, number, number][] = [];
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Get pixels from all four borders
        for (let x = 0; x < canvas.width; x++) {
          // Top border
          const topIdx = (x + 0 * canvas.width) * 4;
          borderPixels.push([data[topIdx], data[topIdx + 1], data[topIdx + 2]]);
          
          // Bottom border
          const bottomIdx = (x + (canvas.height - 1) * canvas.width) * 4;
          borderPixels.push([data[bottomIdx], data[bottomIdx + 1], data[bottomIdx + 2]]);
        }
        
        for (let y = 0; y < canvas.height; y++) {
          // Left border
          const leftIdx = (0 + y * canvas.width) * 4;
          borderPixels.push([data[leftIdx], data[leftIdx + 1], data[leftIdx + 2]]);
          
          // Right border
          const rightIdx = ((canvas.width - 1) + y * canvas.width) * 4;
          borderPixels.push([data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]]);
        }

        return borderPixels;
      };

      // Helper function to calculate color difference
      const getColorDifference = (color1: [number, number, number], color2: [number, number, number]): number => {
        return Math.sqrt(
          Math.pow(color1[0] - color2[0], 2) +
          Math.pow(color1[1] - color2[1], 2) +
          Math.pow(color1[2] - color2[2], 2)
        );
      };

      // Get the most common border color
      const borderColors = getBorderColors(img);
      const colorCounts = new Map<string, number>();
      
      borderColors.forEach(color => {
        const key = color.join(',');
        colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
      });

      let mostCommonBorderColor: [number, number, number] = [255, 255, 255];
      let maxCount = 0;

      colorCounts.forEach((count, colorKey) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommonBorderColor = colorKey.split(',').map(Number) as [number, number, number];
        }
      });

      const bgColor = rgbToHex(...mostCommonBorderColor);
      setBackgroundColor(bgColor);

      // Convert canvas to image for ColorThief
      const simplifiedImg = document.createElement('img');
      simplifiedImg.crossOrigin = 'Anonymous';
      await new Promise((resolve, reject) => {
        simplifiedImg.onload = resolve;
        simplifiedImg.onerror = reject;
        simplifiedImg.src = simplifiedCanvas.toDataURL();
      });

      // Get palette for key colors from simplified image
      const palette = colorThief.getPalette(simplifiedImg, 16); // Get more colors to filter
      const keyColorSet = new Set<string>();

      // Check if white exists in the simplified image
      const white: [number, number, number] = [255, 255, 255];
      const hasWhite = palette.some(color => getColorDifference(color, white) < 30);
      
      if (hasWhite) {
        keyColorSet.add('#FFFFFF');
      }

      // Filter colors that are too similar to background or each other
      palette.forEach(color => {
        const hexColor = rgbToHex(...color);
        const diffFromBg = getColorDifference(color, mostCommonBorderColor);
        
        // Only add colors that are different enough from background
        if (diffFromBg > 50) {
          // Check if color is different enough from already selected colors
          const isDifferentEnough = Array.from(keyColorSet).every(existingHex => {
            const existing = existingHex.match(/\w\w/g)?.map(h => parseInt(h, 16)) || [];
            return getColorDifference(color, existing as [number, number, number]) > 50;
          });

          if (isDifferentEnough) {
            keyColorSet.add(hexColor);
          }
        }
      });

      // Take exactly 8 distinct colors (not counting background)
      setKeyColors(Array.from(keyColorSet).slice(0, 8));
    } catch (error) {
      console.error('Error extracting colors:', error);
      toast({
        title: 'Error',
        description: 'Failed to extract colors from the artwork',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [rgbToHex, toast, simplifyImage]);

  // Effect to extract colors when artwork URL changes
  useEffect(() => {
    if (artworkUrl) {
      extractColors(artworkUrl);
    }
  }, [artworkUrl, extractColors]);

  // Effect to re-extract colors when grid size changes
  useEffect(() => {
    if (artworkUrl) {
      extractColors(artworkUrl);
    }
  }, [gridSize, artworkUrl, extractColors]);

  const fetchArtwork = () => {
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

    // Format the token ID with leading zeros
    const formattedTokenId = artworkId.toString().padStart(3, '0');
    console.log('Formatted token ID:', formattedTokenId);
    
    // Use the Art Blocks token endpoint
    const imageUrl = `https://media.artblocks.io/163000${formattedTokenId}.png`;
    console.log('Image URL:', imageUrl);
    setArtworkUrl(imageUrl);
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
                    onClick={fetchArtwork}
                    size="lg"
                    colorScheme="blue"
                    w="100%"
                    boxShadow="sm"
                    isLoading={loading}
                    mb={6}
                  >
                    View Artwork
                  </Button>

                  {/* Grid Size Slider */}
                  <Box mt={6}>
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      Simplification Level
                    </Text>
                    <Slider
                      min={5}
                      max={50}
                      step={5}
                      value={gridSize}
                      onChange={setGridSize}
                      mb={2}
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                    <Flex justify="space-between">
                      <Text fontSize="xs" color="gray.500">More Simplified</Text>
                      <Text fontSize="xs" color="gray.500">More Detailed</Text>
                    </Flex>
                  </Box>

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
                  <Box p={6}>
                    {/* Images Grid */}
                    <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                      {/* Original Image */}
                      <Box>
                        <Text fontSize="sm" color="gray.600" mb={2}>
                          Original
                        </Text>
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
                      
                      {/* Simplified Image */}
                      <Box>
                        <Text fontSize="sm" color="gray.600" mb={2}>
                          Simplified
                        </Text>
                        <Box borderRadius="md" overflow="hidden">
                          <canvas
                            ref={canvasRef}
                            style={{
                              width: '100%',
                              height: 'auto',
                              display: 'block'
                            }}
                          />
                        </Box>
                      </Box>
                    </Grid>
                  </Box>

                  <Box borderTop="1px" borderColor="gray.100" p={6}>
                    <Flex justify="space-between" align="center" mb={6}>
                      <Link
                        href={`https://www.artblocks.io/token/0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270/163000${artworkId.padStart(3, '0')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="blue.500"
                        fontSize="sm"
                      >
                        View on Art Blocks →
                      </Link>
                      <Text color="gray.500" fontSize="sm">
                        Color Palette
                      </Text>
                    </Flex>

                    {/* Background Color */}
                    <Box mb={4}>
                      <Text fontSize="sm" color="gray.600" mb={2}>
                        Background Color
                      </Text>
                      <Grid templateColumns="repeat(1, 1fr)" gap={4}>
                        <Box>
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
                      </Grid>
                    </Box>

                    <Divider my={6} />

                    {/* Key Colors */}
                    <Box>
                      <Text fontSize="sm" color="gray.600" mb={2}>
                        Key Colors
                      </Text>
                      <Grid templateColumns="repeat(8, 1fr)" gap={4}>
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
                            >
                              {color.toUpperCase()}
                            </Text>
                          </Box>
                        ))}
                      </Grid>
                    </Box>
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
