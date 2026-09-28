const express = require('express');
const path = require('path');
const bwipjs = require('bwip-js');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const Athlete = require('../models/Athlete');
const Entity = require('../models/Entity');
const Registration = require('../models/Registration');
const { auth } = require('../middlewares/auth');
const { isValidCPF } = require('../utils/cpfValidator');
const { generateMatricula } = require('../utils/matriculaGenerator');
const { getAgeCategory } = require('../services/ageCategory');

const fetchImageBuffer = async (url) => {
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    return null;
  }
};

const router = express.Router();

router.get('/', auth, async (req, res, next) => {
  try {
    const isAdmin = req.user.type === 'admin';
    const query = isAdmin ? {} : { entityId: req.user.id };

    const athletes = await Athlete.find(query).sort({ createdAt: -1 });
    res.json({ success: true, athletes });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const isAdmin = req.user.type === 'admin';
    const athlete = await Athlete.findOne({
      _id: req.params.id,
      ...(isAdmin ? {} : { entityId: req.user.id }),
    });

    if (!athlete) {
      return res.status(404).json({ success: false, message: 'Atleta não encontrado' });
    }

    res.json({ success: true, athlete });
  } catch (error) {
    next(error);
  }
});

router.post('/', auth, async (req, res, next) => {
  try {
    if (req.user.type !== 'entity' && req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso restrito à entidade ou ao administrador' });
    }

    const { entityId, cpf, fullName, birthDate, phone, email, gender, naipe, modality, photoUrl, proofUrl, ageCategory } = req.body;
    const resolvedEntityId = req.user.type === 'entity' ? req.user.id : entityId;
    const resolvedNaipe = naipe || gender || 'masculino';

    if (!resolvedEntityId || !cpf || !fullName || !birthDate || !phone || !email || !modality || !resolvedNaipe || !photoUrl || !proofUrl) {
      return res.status(400).json({ success: false, message: 'Todos os campos do atleta são obrigatórios' });
    }

    if (!isValidCPF(cpf)) {
      return res.status(400).json({ success: false, message: 'CPF do atleta inválido' });
    }

    const birth = new Date(birthDate);
    const age = 2026 - birth.getFullYear();
    if (Number.isNaN(birth.getTime()) || age < 18) {
      return res.status(400).json({ success: false, message: 'O atleta deve ter no mínimo 18 anos completos em 2026.' });
    }

    const existing = await Athlete.findOne({ entityId: resolvedEntityId, cpf });
    if (existing) {
      return res.status(409).json({ success: false, message: 'CPF já cadastrado para esta entidade' });
    }

    const matricula = await generateMatricula();
    const category = ageCategory || getAgeCategory(birthDate, modality || 'adulto');

    const athlete = await Athlete.create({
      entityId: resolvedEntityId,
      cpf,
      fullName,
      birthDate,
      photoUrl,
      phone,
      email,
      proofUrl,
      modality,
      naipe: resolvedNaipe,
      gender: resolvedNaipe,
      ageCategory: category,
      matricula,
    });

    res.status(201).json({ success: true, athlete });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    if (req.user.type !== 'admin' && req.user.type !== 'entity') {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    const athlete = await Athlete.findOne({
      _id: req.params.id,
      ...(req.user.type === 'entity' ? { entityId: req.user.id } : {}),
    });

    if (!athlete) {
      return res.status(404).json({ success: false, message: 'Atleta não encontrado' });
    }

    const { entityId, cpf, fullName, birthDate, photoUrl, phone, email, gender, naipe, modality, proofUrl, ageCategory } = req.body;
    const resolvedNaipe = naipe || gender || athlete.naipe || athlete.gender;
    const resolvedModality = modality || athlete.modality;
    const payload = {
      ...(cpf ? { cpf } : {}),
      ...(fullName ? { fullName } : {}),
      ...(birthDate ? { birthDate } : {}),
      ...(photoUrl ? { photoUrl } : {}),
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(proofUrl ? { proofUrl } : {}),
      ...(resolvedNaipe ? { gender: resolvedNaipe, naipe: resolvedNaipe } : {}),
      ...(resolvedModality ? { modality: resolvedModality } : {}),
      ...(ageCategory ? { ageCategory } : {}),
    };

    if (req.user.type === 'admin' && entityId && String(entityId) !== String(athlete.entityId)) {
      const approvedEntity = await Entity.findOne({ _id: entityId, status: 'approved' }).select('_id');
      if (!approvedEntity) {
        return res.status(400).json({ success: false, message: 'Selecione uma entidade aprovada para o atleta.' });
      }
      payload.entityId = approvedEntity._id;
    }

    if (!resolvedModality && athlete.modality) {
      payload.modality = athlete.modality;
    }

    if (cpf && !isValidCPF(cpf)) {
      return res.status(400).json({ success: false, message: 'CPF do atleta inválido' });
    }

    if (cpf && req.user.type === 'entity') {
      const existing = await Athlete.findOne({ entityId: req.user.id, cpf, _id: { $ne: athlete._id } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'CPF já cadastrado para esta entidade' });
      }
    }

    const updated = await Athlete.findByIdAndUpdate(req.params.id, payload, { new: true });
    res.json({ success: true, athlete: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    if (req.user.type !== 'admin' && req.user.type !== 'entity') {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    const query = req.user.type === 'entity' ? { _id: req.params.id, entityId: req.user.id } : { _id: req.params.id };
    const athlete = await Athlete.findOneAndDelete(query);

    if (!athlete) {
      return res.status(404).json({ success: false, message: 'Atleta não encontrado' });
    }

    res.json({ success: true, message: 'Atleta excluído com sucesso' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/badge', auth, async (req, res, next) => {
  try {
    const isAdmin = req.user.type === 'admin';
    const athlete = await Athlete.findOne({
      _id: req.params.id,
      ...(isAdmin ? {} : { entityId: req.user.id }),
    });

    if (!athlete) {
      return res.status(404).json({ success: false, message: 'Atleta não encontrado' });
    }

    if (!athlete.matricula) {
      athlete.matricula = await generateMatricula();
      await athlete.save();
    }

    const entity = await Entity.findById(athlete.entityId).select('name');
    const entityName = entity?.name || 'Sem entidade';
    const normalizedMatricula = athlete.matricula.replace(/\s+/g, '');
    const photoBuffer = await fetchImageBuffer(athlete.photoUrl);

    const [barcodeBuffer, qrBuffer] = await Promise.all([
      bwipjs.toBuffer({
        bcid: 'code128',
        text: normalizedMatricula,
        scale: 2.3,
        height: 18,
        includetext: true,
        textxalign: 'center',
        backgroundcolor: 'ffffff',
        foregroundcolor: '000000',
      }),
      bwipjs.toBuffer({
        bcid: 'qrcode',
        text: normalizedMatricula,
        scale: 4,
        version: 5,
        eclevel: 'M',
        backgroundcolor: 'ffffff',
        foregroundcolor: '000000',
      }),
    ]);

    const doc = new PDFDocument({ size: [300, 400], margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=carteirinha-${normalizedMatricula}.pdf`);

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

    doc.pipe(res);

    const pageWidth = 300;
    const pageHeight = 400;
    const photoWidth = 106;
    const photoHeight = 140;
    const photoX = 20;
    const photoY = 94;
    const infoX = 140;
    const infoWidth = 137;
    doc.rect(0, 0, pageWidth, pageHeight).fill('#f3f4f6');
    doc.roundedRect(3, 3, pageWidth - 6, pageHeight - 6, 18).fill('#f59e0b');
    doc.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, 15).fill('#1f9a87');
    doc.roundedRect(13, 13, pageWidth - 26, pageHeight - 26, 12).fillAndStroke('#f6f7f5', '#1f9a87');

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
      .text(entityName, infoX, photoY + 25, { width: infoWidth, height: 18, ellipsis: true });

    const labelColor = '#f59e0b';
    const valueColor = '#111827';

    const drawField = (label, value, x, y, width) => {
      doc.fillColor(labelColor).fontSize(9.5).font('Helvetica-Bold').text(label, x, y, { width });
      doc.fillColor(valueColor).fontSize(9.5).font('Helvetica').text(String(value), x, y + 12, { width, height: 12, ellipsis: true });
    };

    const naipeLabel =
      athlete.naipe === 'feminino' ? 'Feminino' : athlete.naipe === 'masculino' ? 'Masculino' : 'Misto';

    drawField('Matrícula', athlete.matricula, infoX, photoY + 51, infoWidth);
    drawField('Categoria', athlete.ageCategory || 'adulto', infoX, photoY + 79, infoWidth);
    drawField('Modalidade', athlete.modality, infoX, photoY + 107, infoWidth);
    drawField('Naipe', naipeLabel, infoX, photoY + 135, infoWidth);

    doc.fillColor('#1f2937')
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .text('Código de barras', 20, 288);
    doc.image(barcodeBuffer, 20, 300, { fit: [108, 48] });

    doc.image(qrBuffer, 214, 300, { fit: [48, 48] });
    doc.fillColor('#1f2937').fontSize(8.5).font('Helvetica').text('Valide por matrícula ou QR Code', 0, 362, { align: 'center', width: pageWidth });

    doc.end();
  } catch (error) {
    next(error);
  }
});

router.post('/:id/registrations', auth, async (req, res, next) => {
  try {
    if (req.user.type !== 'entity') {
      return res.status(403).json({ success: false, message: 'Acesso restrito à entidade' });
    }

    const { modality, gender } = req.body;
    const athlete = await Athlete.findOne({ _id: req.params.id, entityId: req.user.id });
    if (!athlete) {
      return res.status(404).json({ success: false, message: 'Atleta não encontrado para esta entidade' });
    }

    const registration = await Registration.create({
      athleteId: athlete._id,
      entityId: req.user.id,
      modality,
      gender,
      category: athlete.ageCategory,
      status: 'pending',
    });

    res.status(201).json({ success: true, registration });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
