const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('./app');
const { assertConfigured } = require('./services/r2Storage');
const { assertEmailConfigured } = require('./services/passwordResetEmail');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const FALLBACK_URI = 'mongodb://127.0.0.1:27017/jispe-2026';

const startServer = async () => {
  if (process.env.NODE_ENV === 'production') {
    try {
      assertConfigured();
      assertEmailConfigured();
      if (!process.env.FRONTEND_URL) throw new Error('FRONTEND_URL é obrigatório em produção.');
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  }

  if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI) {
    console.error('MONGODB_URI é obrigatório em produção.');
    process.exit(1);
  }

  let mongoUri = process.env.MONGODB_URI || FALLBACK_URI;
  let memoryServer = null;

  try {
    if (!process.env.MONGODB_URI) {
      await mongoose.connect(FALLBACK_URI);
      console.log('MongoDB local conectado com sucesso');
    } else {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB conectado com sucesso');
    }

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Não foi possível conectar ao MongoDB de produção:', error.message);
      process.exit(1);
    }

    console.warn('Falha ao conectar ao Mongo local, tentando Mongo em memória:', error.message);

    try {
      memoryServer = await MongoMemoryServer.create();
      mongoUri = memoryServer.getUri('jispe-2026');
      await mongoose.connect(mongoUri);
      console.log('MongoDB em memória inicializado com sucesso');
      app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
      });
    } catch (memoryError) {
      console.error('Erro ao conectar ao MongoDB:', memoryError.message);
      if (memoryServer) {
        await memoryServer.stop();
      }
      process.exit(1);
    }
  }
};

startServer();
