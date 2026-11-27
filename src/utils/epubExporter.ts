import JSZip from 'jszip';
import {
  AlbumFontStyle,
  AlbumPage,
  AlbumSettings,
  PageTheme,
  PdfExportProgress,
} from '../types/album';

interface EpubPalette {
  paper: string;
  ink: string;
  muted: string;
  frameBg: string;
  hairline: string;
}

const EPUB_PALETTES: Record<PageTheme, EpubPalette> = {
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function paragraphsToHtml(text: string): string {
  const lines = text.split(/\r?\n/);
  return lines
    .map((line) => {
      const trimmed = line.trim();
      return trimmed ? `<p>${escapeXml(trimmed)}</p>` : '<p class="spacer">&#160;</p>';
    })
    .join('\n      ');
}

function getCssFontFamily(fontStyle: AlbumFontStyle): string {
  switch (fontStyle) {
    case 'gothic':
      return '"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';
    case 'handwriting':
      return '"Nanum Pen Script", "Noto Sans KR", cursive, sans-serif';
    case 'myeongjo':
    default:
      return '"Noto Serif KR", "Batang", Georgia, serif';
  }
}

function getCanvasFontFamily(fontStyle: AlbumFontStyle): string {
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

async function encodeImageAsJpegBytes(imageUrl: string): Promise<Uint8Array> {
  const img = await loadImage(imageUrl);
  const maxDim = 1800;
  let w = img.naturalWidth || 1200;
  let h = img.naturalHeight || 900;

  if (w > maxDim || h > maxDim) {
    if (w >= h) {
      h = Math.round((h / w) * maxDim);
      w = maxDim;
    } else {
      w = Math.round((w / h) * maxDim);
      h = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
  );
  if (!blob) throw new Error('JPEG encoding failed');
  return new Uint8Array(await blob.arrayBuffer());
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trimEnd();
    if (!trimmed) continue;

    let currentLine = '';
    for (const char of Array.from(trimmed)) {
      const testLine = currentLine + char;
      if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine.trimEnd());
        currentLine = char === ' ' ? '' : char;
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

async function createCoverImageBytes(
  settings: AlbumSettings,
  photoCount: number
): Promise<Uint8Array> {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  const width = 1200;
  const height = 1600;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const palette = EPUB_PALETTES[settings.theme];
  const fontStyle = settings.fontStyle || 'myeongjo';
  const fontFamily = getCanvasFontFamily(fontStyle);

  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, width, height);

  const margin = 120;
  ctx.strokeStyle = palette.hairline;
  ctx.lineWidth = 3;
  ctx.strokeRect(72, 72, width - 144, height - 144);

  ctx.textBaseline = 'top';
  ctx.fillStyle = palette.muted;
  ctx.font = '500 22px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
  ctx.fillText('PHOTOGRAPH MONOGRAPH', margin, margin + 20);

  const titleText = settings.albumTitle.trim() || '나의 포토 앨범';
  ctx.fillStyle = palette.ink;
  const titleSize = fontStyle === 'handwriting' ? 98 : 80;
  const titleWeight = fontStyle === 'handwriting' ? 400 : 700;
  ctx.font = `${titleWeight} ${titleSize}px ${fontFamily}`;
  let y = 410;
  for (const line of wrapCanvasText(ctx, titleText, width - margin * 2).slice(0, 3)) {
    ctx.fillText(line, margin, y);
    y += Math.round(titleSize * 1.28);
  }

  if (settings.albumSubtitle.trim()) {
    y += 24;
    ctx.fillStyle = palette.muted;
    const subSize = fontStyle === 'handwriting' ? 44 : 34;
    ctx.font = `400 ${subSize}px ${fontFamily}`;
    for (const line of wrapCanvasText(
      ctx,
      settings.albumSubtitle.trim(),
      width - margin * 2
    ).slice(0, 3)) {
      ctx.fillText(line, margin, y);
      y += Math.round(subSize * 1.45);
    }
  }

  const dividerY = height - margin - 210;
  ctx.strokeStyle = palette.hairline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, dividerY);
  ctx.lineTo(width - margin, dividerY);
  ctx.stroke();

  let metaY = dividerY + 42;
  if (settings.authorName.trim()) {
    ctx.fillStyle = palette.ink;
    const authorSize = fontStyle === 'handwriting' ? 46 : 38;
    const authorWeight = fontStyle === 'handwriting' ? 400 : 600;
    ctx.font = `${authorWeight} ${authorSize}px ${fontFamily}`;
    ctx.fillText(settings.authorName.trim(), margin, metaY);
    metaY += Math.round(authorSize * 1.42);
  }

  if (settings.coverDate.trim()) {
    ctx.fillStyle = palette.muted;
    ctx.font = '500 28px "JetBrains Mono", "Noto Sans KR", sans-serif';
    ctx.fillText(settings.coverDate.trim(), margin, metaY);
  }

  ctx.fillStyle = palette.muted;
  ctx.font = '400 22px "Noto Sans KR", sans-serif';
  const countText = `수록 사진 ${photoCount}장`;
  const countW = ctx.measureText(countText).width;
  ctx.fillText(countText, width - margin - countW, height - margin - 40);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
  );
  if (!blob) throw new Error('Cover JPEG encoding failed');
  return new Uint8Array(await blob.arrayBuffer());
}

export async function exportAlbumToEpub(
  pages: AlbumPage[],
  settings: AlbumSettings,
  onProgress?: (progress: PdfExportProgress) => void
): Promise<void> {
  if (pages.length === 0) return;

  const totalSteps = pages.length + 2;
  onProgress?.({ current: 0, total: totalSteps, stage: 'preparing' });

  const zip = new JSZip();

  // 1. mimetype MUST be the very first file and stored uncompressed (EPUB 3 spec)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`
  );

  const palette = EPUB_PALETTES[settings.theme];
  const fontStyle = settings.fontStyle || 'myeongjo';
  const cssFont = getCssFontFamily(fontStyle);

  // 3. Shared EPUB Stylesheet
  zip.file(
    'OEBPS/styles/album.css',
    `@charset "UTF-8";

html, body {
  margin: 0;
  padding: 0;
  background-color: ${palette.paper};
  color: ${palette.ink};
  font-family: ${cssFont};
  line-height: 1.75;
}

.page-wrap {
  max-width: 720px;
  margin: 0 auto;
  padding: 2em 1.5em;
  box-sizing: border-box;
}

.cover-box, .closing-box {
  border: 1px solid ${palette.hairline};
  padding: 2.5em 2em;
}

.kicker {
  font-size: 0.78em;
  letter-spacing: 0.08em;
  color: ${palette.muted};
  margin: 0 0 2.2em 0;
}

.cover-title {
  font-size: 2.1em;
  font-weight: 700;
  line-height: 1.25;
  color: ${palette.ink};
  margin: 0 0 0.6em 0;
}

.cover-subtitle {
  font-size: 1.15em;
  color: ${palette.muted};
  margin: 0 0 2.5em 0;
}

.cover-meta {
  border-top: 1px solid ${palette.hairline};
  padding-top: 1.2em;
  margin-top: 2em;
}

.cover-author {
  font-size: 1.2em;
  font-weight: 600;
  color: ${palette.ink};
  margin: 0 0 0.25em 0;
}

.cover-date {
  font-size: 0.95em;
  color: ${palette.muted};
  margin: 0;
}

.photo-header {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid ${palette.hairline};
  padding-bottom: 0.6em;
  margin-bottom: 1.4em;
  font-size: 0.8em;
  color: ${palette.muted};
}

.photo-frame {
  background-color: ${palette.frameBg};
  border: 1px solid ${palette.hairline};
  padding: 0.6em;
  text-align: center;
  margin-bottom: 1.4em;
  page-break-inside: avoid;
}

.photo-frame img {
  max-width: 100%;
  max-height: 62vh;
  width: auto;
  height: auto;
  display: block;
  margin: 0 auto;
}

.photo-title {
  font-size: 1.35em;
  font-weight: 600;
  color: ${palette.ink};
  margin: 0 0 0.6em 0;
  line-height: 1.35;
}

.photo-desc p {
  font-size: 1em;
  color: ${palette.muted};
  margin: 0 0 0.55em 0;
}

.closing-title {
  font-size: 1.6em;
  font-weight: 600;
  color: ${palette.ink};
  margin: 0 0 0.8em 0;
}

.divider {
  width: 3em;
  border: 0;
  border-top: 1px solid ${palette.hairline};
  margin: 0 0 1.2em 0;
}

.closing-body p {
  font-size: 1.05em;
  color: ${palette.muted};
  margin: 0 0 0.65em 0;
}

.spacer {
  height: 0.5em;
  margin: 0;
}

.colophon {
  border-top: 1px solid ${palette.hairline};
  margin-top: 2.5em;
  padding-top: 1em;
  font-size: 0.85em;
  color: ${palette.muted};
}

nav ol {
  padding-left: 1.4em;
}

nav li {
  margin-bottom: 0.5em;
}
`
  );

  // 4. Cover Image (Required by Kyobo / Yes24 / RIDI bookstores)
  const coverBytes = await createCoverImageBytes(settings, pages.length);
  zip.file('OEBPS/images/cover.jpg', coverBytes);
  onProgress?.({ current: 1, total: totalSteps, stage: 'rendering' });

  const albumTitleEsc = escapeXml(settings.albumTitle.trim() || '나의 포토 앨범');
  const authorEsc = escapeXml(settings.authorName.trim() || '작자 미상');
  const subtitleEsc = escapeXml(settings.albumSubtitle.trim());
  const dateEsc = escapeXml(settings.coverDate.trim());
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const bookUuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `urn:uuid:${crypto.randomUUID()}`
      : `urn:uuid:monograph-${Date.now()}`;

  const manifestItems: string[] = [
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
    `<item id="css" href="styles/album.css" media-type="text/css"/>`,
    `<item id="cover-image" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>`,
  ];
  const spineRefs: string[] = [];
  const navEntries: { href: string; label: string }[] = [];

  // 5. Cover XHTML (if enabled)
  if (settings.includeCover) {
    zip.file(
      'OEBPS/xhtml/cover.xhtml',
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ko" lang="ko">
<head>
  <meta charset="UTF-8"/>
  <title>표지 - ${albumTitleEsc}</title>
  <link rel="stylesheet" type="text/css" href="../styles/album.css"/>
</head>
<body epub:type="cover">
  <div class="page-wrap">
    <div class="cover-box">
      <p class="kicker">PHOTOGRAPH MONOGRAPH</p>
      <h1 class="cover-title">${albumTitleEsc}</h1>
      ${subtitleEsc ? `<p class="cover-subtitle">${subtitleEsc}</p>` : ''}
      <div class="cover-meta">
        ${settings.authorName.trim() ? `<p class="cover-author">${authorEsc}</p>` : ''}
        ${dateEsc ? `<p class="cover-date">${dateEsc}</p>` : ''}
      </div>
    </div>
  </div>
</body>
</html>
`
    );
    manifestItems.push(
      `<item id="cover-page" href="xhtml/cover.xhtml" media-type="application/xhtml+xml"/>`
    );
    spineRefs.push(`<itemref idref="cover-page"/>`);
    navEntries.push({ href: 'xhtml/cover.xhtml', label: '표지' });
  }

  // 6. Photo Pages (1 photo per XHTML chapter/page)
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const numStr = String(i + 1).padStart(3, '0');
    const imgFileName = `photo_${numStr}.jpg`;
    const xhtmlFileName = `page_${numStr}.xhtml`;

    const imgBytes = await encodeImageAsJpegBytes(page.imageUrl);
    zip.file(`OEBPS/images/${imgFileName}`, imgBytes);

    const pageTitle = page.title.trim() || `사진 ${i + 1}`;
    const pageTitleEsc = escapeXml(pageTitle);
    const pageNumText = `${String(i + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}`;

    zip.file(
      `OEBPS/xhtml/${xhtmlFileName}`,
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ko" lang="ko">
<head>
  <meta charset="UTF-8"/>
  <title>${pageTitleEsc}</title>
  <link rel="stylesheet" type="text/css" href="../styles/album.css"/>
</head>
<body>
  <div class="page-wrap">
    <div class="photo-header">
      <span>${albumTitleEsc}</span>
      ${settings.showPageNumbers ? `<span>${pageNumText}</span>` : ''}
    </div>
    <div class="photo-frame">
      <img src="../images/${imgFileName}" alt="${pageTitleEsc}"/>
    </div>
    <h2 class="photo-title">${pageTitleEsc}</h2>
    ${
      page.description.trim()
        ? `<div class="photo-desc">
      ${paragraphsToHtml(page.description)}
    </div>`
        : ''
    }
  </div>
</body>
</html>
`
    );

    manifestItems.push(
      `<item id="img-${numStr}" href="images/${imgFileName}" media-type="image/jpeg"/>`,
      `<item id="page-${numStr}" href="xhtml/${xhtmlFileName}" media-type="application/xhtml+xml"/>`
    );
    spineRefs.push(`<itemref idref="page-${numStr}"/>`);
    navEntries.push({
      href: `xhtml/${xhtmlFileName}`,
      label: `${i + 1}. ${pageTitle}`,
    });

    onProgress?.({ current: i + 2, total: totalSteps, stage: 'rendering' });
    await new Promise((resolve) => setTimeout(resolve, 12));
  }

  // 7. Closing Page (if enabled)
  if (settings.includeClosing) {
    const closingTitleEsc = escapeXml(settings.closingTitle.trim() || '기록을 마치며');
    const colophonParts = [
      settings.albumTitle.trim(),
      settings.authorName.trim(),
      settings.coverDate.trim(),
    ]
      .filter(Boolean)
      .map(escapeXml);

    zip.file(
      'OEBPS/xhtml/closing.xhtml',
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ko" lang="ko">
<head>
  <meta charset="UTF-8"/>
  <title>${closingTitleEsc}</title>
  <link rel="stylesheet" type="text/css" href="../styles/album.css"/>
</head>
<body epub:type="epilogue">
  <div class="page-wrap">
    <div class="closing-box">
      <p class="kicker">EPILOGUE</p>
      <h2 class="closing-title">${closingTitleEsc}</h2>
      <hr class="divider"/>
      ${
        settings.closingMessage.trim()
          ? `<div class="closing-body">
      ${paragraphsToHtml(settings.closingMessage)}
    </div>`
          : ''
      }
      ${
        colophonParts.length > 0
          ? `<div class="colophon">${colophonParts.join(' · ')}</div>`
          : ''
      }
    </div>
  </div>
</body>
</html>
`
    );

    manifestItems.push(
      `<item id="closing-page" href="xhtml/closing.xhtml" media-type="application/xhtml+xml"/>`
    );
    spineRefs.push(`<itemref idref="closing-page"/>`);
    navEntries.push({
      href: 'xhtml/closing.xhtml',
      label: settings.closingTitle.trim() || '마무리',
    });
  }

  // 8. OEBPS/nav.xhtml (EPUB 3 Navigation)
  zip.file(
    'OEBPS/nav.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ko" lang="ko">
<head>
  <meta charset="UTF-8"/>
  <title>목차 - ${albumTitleEsc}</title>
  <link rel="stylesheet" type="text/css" href="styles/album.css"/>
</head>
<body>
  <div class="page-wrap">
    <nav epub:type="toc" id="toc">
      <h1>목차</h1>
      <ol>
        ${navEntries
          .map(
            (entry) =>
              `<li><a href="${entry.href}">${escapeXml(entry.label)}</a></li>`
          )
          .join('\n        ')}
      </ol>
    </nav>
  </div>
</body>
</html>
`
  );

  // 9. OEBPS/toc.ncx (Compatibility for Korean bookstore validators)
  zip.file(
    'OEBPS/toc.ncx',
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookUuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${albumTitleEsc}</text>
  </docTitle>
  <navMap>
    ${navEntries
      .map(
        (entry, idx) => `<navPoint id="navPoint-${idx + 1}" playOrder="${idx + 1}">
      <navLabel><text>${escapeXml(entry.label)}</text></navLabel>
      <content src="${entry.href}"/>
    </navPoint>`
      )
      .join('\n    ')}
  </navMap>
</ncx>
`
  );

  // 10. OEBPS/content.opf (EPUB 3.0 Package Document)
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="ko">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${bookUuid}</dc:identifier>
    <dc:title>${albumTitleEsc}</dc:title>
    <dc:creator>${authorEsc}</dc:creator>
    <dc:language>ko</dc:language>
    <dc:date>${nowIso.slice(0, 10)}</dc:date>
    ${subtitleEsc ? `<dc:description>${subtitleEsc}</dc:description>` : ''}
    <meta property="dcterms:modified">${nowIso}</meta>
    <meta name="cover" content="cover-image"/>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineRefs.join('\n    ')}
  </spine>
</package>
`
  );

  onProgress?.({ current: totalSteps, total: totalSteps, stage: 'saving' });

  const epubBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
  });

  const safeTitle = (settings.albumTitle.trim() || '포토_앨범')
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 60);

  const url = URL.createObjectURL(epubBlob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeTitle}.epub`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
