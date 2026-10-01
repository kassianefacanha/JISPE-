const express = require('express');
const path = require('path');
const bwipjs = require('bwip-js');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const Athlete = require('../models/Athlete');
const Entity = require('../models/Entity');
const Modality = require('../models/Modality');
const Registration = require('../models/Registration');
const RegistrationControls = require('../models/RegistrationControls');
const EntityModalityRule = require('../models/EntityModalityRule');
const { auth } = require('../middlewares/auth');
const { isValidCPF } = require('../utils/cpfValidator');
const { generateMatricula } = require('../utils/matriculaGenerator');
const { getAgeCategory, hasCompletedMinimumAge } = require('../services/ageCategory');
const { defaultModalities } = require('../config/defaultModalities');
const { validateUploadedAsset } = require('../utils/uploadValidation');
const { deleteAsset, deleteReplacedAsset, getAssetBuffer, getAssetUrl, isR2Value, isSameStoredAsset, storeAsset } = require('../services/r2Storage');
const { sendAthleteRegistrationEmail } = require('../services/passwordResetEmail');
const { raceAliases, releaseRaceRegistration, reserveRaceRegistration } = require('../services/raceRegistration');

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

const serializeAthlete = async (athlete) => {
  const payload = athlete.toObject();
  payload.modalities = payload.modalities?.length ? payload.modalities : [payload.modality].filter(Boolean);
  payload.photoUrl = await getAssetUrl(payload.photoUrl);
  payload.proofUrl = await getAssetUrl(payload.proofUrl, { download: true });
  return payload;
};

const getModalityDefinition = async (modalityName) => {
  if (!modalityName) return null;
  const normalizedName = String(modalityName).trim().toLowerCase();
  const officialModality = defaultModalities.find((modality) =>
    [modality.name, modality.slug, ...(modality.legacySlugs || []), ...(modality.legacyNames || [])]
      .some((value) => String(value).trim().toLowerCase() === normalizedName)
  );
  if (officialModality) return officialModality;

  return Modality.findOne({ $or: [{ name: modalityName }, { slug: modalityName }] }).select('name slug genders categories');
};

const router = express.Router();

router.get('/', auth, async (req, res, next) => {
  try {
    const isAdmin = req.user.type === 'admin';
    const query = isAdmin ? {} : { entityId: req.user.id };

    const athletes = await Athlete.find(query).sort({ createdAt: -1 });
    res.json({ success: true, athletes: await Promise.all(athletes.map(serializeAthlete)) });
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

    res.json({ success: true, athlete: await serializeAthlete(athlete) });
  } catch (error) {
    next(error);
  }
});

router.post('/', auth, async (req, res, next) => {
  try {
    if (req.user.type !== 'entity' && req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso restrito à entidade ou ao administrador' });
    }

    const { entityId, cpf, fullName, birthDate, phone, email, gender, naipe, modality, modalities, photoUrl, proofUrl } = req.body;
    const resolvedEntityId = req.user.type === 'entity' ? req.user.id : entityId;
    const resolvedNaipe = naipe || gender || 'masculino';
    const requestedModalities = Array.isArray(modalities) ? modalities : [modality].filter(Boolean);
    const modalityDefinitions = await Promise.all([...new Set(requestedModalities
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean))].map(getModalityDefinition));

    if (!resolvedEntityId || !cpf || !fullName || !birthDate || !phone || !email || !modalityDefinitions.length || !resolvedNaipe || !photoUrl || !proofUrl) {
      return res.status(400).json({ success: false, message: 'Todos os campos do atleta são obrigatórios' });
    }

    const assetError = validateUploadedAsset(photoUrl, 'photo') || validateUploadedAsset(proofUrl, 'proof');
    if (assetError) return res.status(400).json({ success: false, message: assetError });

    if (!isValidCPF(cpf)) {
      return res.status(400).json({ success: false, message: 'CPF do atleta inválido' });
    }

    if (!hasCompletedMinimumAge(birthDate)) {
      return res.status(400).json({ success: false, message: 'O atleta precisa já ter completado 18 anos para se cadastrar.' });
    }

    if (modalityDefinitions.some((definition) => !definition)) {
      return res.status(400).json({ success: false, message: 'Selecione uma modalidade válida.' });
    }
    if (modalityDefinitions.some((definition) => !definition.genders?.includes(resolvedNaipe))) {
      return res.status(400).json({ success: false, message: 'O naipe selecionado não é permitido nesta modalidade.' });
    }

    if (req.user.type === 'entity') {
      const controls = await RegistrationControls.findById('global').lean();
      if (controls?.athleteRegistrationOpen === false) {
        return res.status(403).json({ success: false, message: 'O cadastro de atletas está temporariamente fechado.' });
      }

      for (const modalityDefinition of modalityDefinitions) {
        const modalityRule = await EntityModalityRule.findOne({
          entityId: resolvedEntityId,
          modalitySlug: modalityDefinition.slug,
        }).lean();
        if (modalityRule?.enabled === false) {
          return res.status(403).json({ success: false, message: `O cadastro de atletas em ${modalityDefinition.name} está bloqueado para sua entidade.` });
        }

        const officialLimit = modalityDefinition.maxTeamsPerEntity && modalityDefinition.maxAthletesPerTeam
          ? modalityDefinition.maxTeamsPerEntity * modalityDefinition.maxAthletesPerTeam
          : null;
        const modalityLimit = modalityRule ? modalityRule.maxAthletes : officialLimit;
        const modalityAliases = [modalityDefinition.name, modalityDefinition.slug, ...(modalityDefinition.legacyNames || []), ...(modalityDefinition.legacySlugs || [])];
        const registeredCount = await Athlete.countDocuments({
          entityId: resolvedEntityId,
          $or: [{ modality: { $in: modalityAliases } }, { modalities: { $in: modalityAliases } }],
        });
        if (modalityLimit != null && registeredCount >= modalityLimit) {
          return res.status(403).json({
            success: false,
            message: `Sua entidade atingiu o limite de ${modalityLimit} atletas para ${modalityDefinition.name}.`,
          });
        }
      }
    }

    const existing = await Athlete.findOne({ entityId: resolvedEntityId, cpf });
    if (existing) {
      return res.status(409).json({ success: false, message: 'CPF já cadastrado para esta entidade' });
    }

    const matricula = await generateMatricula();
    const primaryModality = modalityDefinitions[0];
    const modalityNames = modalityDefinitions.map((definition) => definition.name);
    const category = getAgeCategory(birthDate, primaryModality.name, primaryModality.categories || []);
    const athlete = new Athlete({
      entityId: resolvedEntityId,
      cpf,
      fullName,
      birthDate,
      photoUrl,
      phone,
      email,
      proofUrl,
      modality: primaryModality.name,
      modalities: modalityNames,
      naipe: resolvedNaipe,
      gender: resolvedNaipe,
      ageCategory: category,
      matricula,
    });
    const hasRaceModality = modalityNames.some((name) => raceAliases.includes(name));
    let raceReserved = false;
    if (hasRaceModality) {
      const reservation = await reserveRaceRegistration(athlete._id);
      if (reservation.full) {
        return res.status(409).json({ success: false, message: 'As inscrições para a corrida foram encerradas: limite de 3.000 corredores atingido.' });
      }
      raceReserved = reservation.reserved;
    }

    try {
      athlete.photoUrl = await storeAsset(photoUrl, `athletes/${athlete._id}/photo`);
      athlete.proofUrl = await storeAsset(proofUrl, `athletes/${athlete._id}/proof`);
      await athlete.save();
    } catch (error) {
      if (raceReserved) await releaseRaceRegistration(athlete._id);
      throw error;
    }

    const entity = await Entity.findById(resolvedEntityId).select('name email');
    if (entity) void sendAthleteRegistrationEmail(entity, athlete);
    res.status(201).json({ success: true, athlete: await serializeAthlete(athlete) });
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

    const { entityId, cpf, fullName, birthDate, photoUrl, phone, email, gender, naipe, modality, modalities, proofUrl } = req.body;
    const assetError = (photoUrl !== undefined && !isSameStoredAsset(photoUrl, athlete.photoUrl) && validateUploadedAsset(photoUrl, 'photo'))
      || (proofUrl !== undefined && !isSameStoredAsset(proofUrl, athlete.proofUrl) && validateUploadedAsset(proofUrl, 'proof'));
    if (assetError) return res.status(400).json({ success: false, message: assetError });
    const resolvedNaipe = naipe || gender || athlete.naipe || athlete.gender;
    const requestedModalities = Array.isArray(modalities)
      ? modalities
      : modality ? [modality] : athlete.modalities?.length ? athlete.modalities : [athlete.modality];
    const modalityDefinitions = await Promise.all([...new Set(requestedModalities
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean))].map(getModalityDefinition));
    const resolvedModalityDefinitions = modalityDefinitions.filter(Boolean);
    const resolvedModalities = resolvedModalityDefinitions.map((definition) => definition.name);
    const resolvedModality = resolvedModalities[0];
    const hadRaceModality = [athlete.modality, ...(athlete.modalities || [])].some((name) => raceAliases.includes(name));
    const hasRaceModality = resolvedModalities.some((name) => raceAliases.includes(name));
    const resolvedBirthDate = birthDate || athlete.birthDate;
    if (!hasCompletedMinimumAge(resolvedBirthDate)) {
      return res.status(400).json({ success: false, message: 'O atleta precisa já ter completado 18 anos.' });
    }

    if (!resolvedModalities.length || resolvedModalityDefinitions.length !== modalityDefinitions.length) {
      return res.status(400).json({ success: false, message: 'Selecione uma modalidade válida.' });
    }
    if (resolvedModalityDefinitions.some((definition) => !definition.genders?.includes(resolvedNaipe))) {
      return res.status(400).json({ success: false, message: 'O naipe selecionado não é permitido nesta modalidade.' });
    }
    const payload = {
      ...(cpf ? { cpf } : {}),
      ...(fullName ? { fullName } : {}),
      ...(birthDate ? { birthDate } : {}),
      ...(photoUrl ? { photoUrl: await storeAsset(photoUrl, `athletes/${athlete._id}/photo`, athlete.photoUrl) } : {}),
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(proofUrl ? { proofUrl: await storeAsset(proofUrl, `athletes/${athlete._id}/proof`, athlete.proofUrl) } : {}),
      ...(resolvedNaipe ? { gender: resolvedNaipe, naipe: resolvedNaipe } : {}),
      ...(resolvedModality ? { modality: resolvedModality, modalities: resolvedModalities } : {}),
      ageCategory: getAgeCategory(resolvedBirthDate, resolvedModality, resolvedModalityDefinitions[0].categories || []),
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

    let raceReserved = false;
    if (hasRaceModality && !hadRaceModality) {
      const reservation = await reserveRaceRegistration(athlete._id);
      if (reservation.full) {
        return res.status(409).json({ success: false, message: 'As inscrições para a corrida foram encerradas: limite de 3.000 corredores atingido.' });
      }
      raceReserved = reservation.reserved;
    }

    let updated;
    try {
      updated = await Athlete.findByIdAndUpdate(req.params.id, payload, { new: true });
    } catch (error) {
      if (raceReserved) await releaseRaceRegistration(athlete._id);
      throw error;
    }
    if (hadRaceModality && !hasRaceModality) await releaseRaceRegistration(athlete._id);
    await Promise.all([
      deleteReplacedAsset(athlete.photoUrl, updated.photoUrl),
      deleteReplacedAsset(athlete.proofUrl, updated.proofUrl),
    ]);
    res.json({ success: true, athlete: await serializeAthlete(updated) });
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

    if (raceAliases.includes(athlete.modality) || athlete.modalities?.some((name) => raceAliases.includes(name))) {
      await releaseRaceRegistration(athlete._id);
    }

    await Promise.all([deleteAsset(athlete.photoUrl), deleteAsset(athlete.proofUrl)]);
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

    const qrBuffer = await bwipjs.toBuffer({
      bcid: 'qrcode',
      text: normalizedMatricula,
      scale: 4,
      version: 5,
      eclevel: 'M',
      backgroundcolor: 'ffffff',
      foregroundcolor: '000000',
    });

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
    drawField('Modalidade', (athlete.modalities?.length ? athlete.modalities : [athlete.modality]).join(', '), infoX, photoY + 107, infoWidth);
    drawField('Naipe', naipeLabel, infoX, photoY + 135, infoWidth);

    doc.fillColor('#1f2937').fontSize(9.5).font('Helvetica-Bold')
      .text('QR Code para validação', 0, 282, { align: 'center', width: pageWidth });
    doc.image(qrBuffer, 115, 291, { fit: [70, 70] });
    doc.fillColor('#1f2937').fontSize(8.5).font('Helvetica')
      .text('Use a matrícula para validar a carteirinha', 0, 371, { align: 'center', width: pageWidth });

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

    if (!hasCompletedMinimumAge(athlete.birthDate)) {
      return res.status(400).json({ success: false, message: 'O atleta precisa já ter completado 18 anos para realizar inscrições.' });
    }

    const modalityDefinition = await getModalityDefinition(modality);
    if (!modalityDefinition) return res.status(400).json({ success: false, message: 'Selecione uma modalidade válida.' });

    const isRaceRegistration = raceAliases.some((alias) => String(alias).toLowerCase() === String(modality).trim().toLowerCase());
    let raceReserved = false;
    if (isRaceRegistration) {
      const reservation = await reserveRaceRegistration(athlete._id);
      if (reservation.full) {
        return res.status(409).json({ success: false, message: 'As inscrições para a corrida foram encerradas: limite de 3.000 corredores atingido.' });
      }
      raceReserved = reservation.reserved;
    }

    let registration;
    try {
      registration = await Registration.create({
        athleteId: athlete._id,
        entityId: req.user.id,
        modality: modalityDefinition.name,
        gender,
        category: getAgeCategory(athlete.birthDate, modalityDefinition.name, modalityDefinition.categories || []),
        status: 'pending',
      });
    } catch (error) {
      if (raceReserved) await RegistrationControls.updateOne({ _id: 'global' }, { $inc: { raceRegistrationCount: -1 } });
      throw error;
    }

    res.status(201).json({ success: true, registration });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
