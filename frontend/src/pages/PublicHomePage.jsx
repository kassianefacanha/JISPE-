import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import api, { getApiErrorMessage } from '../services/api';

const eventDescription = [
  'O Governo do Estado do Ceará, por meio da Secretaria do Esporte do Ceará (Sesporte), realizará os Jogos da Integração do Servidor Público Estadual.',
  'O objetivo do evento é oferecer aos servidores públicos cearenses atividades esportivas e de lazer que promovam intersetorialidade, valorização do funcionário, sociabilidade, integralidade e a união entre os participantes e o Governo do Estado.',
  'O período de inscrições será de 22 de setembro a 06 de outubro.',
  'A abertura oficial do Mês do Servidor, juntamente com a abertura dos Jogos da Integração, acontecerá no Centro Administrativo do Cambeba, no dia 10 de outubro, às 13h30.',
];

const modalities = [
  'Natação',
  'Tênis de mesa',
  'Vôlei de praia',
  'Futebol de 7',
  'Futsal',
  'Basquetebol',
  'Voleibol',
  'Handebol',
  'Beach tennis',
  'Xadrez',
  'Dama',
  'Carimba',
  'Corrida de 5 km',
];

export default function PublicHomePage() {
  const [content, setContent] = useState({ bulletins: [], news: [], documents: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadContent = () => {
    setLoading(true);
    setError('');
    api.get('/public/home-content')
      .then(({ data }) => setContent({
        bulletins: data.content?.bulletins || [],
        news: data.content?.news || [],
        documents: data.content?.documents || [],
      }))
      .catch((requestError) => setError(getApiErrorMessage(requestError, 'Não foi possível carregar boletins, notícias e documentos.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadContent(); }, []);

  const renderPosts = (items, title, id, icon) => items.length > 0 && (
    <Box component="section" aria-labelledby={id}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        {icon}
        <Typography id={id} variant="h4" fontWeight={800}>{title}</Typography>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        {items.map((item, index) => (
          <Card key={item._id || `${id}-${index}`} variant="outlined">
            <CardContent sx={{ p: 3 }}>
              {item.publishedAt && (
                <Typography variant="overline" color="primary.main" fontWeight={700}>
                  {new Date(item.publishedAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                </Typography>
              )}
              <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5 }}>{item.title}</Typography>
              {item.summary && <Typography sx={{ mt: 1 }} color="text.secondary">{item.summary}</Typography>}
              {item.body && <Typography sx={{ mt: 1.5, whiteSpace: 'pre-line' }}>{item.body}</Typography>}
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc', pb: 8 }}>
      <Box component="header" sx={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <Container maxWidth="lg" sx={{ py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box component="img" src="/logo.png" alt="JISPE 2026" sx={{ width: 68, height: 52, objectFit: 'contain' }} />
            <Typography fontWeight={800} color="text.primary">JISPE 2026</Typography>
          </Stack>
          <Button component={Link} to="/login" variant="contained">Acessar sistema</Button>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pt: { xs: 3, md: 5 } }}>
        <Stack spacing={{ xs: 4, md: 6 }}>
          <Paper
            component="section"
            sx={{
              minHeight: { xs: 220, md: 300 },
              p: { xs: 3, md: 7 },
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
              backgroundImage: 'linear-gradient(115deg, #064e3b 0%, #10b981 64%, #f97316 100%)',
              color: '#fff',
            }}
          >
            <Box sx={{ maxWidth: 700 }}>
              <Typography variant="overline" sx={{ letterSpacing: 3, fontWeight: 800, opacity: 0.9 }}>
                Jogos da Integração do Servidor Público Estadual
              </Typography>
              <Typography variant="h1" sx={{ fontSize: { xs: 40, sm: 54, md: 68 }, lineHeight: 1.05, mt: 1 }}>
                JISPE 2026
              </Typography>
              <Button component={Link} to="/login" variant="contained" color="secondary" endIcon={<ArrowForwardIcon />} sx={{ mt: 3 }}>
                Acesse sua conta
              </Button>
            </Box>
          </Paper>

          <Box component="section" aria-labelledby="about-title">
            <Typography id="about-title" variant="h4" fontWeight={800}>Sobre os jogos</Typography>
            <Stack spacing={1.5} sx={{ mt: 2, maxWidth: 1000 }}>
              {eventDescription.map((paragraph) => (
                <Typography key={paragraph} color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  {paragraph}
                </Typography>
              ))}
            </Stack>
            <Typography fontWeight={800} sx={{ mt: 2 }}>Modalidades disponíveis</Typography>
            <Box component="ul" sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, minmax(0, 1fr))' },
              gap: 1,
              pl: 3,
              mt: 1,
              color: 'text.secondary',
            }}>
              {modalities.map((modality) => <li key={modality}>{modality}</li>)}
            </Box>
            <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.8 }}>
              Os jogos serão realizados no Centro de Formação Olímpica (CFO), sendo a prova de corrida de 5 km disputada na Arena Castelão.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" action={<Button color="inherit" size="small" onClick={loadContent}>Tentar novamente</Button>}>
              {error}
            </Alert>
          )}
          {loading && <Typography color="text.secondary">Carregando publicações...</Typography>}
          {!loading && !error && (
            <>
              {renderPosts(
                content.bulletins,
                'Boletins',
                'bulletins-title',
                <ArticleOutlinedIcon color="primary" />
              )}
              {renderPosts(
                content.news,
                'Notícias',
                'news-title',
                <ArticleOutlinedIcon color="primary" />
              )}

              {content.documents.length > 0 && (
                <Box component="section" aria-labelledby="documents-title">
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <DescriptionOutlinedIcon color="primary" />
                    <Typography id="documents-title" variant="h4" fontWeight={800}>Documentos</Typography>
                  </Stack>
                  <Stack spacing={1.5}>
                    {content.documents.map((document, index) => (
                      <Paper key={document._id || `document-${index}`} variant="outlined" sx={{ p: 2.5 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5}>
                          <Box>
                            <Typography fontWeight={800}>{document.title}</Typography>
                            {document.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{document.description}</Typography>}
                            <Typography variant="caption" color="text.secondary">{document.fileName}</Typography>
                          </Box>
                          <Button component="a" href={document.fileUrl} target="_blank" rel="noopener noreferrer" variant="outlined" download>
                            Abrir documento
                          </Button>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}
            </>
          )}

          <Box component="footer" sx={{ borderTop: '1px solid #e2e8f0', pt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">JISPE 2026</Typography>
            <Button component={Link} to="/login" size="small" sx={{ mt: 1 }}>Acessar sistema</Button>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
