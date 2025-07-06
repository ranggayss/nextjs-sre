// components/DashboardLayout.tsx
'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import {
  AppShell,
  AppShellHeader,
  AppShellNavbar,
  AppShellMain,
  Modal,
  Stack,
  TextInput,
  Textarea,
  Box,
  Text,
  ColorPicker,
  Button,
  Group,
} from '@mantine/core';
import { DashboardHeader } from './DashboardHeader';
import { DashboardNavbar } from './DashboardNavbar';
import { usePathname, useRouter } from 'next/navigation';
import { eventBus } from '@/lib/event-bus';

interface ChatHistoryItem {
  id: number;
  title: string;
  timestamp: string;
  active: boolean;
};

interface BrainstormingSessionItem {
  id: string,
  title: string,
  description?: string,
  coverColor: string,
  lastActivity: string,
  active: boolean,
};

interface DashboardLayoutProps {
  children: ReactNode;
  sidebarOpened: boolean;
  onToggleSidebar: () => void;
  mounted: boolean;
  onSessionCreated?: () => void;
  // chatHistory: ChatHistoryItem[];
  // onChatSelect?: (chatId: number) => void;
  // onNewChat?: () => void;
}

export function DashboardLayout({
  children,
  sidebarOpened,
  onToggleSidebar,
  mounted,
  onSessionCreated,
  // chatHistory,
  // onChatSelect,
  // onNewChat,
}: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [brainstormingSessions, setBrainstormingSessions ] = useState<BrainstormingSessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    coverColor: '#4c6ef5',
  });

  const fetchBrainstormingSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/brainstorming-sessions');
      const data = await res.json();

      if (res.ok){
        const formatted: BrainstormingSessionItem[] = data.map((session: any) => ({
          id: session.id,
          title: session.title,
          description: session.description || '',
          coverColor: session.coverColor || '#4c6ef5',
          lastActivity: new Date(session.lastActivity || session.updatedAt || session.createdAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
          }),
          active: pathname.includes(`/projects/${session.id}`),
        }));

        setBrainstormingSessions(formatted);
      }
    } catch (error) {
      console.error('Gagal memuat sesi brainstorming:', error);
    } finally {
      setLoading(false);
    }
  }, [pathname]);

  useEffect(() => {
    function handleUpdate(){
      fetchBrainstormingSessions();
    }

    eventBus.on('sessionCreated', handleUpdate);
    eventBus.on('sessionDeleted', handleUpdate);
    eventBus.on('sessionUpdated', handleUpdate);

    return () => {
      eventBus.off('sessionCreated', handleUpdate);
      eventBus.off('sessionDeleted', handleUpdate);
      eventBus.off('sessionUpdated', handleUpdate);
    }
  }, []);

  useEffect(() => {
    if (mounted){
      fetchBrainstormingSessions();
    }
  }, [mounted, fetchBrainstormingSessions]);

  const handleSessionSelect = useCallback((sessionId: string) => {
    router.push(`/projects/${sessionId}`);
  }, [router]);

  const handleNewSession = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const handleCreateSession = async () => {
    if (!newSession.title.trim()) return;

    try {
      const res = await fetch('/api/brainstorming-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSession),
      });

      const data = await res.json();
      if (res.ok){
        await fetchBrainstormingSessions();
        setCreateModalOpen(false);
        setNewSession({ title: '', description: '', coverColor: '#4c6ef5'});
        onSessionCreated?.();

        // router.push(`/projects/${data.id}`);
      } else {
        throw new Error('Gagal membuat sesi brainstorming');
      }
    } catch (error) {
      console.error('Error creating session', error);
    }
  }

  return (
  <>
    <AppShell
      header={{ height: 70 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !sidebarOpened, desktop: !sidebarOpened },
      }}
      padding={0}
    >
      <AppShellHeader>
        <DashboardHeader
          sidebarOpened={sidebarOpened}
          onToggleSidebar={onToggleSidebar}
          mounted={mounted}
        />
      </AppShellHeader>

      <AppShellNavbar p="lg">
        <DashboardNavbar
          // chatHistory={chatHistory}
          brainstormingSessions={brainstormingSessions}
          mounted={mounted}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          // onChatSelect={onChatSelect}
          // onNewChat={onNewChat}
        />
      </AppShellNavbar>

      <AppShellMain>
        {children}
      </AppShellMain>
    </AppShell>

    {/* Create Session Modal */}
    <Modal
      opened={createModalOpen}
      onClose={() => {
        setCreateModalOpen(false);
        setNewSession({ title: '', description: '', coverColor: '#4c6ef5' });
      }}
      title="Buat Sesi Brainstorming Baru"
      size="md"
    >
    <Stack gap="md">
      <TextInput
        label="Judul Sesi"
        placeholder="Masukkan judul sesi brainstorming"
        value={newSession.title}
        onChange={(e) => setNewSession({ ...newSession, title: e.currentTarget.value })}
        required
      />

      <Textarea
        label="Deskripsi (Opsional)"
        placeholder="Jelaskan tujuan sesi brainstorming Anda"
        value={newSession.description}
        onChange={(e) => setNewSession({ ...newSession, description: e.currentTarget.value })}
        minRows={3}
      />

      <Box>
        <Text size="sm" fw={500} mb="xs">
          Warna Cover
        </Text>
        <ColorPicker
          value={newSession.coverColor}
          onChange={(color) => setNewSession({ ...newSession, coverColor: color })}
          withPicker={false}
          swatches={[
            '#4c6ef5', '#51cf66', '#ff6b6b', '#ffd43b',
            '#9775fa', '#40c057', '#fd7e14', '#15aabf',
            '#748ffc', '#69db7c', '#ffa8a8', '#ffe066',
          ]}
          swatchesPerRow={6}
        />
        {/* TAMBAH PREVIEW WARNA TERPILIH */}
        <Group mt="xs" gap="xs" align="center">
          <Text size="xs" c="dimmed">Warna terpilih:</Text>
          <Box
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              backgroundColor: newSession.coverColor,
              border: '2px solid #e9ecef',
            }}
          />
          <Text size="xs" c="dimmed">{newSession.coverColor}</Text>
        </Group>
      </Box>

      <Group justify="flex-end" mt="md">
        <Button
          variant="subtle"
          onClick={() => {
            setCreateModalOpen(false);
            setNewSession({ title: '', description: '', coverColor: '#4c6ef5' });
          }}
        >
          Batal
        </Button>
        <Button 
          onClick={handleCreateSession} 
          disabled={!newSession.title.trim()}
          loading={loading}
        >
          Buat Sesi
        </Button>
      </Group>
    </Stack>
  </Modal>
</>
);
}