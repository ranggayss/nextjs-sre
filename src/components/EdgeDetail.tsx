'use client';

import { Modal, Table, Text, Loader, Skeleton, Group, Badge, Paper, ThemeIcon, Box, Stack } from '@mantine/core';
import { ExtendedEdge } from '../types';
import { useEffect, useState } from 'react';
import { IconArrowDown, IconNetwork, IconArticle, IconEye  } from '@tabler/icons-react';

interface EdgeDetailProps {
  edge: ExtendedEdge | null;
  onClose: () => void;
  onOpenNodeDetail?:(nodeId:string) => void;
};

interface PopulatedEdge {
  id: string;
  label: string | null;
  relation: string | null;
  from: {
    id: string;
    title: string;
  };
  to: {
    id: string;
    title: string;
  };
};

const relationDisplayNames: Record<string, string> = {
  'background': 'Latar Belakang',
  'method': 'Metodologi',
  'goal': 'Tujuan',
  'future': 'Arahan Masa Depan',
  'gap': 'Gap Penelitian'
};

const relationColors: Record<string, string> = {
  'background': 'blue',
  'method': 'green',
  'gap': 'red',
  'future': 'violet',
  'goal': 'orange'
};

function getDisplayRelation(relation: string | null | undefined) {
  if (!relation) return '-';
  // Map API relation to display key
  const mapping: Record<string, string> = {
    'same_background': 'background',
    'extended_method': 'method',
    'shares_goal': 'goal',
    'follows_future_work': 'future',
    'addresses_same_gap': 'gap'
  };
  const internalKey = mapping[relation] || relation;
  return relationDisplayNames[internalKey] || relation;
}

function getRelationColor(relation: string | null | undefined) {
  if (!relation) return 'gray';
  const mapping: Record<string, string> = {
    'same_background': 'background',
    'extended_method': 'method',
    'shares_goal': 'goal',
    'follows_future_work': 'future',
    'addresses_same_gap': 'gap'
  };
  const key = mapping[relation] || relation;
  return relationColors[key] || 'gray';
}

export default function EdgeDetail({ edge, onClose, onOpenNodeDetail }: EdgeDetailProps) {

  const [edgeNode, setEdgeNode] = useState<PopulatedEdge>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!edge) return;

    if (edge.fromTitle && edge.toTitle) {
      setEdgeNode({
        id: edge.id?.toString() ?? '',
        relation: edge.relation || null,
        from: { id: edge.from?.toString() ?? '', title: edge.fromTitle},
        to: { id: edge.to?.toString() ?? '', title: edge.toTitle},
        label: edge.label || ''
      });
      return;
    }

    if (edge?.id){
      setLoading(true);
      fetch(`/api/edges/${edge?.id}`)
        .then((res) => {
          if (!res.ok){
            throw new Error(`Failed to fetch: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => setEdgeNode(data))
        .catch((err) => console.error('failed to fetch edge details:', err))
        .finally(() => setLoading(false));
    }
  }, [edge?.id]);

  if (!edge) return null;

return (
    <Stack gap="lg">
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Badge 
            size="lg" 
            variant="dot" 
            color={getRelationColor(edge.relation)}
          >
            {getDisplayRelation(edge.relation)}
          </Badge>
          <ThemeIcon 
            size="lg" 
            variant="light" 
            color={getRelationColor(edge.relation)}
            radius="md"
          >
            <IconNetwork size={20} />
          </ThemeIcon>
        </Group>

        <Stack gap="lg">
          <Paper p="sm" radius="md" bg="var(--mantine-color-default-hover)">
            <Group align="flex-start">
              <ThemeIcon size="md" variant="light" color="blue">
                <IconArticle size={16} />
              </ThemeIcon>
              <Box style={{ flex: 1 }}>
                <Text size="sm" fw={500} color="dimmed">Dari Artikel:</Text>
                <Box>
                  {loading ? (
                    <Skeleton height={20} width="100%" />
                  ) : (
                    <>
                    <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <Text size="md" style={{ wordBreak: 'break-word' }}>
                      {edgeNode?.from?.title}
                    </Text>
                    {edgeNode?.from?.id && onOpenNodeDetail && (
                      <ThemeIcon
                        size="sm"
                        variant="light"
                        color="gray"
                        style={{ cursor: 'pointer' }}
                        onClick={() => onOpenNodeDetail(edgeNode.from.id)}>
                        <IconEye size={16} />
                      </ThemeIcon>
                    )}
                    </Box>
                    </>
                  )}
                </Box>
              </Box>
            </Group>
          </Paper>

          <Group justify="center">
            <ThemeIcon 
              size="md" 
              variant="light" 
              color={getRelationColor(edge.relation)}
            >
              <IconArrowDown size={16} />
            </ThemeIcon>
          </Group>

          <Paper p="sm" radius="md" bg="var(--mantine-color-default-hover)">
            <Group align="flex-start">
              <ThemeIcon size="md" variant="light" color="blue">
                <IconArticle size={16} />
              </ThemeIcon>
              <Box style={{ flex: 1 }}>
                <Text size="sm" fw={500} color="dimmed">Ke Artikel:</Text>
                <Box>
                  {loading ? (
                    <Skeleton height={20} width="100%" />
                  ) : (
                    <>
                    <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <Text size="md" style={{ wordBreak: 'break-word' }}>
                      {edgeNode?.to?.title}
                    </Text>
                    {edgeNode?.to?.id && onOpenNodeDetail && (
                      <ThemeIcon
                        size="sm"
                        variant="light"
                        color="gray"
                        style={{ cursor: 'pointer' }}
                        onClick={() => onOpenNodeDetail(edgeNode.to.id)}>
                        <IconEye size={16} />
                      </ThemeIcon>
                    )}
                    </Box>
                    </>
                  )}
                </Box>
              </Box>
            </Group>
          </Paper>
        </Stack>
      </Paper>

      {edge.label && (
        <Paper p="md" radius="md" withBorder>
          <Text size="sm" fw={500} color="dimmed" mb="xs">
            Deskripsi Hubungan:
          </Text>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {edge.label || edge.displayDescription }
          </Text>
        </Paper>
      )}
    </Stack>
  );
}
