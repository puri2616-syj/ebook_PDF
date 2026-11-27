import React from 'react';
import { Download, Loader2 } from 'lucide-react';
import { PdfExportProgress, ViewMode } from '../types/album';

interface TopBarProps {
  viewMode: ViewMode;
  onSelectView: (mode: ViewMode) => void;
  onScrollToSettings: () => void;
  onScrollToGuide: () => void;
  onExportPdf: () => void;
  canExport: boolean;
  exportProgress: PdfExportProgress | null;
}

export const TopBar: React.FC<TopBarProps> = ({
  viewMode,
  onSelectView,
  onScrollToSettings,
  onScrollToGuide,
  onExportPdf,
  canExport,
  exportProgress,
}) => {
  const isExporting = exportProgress !== null;

  return (
    <header className="sticky top-0 z-30 bg-[#F5F6F8]/95 backdrop-blur-sm border-b border-[#E2E5EA]">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark (single text element) */}
        <a
          href="#album-stage"
          onClick={(e) => {
            e.preventDefault();
            onSelectView('single');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-editorial text-xl font-bold tracking-tight text-[#111215] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8] rounded"
        >
          모노그래프
        </a>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav
          aria-label="주요 메뉴"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5B616E]"
        >
          <button
            type="button"
            onClick={() => onSelectView('single')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8] ${
              viewMode === 'single'
                ? 'text-[#111215] border-[#111215]'
                : 'border-transparent hover:text-[#111215]'
            }`}
          >
            앨범 보기
          </button>
          <button
            type="button"
            onClick={() => onSelectView('grid')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8] ${
              viewMode === 'grid'
                ? 'text-[#111215] border-[#111215]'
                : 'border-transparent hover:text-[#111215]'
            }`}
          >
            전체 페이지
          </button>
          <button
            type="button"
            onClick={onScrollToSettings}
            className="whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 border-transparent hover:text-[#111215] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8]"
          >
            판형 설정
          </button>
          <button
            type="button"
            onClick={onScrollToGuide}
            className="whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 border-transparent hover:text-[#111215] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8]"
          >
            사용 안내
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onExportPdf}
            disabled={!canExport || isExporting}
            className="inline-flex items-center justify-center gap-2 min-h-[40px] px-5 py-2 text-sm font-medium text-white bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:bg-[#CBD2DF] disabled:text-[#6B7280] disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] cursor-pointer"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span className="font-tabular">
                  PDF 생성 ({exportProgress.current}/{exportProgress.total})
                </span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>PDF 저장</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
