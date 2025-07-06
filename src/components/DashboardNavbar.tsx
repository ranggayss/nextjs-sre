// components/DashboardNavbar.tsx
'use client';

import Link from 'next/link';
import {
  Stack,
  Divider,
  Group,
  Text,
  Button,
  Paper,
  Box,
  ActionIcon,
  useMantineTheme,
  useMantineColorScheme,
  rem,
} from '@mantine/core';
import {
  IconMenu,
  IconMessageCircle,
  IconPlus,
  IconHistory,
  IconDots,
  IconHome,
  IconChartDots2Filled,
  IconArticleFilled,
  IconBrain,
} from '@tabler/icons-react';

const dashboard = [
  {
    icon: <IconHome/>,
    name: 'Home',
    href: '/home'
  },
  {
    icon: <IconChartDots2Filled/>,
    name: 'Knowledge Graph',
    href: '/dashboard',
  },
  // {
  //   icon: <IconArticleFilled/>,
  //   name: 'Article',
  //   href: '/article'
  // }
];

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
}

interface DashboardNavbarProps {
  // chatHistory: ChatHistoryItem[];
  brainstormingSessions: BrainstormingSessionItem[];
  mounted: boolean;
  onSessionSelect?: (sessionId: string) => void;
  // onChatSelect?: (chatId: number) => void;
  // onNewChat?: () => void;
  onNewSession?: () => void;
  isCollapsed?: boolean;
}

export function DashboardNavbar({ 
  // chatHistory,
  brainstormingSessions, 
  mounted, 
  // onChatSelect, 
  onSessionSelect,
  // onNewChat,
  onNewSession,
  isCollapsed = false, 
}: DashboardNavbarProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const dark = mounted ? colorScheme === 'dark' : false;

  return (
    <Stack gap={isCollapsed ? 'xs' : 'md'} style={{
      height: '100%',
      overflow: 'auto',
      padding: isCollapsed ? rem(8) : rem(16),
    }}>

      {!isCollapsed && (
        <Divider 
          label={
            <Group gap="xs">
              <IconMenu size={16} />
              <Text size="sm" fw={600}>Menu</Text>
            </Group>
          } 
          labelPosition="left" 
        />
      )}

      <Stack gap={isCollapsed ? 'xs' : 'md'}>
        {dashboard.map((dash, i) => (
          <Button
            key={i}
            component={Link}
            href={dash.href}
            leftSection={isCollapsed ? dash.icon : null}
            variant="gradient"
            gradient={{
              from: 'blue', to: 'cyan', deg: 45
            }}
            size={isCollapsed ? 'xs' : 'md'}
            radius='md'
            fullWidth
            style={{
              justifyItems: isCollapsed ? 'center' : 'flex-start',
              minHeight: rem(36),
              padding: isCollapsed ? rem(8) : undefined,
            }}
            title={isCollapsed ? dash.name : undefined}
          >
            {isCollapsed ? dash.icon : dash.name}
          </Button>
        ))}
      </Stack>

      {!isCollapsed && (
        <Divider 
          label={
            <Group gap="xs">
              <IconBrain size={16} />
              <Text size="sm" fw={600}>Tambah Brainstorming</Text>
            </Group>
          } 
          labelPosition="left" 
        />
      )}

      <Button 
        leftSection={isCollapsed ? <IconPlus size={18} /> : null}
        variant="gradient"
        gradient={{ from: 'blue', to: 'cyan', deg: 45 }}
        size="md"
        radius="md"
        fullWidth
        onClick={onNewSession}
        style={{
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          minHeight: rem(36),
          padding: isCollapsed ? rem(8) : undefined,
        }}
        title={isCollapsed ? 'Tambah Sesi Baru' : undefined}
      >
        {isCollapsed ? <IconPlus size={18}/> : 'Tambah Sesi Baru'}
      </Button>
      
      {!isCollapsed && (
        <Divider 
          label={
            <Group gap="xs">
              <IconHistory size={16} />
              <Text size="sm" fw={600}>Sesi Brainstorming</Text>
            </Group>
          } 
          labelPosition="left" 
        />
      )}
      
      <Stack gap="xs" style={{
        flex: 1,
        overflow: 'hidden auto',
        minHeight: 0,
      }}>
        {brainstormingSessions.map((session) => (
          <Paper
            key={session.id}
            p={isCollapsed ? "xs" : "sm"}
            radius="md"
            withBorder
            style={{
              cursor: 'pointer',
              backgroundColor: session.active 
                ? (dark ? theme.colors.blue[9] : theme.colors.blue[0])
                : undefined,
              borderColor: session.active 
                ? theme.colors.blue[6] 
                : undefined,
              borderWidth: session.active ? 2 : 1,
              transition: 'all 0.2s ease',
              minHeight: rem(isCollapsed ? 40 : 60),
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={() => onSessionSelect?.(session.id)}
            title={isCollapsed ? session.title : undefined}
          >
            {isCollapsed ? (
              <Group justify="center" style={{ width: '100%' }}>
                <ActionIcon 
                  variant="subtle" 
                  color={session.active ? "blue" : "gray"} 
                  size="sm"
                >
                  <IconBrain size={16} />
                </ActionIcon>
              </Group>              
            ) : (
              <Group justify="space-between" gap="xs">
                <Box
                  style={{
                    width: 4,
                    height: '100%',
                    backgroundColor: session.coverColor,
                    borderRadius: 2,
                    minHeight: rem(40),
                  }}
                />
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text 
                    size="sm" 
                    fw={500} 
                    truncate
                    c={session.active ? 'blue' : undefined}
                  >
                    {session.title}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {session.lastActivity}
                  </Text>
                </Box>
                {/* <ActionIcon variant="subtle" color="gray" size="sm" onClick={(e) => e.stopPropagation()}>
                  <IconDots size={14} />
                </ActionIcon> */}
              </Group>
            )}
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
}