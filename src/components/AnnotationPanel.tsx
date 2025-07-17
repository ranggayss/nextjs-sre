// src/components/AnnotationPanel.tsx
'use client';

import { 
  Box, 
  Text, 
  Group, 
  ThemeIcon, 
  Badge, 
  Card, 
  Divider, 
  Button, 
  LoadingOverlay,
  Modal,
  ActionIcon,
  useMantineColorScheme,
  useMantineTheme,
  Menu,
  Tooltip,
  Stack,
  Paper,
  Transition,
  UnstyledButton
} from '@mantine/core';
import { 
  IconArticleFilled, 
  IconEye, 
  IconSquareRoundedX, 
  IconHistory, 
  IconFile, 
  IconCalendar, 
  IconNotes,
  IconChevronLeft,
  IconHighlight,
  IconDots,
  IconBookmark,
  IconQuote,
  IconTrash,
  IconExternalLink,
  IconNote,
  IconNotebook
} from '@tabler/icons-react';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { useHover } from '@mantine/hooks';
import WebViewer from './WebViewer';
import { handleAnalytics } from './NodeDetail';
import { modals } from '@mantine/modals';

interface Annotation {
  id: string;
  articleId: string;
  page: number;
  highlightedText: string;
  comment: string;
  semanticTag?: string;
  createdAt: string;
  article: {
    id: string;
    title: string;
    filePath: string;
  };
};

interface Article {
    id: string,
    title: string,
    att_background: string,
    att_url: string,
    filePath: string,
};

export default function AnnotationPanel({ sessionId }: { sessionId?: string }) {
  const { id: currentSessionId } = useParams();
  const effectiveSessionId = sessionId || currentSessionId;
  
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const [article, setArticle] = useState<Article[]>([]);

  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const isDark = colorScheme === 'dark';

  const fetchAnnotations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/annotation?sessionId=${effectiveSessionId}`);
      if (res.ok) {
        const data = await res.json();
        setAnnotations(data);
      }
    } catch (error) {
      console.error('Error fetching annotations:', error);
      notifications.show({
        title: 'Error',
        message: 'Gagal memuat daftar anotasi',
        color: 'red',
        position: 'top-right',
      });
    } finally {
      setLoading(false);
    }
  };

  const getArticle = async () => {
    const res = await fetch(`/api/nodes?sessionId=${sessionId}`);
    const article = await res.json();

    setArticle(article);
  }

  useEffect(() => {
    fetchAnnotations();
  }, [effectiveSessionId]);

  const beforeDeleteAnnotation = async (id: string, title: string) => {
    modals.openConfirmModal({
      title: (
        <Text size='lg' fw={600} c='red'>
          🗑️ Konfirmasi Hapus Anotasi
        </Text>
      ),
      children: (
        <Box>
          <Text size='sm' mb='md'>
            Apakah Anda yakin ingin menghapus anotasi berikut?
          </Text>
          <Box p='md' style={{
            backgroundColor: isDark ? theme.colors.dark[5] : theme.colors.gray[0],
            borderRadius: theme.radius.md,
            border: `1px solid ${isDark ? theme.colors.red[8] : theme.colors.red[2]}`
          }}>
            <Text fw={600} size='sm' mb='xs'>
              {title}
            </Text>
            <Text size='xs' c='dimmed'>
              ID: {id}
            </Text>
          </Box>
          <Text size='sm' c='red' fw={500} mt='md'>
            ⚠️ Tindakan ini tidak dapat dibatalkan!
          </Text>
        </Box>
      ),
      labels: {
        confirm: 'Ya, Hapus Anotasi',
        cancel: 'Batal'
      },
      confirmProps: {
        color: 'red',
        size: 'md',
        leftSection: <IconSquareRoundedX size={16} />
      },
      cancelProps: {
        variant: 'outline',
        size: 'md'
      },
      size: 'md',
      centered: true,
      onConfirm: async () => {
        await handleDeleteAnnotation(id);
      },
    });
  };

  const handleDeleteAnnotation = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/annotation/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      if (res.ok) {
        notifications.show({
          title: 'Berhasil',
          message: 'Anotasi berhasil dihapus',
          color: 'green',
          position: 'top-right',
        });
        await fetchAnnotations();
      } else {
        throw new Error('Gagal menghapus anotasi');
      }
    } catch (error) {
      console.error('Delete error:', error);
      notifications.show({
        title: 'Gagal',
        message: 'Gagal menghapus anotasi',
        color: 'red',
        position: 'top-right',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const NoteCard = ({ annotation }: { annotation: Annotation }) => {
    const { hovered, ref } = useHover();
    const isExpanded = expandedCard === annotation.id;
    const [menuOpened, setMenuOpened] = useState(false);
    
    return (
      <Paper
        ref={ref}
        mb="sm"
        p="md"
        radius="lg"
        style={{
          position: 'relative',
          background: isDark 
            ? `linear-gradient(135deg, ${theme.colors.dark[6]} 0%, ${theme.colors.dark[5]} 100%)`
            : `linear-gradient(135deg, ${theme.colors.gray[0]} 0%, ${theme.colors.gray[1]} 100%)`,
          border: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[2]}`,
          transition: 'all 0.3s ease',
          transform: hovered || menuOpened ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: hovered || menuOpened
            ? `0 8px 25px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)'}` 
            : `0 2px 8px ${isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'}`,
          cursor: 'pointer'
        }}
        onClick={() => {
          if (!menuOpened) {
            setExpandedCard(isExpanded ? null : annotation.id);
          }
        }}
      >
        {/* Sticky Note Style Header */}
        <Box
          style={{
            position: 'absolute',
            top: 0,
            right: 12,
            width: 8,
            height: 20,
            background: isDark ? theme.colors.yellow[6] : theme.colors.yellow[4],
            borderRadius: '0 0 4px 4px',
            opacity: 0.8
          }}
        />
        
        {/* Main Content */}
        <Stack gap="sm">
          {/* Quote Section */}
          <Box>
            <Group gap="xs" mb="xs" opacity={0.7}>
              <IconQuote size={12} />
              <Text size="xs" c="dimmed">Kutipan</Text>
            </Group>
            <Text
              size="sm"
              style={{
                fontStyle: 'italic',
                lineHeight: 1.5,
                color: isDark ? theme.colors.gray[3] : theme.colors.gray[7],
                display: '-webkit-box',
                WebkitLineClamp: isExpanded ? 'none' : 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              "{annotation.highlightedText}"
            </Text>
          </Box>

          {/* Note Section */}
          {annotation.comment && (
            <Box>
              <Group gap="xs" mb="xs" opacity={0.7}>
                <IconNotebook size={12} />
                <Text size="xs" c="dimmed">Catatan</Text>
              </Group>
              <Text
                size="sm"
                style={{
                  lineHeight: 1.5,
                  color: isDark ? theme.colors.gray[2] : theme.colors.gray[8],
                  display: '-webkit-box',
                  WebkitLineClamp: isExpanded ? 'none' : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {annotation.comment}
              </Text>
            </Box>
          )}

          {/* Compact Footer */}
          <Group justify="space-between" align="center" mt="xs">
            <Group gap="xs">
              <Text
                size="xs"
                c="dimmed"
                style={{
                  maxWidth: 150,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {annotation.article.title}
              </Text>
              <Text size="xs" c="dimmed">•</Text>
              <Text size="xs" c="dimmed">
                Hal. {annotation.page}
              </Text>
            </Group>
            
            <Group gap="xs">
              {annotation.semanticTag && (
                <Badge
                  variant="dot"
                  size="xs"
                  color="grape"
                  style={{ textTransform: 'none' }}
                >
                  {annotation.semanticTag}
                </Badge>
              )}
              <Text size="xs" c="dimmed">
                {new Date(annotation.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short'
                })}
              </Text>
            </Group>
          </Group>
        </Stack>

        {/* Action Menu - Visible on hover or when menu is open */}
        <Transition mounted={hovered || menuOpened} transition="fade" duration={200}>
          {(styles) => (
            <Menu
              position="bottom-end"
              withArrow
              shadow="lg"
              styles={{ dropdown: { minWidth: 180 } }}
              opened={menuOpened}
              onChange={setMenuOpened}
            >
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    ...styles
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpened(true);
                  }}
                >
                  <IconDots size={16} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconEye size={16} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPDF(`${annotation.article.filePath}`);
                    setOpened(true);
                  }}
                >
                  Lihat Artikel
                </Menu.Item>
                
                <Menu.Item
                  leftSection={<IconExternalLink size={16} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedCard(expandedCard === annotation.id ? null : annotation.id);
                  }}
                >
                  {isExpanded ? 'Tutup Detail' : 'Lihat Detail'}
                </Menu.Item>
                
                <Menu.Divider />
                
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    beforeDeleteAnnotation(annotation.id, annotation.highlightedText);
                  }}
                  disabled={deletingId === annotation.id}
                >
                  Hapus Anotasi
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Transition>

        {/* Expanded Details */}
        <Transition mounted={isExpanded} transition="slide-down" duration={300}>
          {(styles) => (
            <Box
              style={{
                ...styles,
                borderTop: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                marginTop: theme.spacing.md,
                paddingTop: theme.spacing.md,
              }}
            >
              <Group gap="md">
                <Box style={{ flex: 1 }}>
                  <Text size="xs" c="dimmed" mb="xs">Detail Artikel</Text>
                  <Text size="sm" fw={500}>
                    {annotation.article.title}
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    Dibuat: {new Date(annotation.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </Box>
                
                <Group gap="xs">
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={<IconEye size={14} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPDF(`${annotation.article.filePath}`);
                      setOpened(true);
                    }}
                  >
                    Buka
                  </Button>
                  <Button
                    variant="light"
                    color="red"
                    size="xs"
                    loading={deletingId === annotation.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      beforeDeleteAnnotation(annotation.id, annotation.highlightedText);
                    }}
                    leftSection={<IconTrash size={14} />}
                  >
                    Hapus
                  </Button>
                </Group>
              </Group>
            </Box>
          )}
        </Transition>
      </Paper>
    );
  };

  return (
    <Box style={{ 
      height: '783px', 
      overflow: 'hidden', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      <LoadingOverlay visible={loading} />
      
      {/* Minimal Header */}
      <Box p="md" style={{ flexShrink: 0 }}>
        <Group justify="space-between" mb="sm">
          <Group gap="sm">
            <ThemeIcon
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan', deg: 45 }}
              size="lg"
              radius="xl"
            >
              <IconBookmark size={20} />
            </ThemeIcon>
            <Box>
              <Text size="lg" fw={700} c={isDark ? 'white' : 'dark'}>
                Catatan Saya
              </Text>
              <Text size="xs" c="dimmed">
                {annotations.length} anotasi tersimpan
              </Text>
            </Box>
          </Group>
        </Group>
      </Box>

      {/* Notes List */}
      <Box style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: '0 16px 16px 16px',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {annotations.length === 0 ? (
          <Box style={{ 
            textAlign: 'center', 
            padding: '4rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: theme.spacing.md
          }}>
            <ThemeIcon
              variant="light"
              color="blue"
              size={80}
              radius="xl"
              style={{
                background: isDark
                  ? `linear-gradient(135deg, ${theme.colors.blue[9]} 0%, ${theme.colors.cyan[9]} 100%)`
                  : `linear-gradient(135deg, ${theme.colors.blue[1]} 0%, ${theme.colors.cyan[1]} 100%)`,
              }}
            >
              <IconNotes size={40} />
            </ThemeIcon>
            <Box>
              <Text size="lg" fw={500} c={isDark ? 'gray.3' : 'gray.7'} mb="xs">
                Belum ada catatan
              </Text>
              <Text size="sm" c="dimmed" maw={300} mx="auto" style={{ lineHeight: 1.5 }}>
                Mulai highlight dan buat catatan pada artikel untuk melihat koleksi catatan Anda di sini
              </Text>
            </Box>
          </Box>
        ) : (
          <Stack gap="xs">
            {annotations.map((annotation) => (
              <NoteCard key={annotation.id} annotation={annotation} />
            ))}
          </Stack>
        )}
      </Box>

      {/* Modal unchanged */}
      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          setSelectedPDF(null);
        }}
        title="Lihat Artikel"
        size="90%"
        padding="sm"
        centered
        overlayProps={{ blur: 3 }}
        styles={{
          content: {
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            position: 'relative', 
          },
          body: {
            flex: 1,
            overflow: 'hidden',
            padding: 0,
            position: 'relative', 
          },
        }}
      >
        {selectedPDF && (
          <div style={{ height: '100%', position: 'relative' }}>
            <WebViewer fileUrl={selectedPDF} onAnalytics={handleAnalytics} />
          </div>
        )}
      </Modal>
    </Box>
  );
}