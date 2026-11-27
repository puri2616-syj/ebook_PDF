import React, { useRef } from 'react';
import { BookMarked, Feather, Plus } from 'lucide-react';
import { AlbumPage } from '../types/album';
import { ResilientImage } from './ResilientImage';

interface FilmstripBarProps {
  pages: AlbumPage[];
  albumTitle: string;
  closingTitle: string;
  currentIndex: number;
  onSelectPage: (bookIndex: number) => void;
  onAppendFiles: (files: FileList | File[]) => void;
}

export const FilmstripBar: React.FC<FilmstripBarProps> = ({
  pages,
  albumTitle,
  closingTitle,
  currentIndex,
  onSelectPage,
  onAppendFiles,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  if (pages.length === 0) return null;

  const closingBookIndex = pages.length + 1;

  return (
    <div className="max-w-[1280px] mx-auto px-6 pb-8">
      <div className="bg-white border border-[#E2E5EA] rounded-xl p-3">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-thin pb-1">
          {/* First Page: Cover Tile */}
          <button
            type="button"
            onClick={() => onSelectPage(0)}
            aria-current={currentIndex === 0 ? 'page' : undefined}
            className={`group shrink-0 w-28 text-left rounded-lg p-1.5 border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
              currentIndex === 0
                ? 'border-[#1D4ED8] bg-[#EFF6FF]/60'
                : 'border-transparent hover:border-[#E2E5EA] hover:bg-[#F5F6F8]'
            }`}
          >
            <div className="w-full aspect-[4/3] rounded bg-[#F5F6F8] border border-[#E2E5EA] mb-1.5 flex flex-col items-center justify-center px-2 text-center">
              <BookMarked
                className="w-4 h-4 text-[#5B616E] mb-1"
                aria-hidden="true"
              />
              <span className="font-editorial text-[10px] font-semibold text-[#111215] line-clamp-1">
                {albumTitle.trim() || '표지'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] leading-tight">
              <span
                className={`font-tabular shrink-0 ${
                  currentIndex === 0
                    ? 'text-[#1D4ED8] font-semibold'
                    : 'text-[#6E7685]'
                }`}
              >
                표지
              </span>
              <span className="truncate text-[#111215] font-medium">
                첫 쪽
              </span>
            </div>
          </button>

          {/* Photo Pages */}
          {pages.map((page, idx) => {
            const bookIdx = idx + 1;
            const isActive = bookIdx === currentIndex;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => onSelectPage(bookIdx)}
                aria-current={isActive ? 'page' : undefined}
                className={`group shrink-0 w-28 text-left rounded-lg p-1.5 border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
                  isActive
                    ? 'border-[#1D4ED8] bg-[#EFF6FF]/60'
                    : 'border-transparent hover:border-[#E2E5EA] hover:bg-[#F5F6F8]'
                }`}
              >
                <div className="w-full aspect-[4/3] rounded overflow-hidden bg-[#F5F6F8] mb-1.5">
                  <ResilientImage
                    src={page.imageUrl}
                    alt={page.title || page.fileName}
                    fallbackTitle={page.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] leading-tight">
                  <span
                    className={`font-tabular shrink-0 ${
                      isActive ? 'text-[#1D4ED8] font-semibold' : 'text-[#6E7685]'
                    }`}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="truncate text-[#111215] font-medium">
                    {page.title.trim() || '제목 없음'}
                  </span>
                </div>
              </button>
            );
          })}

          {/* Last Page: Closing Tile */}
          <button
            type="button"
            onClick={() => onSelectPage(closingBookIndex)}
            aria-current={currentIndex === closingBookIndex ? 'page' : undefined}
            className={`group shrink-0 w-28 text-left rounded-lg p-1.5 border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
              currentIndex === closingBookIndex
                ? 'border-[#1D4ED8] bg-[#EFF6FF]/60'
                : 'border-transparent hover:border-[#E2E5EA] hover:bg-[#F5F6F8]'
            }`}
          >
            <div className="w-full aspect-[4/3] rounded bg-[#F5F6F8] border border-[#E2E5EA] mb-1.5 flex flex-col items-center justify-center px-2 text-center">
              <Feather
                className="w-4 h-4 text-[#5B616E] mb-1"
                aria-hidden="true"
              />
              <span className="font-editorial text-[10px] font-semibold text-[#111215] line-clamp-1">
                {closingTitle.trim() || '마무리'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] leading-tight">
              <span
                className={`font-tabular shrink-0 ${
                  currentIndex === closingBookIndex
                    ? 'text-[#1D4ED8] font-semibold'
                    : 'text-[#6E7685]'
                }`}
              >
                끝
              </span>
              <span className="truncate text-[#111215] font-medium">
                마무리
              </span>
            </div>
          </button>

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
            className="shrink-0 w-24 h-[88px] rounded-lg border border-dashed border-[#CBD2DF] hover:border-[#111215] hover:bg-[#F5F6F8] flex flex-col items-center justify-center gap-1 text-xs text-[#5B616E] hover:text-[#111215] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>사진 추가</span>
          </button>
        </div>
      </div>
    </div>
  );
};
