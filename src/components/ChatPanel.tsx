"use client"

import {
  Box,
  Text,
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
  Modal,
  ThemeIcon,
  CopyButton,
  TextInput,
  Transition,
  Badge,
  Avatar,
  Divider,
  Card,
} from "@mantine/core"
import {
  IconX,
  IconSearch,
  IconWorld,
  IconCircleDot,
  IconCopy,
  IconCheck,
  IconPaperclip,
  IconChevronRight,
  IconChevronLeft,
  IconSend,
  IconNote,
  IconUser,
  IconSparkles,
  IconBrain,
  IconMessageCircle,
} from "@tabler/icons-react"
import React, { useEffect, useState, useRef, useCallback } from "react"
import type { ExtendedNode, ExtendedEdge } from "../types"
import { notifications } from "@mantine/notifications"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useDebouncedValue } from "@mantine/hooks"
import WebViewer from "./WebViewer"
import NodeDetail, { handleAnalytics } from "./NodeDetail"

interface ChatPanelProps {
  sessionId?: string
  selectedNode: ExtendedNode | null
  selectedEdge: ExtendedEdge | null
  resetContext?: boolean
  onContextReset?: () => void
}

type Reference = {
  url: string
  text: string
  preview: string
  ref_mark: string
  type?: string
  index?: number
}

type ChatMessage = {
  sender: "user" | "ai"
  text: string
  contextNodeIds?: string[]
  contextEdgeIds?: string[]
  references?: Reference[]
}

export default function ChatPanel({
  selectedNode,
  selectedEdge,
  sessionId,
  resetContext,
  onContextReset,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [contextNodes, setContextNodes] = useState<ExtendedNode[]>([])
  const [contextEdges, setContextEdges] = useState<ExtendedEdge[]>([])
  const [uploading, setUpLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messageEndRef = useRef<HTMLDivElement>(null)
  const { colorScheme } = useMantineColorScheme()
  const theme = useMantineTheme()
  const isDark = colorScheme === "dark"

  // State for suggestion
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionContext, setSuggestionContext] = useState<"input" | "response" | null>(null)
  const [debouncedInput] = useDebouncedValue(input, 500)
  const [selectedPDF, setSelectedPDF] = useState<string | null>(null)
  const [modalOpened, setModalOpened] = useState(false)
  const [detailModalNode, setDetailModalNode] = useState<any>(null)

  // For forceWeb
  const [forceWeb, setForceWeb] = useState(false)

  // For suggest
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0)
  const [suggestionScrollPosition, setSuggestionScrollPosition] = useState(0)
  const suggestionContainerRef = useRef<HTMLDivElement>(null)

  // For fetch chat - FIXED STATES
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [totalMessages, setTotalMessages] = useState(0)
  const MESSAGES_PER_PAGE = 3
  const isFetchingHistory = useRef(false)
  const isInitialLoad = useRef(true)

  // NEW: For scroll position tracking
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 })
  const lastScrollHeight = useRef(0)

  // Add after other state declarations
  const lastFetchTime = useRef(0)
  const FETCH_COOLDOWN = 2000 // 2 seconds cooldown
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Add after other state declarations
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true)
  const [isInitialMount, setIsInitialMount] = useState(true)

  // NEW: States for Annotation feature
  const [showAnnotationModal, setShowAnnotationModal] = useState(false)
  const [highlightedText, setHighlightedText] = useState<string>("")
  const [annotationTargetUrl, setAnnotationTargetUrl] = useState<string | null>(null)
  const [annotationCommentInput, setAnnotationCommentInput] = useState("")
  const [isSavingAnnotation, setIsSavingAnnotation] = useState(false)

  const scrollSuggestions = (direction: "left" | "right") => {
    if (!suggestionContainerRef.current) return
    const container = suggestionContainerRef.current
    const scrollAmount = 200
    if (direction === "left") {
      container.scrollLeft -= scrollAmount
    } else {
      container.scrollLeft += scrollAmount
    }
    setSuggestionScrollPosition(container.scrollLeft)
  }

  // For nav
  const [showLeftScroll, setShowLeftScroll] = useState(false)
  const [showRightScroll, setShowRightScroll] = useState(false)

  const checkScrollButtons = () => {
    if (!suggestionContainerRef.current) return
    const container = suggestionContainerRef.current
    setShowLeftScroll(container.scrollLeft > 0)
    setShowRightScroll(container.scrollLeft < container.scrollWidth - container.clientWidth)
  }

  // Update scroll buttons when suggestions change
  useEffect(() => {
    checkScrollButtons()
    if (suggestionContainerRef.current) {
      const container = suggestionContainerRef.current
      container.addEventListener("scroll", checkScrollButtons)
      return () => {
        container.removeEventListener("scroll", checkScrollButtons)
      }
    }
  }, [suggestions])

  // Functions for suggestion navigation
  const nextSuggestion = () => {
    setCurrentSuggestionIndex((prev) => (prev + 1) % suggestions.length)
  }

  const prevSuggestion = () => {
    setCurrentSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
  }

  // FIXED: Improved fetchChatMessages function
  const fetchChatMessages = useCallback(
    async (pageNumber = 1, append = false) => {
      if (loadingMore && pageNumber > 1) return // Prevent duplicate requests
      try {
        console.log(`🔄 Fetching messages - Page: ${pageNumber}, Append: ${append}`)
        if (pageNumber > 1) {
          setLoadingMore(true)
        }
        const res = await fetch(`/api/chat?sessionId=${sessionId}&page=${pageNumber}&limit=${MESSAGES_PER_PAGE}`)
        const data = await res.json()
        console.log(`📦 Received ${data.messages.length} messages, Total: ${data.total}, HasMore: ${data.hasMore}`)

        const formatted = data.messages.map((msg: any) => ({
          sender: msg.role === "assistant" ? "ai" : "user",
          text: msg.content,
          contextNodeIds: msg.contextNodeIds || [],
          contextEdgeIds: msg.contextEdgeIds || [],
          references: msg.references || [],
        }))

        if (append) {
          setMessages((prev) => {
            const newMessages = [...formatted, ...prev]
            console.log(`📝 Total messages after append: ${newMessages.length}`)
            return newMessages
          })
          // DON'T set shouldScrollToBottom for infinite scroll
        } else {
          setMessages(formatted)
          console.log(`📝 Set initial messages: ${formatted.length}`)
          setShouldScrollToBottom(true) // Only for initial load
        }

        setTotalMessages(data.total)
        setHasMore(data.hasMore)
        console.log(`📊 Updated state - Total: ${data.total}, HasMore: ${data.hasMore}, Page: ${pageNumber}`)
      } catch (error) {
        console.error("❌ Gagal memuat chat:", error)
      } finally {
        setLoadingMore(false)
      }
    },
    [sessionId, loadingMore],
  )

  // FIXED: Improved loadMoreMessages function
  const loadMoreMessages = useCallback(async () => {
    console.log("🔄 loadMoreMessages called")
    console.log(
      `📊 Current state - LoadingMore: ${loadingMore}, HasMore: ${hasMore}, IsFetching: ${isFetchingHistory.current}`,
    )

    if (loadingMore || !hasMore || isFetchingHistory.current) {
      console.log(
        `⏸️ Skip loading - LoadingMore: ${loadingMore}, HasMore: ${hasMore}, IsFetching: ${isFetchingHistory.current}`,
      )
      return
    }

    isFetchingHistory.current = true
    const nextPage = page + 1
    console.log(`🔄 Loading page ${nextPage}`)

    try {
      await fetchChatMessages(nextPage, true)
      setPage(nextPage)
      console.log(`✅ Successfully loaded page ${nextPage}`)
    } catch (error) {
      console.error("❌ Error in loadMoreMessages:", error)
    } finally {
      isFetchingHistory.current = false
      console.log("✅ loadMoreMessages completed")
    }
  }, [loadingMore, hasMore, page, fetchChatMessages])

  // FIXED: Initial load effect
  useEffect(() => {
    if (sessionId && isInitialLoad.current) {
      console.log("🚀 Initial load for session:", sessionId)
      isInitialLoad.current = false
      setPage(1)
      setHasMore(true)
      fetchChatMessages(1, false)
    }
  }, [sessionId, fetchChatMessages])

  // NEW: Improved scroll position change with debouncing and cooldown
  const handleScrollPositionChange = useCallback(
    ({ x, y }: { x: number; y: number }) => {
      console.log(`📊 Scroll position changed - Y: ${y}`)
      setScrollPosition({ x, y })
      setIsScrolling(true)

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Debounce scroll handling
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false)
        const scrollThreshold = 10 // Increased threshold
        const isNearTop = y <= scrollThreshold
        const canLoadMore = hasMore && !loadingMore && !isFetchingHistory.current

        // Check cooldown period
        const now = Date.now()
        const timeSinceLastFetch = now - lastFetchTime.current
        const cooldownPassed = timeSinceLastFetch > FETCH_COOLDOWN

        console.log(
          `📊 Scroll Check - Y: ${y}, Threshold: ${scrollThreshold}, Near Top: ${isNearTop}, Can Load: ${canLoadMore}, Cooldown: ${cooldownPassed} (${timeSinceLastFetch}ms)`,
        )

        if (isNearTop && canLoadMore && cooldownPassed) {
          console.log("🔄 Triggering loadMoreMessages from scroll position change")
          lastFetchTime.current = now
          loadMoreMessages()
        }
      }, 300) // 300ms debounce
    },
    [hasMore, loadingMore, loadMoreMessages],
  )

  // NEW: Handle scroll position restoration after loading more messages
  useEffect(() => {
    if (isFetchingHistory.current) {
      // Store current scroll height before new messages are added
      const scrollContainer = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement
      if (scrollContainer) {
        lastScrollHeight.current = scrollContainer.scrollHeight
      }
    }
  }, [loadingMore])

  // NEW: Improved scroll position restoration with offset
  useEffect(() => {
    if (!isFetchingHistory.current && loadingMore === false && messages.length > 0) {
      const scrollContainer = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement
      if (scrollContainer && lastScrollHeight.current > 0) {
        const newScrollHeight = scrollContainer.scrollHeight
        const heightDifference = newScrollHeight - lastScrollHeight.current

        if (heightDifference > 0) {
          console.log(`📏 Restoring scroll position - Height diff: ${heightDifference}`)
          // Add offset to prevent immediate re-trigger
          const offset = 200 // 200px offset from top
          const newScrollTop = Math.max(scrollPosition.y + heightDifference + offset, offset)

          setTimeout(() => {
            scrollContainer.scrollTop = newScrollTop
            console.log(`✅ Scroll restored to: ${newScrollTop} (with ${offset}px offset)`)
            lastScrollHeight.current = 0 // Reset
          }, 100)
        }
      }
    }
  }, [messages.length, loadingMore, scrollPosition.y])

  useEffect(() => {
    if (selectedNode) {
      addContextNode(selectedNode)
    }
  }, [selectedNode])

  // FIXED: Smoother scroll to bottom logic
  useEffect(() => {
    const shouldScroll =
      (isInitialMount && messages.length > 0) || (shouldScrollToBottom && !isFetchingHistory.current) || isLoading

    if (shouldScroll) {
      console.log("📍 Scrolling to bottom - Reason:", {
        isInitialMount,
        shouldScrollToBottom,
        isLoading,
        isFetchingHistory: isFetchingHistory.current,
      })

      const scrollToBottom = () => {
        if (scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
          if (scrollContainer) {
            setTimeout(() => {
              scrollContainer.scrollTo({
                top: scrollContainer.scrollHeight,
                behavior: shouldScrollToBottom ? "smooth" : "auto", // Smooth for new messages
              })
              console.log("✅ Scrolled to bottom completed")
            }, 100)
          }
        }

        if (messageEndRef.current && (shouldScrollToBottom || isLoading)) {
          setTimeout(() => {
            messageEndRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "end",
            })
          }, 150)
        }
      }

      scrollToBottom()

      // Reset flags after scrolling
      if (isInitialMount) {
        setIsInitialMount(false)
      }
      if (shouldScrollToBottom) {
        setShouldScrollToBottom(false)
      }
    }
  }, [messages.length, isLoading])

  const fetchInputSuggestion = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const response = await fetch("/api/suggestions/input", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          context: {
            nodeIds: contextNodes.map((n) => n.id),
            edgeIds: contextEdges.map((e) => e.id),
          },
          suggestion_type: "input",
        }),
      })

      const data = await response.json()
      setSuggestions(data.suggestions || [])
      setSuggestionContext("input")
      setShowSuggestions(true)
    } catch (error) {
      console.error("failed to fetch input suggestions:", error)
      setSuggestions([])
    }
  }

  const fetchInitialSuggestions = async () => {
    let mode: "general" | "single node" | "multiple node" = "general"
    if (contextNodes.length === 1) mode = "single node"
    else if (contextNodes.length > 1) mode = "multiple node"

    try {
      const res = await fetch("/api/suggestions/input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "",
          context: {
            nodeIds: contextNodes.map((n) => n.id),
            edgeIds: contextEdges.map((e) => e.id),
          },
          suggestion_type: "input",
          mode,
        }),
      })

      const data = await res.json()
      setSuggestions(data.suggestions || [])
      setShowSuggestions(true)
      setSuggestionContext("input")
    } catch (err) {
      console.error("Failed to fetch initial suggestions:", err)
    }
  }

  useEffect(() => {
    fetchInitialSuggestions()
  }, [contextNodes.length, contextEdges.length])

  const fetchFollowupSuggestions = async (lastMessage: string) => {
    try {
      const res = await fetch("/api/suggestions/followup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lastMessage: lastMessage,
          conversationHistory: messages.slice(-1),
          context: {
            nodeIds: contextNodes.map((n) => n.id),
            edgeIds: contextEdges.map((e) => e.id),
          },
        }),
      })

      const data = await res.json()
      setSuggestions(data.suggestions || [])
      setSuggestionContext("response")
      setShowSuggestions(true)
    } catch (error) {
      console.error("Failed to fetch followup suggestions:", error)
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    setSuggestions([])
    setShowSuggestions(false)
    setSuggestionContext(null)

    const contextNodeIds = contextNodes.filter((node) => node && node.id).map((node) => String(node.id));

    const contextEdgeIds = contextEdges.filter((edge) => edge && edge.id).map((edge) => String(edge.id));

    setMessages((prev) => [...prev, { sender: "user", text: input, contextNodeIds: contextNodeIds }])
    setShouldScrollToBottom(true) // Ensure scroll to bottom for new messages

    const currentInput = input
    setInput("")
    setIsLoading(true)

    // Reset pagination for new conversation
    setPage(1)
    setHasMore(true)

    // Scroll to bottom for new message
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
      }
    }, 50)

    let payloadd = {}
    if (contextNodes.length === 0) {
      payloadd = {
        sessionId,
        question: currentInput,
        contextNodeIds: contextNodes.map((n) => n.id),
        contextEdgeIds: contextEdges.map((e) => e.id),
        forceWeb,
        mode: "general",
      }
    } else if (contextNodes.length === 1) {
      payloadd = {
        sessionId,
        question: currentInput,
        contextNodeIds: contextNodes.map((n) => n.id),
        contextEdgeIds: contextEdges.map((e) => e.id),
        forceWeb,
        mode: "single node",
        nodeId: contextNodes[0].id,
      }
    } else {
      payloadd = {
        sessionId,
        question: currentInput,
        contextNodeIds: contextNodes.map((n) => n.id),
        contextEdgeIds: contextEdges.map((e) => e.id),
        forceWeb,
        mode: "multiple node",
        nodeIds: contextNodes.map((n) => n.id),
      }
    }

    try {
      const result = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payloadd),
      })

      const data = await result.json()

      let processedReferences: Reference[] = []
      if (data.references && Array.isArray(data.references)) {
        processedReferences = data.references.map((ref: any, idx: number) => {
          const processedRef = {
            url: ref.url || ref.source_url || ref.link || "#",
            text: ref.text || ref.title || ref.document_preview || `Reference ${idx + 1}`,
            preview: ref.preview || ref.document_preview || ref.text || "No preview available",
            ref_mark: ref.ref_mark || `[${idx + 1}]`,
            type: ref.type || "document",
            index: idx + 1,
          }
          return processedRef
        })
      }

      setMessages((m) => [...m, { sender: "ai", text: data.answer, references: processedReferences || [], contextNodeIds: contextNodeIds, contextEdgeIds: contextEdgeIds }])

      setTimeout(async () => {
        await fetchFollowupSuggestions(data.answer)
      }, 500)
    } catch (error) {
      setMessages((m) => [...m, { sender: "ai", text: "terjadi kesalahan dalam menjawab pertanyaan" }])
    } finally {
      setIsLoading(false)
    }
  }

  const LoadingMoreIndicator = () => {
    return (
      <Box p="md" style={{ textAlign: "center" }}>
        <Group justify="center" gap="xs">
          <Loader size="sm" color="blue" />
          <Text size="sm" c="dimmed" fw={500}>
            Memuat pesan sebelumnya...
          </Text>
        </Group>
      </Box>
    )
  }

  // Debug button for testing
  const ScrollTestButton = () => {
    const testScroll = () => {
      console.log("🧪 Manual scroll test")
      console.log("📍 Current scroll position:", scrollPosition)
      console.log("📊 State - HasMore:", hasMore, "LoadingMore:", loadingMore)
      // Test manual load
      if (hasMore && !loadingMore) {
        console.log("🔄 Manual trigger loadMoreMessages")
        loadMoreMessages()
      }
    }

    return (
      <Box p="md" style={{ textAlign: "center" }}>
        <Button size="xs" variant="outline" onClick={testScroll}>
          🧪 Test Load More (Debug) - Y: {scrollPosition.y}
        </Button>
      </Box>
    )
  }

  const addContextNode = (node: ExtendedNode) => {
    if (!node || !node.id) return // Guard clause

    setContextNodes((prev) => {
      // Check if node already exists by id
      const exists = prev.some((n) => n.id === node.id)
      if (exists) {
        console.log(`Node ${node.id} already exists in context`)
        return prev
      }
      console.log(`Adding node ${node.id} to context`)
      return [...prev, node]
    })
  }

  const removeContextNode = (node: ExtendedNode) => {
    setContextNodes((prev) => prev.filter((n) => n.id !== node.id))
  }

  const AttachmentDisplay = ({ nodeIds }: { nodeIds: string[] }) => {
    if (!nodeIds || nodeIds.length === 0) return null

    return (
      <Box mb="sm">
        <Group gap={6} align="center">
          <IconPaperclip size={14} style={{ color: theme.colors.blue[6] }} />
          <Text size="xs" c="blue" fw={500}>
            {nodeIds.length} artikel dilampirkan
          </Text>
        </Group>
      </Box>
    )
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleUploadFile = () => {
    fileInputRef.current?.click()
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".pdf")) {
      notifications.show({
        title: "Format tidak didukung",
        message: "Mohon upload file PDF",
        color: "yellow",
        position: "top-right",
      })
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("title", file.name)

    setUpLoading(true)

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const contentType = res.headers.get("content-type")
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Upload failed: ${text}`)
      }

      let data: any = {}
      if (contentType?.includes("application/json")) {
        data = await res.json()
        console.log("File uploaded:", data)
      } else {
        const text = await res.text()
        console.log("Unexpected response:", text)
      }

      notifications.show({
        title: "Berhasil",
        message: `File "${file.name}" berhasil diunggah dan diproses`,
        color: "green",
        position: "top-right",
      })

      console.log("File Uploaded:", data)
    } catch (error: any) {
      notifications.show({
        title: "Upload Gagal",
        message: error.message || "Terjadi Kesalahan saat upload",
        color: "red",
        position: "top-right",
      })
      console.error("File upload error:", error)
    } finally {
      setUpLoading(false)
      e.target.value = ""
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    setShowSuggestions(false)
    setSuggestions([])
    setTimeout(() => {
      const textarea = document.querySelector("textarea")
      textarea?.focus()
    }, 100)
  }

  const handleCloseSuggestions = () => {
    setShowSuggestions(false)
    setSuggestions([])
    setSuggestionContext(null)
  }

  // Cleanup
  useEffect(() => {
    return () => {
      setSuggestions([])
      setShowSuggestions(false)
      setSuggestionContext(null)
      // Cleanup scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // Add this useEffect after the existing useEffects for context reset
  useEffect(() => {
    return () => {
      // Cleanup contextNodes when component unmounts
      console.log("ChatPanel unmounting, clearing context nodes")
      setContextNodes([])
      setContextEdges([])
    }
  }, [])

  // Add useEffect to handle reset from parent
  useEffect(() => {
    if (resetContext) {
      console.log("Resetting context nodes from parent")
      setContextNodes([])
      setContextEdges([])
      onContextReset?.()
    }
  }, [resetContext, onContextReset])

  const LoadingMessage = () => {
    return (
      <Card
        shadow="sm"
        radius="xl"
        withBorder
        style={{
          alignSelf: "flex-start",
          background: isDark
            ? `linear-gradient(135deg, ${theme.colors.dark[6]} 0%, ${theme.colors.dark[7]} 100%)`
            : `linear-gradient(135deg, ${theme.colors.gray[0]} 0%, ${theme.colors.gray[1]} 100%)`,
          maxWidth: "85%",
          padding: "20px",
          border: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[2]}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: `linear-gradient(90deg, ${theme.colors.blue[6]}, ${theme.colors.cyan[5]}, ${theme.colors.violet[6]})`,
            backgroundSize: "200% 100%",
            animation: "shimmer 2s infinite",
          }}
        />
        <Group mb="xs" gap="sm">
          <Avatar
            size="sm"
            radius="xl"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.blue[6]} 0%, ${theme.colors.cyan[5]} 100%)`,
            }}
          >
            <IconBrain size={16} color="white" />
          </Avatar>
          <Text size="sm" fw={600} c={isDark ? theme.colors.gray[3] : theme.colors.gray[7]}>
            AI Assistant
          </Text>
        </Group>
        <Group gap="xs" align="center">
          <Loader size="sm" color="blue" />
          <Text size="sm" c="dimmed" fw={500}>
            Sedang mengetik...
          </Text>
          <Box style={{ display: "flex", gap: "2px", marginLeft: "8px" }}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  backgroundColor: theme.colors.blue[6],
                  animation: `bounce 1.4s infinite ease-in-out both`,
                  animationDelay: `${i * 0.16}s`,
                }}
              />
            ))}
          </Box>
        </Group>
      </Card>
    )
  }

  const handlerOpenPdf = async (url: string) => {
    if (url.startsWith("graph://node/")) {
      const nodeId = url.split("graph://node/")[1]
      try {
        const res = await fetch(`/api/nodes/${nodeId}`)
        const data = await res.json()
        if (res.ok) {
          setDetailModalNode(data)
        } else {
          console.error("Node not found", data)
        }
      } catch (error) {
        console.error("Error fetching node", error)
      }
    } else {
      setSelectedPDF(url)
      setModalOpened(true)
    }
  }

  const ReferenceTooltip = ({ reference, order }: { reference: Reference; order: number }) => {
    const [opened, setOpened] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    const handleMouseEnter = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => setOpened(true), 100)
    }

    const handleMouseLeave = () => {
      timeoutRef.current = setTimeout(() => setOpened(false), 1000)
    }

    const handlePopoverMouseEnter = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }

    const handlePopoverMouseLeave = () => {
      timeoutRef.current = setTimeout(() => setOpened(false), 1000)
    }

    return (
      <Popover
        width={350}
        position="bottom"
        withArrow
        shadow="xl"
        offset={5}
        withinPortal
        opened={opened}
        onClose={() => setOpened(false)}
        transitionProps={{ duration: 200 }}
      >
        <Popover.Target>
          <span
            onClick={() => handlerOpenPdf(reference.url)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              cursor: "pointer",
              fontSize: "0.75rem",
              fontWeight: 600,
              margin: "0 2px",
              transition: "all 0.2s ease",
              background: `linear-gradient(135deg, ${theme.colors.blue[6]} 0%, ${theme.colors.cyan[5]} 100%)`,
              color: "white",
              padding: "2px 6px",
              borderRadius: "4px",
              display: "inline-block",
            }}
          >
            {reference.ref_mark}
          </span>
        </Popover.Target>
        <Popover.Dropdown
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
          style={{
            background: isDark
              ? `linear-gradient(135deg, ${theme.colors.dark[6]} 0%, ${theme.colors.dark[7]} 100%)`
              : `linear-gradient(135deg, ${theme.colors.gray[0]} 0%, white 100%)`,
            border: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[2]}`,
          }}
        >
          <Box p="sm" style={{ maxWidth: 320 }}>
            <Group gap="xs" mb="sm">
              <ThemeIcon size="sm" variant="gradient" gradient={{ from: "blue", to: "cyan" }}>
                <IconCircleDot size={12} />
              </ThemeIcon>
              <Text size="sm" fw={600}>
                Referensi {order}
              </Text>
            </Group>
            <Box
              mt={4}
              style={{
                fontSize: "0.75rem",
                wordBreak: "break-word",
                lineHeight: 1.5,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                color: "inherit",
                marginBottom: "12px",
                padding: "8px",
                backgroundColor: isDark ? theme.colors.dark[8] : theme.colors.gray[0],
                borderRadius: theme.radius.sm,
                border: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
              }}
            >
              {reference.preview}
            </Box>
            <Button
              onClick={() => handlerOpenPdf(reference.url)}
              size="xs"
              variant="gradient"
              gradient={{ from: "blue", to: "cyan" }}
              leftSection={<IconCircleDot size={14} />}
              fullWidth
              style={{
                fontWeight: 500,
              }}
            >
              Buka Dokumen Lengkap
            </Button>
          </Box>
        </Popover.Dropdown>
      </Popover>
    )
  }

  // Enhanced helper function to process text with references
  const processTextWithReferences = (text: string, references: Reference[]) => {
    if (!references || references.length === 0) {
      return text
    }

    try {
      const parts = []
      const remainingText = text
      let currentIndex = 0

      // Create a map of reference marks to reference objects
      const refMap = new Map()
      references.forEach((ref) => {
        refMap.set(ref.ref_mark, ref)
      })

      // Find all reference marks in the text
      const refMarkPattern = /\[[^\]]+\]/g
      const seenRefMarks = new Set<string>()
      let dynamicIndex = 1
      let match

      while ((match = refMarkPattern.exec(text)) !== null) {
        const refMark = match[0]
        const matchStart = match.index

        // Add text before the reference mark
        if (matchStart > currentIndex) {
          parts.push(text.substring(currentIndex, matchStart))
        }

        // Add the reference component if it exists in our map
        const reference = refMap.get(refMark)
        if (reference) {
          const order = seenRefMarks.has(refMark) ? Array.from(seenRefMarks).indexOf(refMark) + 1 : dynamicIndex++
          seenRefMarks.add(refMark)
          parts.push(
            <ReferenceTooltip
              key={`${reference.url}-${reference.ref_mark}-${matchStart}`}
              reference={reference}
              order={order}
            />,
          )
        } else {
          parts.push(refMark)
        }

        currentIndex = matchStart + refMark.length
      }

      // Add any remaining text
      if (currentIndex < text.length) {
        parts.push(text.substring(currentIndex))
      }

      return parts.length > 0 ? parts : text
    } catch (error) {
      console.error("🔍 Error processing text with references:", error)
      return text
    }
  }

  // NEW: Function to handle text selection for annotation
  const handleTextSelectionForAnnotation = useCallback((e: React.MouseEvent<HTMLDivElement>, message: ChatMessage) => {
    const selection = window.getSelection()
    if (!selection || selection.toString().length === 0) {
      setShowAnnotationModal(false)
      return
    }

    const selectedText = selection.toString().trim()
    if (selectedText.length === 0) {
      setShowAnnotationModal(false)
      return
    }

    // Ensure selection is within the AI message content
    const targetElement = e.target as HTMLElement
    const messageContentElement = targetElement.closest(".ai-message-content")
    if (!messageContentElement || !messageContentElement.contains(selection.getRangeAt(0).commonAncestorContainer)) {
      setShowAnnotationModal(false)
      return
    }

    if (!message.contextNodeIds || message.contextNodeIds.length === 0) {
      notifications.show({
        title: "Anotasi Tidak Tersedia",
        message: "Anotasi hanya tersedia untuk respons AI yang berdasarkan dokumen yang dilampirkan.",
        color: "yellow",
        position: "top-right",
      })
      // Clear selection to prevent re-triggering
      selection.empty()
      return
    }

    const documentUrl = message.references?.find(
      (ref) => ref.url.startsWith("http://") || ref.url.startsWith("https://"),
    )?.url

    if (!documentUrl || documentUrl === "#") {
      notifications.show({
        title: "Tidak Ada Dokumen Sumber",
        message: "Respons AI ini tidak memiliki dokumen sumber yang dapat dianotasi.",
        color: "yellow",
        position: "top-right",
      })
      // Clear selection to prevent re-triggering
      selection.empty()
      return
    }

    setHighlightedText(selectedText)
    setAnnotationTargetUrl(documentUrl)
    setAnnotationCommentInput("") // Clear previous comment
    setShowAnnotationModal(true)

    // Clear selection after opening modal to prevent re-triggering
    selection.empty()
  }, [])

  // NEW: Function to save annotation
  const handleSaveAnnotation = async () => {
    if (!highlightedText || !annotationTargetUrl) {
      notifications.show({
        title: "Error",
        message: "Tidak ada teks yang dipilih atau URL dokumen tidak ditemukan.",
        color: "red",
        position: "top-right",
      })
      return
    }

    console.log("Saving annotation with:", {
      highlightedText,
      annotationTargetUrl,
      annotationCommentInput,
    })

    setIsSavingAnnotation(true)

    try {
      const response = await fetch("/api/annotation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document: annotationTargetUrl,
          metadata: {
            pageNumber: 1, // Defaulting to page 1 as chat response doesn't have specific page info
            highlightedText: highlightedText,
            contents: annotationCommentInput,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Gagal menyimpan anotasi.")
      }

      notifications.show({
        title: "Berhasil",
        message: "Anotasi berhasil disimpan!",
        color: "green",
        position: "top-right",
      })

      setShowAnnotationModal(false)
      setHighlightedText("")
      setAnnotationTargetUrl(null)
      setAnnotationCommentInput("")
    } catch (error: any) {
      console.error("Error saving annotation:", error)
      notifications.show({
        title: "Gagal",
        message: error.message || "Terjadi kesalahan saat menyimpan anotasi.",
        color: "red",
        position: "top-right",
      })
    } finally {
      setIsSavingAnnotation(false)
    }
  }

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "90vh",
        overflow: "hidden",
        position: "relative",
        background: isDark
          ? `linear-gradient(180deg, ${theme.colors.dark[8]} 0%, ${theme.colors.dark[9]} 100%)`
          : `linear-gradient(180deg, ${theme.colors.gray[0]} 0%, white 100%)`,
      }}
    >
      {/* Enhanced Chat History */}
      <ScrollArea
        ref={scrollAreaRef}
        style={{
          height: "500px",
          minHeight: 0,
        }}
        styles={{
          viewport: {
            "& > div": {
              display: "flex !important",
              flexDirection: "column",
              justifyContent: "flex-start",
            },
          },
        }}
        onScrollPositionChange={handleScrollPositionChange}
      >
        <Stack
          gap="lg"
          p="md"
          style={{
            minHeight: "535px",
          }}
        >
          {/* Loading indicator for infinite scroll */}
          {loadingMore && <LoadingMoreIndicator />}

          {/* Debug button - remove in production */}
          <ScrollTestButton />

          {/* Info if reached beginning of chat */}
          {!hasMore && messages.length > 0 && (
            <Box p="md" style={{ textAlign: "center" }}>
              <Divider
                label={
                  <Group gap="xs">
                    <IconMessageCircle size={16} />
                    <Text size="sm" c="dimmed" fw={500}>
                      Awal percakapan
                    </Text>
                  </Group>
                }
                labelPosition="center"
              />
            </Box>
          )}

          {messages.length === 0 && !loadingMore ? (
            <Box
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                minHeight: "505px",
                textAlign: "center",
              }}
            >
              <Stack align="center" gap="md">
                <ThemeIcon size={60} radius="xl" variant="gradient" gradient={{ from: "blue", to: "cyan", deg: 45 }}>
                  <IconSparkles size={30} />
                </ThemeIcon>
                <Text c="dimmed" size="lg" fw={500}>
                  Mulai Percakapan dengan AI Assistant
                </Text>
                <Text c="dimmed" size="sm">
                  Ajukan pertanyaan atau pilih dokumen untuk memulai
                </Text>
              </Stack>
            </Box>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <Transition key={idx} mounted={true} transition="slide-up" duration={300} timingFunction="ease">
                  {(styles) => (
                    <Card
                      shadow="sm"
                      radius="xl"
                      withBorder
                      style={{
                        ...styles,
                        alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                        background:
                          msg.sender === "user"
                            ? isDark
                              ? `linear-gradient(135deg, ${theme.colors.blue[8]} 0%, ${theme.colors.blue[9]} 100%)`
                              : `linear-gradient(135deg, ${theme.colors.blue[0]} 0%, ${theme.colors.cyan[0]} 100%)`
                            : isDark
                              ? `linear-gradient(135deg, ${theme.colors.dark[6]} 0%, ${theme.colors.dark[7]} 100%)`
                              : `linear-gradient(135deg, ${theme.colors.gray[0]} 0%, white 100%)`,
                        maxWidth: "85%",
                        padding: "20px",
                        border: `1px solid ${
                          msg.sender === "user"
                            ? isDark
                              ? theme.colors.blue[7]
                              : theme.colors.blue[2]
                            : isDark
                              ? theme.colors.dark[4]
                              : theme.colors.gray[2]
                        }`,
                        position: "relative",
                        overflow: "hidden",
                      }}
                      // NEW: Add onMouseUp handler for AI messages
                      onMouseUp={msg.sender === "ai" ? (e) => handleTextSelectionForAnnotation(e, msg) : undefined}
                    >
                      {/* Accent line for AI messages */}
                      {msg.sender === "ai" && (
                        <Box
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: "3px",
                            background: `linear-gradient(90deg, ${theme.colors.blue[6]}, ${theme.colors.cyan[5]}, ${theme.colors.violet[6]})`,
                          }}
                        />
                      )}

                      <Group justify="space-between" mb="md">
                        <Group gap="sm">
                          <Avatar
                            size="sm"
                            radius="xl"
                            style={{
                              background:
                                msg.sender === "user"
                                  ? `linear-gradient(135deg, ${theme.colors.green[6]} 0%, ${theme.colors.teal[5]} 100%)`
                                  : `linear-gradient(135deg, ${theme.colors.blue[6]} 0%, ${theme.colors.cyan[5]} 100%)`,
                            }}
                          >
                            {msg.sender === "user" ? (
                              <IconUser size={16} color="white" />
                            ) : (
                              <IconBrain size={16} color="white" />
                            )}
                          </Avatar>
                          <Text size="sm" fw={600} c={isDark ? theme.colors.gray[3] : theme.colors.gray[7]}>
                            {msg.sender === "user" ? "Anda" : "AI Assistant"}
                          </Text>
                        </Group>

                        {/* Copy Button - only for AI response */}
                        {msg.sender === "ai" && (
                          <CopyButton value={msg.text} timeout={2000}>
                            {({ copied, copy }) => (
                              <Tooltip label={copied ? "Berhasil disalin!" : "Salin jawaban"} position="top" withArrow>
                                <ActionIcon
                                  variant="subtle"
                                  size="sm"
                                  onClick={copy}
                                  style={{
                                    transition: "all 0.2s ease",
                                    transform: copied ? "scale(1.1)" : "scale(1)",
                                  }}
                                >
                                  {copied ? (
                                    <IconCheck size={16} style={{ color: theme.colors.green[6] }} />
                                  ) : (
                                    <IconCopy size={16} style={{ color: theme.colors.gray[6] }} />
                                  )}
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </CopyButton>
                        )}
                      </Group>

                      {/* Enhanced attachment display for user messages */}
                      {msg.sender === "user" && msg.contextNodeIds && msg.contextNodeIds.length > 0 && (
                        <AttachmentDisplay nodeIds={msg.contextNodeIds} />
                      )}

                      {msg.sender === "user" ? (
                        <Text size="sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                          {msg.text}
                        </Text>
                      ) : (
                        <TypographyStylesProvider className="ai-message-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => {
                                const extractText = (children: React.ReactNode): string => {
                                  if (children === null || children === undefined) return ""
                                  if (typeof children === "string" || typeof children === "number") {
                                    return String(children)
                                  }
                                  if (Array.isArray(children)) {
                                    return children.map(extractText).join("")
                                  }
                                  if (React.isValidElement(children)) {
                                    return extractText((children.props as { children?: React.ReactNode }).children)
                                  }
                                  return ""
                                }

                                const textContent = extractText(children)
                                if (!msg.references)
                                  return (
                                    <Box mb="xs" style={{ lineHeight: 1.6, fontSize: "14px" }}>
                                      {children}
                                    </Box>
                                  )

                                const dedupedReferences = Array.from(
                                  new Map(msg.references.map((ref) => [`${ref.url}-${ref.ref_mark}`, ref])).values(),
                                )
                                const sortedReferences = dedupedReferences.sort(
                                  (a, b) => (a.index ?? 999) - (b.index ?? 999),
                                )

                                const processedContent = processTextWithReferences(textContent, sortedReferences)

                                return (
                                  <Box mb="xs" style={{ lineHeight: 1.6, fontSize: "14px" }}>
                                    {processedContent}
                                  </Box>
                                )
                              },
                              h1: ({ children }) => (
                                <Text
                                  size="xl"
                                  fw={700}
                                  mb="md"
                                  c={isDark ? theme.colors.gray[2] : theme.colors.gray[8]}
                                >
                                  {children}
                                </Text>
                              ),
                              h3: ({ children }) => (
                                <Text
                                  size="md"
                                  fw={600}
                                  mb="sm"
                                  c={isDark ? theme.colors.gray[3] : theme.colors.gray[7]}
                                >
                                  {children}
                                </Text>
                              ),
                              ul: ({ children }) => (
                                <Box component="ul" ml="md" mb="sm">
                                  {children}
                                </Box>
                              ),
                              ol: ({ children }) => (
                                <Box component="ol" ml="md" mb="sm">
                                  {children}
                                </Box>
                              ),
                              li: ({ children }) => (
                                <Text component="li" size="sm" mb="xs" style={{ lineHeight: 1.5 }}>
                                  {children}
                                </Text>
                              ),
                              strong: ({ children }) => (
                                <Text component="span" fw={700}>
                                  {children}
                                </Text>
                              ),
                              em: ({ children }) => (
                                <Text component="span" fs="italic">
                                  {children}
                                </Text>
                              ),
                              code: ({ children, className }) => {
                                const isInline = !className
                                return isInline ? (
                                  <Badge
                                    variant="light"
                                    color="gray"
                                    style={{
                                      fontFamily: "monospace",
                                      fontSize: "0.8em",
                                    }}
                                  >
                                    {children}
                                  </Badge>
                                ) : (
                                  <Paper
                                    bg={isDark ? theme.colors.dark[8] : theme.colors.gray[0]}
                                    p="md"
                                    mb="sm"
                                    radius="md"
                                    withBorder
                                    style={{
                                      overflow: "auto",
                                    }}
                                  >
                                    <Text
                                      component="pre"
                                      size="sm"
                                      style={{
                                        fontFamily: "monospace",
                                        margin: 0,
                                        whiteSpace: "pre-wrap",
                                      }}
                                    >
                                      <code>{children}</code>
                                    </Text>
                                  </Paper>
                                )
                              },
                              table: ({ children }) => (
                                <Box style={{ overflowX: "auto" }} mb="md">
                                  <Box
                                    component="table"
                                    style={{
                                      width: "100%",
                                      borderCollapse: "collapse",
                                      fontSize: "0.875rem",
                                    }}
                                  >
                                    {children}
                                  </Box>
                                </Box>
                              ),
                              thead: ({ children }) => <Box component="thead">{children}</Box>,
                              tbody: ({ children }) => <Box component="tbody">{children}</Box>,
                              tr: ({ children }) => (
                                <Box
                                  component="tr"
                                  style={{
                                    borderBottom: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
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
                                    backgroundColor: isDark ? theme.colors.dark[7] : theme.colors.gray[0],
                                    fontWeight: 600,
                                    textAlign: "left",
                                    border: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
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
                                    border: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
                                    verticalAlign: "top",
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
                                  radius="md"
                                  style={{
                                    borderLeft: `4px solid ${theme.colors.blue[6]}`,
                                    backgroundColor: isDark ? theme.colors.dark[7] : theme.colors.blue[0],
                                  }}
                                >
                                  {children}
                                </Paper>
                              ),
                            }}
                          >
                            {msg.text}
                          </ReactMarkdown>

                          {/* Enhanced Reference List */}
                          {(msg.references?.length ?? 0) > 0 && (
                            <Card
                              mt="md"
                              p="sm"
                              radius="md"
                              withBorder
                              style={{
                                background: isDark
                                  ? `linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%)`
                                  : `linear-gradient(135deg, ${theme.colors.gray[0]} 0%, ${theme.colors.gray[1]} 100%)`,
                                border: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
                              }}
                            >
                              <Group gap="xs" mb="sm">
                                <ThemeIcon size="sm" variant="gradient" gradient={{ from: "blue", to: "cyan" }}>
                                  <IconCircleDot size={12} />
                                </ThemeIcon>
                                <Text size="xs" fw={600} c={isDark ? theme.colors.gray[4] : theme.colors.gray[6]}>
                                  Referensi:
                                </Text>
                              </Group>
                              <Stack gap={6}>
                                {msg.references
                                  ?.sort((a, b) => (a.index ?? 999) - (b.index ?? 999)) // Sort by the 'index' property
                                  .map((ref, idx) => (
                                    <Group key={`${ref.text.toLowerCase().trim()}-${idx}`} gap={8} align="flex-start">
                                      <Badge size="xs" variant="light" color="blue">
                                        {ref.ref_mark}
                                      </Badge>
                                      <Anchor
                                        href="#"
                                        size="xs"
                                        style={{
                                          wordBreak: "break-all",
                                          lineHeight: 1.4,
                                        }}
                                        onClick={(e) => {
                                          e.preventDefault()
                                          handlerOpenPdf(ref.url)
                                        }}
                                      >
                                        {ref.text}
                                      </Anchor>
                                    </Group>
                                  ))}
                              </Stack>
                            </Card>
                          )}
                        </TypographyStylesProvider>
                      )}
                    </Card>
                  )}
                </Transition>
              ))}
              {isLoading && <LoadingMessage />}
              <div ref={messageEndRef} />
            </>
          )}
        </Stack>
      </ScrollArea>

      {/* Enhanced Context Preview Chips - More Compact */}
      {contextNodes.length > 0 && (
        <Box px="md" py="xs" style={{ flexShrink: 0 }}>
          <Group mb="xs" gap="xs" wrap="wrap">
            {contextNodes.map((node) => (
              <Badge
                key={`context-node-${node.id}`}
                variant="gradient"
                gradient={{ from: "blue", to: "cyan", deg: 45 }}
                size="sm"
                radius="md"
                style={{
                  paddingLeft: "8px",
                  paddingRight: "4px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: 500,
                  maxWidth: "200px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                rightSection={
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    color="white"
                    onClick={() => removeContextNode(node)}
                    style={{
                      minWidth: "16px",
                      width: "16px",
                      height: "16px",
                      marginLeft: "2px",
                    }}
                  >
                    <IconX size={10} />
                  </ActionIcon>
                }
                leftSection={<IconPaperclip size={10} />}
              >
                {(node.title || node.label || '').length > 20
                  ? `${(node.title || node.label || '').substring(0, 20)}...`
                  : node.title || node.label}
              </Badge>
            ))}
          </Group>
        </Box>
      )}

      {/* Enhanced Input Area */}
      <Box
        p="md"
        style={{
          flexShrink: 0,
          borderTop: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
          background: isDark
            ? `linear-gradient(180deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%)`
            : `linear-gradient(180deg, white 0%, ${theme.colors.gray[0]} 100%)`,
        }}
      >
        {/* Combined Input Area with Suggestions */}
        <Card
          withBorder
          radius="xl"
          p="md"
          shadow="sm"
          style={{
            background: isDark
              ? `linear-gradient(135deg, ${theme.colors.dark[6]} 0%, ${theme.colors.dark[7]} 100%)`
              : `linear-gradient(135deg, white 0%, ${theme.colors.gray[0]} 100%)`,
            border: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[2]}`,
          }}
        >
          {/* Input Row */}
          <Group align="flex-end" gap="sm" mb="sm">
            <Box style={{ flex: 1 }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={isLoading ? "Menunggu Respon AI..." : "Mulai mengetik..."}
                rows={1}
                style={{
                  width: "100%",
                  padding: "16px",
                  backgroundColor: "transparent",
                  color: isDark ? theme.colors.gray[2] : theme.black,
                  border: "none",
                  outline: "none",
                  resize: "none",
                  minHeight: "24px",
                  maxHeight: "120px",
                  overflow: "hidden",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  borderRadius: theme.radius.md,
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = "auto"
                  target.style.height = target.scrollHeight + "px"
                }}
              />
            </Box>

            {/* Enhanced Web Search Toggle */}
            <Tooltip label={forceWeb ? "Pencarian web aktif" : "Pencarian web nonaktif"} position="top" withArrow>
              <Box
                style={{
                  padding: "8px",
                  borderRadius: theme.radius.md,
                  background: forceWeb
                    ? `linear-gradient(135deg, ${theme.colors.blue[1]} 0%, ${theme.colors.cyan[1]} 100%)`
                    : isDark
                      ? theme.colors.dark[5]
                      : theme.colors.gray[1],
                  border: `1px solid ${forceWeb ? theme.colors.blue[3] : isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                  transition: "all 0.2s ease",
                }}
              >
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
                  styles={{
                    track: {
                      backgroundColor: forceWeb ? theme.colors.blue[6] : undefined,
                    },
                  }}
                />
              </Box>
            </Tooltip>

            {/* Enhanced Send Button */}
            <ActionIcon
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="xl"
              variant="gradient"
              gradient={{ from: "blue", to: "cyan", deg: 45 }}
              radius="xl"
              style={{
                cursor: !input.trim() || isLoading ? "not-allowed" : "pointer",
                opacity: !input.trim() || isLoading ? 0.5 : 1,
                transition: "all 0.2s ease",
                transform: !input.trim() || isLoading ? "scale(0.95)" : "scale(1)",
              }}
              styles={{
                root: {
                  "&:hover": {
                    transform: !input.trim() || isLoading ? "scale(0.95)" : "scale(1.05)",
                    boxShadow: theme.shadows.md,
                  },
                },
              }}
            >
              <IconSend size={20} />
            </ActionIcon>
          </Group>

          {/* Enhanced Suggested Questions Row - Better Spacing */}
          {suggestions.length > 0 && (
            <Group align="center" gap="sm" style={{ position: "relative" }}>
              {/* Left Scroll Button */}
              {showLeftScroll && (
                <ActionIcon
                  onClick={() => scrollSuggestions("left")}
                  size="sm"
                  variant="gradient"
                  gradient={{ from: "blue", to: "cyan" }}
                  radius="xl"
                  style={{
                    boxShadow: theme.shadows.sm,
                    flexShrink: 0,
                  }}
                >
                  <IconChevronLeft size={14} />
                </ActionIcon>
              )}

              {/* Suggestions Container */}
              <Box
                ref={suggestionContainerRef}
                style={{
                  flex: 1,
                  overflowX: "auto",
                  scrollBehavior: "smooth",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                <Group gap="xs" wrap="nowrap" style={{ minWidth: "fit-content" }}>
                  {suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      variant="light"
                      size="xs"
                      radius="lg"
                      style={{
                        background: isDark
                          ? `linear-gradient(135deg, ${theme.colors.dark[5]} 0%, ${theme.colors.dark[6]} 100%)`
                          : `linear-gradient(135deg, ${theme.colors.gray[1]} 0%, ${theme.colors.gray[0]} 100%)`,
                        color: isDark ? theme.colors.gray[3] : theme.colors.gray[7],
                        padding: "4px 10px",
                        border: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                        whiteSpace: "nowrap",
                        fontSize: "11px",
                        fontWeight: 500,
                        minWidth: "fit-content",
                        maxWidth: "200px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        flexShrink: 0,
                        transition: "all 0.2s ease",
                        height: "24px",
                        lineHeight: "1",
                      }}
                      styles={{
                        root: {
                          "&:hover": {
                            transform: "translateY(-1px)",
                            boxShadow: theme.shadows.sm,
                            background: isDark
                              ? `linear-gradient(135deg, ${theme.colors.blue[8]} 0%, ${theme.colors.cyan[8]} 100%)`
                              : `linear-gradient(135deg, ${theme.colors.blue[0]} 0%, ${theme.colors.cyan[0]} 100%)`,
                          },
                        },
                      }}
                    >
                      {suggestion.length > 32 ? `${suggestion.substring(0, 32)}...` : suggestion}
                    </Button>
                  ))}
                </Group>
              </Box>

              {/* Right Scroll Button */}
              {showRightScroll && (
                <ActionIcon
                  onClick={() => scrollSuggestions("right")}
                  size="sm"
                  variant="gradient"
                  gradient={{ from: "blue", to: "cyan" }}
                  radius="xl"
                  style={{
                    boxShadow: theme.shadows.sm,
                    flexShrink: 0,
                  }}
                >
                  <IconChevronRight size={14} />
                </ActionIcon>
              )}

              {/* Enhanced source count - inline */}
              <Badge
                variant="light"
                color="blue"
                size="xs"
                style={{
                  fontSize: "10px",
                  height: "20px",
                  flexShrink: 0,
                  marginLeft: "4px",
                }}
              >
                {suggestions.length}
              </Badge>
            </Group>
          )}
        </Card>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={onFileChange}
          accept="application/pdf"
        />
      </Box>

      {/* Enhanced Modals */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false)
          setSelectedPDF(null)
        }}
        title={
          <Group gap="sm">
            <ThemeIcon variant="gradient" gradient={{ from: "blue", to: "cyan" }} size="md">
              <IconCircleDot size={16} />
            </ThemeIcon>
            <Text fw={600}>Lihat Artikel</Text>
          </Group>
        }
        size="90%"
        padding="sm"
        centered
        overlayProps={{ blur: 3 }}
        styles={{
          content: {
            height: "90vh",
            display: "flex",
            flexDirection: "column",
            padding: 0,
            position: "relative",
          },
          body: {
            flex: 1,
            overflow: "hidden",
            padding: 0,
            position: "relative",
          },
        }}
      >
        {selectedPDF && (
          <div style={{ height: "100%", position: "relative" }}>
            <WebViewer fileUrl={selectedPDF} onAnalytics={handleAnalytics} />
          </div>
        )}
      </Modal>

      <Modal
        opened={!!detailModalNode}
        onClose={() => {
          setDetailModalNode(null)
        }}
        title={
          <Group gap="sm">
            <ThemeIcon variant="gradient" gradient={{ from: "blue", to: "cyan" }} size="md">
              <IconCircleDot size={16} />
            </ThemeIcon>
            <Box>
              <Text fw={600}>{detailModalNode?.title || "Detail Artikel"}</Text>
              <Text size="xs" c="dimmed">
                Informasi lengkap artikel
              </Text>
            </Box>
          </Group>
        }
        size="75vw"
        radius="lg"
        shadow="xl"
      >
        <NodeDetail
          node={detailModalNode}
          onClose={() => {
            setDetailModalNode(null)
          }}
        />
      </Modal>

      {/* Enhanced Annotation Modal */}
      <Modal
        opened={showAnnotationModal}
        onClose={() => setShowAnnotationModal(false)}
        title={
          <Group gap="xs">
            <ThemeIcon variant="gradient" gradient={{ from: "blue", to: "cyan" }} size="md">
              <IconNote size={16} />
            </ThemeIcon>
            <Text fw={600}>Buat Anotasi</Text>
          </Group>
        }
        centered
        overlayProps={{ blur: 3 }}
        radius="lg"
      >
        <Stack gap="md">
          <Box>
            <Text size="sm" c="dimmed" mb={8} fw={500}>
              Teks yang dipilih:
            </Text>
            <Card
              p="md"
              withBorder
              radius="md"
              style={{
                background: isDark
                  ? `linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%)`
                  : `linear-gradient(135deg, ${theme.colors.gray[0]} 0%, ${theme.colors.gray[1]} 100%)`,
                border: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
              }}
            >
              <Text size="sm" style={{ fontStyle: "italic", lineHeight: 1.5 }}>
                {highlightedText.length > 150 ? `${highlightedText.substring(0, 150)}...` : highlightedText}
              </Text>
            </Card>
          </Box>

          <TextInput
            label="Komentar Anda"
            placeholder="Tambahkan komentar untuk anotasi ini..."
            value={annotationCommentInput}
            onChange={(event) => setAnnotationCommentInput(event.currentTarget.value)}
            styles={{
              input: {
                borderRadius: theme.radius.md,
              },
            }}
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="light" color="gray" onClick={() => setShowAnnotationModal(false)} radius="md">
              Batal
            </Button>
            <Button
              variant="gradient"
              gradient={{ from: "blue", to: "cyan" }}
              onClick={handleSaveAnnotation}
              loading={isSavingAnnotation}
              disabled={!annotationCommentInput.trim()}
              leftSection={<IconCheck size={16} />}
              radius="md"
            >
              Simpan Anotasi
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes bounce {
          0%, 80%, 100% { 
            transform: scale(0);
          } 40% { 
            transform: scale(1.0);
          }
        }
      `}</style>
    </Box>
  )
}
