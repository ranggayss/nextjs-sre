'use client';

import { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { Loader, Box, Group, Button, Stack } from '@mantine/core';
import { ExtendedNode, ExtendedEdge } from '../types';
import { 
  IconArrowUp, 
  IconArrowDown, 
  IconArrowLeft, 
  IconArrowRight,
  IconZoomIn,
  IconZoomOut,
  IconMaximize
} from '@tabler/icons-react';

interface NetworkGraphProps {
  nodes: ExtendedNode[];
  edges: ExtendedEdge[];
  onNodeClick?: (node: ExtendedNode) => void;
  onEdgeClick?: (edge: ExtendedEdge) => void;
}

export default function NetworkGraph({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
}: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<Network | null>(null);
  const nodeDataSetRef = useRef<DataSet<ExtendedNode> | null>(null);
  const edgeDataSetRef = useRef<DataSet<ExtendedEdge> | null>(null);

  const [ isLoading, setIsLoading] = useState(true);

  const handleMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!networkRef.current) return;
    
    const currentView = networkRef.current.getViewPosition();
    const moveStep = 100; // Pixels to move
    
    const movements = {
      up: { x: 0, y: -moveStep },
      down: { x: 0, y: moveStep },
      left: { x: -moveStep, y: 0 },
      right: { x: moveStep, y: 0 }
    };

    networkRef.current.moveTo({
      position: {
        x: currentView.x + movements[direction].x,
        y: currentView.y + movements[direction].y
      },
      animation: true
    });
  }

  const handleZoomIn = (type: 'in' | 'out') => {
    if (!networkRef.current) return;
    
    const currentScale = networkRef.current.getScale();
    const zoomStep = 0.2;
    
    const newScale = type === 'in' 
      ? currentScale * (1 + zoomStep)
      : currentScale * (1 - zoomStep);
    
    networkRef.current.moveTo({
      scale: newScale,
      animation: true
    });
  };

  const handleFitView = () => {
    if (!networkRef.current) return;
    networkRef.current.fit({
      animation: true
    });
  };
  
  useEffect(() => {
    if (!containerRef.current) return;

    nodeDataSetRef.current = new DataSet<ExtendedNode>();
    edgeDataSetRef.current = new DataSet<ExtendedEdge>();

    networkRef.current = new Network(
      containerRef.current,
      {
        nodes: nodeDataSetRef.current,
        edges: edgeDataSetRef.current,
      },
      {
        nodes: {
          shape: 'circle',
          margin: {
            top: 10,
            bottom: 10,
          },
        },
        edges: {
          arrows: 'to',
          font: { size: 0 },
          smooth: {
            enabled: true,
            type: 'dynamic',
            forceDirection: true,
            roundness: 0.5,
          },
        },
        interaction: { 
          hover: true, 
          navigationButtons: false,
          dragNodes: true,
          dragView: true,
          zoomView: true,
          multiselect: true,
        },
        physics: { 
          enabled: true,
          solver: 'forceAtlas2Based',
          forceAtlas2Based: {
              gravitationalConstant: -50,
              springLength: 0.01,
              springConstant: 0.08,
              damping: 0.4,
              avoidOverlap: 1,
          },    
          stabilization: {
              enabled: true,
              iterations: 1000,
              updateInterval: 50,
              onlyDynamicEdges: false,
              fit: true,
          },
        },
        layout: {
          improvedLayout: true,
        },
      },
    );

    networkRef.current.on('click', (params) => {
      if (params.nodes.length > 0 && nodeDataSetRef.current) {
        const node = nodeDataSetRef.current.get(params.nodes[0]) as ExtendedNode;
        if (node) onNodeClick?.(node);
      } else if (params.edges.length > 0 && edgeDataSetRef.current) {
        const edge = edgeDataSetRef.current.get(params.edges[0]) as ExtendedEdge;
        if (edge) onEdgeClick?.(edge);
      }
    });

    networkRef.current.once('stabilizationIterationsDone', () => {
        setIsLoading(false);
        if (networkRef.current) {
          networkRef.current.setOptions({ physics: false});
          networkRef.current.fit({ animation: true});
        }
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!nodeDataSetRef.current || !edgeDataSetRef.current || !networkRef.current) return;

    setIsLoading(true);
    
    // Update nodes
    nodeDataSetRef.current.clear();
    nodeDataSetRef.current.add(nodes);
    
    // Update edges
    edgeDataSetRef.current.clear();
    edgeDataSetRef.current.add(edges);

    // Re-enable physics temporarily for layout adjustment
    networkRef.current.setOptions({ physics: { enabled: true } });
    
    // Disable physics after stabilization
    const stabilizationHandler = () => {
      setIsLoading(false);
      if (networkRef.current) {
        networkRef.current.setOptions({ physics: false });
        networkRef.current.fit({ animation: true });
      }
    };

    networkRef.current.once('stabilizationIterationsDone', stabilizationHandler);
    
    // Fallback timeout in case stabilization doesn't trigger
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      if (networkRef.current) {
        networkRef.current.setOptions({ physics: false });
        networkRef.current.off('stabilizationIterationsDone', stabilizationHandler);
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      if (networkRef.current) {
        networkRef.current.off('stabilizationIterationsDone', stabilizationHandler);
      }
    };
  }, [nodes, edges]);

  return (
    <Box style={{ position: 'relative', width: '100%', height: '500px' }}>
      { isLoading && (
        <Loader
          size="xl"
          variant="dots"
          color="blue"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1
          }}
        />
      )}

      {/* Navigation Controls */}
      <Group 
        style={{ 
          position: 'absolute', 
          left: 20, 
          bottom: 20,
          zIndex: 1 
        }}
        gap="xs"
      >
        <Stack gap="xs" align="center">
          <Button 
            size="sm" 
            variant="light"
            onClick={() => handleMove('up')}
          >
            <IconArrowUp size={16} />
          </Button>

          <Group gap="xs">
            <Button 
              size="sm" 
              variant="light"
              onClick={() => handleMove('left')}
            >
              <IconArrowLeft size={16} />
            </Button>
            <Button 
              size="sm" 
              variant="light"
              onClick={() => handleMove('down')}
            >
              <IconArrowDown size={16} />
            </Button>
            <Button 
              size="sm" 
              variant="light"
              onClick={() => handleMove('right')}
            >
              <IconArrowRight size={16} />
            </Button>
          </Group>
        </Stack>
      </Group>

      {/* Right Bottom Controls - Zoom and Fit */}
      <Group 
        style={{ 
          position: 'absolute', 
          right: 20, 
          bottom: 20,
          zIndex: 1
        }}
        gap="xs"
      >
        <Button 
          size="sm" 
          variant="light"
          onClick={() => handleZoomIn('in')}
        >
          <IconZoomIn size={16} />
        </Button>
        <Button 
          size="sm" 
          variant="light"
          onClick={() => handleZoomIn('out')}
        >
          <IconZoomOut size={16} />
        </Button>
        <Button 
          size="sm" 
          variant="light"
          onClick={handleFitView}
        >
          <IconMaximize size={16} />
        </Button>
      </Group>

      <div ref={containerRef} style={{ width: '100%', height: '100%', border: '1px solid black' }} />
    </Box>
  )
}
