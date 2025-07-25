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
  Paper,
  Badge,
  Divider,

} from "@mantine/core";

import {useDisclosure, useDebouncedCallback, useMediaQuery} from "@mantine/hooks";
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
   IconList,
   IconHistory,
   IconTrash,
   IconNumber,
   IconDotsVertical,

  } from "@tabler/icons-react";
import classes from '../container.module.css';
import myimage from '../imageCollection/LogoSRE_Fix.png';
import knowledgeImage from '../imageCollection/graph.png';
import { useState, useEffect, useRef, useMemo } from 'react';
import Split from 'react-split';

import { useParams, useRouter } from 'next/navigation';

interface Article {
    id: string,
    title: string,
    att_background: string,
    att_url: string,
}

interface Bibliography {
  id: string; // ID unik untuk bibliography
  sourceId?: string; // ID artikel sumber (jika berasal dari artikel)
  number: number; // Nomor urut dalam daftar pustaka
  author: string; // Nama penulis
  title: string; // Judul karya
  year: string; // Tahun publikasi
  publisher?: string; // Penerbit (opsional)
  url?: string; // URL sumber (opsional)
  journal?: string; // Nama jurnal (opsional)
  volume?: string; // Volume jurnal (opsional)
  issue?: string; // Nomor terbitan (opsional)
  pages?: string; // Halaman (opsional)
  accessDate?: string; // Tanggal akses (opsional)
  doi?: string; // Digital Object Identifier (opsional)
  edition?: string; // Edisi buku (opsional)
  city?: string; // Kota penerbit (opsional)
  conference?: string; // Nama konferensi (opsional)
  medium?: string; // Media publikasi (opsional)
  createdAt: Date; // Tanggal dibuat
}

interface HeadingItem {
  id: string; // ID unik heading
  text: string; // Teks heading
  level: number; // Level heading (1-6)
}

interface HistoryItem {
  id: string; // ID unik riwayat
  timestamp: Date; // Waktu penyimpanan
  aiPercentage: number; // Persentase deteksi AI
  wordCount: number; // Jumlah kata
  title: string; // Judul artikel
}

interface AICheckResult {
  percentage: number; // Persentase akhir (maksimal dari kedua checker)
  gptzero: {
    // Hasil dari GPTZero
    aiPercentage: number;
    source: string;
    error?: boolean;
  };
  westlake: {
    // Hasil dari Westlake
    aiPercentage: number;
    source: string;
    error?: boolean;
  };
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

  const [activeTab, setActiveTab] = useState("chat");
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [fileName, setFileName] = useState("Judul Artikel 1");
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  // State untuk daftar artikel dari API
  const [article, setArticle] = useState<Article[]>([]);

  const sendMessage = () => {
    if (chatInput.trim() === '') return;
    setMessages((prev) => [...prev, chatInput]);
    setChatInput('');
  };

  const filteredArticles = article.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.att_background.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
  );
  //for article
  const [mounted, setMounted] = useState(false);
  
  // State untuk daftar pustaka
  const [bibliographyList, setBibliographyList] = useState<Bibliography[]>([]);

  // State untuk nomor berikutnya dalam daftar pustaka
  const [nextNumber, setNextNumber] = useState(1);

  // Ref untuk mencegah sinkronisasi berulang
  const isSyncingRef = useRef(false);
  const bibliographyListRef = useRef(bibliographyList);

  // State untuk konten editor
  const [content, setContent] = useState(
    "Mulai menulis artikel Anda di sini..."
  );

  // State untuk riwayat penyimpanan
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isProcessingFinal, setIsProcessingFinal] = useState(false);

  useEffect(() => {
    bibliographyListRef.current = bibliographyList;
  }, [bibliographyList]);

  const [
    bibliographyModalOpened,
    { open: openBibliographyModal, close: closeBibliographyModal },
  ] = useDisclosure(false);

  const [editingBibliography, setEditingBibliography] =
    useState<Bibliography | null>(null);

  // State untuk form bibliography
  const [bibliographyForm, setBibliographyForm] = useState({
    author: "",
    title: "",
    year: "",
    publisher: "",
    url: "",
    journal: "",
    volume: "",
    issue: "",
    pages: "",
    accessDate: "",
    doi: "",
    edition: "",
    city: "",
    conference: "",
    medium: "",
  });

  const checkWithGPTZero = async (text: string) => {
    try {
      const response = await fetch("https://api.gptzero.me/v2/predict/text", {
        method: "POST",
        headers: {
          Authorization: `Bearer sk-edac13773d642e042aa92a4fa1632bb6`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document: text,
          version: "2024-01-09",
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("GPTZero Error Response:", errorData);
        throw new Error(
          `GPTZero request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      console.log("GPTZero Response:", data);

      return {
        aiPercentage: Math.round(
          (data.documents?.[0]?.average_generated_prob || 0) * 100
        ),
        source: "GPTZero",
      };
    } catch (error) {
      console.error("GPTZero Error:", error);
      return { aiPercentage: 0, source: "GPTZero", error: true };
    }
  };


  const checkWithWestlake = async (text: string) => {
    try {
      const response = await fetch("https://api.westlake.ai/v1/detect", {
        method: "POST",
        headers: {
          Authorization: `Bearer sk-edac13773d642e042aa92a4fa1632bb6`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          model: "westlake-v1",
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Westlake Error Response:", errorData);
        throw new Error(
          `Westlake request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Westlake Response:", data);

      return {
        aiPercentage: Math.round((data.ai_probability || 0) * 100),
        source: "Westlake",
      };
    } catch (error) {
      console.error("Westlake Error:", error);
      return { aiPercentage: 0, source: "Westlake", error: true };
    }
  };

  /**
   * Fungsi utama untuk melakukan pengecekan AI menggunakan kedua API
   * @param content - Konten yang akan dicek
   * @returns Hasil gabungan dari kedua API checker
   */
  const performAICheck = async (content: string): Promise<AICheckResult> => {
    try {
      console.log("Starting AI check for content length:", content.length);

      // Jalankan kedua checker secara paralel
      const [gptzeroResult, westlakeResult] = await Promise.all([
        checkWithGPTZero(content),
        checkWithWestlake(content),
      ]);

      console.log("AI Check Results:", { gptzeroResult, westlakeResult });

      // Ambil persentase tertinggi sebagai hasil final
      const finalPercentage = Math.max(
        gptzeroResult.aiPercentage,
        westlakeResult.aiPercentage
      );

      return {
        percentage: finalPercentage,
        gptzero: gptzeroResult,
        westlake: westlakeResult,
      };
    } catch (error) {
      console.error("AI Check Error:", error);
      throw new Error("AI checking failed");
    }
  };

  // ============================
  // FUNGSI EKSTRAKSI HEADING
  // ============================

  /**
   * Fungsi untuk mengekstrak heading dari konten markdown
   * Menggunakan debounced callback untuk performa yang lebih baik
   */
  const extractHeadings = useDebouncedCallback(() => {
    // Jangan ekstrak jika sedang sinkronisasi
    if (isSyncingRef.current) return;

    const lines = content.split("\n");
    const newHeadings: HeadingItem[] = [];

    // Scan setiap baris untuk mencari heading markdown
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("#")) {
        // Hitung level heading berdasarkan jumlah #
        const level = (trimmedLine.match(/^#+/) || [""])[0].length;
        const text = trimmedLine.replace(/^#+\s*/, "");
        if (text) {
          newHeadings.push({
            id: `heading-${index}`,
            text: text,
            level: Math.min(level, 6), // Maksimal level 6
          });
        }
      }
    });

    setHeadings(newHeadings);
  }, 500);

  /**
   * Fungsi untuk sinkronisasi daftar pustaka dengan konten
   * Menghapus bibliography yang tidak lagi dikutip dalam teks
   */
  const syncBibliographyWithContent = useDebouncedCallback(() => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    // Ekstrak heading terlebih dahulu
    extractHeadings();

    // Cari semua nomor sitasi yang masih ada di teks
    const citedNumbersInText = new Set(
      [...content.matchAll(/\[(\d+)\]/g)].map((match) => parseInt(match[1], 10))
    );
    const currentBibList = bibliographyListRef.current;

    // Filter bibliography yang masih dikutip
    const stillCitedItems = currentBibList.filter((item) =>
      citedNumbersInText.has(item.number)
    );

    // Update state jika ada perubahan
    if (stillCitedItems.length !== currentBibList.length) {
      setBibliographyList(stillCitedItems);
    }

    // Update nomor berikutnya
    const maxNumber = stillCitedItems.reduce(
      (max, item) => Math.max(max, item.number),
      0
    );
    setNextNumber(maxNumber + 1);
    isSyncingRef.current = false;
  }, 500);

  // Jalankan sinkronisasi setiap kali konten berubah
  useEffect(() => {
    syncBibliographyWithContent();
  }, [content, syncBibliographyWithContent]);

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

  const resetBibliographyForm = () => {
    setBibliographyForm({
      author: "",
      title: "",
      year: "",
      publisher: "",
      url: "",
      journal: "",
      volume: "",
      issue: "",
      pages: "",
      accessDate: "",
      doi: "",
      edition: "",
      city: "",
      conference: "",
      medium: "",
    });
  };

  const saveBibliography = () => {
    // Validasi field yang wajib diisi
    if (
      !bibliographyForm.author ||
      !bibliographyForm.title ||
      !bibliographyForm.year
    ) {
      alert("Mohon lengkapi field yang wajib diisi (Penulis, Judul, Tahun)!");
      return;
    }

    // Buat object bibliography baru
    const bibliographyData: Bibliography = {
      id: editingBibliography?.id || Date.now().toString(),
      number: editingBibliography?.number || nextNumber,
      author: bibliographyForm.author,
      title: bibliographyForm.title,
      year: bibliographyForm.year,
      publisher: bibliographyForm.publisher,
      url: bibliographyForm.url,
      journal: bibliographyForm.journal,
      volume: bibliographyForm.volume,
      issue: bibliographyForm.issue,
      pages: bibliographyForm.pages,
      accessDate: bibliographyForm.accessDate,
      doi: bibliographyForm.doi,
      edition: bibliographyForm.edition,
      city: bibliographyForm.city,
      conference: bibliographyForm.conference,
      medium: bibliographyForm.medium,
      createdAt: editingBibliography?.createdAt || new Date(),
    };

    // Update atau tambah bibliography
    if (editingBibliography) {
      setBibliographyList((prev) =>
        prev.map((b) =>
          b.id === editingBibliography.id ? bibliographyData : b
        )
      );
    } else {
      setBibliographyList((prev) => [...prev, bibliographyData]);
      insertCitationNumber(nextNumber);
    }

    // Tutup modal dan reset form
    closeBibliographyModal();
    resetBibliographyForm();
  };

  const handleDeleteBibliography = (itemToDelete: Bibliography) => {
    const numberToDelete = itemToDelete.number;
    // Hapus semua sitasi dengan nomor tersebut dari konten
    const regex = new RegExp(`\\[${numberToDelete}\\]`, "g");
    const newContent = content.replace(regex, "");
    setContent(newContent);
  };

  //Perlu diperhatikan
  const insertCitationNumber = (number: number) => {
    const citationText = `[${number}]`;
    setContent((prev) => prev + citationText);
  };

  const insertCitation = (bibliography: Bibliography) => {
    insertCitationNumber(bibliography.number);
  };

  const formatBibliography = (bibliography: Bibliography) => {
    const {
      author,
      title,
      year,
      publisher,
      journal,
      volume,
      issue,
      pages,
      url,
      doi,
      city,
    } = bibliography;

    let formatted = `${author} (${year}). ${title}.`;

    // Format untuk artikel jurnal
    if (journal) {
      formatted = `${author} (${year}). ${title}. *${journal}*${
        volume ? `, ${volume}` : ""
      }${issue ? `(${issue})` : ""}${pages ? `, pp. ${pages}` : ""}.${
        doi ? ` doi:${doi}` : ""
      }`;
    }
    // Format untuk buku
    else if (publisher) {
      formatted = `${author} (${year}). *${title}*. ${
        city ? city + ": " : ""
      }${publisher}.`;
    }
    // Format untuk sumber online
    else if (url) {
      formatted = `${author} (${year}). ${title}. Retrieved from ${url}`;
    }

    return formatted;
  };

  /**
   * Fungsi untuk generate daftar pustaka lengkap yang sudah diformat
   * @returns String daftar pustaka lengkap
   */
  const generateFullBibliography = () => {
    return bibliographyList
      .sort((a, b) => a.number - b.number)
      .map(
        (bibliography) =>
          `[${bibliography.number}] ${formatBibliography(bibliography)}`
      )
      .join("\n\n");
  };

  const addArticleToBibliography = (articleItem: Article) => {
    // Cek apakah artikel sudah ada dalam daftar pustaka
    const existingBibliography = bibliographyListRef.current.find(
      (b) => b.sourceId === articleItem.id
    );

    if (existingBibliography) {
      // Jika sudah ada, insert nomor sitasinya saja
      insertCitationNumber(existingBibliography.number);
      return;
    }

    // Buat bibliography baru dari artikel
    const newBibliography: Bibliography = {
      id: Date.now().toString(),
      sourceId: articleItem.id,
      number: nextNumber,
      author: "Unknown Author",
      title: articleItem.title,
      year: new Date().getFullYear().toString(),
      url: articleItem.att_url,
      publisher: articleItem.att_background,
      createdAt: new Date(),
    };

    setBibliographyList((prev) => [...prev, newBibliography]);
    insertCitationNumber(nextNumber);
  };

  /**
   * Fungsi untuk jump ke heading tertentu (placeholder)
   * @param headingId - ID heading yang akan dituju
   */
  const jumpToHeading = (headingId: string) => {
    const headingIndex = parseInt(headingId.split("-")[1]);
    const lines = content.split("\n");
    const targetLine = lines[headingIndex];
    if (targetLine) {
      // Implementasi sederhana - dalam aplikasi nyata akan scroll ke heading
      console.log("Jump to heading:", targetLine);
    }
  };

  /**
   * Fungsi untuk menyimpan artikel final dengan pengecekan AI
   */
  const handleFinalSave = async () => {
    setIsProcessingFinal(true);

    try {
      // Hitung jumlah kata
      const wordCount = content
        .split(/\s+/)
        .filter((word) => word.length > 0).length;

      // Validasi konten tidak kosong
      if (
        !content ||
        content.trim() === "" ||
        content.trim() === "Mulai menulis artikel Anda di sini..."
      ) {
        alert("Silakan tulis konten terlebih dahulu!");
        setIsProcessingFinal(false);
        return;
      }

      // Validasi minimal kata
      if (wordCount < 10) {
        alert("Konten terlalu pendek untuk dianalisis. Minimal 10 kata.");
        setIsProcessingFinal(false);
        return;
      }

      // Lakukan pengecekan AI
      console.log("Performing AI check...");
      const aiCheckResult = await performAICheck(content);
      console.log("AI check completed:", aiCheckResult);

      // Cek jika persentase AI terlalu tinggi
      if (aiCheckResult.percentage > 80) {
        alert(
          `Konten Anda memiliki tingkat AI ${aiCheckResult.percentage}% yang terlalu tinggi. ` +
            "Silakan edit konten Anda untuk mengurangi deteksi AI sebelum menyimpan final."
        );
        setIsProcessingFinal(false);
        return;
      }

      // Buat entry riwayat
      const historyEntry: HistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date(),
        aiPercentage: aiCheckResult.percentage,
        wordCount: wordCount,
        title: fileName,
      };

      setHistory((prev) => [historyEntry, ...prev]);

      console.log("Final Content:", content);
      console.log("AI Check Result:", aiCheckResult);

      // Tampilkan hasil
      alert(
        `Artikel berhasil disimpan!\n\n` +
          `Deteksi AI: ${aiCheckResult.percentage}%\n` +
          `GPTZero: ${aiCheckResult.gptzero.aiPercentage}%\n` +
          `Westlake: ${aiCheckResult.westlake.aiPercentage}%\n` +
          `Jumlah kata: ${wordCount}\n` +
          `Waktu: ${new Date().toLocaleString()}`
      );
    } catch (error) {
      console.error("Error saving final:", error);
      alert("Terjadi kesalahan saat menyimpan artikel. Silakan coba lagi.");
    } finally {
      setIsProcessingFinal(false);
    }
  };

  const handleSaveDraft = () => {
    console.log("Draft Content:", content);
    console.log("Bibliography:", bibliographyList);
    alert("Draft disimpan!");
  };

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
  const [searchQuery, setSearchQuery] = useState("");

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
                    { icon: <IconGraph size={20} />, value: "knowledge" },
                    { icon: <IconMessageCircle2 size={20} />, value: "chat" },
                    { icon: <IconList size={20} />, value: "bibliography" },
                    { icon: <IconHistory size={20} />, value: "history" },
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
                    {/* Header section dengan informasi */}
                    <Group align="center" justify="space-between" mb="md">
                      <Group align="center" gap="sm">
                        <Box
                          style={{
                            backgroundColor: "#007BFF",
                            padding: "8px",
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <IconList size={18} color="#fff" />
                        </Box>
                        <Box>
                          <Title
                            order={4}
                            style={{
                              margin: 0,
                              color: "#007BFF",
                              fontWeight: 700,
                            }}
                          >
                            Reference Manager ({article.length})
                          </Title>
                          <Text size="xs" c="dimmed" mt={-4}>
                            Kelola reference manager
                          </Text>
                        </Box>
                      </Group>
                    </Group>

                    <div
                      style={{
                        width: "100%",
                        height: "1px",
                        backgroundColor: "#ccc",
                        marginBottom: "12px",
                      }}
                    />

                    {/* Search box untuk pencarian artikel */}
                    <Box mb="md">
                      <TextInput
                        placeholder="Cari Artikel"
                        variant="filled"
                        leftSection={<IconSearch size={16} />}
                        value={searchQuery}
                        style={{
                          backgroundColor:
                            computedColorScheme === "dark"
                              ? "#2a2a2a"
                              : "#f8f9fa",
                        }}
                        onChange={(e) => {
                          setSearchQuery(e.currentTarget.value);
                        }}
                      />
                      {searchQuery && (
                        <Text size="xs" c="dimmed" mt="xs">
                          Ditemukan {filteredArticles.length} artikel
                        </Text>
                      )}
                    </Box>

                    {/* Area daftar artikel dengan scroll */}
                    <ScrollArea
                      style={{
                        flex: 1,
                        minHeight: "400px",
                        overflow: "auto",
                      }}
                    >
                      {filteredArticles.length === 0 ? (
                        <Box ta="center" py="xl">
                          <Text size="sm" c="dimmed">
                            {searchQuery
                              ? "Tidak ditemukan artikel yang sesuai dengan pencarian Anda"
                              : "Tidak ada sumber yang ditemukan"}
                          </Text>
                          {searchQuery && (
                            <Button
                              variant="subtle"
                              size="xs"
                              mt="sm"
                              onClick={() => setSearchQuery("")}
                            >
                              Hapus pencarian
                            </Button>
                          )}
                        </Box>
                      ) : (
                        <Stack gap="md">
                          {filteredArticles.map((item, i) => (
                            <Box
                              key={item.id}
                              p="md"
                              style={{
                                backgroundColor:
                                  computedColorScheme === "dark"
                                    ? "#1a1a1a"
                                    : "#ffffff",
                                borderRadius: "8px",
                                border: `1px solid ${
                                  computedColorScheme === "dark"
                                    ? "#333"
                                    : "#e9ecef"
                                }`,
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                  backgroundColor:
                                    computedColorScheme === "dark"
                                      ? "#2a2a2a"
                                      : "#f8f9fa",
                                  borderColor:
                                    computedColorScheme === "dark"
                                      ? "#444"
                                      : "#dee2e6",
                                },
                              }}
                              onClick={() => {
                                // Handle artikel diklik
                                console.log("Clicked article:", item);
                              }}
                            >
                              {/* Icon artikel dan konten */}
                              <Group gap="sm" align="flex-start">
                                {/* Icon dokumen */}
                                <Box
                                  style={{
                                    width: "20px",
                                    height: "20px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    marginTop: "2px",
                                  }}
                                >
                                  <IconFileText
                                    size={16}
                                    color={
                                      computedColorScheme === "dark"
                                        ? "#888"
                                        : "#6c757d"
                                    }
                                  />
                                </Box>

                                {/* Konten artikel */}
                                <Box style={{ flex: 1, minWidth: 0 }}>
                                  {/* Judul artikel */}
                                  <Title
                                    order={6}
                                    style={{
                                      margin: 0,
                                      lineHeight: 1.4,
                                      fontWeight: 600,
                                      fontSize: "14px",
                                      color:
                                        computedColorScheme === "dark"
                                          ? "#fff"
                                          : "#212529",
                                    }}
                                  >
                                    {item.title}
                                  </Title>

                                  {/* Deskripsi/background artikel */}
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
                                        WebkitBoxOrient: "vertical",
                                      }}
                                    >
                                      {item.att_background}
                                    </Text>
                                  )}

                                  {/* Metadata artikel */}
                                  <Text
                                    size="xs"
                                    c="dimmed"
                                    mt={2}
                                    style={{
                                      lineHeight: 1.3,
                                      fontSize: "12px",
                                    }}
                                  >
                                    ID: {item.id}
                                  </Text>
                                </Box>

                                {/* Icon star/favorite */}
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

                              {/* Tombol aksi artikel */}
                              <Group gap="md" mt="sm">
                                {/* Tombol cite - tambah ke bibliography */}
                                <Button
                                  variant="subtle"
                                  color="blue"
                                  size="compact-sm"
                                  leftSection={<IconPlus size={14} />}
                                  style={{ padding: 0, height: "auto" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addArticleToBibliography(item);
                                  }}
                                >
                                  Cite
                                </Button>

                                {/* Tombol view - buka URL artikel */}
                                <Button
                                  variant="subtle"
                                  color="gray"
                                  size="compact-sm"
                                  leftSection={<IconExternalLink size={14} />}
                                  style={{ padding: 0, height: "auto" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.att_url) {
                                      window.open(item.att_url, "_blank");
                                    }
                                  }}
                                >
                                  View
                                </Button>

                                {/* Tombol AI chat - analisis dengan AI */}
                                <Button
                                  variant="subtle"
                                  color="gray"
                                  size="compact-sm"
                                  leftSection={<IconMessageCircle size={14} />}
                                  style={{ padding: 0, height: "auto" }}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const prompt = `Analyze this article: ${item.title} - ${item.att_background}`;
                                    alert(
                                      `AI Analysis feature will be available soon.`
                                    );
                                  }}
                                >
                                  AI Chat
                                </Button>
                              </Group>
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </ScrollArea>
                  </>
                )}

                {activeTab === "bibliography" && (
                  <>
                    {/* Header dengan info jumlah bibliography */}
                    <Group align="center" justify="space-between" mb="md">
                      <Group align="center" gap="sm">
                        <Box
                          style={{
                            backgroundColor: "#007BFF",
                            padding: "8px",
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <IconList size={18} color="#fff" />
                        </Box>
                        <Box>
                          <Title
                            order={4}
                            style={{
                              margin: 0,
                              color: "#007BFF",
                              fontWeight: 700,
                            }}
                          >
                            Daftar Pustaka ({bibliographyList.length})
                          </Title>
                          <Text size="xs" c="dimmed" mt={-4}>
                            Kelola sitasi Anda
                          </Text>
                        </Box>
                      </Group>
                    </Group>

                    {/* Area daftar bibliography dengan scroll */}
                    <ScrollArea
                      style={{
                        flex: 1,
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        padding: "8px",
                        backgroundColor:
                          computedColorScheme === "dark" ? "#1e1e1e" : "#fff",
                        minHeight: "200px",
                        maxHeight: "350px",
                        overflow: "auto",
                      }}
                    >
                      {bibliographyList.length === 0 ? (
                        <Text size="xs" c="dimmed" ta="center" mt="xl">
                          Belum ada daftar pustaka. Gunakan tombol "Cite" pada
                          artikel referensi untuk menambah.
                        </Text>
                      ) : (
                        <Stack gap="xs">
                          {bibliographyList
                            .sort((a, b) => a.number - b.number)
                            .map((bibliography) => (
                              <Paper
                                key={bibliography.id}
                                p="sm"
                                withBorder
                                style={{
                                  backgroundColor:
                                    computedColorScheme === "dark"
                                      ? "#2a2a2a"
                                      : "#fff",
                                  cursor: "pointer",
                                  borderLeft: "4px solid #007BFF",
                                  transition: "all 0.2s ease",
                                }}
                                onClick={() => insertCitation(bibliography)}
                              >
                                <Group
                                  justify="space-between"
                                  align="flex-start"
                                >
                                  <Box style={{ flex: 1 }}>
                                    {/* Badge nomor dan tipe */}
                                    <Group gap="xs" mb="xs">
                                      <Badge
                                        size="sm"
                                        color="blue"
                                        variant="filled"
                                        style={{ borderRadius: "4px" }}
                                      >
                                        [{bibliography.number}]
                                      </Badge>
                                      <Badge
                                        size="xs"
                                        color="gray"
                                        variant="light"
                                      >
                                        {bibliography.journal
                                          ? "Jurnal"
                                          : bibliography.publisher
                                          ? "Buku"
                                          : "Lainnya"}
                                      </Badge>
                                    </Group>

                                    {/* Informasi penulis */}
                                    <Text
                                      size="sm"
                                      fw={600}
                                      lineClamp={1}
                                      mb="xs"
                                    >
                                      {bibliography.author}
                                    </Text>

                                    {/* Judul dan tahun */}
                                    <Text
                                      size="xs"
                                      c="dimmed"
                                      lineClamp={2}
                                      mb="xs"
                                    >
                                      {bibliography.title} ({bibliography.year})
                                    </Text>

                                    {/* Publisher atau journal */}
                                    {(bibliography.publisher ||
                                      bibliography.journal) && (
                                      <Text size="xs" c="dimmed" lineClamp={1}>
                                        {bibliography.journal ||
                                          bibliography.publisher}
                                      </Text>
                                    )}
                                  </Box>

                                  {/* Menu aksi untuk setiap bibliography */}
                                  <Menu shadow="md" width={120}>
                                    <Menu.Target>
                                      <ActionIcon
                                        variant="subtle"
                                        color="gray"
                                        size="sm"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <IconDotsVertical size={14} />
                                      </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                      {/* Insert nomor sitasi */}
                                      <Menu.Item
                                        leftSection={<IconNumber size={14} />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          insertCitation(bibliography);
                                        }}
                                      >
                                        Insert [{bibliography.number}]
                                      </Menu.Item>
                                      <Menu.Divider />
                                      {/* Hapus bibliography */}
                                      <Menu.Item
                                        color="red"
                                        leftSection={<IconTrash size={14} />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteBibliography(
                                            bibliography
                                          );
                                        }}
                                      >
                                        Delete
                                      </Menu.Item>
                                    </Menu.Dropdown>
                                  </Menu>
                                </Group>
                              </Paper>
                            ))}
                        </Stack>
                      )}
                    </ScrollArea>

                    {/* Preview daftar pustaka terformat */}
                    {bibliographyList.length > 0 && (
                      <>
                        <Divider my="md" />
                        <Group justify="space-between" align="center" mb="sm">
                          <Text size="sm" fw={600} c="#007BFF">
                            Preview Daftar Pustaka
                          </Text>
                          {/* Tombol copy ke clipboard */}
                          <Tooltip label="Copy bibliography">
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  generateFullBibliography()
                                );
                                alert("Daftar pustaka disalin ke clipboard!");
                              }}
                            >
                              <IconFileText size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>

                        {/* Area preview bibliography terformat */}
                        <ScrollArea
                          style={{
                            maxHeight: "120px",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            padding: "8px",
                            backgroundColor:
                              computedColorScheme === "dark"
                                ? "#1e1e1e"
                                : "#f8f9fa",
                          }}
                        >
                          <Text
                            size="xs"
                            style={{
                              fontFamily: "monospace",
                              lineHeight: 1.4,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {generateFullBibliography()}
                          </Text>
                        </ScrollArea>
                      </>
                    )}

                    <Text size="xs" c="dimmed" ta="center" mt="sm">
                      Klik item untuk insert [nomor] ke teks
                    </Text>
                  </>
                )}

                {activeTab === "history" && (
                  <>
                    {/* Header dengan info jumlah riwayat */}
                    <Group align="center" justify="space-between" mb="md">
                      <Group align="center" gap="sm">
                        <Box
                          style={{
                            backgroundColor: "#007BFF",
                            padding: "8px",
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <IconHistory size={18} color="#fff" />
                        </Box>
                        <Box>
                          <Title
                            order={4}
                            style={{
                              margin: 0,
                              color: "#007BFF",
                              fontWeight: 700,
                            }}
                          >
                            Riwayat ({history.length})
                          </Title>
                          <Text size="xs" c="dimmed" mt={-4}>
                            Lihat riwayat penyimpanan
                          </Text>
                        </Box>
                      </Group>
                    </Group>

                    {/* Area daftar riwayat dengan scroll */}
                    <ScrollArea style={{ flex: 1, minHeight: "400px" }}>
                      {history.length === 0 ? (
                        <Text size="xs" c="dimmed" ta="center" py="sm">
                          Belum ada riwayat. Klik "Simpan Final" untuk membuat
                          catatan.
                        </Text>
                      ) : (
                        <Stack gap="xs">
                          {history.map((item) => (
                            <Paper
                              key={item.id}
                              p="xs"
                              withBorder
                              style={{
                                backgroundColor:
                                  computedColorScheme === "dark"
                                    ? "#1e1e1e"
                                    : "#fff",
                              }}
                            >
                              <Group justify="space-between" align="center">
                                <Box style={{ flex: 1 }}>
                                  {/* Judul artikel */}
                                  <Text size="xs" fw={500} lineClamp={1}>
                                    {item.title}
                                  </Text>
                                  {/* Tanggal penyimpanan */}
                                  <Text size="xs" c="dimmed">
                                    {item.timestamp.toLocaleDateString()}
                                  </Text>
                                </Box>
                                {/* Badge persentase AI dengan warna sesuai tingkat */}
                                <Badge
                                  size="sm"
                                  color={
                                    item.aiPercentage > 80
                                      ? "red"
                                      : item.aiPercentage > 50
                                      ? "yellow"
                                      : "green"
                                  }
                                  variant="filled"
                                >
                                  {item.aiPercentage}%
                                </Badge>
                              </Group>
                            </Paper>
                          ))}
                        </Stack>
                      )}
                    </ScrollArea>
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