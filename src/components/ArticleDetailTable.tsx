'use client';

import { 
  Table, 
  Text, 
  Group, 
  Badge, 
  Paper, 
  ThemeIcon, 
  Box, 
  Stack, 
  ScrollArea,
  Modal,
  Button,
  Tooltip,
  ActionIcon,
  useMantineColorScheme,
  useMantineTheme
} from '@mantine/core';
import { ExtendedNode } from '../types';
import { 
  IconArticle, 
  IconTarget, 
  IconMath, 
  IconHistory, 
  IconArrowForward, 
  IconFileAlert,
  IconEye,
  IconExternalLink
} from '@tabler/icons-react';
import WebViewer from '@/components/WebViewer';
import { useState } from 'react';

interface ArticleDetailTableProps {
  nodes: ExtendedNode[];
  activeArticles: string[];
}

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

const handleAnalytics = async (analyticsData: any) => {
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

export default function ArticleDetailTable({ nodes, activeArticles }: ArticleDetailTableProps) {
  const [opened, setOpened] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState<string | null>(null);
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const dark = colorScheme === 'dark';

  // Filter nodes berdasarkan activeArticles
  const filteredNodes = activeArticles.length === 0 
    ? nodes 
    : nodes.filter(node => activeArticles.includes(String(node.id)));

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const AttributeCell = ({ content, type }: { content: string; type: keyof typeof attributeColors }) => (
    <Box>
      <Group gap="xs" mb="xs">
        <ThemeIcon size="sm" variant="light" color={attributeColors[type]}>
          {attributeIcons[type]}
        </ThemeIcon>
        <Text size="xs" fw={500} color="dimmed" tt="uppercase">
          {type === 'goal' ? 'Tujuan' : 
           type === 'method' ? 'Metodologi' :
           type === 'background' ? 'Latar Belakang' :
           type === 'future' ? 'Penelitian Lanjut' : 'Kesenjangan'}
        </Text>
      </Group>
      <Tooltip label={content || '-'} multiline w={300} position="top">
        <Text size="sm" style={{ 
          whiteSpace: 'pre-wrap', 
          lineHeight: 1.5,
          cursor: content?.length > 100 ? 'help' : 'default'
        }}>
          {truncateText(content)}
        </Text>
      </Tooltip>
    </Box>
  );

  if (filteredNodes.length === 0) {
    return (
      <Box style={{ position: 'relative', width: '100%', height: '610px', border: '1px solid black' }}>
        <Stack align="center" justify="center" gap="md" style={{ height: '100%' }}>
          <ThemeIcon variant="light" color="gray" size="xl">
            <IconArticle size={32} />
          </ThemeIcon>
          <Text size="lg" fw={500} c="dimmed">
            Tidak ada artikel yang dipilih
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            Pilih artikel dari filter di atas untuk melihat detail
          </Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box style={{ position: 'relative', width: '100%', height: '610px', border: '1px solid black' }}>
      <ScrollArea style={{ height: '100%' }}>
        <Stack gap="lg" p="md">
          {/* Header */}

          {/* Table Container */}
          <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
            <ScrollArea>
              <Table
                striped
                highlightOnHover
                withTableBorder={false}
                withColumnBorders
                styles={{
                  th: {
                    backgroundColor: dark ? theme.colors.dark[6] : theme.colors.gray[0],
                    fontWeight: 600,
                    fontSize: theme.fontSizes.sm,
                    padding: '12px 16px',
                    borderBottom: `2px solid ${dark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                  },
                  td: {
                    padding: '16px',
                    verticalAlign: 'top',
                    borderBottom: `1px solid ${dark ? theme.colors.dark[4] : theme.colors.gray[2]}`,
                  },
                }}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ minWidth: 250 }}>
                      <Group gap="xs">
                        <IconArticle size={16} />
                        <Text>Artikel</Text>
                      </Group>
                    </Table.Th>
                    <Table.Th style={{ minWidth: 200 }}>
                      <Group gap="xs">
                        <IconTarget size={16} />
                        <Text>Tujuan</Text>
                      </Group>
                    </Table.Th>
                    <Table.Th style={{ minWidth: 200 }}>
                      <Group gap="xs">
                        <IconMath size={16} />
                        <Text>Metodologi</Text>
                      </Group>
                    </Table.Th>
                    <Table.Th style={{ minWidth: 200 }}>
                      <Group gap="xs">
                        <IconHistory size={16} />
                        <Text>Latar Belakang</Text>
                      </Group>
                    </Table.Th>
                    <Table.Th style={{ minWidth: 200 }}>
                      <Group gap="xs">
                        <IconArrowForward size={16} />
                        <Text>Penelitian Lanjut</Text>
                      </Group>
                    </Table.Th>
                    <Table.Th style={{ minWidth: 200 }}>
                      <Group gap="xs">
                        <IconFileAlert size={16} />
                        <Text>Kesenjangan</Text>
                      </Group>
                    </Table.Th>
                    <Table.Th style={{ minWidth: 120 }}>
                      <Group gap="xs">
                        <IconEye size={16} />
                        <Text>Aksi</Text>
                      </Group>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredNodes.map((node) => (
                    <Table.Tr key={node.id}>
                      {/* Artikel Title */}
                      <Table.Td>
                        <Box>
                          <Badge variant="dot" color="blue" size="sm" mb="xs">
                            ID: {node.id}
                          </Badge>
                          <Text size="sm" fw={500} style={{ 
                            wordBreak: 'break-word',
                            lineHeight: 1.4,
                            marginBottom: 8
                          }}>
                            {node.title || node.label || `Artikel ${node.id}`}
                          </Text>
                        </Box>
                      </Table.Td>

                      {/* Tujuan */}
                      <Table.Td>
                        <AttributeCell content={node.att_goal || ''} type="goal" />
                      </Table.Td>

                      {/* Metodologi */}
                      <Table.Td>
                        <AttributeCell content={node.att_method || ''} type="method" />
                      </Table.Td>

                      {/* Latar Belakang */}
                      <Table.Td>
                        <AttributeCell content={node.att_background || ''} type="background" />
                      </Table.Td>

                      {/* Penelitian Lanjut */}
                      <Table.Td>
                        <AttributeCell content={node.att_future || ''} type="future" />
                      </Table.Td>

                      {/* Kesenjangan */}
                      <Table.Td>
                        <AttributeCell content={node.att_gaps || ''} type="gaps" />
                      </Table.Td>

                      {/* Aksi */}
                      <Table.Td>
                        <Stack gap="xs">
                          {node.att_url && (
                            <Tooltip label="Buka PDF">
                              <ActionIcon
                                variant="light"
                                color="blue"
                                size="sm"
                                onClick={() => {
                                  setSelectedPDF(node.att_url ?? null);
                                  setOpened(true);
                                }}
                              >
                                <IconExternalLink size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          <Text size="xs" c="dimmed">
                            {node.att_url ? 'PDF tersedia' : 'Tidak ada PDF'}
                          </Text>
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Paper>
        </Stack>
      </ScrollArea>

      {/* PDF Modal */}
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
    </Box>
  );
}