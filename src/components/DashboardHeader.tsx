// components/DashboardHeader.tsx
'use client';

import {
  Container,
  Flex,
  Group,
  Box,
  Text,
  ActionIcon,
  Tooltip,
  Menu,
  Avatar,
  Burger,
  ThemeIcon,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconNetwork,
  IconSettings,
  IconSun,
  IconMoon,
  IconUser,
  IconLogout,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface DashboardHeaderProps {
  sidebarOpened: boolean;
  onToggleSidebar: () => void;
  mounted: boolean;
}

interface User {
  id: string,
  email: string,
  name: string,
}

export function DashboardHeader({ 
  sidebarOpened, 
  onToggleSidebar, 
  mounted 
}: DashboardHeaderProps) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = mounted ? colorScheme === 'dark' : false;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      const data = await res.json();

      if (!data){
        setUser(null);
        throw new Error('There is no user authenticated');
      }else{
        console.log(data);
        setUser(data.user);
      }
    } catch (error: any) {
        console.error(error.message); 
        setUser(null);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

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

  if (!mounted) {
    return (
      <Container fluid h="100%" px="xl">
        <Flex h="100%" justify="space-between" align="center">
          <Group gap="md">
            <Burger opened={false} onClick={() => {}} size="sm" />
            <Group gap="xs">
              <ThemeIcon
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan', deg: 45 }}
                size="lg"
                radius="md"
              >
                <IconNetwork size={20} />
              </ThemeIcon>
              <Box>
                <Text 
                  fw={800} 
                  size="xl" 
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'cyan', deg: 45 }}
                >
                  mySRE
                </Text>
                <Text size="xs" c="dimmed">Knowledge Visualization Platform</Text>
              </Box>
            </Group>
          </Group>
          <Group gap="sm">
            <ActionIcon variant="light" color="blue" size="lg" radius="md" disabled>
              <IconMoon size={18} />
            </ActionIcon>
          </Group>
        </Flex>
      </Container>
    );
  }

  return (
    <Container fluid h="100%" px="xl">
      <Flex h="100%" justify="space-between" align="center">
        <Group gap="md">
          <Burger
            opened={sidebarOpened}
            onClick={onToggleSidebar}
            size="sm"
          />
          <Group gap="xs">
            <ThemeIcon
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan', deg: 45 }}
              size="lg"
              radius="md"
            >
              <IconNetwork size={20} />
            </ThemeIcon>
            <Box>
              <Text 
                fw={800} 
                size="xl" 
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan', deg: 45 }}
              >
                mySRE
              </Text>
              <Text size="xs" c="dimmed">Knowledge Visualization Platform</Text>
            </Box>
          </Group>
        </Group>

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
                <Text size="sm" fw={600}>{(user?.name)?.split('@')[0]}</Text>
                <Text size="xs" c="dimmed">{user?.email}</Text>
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
  );
}