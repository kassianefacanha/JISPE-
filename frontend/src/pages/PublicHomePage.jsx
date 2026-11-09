import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import api, { getApiErrorMessage } from '../services/api';

export default function PublicHomePage() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadContent = () => {
    setLoading(true);
    setError('');
    api.get('/public/home-content')
      .then(({ data }) => setContent(data.content))
      .catch((requestError) => setError(getApiErrorMessage(requestError, 'Não foi possível carregar a página inicial.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadContent(); }, []);

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
        {loading ? (
          <Box sx={{ minHeight: '55vh', display: 'grid', placeItems: 'center' }}><CircularProgress aria-label="Carregando página inicial" /></Box>
        ) : error ? (
          <Alert severity="error" action={<Button color="inherit" size="small" onClick={loadContent}>Tentar novamente</Button>}>{error}</Alert>
        ) : (
          <Stack spacing={{ xs: 4, md: 6 }}>
            <Paper
              component="section"
              sx={{
                minHeight: { xs: 300, md: 430 },
                p: { xs: 3, md: 7 },
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
                backgroundImage: content.hero.bannerUrl
                  ? `linear-gradient(90deg, rgba(15,23,42,.88), rgba(15,23,42,.3)), url("${content.hero.bannerUrl}")`
                  : 'linear-gradient(135deg, #064e3b, #10b981 60%, #f97316)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: '#fff',
              }}
            >
              <Box sx={{ maxWidth: 700 }}>
                <Typography variant="overline" sx={{ letterSpacing: 3, fontWeight: 800, opacity: 0.9 }}>Jogos Integrados dos Servidores Públicos Estaduais</Typography>
                <Typography variant="h1" sx={{ fontSize: { xs: 36, sm: 52, md: 64 }, lineHeight: 1.05, mt: 1 }}>{content.hero.title}</Typography>
                {content.hero.description && (
                  <Typography sx={{ mt: 2, fontSize: { xs: 16, md: 20 }, whiteSpace: 'pre-line', maxWidth: 620 }}>
                    {content.hero.description}
                  </Typography>
                )}
                <Button component={Link} to="/login" variant="contained" color="secondary" endIcon={<ArrowForwardIcon />} sx={{ mt: 3 }}>
                  Acesse sua conta
                </Button>
              </Box>
            </Paper>

            {content.about.description && (
              <Box component="section" aria-labelledby="about-title">
                <Typography id="about-title" variant="h4" fontWeight={800}>{content.about.title}</Typography>
                <Typography sx={{ mt: 1.5, maxWidth: 900, whiteSpace: 'pre-line', lineHeight: 1.8 }} color="text.secondary">
                  {content.about.description}
                </Typography>
              </Box>
            )}

            {content.news?.length > 0 && (
              <Box component="section" aria-labelledby="news-title">
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <ArticleOutlinedIcon color="primary" />
                  <Typography id="news-title" variant="h4" fontWeight={800}>Notícias</Typography>
                </Stack>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                  {content.news.map((news, index) => (
                    <Card key={news._id || `news-${index}`} variant="outlined">
                      <CardContent sx={{ p: 3 }}>
                        {news.publishedAt && (
                          <Typography variant="overline" color="primary.main" fontWeight={700}>
                            {new Date(news.publishedAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                          </Typography>
                        )}
                        <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5 }}>{news.title}</Typography>
                        {news.summary && <Typography sx={{ mt: 1 }} color="text.secondary">{news.summary}</Typography>}
                        {news.body && <Typography sx={{ mt: 1.5, whiteSpace: 'pre-line' }}>{news.body}</Typography>}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            )}

            {content.documents?.length > 0 && (
              <Box component="section" aria-labelledby="documents-title">
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <DescriptionOutlinedIcon color="primary" />
                  <Typography id="documents-title" variant="h4" fontWeight={800}>Boletins e documentos</Typography>
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

            {content.contacts?.length > 0 && (
              <Box component="section" aria-labelledby="contacts-title">
                <Typography id="contacts-title" variant="h4" fontWeight={800} sx={{ mb: 2 }}>Informações e contatos</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                  {content.contacts.map((contact, index) => (
                    <Paper key={contact._id || `contact-${index}`} variant="outlined" sx={{ p: 2.5 }}>
                      <Typography variant="overline" color="primary.main" fontWeight={800}>{contact.label}</Typography>
                      <Typography sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{contact.value}</Typography>
                    </Paper>
                  ))}
                </Box>
              </Box>
            )}

            <Box component="footer" sx={{ borderTop: '1px solid #e2e8f0', pt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">JISPE 2026</Typography>
              <Button component={Link} to="/login" size="small" sx={{ mt: 1 }}>Acessar sistema</Button>
            </Box>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
