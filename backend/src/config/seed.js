const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
require('dotenv').config();

const Admin = require('../models/Admin');
const Entity = require('../models/Entity');
const Athlete = require('../models/Athlete');
const Modality = require('../models/Modality');

const runSeed = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jispe-2026';

    if (!process.env.MONGODB_URI) {
      try {
        await mongoose.connect(mongoUri);
        console.log('MongoDB local conectado para seed');
      } catch (error) {
        console.warn('Mongo local indisponível, usando Mongo em memória para seed:', error.message);
        const memoryServer = await MongoMemoryServer.create();
        mongoUri = memoryServer.getUri('jispe-2026');
        await mongoose.connect(mongoUri);
        console.log('MongoDB em memória inicializado para seed');
      }
    } else {
      await mongoose.connect(mongoUri);
    }

    await mongoose.connection.db.dropDatabase();
    console.log('Banco resetado com sucesso');

    const existingAdmin = await Admin.findOne({ email: 'admin@jispe.com' });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('jispe@2026', 12);
      await Admin.create({
        name: 'Administrador JISPE',
        email: 'admin@jispe.com',
        password: passwordHash,
        role: 'admin',
      });
      console.log('Admin seed criado');
    }

    const modalidades = [
      { name: 'Corrida 5km', slug: 'corrida-5km', genders: ['masculino', 'feminino'], categories: ['18-29', '30-39', '40-49', '50+'], maxTeamsPerEntity: 1, maxAthletesPerTeam: 10, isCollective: false, active: true },
      { name: 'Futsal', slug: 'futsal', genders: ['masculino', 'feminino'], categories: ['adulto', 'master'], maxTeamsPerEntity: 2, maxAthletesPerTeam: 12, isCollective: true, active: true },
      { name: 'Vôlei', slug: 'volei', genders: ['masculino', 'feminino'], categories: ['adulto', 'master'], maxTeamsPerEntity: 2, maxAthletesPerTeam: 12, isCollective: true, active: true },
      { name: 'Beach Tennis', slug: 'beach-tennis', genders: ['masculino', 'feminino'], categories: ['adulto', 'master'], maxTeamsPerEntity: 2, maxAthletesPerTeam: 4, isCollective: true, active: true }
    ];

    for (const modality of modalidades) {
      const exists = await Modality.findOne({ slug: modality.slug });
      if (!exists) {
        await Modality.create(modality);
      }
    }

    const entitySeeds = [
      {
        name: 'Secretaria Municipal de Esportes',
        email: 'esportes@teste.com',
        password: '123456',
        phone: '(11) 98888-1010',
        responsible: {
          fullName: 'Carla Mendes',
          cpf: '12345678909',
          email: 'carla@teste.com',
          photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
          proofUrl: 'https://example.com/comprovante-1.pdf',
        },
        status: 'approved',
      },
      {
        name: 'Clube de Atletismo São José',
        email: 'atletismo@teste.com',
        password: '123456',
        phone: '(11) 97777-2020',
        responsible: {
          fullName: 'Rafael Costa',
          cpf: '98765432100',
          email: 'rafael@teste.com',
          photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
          proofUrl: 'https://example.com/comprovante-2.pdf',
        },
        status: 'approved',
      },
      {
        name: 'Associação de Futsal Central',
        email: 'futsal@teste.com',
        password: '123456',
        phone: '(11) 96666-3030',
        responsible: {
          fullName: 'Bruno Silva',
          cpf: '11144477735',
          email: 'bruno@teste.com',
          photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d',
          proofUrl: 'https://example.com/comprovante-3.pdf',
        },
        status: 'pending',
      },
      {
        name: 'Academia Nova Era',
        email: 'novaera@teste.com',
        password: '123456',
        phone: '(11) 95555-4040',
        responsible: {
          fullName: 'Patrícia Nogueira',
          cpf: '22233344455',
          email: 'patricia@teste.com',
          photoUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f',
          proofUrl: 'https://example.com/comprovante-4.pdf',
        },
        status: 'approved',
      },
      {
        name: 'Grupo Olímpico Bauru',
        email: 'olimpico@teste.com',
        password: '123456',
        phone: '(14) 98888-5050',
        responsible: {
          fullName: 'Henrique Prado',
          cpf: '33344455566',
          email: 'henrique@teste.com',
          photoUrl: 'https://images.unsplash.com/photo-1504593811423-6dd665756598',
          proofUrl: 'https://example.com/comprovante-5.pdf',
        },
        status: 'rejected',
      },
      {
        name: 'União do Esporte Juvenil',
        email: 'juvenil@teste.com',
        password: '123456',
        phone: '(12) 97777-6060',
        responsible: {
          fullName: 'Fernanda Rocha',
          cpf: '44455566677',
          email: 'fernanda@teste.com',
          photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
          proofUrl: 'https://example.com/comprovante-6.pdf',
        },
        status: 'pending',
      },
    ];

    const createdEntities = [];

    for (const seed of entitySeeds) {
      const exists = await Entity.findOne({ email: seed.email });
      if (!exists) {
        const entity = await Entity.create({
          ...seed,
          password: await bcrypt.hash(seed.password, 12),
        });
        createdEntities.push(entity);
      } else {
        createdEntities.push(exists);
      }
    }

    const athleteSeeds = [
      { entityEmail: 'esportes@teste.com', cpf: '34567890123', fullName: 'Ana Paula Souza', birthDate: '2008-04-12', phone: '(11) 99111-2222', email: 'ana@teste.com', modality: 'Corrida 5km', naipe: 'feminino', photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2', proofUrl: 'https://example.com/ana.pdf' },
      { entityEmail: 'esportes@teste.com', cpf: '45678901234', fullName: 'Pedro Henrique Lima', birthDate: '2010-07-20', phone: '(11) 99222-3333', email: 'pedro@teste.com', modality: 'Futsal', naipe: 'masculino', photoUrl: 'https://images.unsplash.com/photo-1504593811423-6dd665756598', proofUrl: 'https://example.com/pedro.pdf' },
      { entityEmail: 'esportes@teste.com', cpf: '56789012345', fullName: 'Gabriela Martins', birthDate: '2005-09-02', phone: '(11) 99333-4444', email: 'gabriela@teste.com', modality: 'Corrida 5km', naipe: 'feminino', photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1', proofUrl: 'https://example.com/gabi.pdf' },
      { entityEmail: 'atletismo@teste.com', cpf: '67890123456', fullName: 'Lucas Alves', birthDate: '2002-11-18', phone: '(11) 99444-5555', email: 'lucas@teste.com', modality: 'Beach Tennis', naipe: 'masculino', photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e', proofUrl: 'https://example.com/lucas.pdf' },
      { entityEmail: 'atletismo@teste.com', cpf: '78901234567', fullName: 'Miguel Torres', birthDate: '2012-03-14', phone: '(11) 99555-6666', email: 'miguel@teste.com', modality: 'Futsal', naipe: 'masculino', photoUrl: 'https://images.unsplash.com/photo-1504593811423-6dd665756598', proofUrl: 'https://example.com/miguel.pdf' },
      { entityEmail: 'atletismo@teste.com', cpf: '89012345678', fullName: 'Isabela Rocha', birthDate: '2006-01-29', phone: '(11) 99666-7777', email: 'isabela@teste.com', modality: 'Corrida 5km', naipe: 'feminino', photoUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f', proofUrl: 'https://example.com/isabela.pdf' },
      { entityEmail: 'novaera@teste.com', cpf: '90123456789', fullName: 'Nicolas Carvalho', birthDate: '2004-12-10', phone: '(11) 99777-8888', email: 'nicolas@teste.com', modality: 'Vôlei', naipe: 'masculino', photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d', proofUrl: 'https://example.com/nicolas.pdf' },
      { entityEmail: 'novaera@teste.com', cpf: '01234567890', fullName: 'Julia Castro', birthDate: '2011-06-03', phone: '(11) 99888-9999', email: 'julia@teste.com', modality: 'Vôlei', naipe: 'feminino', photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2', proofUrl: 'https://example.com/julia.pdf' },
      { entityEmail: 'novaera@teste.com', cpf: '12345098765', fullName: 'Enzo Pereira', birthDate: '2009-08-25', phone: '(11) 99000-1111', email: 'enzo@teste.com', modality: 'Beach Tennis', naipe: 'masculino', photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e', proofUrl: 'https://example.com/enzo.pdf' },
      { entityEmail: 'futsal@teste.com', cpf: '23456098761', fullName: 'Matheus Ramos', birthDate: '2013-09-16', phone: '(11) 99123-4567', email: 'matheus@teste.com', modality: 'Futsal', naipe: 'masculino', photoUrl: 'https://images.unsplash.com/photo-1504593811423-6dd665756598', proofUrl: 'https://example.com/matheus.pdf' },
      { entityEmail: 'futsal@teste.com', cpf: '34567098762', fullName: 'Lívia Fernandes', birthDate: '2010-02-21', phone: '(11) 99234-5678', email: 'livia@teste.com', modality: 'Futsal', naipe: 'feminino', photoUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f', proofUrl: 'https://example.com/livia.pdf' },
      { entityEmail: 'juvenil@teste.com', cpf: '45678098763', fullName: 'Thiago Martins', birthDate: '2007-10-09', phone: '(12) 99345-6789', email: 'thiago@teste.com', modality: 'Corrida 5km', naipe: 'masculino', photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d', proofUrl: 'https://example.com/thiago.pdf' },
      { entityEmail: 'juvenil@teste.com', cpf: '56789098764', fullName: 'Marina Azevedo', birthDate: '2012-05-12', phone: '(12) 99456-7890', email: 'marina@teste.com', modality: 'Vôlei', naipe: 'feminino', photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1', proofUrl: 'https://example.com/marina.pdf' },
    ];

    for (const [index, seed] of athleteSeeds.entries()) {
      const entity = await Entity.findOne({ email: seed.entityEmail });
      if (!entity) continue;

      const existing = await Athlete.findOne({ entityId: entity._id, cpf: seed.cpf });
      if (!existing) {
        await Athlete.create({
          entityId: entity._id,
          cpf: seed.cpf,
          fullName: seed.fullName,
          birthDate: seed.birthDate,
          photoUrl: seed.photoUrl,
          phone: seed.phone,
          email: seed.email,
          proofUrl: seed.proofUrl,
          modality: seed.modality,
          naipe: seed.naipe,
          gender: seed.naipe,
          ageCategory: 'adulto',
          matricula: `JISPE-${String(index + 1).padStart(4, '0')}`,
        });
      }
    }

    console.log('Dados iniciais de administração, entidades, modalidades e atletas criados');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao popular seed:', error.message);
    process.exit(1);
  }
};

runSeed();
