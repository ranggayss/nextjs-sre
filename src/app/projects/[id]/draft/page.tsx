"use client"

import dynamic from 'next/dynamic';
import { notifications } from '@mantine/notifications';
import { useState, useEffect, useRef, useMemo } from 'react';
import { ExtendedEdge, ExtendedNode } from '../../../../types';
import type { BlockNoteEditorRef } from '@/components/BlockNoteEditor';
import AnnotationPanel from '@/components/AnnotationPanel';
import ChatPanel from '@/components/ChatPanel';

const BlockNoteEditorComponent = dynamic(() => import("../../../../components/BlockNoteEditor"), {
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
  Loader,
  Modal,
  Center,
  Alert,
  Grid,
  RingProgress,
  Progress,
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
   IconHighlight,
   IconRobot,
   IconEdit,
   IconAlertCircle,
   IconAlertTriangle,
   IconX,
   IconCircleCheck,
   IconBulb,
   IconShieldCheck,
   IconScan,
  } from "@tabler/icons-react";
import classes from '../../../container.module.css';
import myimage from '../../../imageCollection/LogoSRE_Fix.png';
import knowledgeImage from '../../../imageCollection/graph.png';
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
  id: string; // ID unik entry history
  timestamp: Date; // Waktu penyimpanan
  aiPercentage?: number; // Persentase AI detection (hanya untuk final submission)
  wordCount: number; // Jumlah kata dalam dokumen
  title: string; // Judul dokumen saat disimpan
  version: string; // Versi dokumen ("Versi 1", "Versi 2", "Final")
  type: "draft" | "final"; // Tipe penyimpanan: draft atau final submission
  assignmentCode?: string; // Kode assignment dari dosen (untuk final submission)
}

interface AICheckResult {
  percentage: number; // Persentase kemungkinan konten dibuat oleh AI (0-100%)
  isHuman: boolean; // True jika konten dianggap human-written (≤10% AI)
  confidence: number; // Tingkat confidence analisis (0-100%)
  analysis: {
    // Detail analisis teknis
    textLength: number; // Panjang teks dalam karakter
    sentences: number; // Jumlah kalimat
    avgSentenceLength: number; // Rata-rata panjang kalimat dalam kata
    complexity: "Low" | "Medium" | "High"; // Tingkat kompleksitas teks
    humanSentences: number; // Jumlah kalimat yang terdeteksi human-written
    aiSentences: number; // Jumlah kalimat yang terdeteksi AI-generated
    mixedSentences: number; // Jumlah kalimat dengan karakteristik campuran
  };
  recommendation: string; // Rekomendasi berdasarkan hasil analisis
  highlightedContent: string; // Konten dengan highlighting per kalimat (HTML)
  sentenceAnalysis: Array<{
    // Analisis detail per kalimat
    text: string; // Teks kalimat
    probability: number; // Probabilitas AI (0-1)
    type: "human" | "ai" | "mixed"; // Klasifikasi kalimat
  }>;
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
  const [draftCounter, setDraftCounter] = useState(1); // Counter untuk versi draft
  // State untuk daftar artikel dari API
  const [article, setArticle] = useState<Article[]>([]);

  const sendMessage = () => {
    if (chatInput.trim() === '') return;
    setMessages((prev) => [...prev, chatInput]);
    setChatInput('');
  };

  const [searchQuery, setSearchQuery] = useState("");

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
  const [isScanning, setIsScanning] = useState(false);
  const [scanningProgress, setScanningProgress] = useState(0); // Progress bar AI scanning (0-100%)
  const [scanningText, setScanningText] = useState("Memulai analisis..."); // Teks status scanning
  const [aiCheckResult, setAiCheckResult] = useState<AICheckResult | null>(
    null
  ); // Hasil AI detection
  const [assignmentCode, setAssignmentCode] = useState("");

  const [
    aiResultModalOpened, // Modal hasil AI detection
    { open: openAIResultModal, close: closeAIResultModal },
  ] = useDisclosure(false);
  const [
    bibliographyModalOpened, // Modal form bibliography
    { open: openBibliographyModal, close: closeBibliographyModal },
  ] = useDisclosure(false);

  useEffect(() => {
    bibliographyListRef.current = bibliographyList;
  }, [bibliographyList]);

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

  const analyzeSentences = (text: string) => {
    // Pisahkan teks menjadi kalimat berdasarkan tanda baca
    const sentences = text
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim());

    // Simulasi analisis per kalimat (dalam implementasi nyata, ini bisa menggunakan ML model)
    return sentences.map((sentence) => {
      const probability = Math.random(); // Simulasi probabilitas AI
      let type: "human" | "ai" | "mixed";

      // Klasifikasi berdasarkan probabilitas
      if (probability < 0.15) {
        type = "ai"; // Kalimat terdeteksi AI-generated
      } else if (probability < 0.25) {
        type = "mixed"; // Kalimat dengan karakteristik campuran
      } else {
        type = "human"; // Kalimat terdeteksi human-written
      }

      return {
        text: sentence,
        probability: Math.round(probability * 100) / 100,
        type,
      };
    });
  };

  const createHighlightedContent = (
    sentenceAnalysis: Array<{
      text: string;
      probability: number;
      type: "human" | "ai" | "mixed";
    }>
  ) => {
    return sentenceAnalysis
      .map((analysis) => {
        // Tentukan warna highlighting berdasarkan tipe kalimat
        const color =
          analysis.type === "ai"
            ? "#ff6b6b" // Merah untuk AI-generated
            : analysis.type === "mixed"
            ? "#ffd43b" // Kuning untuk mixed
            : "#51cf66"; // Hijau untuk human-written

        // Wrap kalimat dengan span berwarna
        return `<span style="background-color: ${color}; padding: 2px 4px; border-radius: 3px; margin: 1px;">${analysis.text}</span>`;
      })
      .join(". ");
  };

  const checkWithGPTZero = async (text: string): Promise<AICheckResult> => {
    // Set status scanning dimulai
    setIsScanning(true);
    setScanningProgress(0);
    setScanningText("Memulai analisis...");

    try {
      // Simulasi tahapan scanning dengan progress indicator
      const scanningSteps = [
        { progress: 15, text: "Menghubungi GPTZero API..." },
        { progress: 30, text: "Memproses teks..." },
        { progress: 50, text: "Menganalisis struktur kalimat..." },
        { progress: 70, text: "Mendeteksi pola AI..." },
        { progress: 85, text: "Mengevaluasi originalitas..." },
        { progress: 95, text: "Menyelesaikan analisis..." },
        { progress: 100, text: "Analisis selesai!" },
      ];

      // Update progress bar secara bertahap untuk user experience
      for (const step of scanningSteps) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        setScanningProgress(step.progress);
        setScanningText(step.text);
      }

      // PANGGILAN API GPTZERO - Inti dari sistem AI detection
      const response = await fetch("https://api.gptzero.me/v2/predict/text", {
        method: "POST",
        headers: {
          accept: "application/json",
          "X-Api-Key": "7eef19cc7e18431ea60d89ef63b3b6b0", // API Key GPTZero
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document: text, // Teks yang akan dianalisis
        }),
      });

      // Validasi response dari API
      if (!response.ok) {
        throw new Error(`GPTZero API error: ${response.status}`);
      }

      const gptZeroResult = await response.json();
      console.log("GPTZero Response:", gptZeroResult);

      // Analisis kalimat untuk UI highlighting
      const sentenceAnalysis = analyzeSentences(text);
      const highlightedContent = createHighlightedContent(sentenceAnalysis);

      // Extract hasil dari GPTZero API
      const aiProbability =
        gptZeroResult.documents[0]?.class_probabilities?.ai || 0;
      const percentage = Math.round(aiProbability * 100); // Konversi ke persentase
      const confidence = Math.round((1 - aiProbability) * 100); // Confidence score
      // Hitung statistik kalimat untuk analisis detail
      const humanSentences = sentenceAnalysis.filter(
        (s) => s.type === "human"
      ).length;
      const aiSentences = sentenceAnalysis.filter(
        (s) => s.type === "ai"
      ).length;
      const mixedSentences = sentenceAnalysis.filter(
        (s) => s.type === "mixed"
      ).length;

      // Analisis karakteristik teks
      const sentences = sentenceAnalysis.length;
      const words = text.split(/\s+/).filter((w) => w.length > 0).length;
      const avgSentenceLength =
        sentences > 0 ? Math.round(words / sentences) : 0;

      // Tentukan tingkat kompleksitas berdasarkan panjang rata-rata kalimat
      let complexity: "Low" | "Medium" | "High" = "Medium";
      if (avgSentenceLength < 10) complexity = "Low";
      else if (avgSentenceLength > 20) complexity = "High";

      // Generate rekomendasi berdasarkan persentase AI detection
      let recommendation = "";
      if (percentage <= 10) {
        recommendation = "Konten Anda terlihat alami dan original. Bagus!";
      } else if (percentage <= 30) {
        recommendation =
          "Ada sedikit indikasi AI. Pertimbangkan untuk merevisi beberapa bagian yang disorot.";
      } else {
        recommendation =
          "Konten menunjukkan karakteristik AI yang kuat. Silakan revisi bagian yang disorot merah dan kuning.";
      }

      // Susun hasil analisis lengkap
      const result = {
        percentage,
        isHuman: percentage <= 10, // Threshold 10% untuk dianggap human-written
        confidence,
        analysis: {
          textLength: text.length,
          sentences,
          avgSentenceLength,
          complexity,
          humanSentences,
          aiSentences,
          mixedSentences,
        },
        recommendation,
        highlightedContent,
        sentenceAnalysis,
      };

      // Delay untuk efek loading yang smooth
      await new Promise((resolve) => setTimeout(resolve, 500));

      return result;
    } catch (error) {
      console.error("GPTZero Error:", error);

      // Fallback jika API gagal - gunakan data simulasi untuk testing
      const percentage = Math.round(Math.random() * 15);
      const sentenceAnalysis = analyzeSentences(text);

      return {
        percentage,
        isHuman: percentage <= 10,
        confidence: 85,
        analysis: {
          textLength: text.length,
          sentences: sentenceAnalysis.length,
          avgSentenceLength: 15,
          complexity: "Medium",
          humanSentences: Math.round(sentenceAnalysis.length * 0.8),
          aiSentences: Math.round(sentenceAnalysis.length * 0.1),
          mixedSentences: Math.round(sentenceAnalysis.length * 0.1),
        },
        recommendation:
          percentage <= 10
            ? "Konten Anda terlihat alami dan original. Bagus!"
            : "Silakan revisi untuk mengurangi deteksi AI.",
        highlightedContent: createHighlightedContent(sentenceAnalysis),
        sentenceAnalysis,
      };
    } finally {
      setIsScanning(false); // Pastikan status scanning direset
    }
  };

  const handleSubmitToTeacher = () => {
    if (!assignmentCode.trim()) {
      alert("Mohon masukkan kode assignment!");
      return;
    }

    if (!aiCheckResult) return;

    const wordCount = content
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    // Buat entry riwayat untuk final submission
    const historyEntry: HistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date(),
      aiPercentage: aiCheckResult.percentage,
      wordCount: wordCount,
      title: fileName,
      version: "Final",
      type: "final",
      assignmentCode: assignmentCode,
    };

    setHistory((prev) => [historyEntry, ...prev]);

    console.log("Final submission:", {
      content,
      aiResult: aiCheckResult,
      assignmentCode,
    });

    alert(
      `Artikel berhasil dikirim!\nKode Assignment: ${assignmentCode}\nDeteksi AI: ${aiCheckResult.percentage}%`
    );

    closeAIResultModal();
    setAssignmentCode("");
  };

  /**
   * Fungsi utama untuk melakukan pengecekan AI menggunakan kedua API
   * @param content - Konten yang akan dicek
   * @returns Hasil gabungan dari kedua API checker
   */
  // const performAICheck = async (content: string): Promise<AICheckResult> => {
  //   try {
  //     console.log("Starting AI check for content length:", content.length);

  //     // Jalankan kedua checker secara paralel
  //     const [gptzeroResult, westlakeResult] = await Promise.all([
  //       checkWithGPTZero(content),
  //       checkWithWestlake(content),
  //     ]);

  //     console.log("AI Check Results:", { gptzeroResult, westlakeResult });


  //     return {
  //       percentage: finalPercentage,
  //       gptzero: gptzeroResult,
  //       westlake: westlakeResult,
  //     };
  //   } catch (error) {
  //     console.error("AI Check Error:", error);
  //     throw new Error("AI checking failed");
  //   }
  // };

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

  const editorRef = useRef<BlockNoteEditorRef>(null);

  const addArticleToBibliography = (articleItem: Article) => {
    // Cek apakah artikel sudah ada dalam daftar pustaka
    const existingBibliography = bibliographyListRef.current.find(
      (b) => b.sourceId === articleItem.id
    );

    if (existingBibliography) {
      // Jika sudah ada, insert nomor sitasinya saja
      editorRef.current?.insertCitation?.(`[${existingBibliography.number}]`);
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
    editorRef.current?.insertCitation?.(`[${nextNumber}]`);
    setNextNumber((n) => n + 1);
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

  const convertEditorContentToPlainText = (blocks: any[]): string => {
    return blocks
      .map((block) =>
        (block.content || [])
          .map((item: any) => (typeof item === 'string' ? item : item.text || ''))
          .join('')
      )
      .join('\n\n')
      .trim();
  };
  
  const extractTextFromBlockNote = (blocks: any[]): string => {
    return blocks
      .map((block) => {
        if (!block || !block.content) return "";
        if (typeof block.content === "string") return block.content;
        if (Array.isArray(block.content)) {
          return block.content
            .map((item: any) => (typeof item === "string" ? item : item?.text || ""))
            .join(" ");
        }
        return "";
      })
      .join("\n")
      .trim();
  };
  
  /**
   * Fungsi untuk menyimpan artikel final dengan pengecekan AI
   */
  const handleFinalSave = async () => {
    try {
      const blocks = editorRef.current?.getContent() || [];
      const contentText = extractTextFromBlockNote(blocks);

      if (!contentText || contentText.trim().length < 10) {
        alert("Konten artikel masih kosong atau terlalu pendek.");
        return;
      }

      const wordCount = contentText
        .split(/\s+/)
        .filter((word) => word.length > 0).length;

      if (wordCount < 10) {
        alert("Konten terlalu pendek untuk dianalisis. Minimal 10 kata.");
        return;
      }

      setIsScanning(true); // start overlay
      setScanningText("Menganalisis kalimat...");
      setScanningProgress(25);

      const result = await checkWithGPTZero(contentText);

      setScanningText("Memproses hasil akhir...");
      setScanningProgress(80);

      setAiCheckResult(result);
      openAIResultModal();

      setScanningProgress(100);
    } catch (error) {
      console.error("❌ Error in final save:", error);
      alert("Terjadi kesalahan saat menganalisis artikel. Silakan coba lagi.");
    } finally {
      setTimeout(() => {
        setIsScanning(false);
        setScanningProgress(0);
        setScanningText("Memulai analisis...");
      }, 500); // beri sedikit delay agar smooth
    }
  };

  const handleSaveDraft = async () => {
    const editorInstance = editorRef.current?.getEditor?.();
    const contentBlocks = editorInstance?.document;

    // Gabungkan semua isi jadi teks utuh
    const contentText = contentBlocks
      ?.map((block: any) => {
        if (typeof block.content === 'string') return block.content;
        if (Array.isArray(block.content)) {
          return block.content.map((c: any) => c.text || '').join('');
        }
        return '';
      })
      .join('\n')
      .trim();

    const wordCount = contentText?.split(/\s+/).filter(Boolean).length || 0;

    if (!contentText || wordCount === 0) {
      notifications.show({
        title: "Konten Kosong",
        message: "Silakan tulis konten terlebih dahulu!",
        color: "red",
      });
      return;
    }

    // ✨ Ambil judul dari heading pertama
    let title = "Judul Artikel " + draftCounter;
    const headingBlock = contentBlocks?.find(
      (block: any) => block.type === "heading"
    );

    if (headingBlock && Array.isArray(headingBlock.content)) {
      title = headingBlock.content.map((c: any) => c.text || '').join('').trim();
    }

    const draftEntry: HistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date(),
      wordCount,
      title,
      version: `Versi ${draftCounter}`,
      type: "draft",
      aiPercentage: undefined,
    };

    setHistory((prev) => [draftEntry, ...prev]);
    setDraftCounter((prev) => prev + 1);

    notifications.show({
      title: "Berhasil",
      message: "Draf berhasil disimpan.",
      color: "green",
    });
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

  useEffect(() => {
    if (activeTab !== 'chat') {
      // Reset context saat pindah dari chat ke tab lain
      setResetChatContext(true)
    }
  }, [activeTab]);

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

  const handleSaveFinal = () => {
    console.log('Final:', editorContent);
    alert('Artikel final disimpan!');
  };

  //Tambahan Untuk List of Note
  const params = useParams();
  const rawSessionId = params?.id;
  const sessionIdN = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  
  //for reset
  const [resetChatContext, setResetChatContext] = useState(false);
  const handleContextReset = () => {
    setResetChatContext(false);
  }

  const [selectedNode, setSelectedNode] = useState<ExtendedNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<ExtendedEdge | null>(null);

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
                width: 240,
                flexShrink: 0,
                flexGrow: 0,
                flexBasis: 240,
                border: '1px solid #ccc',
                borderRadius: '8px',
                backgroundColor: computedColorScheme === 'dark' ? '#2a2a2a' : '#f9f9f9',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 140px)',
                overflowY: 'auto',
                boxSizing: "border-box",
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
                          maxWidth: "100%", // ✅ cegah Group memaksa melebar
                          overflow: "hidden",
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
                            maxWidth: '130px', // ⬅️ Batasi panjang maksimal heading
                            display: 'inline-block',
                            lineHeight: '1.2',
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
              minSize={[300, 260]}
              maxSize={[Infinity, 400]}
              expandToMin={false}
              gutterSize={10}
              gutterAlign="center"
              snapOffset={30}
              dragInterval={1}
              direction="horizontal"
              cursor="col-resize"
              style={{ display: 'flex', width: '100%',  flexGrow: 1, overflow: 'hidden', minWidth: 0,}}
            >
            {/* Panel Tengah */}
            
            <Box
                style={{
                  width: isMobile ? '100%' : '60%',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  backgroundColor: computedColorScheme === 'dark' ? '#2a2a2a' : '#f9f9f9',
                  padding: 10,
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'auto',
                  maxHeight: 'calc(100vh - 140px)',
                  height: '100%',
                  minHeight: '100%',
                  minWidth: 0,
                  boxSizing: "border-box",
                }}
              >
                
                <Box style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                  {/* BlockNote Editor Component dengan AI Indonesia */}
                    <BlockNoteEditorComponent
                      ref={editorRef}
                      onContentChange={handleContentChange}
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    />
                    {isScanning && (
                      /* Scanning Overlay */
                      <Box
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: "rgba(0, 123, 255, 0.05)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "center",
                          zIndex: 1000,
                          backdropFilter: "blur(2px)",
                        }}
                      >
                        <Stack align="center" gap="xl">
                          <Box
                            style={{
                              background: "linear-gradient(135deg, #007BFF, #0056b3)",
                              borderRadius: "50%",
                              padding: "30px",
                              boxShadow: "0 8px 32px rgba(0, 123, 255, 0.3)",
                              animation: "pulse 2s infinite",
                            }}
                          >
                            <IconScan size={48} color="white" />
                          </Box>

                          <Stack align="center" gap="md">
                            <Title order={3} c="blue" ta="center">
                              Deteksi AI Sedang Berjalan
                            </Title>

                            <Text size="lg" c="dimmed" ta="center">
                              {scanningText}
                            </Text>

                            <Progress
                              value={scanningProgress}
                              size="lg"
                              radius="xl"
                              style={{ width: "300px" }}
                              color="blue"
                              striped
                              animated
                            />

                            <Text size="sm" c="dimmed" ta="center">
                              {scanningProgress}% Complete
                            </Text>
                          </Stack>

                          <Group gap="xs" align="center">
                            <IconRobot size={16} color="#007BFF" />
                            <Text size="xs" c="dimmed">
                              Didukung oleh Deteksi AI GPTZero
                            </Text>
                          </Group>
                        </Stack>
                      </Box>
                    )}
                </Box>

                {/* Action Buttons */}
                <Group justify="flex-end" mt="sm" gap="md">
                  <Button 
                    variant="outline" 
                    color="blue" 
                    leftSection={
                      isScanning ? (
                        <Loader size={18} color="white" />
                      ) : (
                        <IconUpload size={18} />
                      )
                    } 
                    radius="md" 
                    size="md" 
                    px={24} 
                    onClick={handleSaveDraft}
                    style={{
                      transition: 'all 0.2s ease',
                    }}
                    disabled={isScanning}
                  >
                    Simpan Draf
                  </Button>

                  <Button 
                    variant="filled" 
                    color="blue" 
                    leftSection={
                      isScanning ? (
                        <Loader size={18} color="white" />
                      ) : (
                        <IconUpload size={18} />
                      )
                    } 
                    radius="md" 
                    size="md" 
                    px={24} 
                    onClick={handleFinalSave}
                    style={{
                      transition: 'all 0.2s ease',
                    }}
                    disabled={isScanning}
                  >
                    {isScanning ? "AI Checker..." : "Simpan Final"}
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
                  overflow: "auto",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                  boxSizing: "border-box",
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
                    // { icon: <IconHighlight size={20} />, value: "knowledge" },
                    { icon: <IconGraph size={20} />, value: "chat" },
                    { icon: <IconList size={20} />, value: "bibliography" },
                    { icon: <IconHistory size={20} />, value: "history" },
                    { icon: <IconHighlight size={20} />, value: 'annotation' }, // baru
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
                <ScrollArea style={{ flex: 1 }}>
                   {activeTab === "annotation" && (
                    <Box style={{ flex: 1, overflow: 'auto' }}>
                      <AnnotationPanel sessionId={sessionIdN} />
                    </Box>
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
                                <Group justify="space-between" align="flex-start">
                                <Box style={{ flex: 1 }}>
                                  <Group gap="xs" mb="xs" style={{ maxWidth: '100%', overflow: 'hidden' }}>
                                    <Text
                                      size="xs"
                                      fw={500}
                                      style={{
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        maxWidth: "calc(100% - 50px)", // sisakan ruang untuk badge
                                        display: "block",
                                      }}
                                      title={item.title}
                                    >
                                      {item.title}
                                    </Text>
                                    <Badge
                                      size="xs"
                                      color={
                                        item.type === "final" ? "green" : "blue"
                                      }
                                      variant="filled"
                                    >
                                      {item.version}
                                    </Badge>
                                  </Group>

                                  <Text size="xs" c="dimmed" mb="xs">
                                    {item.timestamp.toLocaleDateString()} -{" "}
                                    {item.wordCount} kata
                                  </Text>

                                  {item.assignmentCode && (
                                    <Text size="xs" c="blue">
                                      Kode: {item.assignmentCode}
                                    </Text>
                                  )}
                                </Box>

                                {/* Hanya tampilkan badge AI percentage untuk final */}
                                {item.type === "final" &&
                                  item.aiPercentage !== undefined && (
                                    <Badge
                                      size="sm"
                                      color={
                                        item.aiPercentage <= 10
                                          ? "green"
                                          : item.aiPercentage <= 30
                                          ? "yellow"
                                          : "red"
                                      }
                                      variant="filled"
                                    >
                                      {item.aiPercentage}%
                                    </Badge>
                                  )}
                              </Group>
                              </Paper>
                            ))}
                          </Stack>
                        )}
                      </ScrollArea>
                    </>
                  )}
                </ScrollArea>
              </Box>
            </Split>
          </Flex>
        </div>

        {/* ============================
            MODAL - AI RESULT
            ============================ */}
        <Modal
          opened={aiResultModalOpened}
          onClose={closeAIResultModal}
          title={null}
          size="xl"
          centered
          withCloseButton={false}
          overlayProps={{ opacity: 0.5, blur: 3 }}
          styles={{
            content: {
              background: `linear-gradient(135deg, ${
                computedColorScheme === "dark"
                  ? "rgba(26, 27, 30, 0.95)"
                  : "rgba(255, 255, 255, 0.95)"
              }, ${
                computedColorScheme === "dark"
                  ? "rgba(42, 42, 42, 0.9)"
                  : "rgba(248, 249, 250, 0.9)"
              })`,
              border: aiCheckResult?.isHuman
                ? "2px solid #40c057"
                : "2px solid #fa5252",
              borderRadius: "16px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            },
          }}
        >
          {aiCheckResult && (
            <Stack gap="xl" p="md">
              {/* Header */}
              <Center>
                <Stack align="center" gap="md">
                  <Box
                    style={{
                      background: aiCheckResult.isHuman
                        ? "linear-gradient(135deg, #40c057, #51cf66)"
                        : "linear-gradient(135deg, #fa5252, #ff6b6b)",
                      borderRadius: "50%",
                      padding: "20px",
                      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    {aiCheckResult.isHuman ? (
                      <IconShieldCheck size={48} color="white" />
                    ) : (
                      <IconAlertTriangle size={48} color="white" />
                    )}
                  </Box>

                  <Stack align="center" gap="xs">
                    <Title
                      order={2}
                      style={{
                        color: aiCheckResult.isHuman ? "#40c057" : "#fa5252",
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    >
                      {aiCheckResult.isHuman
                        ? "✅ Konten Original"
                        : "⚠️ Perlu Revisi"}
                    </Title>

                    <Text size="lg" c="dimmed" ta="center">
                      Hasil Analisis GPTZero
                    </Text>
                  </Stack>
                </Stack>
              </Center>

              {/* Two Column Layout */}
              <Grid>
                {/* Left Column - Analysis Results */}
                <Grid.Col span={6}>
                  <Stack gap="lg">
                    {/* Ring Progress */}
                    <Center>
                      <RingProgress
                        size={160}
                        thickness={12}
                        sections={[
                          {
                            value: aiCheckResult.percentage,
                            color: aiCheckResult.isHuman
                              ? "#40c057"
                              : "#fa5252",
                          },
                        ]}
                        label={
                          <Center>
                            <Stack align="center" gap={4}>
                              <Text
                                size="xl"
                                fw={700}
                                style={{
                                  color: aiCheckResult.isHuman
                                    ? "#40c057"
                                    : "#fa5252",
                                }}
                              >
                                {aiCheckResult.percentage}%
                              </Text>
                              <Text size="xs" c="dimmed" ta="center">
                                AI Detected
                              </Text>
                            </Stack>
                          </Center>
                        }
                      />
                    </Center>

                    {/* Sentence Analysis Summary */}
                    <Paper
                      p="md"
                      withBorder
                      style={{
                        backgroundColor:
                          computedColorScheme === "dark"
                            ? "#2a2a2a"
                            : "#f8f9fa",
                        borderRadius: "12px",
                      }}
                    >
                      <Stack gap="sm">
                        <Text size="sm" fw={600} mb="xs">
                          📊 Analisis Kalimat
                        </Text>

                        <Group justify="space-between">
                          <Group gap="xs">
                            <Box
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "2px",
                                backgroundColor: "#51cf66",
                              }}
                            />
                            <Text size="sm">Human</Text>
                          </Group>
                          <Text size="sm" fw={500}>
                            {aiCheckResult.analysis.humanSentences} kalimat
                          </Text>
                        </Group>

                        <Group justify="space-between">
                          <Group gap="xs">
                            <Box
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "2px",
                                backgroundColor: "#ffd43b",
                              }}
                            />
                            <Text size="sm">Mixed</Text>
                          </Group>
                          <Text size="sm" fw={500}>
                            {aiCheckResult.analysis.mixedSentences} kalimat
                          </Text>
                        </Group>

                        <Group justify="space-between">
                          <Group gap="xs">
                            <Box
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "2px",
                                backgroundColor: "#ff6b6b",
                              }}
                            />
                            <Text size="sm">AI</Text>
                          </Group>
                          <Text size="sm" fw={500}>
                            {aiCheckResult.analysis.aiSentences} kalimat
                          </Text>
                        </Group>
                      </Stack>
                    </Paper>

                    {/* Detail analisis */}
                    <Paper
                      p="md"
                      withBorder
                      style={{
                        backgroundColor:
                          computedColorScheme === "dark"
                            ? "#2a2a2a"
                            : "#f8f9fa",
                        borderRadius: "12px",
                      }}
                    >
                      <Stack gap="sm">
                        <Text size="sm" fw={600} mb="xs">
                          📝 Detail Analisis
                        </Text>

                        <Group justify="space-between">
                          <Text size="sm" fw={500}>
                            📝 Panjang Teks:
                          </Text>
                          <Text size="sm">
                            {aiCheckResult.analysis.textLength.toLocaleString()}{" "}
                            karakter
                          </Text>
                        </Group>

                        <Group justify="space-between">
                          <Text size="sm" fw={500}>
                            📊 Jumlah Kalimat:
                          </Text>
                          <Text size="sm">
                            {aiCheckResult.analysis.sentences}
                          </Text>
                        </Group>

                        <Group justify="space-between">
                          <Text size="sm" fw={500}>
                            📏 Rata-rata Panjang:
                          </Text>
                          <Text size="sm">
                            {aiCheckResult.analysis.avgSentenceLength} kata
                          </Text>
                        </Group>

                        <Group justify="space-between">
                          <Text size="sm" fw={500}>
                            🎯 Kompleksitas:
                          </Text>
                          <Badge
                            color={
                              aiCheckResult.analysis.complexity === "High"
                                ? "red"
                                : aiCheckResult.analysis.complexity === "Medium"
                                ? "yellow"
                                : "green"
                            }
                            variant="filled"
                          >
                            {aiCheckResult.analysis.complexity}
                          </Badge>
                        </Group>

                        <Group justify="space-between">
                          <Text size="sm" fw={500}>
                            🔍 Confidence:
                          </Text>
                          <Text size="sm" fw={600} c="blue">
                            {aiCheckResult.confidence}%
                          </Text>
                        </Group>
                      </Stack>
                    </Paper>
                  </Stack>
                </Grid.Col>

                {/* Right Column - Text Highlight Preview */}
                <Grid.Col span={6}>
                  <Stack gap="md">
                    <Paper
                      p="md"
                      withBorder
                      style={{
                        backgroundColor:
                          computedColorScheme === "dark"
                            ? "#2a2a2a"
                            : "#f8f9fa",
                        borderRadius: "12px",
                        height: "400px",
                      }}
                    >
                      <Stack gap="sm" style={{ height: "100%" }}>
                        <Group justify="space-between" align="center">
                          <Text size="sm" fw={600}>
                            🎨 Highlighted Text Preview
                          </Text>
                          <Group gap="xs">
                            <Group gap="xs">
                              <Box
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "2px",
                                  backgroundColor: "#51cf66",
                                }}
                              />
                              <Text size="xs">Human</Text>
                            </Group>
                            <Group gap="xs">
                              <Box
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "2px",
                                  backgroundColor: "#ffd43b",
                                }}
                              />
                              <Text size="xs">Mixed</Text>
                            </Group>
                            <Group gap="xs">
                              <Box
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "2px",
                                  backgroundColor: "#ff6b6b",
                                }}
                              />
                              <Text size="xs">AI</Text>
                            </Group>
                          </Group>
                        </Group>

                        <ScrollArea
                          style={{
                            flex: 1,
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            padding: "12px",
                            backgroundColor:
                              computedColorScheme === "dark"
                                ? "#1a1a1a"
                                : "#ffffff",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "13px",
                              lineHeight: 1.6,
                              fontFamily:
                                "system-ui, -apple-system, sans-serif",
                            }}
                            dangerouslySetInnerHTML={{
                              __html: aiCheckResult.highlightedContent,
                            }}
                          />
                        </ScrollArea>

                        <Text size="xs" c="dimmed" ta="center">
                          Kalimat dengan warna menunjukkan tingkat deteksi AI
                        </Text>
                      </Stack>
                    </Paper>
                  </Stack>
                </Grid.Col>
              </Grid>

              {/* Rekomendasi */}
              <Alert
                color={aiCheckResult.isHuman ? "green" : "orange"}
                title="💡 Rekomendasi"
                icon={<IconBulb size={20} />}
                styles={{ root: { borderRadius: "12px" } }}
              >
                <Text size="sm">{aiCheckResult.recommendation}</Text>
              </Alert>

              {/* Conditional content berdasarkan hasil AI */}
              {aiCheckResult.isHuman ? (
                /* Jika AI detection <= 10% - tampilkan input assignment code */
                <Stack gap="md">
                  <Alert
                    color="green"
                    title="🎉 Konten Anda Lolos!"
                    icon={<IconCircleCheck size={20} />}
                    styles={{
                      root: {
                        borderRadius: "12px",
                        background:
                          "linear-gradient(135deg, rgba(64, 192, 87, 0.1), rgba(81, 207, 102, 0.1))",
                        border: "1px solid rgba(64, 192, 87, 0.3)",
                      },
                    }}
                  >
                    <Text size="sm">
                      Artikel Anda terdeteksi sebagai konten original dan siap
                      untuk dikirim. Mohon masukkan kode assignment untuk
                      melanjutkan proses pengiriman.
                    </Text>
                  </Alert>

                  <TextInput
                    label="Kode Assignment"
                    placeholder="Masukkan kode assignment..."
                    value={assignmentCode}
                    onChange={(e) => setAssignmentCode(e.currentTarget.value)}
                    size="md"
                    styles={{
                      input: { borderRadius: "8px", fontSize: "16px" },
                      label: { fontWeight: 600, marginBottom: "8px" },
                    }}
                    leftSection={<IconNumber size={18} />}
                    required
                  />

                  <Group justify="center" mt="lg" gap="md">
                    <Button
                      variant="outline"
                      color="gray"
                      size="md"
                      radius="md"
                      px={32}
                      leftSection={<IconX size={18} />}
                      onClick={closeAIResultModal}
                    >
                      Cancel
                    </Button>

                    <Button
                      variant="filled"
                      color="green"
                      size="md"
                      radius="md"
                      px={32}
                      leftSection={<IconSend size={18} />}
                      onClick={handleSubmitToTeacher}
                      disabled={!assignmentCode.trim()}
                      style={{
                        background: "linear-gradient(135deg, #40c057, #51cf66)",
                        boxShadow: "0 4px 16px rgba(64, 192, 87, 0.3)",
                      }}
                    >
                      Kirim Sekarang
                    </Button>
                  </Group>
                </Stack>
              ) : (
                /* Jika AI detection > 10% - tampilkan pesan revisi */
                <Stack gap="md">
                  <Alert
                    color="red"
                    title="❌ Mohon untuk Direvisi"
                    icon={<IconAlertCircle size={20} />}
                    styles={{
                      root: {
                        borderRadius: "12px",
                        background:
                          "linear-gradient(135deg, rgba(250, 82, 82, 0.1), rgba(255, 107, 107, 0.1))",
                        border: "1px solid rgba(250, 82, 82, 0.3)",
                      },
                    }}
                  >
                    <Text size="sm">
                      Konten Anda terdeteksi menggunakan AI yang berlebihan (
                      {aiCheckResult.percentage}%). Silakan revisi artikel Anda
                      dengan fokus pada bagian yang disorot merah dan kuning
                      sebelum dapat dikirim.
                    </Text>
                  </Alert>

                  <Paper
                    p="md"
                    withBorder
                    style={{
                      backgroundColor:
                        computedColorScheme === "dark" ? "#2a2a2a" : "#fff5f5",
                      borderRadius: "12px",
                      border: "1px solid rgba(250, 82, 82, 0.2)",
                    }}
                  >
                    <Stack gap="xs">
                      <Text size="sm" fw={600} c="red">
                        💡 Tips untuk Mengurangi Deteksi AI:
                      </Text>
                      <Text size="xs" c="dimmed">
                        • Fokus pada bagian yang disorot merah (AI) dan kuning
                        (Mixed)
                      </Text>
                      <Text size="xs" c="dimmed">
                        • Gunakan gaya penulisan yang lebih personal dan natural
                      </Text>
                      <Text size="xs" c="dimmed">
                        • Variasikan panjang kalimat dan struktur paragraf
                      </Text>
                      <Text size="xs" c="dimmed">
                        • Tambahkan pengalaman atau perspektif pribadi
                      </Text>
                      <Text size="xs" c="dimmed">
                        • Gunakan contoh spesifik dan detail yang relevan
                      </Text>
                    </Stack>
                  </Paper>

                  <Center mt="lg">
                    <Button
                      variant="filled"
                      color="blue"
                      size="md"
                      radius="md"
                      px={32}
                      leftSection={<IconEdit size={18} />}
                      onClick={closeAIResultModal}
                      style={{
                        background: "linear-gradient(135deg, #007BFF, #0056b3)",
                        boxShadow: "0 4px 16px rgba(0, 123, 255, 0.3)",
                      }}
                    >
                      Kembali untuk Revisi
                    </Button>
                  </Center>
                </Stack>
              )}

              {/* Footer dengan branding */}
              <Center>
                <Group gap="xs" align="center">
                  <IconRobot size={16} color="#007BFF" />
                  <Text size="xs" c="dimmed">
                    Powered by GPTZero AI Detection
                  </Text>
                </Group>
              </Center>
            </Stack>
          )}
        </Modal>

        {/* ============================
            MODAL - BIBLIOGRAPHY
            ============================ */}
        <Modal
          opened={bibliographyModalOpened}
          onClose={closeBibliographyModal}
          title={
            <Group align="center" gap="sm">
              <IconList size={20} color="#007BFF" />
              <Text fw={600} size="lg">
                {editingBibliography
                  ? "Edit Daftar Pustaka"
                  : "Tambah Daftar Pustaka"}
              </Text>
            </Group>
          }
          size="lg"
          centered
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Isi informasi untuk menambah ke daftar pustaka. Item akan diberi
              nomor [{editingBibliography?.number || nextNumber}].
            </Text>

            <TextInput
              label="Penulis*"
              placeholder="Nama penulis"
              value={bibliographyForm.author}
              onChange={(e) =>
                setBibliographyForm((prev) => ({
                  ...prev,
                  author: e.currentTarget.value,
                }))
              }
              required
            />

            <TextInput
              label="Judul*"
              placeholder="Judul karya"
              value={bibliographyForm.title}
              onChange={(e) =>
                setBibliographyForm((prev) => ({
                  ...prev,
                  title: e.currentTarget.value,
                }))
              }
              required
            />

            <Group grow>
              <TextInput
                label="Tahun*"
                placeholder="Tahun publikasi"
                value={bibliographyForm.year}
                onChange={(e) =>
                  setBibliographyForm((prev) => ({
                    ...prev,
                    year: e.currentTarget.value,
                  }))
                }
                required
              />
              <TextInput
                label="Penerbit"
                placeholder="Nama penerbit"
                value={bibliographyForm.publisher}
                onChange={(e) =>
                  setBibliographyForm((prev) => ({
                    ...prev,
                    publisher: e.currentTarget.value,
                  }))
                }
              />
            </Group>

            <TextInput
              label="Jurnal"
              placeholder="Nama jurnal (jika artikel jurnal)"
              value={bibliographyForm.journal}
              onChange={(e) =>
                setBibliographyForm((prev) => ({
                  ...prev,
                  journal: e.currentTarget.value,
                }))
              }
            />

            <Group grow>
              <TextInput
                label="Volume"
                placeholder="Volume"
                value={bibliographyForm.volume}
                onChange={(e) =>
                  setBibliographyForm((prev) => ({
                    ...prev,
                    volume: e.currentTarget.value,
                  }))
                }
              />
              <TextInput
                label="Halaman"
                placeholder="Rentang halaman"
                value={bibliographyForm.pages}
                onChange={(e) =>
                  setBibliographyForm((prev) => ({
                    ...prev,
                    pages: e.currentTarget.value,
                  }))
                }
              />
            </Group>

            <TextInput
              label="URL"
              placeholder="Alamat website (jika sumber online)"
              value={bibliographyForm.url}
              onChange={(e) =>
                setBibliographyForm((prev) => ({
                  ...prev,
                  url: e.currentTarget.value,
                }))
              }
            />

            <TextInput
              label="DOI"
              placeholder="Digital Object Identifier"
              value={bibliographyForm.doi}
              onChange={(e) =>
                setBibliographyForm((prev) => ({
                  ...prev,
                  doi: e.currentTarget.value,
                }))
              }
            />

            {/* Preview */}
            {bibliographyForm.author &&
              bibliographyForm.title &&
              bibliographyForm.year && (
                <Paper
                  p="sm"
                  style={{
                    backgroundColor:
                      computedColorScheme === "dark" ? "#2a2a2a" : "#f8f9fa",
                  }}
                >
                  <Text size="xs" fw={600} mb="xs">
                    Preview:
                  </Text>
                  <Text size="xs" style={{ fontFamily: "monospace" }}>
                    [{editingBibliography?.number || nextNumber}]{" "}
                    {formatBibliography({
                      id: "",
                      number: editingBibliography?.number || nextNumber,
                      ...bibliographyForm,
                      createdAt: new Date(),
                    } as Bibliography)}
                  </Text>
                </Paper>
              )}

            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={closeBibliographyModal}>
                Batal
              </Button>
              <Button
                onClick={saveBibliography}
                disabled={
                  !bibliographyForm.author ||
                  !bibliographyForm.title ||
                  !bibliographyForm.year
                }
              >
                {editingBibliography ? "Update" : "Simpan"}
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* ============================
            CSS ANIMATIONS
            ============================ */}
        <style jsx global>{`
          @keyframes pulse {
            0% {
              transform: scale(1);
              box-shadow: 0 8px 32px rgba(0, 123, 255, 0.3);
            }
            50% {
              transform: scale(1.05);
              box-shadow: 0 12px 40px rgba(0, 123, 255, 0.5);
            }
            100% {
              transform: scale(1);
              box-shadow: 0 8px 32px rgba(0, 123, 255, 0.3);
            }
          }
        `}</style>
      </AppShell.Main>
    </AppShell>
  );
}