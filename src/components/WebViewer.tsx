'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PdfLoader,
  PdfHighlighter,
  Highlight,
  Tip,
  Popup,
  AreaHighlight,
} from 'react-pdf-highlighter';
import type {
  Content,
  IHighlight,
  NewHighlight,
  ScaledPosition,
} from 'react-pdf-highlighter';
import { Button, Group, Card, Text, ScrollArea, Title, Divider, Stack, useMantineColorScheme, useMantineTheme } from '@mantine/core';
import 'react-pdf-highlighter/dist/style.css';

interface WebViewerProps {
  fileUrl: string;
  onAnalytics?: (data: any) => void;
}

const WebViewer: React.FC<WebViewerProps> = ({ fileUrl, onAnalytics }) => {
  const [highlights, setHighlights] = useState<IHighlight[]>([]);
  const scrollViewerTo = useRef<(highlight: IHighlight) => void>(() => {});
  
  // Dark mode support
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const isDark = colorScheme === 'dark';

  const parseIdFromHash = () =>
    document.location.hash.replace(/^#highlight-/, '');

  const resetHash = () => {
    document.location.hash = '';
  };

  const scrollToHighlightFromHash = useCallback(() => {
    const highlight = highlights.find((h) => h.id === parseIdFromHash());
    if (highlight) {
      scrollViewerTo.current(highlight);
    }
  }, [highlights]);

  useEffect(() => {
    window.addEventListener('hashchange', scrollToHighlightFromHash);
    return () => {
      window.removeEventListener('hashchange', scrollToHighlightFromHash);
    };
  }, [scrollToHighlightFromHash]);

  const addHighlight = (highlight: NewHighlight) => {
    const id = Math.random().toString(36).slice(2);
    const sanitizedComment = {
      text: highlight.comment?.text || '',
      emoji: highlight.comment?.emoji || '',
    };

    const newHighlight: IHighlight = {
      id,
      content: highlight.content,
      position: highlight.position,
      comment: sanitizedComment,
    };

    setHighlights((prev) => [newHighlight, ...prev]);

    const highlightedText =
      typeof highlight.content === 'string'
        ? highlight.content
        : highlight.content?.text || '';

    onAnalytics?.({
      action: 'annotation_add',
      document: fileUrl,
      metadata: {
        annotationType: 'Highlight',
        contents: sanitizedComment.text,
        highlightedText,
        pageNumber: newHighlight.position.pageNumber,
        rect: newHighlight.position.boundingRect,
        annotationId: newHighlight.id,
      },
      timeStamp: new Date().toISOString(),
    });
  };

  const updateHighlight = (
    highlightId: string,
    position: Partial<ScaledPosition>,
    content: Partial<Content>
  ) => {
    setHighlights((prev) =>
      prev.map((h) =>
        h.id === highlightId
          ? {
              ...h,
              position: { ...h.position, ...position },
              content: { ...h.content, ...content },
            }
          : h
      )
    );
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileUrl.split('/').pop() || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAnalytics?.({
      action: 'document_downloaded',
      document: fileUrl,
      timeStamp: new Date().toISOString(),
    });
  };

  const HighlightPopup = ({ comment }: { comment: { text: string; emoji: string } }) =>
    comment?.text ? (
      <div 
        className="Highlight__popup"
        style={{
          backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[0],
          color: isDark ? theme.colors.gray[0] : theme.colors.dark[7],
          border: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
          borderRadius: theme.radius.sm,
          padding: '8px 12px',
          boxShadow: isDark 
            ? `0 2px 8px ${theme.colors.dark[9]}` 
            : `0 2px 8px ${theme.colors.gray[3]}`,
        }}
      >
        {comment.emoji} {comment.text}
      </div>
    ) : null;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      backgroundColor: isDark ? theme.colors.dark[7] : theme.colors.gray[0],
      color: isDark ? theme.colors.gray[0] : theme.colors.dark[7],
    }}>
      <Group justify="end" p="sm" style={{
        backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[1],
        borderBottom: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
      }}>
        <Button 
          onClick={handleDownload} 
          variant="light" 
          size="xs"
          color={isDark ? 'blue' : 'blue'}
        >
          Download PDF
        </Button>
      </Group>

      <div style={{ display: 'flex', height: '100%' }}>
        {/* Kiri: PDF Viewer */}
        <div style={{ 
          flex: 3, 
          position: 'relative',
          backgroundColor: isDark ? theme.colors.dark[8] : theme.colors.gray[0],
        }}>
          <PdfLoader url={fileUrl} beforeLoad={
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: isDark ? theme.colors.dark[7] : theme.colors.gray[0],
              color: isDark ? theme.colors.gray[0] : theme.colors.dark[7],
            }}>
              Loading...
            </div>
          }>
            {(pdfDocument) => (
              <PdfHighlighter
                pdfDocument={pdfDocument}
                enableAreaSelection={(event) => event.altKey}
                scrollRef={(scrollTo) => {
                  scrollViewerTo.current = scrollTo;
                  scrollToHighlightFromHash();
                }}
                onScrollChange={resetHash}
                onSelectionFinished={(
                  position,
                  content,
                  hideTipAndSelection,
                  transformSelection
                ) => (
                  <Tip
                    onOpen={transformSelection}
                    onConfirm={(comment) => {
                      addHighlight({ content, position, comment });
                      hideTipAndSelection();
                    }}
                  />
                )}
                highlightTransform={(
                  highlight,
                  index,
                  setTip,
                  hideTip,
                  viewportToScaled,
                  screenshot,
                  isScrolledTo
                ) => {
                  const isTextHighlight = !highlight.content?.image;

                  const component = isTextHighlight ? (
                    <Highlight
                      isScrolledTo={isScrolledTo}
                      position={highlight.position}
                      comment={highlight.comment}
                    />
                  ) : (
                    <AreaHighlight
                      isScrolledTo={isScrolledTo}
                      highlight={highlight}
                      onChange={(boundingRect) => {
                        updateHighlight(
                          highlight.id,
                          { boundingRect: viewportToScaled(boundingRect) },
                          { image: screenshot(boundingRect) }
                        );
                      }}
                    />
                  );

                  return (
                    <Popup
                      popupContent={<HighlightPopup comment={highlight.comment} />}
                      onMouseOver={() =>
                        setTip(highlight, () => (
                          <HighlightPopup comment={highlight.comment} />
                        ))
                      }
                      onMouseOut={hideTip}
                      key={index}
                    >
                      {component}
                    </Popup>
                  );
                }}
                highlights={highlights}
              />
            )}
          </PdfLoader>
        </div>

        <div
          style={{
            flex: 1,
            borderLeft: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
            backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[0],
            padding: '1rem',
            overflowY: 'auto',
          }}
        >
          <Title order={5} mb="sm" c={isDark ? 'gray.0' : 'dark.7'}>
            📌 Highlighted Notes
          </Title>
          <Divider mb="sm" color={isDark ? theme.colors.dark[4] : theme.colors.gray[3]} />

          <ScrollArea h="100%">
            <Stack>
              {highlights.length === 0 ? (
                <Text c="dimmed" size="sm">
                  Belum ada highlight.
                </Text>
              ) : (
                highlights.map((h) => {
                  const text =
                    typeof h.content === 'string'
                      ? h.content
                      : h.content?.text || '';

                  return (
                    <Card
                      key={h.id}
                      withBorder
                      radius="md"
                      shadow="sm"
                      onClick={() => scrollViewerTo.current(h)}
                      style={{ 
                        cursor: 'pointer', 
                        transition: '0.2s',
                        backgroundColor: isDark ? theme.colors.dark[5] : theme.colors.gray[0],
                        borderColor: isDark ? theme.colors.dark[4] : theme.colors.gray[3],
                      }}
                      mih={80}
                    >
                      <Text size="xs" c="dimmed" mb={4}>
                        📄 Page {h.position.pageNumber}
                      </Text>

                      {text && (
                        <Text 
                          size="sm" 
                          fw={500} 
                          lineClamp={3} 
                          mb={4}
                          c={isDark ? 'gray.0' : 'dark.7'}
                        >
                          {text}
                        </Text>
                      )}

                      {h.comment?.text && (
                        <Text 
                          size="sm" 
                          c={isDark ? 'gray.3' : 'gray.7'}
                        >
                          💬 {h.comment.emoji} {h.comment.text}
                        </Text>
                      )}
                    </Card>
                  );
                })
              )}
            </Stack>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default WebViewer;