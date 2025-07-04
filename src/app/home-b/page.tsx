"use client"

import '@mantine/tiptap/styles.css';
import cx from 'clsx';
import NextImage from 'next/image';
import {
  AppShell,
  Burger,
  rem,
  Container,
  Image,
  ActionIcon,
  Avatar,
  Group,
  Flex,
  Title,
  useMantineColorScheme,
  useComputedColorScheme,
  ScrollArea,
  Overlay,
  Box,
  Button,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";

import {useDisclosure, useMediaQuery} from "@mantine/hooks";
import {
   IconSettings,
   IconSun,
   IconMoon,
   IconGraph,
   IconMessageCircle2,
   IconBrain,
   IconMap2,
   IconSend,
   IconFilePlus, 
   IconUpload,
  } from "@tabler/icons-react";
import classes from '../container.module.css';
import myimage from '../imageCollection/LogoSRE_Fix.png';
import knowledgeImage from '../imageCollection/graph.png';
import { useState, useEffect } from 'react';

import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import Highlight from '@tiptap/extension-highlight';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import SubScript from '@tiptap/extension-subscript';
import { Heading } from '@tiptap/extension-heading';
import { Plugin } from 'prosemirror-state';
import Split from 'react-split';

export default function Home() {
  const [navbarOpened, { toggle: toggleNavbar, close: closeNavbar }] = useDisclosure();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  const toggleColorScheme = () =>
    setColorScheme(computedColorScheme === "dark" ? "light" : "dark");

  const [activeTab, setActiveTab] = useState("chat");

  const isMobile = useMediaQuery('(max-width: 768px)');

  const [fileName, setFileName] = useState("Judul Artikel 1");

  const [headings, setHeadings] = useState<Array<{ id: string; text: string }>>([]);

  const HeadingWithId = Heading.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        id: {
          default: null,
          parseHTML: (element) => element.getAttribute('id'),
          renderHTML: (attributes) => {
            return { id: attributes.id };
          },
        },
      };
    },
    addProseMirrorPlugins() {
      return [
        new Plugin({
          appendTransaction(transactions, oldState, newState) {
            const tr = newState.tr;
            const seenIds = new Set<string>();

            newState.doc.descendants((node, pos) => {
              if (node.type.name === 'heading') {
                let id = node.attrs.id;
                if (!id || seenIds.has(id)) {
                  id = `heading-${Math.random().toString(36).substr(2, 9)}`;
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    id,
                  });
                }
                seenIds.add(id);
              }
            });

            return tr.docChanged ? tr : null;
          },
        }),
      ];
    },
  });
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      HeadingWithId,
      Underline,
      Link,
      Superscript,
      SubScript,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
  });

  useEffect(() => {
    if (!editor) return;

    const updateHeadings = () => {
      const nodes: { id: string; text: string }[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "heading" && node.attrs.id) {
          nodes.push({
            id: node.attrs.id,
            text: node.textContent,
          });
        }
      });
      setHeadings(nodes);
    };

    editor.on("update", updateHeadings);
    updateHeadings(); // initial call

    // Cleanup function
    return () => {
      editor.off("update", updateHeadings);
    };
  }, [editor]);

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  const sendMessage = () => {
    if (chatInput.trim() === "") return;
    setMessages((prev) => [...prev, chatInput]);
    setChatInput("");
  };

  return (
    <AppShell
      header={{ height: 90 }}
      padding="md"
    >
      <AppShell.Header
        style={{
          backgroundColor:
              computedColorScheme === "dark" ? "#1a1b1e" : "white",
            borderBottom: "1px solid #e0e0e0",
            paddingLeft: rem(16),
            paddingRight: rem(16),
        }}
      >
        <Container 
          size="responsive" 
          className={classes.responsiveContainer}
          style={{ height: "100%" }}
        >
          <Flex 
            align="center" 
            justify="space-between" 
            h="100%" 
            wrap="nowrap" 
            gap="sm" 
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            <Group align="center" gap="sm" style={{ flexShrink: 0}}>
              <Image
                component={NextImage}
                src={myimage}
                alt="Logo"
                h={80}
                w={130}
                fit="contain"
              />
              <div style={{
                width: '1px',
                height: '40px',
                backgroundColor: '#ccc',
                marginLeft: '10px',
                marginRight: '10px'
              }} 
              /> 
            </Group>

            <div style={{ flexGrow: 1, flexShrink: 1, minWidth: 0, maxWidth: '100%',overflow: 'hidden',}}>
              <Title order={6} style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                Hello, M. Fahmi Kurniawan Welcome to SRE
              </Title>
              <div style={{ marginTop: 2}}>
                <span 
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#007BFF',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: 9,
                  }}
                >
                  Group B
                </span>
              </div>
            </div>

            <Group gap="md" style={{ flexShrink:0,}}>
              <ActionIcon
                variant="default"
                size="lg"
                onClick={toggleColorScheme}
                aria-label="Toggle color scheme"
              >
                {computedColorScheme === "dark" ? (
                  <IconSun size={20} />
                ) : (
                  <IconMoon size={20} />
                )}
              </ActionIcon>

              <ActionIcon variant="default" size="lg" aria-label="Settings">
                <IconSettings size={20} />
              </ActionIcon>
              
              <Avatar
                variant="filled"
                radius="xl"
                color='#007BFF'
                alt="User"
                src=""
              />
            </Group>
          </Flex>
        </Container>
      </AppShell.Header>
      <AppShell.Main style={{ position: "relative", height: "100vh", overflow: "hidden" }}>
         
        <div style={{ position: "relative", zIndex: 11, height: "100%" }}>
          <Flex
            direction={isMobile ? "column" : "row"}
            justify="space-between"
            align="stretch"
            // style={{ height: isMobile ? "auto" : "calc(100vh - 90px)" }}
            style={{ height: "100%", flexGrow: 1}}
            gap="md"
          >
            {/* Panel Kiri */}
            <Box
              style={{
                // width: isMobile ? "100%" : "20%",
                width: "20%",
                border: "1px solid #ccc",
                borderRadius: "8px",
                backgroundColor: computedColorScheme === "dark" ? "#2a2a2a" : "#f9f9f9",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                maxHeight: "calc(100vh - 140px)", // sama dengan panel tengah dan kanan
                overflowY: "auto",
              }}
            >
              <Text size="xs" fw={600} c="dimmed" mb="sm" ml="sm">
                Daftar Artikel
              </Text>

              <TextInput
                value={fileName}
                onChange={(e) => setFileName(e.currentTarget.value)}
                variant="unstyled"
                styles={{
                  input: {
                    fontWeight: 600,
                    fontSize: "17px",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    backgroundColor: computedColorScheme === "dark" ? "#007BFF" : "#007BFF",
                    marginBottom: "12px",
                  },
                }}
              />

              {/* Daftar heading hasil ketikan user */}
              <Stack ml="sm" gap={8}>
                {headings.map(({ id, text }) => (
                  <Text
                    key={id}
                    size="sm"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      const element = document.getElementById(id);
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }}
                  >
                    {text}
                  </Text>
                ))}
              </Stack>
            </Box>

            <Split
              className="split"
              sizes={[70, 30]} // persen ukuran awal
              minSize={300}
              expandToMin={false}
              gutterSize={10}
              gutterAlign="center"
              snapOffset={30}
              dragInterval={1}
              direction="horizontal"
              cursor="col-resize"
              style={{ display: 'flex', width: '100%' }}
            >
              {/* Panel Tengah */}
              <Box
                style={{
                  width: isMobile ? "100%" : "60%",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  backgroundColor: computedColorScheme === "dark" ? "#2a2a2a" : "#f9f9f9",
                  padding: "10px",
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden", // agar kontennya tidak keluar
                  maxHeight: "calc(100vh - 140px)",
                  height: "100%", 
                  minHeight: "100%",
                }}
              >
                <RichTextEditor editor={editor} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <RichTextEditor.Toolbar sticky stickyOffset={0}>
                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.Bold />
                      <RichTextEditor.Italic />
                      <RichTextEditor.Underline />
                      <RichTextEditor.Strikethrough />
                      <RichTextEditor.ClearFormatting />
                      <RichTextEditor.Highlight />
                      <RichTextEditor.Code />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.H1 />
                      <RichTextEditor.H2 />
                      <RichTextEditor.H3 />
                      <RichTextEditor.H4 />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.Blockquote />
                      <RichTextEditor.Hr />
                      <RichTextEditor.BulletList />
                      <RichTextEditor.OrderedList />
                      <RichTextEditor.Subscript />
                      <RichTextEditor.Superscript />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.Link />
                      <RichTextEditor.Unlink />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.AlignLeft />
                      <RichTextEditor.AlignCenter />
                      <RichTextEditor.AlignJustify />
                      <RichTextEditor.AlignRight />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.Undo />
                      <RichTextEditor.Redo />
                    </RichTextEditor.ControlsGroup>
                  </RichTextEditor.Toolbar>
                  <ScrollArea style={{ flex: 1 }}>
                    <RichTextEditor.Content 
                      style={{
                        flex: 1,
                        overflowY: "auto", // ini yang penting untuk scroll konten
                        paddingRight: 10,
                      }}
                    />
                  </ScrollArea>
                </RichTextEditor>
                <Group justify="flex-end" mt="sm" gap="md">
                  <Button
                    variant="outline"
                    color="gray"
                    leftSection={<IconFilePlus size={18} />}
                    radius="md"
                    size="md"
                    px={24}
                    onClick={() => {
                      const html = editor?.getHTML();
                      const text = editor?.getText();
                      console.log("Draft:", html);
                      alert("Draft disimpan!");
                    }}
                  >
                    Simpan Draf
                  </Button>

                  <Button
                    variant="filled"
                    color="blue"
                    leftSection={<IconUpload size={18} />}
                    radius="md"
                    size="md"
                    px={24}
                    onClick={() => {
                      const html = editor?.getHTML();
                      const text = editor?.getText();
                      console.log("Final:", html);
                      alert("Artikel final disimpan!");
                    }}
                  >
                    Simpan Final
                  </Button>
                </Group>
              </Box>

              {/* Panel Kanan */}
              <Box
                style={{
                  width: isMobile ? "100%" : "20%",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  backgroundColor: computedColorScheme === "dark" ? "#2a2a2a" : "#f9f9f9",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                  maxHeight: "calc(100vh - 140px)", 
                  height: "100%",             
                  minHeight: "100%",
                  overflow: "hidden",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                }}
              >
                <Box
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '16px',
                    padding: '6px 3px',
                    borderRadius: '99px',
                    border: '2px solid #007BFF',
                    backgroundColor: 'transparent',
                    width: '10 px',
                    marginInline: '60px',
                  }}
                >
                  {[
                    { icon: <IconMessageCircle2 size={20} />, value: 'chat' },
                    { icon: <IconBrain size={20} />, value: 'ask' },
                  ].map((item) => (
                    <ActionIcon
                      key={item.value}
                      onClick={() => setActiveTab(item.value)}
                      radius="xl"
                      size="md"
                      variant={activeTab === item.value ? "filled" : "transparent"}
                      color="#007BFF"
                      style={{
                        border: activeTab === item.value ? "2px solid transparent" : "2px solid #007BFF",
                        backgroundColor: activeTab === item.value ? "#007BFF" : "transparent",
                        color: activeTab === item.value ? "#fff" : "#007BFF",
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {item.icon}
                    </ActionIcon>
                  ))}
                </Box>

                <div
                  style={{
                    width: "100%",
                    height: "1px",
                    backgroundColor: "#ccc",
                    marginBottom: "12px",
                  }}
                />

                {activeTab === "chat" && (
                  <>
                    {/* Header Chat dengan ikon */}
                    <Group align="center" mb="xs" gap="sm">
                      <Box
                        style={{
                          backgroundColor: "#007BFF",
                          padding: "8px",
                          borderRadius: "12px", // Sudut tumpul
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <IconMessageCircle2 size={18} color="#fff" />
                      </Box>

                      <Box>
                        <Title order={4} style={{ margin: 0, color: "#007BFF", fontWeight: 700 }}>
                          Chat SRE
                        </Title>
                        <Text size="xs" c="dimmed" mt={-4}>
                          Diskusi dan Analisis Artikel
                        </Text>
                      </Box>
                    </Group>

                    {/* Area chat */}
                    <ScrollArea style={{
                      flex: 1,
                      border: "1px solid #ccc",
                      borderRadius: "8px",
                      padding: "8px",
                      marginBottom: "12px",
                      backgroundColor: computedColorScheme === "dark" ? "#1e1e1e" : "#fff",
                      minHeight: "200px",
                      overflow: "auto"
                    }}>
                      {messages.length === 0 ? (
                        <Text size="xs" c="dimmed" ta="center">
                          Belum ada percakapan...
                        </Text>
                      ) : (
                        <Stack gap="xs">
                          {messages.map((msg, i) => (
                            <Box
                              key={i}
                              p="xs"
                              style={{
                                backgroundColor: i % 2 === 0 ? "#007BFF" : "#007BFF",
                                borderRadius: "8px",
                              }}
                            >
                              <Text size="sm">{msg}</Text>
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </ScrollArea>

                    {/* Input chat */}
                    <Box
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        backgroundColor: computedColorScheme === "dark" ? "#1e1e1e" : "#fff",
                      }}
                    >
                      <TextInput
                        placeholder="Tuliskan Pertanyaanmu"
                        variant="unstyled"
                        style={{ flex: 1 }}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.currentTarget.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") sendMessage();
                        }}
                      />
                      <ActionIcon
                        variant="filled"
                        color="#007BFF"
                        radius="xl"
                        size="lg"
                        onClick={sendMessage}
                      >
                        <IconSend size={20} />
                      </ActionIcon>
                    </Box>
                  </>
                )}

                {activeTab === "ask" && (
                  <>
                    {/* Header Chat dengan ikon */}
                    <Group align="center" mb="xs" gap="sm">
                      <Box
                        style={{
                          backgroundColor: "#007BFF",
                          padding: "8px",
                          borderRadius: "12px", // Sudut tumpul
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <IconBrain size={18} color="#fff" />
                      </Box>

                      <Box>
                        <Title order={4} style={{ margin: 0, color: "#007BFF", fontWeight: 700 }}>
                          Ask Heading
                        </Title>
                        <Text size="xs" c="dimmed" mt={-4}>
                          Buat Judul dan Subjudul Artikelmu
                        </Text>
                      </Box>
                    </Group>

                    {/* Area chat */}
                    <ScrollArea style={{
                      flex: 1,
                      border: "1px solid #ccc",
                      borderRadius: "8px",
                      padding: "8px",
                      marginBottom: "12px",
                      backgroundColor: computedColorScheme === "dark" ? "#1e1e1e" : "#fff",
                      minHeight: "200px",
                      overflow: "auto"
                    }}>
                      {messages.length === 0 ? (
                        <Text size="xs" c="dimmed" ta="center">
                          Belum ada percakapan...
                        </Text>
                      ) : (
                        <Stack gap="xs">
                          {messages.map((msg, i) => (
                            <Box
                              key={i}
                              p="xs"
                              style={{
                                backgroundColor: i % 2 === 0 ? "#007BFF" : "#007BFF",
                                borderRadius: "8px",
                              }}
                            >
                              <Text size="sm">{msg}</Text>
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </ScrollArea>

                    {/* Input chat */}
                    <Box
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        backgroundColor: computedColorScheme === "dark" ? "#1e1e1e" : "#fff",
                      }}
                    >
                      <TextInput
                        placeholder="Tuliskan Pertanyaanmu"
                        variant="unstyled"
                        style={{ flex: 1 }}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.currentTarget.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") sendMessage();
                        }}
                      />
                      <ActionIcon
                        variant="filled"
                        color="#007BFF"
                        radius="xl"
                        size="lg"
                        onClick={sendMessage}
                      >
                        <IconSend size={20} />
                      </ActionIcon>
                    </Box>
                  </>
                )}

              </Box>
            </Split>
          </Flex>
        </div>
      </AppShell.Main>
    </AppShell>
  );
}