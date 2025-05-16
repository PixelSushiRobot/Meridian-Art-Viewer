import React, { useState, useEffect, useCallback } from 'react';
import {
  ChakraProvider,
  Box,
  Flex,
  Input,
  Button,
  Image,
  Container,
  Heading,
  useToast,
  Link,
  Grid,
  GridItem,
  Text,
  Divider,
} from '@chakra-ui/react';
import ColorThief from 'colorthief';

function App() {
  const [artworkId, setArtworkId] = useState('');
  const [artworkUrl, setArtworkUrl] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [keyColors, setKeyColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Convert RGB array to HEX
  const rgbToHex = useCallback((r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }, []);

  // Extract colors using ColorThief
  const extractColors = useCallback(async (imageUrl: string) => {
    setLoading(true);
    try {
      const colorThief = new ColorThief();
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Get the dominant color for background
      const dominantColor = colorThief.getColor(img);
      const bgColor = rgbToHex(...dominantColor);
      setBackgroundColor(bgColor);

      // Get palette for key colors (excluding colors too similar to background)
      const palette = colorThief.getPalette(img, 8); // Get more colors than needed to filter
      const keyColorSet = new Set<string>();
      
      // Helper function to calculate color difference
      const getColorDifference = (color1: number[], color2: number[]): number => {
        return Math.sqrt(
          Math.pow(color1[0] - color2[0], 2) +
          Math.pow(color1[1] - color2[1], 2) +
          Math.pow(color1[2] - color2[2], 2)
        );
      };

      // Filter colors that are too similar to background or each other
      palette.forEach(color => {
        const hexColor = rgbToHex(...color);
        const diffFromBg = getColorDifference(color, dominantColor);
        
        // Only add colors that are different enough from background
        if (diffFromBg > 50) {
          // Check if color is different enough from already selected colors
          const isDifferentEnough = Array.from(keyColorSet).every(existingHex => {
            const existing = existingHex.match(/\w\w/g)?.map(h => parseInt(h, 16)) || [];
            return getColorDifference(color, existing) > 50;
          });

          if (isDifferentEnough) {
            keyColorSet.add(hexColor);
          }
        }
      });

      // Take the first 5 distinct colors
      setKeyColors(Array.from(keyColorSet).slice(0, 5));
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
  }, [rgbToHex, toast]);

  // Effect to extract colors when artwork URL changes
  useEffect(() => {
    if (artworkUrl) {
      extractColors(artworkUrl);
    }
  }, [artworkUrl, extractColors]);

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
                  <Box p={6}>
                    <Image
                      src={artworkUrl}
                      alt={`Meridian Artwork #${artworkId}`}
                      w="100%"
                      h="auto"
                      objectFit="contain"
                      borderRadius="md"
                      crossOrigin="anonymous"
                    />
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
                      <Grid templateColumns="repeat(5, 1fr)" gap={4}>
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
