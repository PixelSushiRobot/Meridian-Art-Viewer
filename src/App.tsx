import React, { useState } from 'react';
import {
  ChakraProvider,
  Box,
  Flex,
  Input,
  Button,
  Image,
  Text,
  Container,
  Heading,
  useToast,
  Link,
  keyframes,
} from '@chakra-ui/react';
import { useExtractColors } from 'react-extract-colors';

function App() {
  const [artworkId, setArtworkId] = useState('');
  const [artworkUrl, setArtworkUrl] = useState('');
  const toast = useToast();

  // Extract colors from the artwork
  const { colors, dominantColor, darkerColor, lighterColor, loading } = useExtractColors(artworkUrl);

  const gradientAnimation = keyframes`
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  `;

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
      <Box
        minH="100vh"
        bg={loading || !colors.length ? "gray.100" : `linear-gradient(45deg, ${dominantColor}, ${darkerColor}, ${lighterColor})`}
        backgroundSize="400% 400%"
        animation={`${gradientAnimation} 15s ease infinite`}
        transition="background 0.5s ease"
        position="relative"
      >
        {/* Blurred background using extracted colors */}
        {artworkUrl && colors.length > 0 && (
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            backgroundImage={`url(${artworkUrl})`}
            backgroundSize="cover"
            backgroundPosition="center"
            filter="blur(100px) brightness(0.7)"
            opacity="0.4"
            zIndex="0"
          />
        )}
        
        <Container maxW="container.md" pt={10} position="relative" zIndex="1">
          <Flex direction="column" align="center" textAlign="center">
            <Heading
              mb={6}
              fontSize="4xl"
              color={artworkUrl && colors.length > 0 ? "white" : "gray.700"}
              textShadow={artworkUrl && colors.length > 0 ? "1px 1px 4px rgba(0,0,0,0.3)" : "none"}
            >
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
                position="relative"
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
                {/* Color swatches */}
                {colors.length > 0 && (
                  <Flex justify="center" gap={2} mt={4}>
                    {colors.slice(0, 5).map((color, index) => (
                      <Box
                        key={index}
                        w="40px"
                        h="40px"
                        borderRadius="md"
                        bg={color}
                        boxShadow="sm"
                        border="1px solid"
                        borderColor="gray.200"
                      />
                    ))}
                  </Flex>
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
