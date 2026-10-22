const path = require('path');
const bwipjs = require('bwip-js');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const { getAssetBuffer, isR2Value } = require('./r2Storage');

const maxBadgePhotoBytes = 5 * 1024 * 1024;
const dataImagePattern = /^data:image\/(?:png|jpe?g|webp);base64,([A-Za-z0-9+/]+={0,2})$/i;
const allowedImageHosts = new Set(['images.unsplash.com', 'res.cloudinary.com']);

const fetchImageBuffer = async (value) => {
  if (!value || typeof value !== 'string') return null;
  if (isR2Value(value)) {
    try {
      return await getAssetBuffer(value);
    } catch (error) {
      return null;
    }
  }

  const dataImage = value.match(dataImagePattern);
  if (dataImage) {
    const imageBuffer = Buffer.from(dataImage[1], 'base64');
    return imageBuffer.length <= maxBadgePhotoBytes ? imageBuffer : null;
  }

  let imageUrl;
  try {
    imageUrl = new URL(value);
  } catch (error) {
    return null;
  }
  if (imageUrl.protocol !== 'https:' || !allowedImageHosts.has(imageUrl.hostname) || imageUrl.username || imageUrl.password) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(imageUrl, { redirect: 'error', signal: controller.signal });
    if (!response.ok) return null;
    if (!response.headers.get('content-type')?.startsWith('image/')) return null;
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > maxBadgePhotoBytes) return null;
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    return imageBuffer.length <= maxBadgePhotoBytes ? imageBuffer : null;
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const generateAthleteBadge = async (athlete, entityName) => {
  const normalizedMatricula = athlete.matricula.replace(/\s+/g, '');
  const photoBuffer = await fetchImageBuffer(athlete.photoUrl);
  const qrBuffer = await bwipjs.toBuffer({
    bcid: 'qrcode',
    text: normalizedMatricula,
    scale: 4,
    version: 5,
    eclevel: 'M',
    backgroundcolor: 'ffffff',
    foregroundcolor: '000000',
  });

  const logoPath = path.resolve(__dirname, '../../../frontend/public/logo.png');
  const badgeLogoBuffer = await sharp(logoPath)
    .resize({
      width: 210,
      height: 64,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [300, 400], margin: 0 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = 300;
    const photoWidth = 106;
    const photoHeight = 140;
    const photoX = 20;
    const photoY = 94;
    const infoX = 140;
    const infoWidth = 137;
    doc.rect(0, 0, pageWidth, 400).fill('#f3f4f6');
    doc.roundedRect(3, 3, 294, 394, 18).fill('#f59e0b');
    doc.roundedRect(8, 8, 284, 384, 15).fill('#1f9a87');
    doc.roundedRect(13, 13, 274, 374, 12).fillAndStroke('#f6f7f5', '#1f9a87');

    doc.roundedRect(126, 17, 48, 12, 6).stroke('#5fb39a');
    doc.image(badgeLogoBuffer, 77.5, 31, { width: 145 });

    if (photoBuffer) {
      doc.image(photoBuffer, photoX, photoY, { fit: [photoWidth, photoHeight] });
    } else {
      doc.roundedRect(photoX, photoY, photoWidth, photoHeight, 10).fillAndStroke('#e2e8f0', '#cbd5e1');
      doc.fillColor('#475569').fontSize(11).text('FOTO', photoX, photoY + 42, { align: 'center', width: photoWidth });
    }

    doc.fillColor('#1f9a87').fontSize(10.5).font('Helvetica-Bold')
      .text(athlete.fullName, infoX, photoY, { width: infoWidth, height: 26, ellipsis: true });
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold')
      .text(entityName || 'Sem órgão', infoX, photoY + 25, { width: infoWidth, height: 18, ellipsis: true });

    const drawField = (label, value, x, y, width) => {
      doc.fillColor('#f59e0b').fontSize(9.5).font('Helvetica-Bold').text(label, x, y, { width });
      doc.fillColor('#111827').fontSize(9.5).font('Helvetica').text(String(value), x, y + 12, { width, height: 12, ellipsis: true });
    };

    const naipeLabel = athlete.naipe === 'feminino' ? 'Feminino' : athlete.naipe === 'masculino' ? 'Masculino' : 'Misto';
    drawField('Matrícula', athlete.matricula, infoX, photoY + 51, infoWidth);
    drawField('Categoria', athlete.ageCategory || 'adulto', infoX, photoY + 79, infoWidth);
    drawField('Modalidade', (athlete.modalities?.length ? athlete.modalities : [athlete.modality]).join(', '), infoX, photoY + 107, infoWidth);
    drawField('Naipe', naipeLabel, infoX, photoY + 135, infoWidth);

    doc.fillColor('#1f2937').fontSize(9.5).font('Helvetica-Bold')
      .text('QR Code para validação', 0, 282, { align: 'center', width: pageWidth });
    doc.image(qrBuffer, 115, 291, { fit: [70, 70] });
    doc.fillColor('#1f2937').fontSize(8.5).font('Helvetica')
      .text('Use a matrícula para validar a carteirinha', 0, 371, { align: 'center', width: pageWidth });
    doc.end();
  });
};

module.exports = { generateAthleteBadge };
