import {
  AlbumFontStyle,
  AlbumPage,
  AlbumSettings,
  PageTheme,
} from '../types/album';

interface PngThemePalette {
  paper: string;
  outerBorder: string;
  frameBg: string;
  hairline: string;
  ink: string;
  muted: string;
}

const PNG_THEME_PALETTES: Record<PageTheme, PngThemePalette> = {
  'gallery-white': {
    paper: '#FFFFFF',
    outerBorder: '#E2E5EA',
    frameBg: '#F5F6F8',
    hairline: '#E2E5EA',
    ink: '#111215',
    muted: '#5B616E',
  },
  'archival-stone': {
    paper: '#EFF1F4',
    outerBorder: '#D4D8E0',
    frameBg: '#FFFFFF',
    hairline: '#D4D8E0',
    ink: '#111215',
    muted: '#555B66',
  },
  'dark-monograph': {
    paper: '#111215',
    outerBorder: '#2A2D35',
    frameBg: '#191B20',
    hairline: '#2A2D35',
    ink: '#F5F6F8',
    muted: '#9CA3AF',
  },
  'lovely-pink': {
    paper: '#FDF2F4',
    outerBorder: '#F0D4DB',
    frameBg: '#FFFFFF',
    hairline: '#F0D4DB',
    ink: '#2B141C',
    muted: '#6E4A56',
  },
  'calm-beige': {
    paper: '#F4EFE6',
    outerBorder: '#E0D7C6',
    frameBg: '#FAF7F2',
    hairline: '#E0D7C6',
    ink: '#26211B',
    muted: '#665B4E',
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

function getFontSize(
  fontStyle: AlbumFontStyle,
  basePx: number,
  widthScale = 1
): number {
  const bumped = (basePx + 5) * widthScale;
  if (fontStyle === 'handwriting') {
    return Math.round(bumped * 1.24);
  }
  return Math.round(bumped);
}

function getFontWeight(fontStyle: AlbumFontStyle, weight: 400 | 600 | 700): number {
  if (fontStyle === 'handwriting') return 400;
  return weight;
}

async function ensurePngFontsLoaded(fontStyle: AlbumFontStyle): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;

  const loads: Promise<unknown>[] = [
    document.fonts.ready,
    document.fonts.load('500 22px "JetBrains Mono"'),
    document.fonts.load('500 22px "Plus Jakarta Sans"'),
  ];

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
      document.fonts.load('600 44px "Noto Sans KR"'),
      document.fonts.load('700 84px "Noto Sans KR"')
    );
  }

  try {
    await Promise.all(loads);
  } catch {
    // Continue gracefully
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

function drawPreviewPhotoFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  palette: PngThemePalette
) {
  // Match SinglePageAlbum framed mat container (bg + 1px border + inner padding)
  ctx.fillStyle = palette.frameBg;
  ctx.fillRect(boxX, boxY, boxW, boxH);

  ctx.strokeStyle = palette.hairline;
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  if (!img) return;

  const innerPad = Math.round(Math.min(boxW, boxH) * 0.03);
  const availX = boxX + innerPad;
  const availY = boxY + innerPad;
  const availW = boxW - innerPad * 2;
  const availH = boxH - innerPad * 2;

  const imgRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
  const availRatio = availW / Math.max(1, availH);

  let drawW = availW;
  let drawH = availH;

  if (imgRatio > availRatio) {
    drawW = availW;
    drawH = availW / imgRatio;
  } else {
    drawH = availH;
    drawW = availH * imgRatio;
  }

  const drawX = availX + (availW - drawW) / 2;
  const drawY = availY + (availH - drawH) / 2;

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

function renderCoverPreviewPng(
  settings: AlbumSettings,
  photoCount: number,
  canvasWidth: number,
  canvasHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const palette = PNG_THEME_PALETTES[settings.theme];
  const isPortrait = settings.orientation !== 'landscape';
  const widthScale = isPortrait ? Math.min(1, canvasWidth / 1400) : 1;
  const fontStyle = settings.fontStyle || 'myeongjo';
  const albumFont = getFontFamilyString(fontStyle);

  // Sheet background + outer border
  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.strokeStyle = palette.outerBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvasWidth - 2, canvasHeight - 2);

  // Inner bordered cover box matching SinglePageAlbum
  const outerPad = Math.round(canvasWidth * 0.065);
  const boxX = outerPad;
  const boxY = outerPad;
  const boxW = canvasWidth - outerPad * 2;
  const boxH = canvasHeight - outerPad * 2;

  ctx.strokeStyle = palette.hairline;
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  const innerPad = Math.round(canvasWidth * 0.07);
  const contentX = boxX + innerPad;
  const contentW = boxW - innerPad * 2;

  ctx.textBaseline = 'top';
  ctx.fillStyle = palette.muted;
  ctx.font = '500 22px "JetBrains Mono", "Noto Sans KR", sans-serif';
  ctx.fillText('PHOTOGRAPH MONOGRAPH · COVER', contentX, boxY + innerPad);

  // Title
  const titleText = settings.albumTitle.trim() || '나의 포토 앨범';
  ctx.fillStyle = palette.ink;
  const titleSize = getFontSize(fontStyle, isPortrait ? 92 : 84, widthScale);
  const titleLineHeight = Math.round(titleSize * 1.24);
  ctx.font = `${getFontWeight(fontStyle, 700)} ${titleSize}px ${albumFont}`;
  const titleLines = wrapTextLines(ctx, titleText, contentW);

  let cursorY = boxY + innerPad + (isPortrait ? 120 : 88);
  for (const line of titleLines.slice(0, 3)) {
    ctx.fillText(line, contentX, cursorY);
    cursorY += titleLineHeight;
  }

  // Subtitle
  if (settings.albumSubtitle.trim()) {
    cursorY += 28;
    ctx.fillStyle = palette.muted;
    const subSize = getFontSize(fontStyle, 40, widthScale);
    const subLineHeight = Math.round(subSize * 1.45);
    ctx.font = `${getFontWeight(fontStyle, 400)} ${subSize}px ${albumFont}`;
    const subLines = wrapTextLines(ctx, settings.albumSubtitle.trim(), contentW);
    for (const line of subLines.slice(0, 3)) {
      ctx.fillText(line, contentX, cursorY);
      cursorY += subLineHeight;
    }
  }

  // Bottom Author + Date block
  const bottomLimitY = boxY + boxH - innerPad;
  const dividerY = bottomLimitY - 140;

  ctx.strokeStyle = palette.hairline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(contentX, dividerY);
  ctx.lineTo(contentX + contentW, dividerY);
  ctx.stroke();

  let metaY = dividerY + 34;
  if (settings.authorName.trim()) {
    ctx.fillStyle = palette.ink;
    const authorSize = getFontSize(fontStyle, 44);
    ctx.font = `${getFontWeight(fontStyle, 600)} ${authorSize}px ${albumFont}`;
    ctx.fillText(settings.authorName.trim(), contentX, metaY);
    metaY += Math.round(authorSize * 1.38);
  }

  if (settings.coverDate.trim()) {
    ctx.fillStyle = palette.muted;
    ctx.font = '500 32px "JetBrains Mono", "Noto Sans KR", sans-serif';
    ctx.fillText(settings.coverDate.trim(), contentX, metaY);
  }

  ctx.fillStyle = palette.muted;
  ctx.font = '400 22px "JetBrains Mono", "Noto Sans KR", sans-serif';
  const countLabel = `수록 사진 ${photoCount}장`;
  const countW = ctx.measureText(countLabel).width;
  ctx.fillText(countLabel, contentX + contentW - countW, bottomLimitY - 26);

  return canvas;
}

function renderClosingPreviewPng(
  settings: AlbumSettings,
  canvasWidth: number,
  canvasHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const palette = PNG_THEME_PALETTES[settings.theme];
  const isPortrait = settings.orientation !== 'landscape';
  const widthScale = isPortrait ? Math.min(1, canvasWidth / 1400) : 1;
  const fontStyle = settings.fontStyle || 'myeongjo';
  const albumFont = getFontFamilyString(fontStyle);

  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.strokeStyle = palette.outerBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvasWidth - 2, canvasHeight - 2);

  const outerPad = Math.round(canvasWidth * 0.065);
  const boxX = outerPad;
  const boxY = outerPad;
  const boxW = canvasWidth - outerPad * 2;
  const boxH = canvasHeight - outerPad * 2;

  ctx.strokeStyle = palette.hairline;
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  const innerPad = Math.round(canvasWidth * 0.07);
  const contentX = boxX + innerPad;
  const contentW = boxW - innerPad * 2;

  ctx.textBaseline = 'top';
  ctx.fillStyle = palette.muted;
  ctx.font = '500 22px "JetBrains Mono", "Noto Sans KR", sans-serif';
  let cursorY = boxY + innerPad;
  ctx.fillText('EPILOGUE · CLOSING PAGE', contentX, cursorY);
  cursorY += 72;

  // Closing Title
  const closingTitle = settings.closingTitle.trim() || '기록을 마치며';
  ctx.fillStyle = palette.ink;
  const titleSize = getFontSize(fontStyle, isPortrait ? 54 : 50, widthScale);
  const titleLineHeight = Math.round(titleSize * 1.32);
  ctx.font = `${getFontWeight(fontStyle, 600)} ${titleSize}px ${albumFont}`;
  const titleLines = wrapTextLines(ctx, closingTitle, contentW);
  for (const line of titleLines.slice(0, 2)) {
    ctx.fillText(line, contentX, cursorY);
    cursorY += titleLineHeight;
  }

  cursorY += 24;
  ctx.strokeStyle = palette.hairline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(contentX, cursorY);
  ctx.lineTo(contentX + 96, cursorY);
  ctx.stroke();
  cursorY += 48;

  // Closing Message
  const bottomLimitY = boxY + boxH - innerPad;
  const footerDividerY = bottomLimitY - 64;

  if (settings.closingMessage.trim()) {
    ctx.fillStyle = palette.muted;
    const bodySize = getFontSize(fontStyle, 34, widthScale);
    const bodyLineHeight = Math.round(bodySize * 1.75);
    ctx.font = `${getFontWeight(fontStyle, 400)} ${bodySize}px ${albumFont}`;
    const bodyLines = wrapTextLines(ctx, settings.closingMessage.trim(), contentW);
    for (const line of bodyLines) {
      if (cursorY + bodyLineHeight > footerDividerY - 24) break;
      ctx.fillText(line, contentX, cursorY);
      cursorY += bodyLineHeight;
    }
  }

  // Bottom Colophon matching SinglePageAlbum
  ctx.strokeStyle = palette.hairline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(contentX, footerDividerY);
  ctx.lineTo(contentX + contentW, footerDividerY);
  ctx.stroke();

  const footerLeft =
    [settings.albumTitle.trim(), settings.authorName.trim(), settings.coverDate.trim()]
      .filter(Boolean)
      .join(' · ') || '포토 앨범';

  ctx.fillStyle = palette.muted;
  ctx.font = '400 22px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
  ctx.fillText(footerLeft, contentX, footerDividerY + 28);

  const rightLabel = '마지막 쪽';
  ctx.font = '400 22px "JetBrains Mono", "Noto Sans KR", sans-serif';
  const rightW = ctx.measureText(rightLabel).width;
  ctx.fillText(rightLabel, contentX + contentW - rightW, footerDividerY + 28);

  return canvas;
}

async function renderPhotoPreviewPng(
  page: AlbumPage,
  photoIndex: number,
  totalPhotos: number,
  settings: AlbumSettings,
  canvasWidth: number,
  canvasHeight: number
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const palette = PNG_THEME_PALETTES[settings.theme];
  const isPortrait = settings.orientation !== 'landscape';
  const is9x16 = settings.orientation === 'portrait-9-16';
  const is4x5 = settings.orientation === 'portrait-4-5';
  const widthScale = isPortrait ? Math.min(1, canvasWidth / 1400) : 1;
  const fontStyle = settings.fontStyle || 'myeongjo';
  const albumFont = getFontFamilyString(fontStyle);

  // Sheet fill + border
  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.strokeStyle = palette.outerBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvasWidth - 2, canvasHeight - 2);

  const marginX = Math.round(canvasWidth * 0.068);
  const marginY = Math.round(canvasHeight * 0.062);
  const contentW = canvasWidth - marginX * 2;

  // Sheet Top Header (matching SinglePageAlbum)
  ctx.textBaseline = 'top';
  ctx.fillStyle = palette.muted;
  ctx.font = '500 22px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
  ctx.fillText(settings.albumTitle.trim() || '포토 앨범', marginX, marginY);

  if (settings.showPageNumbers) {
    const pageLabel = `${String(photoIndex + 1).padStart(2, '0')} / ${String(
      totalPhotos
    ).padStart(2, '0')}`;
    ctx.font = '500 22px "JetBrains Mono", monospace';
    const labelW = ctx.measureText(pageLabel).width;
    ctx.fillText(pageLabel, canvasWidth - marginX - labelW, marginY);
  }

  const headerLineY = marginY + 38;
  ctx.strokeStyle = palette.hairline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(marginX, headerLineY);
  ctx.lineTo(canvasWidth - marginX, headerLineY);
  ctx.stroke();

  let img: HTMLImageElement | null = null;
  try {
    img = await loadImage(page.imageUrl);
  } catch {
    img = null;
  }

  const bodyTop = headerLineY + 36;
  const bodyBottom = canvasHeight - marginY;
  const bodyH = bodyBottom - bodyTop;

  if (isPortrait) {
    const boxAspect = is9x16 ? 1.0 : is4x5 ? 0.75 : 0.8;
    const maxBodyShare = is9x16 ? 0.54 : is4x5 ? 0.62 : 0.64;
    const photoBoxW = contentW;
    const photoBoxH = Math.min(
      Math.round(photoBoxW * boxAspect),
      Math.round(bodyH * maxBodyShare)
    );

    drawPreviewPhotoFrame(ctx, img, marginX, bodyTop, photoBoxW, photoBoxH, palette);

    let cursorY = bodyTop + photoBoxH + 54;
    if (page.title.trim()) {
      ctx.fillStyle = palette.ink;
      const titleSize = getFontSize(fontStyle, 44, widthScale);
      const titleLineHeight = Math.round(titleSize * 1.32);
      ctx.font = `${getFontWeight(fontStyle, 600)} ${titleSize}px ${albumFont}`;
      const titleLines = wrapTextLines(ctx, page.title.trim(), contentW);
      for (const line of titleLines.slice(0, 2)) {
        ctx.fillText(line, marginX, cursorY);
        cursorY += titleLineHeight;
      }
    }

    if (page.description.trim()) {
      cursorY += 18;
      ctx.fillStyle = palette.muted;
      const descSize = getFontSize(fontStyle, 28, widthScale);
      const descLineHeight = Math.round(descSize * 1.6);
      ctx.font = `${getFontWeight(fontStyle, 400)} ${descSize}px ${albumFont}`;
      const descLines = wrapTextLines(ctx, page.description.trim(), contentW);
      for (const line of descLines) {
        if (cursorY + descLineHeight > bodyBottom) break;
        ctx.fillText(line, marginX, cursorY);
        cursorY += descLineHeight;
      }
    }
  } else {
    // Match SinglePageAlbum 12-column landscape split (7 cols photo, 5 cols caption)
    const gap = Math.round(contentW * 0.045);
    const photoBoxW = Math.round(contentW * 0.58);
    const photoBoxH = Math.min(Math.round(photoBoxW * 0.75), bodyH);
    const textColX = marginX + photoBoxW + gap;
    const textColW = contentW - photoBoxW - gap;

    drawPreviewPhotoFrame(ctx, img, marginX, bodyTop, photoBoxW, photoBoxH, palette);

    let cursorY = bodyTop + 12;
    ctx.fillStyle = palette.muted;
    ctx.font = '500 22px "JetBrains Mono", monospace';
    ctx.fillText(`PLATE ${String(photoIndex + 1).padStart(2, '0')}`, textColX, cursorY);
    cursorY += 52;

    if (page.title.trim()) {
      ctx.fillStyle = palette.ink;
      const titleSize = getFontSize(fontStyle, 42);
      const titleLineHeight = Math.round(titleSize * 1.34);
      ctx.font = `${getFontWeight(fontStyle, 600)} ${titleSize}px ${albumFont}`;
      const titleLines = wrapTextLines(ctx, page.title.trim(), textColW);
      for (const line of titleLines.slice(0, 3)) {
        ctx.fillText(line, textColX, cursorY);
        cursorY += titleLineHeight;
      }
    }

    cursorY += 16;
    ctx.strokeStyle = palette.hairline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(textColX, cursorY);
    ctx.lineTo(textColX + 76, cursorY);
    ctx.stroke();
    cursorY += 34;

    if (page.description.trim()) {
      ctx.fillStyle = palette.muted;
      const descSize = getFontSize(fontStyle, 26);
      const descLineHeight = Math.round(descSize * 1.62);
      ctx.font = `${getFontWeight(fontStyle, 400)} ${descSize}px ${albumFont}`;
      const descLines = wrapTextLines(ctx, page.description.trim(), textColW);
      for (const line of descLines) {
        if (cursorY + descLineHeight > bodyBottom) break;
        ctx.fillText(line, textColX, cursorY);
        cursorY += descLineHeight;
      }
    }
  }

  return canvas;
}

export async function saveCurrentViewAsPng(
  pages: AlbumPage[],
  settings: AlbumSettings,
  bookIndex: number
): Promise<string> {
  if (pages.length === 0) {
    throw new Error('저장할 페이지가 없습니다.');
  }

  const fontStyle = settings.fontStyle || 'myeongjo';
  await ensurePngFontsLoaded(fontStyle);

  let canvasWidth = 1400;
  let canvasHeight = 1980;
  if (settings.orientation === 'portrait-9-16') {
    canvasWidth = 1080;
    canvasHeight = 1920;
  } else if (settings.orientation === 'portrait-4-5') {
    canvasWidth = 1440;
    canvasHeight = 1800;
  } else if (settings.orientation === 'landscape') {
    canvasWidth = 2000;
    canvasHeight = 1414;
  }

  const totalBookPages = pages.length + 2;
  const safeBookIndex = Math.min(Math.max(0, bookIndex), totalBookPages - 1);

  let canvas: HTMLCanvasElement;
  let suffix: string;

  if (safeBookIndex === 0) {
    canvas = renderCoverPreviewPng(settings, pages.length, canvasWidth, canvasHeight);
    suffix = '표지';
  } else if (safeBookIndex === totalBookPages - 1) {
    canvas = renderClosingPreviewPng(settings, canvasWidth, canvasHeight);
    suffix = '마무리';
  } else {
    const photoIdx = safeBookIndex - 1;
    canvas = await renderPhotoPreviewPng(
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
    throw new Error('PNG 이미지 변환에 실패했습니다.');
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
