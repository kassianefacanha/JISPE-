const Counter = require('../models/Counter');
const Athlete = require('../models/Athlete');

const generateMatricula = async () => {
  while (true) {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'athlete_matricula' },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );

    if (counter.sequence > 9999) {
      throw new Error('Todas as matrículas disponíveis para 2026 foram utilizadas.');
    }

    const sequence = String(counter.sequence).padStart(4, '0');
    const matricula = `2026 ${sequence}`;
    const occupiedFormats = [matricula, `2026${sequence}`, `JISPE-${sequence}`];
    if (!(await Athlete.exists({ matricula: { $in: occupiedFormats } }))) return matricula;
  }
};

module.exports = { generateMatricula };
