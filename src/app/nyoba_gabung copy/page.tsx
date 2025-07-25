"use client"

import dynamic from 'next/dynamic';
const BlockNoteEditorComponent = dynamic(() => import('@/components/BlockNoteEditor'), {
    ssr: false
});
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
  Menu,
  Tooltip,
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
   IconFileText,
   IconChevronRight,
   IconSearch,
   IconRefresh,
   IconPlus,
   IconExternalLink,
   IconMessageCircle,
   IconStar,
   IconUser,
   IconLogout,
  } from "@tabler/icons-react";
import classes from '../container.module.css';
import myimage from '../imageCollection/LogoSRE_Fix.png';
import knowledgeImage from '../imageCollection/graph.png';
import { useState, useEffect } from 'react';
import Split from 'react-split';

import { useParams, useRouter } from 'next/navigation';

interface Article {
    id: string,
    title: string,
    att_background: string,
    att_url: string,
}

interface User {
  id: string,
  email: string,
  name: string,
  group: string,
}

export default function Home() {
  const [navUser, setNavUser] = useState<User | null>(null); // untuk navbar
  const [dropdownUser, setDropdownUser] = useState<User | null>(null); // untuk dropdown menu
  const [navbarOpened, { toggle: toggleNavbar, close: closeNavbar }] = useDisclosure();
  const {id: sessionId} = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const fetchDropdownUser = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();

      if (!data || !data.user) {
        setDropdownUser(null);
        throw new Error('No dropdown user authenticated');
      } else {
        setDropdownUser(data.user);
      }
    } catch (error: any) {
      console.error(error.message); 
      setDropdownUser(null);
    } finally {
      setLoading(false);
    }
  };
  
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const dark = computedColorScheme === 'dark';

  const toggleColorScheme = () =>
    setColorScheme(computedColorScheme === "dark" ? "light" : "dark");

  const [activeTab, setActiveTab] = useState("knowledge");
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [fileName, setFileName] = useState("Judul Artikel 1");
  const [headings, setHeadings] = useState<Array<{ id: string; text: string; level: number }>>([]);

  const sendMessage = () => {
    if (chatInput.trim() === '') return;
    setMessages((prev) => [...prev, chatInput]);
    setChatInput('');
  };
  //for article
  const [article, setArticle] = useState<Article[]>([]);
  const [mounted, setMounted] = useState(false);
  

  const handleLogout = async () => {
    const res = await fetch('/api/auth/signout',{
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (res.ok){
      console.log('Berhasil logout');
      router.push('signin');
    }else{
      console.error('Tidak berhasil logout');
    }
  };


  const getArticle = async () => {
      const res = await fetch(`/api/nodes?sessionId=${sessionId}`);
      const article = await res.json();

      setArticle(article);
  };

  useEffect(() => {
      getArticle();
      setMounted(true);
  }, []);

  const fetchNavbarUser = async () => {
    try {
      const res = await fetch('/api/tUser', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!data || data.error) {
        setNavUser(null);
        console.warn('No navbar user session found');
      } else {
        setNavUser(data);
      }
    } catch (err) {
      console.error('Failed to fetch navbar user:', err);
      setNavUser(null);
    }
  };

  useEffect(() => {
    fetchNavbarUser();
    fetchDropdownUser();
  }, []);


  // Enhanced headings state dengan level
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [editorContent, setEditorContent] = useState<any[]>([]);

    const handleContentChange = (content: any[]) => {
        setEditorContent(content);

        // Extract headings from BlockNote content dengan level
        const extractedHeadings: { id: string; text: string; level: number }[] = [];
        let firstH1Title = '';
        let hasAnyContent = false;
        
        content.forEach((block) => {
        // Check if ada content apapun
        if (block.content && block.content.length > 0) {
            const hasText = block.content.some((item: any) => {
            const text = typeof item === 'string' ? item : (item.text || '');
            return text.trim().length > 0;
            });
            if (hasText) {
            hasAnyContent = true;
            }
        }
        
        if (block.type === 'heading' && block.content?.length > 0) {
            const text = block.content.map((item: any) => item.text || '').join('');
            if (text.trim()) {
            const level = block.props?.level || 1;
            
            extractedHeadings.push({
                id: block.id || `heading-${Math.random().toString(36).substr(2, 9)}`,
                text: text.trim(),
                level: level,
            });
            
            // Auto-update fileName dengan H1 pertama yang ditemukan
            if (level === 1 && !firstH1Title) {
                firstH1Title = text.trim();
            }
            }
        }
        });
        
        setHeadings(extractedHeadings);
        
        // Logic untuk update/reset title
        if (!hasAnyContent) {
        // Jika editor benar-benar kosong, reset title
        setFileName('📝 Tidak ada judul');
        } else if (firstH1Title && firstH1Title !== fileName) {
        // Jika ada H1, update dengan H1 tersebut
        setFileName(firstH1Title);
        }
        // Jika ada content tapi tidak ada H1, biarkan title yang ada
    };

    const handleSaveDraft = () => {
        console.log('Draft:', editorContent);
        alert('Draft disimpan!');
    };

    const handleSaveFinal = () => {
        console.log('Final:', editorContent);
        alert('Artikel final disimpan!');
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
            borderBottom: `1px solid ${computedColorScheme === 'dark' ? '#2a2a2a' : '#e0e0e0'}`,
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

            <div style={{ flexGrow: 1, flexShrink: 1, minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
              {navUser ? (
                <div style={{ lineHeight: 1.3 }}>
                  <Text
                    size="lg"
                    fw={600}
                    style={{
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      color: dark ? 'white' : '#1c1c1c',
                    }}
                  >
                    Halo, {navUser.name} — Selamat datang di MySRE
                  </Text>
                  <Text size="sm" c="dimmed" style={{ marginTop: 2 }}>
                    Group {navUser.group}
                  </Text>
                </div>
              ) : (
                <Text size="sm" c="dimmed">Memuat data pengguna...</Text>
              )}
            </div>

            <Group gap="sm">
              <Tooltip label={dark ? 'Light mode' : 'Dark mode'}>
                <ActionIcon
                  variant="light"
                  color={dark ? 'yellow' : 'blue'}
                  onClick={toggleColorScheme}
                  size="lg"
                  radius="md"
                >
                  {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
                </ActionIcon>
              </Tooltip>
            
              <Tooltip label="Settings">
                <ActionIcon variant="light" color="gray" size="lg">
                  <IconSettings size={18} />
                </ActionIcon>
              </Tooltip>
                      
              <Menu shadow="lg" width={220} position="bottom-end" offset={10}>
                <Menu.Target>
                  <ActionIcon variant="light" size="lg" radius="xl">
                    <Avatar
                      size="sm"
                      radius="xl"
                      variant="gradient"
                      gradient={{ from: 'blue', to: 'cyan', deg: 45 }}
                      style={{ cursor: 'pointer' }}
                    >
                      <IconUser size={16} />
                    </Avatar>
                  </ActionIcon>
                </Menu.Target>
            
                <Menu.Dropdown>
                  <Menu.Label>
                    <Group gap="xs">
                      <Avatar size="xs" color="blue">U</Avatar>
                      <Text size="sm">Signed in as</Text>
                    </Group>
                  </Menu.Label>
                  <Menu.Item>
                    <Text size="sm" fw={600}>{(navUser?.name)?.split('@')[0]}</Text>
                    <Text size="xs" c="dimmed">{dropdownUser?.email}</Text>
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item 
                      leftSection={<IconLogout size={16} />}
                      color="red" 
                      onClick={handleLogout}
                  >
                    Sign out
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
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
            style={{ height: "100%", flexGrow: 1}}
            gap="md"
          >
            {/* Panel Kiri */}
            <Box
              style={{
                width: '20%',
                border: '1px solid #ccc',
                borderRadius: '8px',
                backgroundColor: computedColorScheme === 'dark' ? '#2a2a2a' : '#f9f9f9',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 140px)',
                overflowY: 'auto',
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
                    fontSize: '17px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    backgroundColor: computedColorScheme === 'dark' ? '#007BFF' : '#007BFF',
                    marginBottom: '12px',
                    color: 'white',
                  },
                }}
              />

              {/* Enhanced Daftar heading dengan navigation dan level */}
              <Stack ml="sm" gap={8}>
                {headings.length === 0 ? (
                  <Box ta="center" py="md">
                    <Text size="xs" c="dimmed" mb="xs">
                      Outline artikel akan muncul di sini
                    </Text>
                    <Text size="xs" c="dimmed">
                      Gunakan AI untuk membuat konten dengan heading
                    </Text>
                  </Box>
                ) : (
                  headings.map(({ id, text, level }) => {
                    // Get icon berdasarkan level
                    const getHeadingIcon = () => {
                      switch(level) {
                        case 1: return '📝';
                        case 2: return '📌';
                        case 3: return '🔸';
                        case 4: return '▪️';
                        default: return '•';
                      }
                    };
                    
                    // Get indentation berdasarkan level
                    const getIndentation = () => {
                      return (level - 1) * 12;
                    };
                    
                    // Get color berdasarkan level
                    const getTextColor = () => {
                      switch(level) {
                        case 1: return '#1971c2';
                        case 2: return '#2f9e44';
                        case 3: return '#f76707';
                        case 4: return '#7048e8';
                        default: return '#495057';
                      }
                    };

                    return (
                      <Group
                        key={id}
                        gap="xs"
                        p="xs"
                        style={{ 
                          cursor: 'pointer',
                          marginLeft: getIndentation(),
                          borderRadius: 6,
                          transition: 'all 0.2s ease',
                          border: '1px solid transparent',
                        }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-blue-200"
                        onClick={() => {
                          // Enhanced scroll function
                          try {
                            // Method 1: Cari berdasarkan block ID
                            const blockElement = document.querySelector(`[data-id="${id}"]`) as HTMLElement;
                            if (blockElement) {
                              blockElement.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'center' 
                              });
                              
                              // Highlight sementara
                              blockElement.style.background = 'rgba(59, 130, 246, 0.1)';
                              blockElement.style.borderLeft = '4px solid #3b82f6';
                              blockElement.style.borderRadius = '0 8px 8px 0';
                              setTimeout(() => {
                                blockElement.style.background = '';
                                blockElement.style.borderLeft = '';
                                blockElement.style.borderRadius = '';
                              }, 2000);
                              return;
                            }
                            
                            // Method 2: Fallback ke method lama
                            const element = document.getElementById(id) as HTMLElement;
                            if (element) {
                              element.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start' 
                              });
                            }
                          } catch (error) {
                            console.error('Error scrolling to heading:', error);
                          }
                        }}
                      >
                        <Text size="xs" style={{ minWidth: 16 }}>
                          {getHeadingIcon()}
                        </Text>
                        <Text
                          size="sm"
                          fw={level <= 2 ? 600 : 500}
                          style={{
                            color: getTextColor(),
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}
                          title={text}
                        >
                          {text}
                        </Text>
                        <Text size="xs" c="dimmed">
                          H{level}
                        </Text>
                      </Group>
                    );
                  })
                )}
              </Stack>
            </Box>

            <Split
              className="split"
              sizes={[70, 30]}
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
                  width: isMobile ? '100%' : '60%',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  backgroundColor: computedColorScheme === 'dark' ? '#2a2a2a' : '#f9f9f9',
                  padding: '10px',
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  maxHeight: 'calc(100vh - 140px)',
                  height: '100%',
                  minHeight: '100%',
                }}
              >
                {/* BlockNote Editor Component dengan AI Indonesia */}
                <BlockNoteEditorComponent
                  onContentChange={handleContentChange}
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                />

                {/* Action Buttons */}
                <Group justify="flex-end" mt="sm" gap="md">
                  <Button 
                    variant="outline" 
                    color="gray" 
                    leftSection={<IconFilePlus size={18} />} 
                    radius="md" 
                    size="md" 
                    px={24} 
                    onClick={handleSaveDraft}
                    style={{
                      transition: 'all 0.2s ease',
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
                    onClick={handleSaveFinal}
                    style={{
                      transition: 'all 0.2s ease',
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
                  maxHeight: "calc(100vh - 140px)", // samakan tinggi dengan panel tengah
                  height: "100%",              // 🟢 FIX INI
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
                    { icon: <IconGraph size={20} />, value: 'knowledge' },
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

                {activeTab === "knowledge" && (
                  <>
                    <Box
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        padding: "12px",
                        marginBottom: "16px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: computedColorScheme === "dark" ? "#1e1e1e" : "#FFFFFF",
                      }}
                    >
                      <Image
                        component={NextImage}
                        src={knowledgeImage}
                        alt="Knowledge Graph"
                        style={{
                          width: "auto",
                          height: "auto",
                          maxWidth: "100%",
                          maxHeight: "160px",
                          objectFit: "contain",
                          marginBottom: "12px",
                          alignSelf: "center",
                        }}
                      />
                    </Box>

                    <Title 
                      order={3} 
                      style={{ 
                        color: "#007BFF",
                        marginBottom: "8px",
                        textAlign: "left",
                        fontWeight: 700,
                        fontSize: "24px", 
                      }}>
                      Knowledge Graph
                    </Title>

                    <div
                      style={{
                        width: "100%",
                        height: "1px",
                        backgroundColor: "#ccc",
                        marginTop: "3px",
                        marginBottom: "12px",
                      }}
                    />

                    <Text 
                      size="sm" 
                      style={{
                        color: computedColorScheme === "dark" ? "#ccc" : "#333",
                        marginBottom: "16px",
                        textAlign: "left",
                        fontSize: "15px",
                        lineHeight: 1.5,
                      }}
                    >
                      Fitur UI ini dirancang untuk memvisualisasikan hubungan antara berbagai artikel ilmiah dalam bentuk graph/digital connection, berdasarkan relevansi dari tiap artikel.
                    </Text>

                    <Button
                      fullWidth
                      size="md"
                      color="#007BFF"
                      leftSection={<IconMap2 size={20} />}
                      radius="md"
                      style={{ fontWeight: 600 }}
                    >
                      Lihat Graph
                    </Button>
                  </>
                )}

                {activeTab === "chat" && (
                <>
                    {/* Header dengan Search */}
                    <Box mb="md">
                    <TextInput
                        placeholder="Search sources..."
                        variant="filled"
                        leftSection={<IconSearch size={16} />}
                        rightSection={
                        <ActionIcon variant="subtle" size="sm">
                            {/* <IconAdjustments size={16} /> */}
                        </ActionIcon>
                        }
                        style={{
                        backgroundColor: computedColorScheme === "dark" ? "#2a2a2a" : "#f8f9fa",
                        }}
                        onChange={(e) => {
                        // Handle search functionality
                        console.log("Search:", e.currentTarget.value);
                        }}
                    />
                    </Box>

                    {/* Area Article List */}
                    <ScrollArea style={{
                    flex: 1,
                    minHeight: "400px",
                    overflow: "auto"
                    }}>
                    {article.length === 0 ? (
                        <Box ta="center" py="xl">
                        <Text size="sm" c="dimmed">
                            No sources found
                        </Text>
                        </Box>
                    ) : (
                        <Stack gap="md">
                        {article.map((item, i) => (
                            <Box
                            key={item.id}
                            p="md"
                            style={{
                                backgroundColor: computedColorScheme === "dark" ? "#1a1a1a" : "#ffffff",
                                borderRadius: "8px",
                                border: `1px solid ${computedColorScheme === "dark" ? "#333" : "#e9ecef"}`,
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                backgroundColor: computedColorScheme === "dark" ? "#2a2a2a" : "#f8f9fa",
                                borderColor: computedColorScheme === "dark" ? "#444" : "#dee2e6"
                                }
                            }}
                            onClick={() => {
                                // Handle article click
                                console.log("Clicked article:", item);
                            }}
                            >
                            {/* Article Icon and Content */}
                            <Group gap="sm" align="flex-start">
                                {/* Document Icon */}
                                <Box
                                style={{
                                    width: "20px",
                                    height: "20px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    marginTop: "2px"
                                }}
                                >
                                <IconFileText 
                                    size={16} 
                                    color={computedColorScheme === "dark" ? "#888" : "#6c757d"} 
                                />
                                </Box>

                                {/* Article Content */}
                                <Box style={{ flex: 1, minWidth: 0 }}>
                                {/* Article Title */}
                                <Title 
                                    order={6} 
                                    style={{ 
                                    margin: 0, 
                                    lineHeight: 1.4,
                                    fontWeight: 600,
                                    fontSize: "14px",
                                    color: computedColorScheme === "dark" ? "#fff" : "#212529"
                                    }}
                                >
                                    {item.title}
                                </Title>

                                {/* Article Description/Background */}
                                {item.att_background && (
                                    <Text 
                                    size="xs" 
                                    c="dimmed" 
                                    mt={4}
                                    style={{
                                        lineHeight: 1.4,
                                        fontSize: "12px",
                                        overflow: "hidden",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical"
                                    }}
                                    >
                                    {item.att_background}
                                    </Text>
                                )}
                                
                                {/* Article Metadata */}
                                <Text 
                                    size="xs" 
                                    c="dimmed" 
                                    mt={2}
                                    style={{
                                    lineHeight: 1.3,
                                    fontSize: "12px"
                                    }}
                                >
                                    ID: {item.id}
                                </Text>

                                </Box>

                                {/* Star/Favorite Icon */}
                                <ActionIcon
                                variant="subtle"
                                size="sm"
                                color="yellow"
                                style={{ flexShrink: 0 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("Star article:", item);
                                }}
                                >
                                <IconStar size={16} />
                                </ActionIcon>
                            </Group>
                            </Box>
                        ))}
                        </Stack>
                    )}
                    </ScrollArea>
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