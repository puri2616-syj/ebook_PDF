export type PageOrientation =
  | 'portrait'
  | 'portrait-9-16'
  | 'portrait-4-5'
  | 'landscape';

export type PageTheme =
  | 'gallery-white'
  | 'archival-stone'
  | 'dark-monograph'
  | 'lovely-pink'
  | 'calm-beige';

export type AlbumFontStyle = 'gothic' | 'myeongjo' | 'handwriting';

export type ViewMode = 'single' | 'grid';

export interface AlbumPage {
  id: string;
  imageUrl: string;
  imageBlob?: Blob;
  fileName: string;
  title: string;
  description: string;
  width?: number;
  height?: number;
  isSample?: boolean;
}

export interface AlbumSettings {
  albumTitle: string;
  albumSubtitle: string;
  authorName: string;
  coverDate: string;
  closingTitle: string;
  closingMessage: string;
  includeCover: boolean;
  includeClosing: boolean;
  orientation: PageOrientation;
  theme: PageTheme;
  fontStyle: AlbumFontStyle;
  showPageNumbers: boolean;
  flipEffect: boolean;
  soundEnabled: boolean;
}

export interface PdfExportProgress {
  current: number;
  total: number;
  stage: 'preparing' | 'rendering' | 'saving';
}
