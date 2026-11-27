import { jsPDF } from 'jspdf';
import {
  AlbumFontStyle,
  AlbumPage,
  AlbumSettings,
  PageOrientation,
  PageTheme,
  PdfExportProgress,
} from '../types/album';

interface ThemePalette {
  paper: string;
  ink: string;
  muted: string;
  frameBg: string;
  hairline: string;
}

const THEME_PALETTES: Record<PageTheme, ThemePalette> = {
  'gallery-white': {
    paper: '#FFFFFF',
    ink: '#111215',
    muted: '#5B616E',
    frameBg: '#F5F6F8',
    hairline: '#E2E5EA',
  },
  'archival-stone': {
    paper: '#EFF1F4',
    ink: '#111215',
    muted: '#555B66',
    frameBg: '#FFFFFF',
    hairline: '#D4D8E0',
  },
  'dark-monograph': {
    paper: '#111215',
    ink: '#F5F6F8',
    muted: '#9CA3AF',
    frameBg: '#191B20',
    hairline: '#2A2D35',
  },
  'lovely-pink': {
    paper: '#FDF2F4',
    ink: '#2B141C',
    muted: '#6E4A56',
    frameBg: '#FFFFFF',
    hairline: '#F0D4DB',
  },
  'calm-beige': {
    paper: '#F4EFE6',
    ink: '#26211B',
    muted: '#665B4E',
    frameBg: '#FAF7F2',
    hairline: '#E0D7C6',
  },
};

function getFontFamilyString(fontStyle: AlbumFontStyle): string {
  switch (fontStyle) {
    case 'gothic':
      return '"Plus Jakarta Sans", "Noto Sans KR", sans-serif';
    case 'handwriting':
      return '"Nanum Pen Script", "Noto Sans KR", cursive';
    case 'myeongjo':
    default:
      return '"Noto Serif KR", Georgia, serif';
  }
}

interface OrientationSpec {
  pdfOrientation: 'portrait' | 'landscape';
  pdfFormat: 'a4' | [number, number];
  canvasWidth: number;
  canvasHeight: number;
}

function getOrientationSpec(orientation: PageOrientation): OrientationSpec {
  switch (orientation) {
    case 'portrait-9-16':
      return {
        pdfOrientation: 'portrait',
        pdfFormat: [180, 320],
        canvasWidth: 1350,
        canvasHeight: 2400,
      };
    case 'portrait-4-5':
      return {
        pdfOrientation: 'portrait',
        pdfFormat: [200, 250],
        canvasWidth: 1600,
        canvasHeight: 2000,
      };
    case 'landscape':
      return {
        pdfOrientation: 'landscape',
        pdfFormat: 'a4',
        canvasWidth: 2339,
        canvasHeight: 1654,
      };
    case 'portrait':
    default:
      return {
        pdfOrientation: 'portrait',
        pdfFormat: 'a4',
        canvasWidth: 1654,
        canvasHeight: 2339,
      };
  }
}

function getFontSize(fontStyle: AlbumFontStyle, basePx: number, widthScale = 1): number {
  const bumped = (basePx + 6) * widthScale;
  if (fontStyle === 'handwriting') {
    return Math.round(bumped * 1.24);
  }
  return Math.round(bumped);
}

function getFontWeight(fontStyle: AlbumFontStyle, weight: 400 | 600 | 700): number {
  // Nanum Pen Script only provides weight 400 cleanly
  if (fontStyle === 'handwriting') return 400;
  return weight;
}

async function ensureAlbumFontsLoaded(fontStyle: AlbumFontStyle): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;

  const loads: Promise<unknown>[] = [document.fonts.ready];
  if (fontStyle === 'handwriting') {
    loads.push(document.fonts.load('400 48px "Nanum Pen Script"'));
  } else if (fontStyle === 'myeongjo') {
    loads.push(
      document.fonts.load('400 32px "Noto Serif KR"'),
      document.fonts.load('600 44px "Noto Serif KR"'),
      document.fonts.load('700 84px "Noto Serif KR"')
    );
  } else {
    loads.push(
      document.fonts.load('400 32px "Noto Sans KR"'),
      document.fonts.load('700 84px "Noto Sans KR"')
    );
  }

  try {
    await Promise.all(loads);
  } catch {
    // Fallback gracefully if a font load rejects
  }
  await document.fonts.ready;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trimEnd();
    if (!trimmed) {
      lines.push('');
      continue;
    }

    let currentLine = '';
    const chars = Array.from(trimmed);

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine.length > 0) {
        const lastSpaceIdx = currentLine.lastIndexOf(' ');
        if (lastSpaceIdx > currentLine.length * 0.55) {
          lines.push(currentLine.slice(0, lastSpaceIdx).trimEnd());
          currentLine = currentLine.slice(lastSpaceIdx + 1) + char;
        } else {
          lines.push(currentLine.trimEnd());
          currentLine = char === ' ' ? '' : char;
        }
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine.trimEnd());
    }
  }

  return lines;
}

function drawContainedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  palette: ThemePalette
) {
  ctx.fillStyle = palette.frameBg;
  ctx.fillRect(boxX, boxY, boxW, boxH);

  const imgRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
  const boxRatio = boxW / Math.max(1, boxH);

  let drawW = boxW;
  let drawH = boxH;

  if (imgRatio > boxRatio) {
    drawW = boxW;
    drawH = boxW / imgRatio;
  } else {
    drawH = boxH;
    drawW = boxH * imgRatio;
  }

  const drawX = boxX + (boxW - drawW) / 2;
  const drawY = boxY + (boxH - drawH) / 2;

  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  ctx.strokeStyle = palette.hairline;
  ctx.lineWidth = 2;
  ctx.strokeRect(drawX, drawY, drawW, drawH);
}

function renderCoverCanvas(
  settings: AlbumSettings,
  pageCount: number,
  canvasWidth: number,
  canvasHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const palette = THEME_PALETTES[settings.theme];
  const isPortrait = settings.orientation !== 'landscape';
  const widthScale = isPortrait ? Math.min(1, canvasWidth / 1654) : 1;
  const fontStyle = settings.fontStyle || 'myeongjo';
  const albumFont = getFontFamilyString(fontStyle);

  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const margin = Math.round(canvasWidth * 0.11);

  ctx.strokeStyle = palette.hairline;
  ctx.lineWidth = 2;
  ctx.strokeRect(
    margin * 0.55,
    margin * 0.55,
    canvasWidth - margin * 1.1,
    canvasHeight - margin * 1.1
  );

  ctx.fillStyle = palette.muted;
  ctx.font = '500 24px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('PHOTOGRAPH MONOGRAPH', margin, margin);

  // Main Album Title
  const titleText = settings.albumTitle.trim() || '나의 포토 앨범';
  ctx.fillStyle = palette.ink;
  const titleSize = getFontSize(fontStyle, isPortrait ? 96 : 88, widthScale);
  const titleLineHeight = Math.round(titleSize * 1.28);
  ctx.font = `${getFontWeight(fontStyle, 700)} ${titleSize}px ${albumFont}`;
  const titleLines = wrapTextLines(ctx, titleText, canvasWidth - margin * 2);

  let cursorY = Math.round(canvasHeight * (isPortrait ? 0.28 : 0.25));
  for (const line of titleLines.slice(0, 3)) {
    ctx.fillText(line, margin, cursorY);
    cursorY += titleLineHeight;
  }

  // Subtitle
  if (settings.albumSubtitle.trim()) {
    cursorY += 20;
    ctx.fillStyle = palette.muted;
    const subSize = getFontSize(fontStyle, 42, widthScale);
    const subLineHeight = Math.round(subSize * 1.38);
    ctx.font = `${getFontWeight(fontStyle, 400)} ${subSize}px ${albumFont}`;
    const subLines = wrapTextLines(
      ctx,
      settings.albumSubtitle.trim(),
      canvasWidth - margin * 2
    );
    for (const line of subLines.slice(0, 3)) {
      ctx.fillText(line, margin, cursorY);
      cursorY += subLineHeight;
    }
  }

  // Prominent Author Name & Date block
  const infoBottomY = canvasHeight - margin - 32;
  const dividerY = infoBottomY - 190;

  ctx.strokeStyle = palette.hairline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, dividerY);
  ctx.lineTo(canvasWidth - margin, dividerY);
  ctx.stroke();

  let metaY = dividerY + 40;
  const authorText = settings.authorName.trim();
  const dateText = settings.coverDate.trim();

  if (authorText) {
    ctx.fillStyle = palette.ink;
    const authorSize = getFontSize(fontStyle, 46);
    ctx.font = `${getFontWeight(fontStyle, 600)} ${authorSize}px ${albumFont}`;
    ctx.fillText(authorText, margin, metaY);
    metaY += Math.round(authorSize * 1.42);
  }

  if (dateText) {
    ctx.fillStyle = palette.muted;
    ctx.font = '500 34px "JetBrains Mono", "Noto Sans KR", sans-serif';
    ctx.fillText(dateText, margin, metaY);
  }

  ctx.fillStyle = palette.muted;
  ctx.font = '400 24px "JetBrains Mono", "Noto Sans KR", sans-serif';
  const countLabel = `수록 사진 ${pageCount}장`;
  const countW = ctx.measureText(countLabel).width;
  ctx.fillText(countLabel, canvasWidth - margin - countW, infoBottomY);

  return canvas;
}

function renderClosingCanvas(
  settings: AlbumSettings,
  canvasWidth: number,
  canvasHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const palette = THEME_PALETTES[settings.theme];
  const isPortrait = settings.orientation !== 'landscape';
  const widthScale = isPortrait ? Math.min(1, canvasWidth / 1654) : 1;
  const fontStyle = settings.fontStyle || 'myeongjo';
  const albumFont = getFontFamilyString(fontStyle);

  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const margin = Math.round(canvasWidth * 0.12);

  ctx.strokeStyle = palette.hairline;
  ctx.lineWidth = 2;
  ctx.strokeRect(
    margin * 0.5,
    margin * 0.5,
    canvasWidth - margin,
    canvasHeight - margin
  );

  ctx.textBaseline = 'top';

  const closingTitle = settings.closingTitle.trim() || '기록을 마치며';
  ctx.fillStyle = palette.ink;
  const titleSize = getFontSize(fontStyle, 54, widthScale);
  const titleLineHeight = Math.round(titleSize * 1.35);
  ctx.font = `${getFontWeight(fontStyle, 600)} ${titleSize}px ${albumFont}`;
  let cursorY = Math.round(canvasHeight * (isPortrait ? 0.28 : 0.24));
  const titleLines = wrapTextLines(ctx, closingTitle, canvasWidth - margin * 2);
  for (const line of titleLines.slice(0, 2)) {
    ctx.fillText(line, margin, cursorY);
    cursorY += titleLineHeight;
  }

  cursorY += 16;
  ctx.strokeStyle = palette.hairline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, cursorY);
  ctx.lineTo(margin + 88, cursorY);
  ctx.stroke();
  cursorY += 44;

  const closingBody = settings.closingMessage.trim();
  if (closingBody) {
    ctx.fillStyle = palette.muted;
    const bodySize = getFontSize(fontStyle, 34, widthScale);
    const bodyLineHeight = Math.round(bodySize * 1.56);
    ctx.font = `${getFontWeight(fontStyle, 400)} ${bodySize}px ${albumFont}`;
    const bodyLines = wrapTextLines(ctx, closingBody, canvasWidth - margin * 2);
    const maxBottom = canvasHeight - margin - 110;
    for (const line of bodyLines) {
      if (cursorY + bodyLineHeight > maxBottom) break;
      ctx.fillText(line, margin, cursorY);
      cursorY += bodyLineHeight;
    }
  }

  const footerParts = [
    settings.albumTitle.trim(),
    settings.authorName.trim(),
    settings.coverDate.trim(),
  ].filter(Boolean);

  if (footerParts.length > 0) {
    ctx.fillStyle = palette.muted;
    ctx.font = '400 24px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
    ctx.fillText(footerParts.join('  ·  '), margin, canvasHeight - margin - 24);
  }

  return canvas;
}

async function renderPhotoPageCanvas(
  page: AlbumPage,
  pageIndex: number,
  totalPages: number,
  settings: AlbumSettings,
  canvasWidth: number,
  canvasHeight: number
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const palette = THEME_PALETTES[settings.theme];
  const fontStyle = settings.fontStyle || 'myeongjo';
  const albumFont = getFontFamilyString(fontStyle);

  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const marginX = Math.round(canvasWidth * 0.085);
  const marginTop = Math.round(canvasHeight * 0.065);
  const marginBottom = Math.round(canvasHeight * 0.065);
  const headerHeight = 52;

  ctx.textBaseline = 'top';
  ctx.fillStyle = palette.muted;
  ctx.font = '500 22px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
  const headerTitle = settings.albumTitle.trim() || '포토 앨범';
  ctx.fillText(headerTitle, marginX, marginTop);

  if (settings.showPageNumbers) {
    const pageLabel = `${String(pageIndex + 1).padStart(2, '0')} / ${String(
      totalPages
    ).padStart(2, '0')}`;
    ctx.font = '500 22px "JetBrains Mono", monospace';
    const labelWidth = ctx.measureText(pageLabel).width;
    ctx.fillText(pageLabel, canvasWidth - marginX - labelWidth, marginTop);
  }

  ctx.strokeStyle = palette.hairline;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(marginX, marginTop + 36);
  ctx.lineTo(canvasWidth - marginX, marginTop + 36);
  ctx.stroke();

  let img: HTMLImageElement | null = null;
  try {
    img = await loadImage(page.imageUrl);
  } catch {
    img = null;
  }

  const contentTop = marginTop + headerHeight + 24;
  const contentBottom = canvasHeight - marginBottom;
  const contentWidth = canvasWidth - marginX * 2;
  const contentHeight = contentBottom - contentTop;

  if (settings.orientation !== 'landscape') {
    const is9x16 = settings.orientation === 'portrait-9-16';
    const is4x5 = settings.orientation === 'portrait-4-5';
    const widthScale = Math.min(1, canvasWidth / 1654);
    const photoRatioFactor = is9x16 ? 0.55 : is4x5 ? 0.63 : 0.67;
    const photoBoxH = Math.round(contentHeight * photoRatioFactor);
    const photoBoxW = contentWidth;

    if (img) {
      drawContainedImage(ctx, img, marginX, contentTop, photoBoxW, photoBoxH, palette);
    } else {
      ctx.fillStyle = palette.frameBg;
      ctx.fillRect(marginX, contentTop, photoBoxW, photoBoxH);
    }

    const textStartY = contentTop + photoBoxH + 56;
    const titleText = page.title.trim() || '제목 없는 사진';
    ctx.fillStyle = palette.ink;
    const titleSize = getFontSize(fontStyle, 44, widthScale);
    const titleLineHeight = Math.round(titleSize * 1.34);
    ctx.font = `${getFontWeight(fontStyle, 600)} ${titleSize}px ${albumFont}`;
    const titleLines = wrapTextLines(ctx, titleText, contentWidth);

    let cursorY = textStartY;
    for (const line of titleLines.slice(0, 2)) {
      ctx.fillText(line, marginX, cursorY);
      cursorY += titleLineHeight;
    }

    if (page.description.trim()) {
      cursorY += 16;
      ctx.fillStyle = palette.muted;
      const descSize = getFontSize(fontStyle, 28, widthScale);
      const descLineHeight = Math.round(descSize * 1.54);
      ctx.font = `${getFontWeight(fontStyle, 400)} ${descSize}px ${albumFont}`;
      const descLines = wrapTextLines(ctx, page.description.trim(), contentWidth);
      for (const line of descLines) {
        if (cursorY + descLineHeight > contentBottom) break;
        ctx.fillText(line, marginX, cursorY);
        cursorY += descLineHeight;
      }
    }
  } else {
    const gap = Math.round(contentWidth * 0.045);
    const photoBoxW = Math.round(contentWidth * 0.61);
    const photoBoxH = contentHeight;
    const textColX = marginX + photoBoxW + gap;
    const textColW = contentWidth - photoBoxW - gap;

    if (img) {
      drawContainedImage(ctx, img, marginX, contentTop, photoBoxW, photoBoxH, palette);
    } else {
      ctx.fillStyle = palette.frameBg;
      ctx.fillRect(marginX, contentTop, photoBoxW, photoBoxH);
    }

    let cursorY = contentTop + 28;

    ctx.fillStyle = palette.muted;
    ctx.font = '500 22px "JetBrains Mono", monospace';
    ctx.fillText(`PLATE ${String(pageIndex + 1).padStart(2, '0')}`, textColX, cursorY);
    cursorY += 48;

    const titleText = page.title.trim() || '제목 없는 사진';
    ctx.fillStyle = palette.ink;
    const titleSize = getFontSize(fontStyle, 42);
    const titleLineHeight = Math.round(titleSize * 1.36);
    ctx.font = `${getFontWeight(fontStyle, 600)} ${titleSize}px ${albumFont}`;
    const titleLines = wrapTextLines(ctx, titleText, textColW);
    for (const line of titleLines.slice(0, 3)) {
      ctx.fillText(line, textColX, cursorY);
      cursorY += titleLineHeight;
    }

    cursorY += 12;
    ctx.strokeStyle = palette.hairline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(textColX, cursorY);
    ctx.lineTo(textColX + 64, cursorY);
    ctx.stroke();
    cursorY += 32;

    if (page.description.trim()) {
      ctx.fillStyle = palette.muted;
      const descSize = getFontSize(fontStyle, 26);
      const descLineHeight = Math.round(descSize * 1.58);
      ctx.font = `${getFontWeight(fontStyle, 400)} ${descSize}px ${albumFont}`;
      const descLines = wrapTextLines(ctx, page.description.trim(), textColW);
      for (const line of descLines) {
        if (cursorY + descLineHeight > contentBottom) break;
        ctx.fillText(line, textColX, cursorY);
        cursorY += descLineHeight;
      }
    }
  }

  return canvas;
}

export async function exportCurrentPageToPng(
  pages: AlbumPage[],
  settings: AlbumSettings,
  bookIndex: number
): Promise<string> {
  if (pages.length === 0) {
    throw new Error('No pages to export');
  }

  await ensureAlbumFontsLoaded(settings.fontStyle || 'myeongjo');

  const isPortrait = settings.orientation === 'portrait';
  const canvasWidth = isPortrait ? 1654 : 2339;
  const canvasHeight = isPortrait ? 2339 : 1654;

  const totalBookPages = pages.length + 2;
  const safeBookIndex = Math.min(Math.max(0, bookIndex), totalBookPages - 1);

  let canvas: HTMLCanvasElement;
  let suffix: string;

  if (safeBookIndex === 0) {
    canvas = renderCoverCanvas(settings, pages.length, canvasWidth, canvasHeight);
    suffix = '표지';
  } else if (safeBookIndex === totalBookPages - 1) {
    canvas = renderClosingCanvas(settings, canvasWidth, canvasHeight);
    suffix = '마무리';
  } else {
    const photoIdx = safeBookIndex - 1;
    canvas = await renderPhotoPageCanvas(
      pages[photoIdx],
      photoIdx,
      pages.length,
      settings,
      canvasWidth,
      canvasHeight
    );
    suffix = `${String(photoIdx + 1).padStart(2, '0')}쪽`;
  }

  const safeTitle = (settings.albumTitle.trim() || '포토_앨범')
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 50);
  const fileName = `${safeTitle}_${suffix}.png`;

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png')
  );

  if (!blob) {
    throw new Error('Failed to encode PNG');
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return suffix;
}

export async function exportAlbumToPdf(
  pages: AlbumPage[],
  settings: AlbumSettings,
  onProgress?: (progress: PdfExportProgress) => void
): Promise<void> {
  if (pages.length === 0) return;

  const totalSteps =
    pages.length +
    (settings.includeCover ? 1 : 0) +
    (settings.includeClosing ? 1 : 0);
  onProgress?.({ current: 0, total: totalSteps, stage: 'preparing' });

  await ensureAlbumFontsLoaded(settings.fontStyle || 'myeongjo');

  const spec = getOrientationSpec(settings.orientation);
  const { canvasWidth, canvasHeight, pdfOrientation, pdfFormat } = spec;

  const pdf = new jsPDF({
    orientation: pdfOrientation,
    unit: 'mm',
    format: pdfFormat,
    compress: true,
  });

  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();

  let stepCount = 0;
  let isFirstPdfPage = true;

  if (settings.includeCover) {
    const coverCanvas = renderCoverCanvas(
      settings,
      pages.length,
      canvasWidth,
      canvasHeight
    );
    const coverData = coverCanvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(coverData, 'JPEG', 0, 0, pageWidthMm, pageHeightMm, undefined, 'FAST');
    isFirstPdfPage = false;
    stepCount += 1;
    onProgress?.({ current: stepCount, total: totalSteps, stage: 'rendering' });
  }

  for (let i = 0; i < pages.length; i++) {
    if (!isFirstPdfPage) {
      pdf.addPage(pdfFormat, pdfOrientation);
    }
    isFirstPdfPage = false;

    const pageCanvas = await renderPhotoPageCanvas(
      pages[i],
      i,
      pages.length,
      settings,
      canvasWidth,
      canvasHeight
    );
    const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthMm, pageHeightMm, undefined, 'FAST');

    stepCount += 1;
    onProgress?.({ current: stepCount, total: totalSteps, stage: 'rendering' });
    await new Promise((resolve) => setTimeout(resolve, 16));
  }

  if (settings.includeClosing) {
    if (!isFirstPdfPage) {
      pdf.addPage(pdfFormat, pdfOrientation);
    }
    isFirstPdfPage = false;

    const closingCanvas = renderClosingCanvas(
      settings,
      canvasWidth,
      canvasHeight
    );
    const closingData = closingCanvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(closingData, 'JPEG', 0, 0, pageWidthMm, pageHeightMm, undefined, 'FAST');
    stepCount += 1;
    onProgress?.({ current: stepCount, total: totalSteps, stage: 'rendering' });
  }

  onProgress?.({ current: totalSteps, total: totalSteps, stage: 'saving' });

  const safeTitle = (settings.albumTitle.trim() || '포토_앨범')
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 60);

  pdf.save(`${safeTitle}.pdf`);
}
