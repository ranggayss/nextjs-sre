import React, { useState, useRef } from 'react';
import { 
  Paper, 
  Group, 
  Text, 
  Button, 
  Badge, 
  Box, 
  ScrollArea, 
  Collapse,
  ActionIcon,
  Transition,
  Stack,
  Divider,
  ThemeIcon
} from '@mantine/core';
import { 
  IconSparkles, 
  IconChevronUp, 
  IconChevronDown, 
  IconRefresh, 
  IconX,
  IconBulb,
  IconArrowRight
} from '@tabler/icons-react';

interface SuggestionPanelProps {
  suggestions: string[];
  context: 'input' | 'response' | null;
  onSuggestionClick: (suggestion: string) => void;
  onClose: () => void;
  onRefreshSuggestions: () => void;
}

export const ImprovedSuggestionPanel = ({
  suggestions,
  context,
  onSuggestionClick,
  onClose,
  onRefreshSuggestions
}: SuggestionPanelProps) => {
  const [layoutMode, setLayoutMode] = useState<'compact' | 'expanded'>('compact');
  const [isHovered, setIsHovered] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const getContextConfig = () => {
    switch (context) {
      case 'input':
        return {
          color: 'blue',
          title: 'Saran Pertanyaan',
          icon: IconBulb,
          description: 'Pilih atau ketik pertanyaan Anda'
        };
      case 'response':
        return {
          color: 'green',
          title: 'Pertanyaan Lanjutan',
          icon: IconArrowRight,
          description: 'Eksplorasi lebih dalam'
        };
      default:
        return {
          color: 'gray',
          title: 'Saran',
          icon: IconSparkles,
          description: 'Saran tersedia'
        };
    }
  };

  const config = getContextConfig();

  // Handle mouse wheel scroll for horizontal scrolling
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        e.preventDefault();
        scrollContainer.scrollLeft += e.deltaY;
      }
    }
  };

  // Mode 1: Compact Horizontal Scrollable (Default) - dengan scrollbar visible
  const CompactMode = () => (
    <Box 
      mt="md" 
      mb="xs"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Paper
        p="xs"
        bg={`${config.color}.0`}
        style={{
          borderLeft: `3px solid var(--mantine-color-${config.color}-6)`,
          position: 'relative'
        }}
      >
        {/* Controls positioned at top right */}
        <Group 
          gap="xs" 
          style={{ 
            position: 'absolute',
            top: '4px',
            right: '4px',
            zIndex: 10
          }}
        >
          <ActionIcon
            size="sm"
            variant="subtle"
            color={config.color}
            onClick={() => setLayoutMode('expanded')}
          >
            <IconChevronUp size={12} />
          </ActionIcon>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            onClick={onClose}
          >
            <IconX size={12} />
          </ActionIcon>
        </Group>

        <ScrollArea 
          type="auto" // Ubah dari "never" ke "auto" untuk menampilkan scrollbar
          ref={scrollAreaRef}
          onWheel={handleWheel}
          style={{ 
            paddingRight: '60px', // Space for controls
            paddingBottom: '2px', // Space for horizontal scrollbar - dikurangi
          }}
          scrollbars="x" // Hanya tampilkan scrollbar horizontal
          styles={{
            scrollbar: {
              height: isHovered ? '8px' : '4px', // Scrollbar kecil, membesar saat hover
              transition: 'height 0.2s ease',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '4px',
              '&:hover': {
                height: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              },
            },
            thumb: {
              backgroundColor: `var(--mantine-color-${config.color}-4)`,
              borderRadius: '4px',
              transition: 'background-color 0.2s ease',
              '&:hover': {
                backgroundColor: `var(--mantine-color-${config.color}-6)`,
              }
            }
          }}
        >
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 'max-content' }}>
            {suggestions.slice(0, 8).map((suggestion, index) => (
              <Button
                key={index}
                variant="light"
                size="xs"
                radius="md"
                color={config.color}
                leftSection={<IconSparkles size={10} />}
                style={{ 
                  whiteSpace: 'nowrap', 
                  flexShrink: 0,
                  maxWidth: '180px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: '11px',
                  height: '28px'
                }}
                onClick={() => onSuggestionClick(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
            {suggestions.length > 8 && (
              <Button
                variant="outline"
                size="xs"
                radius="md"
                color={config.color}
                style={{ 
                  fontSize: '11px',
                  height: '28px',
                  flexShrink: 0
                }}
                onClick={() => setLayoutMode('expanded')}
              >
                +{suggestions.length - 8}
              </Button>
            )}
          </Group>
        </ScrollArea>
      </Paper>
    </Box>
  );

  // Mode 2: Expanded Grid Layout
  const ExpandedMode = () => (
    <Box mt="md" mb="xs">
      <Paper
        p="sm"
        bg={`${config.color}.0`}
        style={{
          borderLeft: `3px solid var(--mantine-color-${config.color}-6)`,
          maxHeight: '250px',
          overflowY: 'auto'
        }}
      >
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <ThemeIcon size="sm" variant="light" color={config.color}>
              <config.icon size={14} />
            </ThemeIcon>
            <Box>
              <Text size="sm" fw={600} c={`${config.color}.7`}>
                {config.title}
              </Text>
              <Text size="xs" c="dimmed">
                {config.description}
              </Text>
            </Box>
          </Group>
          <Group gap="xs">
            <ActionIcon
              size="sm"
              variant="light"
              color={config.color}
              onClick={onRefreshSuggestions}
            >
              <IconRefresh size={14} />
            </ActionIcon>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={() => setLayoutMode('compact')}
            >
              <IconChevronDown size={14} />
            </ActionIcon>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={onClose}
            >
              <IconX size={14} />
            </ActionIcon>
          </Group>
        </Group>

        <Stack gap="xs">
          {suggestions.map((suggestion, index) => (
            <Paper
              key={index}
              p="xs"
              bg="white"
              style={{
                cursor: 'pointer',
                border: '1px solid var(--mantine-color-gray-2)',
                transition: 'all 0.2s ease',
                borderRadius: '6px'
              }}
              onClick={() => onSuggestionClick(suggestion)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `var(--mantine-color-${config.color}-4)`;
                e.currentTarget.style.backgroundColor = `var(--mantine-color-${config.color}-0)`;
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--mantine-color-gray-2)';
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Group gap="sm">
                <ThemeIcon size="xs" variant="light" color={config.color}>
                  <IconSparkles size={10} />
                </ThemeIcon>
                <Text size="sm" style={{ flex: 1 }}>
                  {suggestion}
                </Text>
                <IconArrowRight size={12} style={{ opacity: 0.5 }} />
              </Group>
            </Paper>
          ))}
        </Stack>
      </Paper>
    </Box>
  );

  return (
    <Transition
      mounted={suggestions.length > 0}
      transition="slide-up"
      duration={200}
      timingFunction="ease"
    >
      {(styles) => (
        <Box style={styles}>
          {layoutMode === 'compact' ? <CompactMode /> : <ExpandedMode />}
        </Box>
      )}
    </Transition>
  );
};