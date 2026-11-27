import React, { useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Feather,
  ImagePlus,
  Trash2,
} from 'lucide-react';
import { AlbumPage, AlbumSettings } from '../types/album';
import { ResilientImage } from './ResilientImage';

interface OverviewGridProps {
  pages: AlbumPage[];
  settings: AlbumSettings;
  currentIndex: number;
  onOpenBookPage: (bookIndex: number) => void;
  onUpdatePage: (id: string, patch: Partial<AlbumPage>) => void;
  onMovePage: (index: number, delta: -1 | 1) => void;
  onDeletePage: (id: string) => void;
  onAppendFiles: (files: FileList | File[]) => void;
}

export const OverviewGrid: React.FC<OverviewGridProps> = ({
  pages,
  settings,
  currentIndex,
  onOpenBookPage,
  onUpdatePage,
  onMovePage,
  onDeletePage,
  onAppendFiles,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const closingBookIndex = pages.length + 1;
  const fontStyle = settings.fontStyle || 'myeongjo';
  const albumFontClass =
    fontStyle === 'gothic'
      ? 'font-gothic'
      : fontStyle === 'handwriting'
      ? 'font-handwriting'
      : 'font-myeongjo';

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-editorial text-xl font-semibold text-[#111215]">
            전체 페이지 구성 및 순서 편집
          </h2>
          <p className="text-sm text-[#5B616E] mt-1">
            표지, 사진 페이지, 마무리 페이지를 한눈에 보고 클릭해 바로 편집할
            수 있습니다.
          </p>
        </div>
        <span className="font-tabular text-xs text-[#5B616E]">
          {pages.length > 0
            ? `표지 · 사진 ${pages.length}장 · 마무리 (총 ${pages.length + 2}쪽)`
            : '총 0쪽'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* First Page: Cover Card */}
        {pages.length > 0 && (
          <article
            className={`bg-white border rounded-xl overflow-hidden flex flex-col transition-colors ${
              currentIndex === 0 ? 'border-[#1D4ED8]' : 'border-[#E2E5EA]'
            }`}
          >
            <button
              type="button"
              onClick={() => onOpenBookPage(0)}
              className="p-6 flex-1 flex flex-col justify-between text-left bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-[#5B616E] mb-4">
                  <span className="font-tabular font-medium text-[#111215]">
                    첫 쪽 · 표지
                  </span>
                  <BookMarked className="w-4 h-4" aria-hidden="true" />
                </div>
                <h3 className={`text-xl font-bold text-[#111215] line-clamp-2 mb-2 ${albumFontClass}`}>
                  {settings.albumTitle.trim() || '나의 포토 앨범'}
                </h3>
                {settings.albumSubtitle.trim() && (
                  <p className={`text-xs text-[#5B616E] line-clamp-2 mb-4 ${albumFontClass}`}>
                    {settings.albumSubtitle}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-[#E2E5EA] flex items-center justify-between text-xs text-[#5B616E]">
                <span className="truncate">
                  {[settings.authorName.trim(), settings.coverDate.trim()]
                    .filter(Boolean)
                    .join(' · ') || '이름 · 날짜 입력'}
                </span>
                <span className="text-[#1D4ED8] font-medium shrink-0 ml-2">
                  표지 편집
                </span>
              </div>
            </button>
          </article>
        )}

        {/* Photo Pages */}
        {pages.map((page, idx) => {
          const bookIdx = idx + 1;
          const isCurrent = bookIdx === currentIndex;
          return (
            <article
              key={page.id}
              className={`bg-white border rounded-xl overflow-hidden flex flex-col transition-colors ${
                isCurrent ? 'border-[#1D4ED8]' : 'border-[#E2E5EA]'
              }`}
            >
              {/* Thumbnail */}
              <button
                type="button"
                onClick={() => onOpenBookPage(bookIdx)}
                className="relative w-full aspect-[4/3] bg-[#F5F6F8] overflow-hidden text-left cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
              >
                <ResilientImage
                  src={page.imageUrl}
                  alt={page.title || page.fileName}
                  fallbackTitle={page.title || page.fileName}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                />
              </button>

              {/* Content */}
              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#5B616E]">
                    <span className="font-tabular font-medium text-[#111215]">
                      사진 {String(idx + 1).padStart(2, '0')}쪽
                    </span>
                    <span className="truncate max-w-[160px]">
                      {page.fileName}
                    </span>
                  </div>

                  <div>
                    <label
                      htmlFor={`grid-title-${page.id}`}
                      className="sr-only"
                    >
                      사진 제목
                    </label>
                    <input
                      id={`grid-title-${page.id}`}
                      type="text"
                      value={page.title}
                      onChange={(e) =>
                        onUpdatePage(page.id, { title: e.target.value })
                      }
                      placeholder="사진 제목 입력"
                      className={`w-full text-base font-semibold text-[#111215] bg-transparent border border-transparent hover:border-[#E2E5EA] focus:border-[#1D4ED8] focus:bg-[#F9FAFB] rounded px-2 py-1 -mx-2 outline-none transition-colors ${albumFontClass}`}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`grid-desc-${page.id}`}
                      className="sr-only"
                    >
                      사진 설명
                    </label>
                    <textarea
                      id={`grid-desc-${page.id}`}
                      rows={2}
                      value={page.description}
                      onChange={(e) =>
                        onUpdatePage(page.id, { description: e.target.value })
                      }
                      placeholder="설명 추가..."
                      className={`w-full text-xs text-[#5B616E] leading-relaxed bg-transparent border border-transparent hover:border-[#E2E5EA] focus:border-[#1D4ED8] focus:bg-[#F9FAFB] rounded px-2 py-1 -mx-2 outline-none resize-none transition-colors ${albumFontClass}`}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-[#F0F1F4] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onMovePage(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`${idx + 1}페이지를 앞으로 이동`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded border border-[#E2E5EA] text-[#111215] hover:bg-[#F5F6F8] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMovePage(idx, 1)}
                      disabled={idx === pages.length - 1}
                      aria-label={`${idx + 1}페이지를 뒤로 이동`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded border border-[#E2E5EA] text-[#111215] hover:bg-[#F5F6F8] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenBookPage(bookIdx)}
                      className="text-xs font-medium text-[#1D4ED8] hover:underline px-2 py-1 cursor-pointer"
                    >
                      이 쪽 열기
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePage(page.id)}
                      aria-label={`${idx + 1}페이지 삭제`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded text-[#5B616E] hover:text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        {/* Last Page: Closing Card */}
        {pages.length > 0 && (
          <article
            className={`bg-white border rounded-xl overflow-hidden flex flex-col transition-colors ${
              currentIndex === closingBookIndex
                ? 'border-[#1D4ED8]'
                : 'border-[#E2E5EA]'
            }`}
          >
            <button
              type="button"
              onClick={() => onOpenBookPage(closingBookIndex)}
              className="p-6 flex-1 flex flex-col justify-between text-left bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-[#5B616E] mb-4">
                  <span className="font-tabular font-medium text-[#111215]">
                    마지막 쪽 · 마무리
                  </span>
                  <Feather className="w-4 h-4" aria-hidden="true" />
                </div>
                <h3 className={`text-lg font-semibold text-[#111215] mb-2 ${albumFontClass}`}>
                  {settings.closingTitle.trim() || '기록을 마치며'}
                </h3>
                <p className={`text-xs text-[#5B616E] line-clamp-4 leading-relaxed ${albumFontClass}`}>
                  {settings.closingMessage.trim() ||
                    '마지막 쪽에 남길 마무리 문구를 작성해 보세요.'}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E2E5EA] flex items-center justify-between text-xs text-[#5B616E]">
                <span>에필로그 문구</span>
                <span className="text-[#1D4ED8] font-medium">마무리 편집</span>
              </div>
            </button>
          </article>
        )}

        {/* Add More Tile */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              const files = Array.from(e.target.files);
              e.target.value = '';
              onAppendFiles(files);
            }
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="min-h-[280px] border border-dashed border-[#CBD2DF] hover:border-[#111215] bg-white/60 hover:bg-white rounded-xl flex flex-col items-center justify-center gap-2.5 text-sm font-medium text-[#5B616E] hover:text-[#111215] transition-colors cursor-pointer"
        >
          <ImagePlus className="w-6 h-6" aria-hidden="true" />
          <span>사진 여러 장 추가하기</span>
        </button>
      </div>
    </div>
  );
};
