// src/app/page.tsx
'use client';

import '@mantine/tiptap/styles.css';


import { useState, useCallback, useEffect } from 'react';
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
} from '@mantine/core';
import { RichTextEditor, Link as TiptapLink } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import Highlight from '@tiptap/extension-highlight';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import SubScript from '@tiptap/extension-subscript';
import { 
  IconBrandHipchat,
  IconChevronRight,
  IconEdit,
} from '@tabler/icons-react';
import { ExtendedEdge, ExtendedNode } from '../../types';
import ChatPanel from '../../components/ChatPanel';
// import NodeDetail from '../../components/NodeDetail';
// import EdgeDetail from '../../components/EdgeDetail';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useResizablePanels } from '../hooks/useResizablePanels';
import DocumentOutline from '@/components/DocumentOutline';

const content = '<h2 style="text-align: center;">Selamat Datang di Editor Penelitian</h2><p>Gunakan <code>RichTextEditor</code> ini untuk menulis dan mengedit hasil penelitian Anda. Editor ini mendukung berbagai fitur formatting:</p><ul><li>Format teks umum: <strong>tebal</strong>, <em>miring</em>, <u>garis bawah</u>, <s>coret</s></li><li>Heading (h1-h6)</li><li>Sub dan super script (<sup>&lt;sup /&gt;</sup> dan <sub>&lt;sub /&gt;</sub>)</li><li>Daftar berurut dan bullet</li><li>Alignment teks</li><li>Dan banyak <a href="https://tiptap.dev/extensions" target="_blank" rel="noopener noreferrer">ekstensi lainnya</a></li></ul><p>Mulai menulis hasil analisis penelitian Anda di sini...</p>';

export default function Home() {
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
  
  const handleToggleSidebar = useCallback(() => {
    setSidebarOpened((o) => !o);
  }, []);

  // Add this after your existing useState declarations
    const { leftWidth, rightWidth, isDragging, containerRef, handleMouseDown } = useResizablePanels(60);

  const handleChatSelect = useCallback((chatId: number) => {
    console.log(`Selected chat: ${chatId}`);
  }, []);

  const handleNewChat = useCallback(() => {
    console.log('New chat clicked');
  }, []);

  const chatHistory = [
    { id: 1, title: 'Analisis Machine Learning', timestamp: '2 jam lalu', active: false },
    { id: 2, title: 'Penelitian Deep Learning', timestamp: '1 hari lalu', active: false },
    { id: 3, title: 'Computer Vision Study', timestamp: '3 hari lalu', active: true },
  ];

  const handleSaveDraft = async (editor: any) => {
    if (!editor) return;
    const json = editor.getJSON();

    const sections = json.content?.filter((block: any) =>
        block.type === 'heading' || block.type === 'paragraph'
    );

    const draftSections = [];
    let currentTitle = 'Pendahuluan';
    let currentContent = '';

    sections?.forEach((block: any) => {
        if (block.type === 'heading') {
        if (currentContent.trim()) {
            draftSections.push({
            title: currentTitle,
            content: currentContent.trim(),
            });
        }
        currentTitle = block.content?.map((c: any) => c.text).join('') || 'Tanpa Judul';
        currentContent = '';
        } else {
        const text = block.content?.map((c: any) => c.text).join(' ') || '';
        currentContent += text + '\n\n';
        }
    });

    if (currentContent.trim()) {
        draftSections.push({
        title: currentTitle,
        content: currentContent.trim(),
        });
    }

    const payload = {
        // userId: 1, // Ganti dengan session user
        // articleId: 1, // Ganti sesuai ID artikel
        title: 'Draft Penelitian',
        sections: draftSections,
    };

    fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    }).then((res) => {
        if (res.ok) {
            alert('Draft berhasil disimpan!');
        } else {
            alert('Gagal menyimpan draft.');
        };
        })
        .catch(() => {
            alert('Terjadi kesalahan saat menyimpan draft.');
        });
}

  // Rich Text Editor - Fixed initialization
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TiptapLink,
      Superscript,
      SubScript,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
  });

  if (!mounted) {
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
          <Text>Loading...</Text>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebarOpened={sidebarOpened}
      onToggleSidebar={handleToggleSidebar}
      mounted={mounted}
      // chatHistory={chatHistory}
      // onChatSelect={handleChatSelect}
      // onNewChat={handleNewChat}
    >
      <Container fluid h="100%" p="xl">
        {/*  this resizable container */}
        <Box 
        ref={containerRef}
        style={{ 
            display: 'flex', 
            height: '80vh', 
            gap: 16,
            position: 'relative'
        }}
        >
        {/* Left Panel Container */}
        <Box style={{ width: `${leftWidth}%`, display: 'flex', gap: 12, minWidth: '400px', overflow: 'hidden' }}>
            {/* Document Outline */}
            <Box style={{ width: '250px', flexShrink: 0 }}>
            <DocumentOutline editor={editor} />
            </Box>
            
            {/* Rich Text Editor Panel */}
            <Box style={{ flex: 1, minWidth: '300px' }}>
            <Card 
                shadow="sm" 
                padding="lg" 
                radius="lg" 
                h="100%" 
                withBorder
                style={{ display: 'flex', flexDirection: 'column', flex:1, overflow: 'hidden' }}
            >
                <Group justify="space-between" mb="lg">
                <Group gap="xs">
                    <ThemeIcon variant="light" color="blue" size="lg">
                    <IconEdit size={20} />
                    </ThemeIcon>
                    <Box>
                    <Text size="xl" fw={700}>Editor Penelitian</Text>
                    <Text size="sm" c="dimmed">Tulis dan edit hasil penelitian Anda</Text>
                    </Box>
                </Group>
                <Badge variant="light" color="green" size="lg">
                    Aktif
                </Badge>
                </Group>

                {/* Rich Text Editor Container with Scrollbar */}
                <Box 
                style={{ 
                    flex: 1, 
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'auto',
                    maxHeight: '100%',
                    paddingRight: '8px',
                }}
                >
                {editor && (
                    <RichTextEditor 
                    editor={editor}
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        border: `1px solid ${dark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                        borderRadius: theme.radius.md,
                    }}
                    >
                    {/* Toolbar - same as before */}
                    <RichTextEditor.Toolbar 
                        sticky={true}
                        style={{
                        backgroundColor: dark ? theme.colors.dark[6] : theme.colors.gray[0],
                        borderBottom: `1px solid ${dark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                        padding: '12px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        minHeight: '56px',
                        // maxHeight: '96px',
                        zIndex: 1,
                        borderRadius: `${theme.radius.md}px ${theme.radius.md}px 0 0`,
                        }}
                    >
                        <RichTextEditor.ControlsGroup style={{ display: 'flex', gap: '4px' }}>
                        <RichTextEditor.Bold />
                        <RichTextEditor.Italic />
                        <RichTextEditor.Underline />
                        <RichTextEditor.Strikethrough />
                        <RichTextEditor.ClearFormatting />
                        <RichTextEditor.Highlight />
                        <RichTextEditor.Code />
                        </RichTextEditor.ControlsGroup>

                        <RichTextEditor.ControlsGroup style={{ display: 'flex', gap: '4px' }}>
                        <RichTextEditor.H1 />
                        <RichTextEditor.H2 />
                        <RichTextEditor.H3 />
                        <RichTextEditor.H4 />
                        </RichTextEditor.ControlsGroup>

                        <RichTextEditor.ControlsGroup style={{ display: 'flex', gap: '4px' }}>
                        <RichTextEditor.Blockquote />
                        <RichTextEditor.Hr />
                        <RichTextEditor.BulletList />
                        <RichTextEditor.OrderedList />
                        <RichTextEditor.Subscript />
                        <RichTextEditor.Superscript />
                        </RichTextEditor.ControlsGroup>

                        <RichTextEditor.ControlsGroup style={{ display: 'flex', gap: '4px' }}>
                        <RichTextEditor.Link />
                        <RichTextEditor.Unlink />
                        </RichTextEditor.ControlsGroup>

                        <RichTextEditor.ControlsGroup style={{ display: 'flex', gap: '4px' }}>
                        <RichTextEditor.AlignLeft />
                        <RichTextEditor.AlignCenter />
                        <RichTextEditor.AlignJustify />
                        <RichTextEditor.AlignRight />
                        </RichTextEditor.ControlsGroup>

                        <RichTextEditor.ControlsGroup style={{ display: 'flex', gap: '4px' }}>
                        <RichTextEditor.Undo />
                        <RichTextEditor.Redo />
                        </RichTextEditor.ControlsGroup>
                    </RichTextEditor.Toolbar>

                    {/* Content area with scrollbar */}
                    <RichTextEditor.Content 
                        style={{ 
                        flex: 1,
                        padding: '16px',
                        backgroundColor: dark ? theme.colors.dark[8] : 'white',
                        minHeight: '400px'
                        // overflow: 'auto',
                        // maxHeight: 'calc(80vh - 200px)', // Adjust based on your needs
                        // borderRadius: `0 0 ${theme.radius.md}px ${theme.radius.md}px`,
                        }} 
                    />
                    <Box mt="md" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <Button
                        variant="default"
                        onClick={() => {
                        if (!editor) return;
                        const text = editor.getText();
                        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = 'draft.txt';
                        link.click();
                        URL.revokeObjectURL(url);
                        }}
                    >
                        Unduh Draft
                    </Button>

                    <Button
                        color="blue"
                        onClick={() => handleSaveDraft(editor)}
                    >
                        Simpan Draft
                    </Button>
                    </Box>

                    </RichTextEditor>
                )}
                </Box>
            </Card>
            </Box>
        </Box>

        {/* Resizer */}
        <Box
            onMouseDown={handleMouseDown}
            style={{
            width: '2px',
            backgroundColor: isDragging ? theme.colors.blue[5] : (dark ? theme.colors.dark[4] : theme.colors.gray[3]),
            cursor: 'col-resize',
            transition: isDragging ? 'none' : 'background-color 0.2s',
            position: 'relative',
            flexShrink: 0,
            marginLeft: '-12px',
            marginRight: '-12px',
            zIndex: 10,
            }}
        >
            <Box
            style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '20px',
                height: '60px',
                backgroundColor: isDragging ? theme.colors.blue[5] : (dark ? theme.colors.dark[4] : theme.colors.gray[4]),
                borderRadius: theme.radius.sm,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isDragging ? 1 : 0.7,
                transition: 'opacity 0.2s',
            }}
            >
            <Box
                style={{
                width: '2px',
                height: '16px',
                backgroundColor: dark ? theme.colors.dark[0] : 'white',
                borderRadius: '1px',
                }}
            />
            </Box>
        </Box>

        {/* Right Panel - Chat */}
        <Box style={{ width: `${rightWidth}%`, minWidth: '300px', overflow: 'hidden' }}>
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
                <ChatPanel selectedNode={selectedNode} selectedEdge={selectedEdge} />
            </Box>
            </Card>
        </Box>
        </Box>
      </Container>
    </DashboardLayout>
  );
}