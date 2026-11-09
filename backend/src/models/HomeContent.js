const mongoose = require('mongoose');

const homeContentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'home' },
    hero: {
      title: { type: String, default: 'JISPE 2026' },
      description: { type: String, default: '' },
      bannerUrl: { type: String, default: '' },
    },
    about: {
      title: { type: String, default: 'Sobre os jogos' },
      description: { type: String, default: '' },
    },
    news: [{
      title: { type: String, required: true },
      type: { type: String, enum: ['Boletim', 'Informativa', 'Aviso', 'Comunicado', 'Outra'], default: 'Informativa' },
      summary: { type: String, default: '' },
      body: { type: String, default: '' },
      link: { type: String, default: '', maxlength: 2048 },
      documentId: { type: String, default: '' },
      publishedAt: { type: Date, default: Date.now },
    }],
    bulletins: [{
      title: { type: String, required: true },
      summary: { type: String, default: '' },
      body: { type: String, default: '' },
      publishedAt: { type: Date, default: Date.now },
    }],
    documents: [{
      title: { type: String, required: true },
      description: { type: String, default: '' },
      fileUrl: { type: String, required: true },
      fileName: { type: String, required: true },
    }],
    contacts: [{
      label: { type: String, required: true },
      value: { type: String, required: true },
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('HomeContent', homeContentSchema);
