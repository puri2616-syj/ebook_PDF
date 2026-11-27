import { AlbumPage } from '../types/album';

function loadImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || 1200,
        height: img.naturalHeight || 900,
      });
    };
    img.onerror = () => {
      resolve({ width: 1200, height: 900 });
    };
    img.src = url;
  });
}

function formatDefaultTitle(fileName: string, index: number): string {
  const stem = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
  if (!stem || /^(img|dsc|pxl|photo|image|screenshot)[ _-]*\d+$/i.test(stem)) {
    return `기록 ${index + 1}`;
  }
  return stem;
}

export async function filesToAlbumPages(
  fileList: FileList | File[],
  startIndex = 0
): Promise<AlbumPage[]> {
  const files = Array.from(fileList).filter((file) =>
    file.type.startsWith('image/')
  );

  const pages = await Promise.all(
    files.map(async (file, idx) => {
      const imageUrl = URL.createObjectURL(file);
      const { width, height } = await loadImageDimensions(imageUrl);
      const uniqueId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `page-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`;

      return {
        id: uniqueId,
        imageUrl,
        imageBlob: file,
        fileName: file.name,
        title: formatDefaultTitle(file.name, startIndex + idx),
        description: '',
        width,
        height,
        isSample: false,
      } satisfies AlbumPage;
    })
  );

  return pages;
}

export function revokePageUrl(page: AlbumPage): void {
  if (!page.isSample && page.imageUrl.startsWith('blob:')) {
    URL.revokeObjectURL(page.imageUrl);
  }
}
