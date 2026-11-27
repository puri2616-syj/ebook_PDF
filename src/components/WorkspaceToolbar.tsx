import React, { useRef } from 'react';
import {
  BookDown,
  ImageDown,
  ImagePlus,
  LayoutGrid,
  BookOpen,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  AlbumFontStyle,
  AlbumSettings,
  PageOrientation,
  PageTheme,
  PdfExportProgress,
  ViewMode,
} from '../types/album';

interface WorkspaceToolbarProps {
  settings: AlbumSettings;
  onUpdateSettings: (patch: Partial<AlbumSettings>) => void;
  pageCount: number;
  hasOnlySamples: boolean;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onUploadFiles: (files: FileList | File[], mode: 'replace-samples' | 'append') => void;
  onClearAll: () => void;
  onExportPng: () => void;
  isExportingPng: boolean;
  onExportEpub: () => void;
  epubProgress: PdfExportProgress | null;
  settingsRef: React.RefObject<HTMLDivElement | null>;
}

export const WorkspaceToolbar: React.FC<WorkspaceToolbarProps> = ({
  settings,
  onUpdateSettings,
  pageCount,
  hasOnlySamples,
  viewMode,
  onChangeViewMode,
  onUploadFiles,
  onClearAll,
  onExportPng,
  isExportingPng,
  onExportEpub,
  epubProgress,
  settingsRef,
}) => {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const appendInputRef = useRef<HTMLInputElement>(null);

  const orientations: { value: PageOrientation; label: string }[] = [
    { value: 'portrait', label: 'A4 세로' },
    { value: 'portrait-9-16', label: '세로 9:16' },
    { value: 'portrait-4-5', label: '세로 4:5' },
    { value: 'landscape', label: 'A4 가로' },
  ];

  const themes: { value: PageTheme; label: string; swatch: string }[] = [
    { value: 'gallery-white', label: '화이트', swatch: 'bg-white border-[#CBD2DF]' },
    { value: 'archival-stone', label: '스톤', swatch: 'bg-[#EFF1F4] border-[#B8C0CC]' },
    { value: 'lovely-pink', label: '핑크', swatch: 'bg-[#FDF2F4] border-[#E8BDC7]' },
    { value: 'calm-beige', label: '베이지', swatch: 'bg-[#F4EFE6] border-[#D5C9B4]' },
    { value: 'dark-monograph', label: '다크', swatch: 'bg-[#111215] border-[#374151]' },
  ];

  const fontStyles: { value: AlbumFontStyle; label: string; previewClass: string }[] = [
    { value: 'gothic', label: '고딕', previewClass: 'font-gothic' },
    { value: 'myeongjo', label: '명조', previewClass: 'font-myeongjo' },
    { value: 'handwriting', label: '손글씨', previewClass: 'font-handwriting text-sm leading-none' },
  ];

  return (
    <section
      ref={settingsRef}
      id="album-settings"
      aria-label="앨범 작업 도구 및 판형 설정"
      className="bg-white border-b border-[#E2E5EA]"
    >
      <div className="max-w-[1280px] mx-auto px-6 py-4 space-y-4">
        {/* Row 1: Album title + Upload Actions + View Mode */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 flex-1">
            <div className="min-w-0 flex-1 max-w-md">
              <label htmlFor="album-title-input" className="sr-only">
                앨범 제목
              </label>
              <input
                id="album-title-input"
                type="text"
                value={settings.albumTitle}
                onChange={(e) => onUpdateSettings({ albumTitle: e.target.value })}
                placeholder="앨범 제목을 입력하세요"
                className="w-full font-editorial text-lg font-semibold text-[#111215] bg-transparent border border-transparent hover:border-[#E2E5EA] focus:border-[#1D4ED8] focus:bg-[#F9FAFB] rounded-md px-2.5 py-1.5 -ml-2.5 outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-[#5B616E] font-tabular shrink-0">
              <span>
                {pageCount > 0 ? `표지 · 사진 ${pageCount}장 · 마무리` : '총 0쪽'}
              </span>
              {hasOnlySamples && pageCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>샘플 미리보기</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const files = Array.from(e.target.files);
                  e.target.value = '';
                  onUploadFiles(
                    files,
                    hasOnlySamples ? 'replace-samples' : 'append'
                  );
                }
              }}
            />
            <input
              ref={appendInputRef}
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

            {hasOnlySamples ? (
              <button
                type="button"
                onClick={() => replaceInputRef.current?.click()}
                className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#111215] hover:bg-[#272A30] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
              >
                <Upload className="w-4 h-4" aria-hidden="true" />
                <span>내 사진 여러 장 올리기</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => appendInputRef.current?.click()}
                className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#111215] hover:bg-[#272A30] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
              >
                <ImagePlus className="w-4 h-4" aria-hidden="true" />
                <span>사진 추가하기</span>
              </button>
            )}

            {hasOnlySamples && (
              <button
                type="button"
                onClick={() => appendInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-sm font-medium text-[#111215] bg-[#F5F6F8] hover:bg-[#E8EBEF] border border-[#E2E5EA] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
              >
                <ImagePlus className="w-4 h-4" aria-hidden="true" />
                <span>추가</span>
              </button>
            )}

            {pageCount > 0 && (
              <>
                <button
                  type="button"
                  onClick={onExportPng}
                  disabled={isExportingPng}
                  title="현재 보고 있는 페이지를 PNG 이미지로 저장"
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-sm font-medium text-[#111215] bg-[#F5F6F8] hover:bg-[#E8EBEF] border border-[#E2E5EA] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
                >
                  {isExportingPng ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ImageDown className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>현재 쪽 PNG 저장</span>
                </button>

                <button
                  type="button"
                  onClick={onExportEpub}
                  disabled={epubProgress !== null}
                  title="교보문고 등 전자책 서점 제출용 EPUB 3.0 전자책 파일로 저장"
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-sm font-medium text-[#111215] bg-[#F5F6F8] hover:bg-[#E8EBEF] border border-[#E2E5EA] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
                >
                  {epubProgress ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span className="font-tabular">
                        EPUB 생성 ({epubProgress.current}/{epubProgress.total})
                      </span>
                    </>
                  ) : (
                    <>
                      <BookDown className="w-4 h-4" aria-hidden="true" />
                      <span>EPUB 전자책 저장</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClearAll}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-sm font-medium text-[#5B616E] hover:text-[#B91C1C] hover:bg-[#FEF2F2] border border-[#E2E5EA] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  <span>전체 비우기</span>
                </button>
              </>
            )}

            {/* View mode segmented control */}
            <div
              role="group"
              aria-label="보기 방식 선택"
              className="flex items-center p-1 bg-[#F5F6F8] border border-[#E2E5EA] rounded-lg shrink-0"
            >
              <button
                type="button"
                onClick={() => onChangeViewMode('single')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'single'
                    ? 'bg-white text-[#111215] shadow-xs'
                    : 'text-[#5B616E] hover:text-[#111215]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                <span>한 쪽씩 보기</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeViewMode('grid')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#111215] shadow-xs'
                    : 'text-[#5B616E] hover:text-[#111215]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                <span>목록 · 순서</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Page layout, paper theme, cover & page numbering */}
        <div className="pt-3 border-t border-[#F0F1F4] flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-5">
            {/* Orientation */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#5B616E] whitespace-nowrap">
                판형
              </span>
              <div className="flex items-center p-0.5 bg-[#F5F6F8] border border-[#E2E5EA] rounded-lg">
                {orientations.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onUpdateSettings({ orientation: item.value })}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      settings.orientation === item.value
                        ? 'bg-white text-[#111215] shadow-xs'
                        : 'text-[#5B616E] hover:text-[#111215]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Paper theme */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#5B616E] whitespace-nowrap">
                종이 톤
              </span>
              <div className="flex items-center p-0.5 bg-[#F5F6F8] border border-[#E2E5EA] rounded-lg">
                {themes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onUpdateSettings({ theme: item.value })}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      settings.theme === item.value
                        ? 'bg-white text-[#111215] shadow-xs'
                        : 'text-[#5B616E] hover:text-[#111215]'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full border ${item.swatch}`}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Album Font Style (고딕 / 명조 / 손글씨) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#5B616E] whitespace-nowrap">
                글꼴
              </span>
              <div
                role="group"
                aria-label="앨범 글꼴 선택"
                className="flex items-center p-0.5 bg-[#F5F6F8] border border-[#E2E5EA] rounded-lg"
              >
                {fontStyles.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={settings.fontStyle === item.value}
                    onClick={() => onUpdateSettings({ fontStyle: item.value })}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      item.previewClass
                    } ${
                      settings.fontStyle === item.value
                        ? 'bg-white text-[#111215] shadow-xs'
                        : 'text-[#5B616E] hover:text-[#111215]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* PDF Options */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#5B616E]">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.includeCover}
                onChange={(e) =>
                  onUpdateSettings({ includeCover: e.target.checked })
                }
                className="w-4 h-4 rounded border-[#CBD2DF] text-[#1D4ED8] focus:ring-[#1D4ED8]"
              />
              <span className="whitespace-nowrap">PDF 첫 쪽 표지 포함</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.includeClosing}
                onChange={(e) =>
                  onUpdateSettings({ includeClosing: e.target.checked })
                }
                className="w-4 h-4 rounded border-[#CBD2DF] text-[#1D4ED8] focus:ring-[#1D4ED8]"
              />
              <span className="whitespace-nowrap">PDF 마지막 쪽 마무리 포함</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.showPageNumbers}
                onChange={(e) =>
                  onUpdateSettings({ showPageNumbers: e.target.checked })
                }
                className="w-4 h-4 rounded border-[#CBD2DF] text-[#1D4ED8] focus:ring-[#1D4ED8]"
              />
              <span className="whitespace-nowrap">쪽 번호 표시</span>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
};
