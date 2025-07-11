import { Paper, Group, Text, Button, CloseButton, Badge } from '@mantine/core';

interface SuggestionPanelProps {
  suggestions: string[];
  context: 'input' | 'response' | null;
  onSuggestionClick: (suggestion: string) => void;
  onClose: () => void;
}

export const SuggestionPanel = ({ suggestions, context, onSuggestionClick, onClose }: SuggestionPanelProps) => {
  const getPanelTitle = () => {
    switch (context) {
      case 'input':
        return 'Suggestions while typing';
      case 'response':
        return 'Follow-up questions';
      default:
        return 'Suggestions';
    }
  };

  const getPanelProps = () => {
    switch (context) {
      case 'input':
        return {
          bg: 'blue.0',
          color: 'blue.7',
          badgeColor: 'blue'
        };
      case 'response':
        return {
          bg: 'green.0',
          color: 'green.7',
          badgeColor: 'green'
        };
      default:
        return {
          bg: 'gray.0',
          color: 'gray.7',
          badgeColor: 'gray'
        };
    }
  };

  const panelProps = getPanelProps();

  return (
    <Paper 
      p="md" 
      bg={panelProps.bg}
      style={{ borderTop: '2px solid var(--mantine-color-gray-3)' }}
    >
      <Group justify="space-between" mb="sm">
        <Text size="sm" fw={500} c={panelProps.color}>
          {getPanelTitle()}
        </Text>
        <CloseButton 
          onClick={onClose}
          size="sm"
          c="gray.5"
        />
      </Group>
      
      <Group gap="xs">
        {suggestions.map((suggestion, index) => (
          <Badge
            key={index}
            variant="light"
            color={panelProps.badgeColor}
            style={{ cursor: 'pointer' }}
            onClick={() => onSuggestionClick(suggestion)}
          >
            {suggestion}
          </Badge>
        ))}
      </Group>
    </Paper>
  );
};