'use client';

import { Modal, Table, Text, Group, Badge, Paper, ThemeIcon, Box, Stack } from '@mantine/core';
import { ExtendedNode } from '../types';
import { IconArticle, IconTarget, IconMath, IconHistory, IconArrowForward, IconFileAlert } from '@tabler/icons-react';
import WebViewer from '@/components/WebViewer';
import { useState } from 'react';

interface NodeDetailProps {
  node: ExtendedNode | null;
  onClose: () => void;
};

const attributeIcons = {
  goal: <IconTarget size={16} />,
  method: <IconMath size={16} />,
  background: <IconHistory size={16} />,
  future: <IconArrowForward size={16} />,
  gaps: <IconFileAlert size={16} />
};

const attributeColors = {
  goal: 'orange',
  method: 'green',
  background: 'blue',
  future: 'violet',
  gaps: 'red',
};

export const handleAnalytics = async (analyticsData: any) => {
  try {
    await fetch('/api/annotation', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        ...analyticsData,
        userId: 'current_user_id',
        sessionId: 'uniqueSessionId',
      }),
    });
  } catch (error) {
    console.error(error);
  }
};

export default function NodeDetail({ node, onClose }: NodeDetailProps) {
  const [opened, setOpened] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState<string | null>(null);
  if (!node) return null;

  return (
   <Stack gap="lg">
      {/* Title Section */}
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" mb="xs">
          <Badge size="lg" variant="dot" color="blue">
            Artikel Penelitian
          </Badge>
          <ThemeIcon size="lg" variant="light" color="blue" radius="md">
            <IconArticle size={20} />
          </ThemeIcon>
        </Group>
        <Text size="lg" fw={500} style={{ wordBreak: 'break-word' }}>
          {node.title || node.label}
        </Text>
      </Paper>

      {/* Attributes Section */}
      <Stack gap="md">
        {/* Goal */}
        <Paper p="md" radius="md" withBorder>
          <Group align="flex-start">
            <ThemeIcon size="md" variant="light" color={attributeColors.goal}>
              {attributeIcons.goal}
            </ThemeIcon>
            <Box style={{ flex: 1 }}>
              <Text size="sm" fw={500} color="dimmed" mb="xs">
                Tujuan:
              </Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {node.att_goal || '-'}
              </Text>
            </Box>
          </Group>
        </Paper>

        {/* Method */}
        <Paper p="md" radius="md" withBorder>
          <Group align="flex-start">
            <ThemeIcon size="md" variant="light" color={attributeColors.method}>
              {attributeIcons.method}
            </ThemeIcon>
            <Box style={{ flex: 1 }}>
              <Text size="sm" fw={500} color="dimmed" mb="xs">
                Metodologi:
              </Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {node.att_method || '-'}
              </Text>
            </Box>
          </Group>
        </Paper>

        {/* Background */}
        <Paper p="md" radius="md" withBorder>
          <Group align="flex-start">
            <ThemeIcon size="md" variant="light" color={attributeColors.background}>
              {attributeIcons.background}
            </ThemeIcon>
            <Box style={{ flex: 1 }}>
              <Text size="sm" fw={500} color="dimmed" mb="xs">
                Latar Belakang:
              </Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {node.att_background || '-'}
              </Text>
            </Box>
          </Group>
        </Paper>

        {/* Future Research */}
        <Paper p="md" radius="md" withBorder>
          <Group align="flex-start">
            <ThemeIcon size="md" variant="light" color={attributeColors.future}>
              {attributeIcons.future}
            </ThemeIcon>
            <Box style={{ flex: 1 }}>
              <Text size="sm" fw={500} color="dimmed" mb="xs">
                Penelitian Lanjut:
              </Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {node.att_future || '-'}
              </Text>
            </Box>
          </Group>
        </Paper>

        {/* Research Gaps */}
        <Paper p="md" radius="md" withBorder>
          <Group align="flex-start">
            <ThemeIcon size="md" variant="light" color={attributeColors.gaps}>
              {attributeIcons.gaps}
            </ThemeIcon>
            <Box style={{ flex: 1 }}>
              <Text size="sm" fw={500} color="dimmed" mb="xs">
                Kesenjangan:
              </Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {node.att_gaps || '-'}
              </Text>
            </Box>
          </Group>
        </Paper>

        {/* PDF Link */}
        {node.att_url && (
          <Paper p="md" radius="md" withBorder>
            <Group align="center" justify="space-between">
              <Group>
                <ThemeIcon size="md" variant="light" color="gray">
                  <IconArticle size={16} />
                </ThemeIcon>
                <Text size="sm">PDF Dokumen</Text>
              </Group>
              <Badge 
                component="button" 
                variant="outline"
                color="blue"
                size="lg"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSelectedPDF(node.att_url ?? null);
                  setOpened(true);
                }}
              >
                Buka PDF
              </Badge>
            </Group>
          </Paper>
        )}

        <Modal
            opened={opened}
            onClose={() => {
                setOpened(false);
                setSelectedPDF(null);
            }}
            title="Lihat Artikel"
            size="90%"
            padding="sm"
            centered
            overlayProps={{ blur: 3 }}
            styles={{
                content: {
                height: '90vh',
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                position: 'relative',
                },
                body: {
                flex: 1,
                overflow: 'hidden',
                padding: 0,
                position: 'relative',
                },
            }}
            >
            {selectedPDF && (
                <div style={{ height: '100%', position: 'relative' }}>
                <WebViewer fileUrl={selectedPDF} onAnalytics={handleAnalytics} />
                </div>
            )}
        </Modal>
      </Stack>
    </Stack>
  );
}
