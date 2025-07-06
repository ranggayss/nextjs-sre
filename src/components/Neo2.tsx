'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Loader, Text, Group, Button, Stack, Alert } from '@mantine/core';
import {
  IconArrowUp, IconArrowDown, IconArrowLeft, IconArrowRight,
  IconZoomIn, IconZoomOut, IconMaximize, IconRefresh, IconAlertCircle
} from '@tabler/icons-react';
import { ExtendedNode, ExtendedEdge } from '../types';

interface GraphProps {
  sessionId: string;
  relationFilters?: string[];
  onNodeClick?: (node: ExtendedNode) => void;
  onEdgeClick?: (edge: ExtendedEdge) => void;
};

const relationDisplayMap: Record<string, string> = {
  'same_background': 'Latar Belakang',
  'extended_method': 'Metodologi',
  'shares_goal': 'Tujuan',
  'follows_future_work': 'Arahan Masa Depan',
  'addresses_same_gap': 'Gap Penelitian'
};

const relationColorMap: Record<string, string> = {
  'same_background': 'blue',
  'extended_method': 'green',
  'shares_goal': 'orange',
  'follows_future_work': 'violet',
  'addresses_same_gap': 'red'
};

const getDisplayRelation = (relation: string | null | undefined): string => {
  if (!relation) return 'Unknown';
  return relationDisplayMap[relation] || relation;
};

const getRelationColor = (relation: string | null | undefined): string => {
  if (!relation) return 'gray';
  return relationColorMap[relation] || 'gray';
};

const cleanHtmlTags = (text: string | undefined): string => {
  if (!text) return '';
  // Hapus semua tag HTML termasuk <b> dan </b>
  return text.replace(/<[^>]+>/g, '').trim();
};

const normalizeNeo4jNode = (neoNode: any): ExtendedNode => {
  // Dapatkan judul dari berbagai sumber yang mungkin
  const rawTitle = neoNode.properties?.title || neoNode.title || neoNode.label || `Node ${neoNode.id}`;
  
  // Bersihkan judul dari tag HTML dan ambil baris pertama
  const cleanTitle = cleanHtmlTags(rawTitle).split('\n')[0];

  return {
    id: neoNode.id,
    label: cleanTitle,
    title: cleanTitle,
    att_goal: cleanHtmlTags(neoNode.properties?.att_goal || neoNode.att_goal || ''),
    att_method: cleanHtmlTags(neoNode.properties?.att_method || neoNode.att_method || ''),
    att_background: cleanHtmlTags(neoNode.properties?.att_background || neoNode.att_background || ''),
    att_future: cleanHtmlTags(neoNode.properties?.att_future || neoNode.att_future || ''),
    att_gaps: cleanHtmlTags(neoNode.properties?.att_gaps || neoNode.att_gaps || ''),
    att_url: cleanHtmlTags(neoNode.properties?.att_url || neoNode.att_url || ''),
  };
};

const normalizeNeo4jEdge = (neoEdge: any, nodeTitles: Record<string, string> = {}): ExtendedEdge => {
  if (!neoEdge) return createDefaultEdge();

  // Pastikan type relasi selalu string dan memiliki fallback
  const relationType = neoEdge.relation ? String(neoEdge.relation) : neoEdge.type ? String(neoEdge.type) : 'unknown';
  
  // Mapping yang lebih komprehensif termasuk format alternatif
  const relationMapping: Record<string, string> = {
    'SAME_BACKGROUND': 'same_background',
    'EXTENDED_METHOD': 'extended_method',
    'SHARES_GOAL': 'shares_goal',
    'FOLLOWS_FUTURE_WORK': 'follows_future_work',
    'ADDRESSES_SAME_GAP': 'addresses_same_gap',
    'BACKGROUND': 'same_background', // Format alternatif
    'METHOD': 'extended_method',     // Format alternatif
    'GOAL': 'shares_goal'            // Format alternatif
  };

  const apiRelation = relationMapping[relationType] || relationType.toLowerCase();

  return {
    id: neoEdge.id || `${neoEdge.from}-${neoEdge.to}-${relationType}-${Date.now()}`,
    from: neoEdge.from?.toString() || '',
    to: neoEdge.to?.toString() || '',
    label: neoEdge.explanation || neoEdge.properties?.explanation || `Hubungan ${relationType}`,
    relation: apiRelation,
    fromTitle: nodeTitles[neoEdge.from] || neoEdge.fromTitle || `Artikel ${neoEdge.from}`,
    toTitle: nodeTitles[neoEdge.to] || neoEdge.toTitle || `Artikel ${neoEdge.to}`,
    color: {
      color: getRelationColor(apiRelation),
      highlight: '#FF0000'
    },
    properties: {
      description: neoEdge.description || neoEdge.properties?.description,
      weight: neoEdge.weight || neoEdge.properties?.weight || 1.0,
      explanation: neoEdge.explanation,
      type: relationType
    }
  };
};


// Helper function for default edge
const createDefaultEdge = (): ExtendedEdge => ({
  id: 'invalid-edge',
  from: '',
  to: '',
  label: 'Invalid Edge',
  relation: 'unknown',
  arrows: 'to',
  color: { color: '#95a5a6' },
  font: { color: 'black', background: 'white' },
  fromTitle: 'Unknown Source',
  toTitle: 'Unknown Target',
  properties: {}
});

export default function Graph({
  sessionId,
  relationFilters = [],
  onNodeClick,
  onEdgeClick
}: GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    const network = networkRef.current;
    if (!network) return;

    const currentView = network.getViewPosition();
    const moveStep = 100;

    const movements = {
      up: { x: 0, y: -moveStep },
      down: { x: 0, y: moveStep },
      left: { x: -moveStep, y: 0 },
      right: { x: moveStep, y: 0 }
    };

    network.moveTo({
      position: {
        x: currentView.x + movements[direction].x,
        y: currentView.y + movements[direction].y
      },
      animation: true
    });
  };

  const handleZoom = (type: 'in' | 'out') => {
    const network = networkRef.current;
    if (!network) return;

    const currentScale = network.getScale();
    const zoomStep = 0.2;
    const newScale = type === 'in'
      ? currentScale * (1 + zoomStep)
      : currentScale * (1 - zoomStep);

    network.moveTo({
      scale: newScale,
      animation: true
    });
  };

  const handleFitView = () => {
    const network = networkRef.current;
    if (!network) return;
    network.fit({ animation: true });
  };

  const handleRefresh = () => {
    setError(null);
    setLoading(true);
    loadVisJsVisualization();
  };

  const renderVisJsVisualization = async (nodes: any[], edges: any[]) => {
    if (!containerRef.current) return;

    try {
      const vis = await import('vis-network/standalone');

      const data = {
        nodes: new vis.DataSet(nodes),
        edges: new vis.DataSet(edges)
      };

      const options = {
        nodes: {
          shape: 'dot',
          borderWidth: 2,
          shadow: true
        },
        edges: {
          width: 2,
          shadow: true,
          smooth: {
            enabled: true,
            type: 'dynamic',
            roundness: 0.5
          }
        },
        physics: {
          enabled: true,
          stabilization: {
            iterations: 100
          },
          barnesHut: {
            gravitationalConstant: -8000,
            springLength: 95
          }
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          navigationButtons: false,
        }
      };

      if (networkRef.current) {
        networkRef.current.destroy();
      }

      networkRef.current = new vis.Network(containerRef.current, data, options);

      networkRef.current.on('click', (params: any) => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          const node = nodes.find(n => n.id === nodeId);
          if (node && onNodeClick) {
            onNodeClick(normalizeNeo4jNode(node));
          }
        } else if (params.edges.length > 0) {
          const edgeId = params.edges[0];
          const edge = edges.find(e => e.id === edgeId);
          if (edge && onEdgeClick) {
            const titles: any = {};
            nodes.forEach(n => {
              titles[n.id] = n.title || n.label;
            })
            onEdgeClick(normalizeNeo4jEdge(edge, titles));
          }
        }
      });

      networkRef.current.once('stabilizationIterationsDone', () => {
        networkRef.current.setOptions({ physics: false });
        setLoading(false);

        setTimeout(() => {
            const navButtons = document.querySelectorAll('.vis-button, .vis-navigation');
            navButtons.forEach(el => el.remove());
        }, 100);
      });

    } catch (err) {
      console.error('Error rendering Vis.js:', err);
      setError('Failed to render Vis.js graph');
      setLoading(false);
    }
  };

  const getDisplayRelation = (relation: string): string => {
  const displayNames: Record<string, string> = {
    'same_background': 'Latar Belakang',
    'extended_method': 'Metodologi',
    'shares_goal': 'Tujuan',
    'follows_future_work': 'Arahan Masa Depan',
    'addresses_same_gap': 'Gap Penelitian',
    'related': 'Terkait'
  };
  
  return displayNames[relation.toLowerCase()] || relation;
};

const loadVisJsVisualization = async () => {
  try {
    const articleIdsParam = relationFilters.length > 0
      ? `&articleIds=${relationFilters.join(',')}`
      : '';
    const res = await fetch(`/api/neo4j/query?sessionId=${sessionId}${articleIdsParam}`);
    const result = await res.json();

    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to load data');
    }

    const nodeTitles: Record<string, string> = {};
    const visNodes = result.nodes.map((node: any) => {
      const normalized = normalizeNeo4jNode(node);
      nodeTitles[node.id] = normalized.title || `Artikel ${node.id}`;
      
      return {
        ...normalized,
        shape: 'dot',
        color: {
          background: '#97C2FC',
          border: '#2B7CE9',
          highlight: {
            background: '#D2E5FF',
            border: '#2B7CE9'
          }
        },
        title: `
          ${normalized.title}
        `
      };
    });

    const visEdges = result.edges.map((edge: any) => {
      const normalized = normalizeNeo4jEdge(edge, nodeTitles);
      const similarity = normalized.properties?.similarity 
        ? Number(normalized.properties.similarity) 
        : null;
      
      return {
        ...normalized,
        label: '', // Kosongkan label di garis
        title: `
          Klik untuk detail
        `,
        arrows: 'to',
        width: (edge.weight || 1) * 2,
        color: normalized.color,
        smooth: {
          type: 'continuous'
        }
      };
    });

    if (visNodes.length === 0) {
      throw new Error('Tidak ada data graph untuk session ini. Silakan upload artikel.');
    }

    renderVisJsVisualization(visNodes, visEdges);

  } catch (err: any) {
    setError(err.message || 'Unknown error occurred');
    setLoading(false);
  }
};

  useEffect(() => {
    if (sessionId) {
      loadVisJsVisualization();
    }

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [sessionId, relationFilters]);

  if (error) {
    return (
      <Box style={{ position: 'relative', width: '100%', height: '500px' }}>
        <Alert icon={<IconAlertCircle size={16} />} title="Graph Error" color="red" style={{ margin: '20px' }}>
          <Text size="sm" mb="md">{error}</Text>
          <Button variant="light" color="blue" size="sm" onClick={handleRefresh} leftSection={<IconRefresh size={16} />}>
            Retry
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box style={{ position: 'relative', width: '100%', height: '500px' }}>
      {loading && (
        <Box style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', zIndex: 1
        }}>
          <Loader size="xl" variant="dots" color="blue" />
          <Text size="sm" color="dimmed" mt="md">Loading Vis.js graph...</Text>
        </Box>
      )}

      {/* Navigation Controls */}
      <Group style={{ position: 'absolute', left: 20, bottom: 20, zIndex: 1 }} gap="xs">
        <Stack gap="xs" align="center">
          <Button size="sm" variant="light" onClick={() => handleMove('up')} disabled={loading}>
            <IconArrowUp size={16} />
          </Button>
          <Group gap="xs">
            <Button size="sm" variant="light" onClick={() => handleMove('left')} disabled={loading}>
              <IconArrowLeft size={16} />
            </Button>
            <Button size="sm" variant="light" onClick={() => handleMove('down')} disabled={loading}>
              <IconArrowDown size={16} />
            </Button>
            <Button size="sm" variant="light" onClick={() => handleMove('right')} disabled={loading}>
              <IconArrowRight size={16} />
            </Button>
          </Group>
        </Stack>
      </Group>

      <Group style={{ position: 'absolute', right: 20, bottom: 20, zIndex: 1 }} gap="xs">
        <Button size="sm" variant="light" onClick={() => handleZoom('in')} disabled={loading}>
          <IconZoomIn size={16} />
        </Button>
        <Button size="sm" variant="light" onClick={() => handleZoom('out')} disabled={loading}>
          <IconZoomOut size={16} />
        </Button>
        <Button size="sm" variant="light" onClick={handleFitView} disabled={loading}>
          <IconMaximize size={16} />
        </Button>
        <Button size="sm" variant="light" onClick={handleRefresh} disabled={loading}>
          <IconRefresh size={16} />
        </Button>
      </Group>

      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          border: '1px solid #ddd',
          borderRadius: '8px'
        }}
      />
    </Box>
  );
}
