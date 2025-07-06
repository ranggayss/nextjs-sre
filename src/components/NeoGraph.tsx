// components/NeoGraph.tsx (Fixed version)
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader, Box, Group, Button, Stack, Text } from '@mantine/core';
import { 
  IconArrowUp, 
  IconArrowDown, 
  IconArrowLeft, 
  IconArrowRight,
  IconZoomIn,
  IconZoomOut,
  IconMaximize,
  IconRefresh
} from '@tabler/icons-react';
import { ExtendedNode, ExtendedEdge } from '../types';

interface NeoGraphProps {
  sessionId: string;
  relationFilters?: string[];
  onNodeClick?: (node: ExtendedNode) => void;
  onEdgeClick?: (edge: ExtendedEdge) => void;
}

declare global {
  interface Window {
    NeoVis: any;
  }
}

export default function NeoGraph({ 
  sessionId, 
  relationFilters = [],
  onNodeClick,
  onEdgeClick
}: NeoGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const neoVizRef = useRef<any>(null);

  // Navigation controls
  const handleMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!neoVizRef.current || !neoVizRef.current._network) return;
    
    const network = neoVizRef.current._network;
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

  const handleZoomIn = (type: 'in' | 'out') => {
    if (!neoVizRef.current || !neoVizRef.current._network) return;
    
    const network = neoVizRef.current._network;
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
    if (!neoVizRef.current || !neoVizRef.current._network) return;
    neoVizRef.current._network.fit({
      animation: true
    });
  };

  const handleRefresh = () => {
    if (neoVizRef.current) {
      setLoading(true);
      neoVizRef.current.render();
    }
  };

  useEffect(() => {
    let mounted = true;

    async function loadNeoVis() {
      try {
        setLoading(true);
        setError(null);

        // Load Neovis.js from CDN - using version 1.5.0 for better compatibility
        if (!window.NeoVis) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/neovis.js@1.5.0';
          script.onload = () => {
            if (mounted) {
              initializeNeoVis();
            }
          };
          script.onerror = () => {
            if (mounted) {
              setError('Failed to load Neovis.js library');
              setLoading(false);
            }
          };
          document.head.appendChild(script);
        } else {
          initializeNeoVis();
        }
      } catch (err) {
        console.error('Error loading Neovis:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load graph');
          setLoading(false);
        }
      }
    }

    function initializeNeoVis() {
      if (!containerRef.current || !window.NeoVis) return;

      try {
        // Build dynamic Cypher query with fallback for empty database
        let cypherQuery;
        
        // First, try to get nodes with relationships
        if (relationFilters.length > 0) {
          const articleIds = relationFilters.map(id => `'${id}'`).join(',');
          cypherQuery = `
            MATCH (n:Article) 
            WHERE n.sessionId = '${sessionId}' AND n.id IN [${articleIds}]
            OPTIONAL MATCH (n)-[r]-(m:Article)
            RETURN n, r, m
          `;
        } else {
          // Get all articles for this session, with or without relationships
          cypherQuery = `
            MATCH (n:Article) 
            WHERE n.sessionId = '${sessionId}'
            OPTIONAL MATCH (n)-[r]-(m:Article)
            RETURN n, r, m
            LIMIT 100
          `;
        }

        // Get environment variables with proper defaults
        const neo4jUri = process.env.NEXT_PUBLIC_NEO4J_URI || "neo4j+s://b58ccce8.databases.neo4j.io";
        const neo4jUser = process.env.NEXT_PUBLIC_NEO4J_USER || "neo4j";
        const neo4jPassword = process.env.NEXT_PUBLIC_NEO4J_PASSWORD || "password";

        // For encrypted connections (neo4j+s:// or bolt+s://), use minimal config
        // For unencrypted connections, add basic driver config
        const isEncrypted = neo4jUri.startsWith('neo4j+s://') || neo4jUri.startsWith('bolt+s://');
        
        const neo4jConfig: any = {
          serverUrl: neo4jUri,
          serverUser: neo4jUser,
          serverPassword: neo4jPassword,
          driverConfig: {
            encrypted: "ENCRYPTION_ON",
            trust: "TRUST_ALL_CERTIFICATES",
            maxConnectionPoolSize: 50,
            connectionAcquisitionTimeout: 60000,
            // Config khusus Aura OAuth
          auth: {
            type: "basic",
            credentials: {
              username: neo4jUser,
              password: neo4jPassword,
            }
          }
          }
        };
        /*
        // Only add driver config for local unencrypted connections
        if (!isEncrypted) {
          neo4jConfig.driverConfig = {
            encrypted: 'ENCRYPTION_ON',
            trust: 'TRUST_ALL_CERTIFICATES'
          };
        }
          */

        const config = {
          containerId: containerRef.current.id,
          neo4j: neo4jConfig,
          labels: {
            Article: {
              label: "title",
              value: "title",
              group: "sessionId",
              [window.NeoVis.NEOVIS_ADVANCED_CONFIG]: {
                function: {
                  title: (node: any) => {
                    return `
                      <div style="padding: 10px; max-width: 300px;">
                        <strong>${node.properties.title || 'Untitled'}</strong><br/>
                        <strong>Background:</strong> ${node.properties.att_background || 'N/A'}<br/>
                        <strong>Method:</strong> ${node.properties.att_method || 'N/A'}<br/>
                        <strong>Goal:</strong> ${node.properties.att_goal || 'N/A'}<br/>
                        <strong>Future:</strong> ${node.properties.att_future || 'N/A'}<br/>
                        <strong>Gaps:</strong> ${node.properties.att_gaps || 'N/A'}
                      </div>
                    `;
                  }
                }
              }
            }
          },
          relationships: {
            SAME_BACKGROUND: {
              value: "weight",
              label: "SAME_BACKGROUND",
              color: "#2563eb"
            },
            EXTENDED_METHOD: {
              value: "weight", 
              label: "EXTENDED_METHOD",
              color: "#16a34a"
            },
            SHARES_GOAL: {
              value: "weight",
              label: "SHARES_GOAL",
              color: "#ea580c"
            },
            FOLLOWS_FUTURE_WORK: {
              value: "weight",
              label: "FOLLOWS_FUTURE_WORK",
              color: "#7c3aed"
            },
            ADDRESSES_SAME_GAP: {
              value: "weight",
              label: "ADDRESSES_SAME_GAP",
              color: "#dc2626"
            },
            RELATED: {
              value: "weight",
              label: "RELATED",
              color: "#6b7280"
            }
          },
          initialCypher: cypherQuery,
          visConfig: {
            nodes: {
              shape: 'circle',
              size: 20,
              font: {
                size: 14,
                color: '#333333'
              },
              borderWidth: 2,
              shadow: true,
              margin: {
                top: 10,
                bottom: 10,
              }
            },
            edges: {
              arrows: {
                to: { enabled: true, scaleFactor: 1, type: 'arrow' }
              },
              color: { inherit: 'from' },
              width: 2,
              shadow: true,
              smooth: { 
                type: 'dynamic',
                forceDirection: true,
                roundness: 0.5
              }
            },
            physics: {
              enabled: true,
              solver: 'forceAtlas2Based',
              forceAtlas2Based: {
                gravitationalConstant: -50,
                springLength: 200,
                springConstant: 0.08,
                damping: 0.4,
                avoidOverlap: 1
              },
              stabilization: { 
                iterations: 1000,
                updateInterval: 50,
                onlyDynamicEdges: false,
                fit: true
              }
            },
            interaction: {
              hover: true,
              tooltipDelay: 200,
              hideEdgesOnDrag: false,
              hideNodesOnDrag: false,
              navigationButtons: true,
              dragNodes: true,
              dragView: true,
              zoomView: true,
              multiselect: true
            },
            layout: {
              improvedLayout: true
            }
          }
        };

        // Clean up previous instance
        if (neoVizRef.current) {
          neoVizRef.current = null;
        }

        // Create new NeoVis instance
        neoVizRef.current = new window.NeoVis.default(config);
        
        // Add event listeners
        neoVizRef.current.registerOnEvent("completed", () => {
          console.log("NeoVis render completed");
          if (mounted) {
            setLoading(false);
            if (neoVizRef.current && neoVizRef.current._network) {
              const nodes = neoVizRef.current._data?.nodes;
              const edges = neoVizRef.current._data?.edges;
              
              // Check if we have any data
              if (!nodes || nodes.length === 0) {
                setError(`No articles found for session: ${sessionId}. Please make sure your database contains Article nodes with the correct sessionId.`);
                return;
              }
              
              console.log(`Found ${nodes.length} nodes and ${edges?.length || 0} edges`);
              
              neoVizRef.current._network.setOptions({ physics: false });
              neoVizRef.current._network.fit({ animation: true });
              
              // Add click event listeners
              neoVizRef.current._network.on("click", (event: any) => {
                if (event.nodes.length > 0 && onNodeClick) {
                  const nodeId = event.nodes[0];
                  const nodeData = neoVizRef.current._data.nodes.get(nodeId);
                  
                  const extendedNode: ExtendedNode = {
                    id: nodeData.id || nodeId,
                    label: nodeData.label || nodeData.title || 'Unknown',
                    title: nodeData.title || nodeData.label || 'Unknown',
                  };
                  
                  onNodeClick(extendedNode);
                }
                
                if (event.edges.length > 0 && onEdgeClick) {
                  const edgeId = event.edges[0];
                  const edgeData = neoVizRef.current._data.edges.get(edgeId);
                  
                  const extendedEdge: ExtendedEdge = {
                    id: edgeData.id || edgeId,
                    from: edgeData.from,
                    to: edgeData.to,
                    label: edgeData.label || '',
                    relation: edgeData.type || 'unknown',
                  };
                  
                  onEdgeClick(extendedEdge);
                }
              });
            }
          }
        });

        neoVizRef.current.registerOnEvent("error", (error: any) => {
          console.error("NeoVis error:", error);
          if (mounted) {
            setError(`Neo4j connection error: ${error.message || 'Unknown error'}`);
            setLoading(false);
          }
        });

        // Render graph
        neoVizRef.current.render();

      } catch (err) {
        console.error('Error initializing NeoVis:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize graph');
          setLoading(false);
        }
      }
    }

    if (sessionId) {
      loadNeoVis();
    }

    return () => {
      mounted = false;
      if (neoVizRef.current) {
        neoVizRef.current = null;
      }
    };
  }, [sessionId, relationFilters, onNodeClick, onEdgeClick]);

  if (error) {
    return (
      <Box style={{ position: 'relative', width: '100%', height: '500px' }}>
        <div style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <Text size="lg" color="red" mb="md">Error: {error}</Text>
          <Text size="sm" color="dimmed" mb="lg">
            Database troubleshooting tips:
          </Text>
          <Stack gap="xs" align="center">
            <Text size="xs" color="dimmed">• Check if Neo4j is running and accessible</Text>
            <Text size="xs" color="dimmed">• Verify database contains Article nodes</Text>
            <Text size="xs" color="dimmed">• Check if sessionId matches your data</Text>
            <Text size="xs" color="dimmed">• For local Neo4j: bolt://localhost:7687</Text>
            <Text size="xs" color="dimmed">• For Neo4j Aura: neo4j+s://xxx.databases.neo4j.io</Text>
          </Stack>
          <Button 
            variant="light" 
            color="blue" 
            mt="lg" 
            onClick={handleRefresh}
            leftSection={<IconRefresh size={16} />}
          >
            Retry Connection
          </Button>
        </div>
      </Box>
    );
  }

  return (
    <Box style={{ position: 'relative', width: '100%', height: '500px' }}>
      {loading && (
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
            disabled={loading}
          >
            <IconArrowUp size={16} />
          </Button>

          <Group gap="xs">
            <Button 
              size="sm" 
              variant="light"
              onClick={() => handleMove('left')}
              disabled={loading}
            >
              <IconArrowLeft size={16} />
            </Button>
            <Button 
              size="sm" 
              variant="light"
              onClick={() => handleMove('down')}
              disabled={loading}
            >
              <IconArrowDown size={16} />
            </Button>
            <Button 
              size="sm" 
              variant="light"
              onClick={() => handleMove('right')}
              disabled={loading}
            >
              <IconArrowRight size={16} />
            </Button>
          </Group>
        </Stack>
      </Group>

      {/* Right Bottom Controls */}
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
          disabled={loading}
        >
          <IconZoomIn size={16} />
        </Button>
        <Button 
          size="sm" 
          variant="light"
          onClick={() => handleZoomIn('out')}
          disabled={loading}
        >
          <IconZoomOut size={16} />
        </Button>
        <Button 
          size="sm" 
          variant="light"
          onClick={handleFitView}
          disabled={loading}
        >
          <IconMaximize size={16} />
        </Button>
        <Button 
          size="sm" 
          variant="light"
          onClick={handleRefresh}
          disabled={loading}
        >
          <IconRefresh size={16} />
        </Button>
      </Group>

      <div 
        id={`neo4j-viz-${sessionId}`}
        ref={containerRef}
        style={{ 
          width: '100%', 
          height: '100%', 
          border: '1px solid black',
          borderRadius: '8px'
        }}
      />
    </Box>
  );
}