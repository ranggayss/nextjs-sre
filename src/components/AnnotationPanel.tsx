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
  useMantineTheme
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
  IconHighlight
} from '@tabler/icons-react';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
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

  return (
    <Box style={{ 
      height: '783px', 
      overflow: 'hidden', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      <LoadingOverlay visible={loading} />
      
      <Box p="md" style={{ flexShrink: 0 }}>
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <ThemeIcon variant="light" color="blue" size="lg">
              <IconHighlight size={20} />
            </ThemeIcon>
            <Box>
              <Text size="xl" fw={700}>Anotasi Artikel</Text>
              <Text size="sm" c="dimmed">Highlight dan catatan pada artikel</Text>
            </Box>
          </Group>
          <Badge variant="light" color="blue" size="lg">
            {annotations.length} Anotasi
          </Badge>
        </Group>
        <Divider mb="md" />
      </Box>

      <Box style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: '0 16px',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {annotations.length === 0 ? (
          <Box style={{ textAlign: 'center', padding: '3rem' }}>
            <ThemeIcon variant="light" color="gray" size="xl" mx="auto" mb="md">
              <IconNotes size={32} />
            </ThemeIcon>
            <Text size="lg" c="dimmed" mb="xs">
              Belum ada anotasi
            </Text>
            <Text size="sm" c="dimmed">
              Mulai highlight dan buat catatan pada artikel untuk melihatnya di sini
            </Text>
          </Box>
        ) : (
          <Box>
            {annotations.map((annotation) => (
              <Card key={annotation.id} mb="md" p="md" withBorder radius="md">
                <Group justify="space-between" align="start" mb="sm">
                  <Group gap="xs">
                    <ThemeIcon variant="light" color="blue" size="sm">
                      <IconFile size={14} />
                    </ThemeIcon>
                    <Text size="sm" fw={600} c="blue">
                      {annotation.article.title}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <Badge variant="light" size="xs">
                      Hal. {annotation.page}
                    </Badge>
                    <Badge variant="light" color="gray" size="xs">
                      <IconCalendar size={10} style={{ marginRight: 4 }} />
                      {new Date(annotation.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Badge>
                  </Group>
                </Group>
                
                <Box mb="xs">
                  <Text size="xs" c="dimmed" mb="xs">Teks yang di-highlight:</Text>
                  <Box p="xs" style={{
                    backgroundColor: 'var(--mantine-color-yellow-light)',
                    borderLeft: '3px solid var(--mantine-color-yellow-4)',
                    borderRadius: 'var(--mantine-radius-sm)'
                  }}>
                    <Text size="sm" c="dark" style={{ fontStyle: 'italic' }}>
                      "{annotation.highlightedText}"
                    </Text>
                  </Box>
                </Box>
                
                {annotation.comment && (
                  <Box mb="sm">
                    <Text size="xs" c="dimmed" mb="xs">Catatan:</Text>
                    <Text size="sm" p="xs" c="dark" style={{
                      backgroundColor: 'var(--mantine-color-blue-light)',
                      borderRadius: 'var(--mantine-radius-sm)',
                      borderLeft: '3px solid var(--mantine-color-blue-4)'
                    }}>
                      {annotation.comment}
                    </Text>
                  </Box>
                )}
                
                {annotation.semanticTag && (
                  <Box mt="xs">
                    <Badge variant="filled" size="xs" color="grape">
                      {annotation.semanticTag}
                    </Badge>
                  </Box>
                )}
                
                <Group justify="flex-end" mt="md">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    leftSection={<IconEye size={14} />}
                    onClick={() => {
                      setSelectedPDF(`${annotation.article.filePath}`);
                      setOpened(true);
                    }}
                  >
                    Lihat Artikel
                  </Button>
                  <Button 
                    color="red" 
                    size="sm" 
                    loading={deletingId === annotation.id}
                    onClick={() => beforeDeleteAnnotation(annotation.id, annotation.highlightedText)}
                    leftSection={<IconSquareRoundedX size={14} />}
                  >
                    Hapus
                  </Button>
                </Group>
              </Card>
            ))}
          </Box>
        )}
      </Box>

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