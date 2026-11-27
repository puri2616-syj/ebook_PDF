import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { SAMPLE_ALBUM_PAGES } from './data/samplePages';
import {
  AlbumPage,
  AlbumSettings,
  PdfExportProgress,
  ViewMode,
} from './types/album';
import { filesToAlbumPages, revokePageUrl } from './utils/imageFiles';
import { loadAlbumFromStorage, saveAlbumToStorage } from './utils/albumStorage';
import { exportAlbumToPdf } from './utils/pdfExporter';
import { saveCurrentViewAsPng } from './utils/pngExporter';
import { exportAlbumToEpub } from './utils/epubExporter';
import { playPageTurnSound } from './utils/pageTurnSound';
import { TopBar } from './components/TopBar';
import { WorkspaceToolbar } from './components/WorkspaceToolbar';
import { SinglePageAlbum } from './components/SinglePageAlbum';
import { FilmstripBar } from './components/FilmstripBar';
import { OverviewGrid } from './components/OverviewGrid';
import { UsageGuide } from './components/UsageGuide';

interface NoticeMessage {
  type: 'info' | 'error';
  text: string;
}

function getTodayFormatted(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

export default function App() {
  const [pages, setPages] = useState<AlbumPage[]>(SAMPLE_ALBUM_PAGES);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);
  const [viewMode, setViewMode] = useState<ViewMode>('single');

  const [settings, setSettings] = useState<AlbumSettings>({
    albumTitle: '조용한 오후의 기록',
    albumSubtitle: '빛과 그림자, 그리고 머물렀던 순간들',
    authorName: '김하늘',
    coverDate: getTodayFormatted(),
    closingTitle: '기록을 마치며',
    closingMessage:
      '스쳐 지나가는 하루의 빛과 온기를 한 권의 사진집으로 묶어 남깁니다. 이 페이지를 다시 펼쳐보는 날에도 오늘의 고요한 마음이 오래 기억되기를 바랍니다.',
    includeCover: true,
    includeClosing: true,
    orientation: 'portrait',
    theme: 'gallery-white',
    fontStyle: 'myeongjo',
    showPageNumbers: true,
    flipEffect: true,
    soundEnabled: true,
  });

  const [exportProgress, setExportProgress] =
    useState<PdfExportProgress | null>(null);
  const [epubProgress, setEpubProgress] =
    useState<PdfExportProgress | null>(null);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);

  const settingsRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLElement>(null);
  const dragDepthRef = useRef<number>(0);
  const noticeTimerRef = useRef<number | null>(null);
  const hasHydratedRef = useRef<boolean>(false);
  const userModifiedBeforeHydrateRef = useRef<boolean>(false);

  const pagesRef = useRef<AlbumPage[]>(pages);
  pagesRef.current = pages;

  // Hydrate saved album & uploaded photos from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    loadAlbumFromStorage().then((saved) => {
      if (cancelled) return;
      if (saved && !userModifiedBeforeHydrateRef.current) {
        if (saved.pages.length > 0 || saved.settings) {
          setPages(saved.pages);
          setSettings((prev) => ({
            ...prev,
            ...saved.settings,
            fontStyle: saved.settings?.fontStyle || 'myeongjo',
            flipEffect: saved.settings?.flipEffect ?? true,
            soundEnabled: saved.settings?.soundEnabled ?? true,
          }));
          const maxBookIdx = saved.pages.length > 0 ? saved.pages.length + 1 : 0;
          setCurrentIndex(
            Math.min(Math.max(0, saved.currentIndex), maxBookIdx)
          );
        }
      }
      hasHydratedRef.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-save album state (including uploaded photo blobs) to IndexedDB
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    const timer = window.setTimeout(() => {
      saveAlbumToStorage(pages, settings, currentIndex);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [pages, settings, currentIndex]);

  // Cleanup blob URLs when app unmounts
  useEffect(() => {
    return () => {
      pagesRef.current.forEach(revokePageUrl);
    };
  }, []);

  const showNotice = useCallback((type: 'info' | 'error', text: string) => {
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    setNotice({ type, text });
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
    }, 4000);
  }, []);

  const hasOnlySamples = useMemo(
    () => pages.length > 0 && pages.every((p) => p.isSample),
    [pages]
  );

  const handleUpdateSettings = useCallback((patch: Partial<AlbumSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleUploadFiles = useCallback(
    async (fileList: FileList | File[], mode: 'replace-samples' | 'append') => {
      userModifiedBeforeHydrateRef.current = true;
      try {
        const shouldReplace =
          mode === 'replace-samples' && pagesRef.current.every((p) => p.isSample);
        const startIdx = shouldReplace ? 0 : pagesRef.current.length;
        const newPages = await filesToAlbumPages(fileList, startIdx);

        if (newPages.length === 0) {
          showNotice('error', '이미지 파일(JPG, PNG, WEBP 등)만 올릴 수 있습니다.');
          return;
        }

        if (shouldReplace) {
          pagesRef.current.forEach(revokePageUrl);
          setPages(newPages);
          // Jump to first uploaded photo (index 1, right after cover at index 0)
          setCurrentIndex(1);
          setDirection(1);
          setSettings((prev) =>
            prev.albumTitle === '조용한 오후의 기록'
              ? { ...prev, albumTitle: '나의 포토 앨범', albumSubtitle: '' }
              : prev
          );
          showNotice('info', `사진 ${newPages.length}장으로 새 앨범을 만들었습니다.`);
        } else {
          const prevLen = pagesRef.current.length;
          setPages((prev) => [...prev, ...newPages]);
          setCurrentIndex(prevLen + 1);
          setDirection(1);
          showNotice('info', `사진 ${newPages.length}장을 앨범에 추가했습니다.`);
        }

        setViewMode('single');
      } catch {
        showNotice('error', '사진을 불러오는 중 문제가 발생했습니다.');
      }
    },
    [showNotice]
  );

  const handleUpdatePage = useCallback(
    (id: string, patch: Partial<AlbumPage>) => {
      setPages((prev) =>
        prev.map((page) => (page.id === id ? { ...page, ...patch } : page))
      );
    },
    []
  );

  const handleDeletePage = useCallback((id: string) => {
    setPages((prev) => {
      const targetPhotoIdx = prev.findIndex((p) => p.id === id);
      if (targetPhotoIdx === -1) return prev;
      revokePageUrl(prev[targetPhotoIdx]);
      const nextPages = prev.filter((p) => p.id !== id);
      const targetBookIdx = targetPhotoIdx + 1;
      setCurrentIndex((currBookIdx) => {
        if (nextPages.length === 0) return 0;
        const nextMaxBookIdx = nextPages.length + 1;
        if (currBookIdx > nextMaxBookIdx) return nextMaxBookIdx;
        if (targetBookIdx < currBookIdx) return currBookIdx - 1;
        if (currBookIdx === targetBookIdx && targetPhotoIdx >= nextPages.length) {
          return nextPages.length;
        }
        return currBookIdx;
      });
      return nextPages;
    });
  }, []);

  const handleMovePage = useCallback((photoIndex: number, delta: -1 | 1) => {
    setPages((prev) => {
      const nextPhotoIndex = photoIndex + delta;
      if (nextPhotoIndex < 0 || nextPhotoIndex >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(photoIndex, 1);
      copy.splice(nextPhotoIndex, 0, moved);
      return copy;
    });
    const bookIdx = photoIndex + 1;
    const swappedBookIdx = photoIndex + delta + 1;
    setCurrentIndex((curr) => {
      if (curr === bookIdx) return swappedBookIdx;
      if (curr === swappedBookIdx) return bookIdx;
      return curr;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    pagesRef.current.forEach(revokePageUrl);
    setPages([]);
    setCurrentIndex(0);
    showNotice('info', '앨범을 비웠습니다. 사진을 올려 새로 시작하세요.');
  }, [showNotice]);

  const handleRestoreSamples = useCallback(() => {
    pagesRef.current.forEach(revokePageUrl);
    setPages(SAMPLE_ALBUM_PAGES);
    setCurrentIndex(0);
    setDirection(1);
    setSettings((prev) => ({
      ...prev,
      albumTitle: '조용한 오후의 기록',
      albumSubtitle: '빛과 그림자, 그리고 머물렀던 순간들',
      authorName: '김하늘',
      coverDate: getTodayFormatted(),
      closingTitle: '기록을 마치며',
      closingMessage:
        '스쳐 지나가는 하루의 빛과 온기를 한 권의 사진집으로 묶어 남깁니다. 이 페이지를 다시 펼쳐보는 날에도 오늘의 고요한 마음이 오래 기억되기를 바랍니다.',
    }));
  }, []);

  const handleNavigate = useCallback(
    (nextIndex: number, dir: number) => {
      if (nextIndex !== currentIndex && settings.soundEnabled) {
        playPageTurnSound();
      }
      setDirection(dir);
      setCurrentIndex(nextIndex);
    },
    [currentIndex, settings.soundEnabled]
  );

  const handleExportPdf = useCallback(async () => {
    if (pages.length === 0 || exportProgress !== null) return;
    try {
      await exportAlbumToPdf(pages, settings, (progress) => {
        setExportProgress(progress);
      });
      const exportedPages =
        pages.length +
        (settings.includeCover ? 1 : 0) +
        (settings.includeClosing ? 1 : 0);
      showNotice(
        'info',
        `총 ${exportedPages}쪽 사진 앨범을 PDF로 저장했습니다.`
      );
    } catch {
      showNotice('error', 'PDF 파일을 생성하는 중 오류가 발생했습니다.');
    } finally {
      setExportProgress(null);
    }
  }, [pages, settings, exportProgress, showNotice]);

  const handleExportPng = useCallback(async () => {
    if (pages.length === 0 || isExportingPng) return;
    setIsExportingPng(true);
    try {
      const label = await saveCurrentViewAsPng(pages, settings, currentIndex);
      showNotice('info', `${label} 페이지를 PNG 그림 파일로 저장했습니다.`);
    } catch {
      showNotice('error', 'PNG 이미지를 생성하는 중 오류가 발생했습니다.');
    } finally {
      setIsExportingPng(false);
    }
  }, [pages, settings, currentIndex, isExportingPng, showNotice]);

  const handleExportEpub = useCallback(async () => {
    if (pages.length === 0 || epubProgress !== null) return;
    try {
      await exportAlbumToEpub(pages, settings, (progress) => {
        setEpubProgress(progress);
      });
      showNotice(
        'info',
        '교보문고 등 서점 제출용 EPUB 3.0 전자책 파일을 저장했습니다.'
      );
    } catch {
      showNotice('error', 'EPUB 전자책 파일을 생성하는 중 오류가 발생했습니다.');
    } finally {
      setEpubProgress(null);
    }
  }, [pages, settings, epubProgress, showNotice]);

  // Global drag-and-drop handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingOver(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      handleUploadFiles(
        files,
        hasOnlySamples ? 'replace-samples' : 'append'
      );
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen flex flex-col bg-[#F5F6F8] text-[#111215]"
    >
      <TopBar
        viewMode={viewMode}
        onSelectView={(mode) => {
          setViewMode(mode);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onScrollToSettings={() =>
          settingsRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
        onScrollToGuide={() =>
          guideRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
        onExportPdf={handleExportPdf}
        canExport={pages.length > 0}
        exportProgress={exportProgress}
      />

      <WorkspaceToolbar
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        pageCount={pages.length}
        hasOnlySamples={hasOnlySamples}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onUploadFiles={handleUploadFiles}
        onClearAll={handleClearAll}
        onExportPng={handleExportPng}
        isExportingPng={isExportingPng}
        onExportEpub={handleExportEpub}
        epubProgress={epubProgress}
        settingsRef={settingsRef}
      />

      {/* Non-blocking status notification */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="max-w-[1280px] w-full mx-auto px-6 pt-4"
        >
          <div
            className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border text-sm ${
              notice.type === 'error'
                ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                : 'bg-white border-[#E2E5EA] text-[#111215]'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {notice.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1D4ED8]" aria-hidden="true" />
              )}
              <span className="truncate">{notice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="알림 닫기"
              className="p-1 text-[#6E7685] hover:text-[#111215] cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1">
        {viewMode === 'single' ? (
          <>
            <SinglePageAlbum
              pages={pages}
              currentIndex={currentIndex}
              direction={direction}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onNavigate={handleNavigate}
              onUpdatePage={handleUpdatePage}
              onDeletePage={handleDeletePage}
              onMovePage={handleMovePage}
              onUploadFiles={handleUploadFiles}
              onRestoreSamples={handleRestoreSamples}
              onExportPng={handleExportPng}
              isExportingPng={isExportingPng}
            />
            <FilmstripBar
              pages={pages}
              albumTitle={settings.albumTitle}
              closingTitle={settings.closingTitle}
              currentIndex={currentIndex}
              onSelectPage={(bookIdx) => {
                if (bookIdx !== currentIndex && settings.soundEnabled) {
                  playPageTurnSound();
                }
                setDirection(bookIdx >= currentIndex ? 1 : -1);
                setCurrentIndex(bookIdx);
              }}
              onAppendFiles={(files) => handleUploadFiles(files, 'append')}
            />
          </>
        ) : (
          <OverviewGrid
            pages={pages}
            settings={settings}
            currentIndex={currentIndex}
            onOpenBookPage={(bookIdx) => {
              setCurrentIndex(bookIdx);
              setViewMode('single');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onUpdatePage={handleUpdatePage}
            onMovePage={handleMovePage}
            onDeletePage={handleDeletePage}
            onAppendFiles={(files) => handleUploadFiles(files, 'append')}
          />
        )}
      </main>

      <UsageGuide guideRef={guideRef} />

      {/* Global Drag & Drop Overlay */}
      {isDraggingOver && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-50 bg-[#111215]/60 backdrop-blur-xs flex items-center justify-center p-6 pointer-events-none"
        >
          <div className="bg-white border-2 border-dashed border-[#1D4ED8] rounded-2xl px-10 py-12 text-center max-w-md shadow-xl">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <p className="font-editorial text-xl font-semibold text-[#111215] mb-1.5">
              여기에 사진을 놓아주세요
            </p>
            <p className="text-sm text-[#5B616E]">
              여러 장을 한 번에 올리면 각 사진이 한 쪽씩 앨범으로 구성됩니다
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
