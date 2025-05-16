import React, { useState } from 'react';
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
} from '@chakra-ui/react';
import { useExtractColors } from 'react-extract-colors';

function App() {
  const [artworkId, setArtworkId] = useState('');
  const [artworkUrl, setArtworkUrl] = useState('');
  const toast = useToast();

  // Extract colors from the artwork with maxColors set to 5
  const { colors, loading } = useExtractColors(artworkUrl, {
    maxColors: 5,
    format: 'hex',
    sortBy: 'dominance'
  });

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
      <Box minH="100vh" bg="gray.50">
        <Container maxW="container.md" pt={10}>
          <Flex direction="column" align="center" textAlign="center">
            <Heading mb={6} fontSize="4xl" color="gray.700">
              Meridian Art Viewer
            </Heading>
            <Box mb={6} w="100%" maxW="400px">
              <Input
                placeholder="Enter artwork ID (e.g., 42, 547, 801)"
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
              />
              <Button
                onClick={fetchArtwork}
                mt={4}
                size="lg"
                colorScheme="blue"
                w="100%"
                boxShadow="sm"
                isLoading={loading}
              >
                View Artwork
              </Button>
            </Box>
            {artworkUrl && (
              <Box
                borderRadius="lg"
                overflow="hidden"
                boxShadow="xl"
                bg="white"
                p={4}
                maxW="100%"
                w="auto"
              >
                <Image
                  src={artworkUrl}
                  alt={`Meridian Artwork #${artworkId}`}
                  maxH="600px"
                  w="auto"
                  objectFit="contain"
                />
                <Link
                  href={`https://www.artblocks.io/token/163000${artworkId.padStart(3, '0')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  color="blue.500"
                  textAlign="center"
                  display="block"
                  mt={2}
                  mb={4}
                >
                  View on Art Blocks
                </Link>
                {/* Main color swatches */}
                {colors.length > 0 && (
                  <Box>
                    <Heading size="sm" mb={3} color="gray.600">Main Colors</Heading>
                    <Flex justify="center" gap={3}>
                      {colors.map((color, index) => (
                        <Box key={index}>
                          <Box
                            w="50px"
                            h="50px"
                            borderRadius="md"
                            bg={color}
                            boxShadow="md"
                            border="1px solid"
                            borderColor="gray.200"
                            mb={2}
                          />
                          <Box
                            fontSize="xs"
                            color="gray.600"
                            fontFamily="mono"
                            textAlign="center"
                          >
                            {color.toUpperCase()}
                          </Box>
                        </Box>
                      ))}
                    </Flex>
                  </Box>
                )}
              </Box>
            )}
          </Flex>
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default App;
