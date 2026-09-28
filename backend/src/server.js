const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const FALLBACK_URI = 'mongodb://127.0.0.1:27017/jispe-2026';

const startServer = async () => {
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
