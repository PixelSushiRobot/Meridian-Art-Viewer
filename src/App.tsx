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
} from '@chakra-ui/react';

function App() {
  const [artworkId, setArtworkId] = useState('');
  const [artworkUrl, setArtworkUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchArtwork = async () => {
    if (!artworkId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an artwork ID (0-999)',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Convert input to a number and validate
    const tokenId = parseInt(artworkId, 10);
    if (isNaN(tokenId) || tokenId < 0 || tokenId > 999) {
      toast({
        title: 'Error',
        description: 'Please enter a valid artwork ID between 0 and 999',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      // Format the token ID with leading zeros
      const formattedTokenId = tokenId.toString().padStart(3, '0');
      console.log('Formatted token ID:', formattedTokenId);
      
      // Use the Art Blocks token endpoint
      const imageUrl = `https://media.artblocks.io/163000${formattedTokenId}.png`;
      console.log('Image URL:', imageUrl);
      setArtworkUrl(imageUrl);
      
      toast({
        title: 'Success',
        description: 'Artwork loaded successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Error loading artwork:', error);
      const errorMessage = error.message || 'Failed to load artwork';
      
      toast({
        title: 'Error',
        description: `Failed to load artwork: ${errorMessage}. Please check the ID and try again.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setArtworkUrl('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChakraProvider>
      <Container maxW="container.md" py={8}>
        <Flex direction="column" gap={6}>
          <Heading>Meridian Art Viewer</Heading>
          <Text>Enter an artwork ID between 0 and 999</Text>
          
          <Box width="100%">
            <Flex direction="column" gap={4}>
              <Input
                placeholder="Enter artwork ID (e.g., 42, 547, 801)"
                value={artworkId}
                onChange={(e) => setArtworkId(e.target.value)}
                size="lg"
                type="number"
                min={0}
                max={999}
              />
              <Button
                colorScheme="blue"
                onClick={fetchArtwork}
                isLoading={loading}
                width="100%"
              >
                View Artwork
              </Button>
            </Flex>
          </Box>

          {artworkUrl && (
            <Box
              width="100%"
              borderRadius="md"
              overflow="hidden"
              boxShadow="lg"
            >
              <Image
                src={artworkUrl}
                alt="Meridian Artwork"
                width="100%"
                height="auto"
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
            </Box>
          )}
        </Flex>
      </Container>
    </ChakraProvider>
  );
}

export default App;
