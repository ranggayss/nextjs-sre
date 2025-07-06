// src/components/ChatPanel.tsx
'use client';

import {
  Box,
  Text,
  Textarea,
  Button,
  ScrollArea,
  Paper,
  Group,
  ActionIcon,
  Stack,
  TypographyStylesProvider,
  useMantineColorScheme,
  useMantineTheme,
  Loader,
  Switch,
  Tooltip,
  Anchor,
  Popover,
} from '@mantine/core';
import { IconX, IconUpload, IconDots, IconSearch, IconWorld } from '@tabler/icons-react';
import React, { useEffect, useState, useRef } from 'react';
import { ExtendedNode, ExtendedEdge } from '../types';
import { notifications } from '@mantine/notifications';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SuggestionPanel } from './SuggestionPanel';
import { useDebouncedValue } from '@mantine/hooks';

interface ChatPanelProps {
  sessionId?: string;
  selectedNode: ExtendedNode | null;
  selectedEdge: ExtendedEdge | null;
};

type Reference = {
  url: string;
  text: string;
  preview: string;
  ref_mark: string;
  type?: string;
  index?: number;
}

type ChatMessage = {
  sender: 'user' | 'ai';
  text: string;
  contextNodeIds?: string[];
  contextEdgeIds?: string[];
  references?: Reference[];
};

export default function ChatPanel({ selectedNode, selectedEdge, sessionId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [contextNodes, setContextNodes] = useState<ExtendedNode[]>([]);
  const [contextEdges, setContextEdges] = useState<ExtendedEdge[]>([]);
  const [uploading, setUpLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const isDark = colorScheme === 'dark';

  //state for suggestion
  const [suggestions, setSuggestions] = useState<string []>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionContext, setSuggestionContext] = useState<'input' | 'response' | null>(null);
  const [debouncedInput] = useDebouncedValue(input, 500);

  //for forceWeb
  const [forceWeb, setForceWeb] = useState(false);

  useEffect(() => {
    const fetchChatMessages = async () => {
      try {        
        const res = await fetch(`/api/chat?sessionId=${sessionId}`);
        const data = await res.json();
  
        const formatted = data.map((msg: any) => ({
          sender: msg.role === 'assistant' ? 'ai' : 'user',
          text: msg.content,
          contextNodeIds: msg.contextNodeIds || [],
          contextEdgeIds: msg.contextEdgeIds || [],
          references: msg.references || [],
        }));
  
        setMessages(formatted);
      } catch (error) {
        console.error('Gagal memuat chat:', error);
      }
    };

    fetchChatMessages();
  }, [sessionId]);

  useEffect(() => {
  if (selectedNode) {
    addContextNode(selectedNode);
  }
 }, [selectedNode]);

 useEffect(() => {
  const scrollToBottom = () => {
    if (scrollAreaRef.current){
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 100);
      }
    }

    if (messageEndRef.current) {
      setTimeout(() => {
        messageEndRef.current?.scrollIntoView({
          behavior: 'smooth',
        });
      }, 150);
    }
  };

  scrollToBottom();
 }, [messages, isLoading]);

 
  const fetchInputSuggestion = async (query: string) => {
    if (!query.trim() || query.length < 3){
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch ('/api/suggestions/input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          context: {
            nodeIds: contextNodes.map(n => n.id),
            edgeIds: contextEdges.map(e => e.id),
          },
          suggestion_type: "input"
        }),
      });

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setSuggestionContext('input');
      setShowSuggestions(true);
    } catch (error) {
      console.error('failed to fetch input suggestions:', error);
      setSuggestions([]);
    }
  };

  const fetchInitialSuggestions = async () => {
    let mode: 'general' | 'single node' | 'multiple node' = 'general';

    if (contextNodes.length === 1) mode = 'single node';
    else if (contextNodes.length > 1) mode = 'multiple node';

    try {
      const res = await fetch('/api/suggestions/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: "",
          context: {
            nodeIds: contextNodes.map(n => n.id),
            edgeIds: contextEdges.map(e => e.id),
          },
          suggestion_type: "input", // tetap gunakan input
          mode
        })
      });

      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
      setSuggestionContext('input');
    } catch (err) {
      console.error('Failed to fetch initial suggestions:', err);
    }
  };

  useEffect(() => {
    fetchInitialSuggestions();
  }, [contextNodes.length, contextEdges.length]);

  
  const fetchFollowupSuggestions = async (lastMessage: string) => {
    try {

      const res = await fetch ('/api/suggestions/followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lastMessage: lastMessage,
          conversationHistory: messages.slice(-1),
          context: {
            nodeIds: contextNodes.map(n => n.id),
            edgeIds: contextEdges.map(e => e.id),
          }
        }),
      });

      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setSuggestionContext('response');
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to fetch followup suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };


  // useEffect(() => {
  //   if (debouncedInput.length > 0){
  //     setSuggestions([]);
  //     setShowSuggestions(false);
  //   } 
  // }, [debouncedInput]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    setSuggestions([]);
    setShowSuggestions(false);
    setSuggestionContext(null);

    setMessages((prev) => [...prev, {sender: 'user', text: input}]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }, 50);

    let payloadd = {};

    if (contextNodes.length === 0){
      payloadd = {
        sessionId,
        question: currentInput,
        contextNodeIds: contextNodes.map((n) => n.id),
        contextEdgeIds: contextEdges.map((e) => e.id),
        forceWeb,
        mode: 'general',
      };
    } else if (contextNodes.length === 1){
      payloadd = {
        sessionId,
        question: currentInput,
        contextNodeIds: contextNodes.map((n) => n.id),
        contextEdgeIds: contextEdges.map((e) => e.id),
        forceWeb,
        mode: 'single node',
        nodeId: contextNodes[0].id,
      };
    } else{
      payloadd = {
        sessionId,
        question: currentInput,
        contextNodeIds: contextNodes.map((n) => n.id),
        contextEdgeIds: contextEdges.map((e) => e.id),
        forceWeb,
        mode: 'multiple node',
        nodeIds: contextNodes.map((n) => n.id), //[1, 2]
      }
    };

    try {
      const result = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payloadd),
      });

      const data = await result.json();

      // Debug log untuk melihat struktur response
      // Enhanced debug logging
      console.log('🔍 Full API Response:', JSON.stringify(data, null, 2));
      console.log('🔍 Raw References:', data.references);
      console.log('🔍 References type:', typeof data.references);
      console.log('🔍 References length:', data.references?.length);

      // More robust reference processing
      let processedReferences: Reference[] = [];
      if (data.references && Array.isArray(data.references)) {
        processedReferences = data.references.map((ref: any, idx: number) => {
          console.log(`🔍 Processing reference ${idx}:`, ref);
          
          // Handle different possible API response structures
          const processedRef = {
            url: ref.url || ref.source_url || ref.link || '#',
            text: ref.text || ref.title || ref.document_preview || `Reference ${idx + 1}`,
            preview: ref.preview || ref.document_preview || ref.text || 'No preview available',
            ref_mark: ref.ref_mark || `[${idx + 1}]`,
            type: ref.type || 'document',
            index: idx + 1
          };
          
          console.log(`🔍 Processed reference ${idx}:`, processedRef);
          return processedRef;
        });
      }

      console.log('🔍 Final processed references:', processedReferences);

      setMessages((m) => [...m, {sender: 'ai', text: data.answer, references: processedReferences || []}]);

      setTimeout(async () => {
        await fetchFollowupSuggestions(data.answer);
      }, 500);

    } catch (error) {
      setMessages((m) => [...m, {sender: 'ai', text: 'terjadi kesalahan dalam menjawab pertanyaan'}]);
    } finally{
      setIsLoading(false);
    }
    
  };

  const addContextNode = (node: ExtendedNode) => {
    if (!contextNodes.find((n) => n.id === node.id)) {
      setContextNodes((prev) => [...prev, node]);
    }
  };

  const removeContextNode = (node: ExtendedNode) => {
    setContextNodes((prev) => prev.filter((n) => n.id !== node.id));
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

      console.log('File Uploaded:', data);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'enter' && !e.shiftKey){
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);

    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      textarea?.focus();
    }, 100);
  };

  const handleCloseSuggestions = () => {
    setShowSuggestions(false);
    setSuggestions([]);
    setSuggestionContext(null);
  };


  //cleanup
  useEffect(() => {
    return () => {
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestionContext(null);
    }
  }, [])
 
  const LoadingMessage = () => {
    return(
    <Paper
     shadow='xs'
     radius='md'
     withBorder
     style={{
      alignSelf: 'flex-start',
      backgroundColor: isDark ? theme.colors.dark[6] : '#f3f4f6',
      color: isDark ? theme.colors.gray[2] : theme.black,
      maxWidth: '100%',
      padding: '20px',
     }}
     >
      <Text size='md' c='dimmed' mb='xs'>
        AI
      </Text>
      <Group gap='xs' align='center'>
        <Loader size='sm'/>
        <Text size='sm' c='dimmed'>
          Sedang mengetik
        </Text>
      </Group>
     </Paper>
    )
  }

const ReferenceTooltip = ({ reference, order }: { reference: Reference, order: number }) => {
  const [opened, setOpened] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setOpened(true), 100);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpened(false), 1000);
  };

  const handlePopoverMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handlePopoverMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpened(false), 1000);
  };

  return (
    <Popover 
      width={350}
      position="bottom"
      withArrow
      shadow="md"
      offset={5}
      withinPortal
      opened={opened}
      onClose={() => setOpened(false)}
      transitionProps={{ duration: 200 }}
    >
      <Popover.Target>
        <Anchor
          href={reference.url}
          target="_blank"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            color: theme.colors.blue[6],
            textDecoration: 'underline',
            cursor: 'pointer',
            backgroundColor: theme.colors.blue[0],
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.8rem',
            fontWeight: 500,
            display: 'inline-block',
            marginLeft: '2px',
            marginRight: '2px',
          }}
        >
          {reference.ref_mark}
        </Anchor>
      </Popover.Target>
      <Popover.Dropdown
        onMouseEnter={handlePopoverMouseEnter}
        onMouseLeave={handlePopoverMouseLeave}
      >
        <Box p="sm" style={{ maxWidth: 320 }}>
          <Text size="sm" fw={500} mb={4}>
            Referensi {order}
          </Text>
          <Box
            mt={4}
            style={{
              fontSize: '0.75rem',
              wordBreak: 'break-word',
              lineHeight: 1.4,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              color: 'inherit',
              marginBottom: '8px'
            }}
          >
            {reference.preview}
          </Box>
          <Anchor
            href={reference.url}
            target="_blank"
            size="xs"
            style={{
              wordBreak: 'break-all',
              color: '#228be6',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(34, 139, 230, 0.1)',
              display: 'inline-block',
              border: '1px solid rgba(34, 139, 230, 0.3)',
            }}
          >
            🔗 Buka Dokumen Lengkap
          </Anchor>
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
};

  // Enhanced helper function to process text with references
  const processTextWithReferences = (text: string, references: Reference[]) => {
    console.log('🔍 Processing text with references:', { text, references });
    
    if (!references || references.length === 0) {
      console.log('🔍 No references to process');
      return text;
    }

    try {
      const parts = [];
      let remainingText = text;
      let currentIndex = 0;

      // Create a map of reference marks to reference objects
      const refMap = new Map();
      references.forEach(ref => {
        refMap.set(ref.ref_mark, ref);
      });

      console.log('🔍 Reference map:', refMap);

      // Find all reference marks in the text
      const refMarkPattern = /\[[^\]]+\]/g;
      const seenRefMarks = new Set<string>();
      let dynamicIndex = 1;
      let match;
      
      while ((match = refMarkPattern.exec(text)) !== null) {
        const refMark = match[0];
        const matchStart = match.index;
        
        console.log('🔍 Found reference mark:', refMark, 'at position:', matchStart);
        
        // Add text before the reference mark
        if (matchStart > currentIndex) {
          parts.push(text.substring(currentIndex, matchStart));
        }
        
        // Add the reference component if it exists in our map
        const reference = refMap.get(refMark);
        if (reference) {
          console.log('🔍 Adding reference component for:', refMark);
          const order = seenRefMarks.has(refMark) ? Array.from(seenRefMarks).indexOf(refMark) + 1 : dynamicIndex++;

          seenRefMarks.add(refMark);

          parts.push(
            <ReferenceTooltip 
              key={`${reference.url}-${reference.ref_mark}-${matchStart}`} 
              reference={reference}
              order={order} 
            />
          );
        } else {
          console.log('🔍 Reference not found in map, adding as plain text:', refMark);
          parts.push(refMark);
        }
        
        currentIndex = matchStart + refMark.length;
      }
      
      // Add any remaining text
      if (currentIndex < text.length) {
        parts.push(text.substring(currentIndex));
      }

      console.log('🔍 Final parts:', parts);
      return parts.length > 0 ? parts : text;
    } catch (error) {
      console.error('🔍 Error processing text with references:', error);
      return text;
    }
  };


  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '90vh', overflow: 'hidden'}}>
      {/* Chat History */}
      <ScrollArea 
        ref={scrollAreaRef}
        style={{ 
          height: '535px',
          minHeight: 0,
        }}
        styles={{
          viewport: {
            '& > div': {
              display: 'flex !important',
              flexDirection: 'column',
              justifyContent: 'flex-start',
            }
          }
        }}
        >
        <Stack gap="md" p="md" style={{
          minHeight: '535px'
        }}>
          {messages.length === 0 ? (
            <Box
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: '505px',
                textAlign: 'center',
              }}
            >
              <Text c="dimmed" size='sm'>
                Mulai Percakapan dengan AI Assistant....
              </Text>
            </Box>
          ) : (
            <>
          {messages.map((msg, idx) => (
            <Paper
              key={idx}
              shadow="xs"
              radius="md"
              withBorder
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.sender === 'user' ? (isDark ? theme.colors.blue[9] : '#e0f7fa') : (isDark ? theme.colors.dark[6] : '#f3f4f6'),
                color: isDark ? theme.colors.gray[2] : theme.black, maxWidth: '100%',
                padding: '20px',
              }}
            >
              <Text size="md" c="dimmed" mb="xs"> 
                {msg.sender === 'user' ? 'Anda' : 'AI'}
              </Text>
              {msg.sender === 'user' ? (
                <Text size='sm' style={{ whiteSpace: 'pre-wrap'}}>{msg.text}</Text>
              ) : (
                <TypographyStylesProvider>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => {

                      const extractText = (children: React.ReactNode): string => {
                        if (children === null || children === undefined) return '';

                        if (typeof children === 'string' || typeof children === 'number') {
                          return String(children);
                        }

                        if (Array.isArray(children)) {
                          return children.map(extractText).join('');
                        }

                        if (React.isValidElement(children)) {
                          // TypeScript-safe access ke props.children
                          return extractText((children.props as { children?: React.ReactNode }).children);
                        }

                        return '';
                      };

                        const textContent = extractText(children);

                        console.log('🔍 Processing paragraph:', textContent);
                        console.log('🔍 Available references:', msg.references);

                        if (!msg.references) return <Text size="sm" mb="xs">{children}</Text>;

                        const dedupedReferences = Array.from(
                          new Map(msg.references.map((ref) => [`${ref.url}-${ref.ref_mark}`, ref])).values()
                        );

                        const sortedReferences = dedupedReferences.sort((a, b) => (a.index ?? 999) - (b.index ?? 999));
                        
                        const processedContent = processTextWithReferences(textContent, sortedReferences);

                        return <Text size="sm" mb="xs">{processedContent}</Text>;
                      },
                      h1: ({children}) => (
                        <Text size="xl" fw={700} mb="md">{children}</Text>
                      ),
                      h3: ({ children }) => (
                          <Text size="md" fw={600} mb="sm">{children}</Text>
                        ),
                        ul: ({ children }) => (
                          <Box component="ul" ml="md" mb="sm">{children}</Box>
                        ),
                        ol: ({ children }) => (
                          <Box component="ol" ml="md" mb="sm">{children}</Box>
                        ),
                        li: ({ children }) => (
                          <Text component="li" size="sm" mb="xs">{children}</Text>
                        ),
                        strong: ({ children }) => (
                          <Text component="span" fw={700}>{children}</Text>
                        ),
                        em: ({ children }) => (
                          <Text component="span" fs="italic">{children}</Text>
                        ),
                        code: ({ children, className }) => {
                          const isInline = !className;
                          return isInline ? (
                            <Text 
                              component="code" 
                              bg="gray.1" 
                              px="xs" 
                              style={{ 
                                borderRadius: '4px',
                                fontSize: '0.875em',
                                fontFamily: 'monospace'
                              }}
                            >
                              {children}
                            </Text>
                          ) : (
                            <Paper 
                              bg="gray.0" 
                              p="sm" 
                              mb="sm"
                              style={{ 
                                borderRadius: '8px',
                                overflow: 'auto'
                              }}
                            >
                              <Text 
                                component="pre"
                                size="sm"
                                style={{ 
                                  fontFamily: 'monospace',
                                  margin: 0,
                                  whiteSpace: 'pre-wrap'
                                }}
                              >
                                <code>{children}</code>
                              </Text>
                            </Paper>
                          );
                        },
                        table: ({ children }) => (
                          <Box style={{ overflowX: 'auto' }} mb="md">
                            <Box 
                              component="table" 
                              style={{ 
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '0.875rem'
                              }}
                            >
                              {children}
                            </Box>
                          </Box>
                        ),
                        thead: ({ children }) => (
                          <Box component="thead">{children}</Box>
                        ),
                        tbody: ({ children }) => (
                          <Box component="tbody">{children}</Box>
                        ),
                        tr: ({ children }) => (
                          <Box 
                            component="tr"
                            style={{ 
                              borderBottom: '1px solid #e9ecef'
                            }}
                          >
                            {children}
                          </Box>
                        ),
                        th: ({ children }) => (
                          <Box 
                            component="th"
                            p="sm"
                            style={{ 
                              backgroundColor: '#f8f9fa',
                              fontWeight: 600,
                              textAlign: 'left',
                              border: '1px solid #dee2e6'
                            }}
                          >
                            {children}
                          </Box>
                        ),
                        td: ({ children }) => (
                          <Box 
                            component="td"
                            p="sm"
                            style={{ 
                              border: '1px solid #dee2e6',
                              verticalAlign: 'top'
                            }}
                          >
                            {children}
                          </Box>
                        ),
                        blockquote: ({ children }) => (
                          <Paper 
                            pl="md" 
                            py="sm"
                            mb="sm"
                            style={{ 
                              borderLeft: '4px solid #228be6',
                              backgroundColor: '#f0f8ff'
                            }}
                          >
                            {children}
                          </Paper>
                        )
                      }}
                    >
                      {msg.text}
                  </ReactMarkdown>

                  {/* Daftar Referensi */}
                  {(msg.references?.length ?? 0) > 0 && (
                    <Box mt="sm" p="xs" style={{ 
                      backgroundColor: isDark ? theme.colors.dark[7] : theme.colors.gray[1],
                      borderRadius: theme.radius.sm
                    }}>
                      <Text size="xs" c="dimmed">Referensi:</Text>
                      <Stack gap={4} mt={4}>
                         {Array.from(
                          new Map(
                            msg.references?.map((ref) => [`${ref.url}-${ref.ref_mark}`, ref])
                          ).values()
                        ).map((ref, idx) => (
                          <Group key={`${ref.url}-${ref.ref_mark}`} gap={4} align="flex-start">
                            <Text size="xs">{ref.ref_mark}</Text>
                            <Anchor 
                              href={ref.url} 
                              target="_blank" 
                              size="xs"
                              style={{ wordBreak: 'break-all' }}
                            >
                              {ref.text}
                            </Anchor>
                          </Group>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </TypographyStylesProvider>
              )}
            </Paper>
          ))}
          {isLoading && <LoadingMessage/>}
          <div ref={messageEndRef} />
          </>
        )}
        </Stack>
      </ScrollArea>

      {/* Context Preview Chips - just above the textarea */}
      {contextNodes.length > 0 && (
        <Box px="md" style={{ flexShrink: 0}}>
        <Group  mb="xs" mt="sm" wrap="wrap">
          {contextNodes.map((node) => (
            <Paper
              key={node.label}
              withBorder
              shadow="xs"
              p="xs"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Text size="sm" fw={600}>{node.title || node.label}</Text>
              <ActionIcon
                size="xs"
                variant="subtle"
                onClick={() => removeContextNode(node || '')}
              >
                <IconX size={14} />
              </ActionIcon>
            </Paper>
          ))}
        </Group>
        </Box>
      )}

      {/* Input */}
      <Box p="md" 
        style={{ 
          flexShrink: 0,
          borderTop: '1px solid #e9ecef',
          backgroundClip: 'var(--mantine-color-body)',  
        }}>
        <Button
          onClick={fetchInitialSuggestions}
          size='xs'
          variant='light'
          disabled={isLoading}
        >
          Ganti Saran
        </Button>
          {showSuggestions && suggestions.length > 0 && (
        <SuggestionPanel
          suggestions={suggestions}
          context={suggestionContext}
          onSuggestionClick={handleSuggestionClick}
          onClose={handleCloseSuggestions}
        />
      )}

        <Group mt="xs" gap="sm" align="flex-end">
          <Textarea
            placeholder={isLoading ? "Menunggu Respon AI" : "Ketik pertanyaan..."}
            autosize
            minRows={3}
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            style={{ flex: 1 }}
            onKeyDown={handleKeyPress}
            styles={{
              input: {
                resize: 'none',
              }
            }}
          />
          {/* <ActionIcon 
            variant={uploading ? 'filled' : 'default'} 
            loading={uploading} 
            disabled={uploading} 
            size='lg'
            onClick={handleUploadFile}>
            <IconUpload size={20} />
          </ActionIcon> */}
            <Tooltip label={forceWeb ? "Pencarian web aktif" : "Pencarian web nonaktif"} position="top" withArrow>
              <Switch
                size="md"
                checked={forceWeb}
                onChange={(event) => setForceWeb(event.currentTarget.checked)}
                thumbIcon={
                  forceWeb ? (
                    <IconSearch size="0.8rem" color={theme.colors.blue[6]} stroke={3} />
                  ) : (
                    <IconWorld size="0.8rem" color={theme.colors.gray[6]} stroke={2} />
                  )
                }
              />
            </Tooltip>
          <Button onClick={handleSend} disabled={!input.trim()} variant='filled'>Kirim</Button>
        </Group>

        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none'}}
          onChange={onFileChange}
          accept='application/pdf'  
        />
      </Box>

      
    </Box>
  );
}
