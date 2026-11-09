import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import api, { getApiErrorMessage } from '../services/api';

const eventDescription = [
  'O Governo do Estado do Ceará, por meio da Secretaria do Esporte do Ceará (Sesporte), da Secretaria do Planejamento e Gestão (Seplag) e da Escola de Gestão Pública do Ceará (EGPCE), realizará os Jogos da Integração do Servidor Público Estadual.',
  'O objetivo do evento é oferecer aos servidores públicos cearenses atividades esportivas e de lazer que promovam intersetorialidade, valorização do funcionário, sociabilidade, integralidade e a união entre os participantes e o Governo do Estado.',
  'As inscrições foram realizadas de 19 de outubro a 06 de novembro.',
  'A abertura dos Jogos da Integração será no dia 13 de novembro, às 14h, no Centro Administrativo do Cambeba.',
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
  const [content, setContent] = useState({ news: [], documents: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNews, setSelectedNews] = useState(null);
  const loadContent = () => {
    setLoading(true);
    setError('');
    api.get('/public/home-content')
      .then(({ data }) => setContent({
        news: data.content?.news || [],
        documents: data.content?.documents || [],
      }))
      .catch((requestError) => setError(getApiErrorMessage(requestError, 'Não foi possível carregar boletins, notícias e documentos.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadContent(); }, []);

  const renderPosts = (items, title, id, icon) => (
    <Paper
      component="section"
      aria-labelledby={id}
      variant="outlined"
      sx={{ height: { xs: 440, md: 620 }, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: 2, borderBottom: '1px solid #e2e8f0' }}>
        {icon}
        <Typography id={id} variant="h6" fontWeight={800}>{title}</Typography>
      </Stack>
      <Stack spacing={1.5} sx={{ p: 1.5, overflowY: 'auto', flex: 1, minHeight: 0 }}>
        {loading ? (
          <Typography role="status" color="text.secondary">Carregando {title.toLowerCase()}...</Typography>
        ) : error ? (
          <Stack spacing={1} alignItems="flex-start">
            <Typography color="error.main">Não foi possível carregar o conteúdo.</Typography>
            <Button size="small" onClick={loadContent}>Tentar novamente</Button>
          </Stack>
        ) : items.length ? items.map((item, index) => (
          <Card key={item._id || `${id}-${index}`} variant="outlined" sx={{ flexShrink: 0 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Chip size="small" color={item.type === 'Boletim' ? 'secondary' : 'primary'} label={item.type || 'Informativa'} />
                {item.publishedAt && (
                  <Typography variant="caption" color="text.secondary">
                    {new Date(item.publishedAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  </Typography>
                )}
              </Stack>
              <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>{item.title}</Typography>
              {item.summary && (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1,
                    overflowWrap: 'anywhere',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 3,
                    overflow: 'hidden',
                  }}
                  color="text.secondary"
                >
                  {item.summary}
                </Typography>
              )}
              {item.body && (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1.5,
                    whiteSpace: 'pre-line',
                    overflowWrap: 'anywhere',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 4,
                    overflow: 'hidden',
                  }}
                >
                  {item.body}
                </Typography>
              )}
              {(item.summary || item.body) && (
                <Button size="small" onClick={() => setSelectedNews(item)} sx={{ mt: 1 }}>
                  Ler notícia completa
                </Button>
              )}
              {item.linkedDocument && (
                <Button
                  component="a"
                  href={item.linkedDocument.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  size="small"
                  sx={{ mt: 1 }}
                >
                  Baixar {item.linkedDocument.title}
                </Button>
              )}
            </CardContent>
          </Card>
        )) : (
          <Typography color="text.secondary">Nenhum conteúdo publicado.</Typography>
        )}
      </Stack>
    </Paper>
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
                Sesporte • Seplag • EGPCE
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

          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
            gap: 2,
            alignItems: 'start',
          }}>
            {renderPosts(
              content.news,
              'Notícias',
              'news-title',
              <ArticleOutlinedIcon color="primary" />
            )}
            <Paper
              component="section"
              aria-labelledby="documents-title"
              variant="outlined"
              sx={{ height: { xs: 360, md: 480 }, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: 2, borderBottom: '1px solid #e2e8f0' }}>
                <DescriptionOutlinedIcon color="primary" />
                <Typography id="documents-title" variant="h6" fontWeight={800}>Documentos</Typography>
              </Stack>
              <Stack spacing={1.5} sx={{ p: 1.5, overflowY: 'auto', flex: 1, minHeight: 0 }}>
                {loading ? (
                  <Typography role="status" color="text.secondary">Carregando documentos...</Typography>
                ) : error ? (
                  <Stack spacing={1} alignItems="flex-start">
                    <Typography color="error.main">Não foi possível carregar o conteúdo.</Typography>
                    <Button size="small" onClick={loadContent}>Tentar novamente</Button>
                  </Stack>
                ) : content.documents.length ? content.documents.map((document, index) => (
                  <Card key={document._id || `document-${index}`} variant="outlined">
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="subtitle1" fontWeight={800} sx={{ overflowWrap: 'anywhere' }}>{document.title}</Typography>
                      {document.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 1, overflowWrap: 'anywhere' }}>{document.description}</Typography>}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, overflowWrap: 'anywhere' }}>{document.fileName}</Typography>
                      <Button component="a" href={document.fileUrl} target="_blank" rel="noopener noreferrer" variant="outlined" size="small" download sx={{ mt: 1 }}>
                        Abrir documento
                      </Button>
                    </CardContent>
                  </Card>
                )) : (
                  <Typography color="text.secondary">Nenhum documento publicado.</Typography>
                )}
              </Stack>
            </Paper>
          </Box>

          <Dialog
            open={Boolean(selectedNews)}
            onClose={() => setSelectedNews(null)}
            fullWidth
            maxWidth="sm"
            aria-labelledby="news-dialog-title"
          >
            {selectedNews && (
              <>
                <DialogTitle id="news-dialog-title">{selectedNews.title}</DialogTitle>
                <DialogContent dividers>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        size="small"
                        color={selectedNews.type === 'Boletim' ? 'secondary' : 'primary'}
                        label={selectedNews.type || 'Informativa'}
                      />
                      {selectedNews.publishedAt && (
                        <Typography variant="body2" color="text.secondary">
                          {new Date(selectedNews.publishedAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </Typography>
                      )}
                    </Stack>
                    {selectedNews.summary && (
                      <Typography fontWeight={700} color="text.secondary">{selectedNews.summary}</Typography>
                    )}
                    {selectedNews.body && (
                      <Typography sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
                        {selectedNews.body}
                      </Typography>
                    )}
                    {selectedNews.link && (
                      <Button
                        component="a"
                        href={selectedNews.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="contained"
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        Acessar link complementar
                      </Button>
                    )}
                    {selectedNews.linkedDocument && (
                      <Button
                        component="a"
                        href={selectedNews.linkedDocument.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        variant="outlined"
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        Baixar {selectedNews.linkedDocument.title}
                      </Button>
                    )}
                  </Stack>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setSelectedNews(null)}>Fechar</Button>
                </DialogActions>
              </>
            )}
          </Dialog>

          <Box component="footer" sx={{ borderTop: '1px solid #e2e8f0', pt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">JISPE 2026</Typography>
            <Button component={Link} to="/login" size="small" sx={{ mt: 1 }}>Acessar sistema</Button>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
