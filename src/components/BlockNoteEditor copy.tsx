"use client";

import { createGroq } from "@ai-sdk/groq";
import { filterSuggestionItems } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  CopyButton,
  Group,
  Loader,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Tooltip,
  useComputedColorScheme,
  Overlay,
} from "@mantine/core";
import { useDisclosure, useClickOutside } from "@mantine/hooks";
import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconList,
  IconPencil,
  IconSparkles,
  IconWand,
  IconFileText,
  IconBulb,
  IconPencilPlus,
} from "@tabler/icons-react";
import { generateText } from "ai";
import React, {forwardRef, useImperativeHandle } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

// Interfaces
interface BlockNoteEditorProps {
  onContentChange?: (content: any[]) => void;
  style?: React.CSSProperties;
}

interface ContinueWritingState {
  isVisible: boolean;
  position: { x: number; y: number };
  currentBlock: any;
  contextText: string;
}

interface InlineAIState {
  isVisible: boolean;
  position: { x: number; y: number };
  currentBlock: any;
  query: string;
}

// Main component
export interface BlockNoteEditorHandle {
  insertCitation: (citationText: string) => void;
}

const BlockNoteEditorComponent = forwardRef<BlockNoteEditorHandle, BlockNoteEditorProps>(
  ({ onContentChange, style }, ref) => {
    const editor = useCreateBlockNote({
      initialContent: [
        {
          type: "paragraph",
          content: "",
        },
      ],
      uploadFile: async (file: File) => {
        const body = new FormData();
        body.append("file", file);
        
        try {
          const response = await fetch("/api/upload", {
            method: "POST",
            body: body,
          });
          const json = await response.json();
          return json.url;
        } catch (error) {
          console.error("Upload failed:", error);
          return "";
        }
      },
    });
  
    // Core states
    const [isAILoading, setIsAILoading] = React.useState(false);
    const [aiModalOpened, { open: openAIModal, close: closeAIModal }] = useDisclosure(false);
    const [prompt, setPrompt] = React.useState("");
    const [generatedContent, setGeneratedContent] = React.useState("");
    const [aiMode, setAIMode] = React.useState<"new" | "continue">("new");
    const [isAutoContinuing, setIsAutoContinuing] = React.useState(false);

    // Continue writing state
    const [continueState, setContinueState] = React.useState<ContinueWritingState>({
      isVisible: false,
      position: { x: 0, y: 0 },
      currentBlock: null,
      contextText: ""
    });
    const continueRef = useClickOutside(() => setContinueState(prev => ({ ...prev, isVisible: false })));

    // Inline AI state
    const [inlineAIState, setInlineAIState] = React.useState<InlineAIState>({
      isVisible: false,
      position: { x: 0, y: 0 },
      currentBlock: null,
      query: "",
    });
    const inlineAIRef = useClickOutside(() => setInlineAIState(prev => ({ ...prev, isVisible: false })));

    // AI Model setup
    const aiModel = React.useMemo(() => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
        
        if (!apiKey) {
          console.warn("NEXT_PUBLIC_GROQ_API_KEY not found. AI features will be disabled.");
          return null;
        }
        
        const groq = createGroq({
          apiKey: apiKey,
        });
        
        return groq("llama-3.3-70b-versatile");
      } catch (error) {
        console.error("Error initializing AI model:", error);
        return null;
      }
    }, []);

    const computedColorScheme = useComputedColorScheme();

    // Expose function insertCitation ke parent
    useImperativeHandle(ref, () => ({
      insertCitation: (text: string) => {
        const cursor = editor.getTextCursorPosition();
        if (cursor && text) {
          editor.insertBlocks(
            [
              {
                type: "paragraph",
                content: text,
              },
            ],
            cursor.block, // reference block
            "after"       // placement
          );
        }
      },
    }));

    // AI Templates
    const aiTemplates = [
      {
        title: "Buat Struktur", 
        description: "Outline lengkap dengan heading dan sub-heading",
        type: "structure",
        color: "blue", 
        icon: IconList,
        defaultPrompt: "Buat outline untuk artikel"
      },
      {
        title: "Isi Konten",
        description: "Konten detail dan mendalam untuk topik",
        type: "content", 
        color: "green",
        icon: IconEdit,
        defaultPrompt: "Tulis konten detail tentang"
      }
    ];

    // Inline AI suggestions
    const inlineAISuggestions = [
      {
        icon: <IconPencilPlus size={16} />,
        title: "Continue Writing",
        description: "AI will continue from where you left off",
        action: "continue"
      },
      {
        icon: <IconFileText size={16} />,
        title: "Summarize",
        description: "Create a summary of the content",
        action: "summarize"
      },
      {
        icon: <IconBulb size={16} />,
        title: "Write Anything...",
        description: "Ask AI to write custom content",
        action: "write_anything"
      }
    ];

    // Utility function to extract text from any block - FIXED
    const extractTextFromBlock = (block: any): string => {
      try {
        if (!block) return "";
        
        // Handle different content structures
        if (typeof block.content === 'string') {
          return block.content;
        }
        
        if (Array.isArray(block.content)) {
          return block.content
            .map((item: any) => {
              if (typeof item === 'string') return item;
              if (item && typeof item === 'object') {
                // Handle different text content structures
                if ('text' in item) return item.text;
                if ('content' in item && typeof item.content === 'string') return item.content;
              }
              return '';
            })
            .join('').trim();
        }
        
        return "";
      } catch (error) {
        console.error("Error extracting text from block:", error);
        return "";
      }
    };

    // Extract context from cursor position
    const extractContextFromCursor = (): string => {
      try {
        const cursorPosition = editor.getTextCursorPosition();
        if (!cursorPosition) return "";
        
        const currentBlock = cursorPosition.block;
        const allBlocks = editor.document;
        const currentIndex = allBlocks.findIndex(block => block.id === currentBlock.id);
        
        const contextBlocks = allBlocks.slice(Math.max(0, currentIndex - 3), currentIndex + 1);
        
        let context = "";
        contextBlocks.forEach(block => {
          const text = extractTextFromBlock(block);
          if (text) {
            if (block.type === "heading") {
              context += `\n# ${text}\n`;
            } else {
              context += `${text}\n`;
            }
          }
        });
        
        return context.trim();
      } catch (error) {
        console.error("Error extracting context:", error);
        return "";
      }
    };

    // Check if should show continue button - Enhanced version
    const shouldShowContinueButton = (block: any): boolean => {
      try {
        if (!block) return false;
        
        // Allow continue button for headings (untuk generate content)
        if (block.type === "heading") {
          return true;
        }
        
        // Enhanced logic for paragraphs - more permissive
        if (block.type === "paragraph") {
          const text = extractTextFromBlock(block);
          
          // Show continue button for any paragraph with content (even short ones)
          if (text.length >= 5) {
            return true;
          }
        }
        
        // Also allow for list items
        if (block.type === "bulletListItem" || block.type === "numberedListItem") {
          const text = extractTextFromBlock(block);
          if (text.length >= 3) {
            return true;
          }
        }
        
        return false;
      } catch (error) {
        return false;
      }
    };

    // Parse inline formatting - FIXED
    const parseInlineFormatting = (text: string): any[] => {
      if (!text || typeof text !== 'string') {
        return [{ type: "text", text: text || "" }];
      }
      
      // Simple but robust implementation
      return [{ type: "text", text: text.trim() }];
    };

    // Find matching heading
    const findMatchingHeading = (blocks: any[], headingText: string, level: number, startIndex: number): number => {
      for (let i = startIndex; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.type === "heading" && block.props?.level === level) {
          const blockText = extractTextFromBlock(block);
          if (blockText === headingText) {
            return i;
          }
        }
      }
      return -1;
    };

    // Close modal and reset
    const closeModalAndReset = () => {
      closeAIModal();
      setPrompt("");
      setGeneratedContent("");
      setAIMode("new");
    };

    // Handle AI generation
    const handleAIGeneration = async (inputPrompt: string, type: string = "structure", shouldClearEditor: boolean = true) => {
      if (!inputPrompt.trim()) {
        alert("⚠️ Silakan masukkan topik atau kata kunci sebelum generate konten!");
        return;
      }
      
      if (shouldClearEditor) {
        try {
          const currentBlocks = editor.document;
          
          if (currentBlocks.length > 0) {
            if (currentBlocks.length > 1) {
              const blocksToRemove = currentBlocks.slice(1);
              editor.removeBlocks(blocksToRemove);
            }
            
            const firstBlock = editor.document[0];
            if (firstBlock) {
              editor.updateBlock(firstBlock, {
                type: "paragraph",
                content: "",
              });
            }
          }
        } catch (error) {
          console.log("Editor clearing adjustment:", error);
        }
      }
      
      await generateAIContent(inputPrompt, type);
    };

    // Handle inline AI trigger
    const handleInlineAITrigger = React.useCallback(() => {
      try {
        setInlineAIState(prev => ({ ...prev, isVisible: false }));
        
        setTimeout(() => {
          const cursorPosition = editor.getTextCursorPosition();
          
          if (!cursorPosition) {
            console.warn("No cursor position found");
            return;
          }

          const selection = window.getSelection();
          let rect = { left: 100, top: 100, bottom: 100, right: 100 };

          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            rect = range.getBoundingClientRect();
          }
          
          let finalX = rect.left;
          let finalY = rect.bottom + 8;
          
          // Simple positioning - avoid complex calculations
          const popupWidth = 320;
          const popupHeight = 280;
          const margin = 20;
          
          if (finalX + popupWidth > window.innerWidth - margin) {
            finalX = Math.max(margin, window.innerWidth - popupWidth - margin);
          }
          
          if (finalY + popupHeight > window.innerHeight - margin) {
            finalY = Math.max(margin, rect.top - popupHeight - 8);
          }
          
          setInlineAIState({
            isVisible: true,
            position: { x: finalX, y: finalY },
            currentBlock: cursorPosition.block,
            query: ""
          });
          
        }, 50);
        
      } catch (error) {
        console.error("Error triggering inline AI:", error);
        setInlineAIState({
          isVisible: true,
          position: { x: 100, y: 100 },
          currentBlock: null,
          query: ""
        });
      }
    }, [editor]);

    // Analyze cursor context - Enhanced version
    const analyzeCurrentCursorContext = (): {
      targetHeading: { text: string; level: number; position: number; block: any } | null;
      headingContent: string;
      insertPosition: number;
      isAtHeading: boolean;
      contextType: 'heading' | 'under_heading' | 'paragraph' | 'list' | 'general';
      currentText: string;
      precedingContext: string;
    } | null => {
      try {
        const cursorPosition = editor.getTextCursorPosition();
        if (!cursorPosition) return null;
        
        const currentBlock = cursorPosition.block;
        const allBlocks = editor.document;
        const currentIndex = allBlocks.findIndex(block => block.id === currentBlock.id);
        
        const currentText = extractTextFromBlock(currentBlock);
        
        // Get preceding context (previous 2-3 blocks for better context)
        const precedingBlocks = allBlocks.slice(Math.max(0, currentIndex - 3), currentIndex);
        let precedingContext = "";
        
        precedingBlocks.forEach(block => {
          const text = extractTextFromBlock(block);
          if (text) {
            if (block.type === "heading") {
              const level = block.props?.level || 1;
              const headingPrefix = '#'.repeat(level);
              precedingContext += `${headingPrefix} ${text}\n`;
            } else {
              precedingContext += `${text} `;
            }
          }
        });
        
        // Check if cursor is on a heading
        if (currentBlock.type === "heading") {
          const headingText = extractTextFromBlock(currentBlock);
          
          if (headingText) {
            const level = currentBlock.props?.level || 1;
            return {
              targetHeading: {
                text: headingText,
                level: level,
                position: currentIndex,
                block: currentBlock
              },
              headingContent: "",
              insertPosition: currentIndex,
              isAtHeading: true,
              contextType: 'heading',
              currentText,
              precedingContext: precedingContext.trim()
            };
          }
        }
        
        // Check if cursor is in a list item
        if (currentBlock.type === "bulletListItem" || currentBlock.type === "numberedListItem") {
          // Find governing heading
          let governingHeading: { text: string; level: number; position: number; block: any } | null = null;
          
          for (let i = currentIndex - 1; i >= 0; i--) {
            const block = allBlocks[i];
            if (block.type === "heading") {
              const headingText = extractTextFromBlock(block);
              if (headingText) {
                const level = block.props?.level || 1;
                governingHeading = {
                  text: headingText,
                  level: level,
                  position: i,
                  block: block
                };
                break;
              }
            }
          }
          
          return {
            targetHeading: governingHeading,
            headingContent: "",
            insertPosition: currentIndex,
            isAtHeading: false,
            contextType: 'list',
            currentText,
            precedingContext: precedingContext.trim()
          };
        }
        
        // Check if cursor is in a regular paragraph
        if (currentBlock.type === "paragraph") {
          // Find governing heading
          let governingHeading: { text: string; level: number; position: number; block: any } | null = null;
          let headingContent = "";
          
          for (let i = currentIndex - 1; i >= 0; i--) {
            const block = allBlocks[i];
            if (block.type === "heading") {
              const headingText = extractTextFromBlock(block);
              if (headingText) {
                const level = block.props?.level || 1;
                governingHeading = {
                  text: headingText,
                  level: level,
                  position: i,
                  block: block
                };
                
                // Collect content under this heading
                for (let j = i + 1; j < currentIndex; j++) {
                  const contentBlock = allBlocks[j];
                  const contentText = extractTextFromBlock(contentBlock);
                  if (contentText) {
                    headingContent += `${contentText} `;
                  }
                }
                break;
              }
            }
          }
          
          return {
            targetHeading: governingHeading,
            headingContent: headingContent.trim(),
            insertPosition: currentIndex,
            isAtHeading: false,
            contextType: governingHeading ? 'under_heading' : 'paragraph',
            currentText,
            precedingContext: precedingContext.trim()
          };
        }
        
        // General case
        return {
          targetHeading: null,
          headingContent: "",
          insertPosition: currentIndex,
          isAtHeading: false,
          contextType: 'general',
          currentText,
          precedingContext: precedingContext.trim()
        };
      } catch (error) {
        console.error("Error analyzing cursor context:", error);
        return null;
      }
    };

    // Insert AI content at cursor - FIXED
    const insertAIContentAtCursor = async (text: string, currentBlock: any) => {
      try {
        if (!text || !text.trim()) {
          console.warn("No text to insert");
          return;
        }
        
        const lines = text.split('\n').filter((line: string) => line.trim());
        
        if (lines.length === 0) {
          console.warn("No valid lines to insert");
          return;
        }
        
        const blocksToInsert: any[] = lines.map((line: string) => {
          const trimmedLine = line.trim();
          
          // Parse markdown-style headings
          const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
          if (headingMatch) {
            const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3;
            const headingText = headingMatch[2];
            return {
              type: "heading" as const,
              content: headingText,
              props: { level },
            };
          }
          
          // Parse bullet list items
          if (trimmedLine.match(/^[\*\-]\s+/)) {
            const listText = trimmedLine.replace(/^[\*\-]\s+/, '');
            return {
              type: "bulletListItem" as const,
              content: listText,
            };
          }
          
          // Parse numbered list items
          if (trimmedLine.match(/^\d+\.\s+/)) {
            const listText = trimmedLine.replace(/^\d+\.\s+/, '');
            return {
              type: "numberedListItem" as const,
              content: listText,
            };
          }
          
          // Default to paragraph
          return {
            type: "paragraph" as const,
            content: trimmedLine,
          };
        });

        if (blocksToInsert.length > 0) {
          // Use insertBlocks method properly
          await editor.insertBlocks(blocksToInsert, currentBlock, "after");
          
          // Set cursor position to the last inserted block
          setTimeout(() => {
            try {
              const allBlocks = editor.document;
              const currentIndex = allBlocks.findIndex(block => block.id === currentBlock.id);
              const lastInsertedIndex = currentIndex + blocksToInsert.length;
              
              if (lastInsertedIndex < allBlocks.length) {
                const lastInsertedBlock = allBlocks[lastInsertedIndex];
                if (lastInsertedBlock) {
                  editor.setTextCursorPosition(lastInsertedBlock, "end");
                }
              }
            } catch (e) {
              console.log("Cursor positioning adjustment:", e);
            }
          }, 100);
        }
      } catch (error) {
        console.error("Error inserting AI content:", error);
        throw error;
      }
    };

    // Handle inline AI actions
    const handleInlineAIAction = async (action: string) => {
      const cursorPosition = editor.getTextCursorPosition();
      const currentBlock = cursorPosition?.block;
      
      if (!aiModel || !currentBlock) {
        console.error("AI model or current block not available");
        alert("❌ AI model tidak tersedia. Silakan periksa konfigurasi API key.");
        return;
      }

      setInlineAIState(prev => ({ ...prev, isVisible: false }));
      setContinueState(prev => ({ ...prev, isVisible: false }));
      setIsAutoContinuing(true);

      try {
        let systemPrompt = "";
        let maxTokens = 500;

        switch (action) {
          case "continue":
            const cursorContext = analyzeCurrentCursorContext();
            
            if (!cursorContext) {
              systemPrompt = `Lanjutkan penulisan dengan konten yang natural dan relevan.

INSTRUKSI:
- Tulis 1-2 paragraf yang mengalir dengan baik
- Gunakan bahasa Indonesia yang natural
- Berikan informasi yang valuable`;
              break;
            }

            const { contextType, currentText, precedingContext, targetHeading, headingContent } = cursorContext;
            
            // Generate different prompts based on context type
            switch (contextType) {
              case 'heading':
                if (targetHeading) {
                  systemPrompt = `Tulis konten untuk heading berikut. HANYA tulis isi konten paragraf, JANGAN tulis ulang headingnya.

HEADING TARGET: ${targetHeading.text} (Level ${targetHeading.level})

INSTRUKSI:
- Tulis 2-3 paragraf konten yang relevan untuk heading tersebut
- Jangan tulis ulang judul/heading
- Mulai langsung dengan konten paragraf
- Gunakan bahasa Indonesia yang natural dan informatif
- Sesuaikan kedalaman konten dengan level heading

TUGAS: Tulis konten detail untuk heading "${targetHeading.text}"`;
                }
                break;
                
              case 'under_heading':
                if (targetHeading) {
                  systemPrompt = `Lanjutkan penulisan konten untuk bagian heading berikut:

HEADING: ${targetHeading.text} (Level ${targetHeading.level})

KONTEN YANG SUDAH ADA:
${headingContent || "(Belum ada konten)"}

KALIMAT SAAT INI: ${currentText}

INSTRUKSI:
- Lanjutkan dengan konten yang natural dan relevan dengan heading "${targetHeading.text}"
- Jangan tulis ulang heading atau konten yang sudah ada
- Tulis 1-2 paragraf tambahan yang melengkapi konten existing
- Pertahankan konsistensi tone dan style
- Fokus pada value yang belum dibahas terkait topik "${targetHeading.text}"

TUGAS: Lanjutkan konten untuk "${targetHeading.text}"`;
                }
                break;
                
              case 'paragraph':
                systemPrompt = `Lanjutkan penulisan dari konteks paragraf berikut:

KONTEKS SEBELUMNYA:
${precedingContext}

KALIMAT SAAT INI: ${currentText}

INSTRUKSI:
- Lanjutkan alur pemikiran dari kalimat yang sedang ditulis
- Pertahankan kohesi dan koherensi dengan konteks sebelumnya
- Tulis 1-2 paragraf yang mengalir natural
- Jaga konsistensi tone dan style penulisan
- Berikan informasi atau penjelasan yang melengkapi

TUGAS: Lanjutkan penulisan dengan mengikuti alur dan konteks yang sudah ada`;
                break;
                
              case 'list':
                systemPrompt = `Lanjutkan penulisan untuk item list berikut:

KONTEKS SEBELUMNYA:
${precedingContext}

ITEM SAAT INI: ${currentText}

INSTRUKSI:
- Lanjutkan dengan item-item list yang relevan dan logis
- Pertahankan format dan style yang konsisten
- Tulis 2-3 item tambahan yang melengkapi
- Pastikan ada progression yang masuk akal
- ${targetHeading ? `Sesuaikan dengan topik "${targetHeading.text}"` : 'Ikuti alur yang sudah ada'}

TUGAS: Lanjutkan dengan item list yang relevan`;
                break;
                
              default:
                systemPrompt = `Lanjutkan penulisan dari konteks berikut:

KONTEKS SEBELUMNYA:
${precedingContext}

TEKS SAAT INI: ${currentText}

INSTRUKSI:
- Lanjutkan dengan natural dan relevan mengikuti alur yang ada
- Tulis 1-2 paragraf yang melengkapi konteks
- Jaga konsistensi tone dan alur penulisan
- Berikan informasi yang valuable dan logis

TUGAS: Lanjutkan penulisan mengikuti konteks dan alur yang sudah ada`;
            }
            break;

          case "summarize":
            const editorBlocks = editor.document;
            let contextContent = "";
            
            editorBlocks.forEach(block => {
              const text = extractTextFromBlock(block);
              if (text) {
                if (block.type === "heading") {
                  const level = block.props?.level || 1;
                  const headingPrefix = '#'.repeat(level);
                  contextContent += `\n${headingPrefix} ${text}\n`;
                } else {
                  contextContent += `${text}\n`;
                }
              }
            });

            systemPrompt = `Buat ringkasan dari konten berikut:

${contextContent}

INSTRUKSI:
- Buat ringkasan dalam 2-3 paragraf
- Tangkap poin-poin utama
- Gunakan bahasa yang jelas dan ringkas`;
            break;

          case "write_anything":
            setAIMode("continue");
            openAIModal();
            setIsAutoContinuing(false);
            return;

          default:
            setIsAutoContinuing(false);
            return;
        }

        const { text } = await generateText({
          model: aiModel,
          prompt: systemPrompt,
          maxTokens,
          temperature: 0.7,
          presencePenalty: 0.2,
          frequencyPenalty: 0.1,
        });

        if (text && text.trim()) {
          await insertAIContentAtCursor(text, currentBlock);
        } else {
          console.warn("No text generated from AI");
          alert("⚠️ AI tidak menghasilkan konten. Silakan coba lagi.");
        }

      } catch (error) {
        console.error("Inline AI action failed:", error);
        alert("❌ Gagal menggunakan AI. Silakan coba lagi.");
      } finally {
        setIsAutoContinuing(false);
      }
    };

    // Handle selection change
    const handleSelectionChange = React.useCallback(() => {
      try {
        const cursorPosition = editor.getTextCursorPosition();
        if (!cursorPosition) {
          setContinueState(prev => ({ ...prev, isVisible: false }));
          setInlineAIState(prev => ({ ...prev, isVisible: false }));
          return;
        }

        const currentBlock = cursorPosition.block;
        
        if (shouldShowContinueButton(currentBlock)) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const contextText = extractContextFromCursor();
            
            setContinueState({
              isVisible: true,
              position: { x: rect.right + 10, y: rect.bottom + 5 },
              currentBlock,
              contextText
            });
            
            setInlineAIState(prev => ({ 
              ...prev, 
              currentBlock,
              isVisible: false
            }));
          }
        } else {
          setContinueState(prev => ({ ...prev, isVisible: false }));
          setInlineAIState(prev => ({ ...prev, isVisible: false }));
        }
      } catch (error) {
        console.error("Error handling selection change:", error);
        setContinueState(prev => ({ ...prev, isVisible: false }));
        setInlineAIState(prev => ({ ...prev, isVisible: false }));
      }
    }, [editor]);

    // Setup selection change listener
    React.useEffect(() => {
      let unsubscribe: (() => void) | undefined;
      
      try {
        unsubscribe = editor.onChange?.(handleSelectionChange);
      } catch (error) {
        console.error("Error setting up editor change listener:", error);
      }
      
      document.addEventListener('selectionchange', handleSelectionChange);
      
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
        document.removeEventListener('selectionchange', handleSelectionChange);
      };
    }, [editor, handleSelectionChange]);

    // AI Generation function
    const generateAIContent = async (prompt: string, type: string = "structure") => {
      if (!aiModel) {
        alert("❌ AI model tidak tersedia. Silakan periksa konfigurasi API key.");
        return null;
      }
      
      setIsAILoading(true);
      try {
        let systemPrompt = "";
        
        if (aiMode === "continue") {
          const editorBlocks = editor.document;
          let contextContent = "";
          
          editorBlocks.forEach(block => {
            const text = extractTextFromBlock(block);
            if (text) {
              if (block.type === "heading") {
                const level = block.props?.level || 1;
                const headingPrefix = '#'.repeat(level);
                contextContent += `\n${headingPrefix} ${text}\n`;
              } else {
                contextContent += `${text}\n`;
              }
            }
          });

          systemPrompt = `Anda adalah AI writer yang akan melanjutkan konten yang sudah ada di editor.

KONTEN YANG SUDAH ADA:
${contextContent}

TUGAS ANDA:
1. Analisis struktur dan konten yang sudah ada
2. Identifikasi heading/subheading yang masih kosong atau perlu dilengkapi
3. Lanjutkan dengan menulis konten yang natural dan coherent
4. Fokus pada heading yang belum memiliki konten atau konten yang masih singkat

INSTRUKSI PENULISAN:
- Tulis konten dalam format yang sama (gunakan # ## ### untuk heading)
- Setiap heading yang kosong atau singkat, isi dengan 2-3 paragraf detail
- Jaga konsistensi tone dan style dengan konten yang sudah ada
- Berikan informasi yang valuable dan mendalam
- Jangan mengulang informasi yang sudah ada

KONTEKS TAMBAHAN: ${prompt}`;
        } else {
          if (type === "content") {
            systemPrompt = `Buat outline struktur lengkap dengan heading dan subheading untuk topik: ${prompt}

ATURAN STRUKTUR HEADING:
- Gunakan # untuk judul utama (hanya 1)
- Gunakan ## untuk bab-bab utama (level 2) 
- Gunakan ### untuk sub-bab (level 3)
- Gunakan #### untuk detail bagian (level 4)
- Jangan skip level heading

INSTRUKSI PENTING:
- HANYA tulis heading dan subheading
- JANGAN tulis konten paragraf apapun
- TIDAK ada penjelasan atau deskripsi di bawah heading
- Fokus pada struktur yang logis dan terorganisir

TUGAS:
Buat HANYA struktur heading untuk "${prompt}" tanpa konten apapun.`;
          } else {
            systemPrompt = `Buat outline lengkap dan terstruktur untuk topik: ${prompt}

ATURAN STRUKTUR HEADING:
- Gunakan # untuk judul utama (hanya 1)
- Gunakan ## untuk bab-bab utama (level 2)
- Gunakan ### untuk sub-bab (level 3)
- Gunakan #### untuk detail bagian (level 4)

INSTRUKSI PENTING:
- HANYA tulis heading dan subheading
- JANGAN tulis konten paragraf apapun
- TIDAK ada penjelasan atau deskripsi
- Buat struktur yang komprehensif dan logis

TUGAS:
Buat HANYA outline heading untuk "${prompt}" tanpa konten paragraf.`;
          }
        }

        const { text } = await generateText({
          model: aiModel,
          prompt: systemPrompt,
          maxTokens: aiMode === "continue" ? 4000 : 1000,
          temperature: 0.7,
          presencePenalty: 0.1,
          frequencyPenalty: 0.1,
        });
        
        setGeneratedContent(text);
        return text;
      } catch (error) {
        console.error("AI generation failed:", error);
        alert("❌ Gagal menghasilkan konten AI. Silakan coba lagi.");
        return null;
      } finally {
        setIsAILoading(false);
      }
    };

    // Smart content merging - FIXED
    const insertContentWithSmartMerging = async () => {
      try {
        if (!generatedContent || !generatedContent.trim()) {
          console.warn("No content to merge");
          return;
        }

        const currentBlocks = editor.document;
        const generatedLines = generatedContent.split('\n').filter((line: string) => line.trim());
        
        let currentBlockIndex = 0;
        let i = 0;
        
        while (i < generatedLines.length && currentBlockIndex < currentBlocks.length) {
          const line = generatedLines[i].trim();
          if (!line) {
            i++;
            continue;
          }
          
          const headingMatch = line.match(/^(#+)\s+(.+)$/);
          
          if (headingMatch) {
            const level = headingMatch[1].length;
            const headingText = headingMatch[2];
            
            const matchingBlockIndex = findMatchingHeading(currentBlocks, headingText, level, currentBlockIndex);
            
            if (matchingBlockIndex !== -1) {
              currentBlockIndex = matchingBlockIndex;
              i++;
              
              const contentToInsert: any[] = [];
              while (i < generatedLines.length) {
                const contentLine = generatedLines[i].trim();
                if (!contentLine) {
                  i++;
                  continue;
                }
                
                if (contentLine.match(/^#+\s+/)) {
                  break;
                }
                
                contentToInsert.push({
                  type: "paragraph" as const,
                  content: contentLine,
                });
                i++;
              }
              
              if (contentToInsert.length > 0) {
                const targetBlock = currentBlocks[currentBlockIndex];
                await editor.insertBlocks(contentToInsert, targetBlock, "after");
                currentBlockIndex += contentToInsert.length + 1;
              }
            } else {
              i++;
            }
          } else {
            i++;
          }
        }
      } catch (error) {
        console.error("Error in smart merging:", error);
        // Fallback to simple insertion
        const lines = generatedContent.split('\n').filter((line: string) => line.trim());
        const blocksToInsert: any[] = lines.map((line: string) => ({
          type: "paragraph" as const,
          content: line.trim(),
        }));
        
        if (blocksToInsert.length > 0) {
          const lastBlock = editor.document[editor.document.length - 1];
          await editor.insertBlocks(blocksToInsert, lastBlock, "after");
        }
      }
    };

    // Insert content to editor - COMPLETELY FIXED
    const insertContentToEditor = async (shouldAppend: boolean = false) => {
      if (!generatedContent || !generatedContent.trim()) {
        console.warn("No generated content to insert");
        return;
      }

      try {
        if (aiMode === "continue") {
          await insertContentWithSmartMerging();
          closeModalAndReset();
          return;
        }
        
        const lines = generatedContent.split('\n').filter((line: string) => line.trim());
        
        if (lines.length === 0) {
          console.warn("No valid lines to insert");
          return;
        }
        
        const blocksToInsert: any[] = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Parse headings
          const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
          if (headingMatch) {
            const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3;
            const headingText = headingMatch[2].trim();
            
            blocksToInsert.push({
              type: "heading" as const,
              content: headingText,
              props: { level },
            });
          }
          // Parse bullet lists
          else if (line.match(/^[\*\-]\s+/)) {
            const listText = line.replace(/^[\*\-]\s+/, '').trim();
            blocksToInsert.push({
              type: "bulletListItem" as const,
              content: listText,
            });
          }
          // Parse numbered lists
          else if (line.match(/^\d+\.\s+/)) {
            const listText = line.replace(/^\d+\.\s+/, '').trim();
            blocksToInsert.push({
              type: "numberedListItem" as const,
              content: listText,
            });
          }
          // Default paragraph
          else {
            blocksToInsert.push({
              type: "paragraph" as const,
              content: line,
            });
          }
        }
        
        if (blocksToInsert.length > 0) {
          if (!shouldAppend) {
            // Replace all content
            await editor.replaceBlocks(editor.document, blocksToInsert);
            
            // Set cursor to the first block
            setTimeout(() => {
              try {
                const firstBlock = editor.document[0];
                if (firstBlock) {
                  editor.setTextCursorPosition(firstBlock, "start");
                }
              } catch (e) {
                console.log("Cursor positioning adjustment:", e);
              }
            }, 100);
          } else {
            // Append to existing content
            const lastBlock = editor.document[editor.document.length - 1];
            await editor.insertBlocks(blocksToInsert, lastBlock, "after");
            
            // Set cursor to the last inserted block
            setTimeout(() => {
              try {
                const allBlocks = editor.document;
                const lastInsertedBlock = allBlocks[allBlocks.length - 1];
                if (lastInsertedBlock) {
                  editor.setTextCursorPosition(lastInsertedBlock, "end");
                }
              } catch (e) {
                console.log("Cursor positioning adjustment:", e);
              }
            }, 100);
          }
        }
        
        closeModalAndReset();
      } catch (error) {
        console.error("Error inserting content:", error);
        alert("❌ Terjadi kesalahan saat memasukkan konten ke editor. Silakan coba lagi.");
      }
    };

    // Custom AI Slash Menu Items
    const getCustomAISlashMenuItems = React.useMemo(() => {
      if (!aiModel) return [];
      
      return [
        {
          title: "AI Generator",
          onItemClick: () => {
            setAIMode("new");
            openAIModal();
          },
          aliases: ["generate", "write", "tulis"],
          group: "AI Tools",
          subtext: "Generate new content",
          icon: <IconEdit size={18} />,
        },
        {
          title: "Ask AI anything...",
          onItemClick: () => {
            setTimeout(() => {
              handleInlineAITrigger();
            }, 100);
          },
          aliases: ["ai", "assistant", "ask", "help"],
          group: "AI Tools",
          subtext: "AI suggestions and actions",
          icon: <IconSparkles size={18} />,
        }
      ];
    }, [aiModel, handleInlineAITrigger, openAIModal]);

    // Custom Slash Menu Items
    const getCustomSlashMenuItems = React.useMemo(() => {
      const baseItems = getDefaultReactSlashMenuItems(editor);
      
      const orderedItems = [
        ...getCustomAISlashMenuItems,
        ...baseItems.filter(item => 
          ['Heading 1', 'Heading 2', 'Heading 3'].includes(item.title)
        ),
        ...baseItems.filter(item => 
          ['Numbered List', 'Bulleted List', 'Bullet List'].includes(item.title)
        ),
        ...baseItems.filter(item => 
          ['Table', 'Divider'].includes(item.title)
        )
      ];

      return orderedItems;
    }, [editor, getCustomAISlashMenuItems]);

    // Handle content changes
    React.useEffect(() => {
      const handleChange = () => {
        if (onContentChange) {
          onContentChange(editor.document);
        }
      };

      let unsubscribe: (() => void) | undefined;
      
      try {
        unsubscribe = editor.onChange?.(handleChange);
      } catch (error) {
        console.error("Error setting up content change listener:", error);
      }
      
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [editor, onContentChange]);

    return (
      <>
        <div style={{ position: 'relative', height: '100%', ...style }}>
          <div style={{ height: '100%', overflow: 'auto' }}>
            <BlockNoteView
              editor={editor}
              slashMenu={false}
              theme={computedColorScheme}
            >
              <SuggestionMenuController
                triggerCharacter={"/"}
                getItems={async (query) =>
                  filterSuggestionItems(
                    getCustomSlashMenuItems,
                    query
                  )
                }
              />
            </BlockNoteView>
          </div>

          {/* Inline AI Suggestions Popup */}
          {inlineAIState.isVisible && (
            <div
              ref={inlineAIRef}
              style={{
                position: 'absolute',
                left: inlineAIState.position.x,
                top: inlineAIState.position.y,
                zIndex: 1000,
                pointerEvents: 'auto',
                maxWidth: '320px'
              }}
            >
              <div
                style={{
                  backgroundColor: computedColorScheme === "dark" ? "#2c2e33" : "#ffffff",
                  border: `2px solid ${computedColorScheme === "dark" ? "#495057" : "#e9ecef"}`,
                  borderRadius: "12px",
                  boxShadow: computedColorScheme === "dark" 
                    ? "0 8px 20px rgba(0, 0, 0, 0.4)" 
                    : "0 8px 20px rgba(0, 0, 0, 0.15)",
                  padding: "8px",
                  minWidth: "280px",
                  maxHeight: "280px",
                  overflowY: "auto"
                }}
              >
                {/* Header */}
                <div style={{ 
                  padding: '12px 16px', 
                  borderBottom: `1px solid ${computedColorScheme === "dark" ? "#495057" : "#e9ecef"}`,
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconSparkles size={16} color={computedColorScheme === "dark" ? "#9ca3af" : "#6b7280"} />
                    <span style={{ 
                      color: computedColorScheme === "dark" ? "#9ca3af" : "#6b7280", 
                      fontSize: '14px', 
                      fontWeight: 500 
                    }}>
                      Ask AI anything...
                    </span>
                  </div>
                </div>

                {/* Menu Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {inlineAISuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        handleInlineAIAction(suggestion.action);
                      }}
                      style={{
                        all: 'unset',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundColor: 'transparent',
                        color: computedColorScheme === "dark" ? '#e5e7eb' : '#374151',
                        border: '2px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = computedColorScheme === "dark" ? '#495057' : '#f8f9fa';
                        e.currentTarget.style.borderColor = computedColorScheme === "dark" ? '#6c757d' : '#dee2e6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '16px', display: 'flex', alignItems: 'center' }}>
                        {suggestion.icon}
                      </span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: 500, 
                          marginBottom: '2px',
                          color: computedColorScheme === "dark" ? '#e5e7eb' : '#374151'
                        }}>
                          {suggestion.title}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: computedColorScheme === "dark" ? '#9ca3af' : '#6b7280'
                        }}>
                          {suggestion.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Auto Continue Writing Button */}
          {continueState.isVisible && !isAutoContinuing && (
            <div
              ref={continueRef}
              style={{
                position: 'absolute',
                left: continueState.position.x,
                top: continueState.position.y,
                zIndex: 999,
                pointerEvents: 'auto'
              }}
            >
              <Tooltip label="Continue writing with AI" position="top">
                <ActionIcon
                  size="lg"
                  radius="xl"
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'cyan' }}
                  onClick={() => handleInlineAIAction('continue')}
                  style={{
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    animation: 'pulse 2s infinite'
                  }}
                >
                  <IconWand size={18} />
                </ActionIcon>
              </Tooltip>
            </div>
          )}

          {/* Auto Continue Loading Overlay */}
          {isAutoContinuing && (
            <Overlay opacity={0.3}>
              <div style={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                background: computedColorScheme === "dark" ? "#2a2a2a" : "white",
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
              }}>
                <Group gap="md">
                  <Loader size="md" color="blue" />
                  <Text fw={500} c="blue">AI sedang melanjutkan tulisan...</Text>
                </Group>
              </div>
            </Overlay>
          )}
        </div>

        {/* AI Modal */}
        <Modal
          opened={aiModalOpened}
          onClose={closeModalAndReset}
          title={
            <Group gap="md">
              <ThemeIcon size="lg" gradient={{ from: 'blue', to: 'cyan' }} variant="gradient">
                <IconSparkles size={20} />
              </ThemeIcon>
              <Text fw={700} size="xl">
                {aiMode === "continue" ? " AI Lanjutan Konten" : " AI Content Generator"}
              </Text>
            </Group>
          }
          size="xl"
          radius="lg"
          padding="xl"
          centered
          styles={{
            content: { borderRadius: '16px' },
            header: { borderBottom: `2px solid ${computedColorScheme === "dark" ? "#404040" : "#dee2e6"}` }
          }}
        >
          <Stack gap="xl">
            {!generatedContent ? (
              <>
                {/* Prompt Input */}
                <Paper p="lg" radius="md" bg={computedColorScheme === "dark" ? "dark.6" : "gray.1"}>
                  <Stack gap="md">
                    <Text fw={500} size="md">
                      💡 Topik atau Kata Kunci
                    </Text>
                    <Textarea
                      placeholder="Untuk mode 'Struktur' - jelaskan topik secara umum. Untuk mode 'Konten' - masukkan bab/sub bab spesifik yang ingin diisi."
                      value={prompt}
                      onChange={(event) => setPrompt(event.currentTarget.value)}
                      minRows={3}
                      maxRows={6}
                      autosize
                      size="md"
                      styles={{
                        input: {
                          fontSize: '14px',
                          lineHeight: 1.5,
                          border: `1px solid ${computedColorScheme === "dark" ? "#495057" : "#ced4da"}`,
                        }
                      }}
                    />
                    <Text size="sm" c="dimmed">
                      Untuk mode "Struktur" - jelaskan topik secara umum. Untuk mode "Konten" - masukkan bab/sub bab spesifik yang ingin diisi.
                    </Text>
                  </Stack>
                </Paper>

                {/* Info untuk AI Lanjutan */}
                {aiMode === "continue" && (
                  <Paper p="lg" radius="md" bg="blue.0">
                    <Stack gap="md">
                      <Text fw={500} size="md" c="blue">
                        🤖 AI akan otomatis melanjutkan konten yang sudah ada
                      </Text>
                      <Text size="sm" c="blue">
                        AI akan menganalisis heading/subheading di editor dan melengkapi konten yang masih kosong atau singkat.
                      </Text>
                    </Stack>
                  </Paper>
                )}

                {/* AI Templates Grid */}
                <Stack gap="md">
                  <Text fw={500} size="lg" c="dimmed">
                    Pilih mode generate:
                  </Text>
                  
                  <SimpleGrid cols={aiMode === "continue" ? 1 : 2} spacing="lg">
                    {(() => {
                      if (aiMode === "continue") {
                        return [{
                          title: "Lanjutkan Konten", 
                          description: "AI akan melengkapi heading yang masih kosong dengan konten detail",
                          type: "content",
                          color: "green", 
                          icon: IconEdit,
                          defaultPrompt: "Lanjutkan dan lengkapi konten"
                        }];
                      }
                      return aiTemplates;
                    })().map((template) => (
                      <Card
                        key={template.type}
                        p="xl"
                        withBorder
                        radius="lg"
                        style={{
                          cursor: "pointer",
                          transition: 'all 0.2s ease',
                          height: '140px',
                        }}
                        onClick={() => {
                          const finalPrompt = prompt.trim() || template.defaultPrompt;
                          handleAIGeneration(finalPrompt, template.type, aiMode === "new");
                        }}
                      >
                        <Stack gap="md" align="center" justify="center" h="100%">
                          <ThemeIcon 
                            size="xl" 
                            color={template.color} 
                            variant="light"
                            radius="lg"
                          >
                            <template.icon size={24} />
                          </ThemeIcon>
                          <Text size="lg" fw={600} ta="center" lh={1.2}>
                            {template.title}
                          </Text>
                          <Text size="sm" c="dimmed" ta="center">
                            {template.description}
                          </Text>
                        </Stack>
                      </Card>
                    ))}
                  </SimpleGrid>
                </Stack>

                {/* Loading State */}
                {isAILoading && (
                  <Paper p="lg" radius="md" bg="blue.0">
                    <Group gap="md" justify="center">
                      <Loader size="md" color="blue" />
                      <Stack gap="xs" align="center">
                        <Text size="md" c="blue" fw={500}>
                          AI sedang membuat konten...
                        </Text>
                        <Text size="sm" c="blue">
                          Mohon tunggu sebentar
                        </Text>
                      </Stack>
                    </Group>
                  </Paper>
                )}
              </>
            ) : (
              /* Generated Content Display */
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <Text fw={600} size="lg" c="blue">
                    ✨ Konten Yang Dihasilkan
                    {aiMode === "continue" && (
                      <Badge size="sm" color="green" variant="light" ml="sm">
                        Mode Lanjutkan
                      </Badge>
                    )}
                  </Text>
                  <CopyButton value={generatedContent} timeout={2000}>
                    {({ copied, copy }) => (
                      <Button
                        leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                        variant="light"
                        color={copied ? "teal" : "gray"}
                        onClick={copy}
                        size="sm"
                      >
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                    )}
                  </CopyButton>
                </Group>

                {/* Content Preview */}
                <Paper 
                  p="lg" 
                  radius="md" 
                  style={{ 
                    height: '500px',
                    overflow: 'auto',
                    border: `1px solid ${computedColorScheme === "dark" ? "#495057" : "#dee2e6"}`,
                    background: computedColorScheme === "dark" ? "#2c2e33" : "#f8f9fa",
                  }}
                >
                  <Text 
                    style={{ 
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'Inter, sans-serif',
                      lineHeight: 1.6,
                    }}
                    size="sm"
                  >
                    {generatedContent}
                  </Text>
                </Paper>

                {/* Action Buttons */}
                <Group gap="md" grow>
                  <Button
                    size="lg"
                    variant="gradient"
                    gradient={{ from: 'blue', to: 'cyan' }}
                    leftSection={<IconPencil size={20} />}
                    onClick={() => insertContentToEditor(aiMode === "continue")}
                    style={{ 
                      height: '50px',
                      fontWeight: 600,
                    }}
                  >
                    {aiMode === "continue" ? "Tambahkan ke Editor" : "Masukkan ke Editor"}
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    color="gray"
                    leftSection={<IconSparkles size={20} />}
                    onClick={() => {
                      setGeneratedContent("");
                      setPrompt("");
                    }}
                    style={{ 
                      height: '50px',
                      fontWeight: 600,
                    }}
                  >
                    Generate Ulang
                  </Button>
                </Group>
              </Stack>
            )}
          </Stack>
        </Modal>
      </>
    );
  }
);

BlockNoteEditorComponent.displayName = "BlockNoteEditorComponent";

export default BlockNoteEditorComponent;