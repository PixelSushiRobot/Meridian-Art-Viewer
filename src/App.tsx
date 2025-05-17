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
  const [colorPercentages, setColorPercentages] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [palette, setPalette] = useState<any>(null);
  const extractingRef = useRef(false);
  const toast = useToast();

  // Function to convert hex to RGB
  const hexToRgb = useCallback((hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }, []);

  // Function to calculate color distance
  const colorDistance = useCallback((rgb1: { r: number, g: number, b: number }, rgb2: { r: number, g: number, b: number }) => {
    return Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
    );
  }, []);

  // Function to calculate color luminance
  const getLuminance = (r: number, g: number, b: number) => {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  // Function to convert RGB to HSL
  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  };

  // Function to check if two colors are similar with stricter thresholds
  const areColorsSimilar = (color1: string, color2: string) => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return false;

    // Calculate RGB color difference using a weighted approach
    const deltaR = Math.abs(rgb1.r - rgb2.r);
    const deltaG = Math.abs(rgb1.g - rgb2.g);
    const deltaB = Math.abs(rgb1.b - rgb2.b);

    // Calculate luminance
    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    const lumDiff = Math.abs(lum1 - lum2);

    // Calculate HSL values
    const hsl1 = rgbToHsl(rgb1.r, rgb1.g, rgb1.b);
    const hsl2 = rgbToHsl(rgb2.r, rgb2.g, rgb2.b);

    // Calculate HSL differences
    const hueDiff = Math.abs(hsl1.h - hsl2.h);
    const satDiff = Math.abs(hsl1.s - hsl2.s);
    const lightDiff = Math.abs(hsl1.l - hsl2.l);

    // Weighted color difference in RGB space
    const weightedColorDiff = Math.sqrt(
      (deltaR * deltaR * 0.299) +
      (deltaG * deltaG * 0.587) +
      (deltaB * deltaB * 0.114)
    );

    // More strict thresholds
    const isColorSimilar = weightedColorDiff < 15; // Even more strict
    const isLuminanceSimilar = lumDiff < 0.08; // Even more strict
    const isHueSimilar = hueDiff < 15 || hueDiff > 345; // Consider both small and wraparound differences
    const isSatSimilar = satDiff < 20;
    const isLightSimilar = lightDiff < 15;

    // Consider colors similar if they're close in both RGB and HSL space
    const isRGBSimilar = isColorSimilar && isLuminanceSimilar;
    const isHSLSimilar = isHueSimilar && isSatSimilar && isLightSimilar;
    
    return isRGBSimilar || isHSLSimilar;
  };

  // Function to calculate color difference score
  const getColorDifferenceScore = (color1: string, color2: string) => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return 0;

    const deltaR = rgb1.r - rgb2.r;
    const deltaG = rgb1.g - rgb2.g;
    const deltaB = rgb1.b - rgb2.b;

    // Calculate weighted color difference
    const weightedDiff = Math.sqrt(
      (deltaR * deltaR * 0.299) +
      (deltaG * deltaG * 0.587) +
      (deltaB * deltaB * 0.114)
    );

    // Calculate luminance difference
    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    const lumDiff = Math.abs(lum1 - lum2);

    // Combined score with adjusted weights
    return (weightedDiff * 0.7) + (lumDiff * 255 * 0.3);
  };

  // Function to get edge histogram
  const getEdgeHistogram = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const edgeWidth = Math.max(5, Math.floor(Math.min(width, height) * 0.1));
    const edges = [
      // Top edge
      ctx.getImageData(0, 0, width, edgeWidth),
      // Right edge
      ctx.getImageData(width - edgeWidth, 0, edgeWidth, height),
      // Bottom edge
      ctx.getImageData(0, height - edgeWidth, width, edgeWidth),
      // Left edge
      ctx.getImageData(0, 0, edgeWidth, height)
    ];
    
    // Build histogram
    const histogram: { [key: string]: number } = {};
    edges.forEach(edge => {
      for (let i = 0; i < edge.data.length; i += 4) {
        const r = edge.data[i];
        const g = edge.data[i + 1];
        const b = edge.data[i + 2];
        
        // Quantize to reduce number of colors
        const key = `${Math.floor(r/10)*10},${Math.floor(g/10)*10},${Math.floor(b/10)*10}`;
        
        if (!histogram[key]) histogram[key] = 0;
        histogram[key]++;
      }
    });
    
    return histogram;
  };

  // Extract colors using node-vibrant with advanced processing
  const extractColors = useCallback(async (imageUrl: string) => {
    if (extractingRef.current) {
      return;
    }
    
    extractingRef.current = true;
    setLoading(true);
    
    try {
      console.log('Attempting to extract colors from:', imageUrl);

      const getCornerColor = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const sampleSize = 10;
        const corners = [
          ctx.getImageData(0, 0, sampleSize, sampleSize),
          ctx.getImageData(width - sampleSize, 0, sampleSize, sampleSize),
          ctx.getImageData(0, height - sampleSize, sampleSize, sampleSize),
          ctx.getImageData(width - sampleSize, height - sampleSize, sampleSize, sampleSize)
        ];
        
        let rSum = 0, gSum = 0, bSum = 0;
        let count = 0;
        
        corners.forEach(corner => {
          for (let i = 0; i < corner.data.length; i += 4) {
            rSum += corner.data[i];
            gSum += corner.data[i + 1];
            bSum += corner.data[i + 2];
            count++;
          }
        });
        
        return {
          r: Math.round(rSum / count),
          g: Math.round(gSum / count),
          b: Math.round(bSum / count)
        };
      };

      const getColorVerticalPosition = (ctx: CanvasRenderingContext2D, width: number, height: number, targetRgb: { r: number, g: number, b: number }) => {
        const imageData = ctx.getImageData(0, 0, width, height).data;
        let totalY = 0;
        let count = 0;
        
        for (let y = 0; y < height; y += 4) {
          for (let x = 0; x < width; x += 4) {
            const i = (y * width + x) * 4;
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            
            if (colorDistance({ r, g, b }, targetRgb) < 30) {
              totalY += y;
              count++;
            }
          }
        }
        
        return count > 0 ? totalY / count / height : 0.5;
      };

      // Create canvas for image analysis
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Analyze the image for black and white pixels
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let whitePixelCount = 0;
      let blackPixelCount = 0;
      let totalPixels = imageData.length / 4;
      const whiteThreshold = 240;
      const blackThreshold = 30;
      
      // Track vertical positions for black and white
      let whiteTotalY = 0;
      let blackTotalY = 0;
      let whiteCount = 0;
      let blackCount = 0;
      
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const brightness = (r + g + b) / 3;
          
          if (brightness >= whiteThreshold) {
            whitePixelCount++;
            whiteTotalY += y;
            whiteCount++;
          } else if (brightness <= blackThreshold) {
            blackPixelCount++;
            blackTotalY += y;
            blackCount++;
          }
        }
      }

      // Calculate black and white percentages and positions
      const whitePercentage = (whitePixelCount / totalPixels) * 100;
      const blackPercentage = (blackPixelCount / totalPixels) * 100;
      const whitePosition = whiteCount > 0 ? whiteTotalY / whiteCount / canvas.height : 0;
      const blackPosition = blackCount > 0 ? blackTotalY / blackCount / canvas.height : 0;
      const significantThreshold = 5;

      // Get corner color for background
      const bgColor = getCornerColor(ctx, canvas.width, canvas.height);
      setBackgroundColor(`rgb(${bgColor.r},${bgColor.g},${bgColor.b})`);

      // Get Vibrant palette
      const v = new Vibrant(img);
      const newPalette = await v.getPalette();
      setPalette(newPalette);

      // Filter and process colors
      let processedColors = Object.values(newPalette)
        .filter(swatch => swatch !== null)
        .filter(swatch => {
          const rgb = hexToRgb(swatch!.hex);
          return rgb && colorDistance(rgb, bgColor) > 45;
        })
        .map(swatch => {
          const rgb = hexToRgb(swatch!.hex)!;
          const verticalPosition = getColorVerticalPosition(ctx, canvas.width, canvas.height, rgb);
          return {
            color: swatch!.hex,
            population: swatch!.population,
            verticalPosition
          };
        });

      // Add black if significant
      if (blackPercentage >= significantThreshold) {
        processedColors.push({
          color: '#000000',
          population: blackPixelCount,
          verticalPosition: blackPosition
        });
      }

      // Add white if significant
      if (whitePercentage >= significantThreshold) {
        processedColors.push({
          color: '#FFFFFF',
          population: whitePixelCount,
          verticalPosition: whitePosition
        });
      }

      // Sort by vertical position
      processedColors = processedColors.sort((a, b) => a.verticalPosition - b.verticalPosition);

      // Update state with filtered colors
      setKeyColors(processedColors.map(c => c.color));
      setColorPercentages(new Map(
        processedColors.map(c => [c.color, (c.population / processedColors.reduce((sum, fc) => sum + fc.population, 0)) * 100])
      ));

      console.log('Processed colors:', processedColors);
    } catch (error) {
      console.error('Error extracting colors:', error);
      toast({
        title: 'Error',
        description: 'Failed to extract colors from the image',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
      extractingRef.current = false;
    }
  }, [toast, hexToRgb, colorDistance]);

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

    if (loading) {
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
  const getColorLabel = (color: string) => {
    // Handle special cases for black and white
    if (color === '#000000') return 'Black';
    if (color === '#FFFFFF') return 'White';

    // Get the palette object for comparison
    const paletteColors = {
      Vibrant: palette?.Vibrant?.hex,
      'Dark Vibrant': palette?.DarkVibrant?.hex,
      'Light Vibrant': palette?.LightVibrant?.hex,
      Muted: palette?.Muted?.hex,
      'Dark Muted': palette?.DarkMuted?.hex,
      'Light Muted': palette?.LightMuted?.hex
    };

    // Find matching palette color
    for (const [label, hex] of Object.entries(paletteColors)) {
      if (hex === color) return label;
    }

    return 'Other'; // Fallback label
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

            {/* Right Column - Original and Geometrized Artworks */}
            <GridItem>
              {artworkUrl ? (
                <Box>
                  {/* Original Artwork Section */}
                  <Box
                    bg="white"
                    borderRadius="lg"
                    overflow="hidden"
                    boxShadow="sm"
                    border="1px"
                    borderColor="gray.100"
                    mb={8}
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

                        {/* Color Visualization */}
                        <Box mb={6}>
                          <Text fontSize="sm" color="gray.600" mb={2}>
                            Color Visualization
                          </Text>
                          <Box
                            w="100%"
                            h="300px"
                            position="relative"
                            borderRadius="md"
                            overflow="hidden"
                            bg={backgroundColor}
                            boxShadow="md"
                            border="1px solid"
                            borderColor="gray.200"
                          >
                            {(() => {
                              // Filter out background color
                              const nonBackgroundColors = keyColors.filter(color => color !== backgroundColor);
                              const nonBackgroundPercentages = new Map(
                                Array.from(colorPercentages.entries())
                                  .filter(([color]) => color !== backgroundColor)
                              );

                              // Calculate total percentage and set minimum height
                              const minHeightPercent = 10; // 10% minimum height
                              const padding = 10; // 10% padding on each side
                              const availableHeight = 100 - (2 * padding); // Available height after padding
                              const totalPercentage = Array.from(nonBackgroundPercentages.values()).reduce((sum, val) => sum + val, 0);

                              // First pass: Calculate initial heights with minimum enforcement
                              const initialHeights = new Map(
                                Array.from(nonBackgroundPercentages.entries()).map(([color, percentage]) => {
                                  const heightPercent = (percentage / totalPercentage) * availableHeight;
                                  return [color, Math.max(heightPercent, minHeightPercent)];
                                })
                              );

                              // Calculate total height after minimum enforcement
                              const totalHeight = Array.from(initialHeights.values()).reduce((sum, height) => sum + height, 0);

                              // Second pass: Scale heights to fit available space
                              const scalingFactor = availableHeight / totalHeight;
                              const finalHeights = new Map(
                                Array.from(initialHeights.entries()).map(([color, height]) => [
                                  color,
                                  height * scalingFactor
                                ])
                              );

                              // Start at top padding
                              let currentTop = padding;

                              // Colors are ordered by their vertical position in the image
                              return nonBackgroundColors.map((color, index) => {
                                const height = finalHeights.get(color) || 0;
                                const top = currentTop;
                                currentTop += height;

                                // Calculate the actual percentage for display
                                const actualPercentage = Math.round((nonBackgroundPercentages.get(color) || 0) / totalPercentage * 100);

                                return (
                                  <Box
                                    key={index}
                                    position="absolute"
                                    left={`${padding}%`}
                                    width={`${100 - (2 * padding)}%`}
                                    height={`${height}%`}
                                    bg={color}
                                    top={`${top}%`}
                                    transform="auto"
                                    translateY="0"
                                    opacity={0.9}
                                    transition="all 0.2s"
                                    _hover={{
                                      opacity: 1,
                                      width: `${100 - (1.5 * padding)}%`,
                                      left: `${padding * 0.75}%`,
                                    }}
                                  >
                                    <Box
                                      position="absolute"
                                      right="0"
                                      top="50%"
                                      transform="translateY(-50%)"
                                      bg="rgba(0,0,0,0.6)"
                                      color="white"
                                      fontSize="xs"
                                      px={2}
                                      py={1}
                                      borderRadius="md"
                                      opacity={0}
                                      _groupHover={{ opacity: 1 }}
                                    >
                                      {actualPercentage}%
                                    </Box>
                                  </Box>
                                );
                              });
                            })()}
                          </Box>
                        </Box>

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
                                  {getColorLabel(color)}
                                </Text>
                                <Text
                                  fontSize="xs"
                                  color="gray.600"
                                  fontFamily="mono"
                                  textAlign="center"
                                  mb={1}
                                >
                                  {color.toUpperCase()}
                                </Text>
                                <Text
                                  fontSize="xs"
                                  color="gray.500"
                                  textAlign="center"
                                >
                                  {Math.round(colorPercentages.get(color) || 0)}%
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
