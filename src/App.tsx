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

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

interface Lab {
  l: number;
  a: number;
  b: number;
}

interface ColorScore {
  rgb: RGB;
  hex: string;
  hsl: HSL;
  population: number;
  score: number;
  category: 'vibrant' | 'muted' | 'light' | 'dark';
}

function App() {
  const [artworkId, setArtworkId] = useState('');
  const [artworkUrl, setArtworkUrl] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [keyColors, setKeyColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toast = useToast();

  // Convert RGB to HSL
  const rgbToHsl = (r: number, g: number, b: number): HSL => {
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

  // Convert RGB to HEX
  const rgbToHex = useCallback(({ r, g, b }: RGB): string => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }, []);

  // Convert RGB to LAB color space
  const rgbToLab = (rgb: RGB): Lab => {
    // Convert RGB to XYZ
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100;
    const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100;
    const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100;

    // Convert XYZ to Lab
    const xn = 95.047;
    const yn = 100.0;
    const zn = 108.883;

    const xyz = [x / xn, y / yn, z / zn];
    for (let i = 0; i < 3; i++) {
      xyz[i] = xyz[i] > 0.008856 
        ? Math.pow(xyz[i], 1/3) 
        : (7.787 * xyz[i]) + 16/116;
    }

    return {
      l: (116 * xyz[1]) - 16,
      a: 500 * (xyz[0] - xyz[1]),
      b: 200 * (xyz[1] - xyz[2])
    };
  };

  // Calculate CIEDE2000 color difference
  const getColorDistance = (color1: RGB, color2: RGB): number => {
    const lab1 = rgbToLab(color1);
    const lab2 = rgbToLab(color2);

    const deltaL = lab2.l - lab1.l;
    const l = (lab1.l + lab2.l) / 2;
    const c1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
    const c2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
    const c = (c1 + c2) / 2;

    const a1p = lab1.a + (lab1.a / 2) * (1 - Math.sqrt(Math.pow(c, 7) / (Math.pow(c, 7) + Math.pow(25, 7))));
    const a2p = lab2.a + (lab2.a / 2) * (1 - Math.sqrt(Math.pow(c, 7) / (Math.pow(c, 7) + Math.pow(25, 7))));

    const c1p = Math.sqrt(a1p * a1p + lab1.b * lab1.b);
    const c2p = Math.sqrt(a2p * a2p + lab2.b * lab2.b);
    const cp = (c1p + c2p) / 2;

    const deltaC = c2p - c1p;
    const h1p = Math.atan2(lab1.b, a1p);
    const h2p = Math.atan2(lab2.b, a2p);
    let dhp = h2p - h1p;

    if (dhp > Math.PI) dhp -= 2 * Math.PI;
    if (dhp < -Math.PI) dhp += 2 * Math.PI;

    const dH = 2 * Math.sqrt(c1p * c2p) * Math.sin(dhp / 2);

    const sl = 1 + (0.015 * Math.pow(l - 50, 2)) / Math.sqrt(20 + Math.pow(l - 50, 2));
    const sc = 1 + 0.045 * cp;
    const sh = 1 + 0.015 * cp * (1 - 0.17 * Math.cos(h1p - Math.PI/6) + 0.24 * Math.cos(2 * h1p) + 0.32 * Math.cos(3 * h1p + Math.PI/30) - 0.20 * Math.cos(4 * h1p - 21 * Math.PI/60));

    const rt = -2 * Math.sqrt(Math.pow(cp, 7) / (Math.pow(cp, 7) + Math.pow(25, 7))) * Math.sin(60 * Math.exp(-Math.pow((h1p * 180/Math.PI - 275) / 25, 2)) * Math.PI/180);

    return Math.sqrt(
      Math.pow(deltaL / sl, 2) +
      Math.pow(deltaC / sc, 2) +
      Math.pow(dH / sh, 2) +
      rt * (deltaC / sc) * (dH / sh)
    );
  };

  // Calculate color importance score with improved weights
  const getColorScore = (color: ColorScore): number => {
    const { h, s, l } = color.hsl;
    const population = Math.log(color.population + 1);
    
    // Saturation importance (0-100)
    // Boost mid-range saturations (40-80%)
    const saturationScore = s * (1 + Math.exp(-(Math.pow(s - 60, 2) / 800)));
    
    // Brightness importance (0-100)
    // Prefer colors that aren't too dark or too light
    const brightnessScore = 100 - Math.abs(l - 50);
    
    // Hue importance
    // Slightly boost warm colors (reds, oranges, yellows)
    const hueScore = (h >= 0 && h <= 60) ? 20 : 0;
    
    // Population importance (logarithmic scale)
    const populationScore = population * 0.5;
    
    // Combine scores with weights
    return (
      saturationScore * 1.2 +
      brightnessScore * 0.8 +
      hueScore * 0.3 +
      populationScore * 0.4
    );
  };

  // Categorize color with improved thresholds
  const categorizeColor = (hsl: HSL): ColorScore['category'] => {
    const { s, l } = hsl;
    
    if (l >= 80) return 'light';
    if (l <= 20) return 'dark';
    if (s >= 60) return 'vibrant';
    return 'muted';
  };

  // Simplify image into grid
  const simplifyImage = useCallback((img: HTMLImageElement): HTMLCanvasElement => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const cellWidth = Math.floor(canvas.width / gridSize);
    const cellHeight = Math.floor(canvas.height / gridSize);
    
    for (let y = 0; y < canvas.height; y += cellHeight) {
      for (let x = 0; x < canvas.width; x += cellWidth) {
        const cellData = ctx.getImageData(x, y, cellWidth, cellHeight).data;
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let i = 0; i < cellData.length; i += 4) {
          r += cellData[i];
          g += cellData[i + 1];
          b += cellData[i + 2];
          count++;
        }
        
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, cellWidth, cellHeight);
      }
    }
    
    return canvas;
  }, [gridSize]);

  // Extract colors using custom algorithm
  const extractColors = useCallback(async (imageUrl: string) => {
    setLoading(true);
    try {
      const img = document.createElement('img');
      img.crossOrigin = 'Anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Get background color from border pixels
      const getBorderColors = (img: HTMLImageElement): RGB[] => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const borderPixels: RGB[] = [];
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Get pixels from all four borders
        for (let x = 0; x < canvas.width; x++) {
          // Top border
          const topIdx = (x + 0 * canvas.width) * 4;
          borderPixels.push({ r: data[topIdx], g: data[topIdx + 1], b: data[topIdx + 2] });
          
          // Bottom border
          const bottomIdx = (x + (canvas.height - 1) * canvas.width) * 4;
          borderPixels.push({ r: data[bottomIdx], g: data[bottomIdx + 1], b: data[bottomIdx + 2] });
        }
        
        for (let y = 0; y < canvas.height; y++) {
          // Left border
          const leftIdx = (0 + y * canvas.width) * 4;
          borderPixels.push({ r: data[leftIdx], g: data[leftIdx + 1], b: data[leftIdx + 2] });
          
          // Right border
          const rightIdx = ((canvas.width - 1) + y * canvas.width) * 4;
          borderPixels.push({ r: data[rightIdx], g: data[rightIdx + 1], b: data[rightIdx + 2] });
        }

        return borderPixels;
      };

      // Get the most common border color
      const borderColors = getBorderColors(img);
      const colorCounts = new Map<string, { rgb: RGB; count: number }>();
      
      borderColors.forEach(rgb => {
        const key = `${rgb.r},${rgb.g},${rgb.b}`;
        const existing = colorCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          colorCounts.set(key, { rgb, count: 1 });
        }
      });

      let mostCommonBorderColor: RGB = { r: 255, g: 255, b: 255 };
      let maxCount = 0;

      colorCounts.forEach(({ rgb, count }) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommonBorderColor = rgb;
        }
      });

      setBackgroundColor(rgbToHex(mostCommonBorderColor));

      // Sample colors from the entire image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const colorMap = new Map<string, ColorScore>();

      // Adaptive sampling based on image size
      const samplingRate = Math.max(1, Math.floor(data.length / (4 * 10000))); // Sample up to 10000 pixels

      // Sample colors with adaptive rate
      for (let i = 0; i < data.length; i += 4 * samplingRate) {
        const rgb: RGB = { r: data[i], g: data[i + 1], b: data[i + 2] };
        const key = `${rgb.r},${rgb.g},${rgb.b}`;
        
        const existing = colorMap.get(key);
        if (existing) {
          existing.population++;
        } else {
          const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
          colorMap.set(key, {
            rgb,
            hex: rgbToHex(rgb),
            hsl,
            population: 1,
            score: 0,
            category: categorizeColor(hsl)
          });
        }
      }

      // Calculate scores and cluster similar colors
      const clusters = new Map<string, ColorScore>();
      const threshold = 15; // Reduced threshold for more precise clustering

      // Sort colors by population before clustering
      const sortedColors = Array.from(colorMap.values())
        .sort((a, b) => b.population - a.population);

      for (const color of sortedColors) {
        // Find similar existing cluster
        let foundCluster = false;
        const existingClusters = Array.from(clusters.values());
        
        for (const cluster of existingClusters) {
          if (getColorDistance(color.rgb, cluster.rgb) < threshold) {
            cluster.population += color.population;
            // Update cluster center to weighted average
            const totalPop = cluster.population + color.population;
            cluster.rgb = {
              r: Math.round((cluster.rgb.r * cluster.population + color.rgb.r * color.population) / totalPop),
              g: Math.round((cluster.rgb.g * cluster.population + color.rgb.g * color.population) / totalPop),
              b: Math.round((cluster.rgb.b * cluster.population + color.rgb.b * color.population) / totalPop)
            };
            // Update cluster HSL and hex
            cluster.hsl = rgbToHsl(cluster.rgb.r, cluster.rgb.g, cluster.rgb.b);
            cluster.hex = rgbToHex(cluster.rgb);
            cluster.category = categorizeColor(cluster.hsl);
            foundCluster = true;
            break;
          }
        }

        // Create new cluster if no similar ones found
        if (!foundCluster) {
          clusters.set(color.hex, color);
        }
      }

      // Calculate final scores
      clusters.forEach(color => {
        color.score = getColorScore(color);
      });

      // Filter out colors too similar to background
      const backgroundThreshold = 20;
      const filteredColors = Array.from(clusters.values())
        .filter(color => getColorDistance(color.rgb, mostCommonBorderColor) > backgroundThreshold);

      // Ensure color diversity by category
      const categoryMinimums = {
        vibrant: 2,
        muted: 2,
        light: 1,
        dark: 1
      };

      const selectedColors: string[] = [];
      const categories = Object.keys(categoryMinimums) as ColorScore['category'][];

      // First, fulfill category minimums
      categories.forEach(category => {
        const colorsInCategory = filteredColors
          .filter(c => c.category === category)
          .sort((a, b) => b.score - a.score);
        
        const minimum = categoryMinimums[category];
        for (let i = 0; i < minimum && i < colorsInCategory.length; i++) {
          selectedColors.push(colorsInCategory[i].hex);
          filteredColors.splice(filteredColors.indexOf(colorsInCategory[i]), 1);
        }
      });

      // Then fill remaining slots with highest scoring colors
      const remainingSlots = 8 - selectedColors.length;
      if (remainingSlots > 0) {
        const remainingColors = filteredColors
          .sort((a, b) => b.score - a.score)
          .slice(0, remainingSlots);
        
        selectedColors.push(...remainingColors.map(c => c.hex));
      }

      setKeyColors(selectedColors);

      // Create simplified version for display only
      simplifyImage(img);

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
  }, [simplifyImage, toast, rgbToHex]);

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
