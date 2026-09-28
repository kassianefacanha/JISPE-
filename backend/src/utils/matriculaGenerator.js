const Counter = require('../models/Counter');
const Athlete = require('../models/Athlete');

const generateMatricula = async () => {
  while (true) {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'athlete_matricula' },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );

    const sequence = String(counter.sequence).padStart(4, '0');
    const matricula = `JISPE-${sequence}`;
    if (!(await Athlete.exists({ matricula }))) return matricula;
  }
};

module.exports = { generateMatricula };
