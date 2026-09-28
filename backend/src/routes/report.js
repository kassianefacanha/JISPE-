const express = require('express');
const ExcelJS = require('exceljs');
const { auth } = require('../middlewares/auth');
const Athlete = require('../models/Athlete');

const router = express.Router();

router.get('/athletes', auth, async (req, res, next) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador' });
    }

    const athletes = await Athlete.find().sort({ createdAt: -1 });

    if (req.query.format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Atletas');
      sheet.columns = [
        { header: 'Nome', key: 'fullName', width: 30 },
        { header: 'CPF', key: 'cpf', width: 18 },
        { header: 'Matrícula', key: 'matricula', width: 18 },
        { header: 'Categoria', key: 'ageCategory', width: 15 },
      ];

      athletes.forEach((athlete) => sheet.addRow({
        fullName: athlete.fullName,
        cpf: athlete.cpf,
        matricula: athlete.matricula,
        ageCategory: athlete.ageCategory,
      }));

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=atletas-jispe.xlsx');

      await workbook.xlsx.write(res);
      return res.end();
    }

    res.json({ success: true, athletes });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
