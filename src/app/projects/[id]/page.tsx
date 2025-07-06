// src/app/graph/page.tsx
'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Box,
  Burger,
  Button,
  Checkbox,
  Divider,
  Flex,
  Grid,
  Group,
  MultiSelect,
  Text,
  Modal,
  AppShell,
  AppShellMain,
  AppShellNavbar,
  AppShellHeader,
  Menu, 
  Avatar,
  Badge,
  Paper,
  ActionIcon,
  Tooltip,
  Stack,
  Card,
  ThemeIcon,
  rem,
  Container,
  useMantineColorScheme,
  useMantineTheme,
  Loader,
  Select,
} from '@mantine/core';
import { 
  IconNetwork, 
  IconMessageCircle, 
  IconPlus, 
  IconHistory,
  IconUser,
  IconLogout,
  IconFilter,
  IconCircleDot,
  IconBrandHipchat,
  IconSearch,
  IconSettings,
  IconChevronRight,
  IconDots,
  IconSun,
  IconMoon,
  IconHome,
  IconChartDots2Filled,
  IconArticleFilled,
  IconMenu,
  IconEye,
  IconUpload,
} from '@tabler/icons-react';
import { ExtendedEdge, ExtendedNode } from '../../../types';
import NetworkGraph from '../../../components/NetworkGraph';
import ChatPanel from '../../../components/ChatPanel';
import NodeDetail from '../../../components/NodeDetail';
import EdgeDetail from '../../../components/EdgeDetail';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import dynamic from 'next/dynamic';
import { resolve } from 'path';
import Neo2 from '@/components/Neo2';

const Neograph = dynamic(() => import('@/components/NeoGraph'), {
    ssr: false,
});

const relationMapping = {
  'background': 'same_background',
  'method': 'extended_method',
  'goal': 'shares_goal',
  'future': 'follows_future_work',
  'gap': 'addresses_same_gap',
};

const relationColors = {
  'background': 'blue',
  'method': 'green',
  'gap': 'red',
  'future': 'violet',
  'goal': 'orange'
};

function getRelationDisplayName(relation: string): string {
  const displayNames = {
    'background': 'Latar Belakang',
    'method': 'Metodologi',
    'goal': 'Tujuan',
    'future': 'Arahan Masa Depan',
    'gap': 'Gap Penelitian'
  };

  return displayNames[relation as keyof typeof displayNames] || relation.charAt(0).toUpperCase() + relation.slice(1);
}

function getRelationColor(relation: string): string {
  const reverseMapping: Record<string, string> = {};
  Object.entries(relationMapping).forEach(([display, api]) => {
    reverseMapping[api] = display;
  });

  const displayRelation = reverseMapping[relation];
  return relationColors[displayRelation as keyof typeof relationColors] || 'gray';
}

function getDisplayRelationKey(apiRelation: string): string{
  const reverseMapping: Record<string, string> = {};
  Object.entries(relationMapping).forEach(([display, api]) => {
    reverseMapping[api] = display;
  });
  return reverseMapping[apiRelation] || apiRelation;
}

export default function Home() {
  const params = useParams();
  const rawSessionId = params?.id;
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fullPath = `${pathname}?${searchParams.toString()}`;

  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();

  const [mounted, setMounted] = useState(false);
  const dark = mounted ? colorScheme === 'dark' : false;

  useEffect(() => {
    setMounted(true);
  }, []);

  const [sidebarOpened, setSidebarOpened] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ExtendedNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<ExtendedEdge | null>(null);
  const [detailModalNode, setDetailModalNode] = useState<ExtendedNode | null>(null);
  const [detailModalEdge, setDetailModalEdge] = useState<ExtendedEdge | null>(null);
  const [edgeDetailReturn, setEdgeDetailReturn] = useState<ExtendedEdge | null>(null);
  const [activeRelations, setActiveRelations] = useState<string[]>([
    'background',
    'method',
    'gap',
    'future',
    'goal',
  ]);
  const [activeArticles, setActiveArticles] = useState<string[]>([]);
  const [nodes, setNodes] = useState<ExtendedNode[]>([]);
  const [edges, setEdges] = useState<ExtendedEdge[]>([]);
  
  // TAMBAHAN: State untuk tracking loading
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Tambahan dropdown graph
  const [graph, setGraph] = useState<'visjs' | 'neovisjs'>('visjs');
  const [neo4jData, setNeo4jData] = useState<{nodes: any[], edges: any[]}>({nodes: [], edges: []});
  const [graphKey, setGraphKey] = useState(0);
  const graphContainerRef = useRef<HTMLDivElement>(null);

  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [previousGraph, setPreviousGraph] = useState<'visjs' | 'neovisjs'>('visjs');

  const fetchNeo4jData = async () => {
    try {
      const articleIdsParam = activeArticles.length > 0 ? `&articleIds=${activeArticles.join(',')}` : '';
      const res = await fetch(`/api/neo4j/query?sessionId=${sessionId}${articleIdsParam}`);

      if (res.ok){
        const data = await res.json();
        setNeo4jData(data);
      }
    } catch (error) {
      console.error('Error fetching Neo4j data:', error);
    }
  };

  // Effect untuk fetch Neo4j data ketika filter berubah
  useEffect(() => {
    if (graph === 'neovisjs' && sessionId && !isLoadingSession && !isLoadingData) {
      fetchNeo4jData();
    }
  }, [graph, activeArticles, sessionId, isLoadingSession, isLoadingData]);

  const cleanupNavigationButtons = useCallback(() => {
  // Cleanup semua tombol navigasi yang mungkin tertinggal
  const navigationSelectors = [
    // NeoVis navigation buttons
    '.neovis-navigation',
    '.neovis-controls',
    '.neovis-toolbar',
    // Generic navigation buttons yang sering digunakan library graph
    '[class*="navigation"]',
    '[class*="control"]',
    '[class*="toolbar"]',
    '[class*="zoom"]',
    '[class*="pan"]',
    // Specific button types
    'button[title*="zoom"]',
    'button[title*="pan"]',
    'button[title*="fit"]',
    'button[title*="center"]',
    // SVG controls yang sering digunakan untuk navigasi
    'svg[class*="control"]',
    'svg[class*="navigation"]',
    // Generic floating buttons
    '.floating-button',
    '.graph-controls',
    // Buttons dengan style position absolute/fixed yang mungkin floating
    'button[style*="position: absolute"]',
    'button[style*="position: fixed"]',
    'div[style*="position: absolute"][style*="button"]',
    'div[style*="position: fixed"][style*="button"]'
  ];

  navigationSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Check if element is actually a navigation button
        const isNavButton = el.textContent?.includes('→') || 
                           el.textContent?.includes('↓') || 
                           el.textContent?.includes('-') ||
                           el.textContent?.includes('+') ||
                           el.getAttribute('title')?.toLowerCase().includes('zoom') ||
                           el.getAttribute('title')?.toLowerCase().includes('pan') ||
                           el.getAttribute('aria-label')?.toLowerCase().includes('navigation');
        
        if (isNavButton || selector.includes('navigation') || selector.includes('control')) {
          el.remove();
        }
      });
    } catch (e) {
      console.warn(`Could not clean selector: ${selector}`, e);
    }
  });

  // Cleanup berdasarkan content text (untuk tombol dengan simbol)
  const allButtons = document.querySelectorAll('button, div[role="button"], span[role="button"]');
  allButtons.forEach(button => {
    const text = button.textContent?.trim();
    const title = button.getAttribute('title');
    const ariaLabel = button.getAttribute('aria-label');
    
    // Check for navigation symbols atau keywords
    const navigationPatterns = [
      '→', '←', '↑', '↓', // Arrow symbols
      '⊕', '⊖', // Plus/minus in circle
      '🔍', '🔎', // Magnifying glass
      '+', '-', // Simple plus minus
      'zoom', 'pan', 'fit', 'center', 'reset' // Keywords
    ];
    
    const isNavigationButton = navigationPatterns.some(pattern => 
      text?.includes(pattern) || 
      title?.toLowerCase().includes(pattern.toLowerCase()) ||
      ariaLabel?.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (isNavigationButton) {
      // Double check it's not part of our main UI
      const isPartOfMainUI = button.closest('.mantine-Card-root') || 
                            button.closest('.mantine-Grid-col') ||
                            button.closest('[data-mantine-component]');
      
      if (!isPartOfMainUI) {
        button.remove();
      }
    }
  });

  
    const cleanupAttempts = [100, 300, 500, 1000];

    cleanupAttempts.forEach(delay => {
      setTimeout(() => {

      }, delay)
    });

  return () => {
    cleanupNavigationButtons();

    if (graphContainerRef.current){
      graphContainerRef.current.innerHTML = '';
    }

    const neoElements = document.querySelectorAll('[id*="neo"], [class*="neo"], [data-neo]');
    neoElements.forEach(el => el.remove());
  }

  }, []);

  useEffect(() => {
    cleanupNavigationButtons();
  }, [router, cleanupNavigationButtons]);

  const handleGraphTypeChange = useCallback(async (newGraphType: 'visjs' | 'neovisjs') => {
    setIsCleaningUp(true);
    setPreviousGraph(graph);

    if (graphContainerRef.current){
      const container = graphContainerRef.current;
      const clonedContainer = container.cloneNode(false) as HTMLDivElement;
      container.parentNode?.replaceChild(clonedContainer, container);
      graphContainerRef.current = clonedContainer;
    }

    setSelectedNode(null);
    setSelectedEdge(null);

    if (newGraphType === 'visjs' && newGraphType === 'visjs'){
      setNeo4jData({nodes: [], edges: []});

      // Multiple cleanup attempts dengan delay
      const cleanupAttempts = [50, 150, 300, 500];
      
      cleanupAttempts.forEach(delay => {
        setTimeout(() => {
          cleanupNavigationButtons();
          
          // Additional cleanup for persistent elements
          const persistentElements = document.querySelectorAll(
            '[class*="neo"], [id*="neo"], [data-*="neo"], ' +
            '.vis-navigation, .vis-button, .vis-up, .vis-down, .vis-left, .vis-right, .vis-zoomIn, .vis-zoomOut, .vis-zoomExtends'
          );
          
          persistentElements.forEach(el => {
            try {
              el.remove();
            } catch (e) {
              // Element might already be removed
            }
          });
          
          // Force remove any remaining floating buttons outside our container
          const floatingButtons = document.querySelectorAll('body > button, body > div > button');
          floatingButtons.forEach(button => {
            const rect = button.getBoundingClientRect();
            // If button is small and positioned like a navigation control
            if (rect.width < 50 && rect.height < 50) {
              const isPartOfMainUI = button.closest('.mantine-AppShell-root') !== null;
              if (!isPartOfMainUI) {
                button.remove();
              }
            }
          });
        }, delay);
      });
    }

    await new Promise(resolve => setTimeout(resolve, 150))

    setGraph(newGraphType);
    setGraphKey(prev => prev + 1);

    if (newGraphType === 'visjs'){
      setIsLoadingData(false);
    }

    setTimeout(() => {
      cleanupNavigationButtons();
      setIsCleaningUp(false);
    }, 200);
  }, [graph, cleanupNavigationButtons]);

  useEffect(() => {
  return () => {
    // Cleanup saat component unmount
    if (graphContainerRef.current) {
      graphContainerRef.current.innerHTML = '';
    }
    
    // Clear any remaining Neo4j elements
    const neoElements = document.querySelectorAll('[id*="neo"], [class*="neo"], [data-neo]');
    neoElements.forEach(el => el.remove());
  };
}, []);

  useEffect(() => {
    // Hanya jalankan cleanup jika sedang di vis.js tapi pernah menggunakan neovisjs
    if (graph === 'visjs' && previousGraph === 'neovisjs') {
      const timeoutId = setTimeout(() => {
        cleanupNavigationButtons();
      }, 300); // Delay untuk memastikan render selesai

      return () => clearTimeout(timeoutId);
    }
  }, [activeRelations, activeArticles, graph, previousGraph, cleanupNavigationButtons]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpened((o) => !o);
  }, []);

  const handleChatSelect = useCallback((chatId: number) => {
    console.log(`Selected chat: ${chatId}`);
  }, []);

  const handleNewChat = useCallback(() => {
    console.log('New chat clicked');
  }, []);

  //PERBAIKAN: Filter logic yang lebih robust
  const filteredNodes = useMemo(() => {
    // Jika masih loading, return empty array
    if (isLoadingSession || isLoadingData) return [];
    
    // Jika tidak ada artikel yang dipilih, tampilkan semua
    if (activeArticles.length === 0) return nodes;
    
    // Filter berdasarkan artikel yang dipilih
    return nodes.filter((node) => activeArticles.includes(String(node.id)));
  }, [activeArticles, nodes, isLoadingSession, isLoadingData]);

  const filteredEdges = useMemo(() => {
    if (isLoadingSession || isLoadingData) return [];
    
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    
    // Convert display relation names to API relation names
    const mappedActiveRelations = activeRelations.map(relation => 
      relationMapping[relation as keyof typeof relationMapping]
    ).filter(Boolean);
    
    return edges.filter((edge) => {
      const matchRelation = activeRelations.length > 0 && mappedActiveRelations.includes(edge.relation || '');
      const matchNodes = nodeIds.has(edge.from) && nodeIds.has(edge.to);
      
      return matchRelation && matchNodes;
    });
  }, [activeRelations, edges, filteredNodes, isLoadingSession, isLoadingData]);

    // Tambahkan useEffect khusus untuk monitoring perubahan filtered nodes/edges
  useEffect(() => {
    if (graph === 'visjs' && previousGraph === 'neovisjs' && (filteredNodes.length > 0 || filteredEdges.length > 0)) {
      // Cleanup setelah data ter-filter
      const cleanupTimeout = setTimeout(() => {
        cleanupNavigationButtons();
      }, 100);

      return () => clearTimeout(cleanupTimeout);
    }
  }, [filteredNodes, filteredEdges, graph, previousGraph, cleanupNavigationButtons]);

  // Enhance MutationObserver untuk lebih agresif
  useEffect(() => {
    if (graph === 'visjs' && previousGraph === 'neovisjs') {
      const observer = new MutationObserver((mutations) => {
        let shouldCleanup = false;
        
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Check berbagai jenis elemen yang bisa jadi navigation button
              const tagName = element.tagName.toLowerCase();
              const isButton = tagName === 'button' || 
                            element.getAttribute('role') === 'button' ||
                            tagName === 'div' && element.tagName === 'pointer';
              
              if (isButton) {
                const text = element.textContent?.trim();
                const className = element.className;
                const id = element.id;
                
                // Deteksi navigation button patterns
                const isNavButton = ['→', '←', '↑', '↓', '+', '-', '⊕', '⊖'].some(symbol => text?.includes(symbol)) ||
                                  className.includes('nav') ||
                                  className.includes('control') ||
                                  className.includes('zoom') ||
                                  className.includes('pan') ||
                                  id.includes('nav') ||
                                  id.includes('control');
                
                if (isNavButton) {
                  const isPartOfMainUI = element.closest('.mantine-Card-root') || 
                                      element.closest('.mantine-Grid-col') ||
                                      element.closest('[data-mantine-component]');
                  
                  if (!isPartOfMainUI) {
                    shouldCleanup = true;
                  }
                }
              }
            }
          });
        });

        if (shouldCleanup) {
          // Delay cleanup sedikit untuk menghindari race condition
          setTimeout(() => {
            cleanupNavigationButtons();
          }, 50);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        attributeOldValue: false
      });

      return () => observer.disconnect();
    }
  }, [graph, previousGraph, cleanupNavigationButtons]);

  // Tambahkan cleanup pada setiap perubahan checkbox relasi
  const handleRelationChange = useCallback((relation: string, checked: boolean) => {
    if (checked) {
      setActiveRelations([...activeRelations, relation]);
    } else {
      setActiveRelations(activeRelations.filter(r => r !== relation));
    }
    
    // Cleanup buttons setelah relasi berubah jika sebelumnya menggunakan neovisjs
    if (graph === 'visjs' && previousGraph === 'neovisjs') {
      setTimeout(() => {
        cleanupNavigationButtons();
      }, 200);
    }
  }, [activeRelations, graph, previousGraph, cleanupNavigationButtons]);

  // Tambahkan cleanup saat MultiSelect artikel berubah
  const handleArticleSelectionChange = useCallback((selectedArticles: string[]) => {
    setActiveArticles(selectedArticles);
    setSelectedNode(null);
    
    // Cleanup buttons setelah artikel selection berubah
    if (graph === 'visjs' && previousGraph === 'neovisjs') {
      setTimeout(() => {
        cleanupNavigationButtons();
      }, 200);
    }
  }, [graph, previousGraph, cleanupNavigationButtons]);

  //PERBAIKAN: Fetch data function
  const fetchData = async () => {
    try {
      setIsLoadingData(true);
      const nodesRes = await fetch(`/api/nodes?sessionId=${sessionId}`);
      const edgesRes = await fetch(`/api/edges?sessionId=${sessionId}`);

      if (!nodesRes.ok || !edgesRes.ok){
        throw new Error('Failed to fetch data');
      }

      const nodesData = await nodesRes.json();
      const edgesData = await edgesRes.json();

      const mappedNodes = nodesData.map((node: any) =>({
        ...node,
        label: node.title || node.label || `Node ${node.id}`, // PERBAIKAN: Fallback label
      }))

      setNodes(mappedNodes);

      const mappedEdges = edgesData.map((edge: any) => ({
        id: edge.id,
        from: edge.fromId,
        to: edge.toId,
        label: edge.label,
        relation: edge.relation || 'unknown',
        arrows: 'to, from',
        color: { color: getRelationColor(edge.relation) || 'gray' },
        font: { color: 'black', background: 'white' },
      }));

      setEdges(mappedEdges);
    } catch (error) {
      console.error("Error Fetching Data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };
  
  //PERBAIKAN: Load session function
  const loadSession = async () => {
    if (!sessionId) return;
    
    try {
      setIsLoadingSession(true);
      const res = await fetch(`/api/brainstorming-sessions/${sessionId}`);
      const session = await res.json();

      setActiveArticles(session.selectedFilterArticles ?? []);
      setActiveRelations(session.graphFilters ?? [
        'background',
        'method',
        'gap',
        'future',
        'goal',
      ]);
    } catch (error) {
      console.error("Error loading session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  };

  //PERBAIKAN: Load data dan session secara paralel
  useEffect(() => {
    if (!sessionId) return;
    
    const initializeData = async () => {
      await Promise.all([
        fetchData(),
        loadSession()
      ]);
    };
    
    initializeData();
  }, [sessionId]);

  //PERBAIKAN: Debounced save untuk menghindari terlalu banyak request
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!sessionId || isLoadingSession || isLoadingData) return;
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/brainstorming-sessions/${sessionId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            selectedFilterArticles: activeArticles,
            graphFilters: activeRelations,
            lastSelectedNodeId: selectedNode?.id ?? null,
            lastSelectedEdgeId: selectedEdge?.id ?? null
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error("Error saving session:", error);
      }
    }, 500); // Debounce 500ms
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [activeArticles, activeRelations, selectedNode, selectedEdge, sessionId, isLoadingSession, isLoadingData]);

  const handleNodeClick = useCallback((node: ExtendedNode) => {
    setSelectedEdge(null);
    setSelectedNode(node);
    setDetailModalNode(node);
  }, []);

  const handleEdgeClick = useCallback((edge: ExtendedEdge) => {
    setSelectedNode(null);
    setSelectedEdge(edge);
    setDetailModalEdge(edge);
  }, []);

  const chatHistory = [
    { id: 1, title: 'Analisis Machine Learning', timestamp: '2 jam lalu', active: false },
    { id: 2, title: 'Penelitian Deep Learning', timestamp: '1 hari lalu', active: false },
    { id: 3, title: 'Computer Vision Study', timestamp: '3 hari lalu', active: true },
  ];

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUpLoading] = useState(false);

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };
  
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')){
      notifications.show({
        title: 'Format tidak didukung',
        message: 'Mohon upload file PDF',
        color: 'yellow',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('sessionId', sessionId as string);

    setUpLoading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok){
        const text = await res.text();
        throw new Error(`Upload failed: ${text}`);
      };

      let data: any = {};
      if (contentType?.includes("application/json")){
        data = await res.json();
        console.log('File uploaded:', data);
      }else{
        const text = await res.text();
        console.log('Unexpected response:', text);
      }

      notifications.show({
        title: 'Berhasil',
        message: `File "${file.name}" berhasil diunggah dan diproses`,
        color: 'green',
      });

      //PERBAIKAN: Refresh data setelah upload
      await fetchData();

    } catch (error: any) {
      notifications.show({
        title: 'Upload Gagal',
        message: error.message || 'Terjadi Kesalahan saat upload',
        color: 'red',
      });
      console.error('File upload error:', error);
    } finally{
      setUpLoading(false);
      e.target.value = ''
    }
  };

  //PERBAIKAN: Loading state yang lebih informatif
  if (!mounted || isLoadingSession || isLoadingData) {
    return (
      <DashboardLayout
        sidebarOpened={false}
        onToggleSidebar={() => {}}
        mounted={false}
        // chatHistory={chatHistory}
        // onChatSelect={handleChatSelect}
        // onNewChat={handleNewChat}
      >
        <Container fluid h="100%" p="xl">
          <Card shadow="sm" padding="xl" radius="lg" h="100%" withBorder>
            <Stack align="center" justify="center" h="100%">
              <Loader size="lg" />
              <Text size="lg" fw={500}>
                {isLoadingData && isLoadingSession 
                  ? 'Memuat data dan sesi...' 
                  : isLoadingData 
                    ? 'Memuat data artikel...' 
                    : 'Memuat pengaturan sesi...'}
              </Text>
              <Text size="sm" c="dimmed">
                Mohon tunggu sebentar
              </Text>
            </Stack>
          </Card>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebarOpened={sidebarOpened}
      onToggleSidebar={handleToggleSidebar}
      mounted={mounted}
    //   chatHistory={chatHistory}
    //   onChatSelect={handleChatSelect}
    //   onNewChat={handleNewChat}
    >
      <Container fluid h="100%" p="xl">
        <Grid gutter="xl" h="100%">
          {/* Network Visualization Panel */}
          <Grid.Col span={{ base: 12, lg: 6 }} h="100%">
            <Card 
              shadow="sm" 
              padding="lg" 
              radius="lg" 
              h="100%" 
              withBorder
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <Group justify="space-between" mb="lg">
                <Group gap="xs">
                  <ThemeIcon variant="light" color="blue" size="lg">
                    <IconCircleDot size={20} />
                  </ThemeIcon>
                  <Box>
                    <Text size="xl" fw={700}>Peta Konsep</Text>
                    <Text size="sm" c="dimmed">Visualisasi Artikel Penelitian</Text>
                  </Box>
                </Group>

                <Group gap="sm">
                  <input
                        ref={fileInputRef}
                        type="file"
                        style={{ display: 'none'}}
                        onChange={onFileChange}
                        accept="application/pdf"
                  />
                  <Button
                    variant="light"
                    color="green"
                    size="sm"
                    leftSection={<IconUpload size={16} />}
                    loading={uploading}
                    onClick={handleUploadFile}
                  >
                    Upload
                  </Button>
                  
                  <Button
                    variant="light"
                    color="blue"
                    size="sm"
                    leftSection={<IconEye size={16} />}
                    onClick={() => {
                      router.push(`/projects/${sessionId}/articles`)
                      console.log('Lihat artikel clicked');
                    }}
                  >
                    Lihat Artikel
                  </Button>
                  
                  <Badge variant="light" color="blue" size="lg">
                    {filteredNodes.length} Artikel
                  </Badge>
                </Group>
              </Group>

              <Stack gap="md" mb="lg">
                <MultiSelect
                  label={
                    <Group gap="xs" mb="xs">
                      <IconSearch size={16} />
                      <Text size="sm" fw={500}>Pilih Artikel</Text>
                    </Group>
                  }
                  placeholder="Cari dan pilih artikel untuk divisualisasikan..."
                  value={activeArticles}
                  onChange={
                    handleArticleSelectionChange
                    // setActiveArticles(e);
                    // setSelectedNode(null);
                  }
                  data={nodes.map((node) => ({
                    value: String(node.id) || '',
                    label: node.title || node.label || `Artikel ${node.id}`, // PERBAIKAN: Fallback yang lebih baik
                  }))}
                  searchable
                  clearable
                  radius="md"
                />

                <Box>
                  <Group gap="xs" mb="sm">
                    <IconFilter size={16} />
                    <Text size="sm" fw={500}>Jenis Relasi</Text>
                  </Group>
                  <Group gap="sm">
                    {Object.entries(relationColors).map(([relation, color]) => (
                      <Checkbox
                        key={relation}
                        value={relation}
                        color={color}
                        label={
                          <Group gap="xs">
                            <Badge variant="dot" color={color} size="sm">
                              {getRelationDisplayName(relation)}
                            </Badge>
                          </Group>
                        }
                        checked={activeRelations.includes(relation)}
                        onChange={(event) => 
                          handleRelationChange(relation, event.currentTarget.checked)
                          /*
                          if (event.currentTarget.checked) {
                            setActiveRelations([...activeRelations, relation]);
                          } else {
                            setActiveRelations(activeRelations.filter(r => r !== relation));
                          }
                            */
                           
                        }
                        styles={{
                          input: { cursor: 'pointer' },
                          label: { cursor: 'pointer' }
                        }}
                      />
                    ))}
                  </Group>
                </Box>
              </Stack>

              <Paper 
                shadow="sm" 
                radius="md" 
                withBorder
                style={{ 
                  flex: 1, 
                  minHeight: 400,
                  borderStyle: 'dashed',
                  borderWidth: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: dark 
                    ? theme.colors.dark[8] 
                    : theme.colors.gray[0]
                }}
              >
                {/* Dropdown di pojok kiri atas */}
                <Box style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                }}>
                <Box
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    zIndex: 10,
                    minWidth: 120
                  }}
                >
                  <Select
                    value={graph}
                    onChange={(value) => {
                      if (value) {
                        handleGraphTypeChange(value as 'visjs' | 'neovisjs');
                      }}
                    }
                    data={[
                      { value: 'visjs', label: 'Vis.js' },
                      { value: 'neovisjs', label: 'Neo4j' },
                    ]}
                    size="sm"
                    radius="md"
                    withCheckIcon={false}
                    styles={{
                      input: {
                        backgroundColor: dark ? theme.colors.dark[6] : 'white',
                        border: `1px solid ${dark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                        fontSize: theme.fontSizes.sm,
                      }
                    }}
                  />
                </Box>

                {/* Graph Container */}
                <Box style={{ width: '100%', height: '100%' }}>
                  {graph === 'visjs' ? (
                    <NetworkGraph
                      nodes={filteredNodes}
                      edges={filteredEdges}
                      onNodeClick={handleNodeClick}
                      onEdgeClick={handleEdgeClick}
                      // key={`visjs-${graphKey}-${filteredNodes.length}-${filteredEdges.length}`}
                      key ={`${fullPath}-visjs-${graphKey}`}
                    />
                  ) : <Neograph relationFilters={activeArticles} sessionId={sessionId!} onNodeClick={handleNodeClick} onEdgeClick={handleEdgeClick} key={`neograph-${graphKey}-${activeArticles.join(',')}`}/>
                  }
                </Box>
                </Box>
                {/* <NetworkGraph
                  nodes={filteredNodes}
                  edges={filteredEdges}
                  onNodeClick={handleNodeClick}
                  onEdgeClick={handleEdgeClick}
                /> */}
              </Paper>
            </Card>
          </Grid.Col>

          {/* Chat Panel */}
          <Grid.Col span={{ base: 12, lg: 6 }} h="100%">
            <Card 
              shadow="sm" 
              padding="lg" 
              radius="lg" 
              h="100%" 
              withBorder
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <Group justify="space-between" mb="lg">
                <Group gap="xs">
                  <ThemeIcon variant="light" color="blue" size="lg">
                    <IconBrandHipchat size={20} />
                  </ThemeIcon>
                  <Box>
                    <Text size="xl" fw={700}>AI Assistant</Text>
                    <Text size="sm" c="dimmed">Diskusi dan Analisis Artikel</Text>
                  </Box>
                </Group>
                {(selectedNode || selectedEdge) && (
                  <Badge 
                    variant="gradient" 
                    gradient={{ from: 'green', to: 'lime', deg: 45 }}
                    size="lg"
                    rightSection={<IconChevronRight size={12} />}
                  >
                    {selectedNode ? 'Node Terpilih' : 'Edge Terpilih'}
                  </Badge>
                )}
              </Group>

              <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <ChatPanel selectedNode={selectedNode} selectedEdge={selectedEdge} sessionId={sessionId}/>
              </Box>
            </Card>
          </Grid.Col>
        </Grid>
      </Container>

      {/* Enhanced Modals */}
      <Modal
        opened={!!detailModalNode}
        onClose={() => {
          setDetailModalNode(null);
          if (edgeDetailReturn){
            setDetailModalEdge(edgeDetailReturn);
            setEdgeDetailReturn(null);
          }
        }}
        title={
          <Group gap="sm">
            <ThemeIcon variant="light" color="blue" size="md">
              <IconCircleDot size={16} />
            </ThemeIcon>
            <Box>
              <Text fw={600}>{detailModalNode?.title || 'Detail Artikel'}</Text>
              <Text size="xs" c="dimmed">Informasi lengkap artikel</Text>
            </Box>
          </Group>
        }
        size="75vw"
        radius="lg"
        shadow="xl"
      >
        <NodeDetail node={detailModalNode} onClose={() => {
          setDetailModalNode(null);
          if (edgeDetailReturn){
            setDetailModalEdge(edgeDetailReturn);
            setEdgeDetailReturn(null);
          }
        }} />
      </Modal>

      <Modal
        opened={!!detailModalEdge}
        onClose={() => setDetailModalEdge(null)}
        title={
          <Group gap="sm">
            <ThemeIcon variant="light" color="orange" size="md">
              <IconNetwork size={16} />
            </ThemeIcon>
            <Box>
              <Text fw={600}>Relasi: {getRelationDisplayName(getDisplayRelationKey(detailModalEdge?.relation ?? ''))}</Text>
              <Text size="xs" c="dimmed">Detail hubungan antar artikel</Text>
            </Box>
          </Group>
        }
        size="lg"
        radius="lg"
        shadow="xl"
      >
        <EdgeDetail edge={detailModalEdge} onClose={() => setDetailModalEdge(null)} onOpenNodeDetail={(nodeId) => {
          const node = nodes.find((n) => n.id === nodeId);
          setDetailModalNode(node ?? null);
          setEdgeDetailReturn(detailModalEdge);
          setDetailModalEdge(null);
        }} />
      </Modal>
      
      {uploading && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            background: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)',
            zIndex: 9999,
          }}
        >
          <Group>
            <Loader size="sm" />
            <Text size="sm">Mengunggah file...</Text>
          </Group>
        </div>
      )}
    </DashboardLayout>
  );
}