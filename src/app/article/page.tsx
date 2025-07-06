'use client';

import { DashboardLayout } from "@/components/DashboardLayout"
import { Box, Container, Grid, Group, ThemeIcon, Text, useMantineColorScheme, useMantineTheme, Badge, Card, Divider, Button, TextInput, ActionIcon, FileInput, LoadingOverlay, Modal } from "@mantine/core";
import { IconArticleFilled, IconEye, IconSquareRoundedX, IconSearch, IconPlus, IconUpload, IconHistory, IconFile, IconCalendar, IconNotes } from "@tabler/icons-react";
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import Link from "next/link";
import { useCallback, useEffect, useState, useRef } from "react"
import WebViewer from "@/components/WebViewer";
import { handleAnalytics } from "@/components/NodeDetail";
import Loading from "../Loading";

interface Article {
    id: string,
    title: string,
    att_background: string,
    att_url: string,
};

interface Annotation {
    id: string,
    articleId: string,
    page: number,
    highlightedText: string,
    comment: string,
    semanticTag?: string,
    createdAt: string,
    article: {
        id: string,
        title: string,
    },
};

export default function Article(){
    const {colorScheme} = useMantineColorScheme();
    const theme = useMantineTheme();

    const [sidebarOpened, setSidebarOpened] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [article, setArticle] = useState<Article[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploading, setUploading] = useState(false);
    const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [opened, setOpened] = useState(false);
    const [selectedPDF, setSelectedPDF] = useState<string | null>(null);

    //for annotation
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);

    //for delete
    const [loadingDeleteAnnotations, setLoadingDeleteAnnotations] = useState(false);

    const dark = mounted ? colorScheme === 'dark' : false;

    const getArticle = async () => {
        const res = await fetch(`/api/nodes`);
        const article = await res.json();

        setArticle(article);
    };

    useEffect(() => {
        getArticle();
        setMounted(true);
    }, []);

    //config & usestate for annotations
    const getAnnotations = async () => {
        setLoadingHistory(true);
        try {
            const res = await fetch('/api/annotation');
            if (res.ok){
                const data = await res.json();
                setAnnotations(data);
            }
        } catch (error) {
            console.error('Error fetching annotations: ', error);
            notifications.show({
                title: 'Error',
                message: 'Gagal memuat riwayat catatan',
                color: 'red',
            });
        } finally{
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (showHistory){
            getAnnotations();
        }
    }, [showHistory]);

    const chatHistory = [
        { id: 1, title: 'Analisis Machine Learning', timestamp: '2 jam lalu', active: false },
        { id: 2, title: 'Penelitian Deep Learning', timestamp: '1 hari lalu', active: false },
        { id: 3, title: 'Computer Vision Study', timestamp: '3 hari lalu', active: true },
    ];

    const handleChatSelect = useCallback((chatId : number) => {
        console.log('Selected Chat');
    }, []);

    const handleToogleSidebar = useCallback(() => {
        setSidebarOpened((o) => !o);
    }, []);

    const handleNewChat = useCallback(() => {
        console.log('New Chat clicked');
    }, []);

    console.log('artikel :', article);

    const handleDeleteArticle = async (id: string, title: string) => {
        modals.openConfirmModal({
            title: (
                <Text size="lg" fw={600} c="red">
                    🗑️ Konfirmasi Hapus Artikel
                </Text>
            ),
            children: (
                <Box>
                    <Text size="sm" mb="md">
                        Apakah Anda yakin ingin menghapus artikel berikut?
                    </Text>
                    <Box p="md" style={{
                        backgroundColor: theme.colors.gray[0],
                        borderRadius: theme.radius.md,
                        border: `1px solid ${theme.colors.red[2]}`
                    }}>
                        <Text fw={600} size="sm" mb="xs">{title}</Text>
                        <Text size="xs" c="dimmed">ID: {title}</Text>
                    </Box>
                    <Text size="sm" c="red" fw={500} mt="md">
                        ⚠️ Tindakan ini tidak dapat dibatalkan!
                    </Text>
                </Box>
            ),
            labels: {
                confirm: 'Ya, Hapus Artikel',
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
                await performDeleteArticle(id, title);
            },
        });
    };

    const performDeleteArticle = async (id: string, title: string) => {
        setDeletingArticleId(id);

        try {
            console.log('Deleted', (id));
            const res = await fetch(`/api/articles/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type' : 'application/json'
                },
            });

            if(!res.ok){
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${res.status}: Gagal menghapus artikel`);
            };

            const data = await res.json();
            console.log('Data', data);
            console.log('Will show notifications');
            
            notifications.show({
                title: 'Berhasil Dihapus',
                message: `Artikel "${title}" berhasil dihapus dari sistem`,
                color: 'green',
                position: 'top-right',
                autoClose: 4000,
            })

            // Refresh artikel setelah delete
            await getArticle();    
        } catch (error: any) {
            notifications.show({
                title: ' Gagal Menghapus',
                message: error.message || 'Terjadi kesalahan saat menghapus artikel',
                color: 'red',
                position: 'top-right',
                autoClose: 6000,
            });
            console.error('Delete error:', error);
        } finally {
            setDeletingArticleId(null);
        }
    }

        

    const handleAddArticle = useCallback(() => {
        // Trigger file input click
        fileInputRef.current?.click();
    }, []);

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.pdf')){
            notifications.show({
                title: 'Format tidak didukung',
                message: 'Mohon upload file PDF',
                color: 'yellow',
                position: 'top-right'
            });
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);

        setUploading(true);
        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const contentType = res.headers.get("content-type");
            if (!res.ok){
                const text = await res.text();
                throw new Error(`Upload failed: ${text}`);
            };

            let data: any = {};
            if (contentType?.includes("application/json")){
                data = await res.json();
                console.log('File uploaded:', data);
            }else{
                const text = await res.text();
                console.log('Unexpected response:', text);
            }

            notifications.show({
                title: 'Berhasil',
                message: `File "${file.name}" berhasil diunggah dan diproses`,
                color: 'green',
                position: 'top-right'
            });

            console.log('File Uploaded:', data);
            
            // Refresh artikel setelah upload berhasil
            await getArticle();

        } catch (error: any) {
            notifications.show({
                title: 'Upload Gagal',
                message: error.message || 'Terjadi Kesalahan saat upload',
                color: 'red',
            });
            console.error('File upload error:', error);
        } finally{
            setUploading(false);
            e.target.value = ''
        }
    };

    // Filter artikel berdasarkan search query
    const filteredArticles = article.filter(a => 
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.att_background.toLowerCase().includes(searchQuery.toLowerCase())
    );


        const handleDeleteAnnotations = async (id: string, highlightedText: string) => {
        modals.openConfirmModal({
            title: (
                <Text size="lg" fw={600} c="red">
                    🗑️ Konfirmasi Hapus Annotation
                </Text>
            ),
            children: (
                <Box>
                    <Text size="sm" mb="md">
                        Apakah Anda yakin ingin menghapus annotation berikut?
                    </Text>
                    <Box p="md" style={{
                        backgroundColor: theme.colors.gray[0],
                        borderRadius: theme.radius.md,
                        border: `1px solid ${theme.colors.red[2]}`
                    }}>
                        <Text fw={600} size="sm" mb="xs">{highlightedText}</Text>
                        <Text size="xs" c="dimmed">ID: {id}</Text>
                    </Box>
                    <Text size="sm" c="red" fw={500} mt="md">
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
                await performDeleteAnnotations(id);
            },
        });
    };


    const performDeleteAnnotations = async (id: string) => {
        try {            
            setLoadingDeleteAnnotations(true);
            const res = await fetch(`/api/annotation/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
            });

            if (res.ok){
                notifications.show({
                    title: 'Berhasil',
                    message: 'Annotasi berhasil dihapus',
                    color: 'green',
                    position: 'top-right'
                });
            } else {
                throw new Error('gagal delete annotation');
            }

            await getAnnotations();
            
        } catch (error: any) {
            console.error('Gagal fetch delete annotation :', error?.message );
            notifications.show({
                title: 'Gagal',
                message: 'Annotasi gagal dihapus',
                color: 'red',
                position: 'top-right'
            })
        } finally{
            setLoadingDeleteAnnotations(false);
        }
    };

    return(
        <DashboardLayout
        sidebarOpened={sidebarOpened}
        onToggleSidebar={handleToogleSidebar}
        mounted={mounted}
        // chatHistory={chatHistory}
        // onChatSelect={handleChatSelect}
        // onNewChat={handleNewChat}
    >
        <Container h='100%' p='xl' style={{
            display: 'flex',
            justifyContent: 'center'
        }}>
            <Grid gutter='xl' h='100%'>
                <Card
                  shadow="sm"
                  padding="lg"
                  radius="lg"
                  h="100%"
                  withBorder
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                  }}>
                    <LoadingOverlay visible={uploading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
                    
                    <Group justify="space-between" mb="lg">
                        <Group gap="xs">
                        <ThemeIcon variant="light" color="blue" size="lg">
                            <IconArticleFilled size={20} />
                        </ThemeIcon>
                        <Box>
                            <Text size="xl" fw={700}>Kumpulan Artikel</Text>
                            <Text size="sm" c="dimmed">Visualisasi Artikel Penelitian</Text>
                        </Box>
                        </Group>
                        <Badge variant="light" color="blue" size="lg">
                            {filteredArticles.length} Artikel
                        </Badge>
                    </Group>

                    {/* Hidden File Input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        style={{ display: 'none' }}
                        onChange={onFileChange}
                    />

                    {/* Search and Add Section */}
                    <Group justify="space-between" mb="xl">
                        <TextInput
                            placeholder="Cari artikel berdasarkan judul atau deskripsi..."
                            leftSection={<IconSearch size={16} />}
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.currentTarget.value)}
                            style={{ flex: 1 }}
                            radius="md"
                            size="md"
                            disabled={uploading}
                        />
                        <Button
                            leftSection={<IconUpload size={16} />}
                            onClick={handleAddArticle}
                            radius="md"
                            size="md"
                            variant="filled"
                            color="green"
                            loading={uploading}
                            disabled={uploading}
                        >
                            {uploading ? 'Mengupload...' : 'Upload PDF'}
                        </Button>
                        <Button
                            leftSection={<IconHistory size={16} />}
                            onClick={() => setShowHistory(true)}
                            radius="md"
                            size="md"
                            variant="outline"
                            color="blue"
                        >
                            History Catatan
                        </Button>
                    </Group>

                    <Divider mb="lg" />

                    {/* Articles List */}
                    {filteredArticles.length === 0 ? (
                        <Box style={{ textAlign: 'center', padding: '2rem' }}>
                            <Text size="lg" c="dimmed">
                                {searchQuery ? 'Tidak ada artikel yang ditemukan' : 'Belum ada artikel'}
                            </Text>
                            {searchQuery && (
                                <Text size="sm" c="dimmed" mt="xs">
                                    Coba kata kunci yang berbeda
                                </Text>
                            )}
                        </Box>
                    ) : (
                        filteredArticles.map((a, i) => (
                            <Group align="start" mb="lg" key={a.id} style={{
                                alignItems: 'center'
                            }}>
                                <ThemeIcon variant="light" color="blue" size="lg">
                                    <Text size="sm" fw={700}>{i + 1}</Text>
                                </ThemeIcon>
                                <Box style={{ flex: 1 }}>
                                    <Text size="xl" fw={700}>{a?.title}</Text>
                                    <Text size="sm" c="dimmed">{a.att_background}</Text>
                                </Box>
                                <Button radius="lg" onClick={() => {
                                    setSelectedPDF(a.att_url);
                                    setOpened(true);
                                }}>
                                    <ThemeIcon variant="light" color="green" size="xs">
                                        <IconEye/>
                                    </ThemeIcon>
                                </Button>
                                <Button radius="lg" onClick={() => handleDeleteArticle(a.id, a.title)}>
                                    <ThemeIcon variant="light" color="red" size="xs">
                                        <IconSquareRoundedX/>
                                    </ThemeIcon>
                                </Button>
                            </Group>
                        ))
                    )}
                </Card>
            </Grid>
        </Container>
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

        <Modal
            opened={showHistory}
            onClose={() => setShowHistory(false)}
            title={
                <Group gap="xs">
                    <ThemeIcon variant="light" color="blue" size="sm">
                        <IconHistory size={16} />
                    </ThemeIcon>
                    <Text fw={600}>Riwayat Catatan & Highlight</Text>
                </Group>
            }
            size="xl"
            padding="lg"
            centered
            overlayProps={{ blur: 2 }}
            styles={{
                content: {
                    maxHeight: '85vh',
                },
                body: {
                    maxHeight: 'calc(85vh - 80px)',
                    overflow: 'auto',
                }
            }}
        >
            <LoadingOverlay visible={loadingHistory} />
            
            {annotations.length === 0 ? (
                <Box style={{ textAlign: 'center', padding: '3rem' }}>
                    <ThemeIcon variant="light" color="gray" size="xl" mx="auto" mb="md">
                        <IconNotes size={32} />
                    </ThemeIcon>
                    <Text size="lg" c="dimmed" mb="xs">
                        Belum ada catatan
                    </Text>
                    <Text size="sm" c="dimmed">
                        Mulai highlight dan buat catatan pada artikel untuk melihat riwayatnya di sini
                    </Text>
                </Box>
            ) : (
                <Box>
                    <Text size="sm" c="dimmed" mb="lg">
                        Total {annotations.length} catatan ditemukan
                    </Text>
                    
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
                                <Text size="xs" c="dimmed" mb="xs">Highlighted Text:</Text>
                                <Box p="xs" style={{
                                    backgroundColor: theme.colors.yellow[0],
                                    borderLeft: `3px solid ${theme.colors.yellow[4]}`,
                                    borderRadius: theme.radius.sm
                                }}>
                                    <Text size="sm" c="dark" style={{ fontStyle: 'italic'}}>
                                        "{annotation.highlightedText}"
                                    </Text>
                                </Box>
                            </Box>
                            
                            {annotation.comment && (
                                <Box mb="sm">
                                    <Text size="xs" c="dimmed" mb="xs">Catatan:</Text>
                                    <Text size="sm" p="xs" c="dark" style={{
                                        backgroundColor: theme.colors.blue[0],
                                        borderRadius: theme.radius.sm,
                                        borderLeft: `3px solid ${theme.colors.blue[4]}`
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
                            <Box display='flex' style={{
                                justifyContent: 'right',
                            }}>
                                <Button 
                                    color="red"
                                    onClick={() => handleDeleteAnnotations(annotation.id, annotation.highlightedText)}
                                >
                                    Hapus
                                </Button>
                            </Box>
                        </Card>
                    ))}
                </Box>
            )}
        </Modal>
    </DashboardLayout>
    )
}