import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ImageDown,
  ImagePlus,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AlbumPage, AlbumSettings, PageTheme } from '../types/album';
import { playPageTurnSound } from '../utils/pageTurnSound';
import { ResilientImage } from './ResilientImage';

interface SinglePageAlbumProps {
  pages: AlbumPage[];
  currentIndex: number;
  direction: number;
  settings: AlbumSettings;
  onUpdateSettings: (patch: Partial<AlbumSettings>) => void;
  onNavigate: (nextIndex: number, dir: number) => void;
  onUpdatePage: (id: string, patch: Partial<AlbumPage>) => void;
  onDeletePage: (id: string) => void;
  onMovePage: (index: number, delta: -1 | 1) => void;
  onUploadFiles: (files: FileList | File[], mode: 'replace-samples' | 'append') => void;
  onRestoreSamples: () => void;
  onExportPng: () => void;
  isExportingPng: boolean;
}

const SHEET_THEME_CLASSES: Record<
  PageTheme,
  {
    sheet: string;
    frameBg: string;
    hairline: string;
    ink: string;
    muted: string;
    inputHover: string;
  }
> = {
  'gallery-white': {
    sheet: 'bg-white border-[#E2E5EA] text-[#111215]',
    frameBg: 'bg-[#F5F6F8]',
    hairline: 'border-[#E2E5EA]',
    ink: 'text-[#111215]',
    muted: 'text-[#5B616E]',
    inputHover: 'hover:bg-[#F7F8FA] focus:bg-[#F7F8FA] focus:border-[#1D4ED8]',
  },
  'archival-stone': {
    sheet: 'bg-[#EFF1F4] border-[#D4D8E0] text-[#111215]',
    frameBg: 'bg-white',
    hairline: 'border-[#D4D8E0]',
    ink: 'text-[#111215]',
    muted: 'text-[#555B66]',
    inputHover: 'hover:bg-white/60 focus:bg-white focus:border-[#1D4ED8]',
  },
  'dark-monograph': {
    sheet: 'bg-[#111215] border-[#2A2D35] text-[#F5F6F8]',
    frameBg: 'bg-[#191B20]',
    hairline: 'border-[#2A2D35]',
    ink: 'text-[#F5F6F8] tracking-[0.01em]',
    muted: 'text-[#9CA3AF] tracking-[0.01em]',
    inputHover: 'hover:bg-[#191B20] focus:bg-[#191B20] focus:border-[#60A5FA]',
  },
  'lovely-pink': {
    sheet: 'bg-[#FDF2F4] border-[#F0D4DB] text-[#2B141C]',
    frameBg: 'bg-white',
    hairline: 'border-[#F0D4DB]',
    ink: 'text-[#2B141C]',
    muted: 'text-[#6E4A56]',
    inputHover: 'hover:bg-white/70 focus:bg-white focus:border-[#D95D82]',
  },
  'calm-beige': {
    sheet: 'bg-[#F4EFE6] border-[#E0D7C6] text-[#26211B]',
    frameBg: 'bg-[#FAF7F2]',
    hairline: 'border-[#E0D7C6]',
    ink: 'text-[#26211B]',
    muted: 'text-[#665B4E]',
    inputHover: 'hover:bg-white/60 focus:bg-white focus:border-[#8C6D46]',
  },
};

export const SinglePageAlbum: React.FC<SinglePageAlbumProps> = ({
  pages,
  currentIndex,
  direction,
  settings,
  onUpdateSettings,
  onNavigate,
  onUpdatePage,
  onDeletePage,
  onMovePage,
  onUploadFiles,
  onRestoreSamples,
  onExportPng,
  isExportingPng,
}) => {
  const emptyInputRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const photoCount = pages.length;
  // Book sequence when photos exist: [0: 표지, 1..photoCount: 사진, photoCount+1: 마무리]
  const totalBookPages = photoCount > 0 ? photoCount + 2 : 0;
  const safeBookIndex = Math.min(
    Math.max(0, currentIndex),
    Math.max(0, totalBookPages - 1)
  );

  const isCoverPage = photoCount > 0 && safeBookIndex === 0;
  const isClosingPage = photoCount > 0 && safeBookIndex === totalBookPages - 1;
  const photoIndex = safeBookIndex - 1;
  const currentPage =
    !isCoverPage && !isClosingPage && photoIndex >= 0 && photoIndex < photoCount
      ? pages[photoIndex]
      : undefined;

  const hasPrev = safeBookIndex > 0;
  const hasNext = safeBookIndex < totalBookPages - 1;

  // Keyboard arrow navigation when not editing inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowLeft' && safeBookIndex > 0) {
        e.preventDefault();
        onNavigate(safeBookIndex - 1, -1);
      } else if (e.key === 'ArrowRight' && safeBookIndex < totalBookPages - 1) {
        e.preventDefault();
        onNavigate(safeBookIndex + 1, 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safeBookIndex, totalBookPages, onNavigate]);

  if (photoCount === 0) {
    return (
      <div className="max-w-[760px] mx-auto px-6 py-14">
        <div className="bg-white border border-dashed border-[#CBD2DF] rounded-xl p-10 sm:p-14 text-center">
          <input
            ref={emptyInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const files = Array.from(e.target.files);
                e.target.value = '';
                onUploadFiles(files, 'append');
              }
            }}
          />
          <div className="w-12 h-12 mx-auto mb-5 rounded-lg bg-[#F5F6F8] border border-[#E2E5EA] flex items-center justify-center text-[#111215]">
            <ImagePlus className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="font-editorial text-2xl font-semibold text-[#111215] mb-2.5 text-balance">
            사진 여러 장을 올려 앨범을 시작하세요
          </h2>
          <p className="text-sm text-[#5B616E] max-w-md mx-auto leading-relaxed mb-7">
            선택한 사진은 한 쪽에 한 장씩 배치됩니다. 각 사진마다 제목과
            설명을 작성한 뒤 한 번에 PDF 앨범으로 저장할 수 있습니다.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => emptyInputRef.current?.click()}
              className="inline-flex items-center gap-2 min-h-[44px] px-6 py-2.5 text-sm font-medium text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>사진 여러 장 선택하기</span>
            </button>
            <button
              type="button"
              onClick={onRestoreSamples}
              className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 text-sm font-medium text-[#111215] bg-[#F5F6F8] hover:bg-[#E8EBEF] border border-[#E2E5EA] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>샘플 사진 3장 불러오기</span>
            </button>
          </div>
          <p className="mt-5 text-xs text-[#6E7685]">
            화면 어느 곳에나 사진 파일을 끌어다 놓아도 바로 추가됩니다
          </p>
        </div>
      </div>
    );
  }

  const theme = SHEET_THEME_CLASSES[settings.theme];
  const isPortrait = settings.orientation !== 'landscape';
  const is9x16 = settings.orientation === 'portrait-9-16';
  const is4x5 = settings.orientation === 'portrait-4-5';

  const containerMaxWidthClass = is9x16
    ? 'max-w-[440px]'
    : isPortrait
    ? 'max-w-[560px]'
    : 'max-w-[880px]';

  const sheetMinHeightClass = is9x16
    ? 'min-h-[720px] sm:min-h-[782px]'
    : is4x5
    ? 'min-h-[620px] sm:min-h-[700px]'
    : isPortrait
    ? 'min-h-[640px] sm:min-h-[792px]'
    : 'min-h-[480px] sm:min-h-[622px]';

  const coverInnerMinHeightClass = is9x16
    ? 'min-h-[640px] sm:min-h-[706px]'
    : is4x5
    ? 'min-h-[540px] sm:min-h-[624px]'
    : isPortrait
    ? 'min-h-[560px] sm:min-h-[716px]'
    : 'min-h-[420px] sm:min-h-[546px]';

  const fontStyle = settings.fontStyle || 'myeongjo';
  const albumFontClass =
    fontStyle === 'gothic'
      ? 'font-gothic'
      : fontStyle === 'handwriting'
      ? 'font-handwriting'
      : 'font-myeongjo';
  const isHandwriting = fontStyle === 'handwriting';

  const pageNumberLabel = `${String(photoIndex + 1).padStart(2, '0')} / ${String(
    photoCount
  ).padStart(2, '0')}`;

  const sheetMotionKey = isCoverPage
    ? 'book-cover'
    : isClosingPage
    ? 'book-closing'
    : currentPage?.id || `photo-${photoIndex}`;

  const sheetAriaLabel = isCoverPage
    ? '앨범 첫 쪽 표지'
    : isClosingPage
    ? '앨범 마지막 쪽 마무리'
    : `앨범 사진 ${photoIndex + 1}쪽: ${currentPage?.title || '제목 없는 사진'}`;

  const bottomPageStatus = isCoverPage
    ? `표지 · 1 / ${totalBookPages}`
    : isClosingPage
    ? `마무리 · ${totalBookPages} / ${totalBookPages}`
    : `사진 ${photoIndex + 1} / ${photoCount}`;

  const sheetVariants = {
    enter: (dir: number) => {
      if (shouldReduceMotion) {
        return { opacity: 0 };
      }
      if (!settings.flipEffect) {
        return { opacity: 0, x: dir >= 0 ? 18 : -18 };
      }
      return {
        opacity: 0,
        rotateY: dir >= 0 ? 52 : -52,
        x: dir >= 0 ? 28 : -28,
        scale: 0.97,
        transformPerspective: 1600,
      };
    },
    center: {
      opacity: 1,
      rotateY: 0,
      x: 0,
      scale: 1,
      transformPerspective: 1600,
    },
    exit: (dir: number) => {
      if (shouldReduceMotion) {
        return { opacity: 0 };
      }
      if (!settings.flipEffect) {
        return { opacity: 0, x: dir >= 0 ? -18 : 18 };
      }
      return {
        opacity: 0,
        rotateY: dir >= 0 ? -52 : 52,
        x: dir >= 0 ? -28 : 28,
        scale: 0.97,
        transformPerspective: 1600,
      };
    },
  };

  return (
    <div id="album-stage" className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-6 pb-8">
      {/* Page Meta & Order Controls Bar */}
      <div
        className={`mx-auto mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#5B616E] ${containerMaxWidthClass}`}
      >
        {isCoverPage ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-tabular font-medium text-[#111215]">
                첫 쪽 · 표지
              </span>
              <span aria-hidden="true">·</span>
              <span>제목, 부제, 이름과 날짜를 표지에 입력할 수 있습니다</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-tabular text-[#5B616E]">
                수록 사진 {photoCount}장
              </span>
              <button
                type="button"
                onClick={onExportPng}
                disabled={isExportingPng}
                className="inline-flex items-center gap-1.5 min-h-[32px] px-3 py-1 rounded-md border border-[#E2E5EA] bg-white text-[#111215] hover:border-[#111215] hover:bg-[#F5F6F8] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                {isExportingPng ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <ImageDown className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>이 쪽 PNG 저장</span>
              </button>
            </div>
          </>
        ) : isClosingPage ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-tabular font-medium text-[#111215]">
                마지막 쪽 · 마무리
              </span>
              <span aria-hidden="true">·</span>
              <span>앨범을 닫는 마무리 문구를 자유롭게 적어보세요</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-tabular text-[#5B616E]">
                총 {totalBookPages}쪽 구성
              </span>
              <button
                type="button"
                onClick={onExportPng}
                disabled={isExportingPng}
                className="inline-flex items-center gap-1.5 min-h-[32px] px-3 py-1 rounded-md border border-[#E2E5EA] bg-white text-[#111215] hover:border-[#111215] hover:bg-[#F5F6F8] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                {isExportingPng ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <ImageDown className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>이 쪽 PNG 저장</span>
              </button>
            </div>
          </>
        ) : (
          currentPage && (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-tabular font-medium text-[#111215]">
                  사진 {photoIndex + 1}쪽
                </span>
                <span aria-hidden="true">·</span>
                <span className="truncate max-w-[200px] sm:max-w-[280px]">
                  {currentPage.fileName}
                </span>
                {currentPage.width && currentPage.height && (
                  <>
                    <span aria-hidden="true" className="hidden sm:inline">
                      ·
                    </span>
                    <span className="hidden sm:inline font-tabular">
                      {currentPage.width} × {currentPage.height}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onExportPng}
                  disabled={isExportingPng}
                  className="inline-flex items-center gap-1.5 min-h-[32px] px-3 py-1 rounded-md border border-[#E2E5EA] bg-white text-[#111215] hover:border-[#111215] hover:bg-[#F5F6F8] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isExportingPng ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <ImageDown className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>이 쪽 PNG 저장</span>
                </button>
                <button
                  type="button"
                  onClick={() => onMovePage(photoIndex, -1)}
                  disabled={photoIndex <= 0}
                  title="앞 페이지로 이동"
                  className="inline-flex items-center gap-1 min-h-[32px] px-2.5 py-1 rounded-md border border-[#E2E5EA] bg-white text-[#111215] hover:bg-[#F5F6F8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>앞으로</span>
                </button>
                <button
                  type="button"
                  onClick={() => onMovePage(photoIndex, 1)}
                  disabled={photoIndex >= photoCount - 1}
                  title="뒤 페이지로 이동"
                  className="inline-flex items-center gap-1 min-h-[32px] px-2.5 py-1 rounded-md border border-[#E2E5EA] bg-white text-[#111215] hover:bg-[#F5F6F8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>뒤로</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeletePage(currentPage.id)}
                  title="이 사진 페이지 삭제"
                  className="inline-flex items-center gap-1 min-h-[32px] px-2.5 py-1 rounded-md border border-[#E2E5EA] bg-white text-[#5B616E] hover:text-[#B91C1C] hover:border-[#FECACA] hover:bg-[#FEF2F2] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>삭제</span>
                </button>
              </div>
            </>
          )
        )}
      </div>

      {/* Center Stage: Left Prev Button + Single Album Sheet + Right Next Button */}
      <div className="flex items-center justify-center gap-4 lg:gap-7">
        {/* Desktop Previous Button */}
        <button
          type="button"
          onClick={() => hasPrev && onNavigate(safeBookIndex - 1, -1)}
          disabled={!hasPrev}
          aria-label="이전 페이지"
          className="hidden md:inline-flex items-center justify-center w-12 h-12 rounded-full bg-white border border-[#E2E5EA] text-[#111215] hover:border-[#111215] hover:bg-[#F9FAFB] disabled:opacity-30 disabled:hover:border-[#E2E5EA] disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* The Single Album Sheet */}
        <div
          className={`w-full transition-all duration-200 ${containerMaxWidthClass}`}
          style={{ perspective: settings.flipEffect ? 1600 : undefined }}
        >
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.article
              key={sheetMotionKey}
              custom={direction}
              variants={sheetVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={
                settings.flipEffect && !shouldReduceMotion
                  ? { duration: 0.34, ease: [0.22, 1, 0.36, 1] }
                  : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
              }
              style={
                settings.flipEffect
                  ? { transformStyle: 'preserve-3d', transformOrigin: 'center center' }
                  : undefined
              }
              aria-label={sheetAriaLabel}
              className={`relative border rounded-md shadow-[0_12px_36px_-18px_rgba(17,18,21,0.18)] overflow-hidden p-6 sm:p-9 flex flex-col ${sheetMinHeightClass} ${theme.sheet}`}
            >
              {settings.flipEffect && (
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-y-0 left-0 w-4 ${
                    settings.theme === 'dark-monograph'
                      ? 'bg-gradient-to-r from-black/35 to-transparent'
                      : 'bg-gradient-to-r from-black/[0.045] to-transparent'
                  }`}
                />
              )}
              {isCoverPage ? (
                /* FIRST PAGE: COVER */
                <div
                  className={`border ${theme.hairline} p-6 sm:p-10 flex-1 flex flex-col justify-between ${coverInnerMinHeightClass}`}
                >
                  <div>
                    <p className={`font-tabular text-xs tracking-wider mb-8 sm:mb-12 ${theme.muted}`}>
                      PHOTOGRAPH MONOGRAPH · COVER
                    </p>

                    <div className="space-y-4 sm:space-y-5">
                      <div>
                        <label htmlFor="cover-title-input" className="sr-only">
                          표지 제목
                        </label>
                        <textarea
                          id="cover-title-input"
                          rows={2}
                          value={settings.albumTitle}
                          onChange={(e) =>
                            onUpdateSettings({ albumTitle: e.target.value })
                          }
                          placeholder="앨범 표지 제목을 입력하세요"
                          className={`w-full ${albumFontClass} ${
                            isHandwriting
                              ? 'text-[39px] sm:text-[63px] font-normal'
                              : 'text-[33px] sm:text-[51px] font-bold'
                          } leading-tight bg-transparent border border-transparent rounded-md px-3 py-2 -mx-3 outline-none resize-none transition-colors ${theme.ink} ${theme.inputHover}`}
                        />
                      </div>

                      <div>
                        <label htmlFor="cover-subtitle-input" className="sr-only">
                          표지 부제
                        </label>
                        <textarea
                          id="cover-subtitle-input"
                          rows={2}
                          value={settings.albumSubtitle}
                          onChange={(e) =>
                            onUpdateSettings({ albumSubtitle: e.target.value })
                          }
                          placeholder="부제를 입력하세요 (예: 빛과 그림자, 그리고 머물렀던 순간들)"
                          className={`w-full ${albumFontClass} ${
                            isHandwriting ? 'text-[27px] sm:text-[33px]' : 'text-[21px] sm:text-[23px]'
                          } leading-relaxed bg-transparent border border-transparent rounded-md px-3 py-1.5 -mx-3 outline-none resize-none transition-colors ${theme.muted} ${theme.inputHover}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Prominent Author Name & Date on Cover */}
                  <div className={`pt-6 mt-8 border-t ${theme.hairline}`}>
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div>
                          <label htmlFor="cover-author-input" className="sr-only">
                            만든이 이름
                          </label>
                          <input
                            id="cover-author-input"
                            type="text"
                            value={settings.authorName}
                            onChange={(e) =>
                              onUpdateSettings({ authorName: e.target.value })
                            }
                            placeholder="이름 입력 (예: 김하늘)"
                            className={`w-full ${albumFontClass} ${
                              isHandwriting
                                ? 'text-[27px] sm:text-[33px] font-normal'
                                : 'text-[23px] sm:text-[27px] font-semibold'
                            } bg-transparent border border-transparent rounded-md px-3 py-1 -mx-3 outline-none transition-colors ${theme.ink} ${theme.inputHover}`}
                          />
                        </div>
                        <div>
                          <label htmlFor="cover-date-input" className="sr-only">
                            날짜
                          </label>
                          <input
                            id="cover-date-input"
                            type="text"
                            value={settings.coverDate}
                            onChange={(e) =>
                              onUpdateSettings({ coverDate: e.target.value })
                            }
                            placeholder="날짜 입력 (예: 2026.11.26)"
                            className={`w-full font-tabular text-[19px] sm:text-[21px] font-medium bg-transparent border border-transparent rounded-md px-3 py-1 -mx-3 outline-none transition-colors ${theme.muted} ${theme.inputHover}`}
                          />
                        </div>
                      </div>

                      <p className={`font-tabular text-xs shrink-0 ${theme.muted}`}>
                        수록 사진 {photoCount}장
                      </p>
                    </div>
                  </div>
                </div>
              ) : isClosingPage ? (
                /* LAST PAGE: CLOSING EPILOGUE */
                <div
                  className={`border ${theme.hairline} p-6 sm:p-10 flex-1 flex flex-col justify-between ${coverInnerMinHeightClass}`}
                >
                  <div className="space-y-6">
                    <p className={`font-tabular text-xs tracking-wider ${theme.muted}`}>
                      EPILOGUE · CLOSING PAGE
                    </p>

                    <div>
                      <label htmlFor="closing-title-input" className="sr-only">
                        마무리 제목
                      </label>
                      <input
                        id="closing-title-input"
                        type="text"
                        value={settings.closingTitle}
                        onChange={(e) =>
                          onUpdateSettings({ closingTitle: e.target.value })
                        }
                        placeholder="마무리 제목 (예: 기록을 마치며)"
                        className={`w-full ${albumFontClass} ${
                          isHandwriting
                            ? 'text-[33px] sm:text-[39px] font-normal'
                            : 'text-[27px] sm:text-[33px] font-semibold'
                        } bg-transparent border border-transparent rounded-md px-3 py-1.5 -mx-3 outline-none transition-colors ${theme.ink} ${theme.inputHover}`}
                      />
                    </div>

                    <div className={`w-12 border-t ${theme.hairline}`} />

                    <div>
                      <label htmlFor="closing-message-input" className="sr-only">
                        마무리 문구
                      </label>
                      <textarea
                        id="closing-message-input"
                        rows={7}
                        value={settings.closingMessage}
                        onChange={(e) =>
                          onUpdateSettings({ closingMessage: e.target.value })
                        }
                        placeholder="앨범의 마지막 쪽에 남기고 싶은 마무리 인사나 소감을 적어보세요..."
                        className={`w-full ${albumFontClass} ${
                          isHandwriting ? 'text-[23px] sm:text-[27px]' : 'text-[19px] sm:text-[21px]'
                        } leading-loose bg-transparent border border-transparent rounded-md px-3 py-2 -mx-3 outline-none resize-none transition-colors ${theme.muted} ${theme.inputHover}`}
                      />
                    </div>
                  </div>

                  <div className={`pt-5 mt-6 border-t ${theme.hairline} flex flex-wrap items-center justify-between gap-3 text-xs ${theme.muted}`}>
                    <span>
                      {[
                        settings.albumTitle.trim(),
                        settings.authorName.trim(),
                        settings.coverDate.trim(),
                      ]
                        .filter(Boolean)
                        .join(' · ') || '포토 앨범'}
                    </span>
                    <span className="font-tabular">마지막 쪽</span>
                  </div>
                </div>
              ) : (
                /* MIDDLE PAGES: EXISTING PHOTO PREVIEW & EDITOR */
                currentPage && (
                  <>
                    {/* Sheet Top Editorial Header */}
                    <div
                      className={`flex items-center justify-between gap-4 pb-3 mb-5 border-b text-xs ${theme.hairline} ${theme.muted}`}
                    >
                      <span className="truncate font-medium">
                        {settings.albumTitle.trim() || '포토 앨범'}
                      </span>
                      {settings.showPageNumbers && (
                        <span className="font-tabular shrink-0">{pageNumberLabel}</span>
                      )}
                    </div>

                    {/* Sheet Body: Portrait vs Landscape */}
                    {isPortrait ? (
                      <div className="flex flex-col flex-1 justify-between gap-6">
                        {/* Framed Single Photograph */}
                        <div
                          className={`w-full overflow-hidden flex items-center justify-center p-2 sm:p-3 border ${theme.frameBg} ${theme.hairline} ${
                            is9x16
                              ? 'aspect-square'
                              : is4x5
                              ? 'aspect-[4/3]'
                              : 'aspect-[4/3] sm:aspect-[10/8]'
                          }`}
                        >
                          <ResilientImage
                            src={currentPage.imageUrl}
                            alt={currentPage.title || currentPage.fileName}
                            fallbackTitle={currentPage.title || currentPage.fileName}
                            darkSurface={settings.theme === 'dark-monograph'}
                            className="w-full h-full object-contain"
                          />
                        </div>

                        {/* Editable Title & Description */}
                        <div className="space-y-2.5 min-w-0">
                          <div>
                            <label
                              htmlFor={`photo-title-${currentPage.id}`}
                              className="sr-only"
                            >
                              사진 제목
                            </label>
                            <input
                              id={`photo-title-${currentPage.id}`}
                              type="text"
                              value={currentPage.title}
                              onChange={(e) =>
                                onUpdatePage(currentPage.id, { title: e.target.value })
                              }
                              placeholder="사진 제목을 입력하세요"
                              className={`w-full ${albumFontClass} ${
                                isHandwriting
                                  ? 'text-[27px] sm:text-[33px] font-normal'
                                  : 'text-[23px] sm:text-[27px] font-semibold'
                              } bg-transparent border border-transparent rounded-md px-2 py-1.5 outline-none transition-colors ${theme.ink} ${theme.inputHover}`}
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`photo-desc-${currentPage.id}`}
                              className="sr-only"
                            >
                              사진 설명
                            </label>
                            <textarea
                              id={`photo-desc-${currentPage.id}`}
                              rows={3}
                              value={currentPage.description}
                              onChange={(e) =>
                                onUpdatePage(currentPage.id, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="이 사진에 담긴 순간, 장소, 감상을 자유롭게 적어보세요..."
                              className={`w-full ${albumFontClass} ${
                                isHandwriting
                                  ? 'text-[21px] sm:text-[23px]'
                                  : 'text-[17px] sm:text-[18px]'
                              } leading-relaxed bg-transparent border border-transparent rounded-md px-2 py-2 outline-none resize-none transition-colors ${theme.muted} ${theme.inputHover}`}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-9 items-start flex-1">
                        {/* Left: Single Photograph wrapped in min-w-0 so aspect-[4/3] never stretches horizontally into text */}
                        <div className="md:col-span-7 min-w-0 w-full">
                          <div
                            className={`w-full aspect-[4/3] overflow-hidden flex items-center justify-center p-2.5 sm:p-3 border ${theme.frameBg} ${theme.hairline}`}
                          >
                            <ResilientImage
                              src={currentPage.imageUrl}
                              alt={currentPage.title || currentPage.fileName}
                              fallbackTitle={currentPage.title || currentPage.fileName}
                              darkSurface={settings.theme === 'dark-monograph'}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </div>

                        {/* Right: Editorial Title & Description Column */}
                        <div className="md:col-span-5 min-w-0 flex flex-col justify-between py-1">
                          <div className="space-y-4">
                            <p className={`font-tabular text-xs ${theme.muted}`}>
                              PLATE {String(photoIndex + 1).padStart(2, '0')}
                            </p>

                            <div>
                              <label
                                htmlFor={`photo-title-${currentPage.id}`}
                                className="sr-only"
                              >
                                사진 제목
                              </label>
                              <textarea
                                id={`photo-title-${currentPage.id}`}
                                rows={2}
                                value={currentPage.title}
                                onChange={(e) =>
                                  onUpdatePage(currentPage.id, {
                                    title: e.target.value,
                                  })
                                }
                                placeholder="사진 제목을 입력하세요"
                                className={`w-full ${albumFontClass} ${
                                  isHandwriting
                                    ? 'text-[27px] sm:text-[33px] font-normal'
                                    : 'text-[23px] sm:text-[27px] font-semibold'
                                } leading-snug bg-transparent border border-transparent rounded-md px-2 py-1.5 outline-none resize-none transition-colors ${theme.ink} ${theme.inputHover}`}
                              />
                            </div>

                            <div className={`w-10 border-t ${theme.hairline}`} />

                            <div>
                              <label
                                htmlFor={`photo-desc-${currentPage.id}`}
                                className="sr-only"
                              >
                                사진 설명
                              </label>
                              <textarea
                                id={`photo-desc-${currentPage.id}`}
                                rows={6}
                                value={currentPage.description}
                                onChange={(e) =>
                                  onUpdatePage(currentPage.id, {
                                    description: e.target.value,
                                  })
                                }
                                placeholder="이 사진에 담긴 순간, 장소, 감상을 자유롭게 적어보세요..."
                                className={`w-full ${albumFontClass} ${
                                  isHandwriting ? 'text-[21px]' : 'text-[17px]'
                                } leading-relaxed bg-transparent border border-transparent rounded-md px-2 py-2 outline-none resize-none transition-colors ${theme.muted} ${theme.inputHover}`}
                              />
                            </div>
                          </div>

                          <p className={`text-[11px] pt-4 ${theme.muted} opacity-80`}>
                            제목과 설명을 클릭해 바로 수정할 수 있습니다
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )
              )}
            </motion.article>
          </AnimatePresence>
        </div>

        {/* Desktop Next Button */}
        <button
          type="button"
          onClick={() => hasNext && onNavigate(safeBookIndex + 1, 1)}
          disabled={!hasNext}
          aria-label="다음 페이지"
          className="hidden md:inline-flex items-center justify-center w-12 h-12 rounded-full bg-white border border-[#E2E5EA] text-[#111215] hover:border-[#111215] hover:bg-[#F9FAFB] disabled:opacity-30 disabled:hover:border-[#E2E5EA] disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
        >
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Explicit Prev · Page Indicator · Next Controls + Flipbook Toggles */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => hasPrev && onNavigate(safeBookIndex - 1, -1)}
            disabled={!hasPrev}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-5 py-2 text-sm font-medium bg-white border border-[#E2E5EA] text-[#111215] hover:border-[#111215] hover:bg-[#F9FAFB] disabled:opacity-35 disabled:hover:border-[#E2E5EA] disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <span>이전</span>
          </button>

          <div className="min-w-[116px] text-center font-tabular text-sm font-medium text-[#111215]">
            {bottomPageStatus}
          </div>

          <button
            type="button"
            onClick={() => hasNext && onNavigate(safeBookIndex + 1, 1)}
            disabled={!hasNext}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-5 py-2 text-sm font-medium bg-white border border-[#E2E5EA] text-[#111215] hover:border-[#111215] hover:bg-[#F9FAFB] disabled:opacity-35 disabled:hover:border-[#E2E5EA] disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          >
            <span>다음</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Flipbook Effects & Sound Controls */}
        <div
          role="group"
          aria-label="플립북 효과 설정"
          className="flex flex-wrap items-center justify-center gap-2 text-xs"
        >
          <button
            type="button"
            aria-pressed={settings.flipEffect}
            onClick={() => onUpdateSettings({ flipEffect: !settings.flipEffect })}
            className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              settings.flipEffect
                ? 'bg-[#111215] text-white border-[#111215]'
                : 'bg-white text-[#5B616E] border-[#E2E5EA] hover:border-[#111215] hover:text-[#111215]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>책장 넘김 효과 {settings.flipEffect ? '켜짐' : '꺼짐'}</span>
          </button>

          <button
            type="button"
            aria-pressed={settings.soundEnabled}
            onClick={() => {
              const nextSound = !settings.soundEnabled;
              onUpdateSettings({ soundEnabled: nextSound });
              if (nextSound) {
                playPageTurnSound();
              }
            }}
            className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              settings.soundEnabled
                ? 'bg-[#111215] text-white border-[#111215]'
                : 'bg-white text-[#5B616E] border-[#E2E5EA] hover:border-[#111215] hover:text-[#111215]'
            }`}
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>넘김 효과음 {settings.soundEnabled ? '켜짐' : '꺼짐'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
