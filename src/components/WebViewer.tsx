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
import { Button, Group, Card, Text, ScrollArea, Title, Divider, Stack } from '@mantine/core';
import 'react-pdf-highlighter/dist/style.css';

interface WebViewerProps {
  fileUrl: string;
  onAnalytics?: (data: any) => void;
}

const WebViewer: React.FC<WebViewerProps> = ({ fileUrl, onAnalytics }) => {
  const [highlights, setHighlights] = useState<IHighlight[]>([]);
  const scrollViewerTo = useRef<(highlight: IHighlight) => void>(() => {});

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
      <div className="Highlight__popup">
        {comment.emoji} {comment.text}
      </div>
    ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Group justify="end" p="sm">
        <Button onClick={handleDownload} variant="light" size="xs">
          Download PDF
        </Button>
      </Group>

      <div style={{ display: 'flex', height: '100%' }}>
        {/* Kiri: PDF Viewer */}
        <div style={{ flex: 3, position: 'relative' }}>
            <PdfLoader url={fileUrl} beforeLoad={<div>Loading...</div>}>
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
            borderLeft: '1px solid #eee',
            backgroundColor: '#fdfdfd',
            padding: '1rem',
            overflowY: 'auto',
            }}
        >
            <Title order={5} mb="sm">
            📌 Highlighted Notes
            </Title>
            <Divider mb="sm" />

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
                        style={{ cursor: 'pointer', transition: '0.2s' }}
                        bg="white"
                        mih={80}
                    >
                        <Text size="xs" c="dimmed" mb={4}>
                        📄 Page {h.position.pageNumber}
                        </Text>

                        {text && (
                        <Text size="sm" fw={500} lineClamp={3} mb={4}>
                            {text}
                        </Text>
                        )}

                        {h.comment?.text && (
                        <Text size="sm" c="gray.7">
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
