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
  TextInput,
  Textarea,
  Tabs,
  TabsList,
  TabsTab,
  ScrollArea,
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
  IconChevronLeft,
  IconMessage,
  IconHighlight,
  IconList,
  IconChartDots2,
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
import AnnotationPanel from '@/components/AnnotationPanel';
import ArticleDetailTable from '@/components/ArticleDetailTable';
import { Cite } from '@citation-js/core';
import '@citation-js/plugin-ris';

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
  const [uploadModalOpened, setUploadModalOpened] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    author: '',
    year: '',
    abstract: '',
    keywords: '',
    doi: '',
    // category: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  //for tab
  const [activeTab, setActiveTab] = useState<'chat' | 'annotation'>('chat');

  //for graph
  const [viewMode, setViewMode] = useState<'graph' | 'detail'>('graph');

  //for reset
  const [resetChatContext, setResetChatContext] = useState(false);

  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUpLoading] = useState(false);

  //for ris
  const [uploadMode, setUploadMode ] = useState<'choose' | 'with-ris' | 'direct'>('choose');
  const [risFile, setRisFile] = useState<File | null>(null);
  const [isProcessingRis, setIsProcessingRis] = useState(false);
  const risFileInputRef = useRef<HTMLInputElement | null>(null);

  const parseRisFile = async (risContent: string) => {
  try {
    // Menggunakan citation-js untuk parsing RIS
    const cite = new Cite(risContent);
    
    // Try getting data without format options first
    let jsonData = cite.format('data');
    
    // If it's a string, try parsing it
    if (typeof jsonData === 'string') {
      jsonData = JSON.parse(jsonData);
    }
    
    // Ensure it's an array
    const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
    const data = dataArray[0];
    
    if (!data) {
      throw new Error('Tidak dapat mem-parse file RIS');
    }


    // Mapping dari format citation-js ke format yang dibutuhkan
    const parsedData = {
      title: data.title || '',
      author: data.author ? 
        data.author.map((author: any) => 
          `${author.given || ''} ${author.family || ''}`.trim()
        ).join(', ') : '',
      year: data.issued ? 
        data.issued['date-parts']?.[0]?.[0]?.toString() || '' : '',
      abstract: data.abstract || '',
      keywords: data.keyword ? 
        (Array.isArray(data.keyword) ? 
          data.keyword.join(', ') : 
          data.keyword) : '',
      doi: data.DOI || '',
    };

    return parsedData;
  } catch (error) {
    console.error('Error parsing RIS with citation-js:', error);
    // Fallback ke parsing manual jika citation-js gagal
    return parseRisFileManual(risContent);
  }
};

  const parseRisFileManual = (risContent: string) => {
    const lines = risContent.split('\n');
    const parsedData: any = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('TI - ')){
        parsedData.title = trimmed.substring(6);
      } else if (trimmed.startsWith('AU - ')){
        if (!parsedData.author) parsedData.author = trimmed.substring(6);
        else parsedData.author += `, ${trimmed.substring(6)}`;
      } else if (trimmed.startsWith('PY - ')){
        parsedData.year = trimmed.substring(6);
      } else if (trimmed.startsWith('AB - ')){
        parsedData.abstract = trimmed.substring(6);
      } else if (trimmed.startsWith('KW - ')){
        if (!parsedData.keywords) parsedData.keywords = trimmed.substring(6);
        else parsedData.keywords += `, ${trimmed.substring(6)}`;
      } else if (trimmed.startsWith('DO - ')){
        parsedData.doi = trimmed.substring(6);
      } else if (trimmed.startsWith('T2 - ') || trimmed.startsWith('JO - ')){
        parsedData.journal = trimmed.substring(6);
      }
    }

    return parsedData;
  };

  // Function untuk handle RIS file upload
  const onRisFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.ris')) {
      notifications.show({
        title: 'Format tidak didukung',
        message: 'Mohon upload file RIS',
        color: 'yellow',
        position: 'top-right',
      });
      return;
    }

    setRisFile(file);
    setIsProcessingRis(true);

    try {
      const content = await file.text();
      const parsedData = await parseRisFile(content);
      
      // Auto-fill form dengan data dari RIS
      setUploadForm({
        title: parsedData.title || '',
        author: parsedData.author || '',
        year: parsedData.year || '',
        abstract: parsedData.abstract || '',
        keywords: parsedData.keywords || '',
        doi: parsedData.doi || '',
        // category: ''
      });

      notifications.show({
        title: 'RIS berhasil diproses',
        message: 'Data artikel telah diisi otomatis',
        color: 'green',
        position: 'top-right',
      });
    } catch (error) {
      notifications.show({
        title: 'Error parsing RIS',
        message: 'Gagal memproses file RIS',
        color: 'red',
        position: 'top-right',
      });
    } finally {
      setIsProcessingRis(false);
      e.target.value = '';
    }
  };

  // Function untuk handle direct PDF upload
  const handleDirectPdfUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', selectedFile.name);
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

      notifications.show({
        title: 'Berhasil',
        message: `File "${selectedFile.name}" berhasil diunggah`,
        color: 'green',
        position: 'top-right',
      });

      // Reset dan tutup modal
      handleModalClose();
      await fetchData();

    } catch (error: any) {
      notifications.show({
        title: 'Upload Gagal',
        message: error.message || 'Terjadi kesalahan saat upload',
        color: 'red',
        position: 'top-right',
      });
    } finally {
      setUpLoading(false);
    }
  };

  // Enhanced modal close handler
  const handleModalClose = () => {
    setUploadModalOpened(false);
    setSelectedFile(null);
    setRisFile(null);
    setUploadMode('choose');
    setUploadForm({
      title: '',
      author: '',
      year: '',
      abstract: '',
      keywords: '',
      doi: '',
      // category: ''
    });
  };


  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
  if (activeTab !== 'chat') {
    // Reset context saat pindah dari chat ke tab lain
    setResetChatContext(true)
  }
}, [activeTab]);

  const handleContextReset = () => {
    setResetChatContext(false);
  }

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

  const handleUploadFile = () => {
    // fileInputRef.current?.click();
    setUploadModalOpened(true);
  };
  
  //THE USUALLLLLL
  /*
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')){
      notifications.show({
        title: 'Format tidak didukung',
        message: 'Mohon upload file PDF',
        color: 'yellow',
        position: 'top-right',
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
        position: 'top-right',
      });

      //PERBAIKAN: Refresh data setelah upload
      await fetchData();

    } catch (error: any) {
      notifications.show({
        title: 'Upload Gagal',
        message: error.message || 'Terjadi Kesalahan saat upload',
        color: 'red',
        position: 'top-right',
      });
      console.error('File upload error:', error);
    } finally{
      setUpLoading(false);
      e.target.value = ''
    }
  };
  */

  const onFileChangeInModal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')){
      notifications.show({
        title: 'Format tidak didukung',
        message: 'Mohon upload file PDF',
        color: 'yellow',
        position: 'top-right',
      });
      return;
    }

    // Set file dan auto-fill title jika kosong
    setSelectedFile(file);
    if (!uploadForm.title) {
      setUploadForm({
        ...uploadForm,
        title: file.name.replace('.pdf', '')
      });
    }
    
    // Clear input
    e.target.value = '';
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    // TETAP KIRIM DATA SEPERTI KODE LAMA (hanya file, title, sessionId)
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', selectedFile.name); // Gunakan nama file, bukan form title
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
        message: `File "${selectedFile.name}" berhasil diunggah dan diproses`,
        color: 'green',
        position: 'top-right',
      });

      // Reset form dan tutup modal
      setUploadModalOpened(false);
      setSelectedFile(null);
      setUploadForm({
        title: '',
        author: '',
        year: '',
        abstract: '',
        keywords: '',
        doi: '',
        // category: ''
      });

      // Refresh data setelah upload
      await fetchData();

    } catch (error: any) {
      notifications.show({
        title: 'Upload Gagal',
        message: error.message || 'Terjadi Kesalahan saat upload',
        color: 'red',
        position: 'top-right',
      });
      console.error('File upload error:', error);
    } finally{
      setUpLoading(false);
    }
  };

  // const handleModalClose = () => {
  //   setUploadModalOpened(false);
  //   setSelectedFile(null);
  //   setUploadForm({
  //     title: '',
  //     author: '',
  //     year: '',
  //     abstract: '',
  //     keywords: '',
  //     doi: '',
  //     category: ''
  //   });
  // };  

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
                  {/* <input
                        ref={fileInputRef}
                        type="file"
                        style={{ display: 'none'}}
                        onChange={onFileChange}
                        accept="application/pdf"
                  /> */}
                   {/* Dropdown View Mode */}
                  <Select
                    value={viewMode}
                    onChange={(value) => setViewMode(value as 'graph' | 'detail')}
                    data={[
                      { 
                        value: 'graph', 
                        label: 'Graph',
                        // leftSection: <IconChartDots2 size={16} />
                      },
                      { 
                        value: 'detail', 
                        label: 'Detail',
                        // leftSection: <IconList size={16} />
                      },
                    ]}
                    size="sm"
                    radius="md"
                    withCheckIcon={false}
                    w={120}
                    styles={{
                      input: {
                        backgroundColor: dark ? theme.colors.dark[6] : 'white',
                        border: `1px solid ${dark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                        fontSize: theme.fontSizes.sm,
                        fontWeight: 500
                      },
                      section: {
                        pointerEvents: 'none'
                      }
                    }}
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

                {viewMode === 'graph' && (
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
                )}

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
                {viewMode === 'graph' ? (
                  
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
                  /* <NetworkGraph
                    nodes={filteredNodes}
                    edges={filteredEdges}
                    onNodeClick={handleNodeClick}
                    onEdgeClick={handleEdgeClick}
                  /> */
                ) : (
                  <Box style={{ width: '100%', height: '100%', padding: '16px' }}>
                    <ScrollArea style={{ height: '100%' }}>
                      <ArticleDetailTable 
                        nodes={nodes}
                        activeArticles={activeArticles}
                      />
                    </ScrollArea>
                  </Box>
                )}
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
              {/* Header Section dengan Tab Switcher */}
              <Stack gap="sm" mb="sm">
                {/* Tab Switcher - Circular Design */}
                <Group justify="center" mb="sm">
                  <Group 
                    gap={0} 
                    style={{ 
                      padding: '0px',
                      backgroundColor: dark ? theme.colors.dark[6] : theme.colors.gray[1],
                      borderRadius: '50px',
                      border: `1px solid ${dark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <ActionIcon
                      variant={activeTab === 'chat' ? 'filled' : 'transparent'}
                      color={activeTab === 'chat' ? 'blue' : 'gray'}
                      size={34}
                      radius="xl"
                      onClick={() => setActiveTab('chat')}
                      style={{
                        transition: 'all 0.2s ease',
                        transform: activeTab === 'chat' ? 'scale(1.05)' : 'scale(1)',
                        boxShadow: activeTab === 'chat' ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none'
                      }}
                    >
                      <IconMessage size={20} />
                    </ActionIcon>
                    
                    <ActionIcon
                      variant={activeTab === 'annotation' ? 'filled' : 'transparent'}
                      color={activeTab === 'annotation' ? 'orange' : 'gray'}
                      size={34}
                      radius="xl"
                      onClick={() => setActiveTab('annotation')}
                      style={{
                        transition: 'all 0.2s ease',
                        transform: activeTab === 'annotation' ? 'scale(1.05)' : 'scale(1)',
                        boxShadow: activeTab === 'annotation' ? '0 2px 8px rgba(255, 165, 0, 0.3)' : 'none'
                      }}
                    >
                      <IconHighlight size={20} />
                    </ActionIcon>
                  </Group>
                </Group>

                {/* Dynamic Title & Description - Hanya untuk Chat */}
                {activeTab === 'chat' && (
                  <Group justify="space-between" align="flex-start">
                    <Group gap="xs">
                      <ThemeIcon 
                        variant="light" 
                        color="blue" 
                        size="lg"
                        style={{
                          transition: 'all 0.3s ease',
                          transform: 'scale(1.1)'
                        }}
                      >
                        <IconBrandHipchat size={20} />
                      </ThemeIcon>
                      <Box>
                        <Text 
                          size="xl" 
                          fw={700}
                          style={{
                            backgroundImage: 'linear-gradient(45deg, #3B82F6, #1E40AF)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          AI Assistant
                        </Text>
                        <Text size="sm" c="dimmed">
                          Diskusi dan Analisis Artikel
                        </Text>
                      </Box>
                    </Group>
                    
                    {/* Status Badge */}
                    {(selectedNode || selectedEdge) && (
                      <Badge 
                        variant="gradient" 
                        gradient={{ from: 'blue', to: 'cyan', deg: 45 }}
                        size="lg"
                        rightSection={<IconChevronRight size={12} />}
                        style={{
                          animation: 'pulse 2s infinite'
                        }}
                      >
                        {selectedNode ? 'Node Terpilih' : 'Edge Terpilih'}
                      </Badge>
                    )}
                  </Group>
                )}

                {/* Animated Divider - Hanya untuk Chat */}
                {activeTab === 'chat' && (
                  <Box
                    style={{
                      height: '2px',
                      backgroundImage: 'linear-gradient(90deg, transparent, #3B82F6, transparent)',
                      borderRadius: '1px',
                      transition: 'all 0.3s ease'
                    }}
                  />
                )}
              </Stack>

              {/* Content Area dengan Animasi */}
              <Box 
                style={{ 
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0 // Penting untuk flex container
                }}
              > 
                {activeTab === 'chat' ? (
                  <Box>
                    <ChatPanel 
                      selectedNode={selectedNode} 
                      selectedEdge={selectedEdge} 
                      sessionId={sessionId}
                      resetContext={resetChatContext}
                      onContextReset={handleContextReset}
                    />
                  </Box>
                ) : (
                  <Box>
                    <AnnotationPanel sessionId={sessionId} />
                  </Box>
                )}
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
      
      {/* {uploading && (
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
      )} */}
      {uploading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              textAlign: 'center',
            }}
          >
            <Stack align="center" gap="md">
              <Loader size="lg" />
              <Text size="lg" fw={500}>Mengunggah file...</Text>
              <Text size="sm" c="dimmed">Mohon tunggu sebentar</Text>
            </Stack>
          </div>
        </div>
      )}
      {/* Upload Modal */}
      {/* <Modal
        opened={uploadModalOpened}
        onClose={handleModalClose}
        title="Upload Artikel PDF"
        size="lg"
        centered
      >
        <Stack gap="md">
          <div>
            <input
              type="file"
              style={{ display: 'none'}}
              ref={fileInputRef}
              onChange={onFileChangeInModal}
              accept="application/pdf"
            />
            <Button
              variant="light"
              color="blue"
              leftSection={<IconUpload size={16} />}
              onClick={() => fileInputRef.current?.click()}
              fullWidth
            >
              {selectedFile ? `File: ${selectedFile.name}` : 'Pilih File PDF'}
            </Button>
          </div>
          <TextInput
            label="Judul Artikel"
            placeholder="Masukkan judul artikel"
            value={uploadForm.title}
            onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
            required
          />
          
          <TextInput
            label="Penulis"
            placeholder="Masukkan nama penulis"
            value={uploadForm.author}
            onChange={(e) => setUploadForm({...uploadForm, author: e.target.value})}
            required
          />
          
          <TextInput
            label="Tahun"
            placeholder="Masukkan tahun publikasi"
            value={uploadForm.year}
            onChange={(e) => setUploadForm({...uploadForm, year: e.target.value})}
            required
          />
          
          <Textarea
            label="Abstrak"
            placeholder="Masukkan abstrak artikel"
            value={uploadForm.abstract}
            onChange={(e) => setUploadForm({...uploadForm, abstract: e.target.value})}
            minRows={4}
            required
          />
          
          <TextInput
            label="Kata Kunci"
            placeholder="Masukkan kata kunci (pisahkan dengan koma)"
            value={uploadForm.keywords}
            onChange={(e) => setUploadForm({...uploadForm, keywords: e.target.value})}
          />
          
          <TextInput
            label="DOI"
            placeholder="Masukkan DOI artikel"
            value={uploadForm.doi}
            onChange={(e) => setUploadForm({...uploadForm, doi: e.target.value})}
          />
          
          <Select
            label="Kategori"
            placeholder="Pilih kategori artikel"
            value={uploadForm.category}
            onChange={(value) => setUploadForm({...uploadForm, category: value || ''})}
            data={[
              { value: 'research', label: 'Penelitian' },
              { value: 'review', label: 'Review' },
              { value: 'case-study', label: 'Studi Kasus' },
              { value: 'theory', label: 'Teori' },
              { value: 'methodology', label: 'Metodologi' }
            ]}
          />
          
          {selectedFile && (
            <Text size="sm" c="dimmed">
              File: {selectedFile.name}
            </Text>
          )}
          
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={handleModalClose}>
              Batal
            </Button>
            <Button 
              onClick={handleUploadSubmit} 
              loading={uploading}
              disabled={!selectedFile}
            >
              Upload
            </Button>
            </Group>
        </Stack>
      </Modal> */}

      {/* // Enhanced Upload Modal JSX */}
      <Modal
        opened={uploadModalOpened}
        onClose={handleModalClose}
        title="Upload Artikel PDF"
        size="lg"
        centered
      >
        {uploadMode === 'choose' && (
          <Stack gap="lg" align="center">
            <Text size="lg" fw={500} ta="center">
              Pilih cara upload artikel
            </Text>
            
            <Group gap="md" grow>
              <Card
                withBorder
                padding="xl"
                radius="md"
                style={{ cursor: 'pointer' }}
                onClick={() => setUploadMode('with-ris')}
              >
                <Stack align="center" gap="sm">
                  <ThemeIcon size="xl" variant="light" color="blue">
                    <IconUpload size={24} />
                  </ThemeIcon>
                  <Text fw={500}>Upload dengan RIS</Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Upload file RIS terlebih dahulu untuk mengisi metadata secara otomatis
                  </Text>
                </Stack>
              </Card>
              
              <Card
                withBorder
                padding="xl"
                radius="md"
                style={{ cursor: 'pointer' }}
                onClick={() => setUploadMode('direct')}
              >
                <Stack align="center" gap="sm">
                  <ThemeIcon size="xl" variant="light" color="green">
                    <IconUpload size={24} />
                  </ThemeIcon>
                  <Text fw={500}>Upload Langsung</Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Upload PDF langsung tanpa mengisi metadata
                  </Text>
                </Stack>
              </Card>
            </Group>
            
            <Button variant="light" onClick={handleModalClose}>
              Batal
            </Button>
          </Stack>
        )}
        
        {uploadMode === 'with-ris' && (
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Text size="lg" fw={500}>Upload dengan RIS</Text>
              <ActionIcon variant="subtle" onClick={() => setUploadMode('choose')}>
                <IconChevronLeft size={16} />
              </ActionIcon>
            </Group>
            
            {/* RIS File Upload */}
            <div>
              <input
                type="file"
                style={{ display: 'none'}}
                ref={risFileInputRef}
                onChange={onRisFileChange}
                accept=".ris"
              />
              <Button
                variant="light"
                color="blue"
                leftSection={<IconUpload size={16} />}
                onClick={() => risFileInputRef.current?.click()}
                fullWidth
                loading={isProcessingRis}
              >
                {risFile ? `RIS: ${risFile.name}` : 'Pilih File RIS'}
              </Button>
            </div>
            
            {/* PDF File Upload */}
            <div>
              <input
                type="file"
                style={{ display: 'none'}}
                ref={fileInputRef}
                onChange={onFileChangeInModal}
                accept="application/pdf"
              />
              <Button
                variant="light"
                color="green"
                leftSection={<IconUpload size={16} />}
                onClick={() => fileInputRef.current?.click()}
                fullWidth
              >
                {selectedFile ? `PDF: ${selectedFile.name}` : 'Pilih File PDF'}
              </Button>
            </div>
            
            {/* Form Fields */}
            <TextInput
              label="Judul Artikel"
              placeholder="Masukkan judul artikel"
              value={uploadForm.title}
              onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
              required
            />
            
            <TextInput
              label="Penulis"
              placeholder="Masukkan nama penulis"
              value={uploadForm.author}
              onChange={(e) => setUploadForm({...uploadForm, author: e.target.value})}
              required
            />
            
            <TextInput
              label="Tahun"
              placeholder="Masukkan tahun publikasi"
              value={uploadForm.year}
              onChange={(e) => setUploadForm({...uploadForm, year: e.target.value})}
              required
            />
            
            <Textarea
              label="Abstrak"
              placeholder="Masukkan abstrak artikel"
              value={uploadForm.abstract}
              onChange={(e) => setUploadForm({...uploadForm, abstract: e.target.value})}
              minRows={4}
              required
            />
            
            <TextInput
              label="Kata Kunci"
              placeholder="Masukkan kata kunci (pisahkan dengan koma)"
              value={uploadForm.keywords}
              onChange={(e) => setUploadForm({...uploadForm, keywords: e.target.value})}
            />
            
            <TextInput
              label="DOI"
              placeholder="Masukkan DOI artikel"
              value={uploadForm.doi}
              onChange={(e) => setUploadForm({...uploadForm, doi: e.target.value})}
            />
            
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setUploadMode('choose')}>
                Kembali
              </Button>
              <Button 
                onClick={handleUploadSubmit} 
                loading={uploading}
                disabled={!selectedFile}
              >
                Upload
              </Button>
            </Group>
          </Stack>
        )}
        
        {uploadMode === 'direct' && (
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Text size="lg" fw={500}>Upload Langsung</Text>
              <ActionIcon variant="subtle" onClick={() => setUploadMode('choose')}>
                <IconChevronLeft size={16} />
              </ActionIcon>
            </Group>
            
            <div>
              <input
                type="file"
                style={{ display: 'none'}}
                ref={fileInputRef}
                onChange={onFileChangeInModal}
                accept="application/pdf"
              />
              <Button
                variant="light"
                color="green"
                leftSection={<IconUpload size={16} />}
                onClick={() => fileInputRef.current?.click()}
                fullWidth
              >
                {selectedFile ? `File: ${selectedFile.name}` : 'Pilih File PDF'}
              </Button>
            </div>
            
            {selectedFile && (
              <Text size="sm" c="dimmed">
                File: {selectedFile.name}
              </Text>
            )}
            
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setUploadMode('choose')}>
                Kembali
              </Button>
              <Button 
                onClick={handleDirectPdfUpload} 
                loading={uploading}
                disabled={!selectedFile}
              >
                Upload Langsung
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </DashboardLayout>
  );
}