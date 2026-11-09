import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import { useAuth } from '../contexts/AuthContext';
import { useFeedback } from '../contexts/FeedbackContext';
import api, { getApiErrorMessage } from '../services/api';

const emptyContent = {
  hero: { title: 'JISPE 2026', description: '', bannerUrl: '' },
  about: { title: 'Sobre os jogos', description: '' },
  news: [],
  documents: [],
  contacts: [],
};

const readFile = (file, acceptedTypes) => new Promise((resolve, reject) => {
  if (!acceptedTypes.includes(file.type)) {
    reject(new Error('Formato de arquivo não permitido.'));
    return;
  }
  if (file.size > 3 * 1024 * 1024) {
    reject(new Error('Cada arquivo pode ter no máximo 3 MiB.'));
    return;
  }
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Não foi possível ler o arquivo selecionado.'));
  reader.readAsDataURL(file);
});

export default function HomeContentAdminPage() {
  const { user } = useAuth();
  const { notify, confirm } = useFeedback();
  const readOnly = user?.role === 'gerencia';
  const [content, setContent] = useState(emptyContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/admin/home-content')
      .then(({ data }) => {
        if (active) setContent({ ...emptyContent, ...data.content });
      })
      .catch((error) => {
        if (active) setPageError(getApiErrorMessage(error, 'Não foi possível carregar o conteúdo da página.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const updateHero = (field, value) => setContent((current) => ({
    ...current,
    hero: { ...current.hero, [field]: value },
  }));
  const updateAbout = (field, value) => setContent((current) => ({
    ...current,
    about: { ...current.about, [field]: value },
  }));
  const updateListItem = (field, index, key, value) => setContent((current) => ({
    ...current,
    [field]: current[field].map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )),
  }));
  const removeListItem = async (field, index, label) => {
    if (!await confirm({
      title: `Excluir ${label}?`,
      message: `Este item será removido da página inicial quando as alterações forem salvas.`,
      confirmLabel: 'Excluir',
      severity: 'error',
    })) return;
    setContent((current) => ({
      ...current,
      [field]: current[field].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleBannerChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      updateHero('bannerUrl', await readFile(file, ['image/jpeg', 'image/png', 'image/webp']));
    } catch (error) {
      notify(error.message);
    }
  };

  const addDocument = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const fileUrl = await readFile(file, ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
      setContent((current) => ({
        ...current,
        documents: [...current.documents, {
          title: file.name.replace(/\.[^.]+$/, ''),
          description: '',
          fileUrl,
          fileName: file.name,
        }],
      }));
    } catch (error) {
      notify(error.message);
    }
  };

  const saveContent = async (event) => {
    event.preventDefault();
    const hasMissingDocument = content.documents.some((item) => !item.fileUrl || !item.fileName);
    if (hasMissingDocument) {
      notify('Selecione novamente o arquivo de cada documento antes de salvar.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/admin/home-content', content);
      setContent({ ...emptyContent, ...data.content });
      notify('Página inicial atualizada com sucesso.', 'success');
    } catch (error) {
      notify(getApiErrorMessage(error, 'Não foi possível salvar as alterações.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc', py: { xs: 3, md: 5 }, px: 2 }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
            <Box>
              <Button component={Link} to="/admin" startIcon={<ArrowBackIcon />} sx={{ mb: 1 }}>
                Voltar ao painel
              </Button>
              <Typography variant="h4" fontWeight={800}>Conteúdo da página inicial</Typography>
              <Typography color="text.secondary">Gerencie o banner, informações, notícias, documentos e contatos públicos.</Typography>
            </Box>
            <Button component="a" href="/" target="_blank" rel="noopener noreferrer" variant="outlined">
              Ver página pública
            </Button>
          </Stack>

          {pageError && <Alert severity="error">{pageError}</Alert>}
          {readOnly && <Alert severity="info">Seu perfil pode consultar o conteúdo, mas não pode alterá-lo.</Alert>}
          {loading ? (
            <Paper sx={{ p: 3 }}><Typography color="text.secondary">Carregando conteúdo...</Typography></Paper>
          ) : !pageError && (
            <Box component="form" onSubmit={saveContent}>
              <Stack spacing={2.5}>
                <Paper sx={{ p: { xs: 2, sm: 3 } }}>
                  <Stack spacing={2}>
                    <Typography variant="h6">Banner principal</Typography>
                    <TextField
                      label="Título"
                      required
                      fullWidth
                      disabled={readOnly}
                      value={content.hero.title}
                      onChange={(event) => updateHero('title', event.target.value)}
                    />
                    <TextField
                      label="Texto de apresentação"
                      fullWidth
                      multiline
                      minRows={3}
                      disabled={readOnly}
                      value={content.hero.description}
                      onChange={(event) => updateHero('description', event.target.value)}
                    />
                    <Button component="label" variant="outlined" disabled={readOnly} sx={{ alignSelf: 'flex-start' }}>
                      Escolher imagem do banner
                      <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={handleBannerChange} />
                    </Button>
                    {content.hero.bannerUrl && (
                      <Stack spacing={1}>
                        <Box
                          component="img"
                          src={content.hero.bannerUrl}
                          alt="Prévia do banner"
                          sx={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 2 }}
                        />
                        {!readOnly && (
                          <Button color="error" onClick={() => updateHero('bannerUrl', '')} sx={{ alignSelf: 'flex-start' }}>
                            Remover banner
                          </Button>
                        )}
                      </Stack>
                    )}
                  </Stack>
                </Paper>

                <Paper sx={{ p: { xs: 2, sm: 3 } }}>
                  <Stack spacing={2}>
                    <Typography variant="h6">Sobre e informações</Typography>
                    <TextField
                      label="Título da seção"
                      required
                      fullWidth
                      disabled={readOnly}
                      value={content.about.title}
                      onChange={(event) => updateAbout('title', event.target.value)}
                    />
                    <TextField
                      label="Descrição"
                      fullWidth
                      multiline
                      minRows={4}
                      disabled={readOnly}
                      value={content.about.description}
                      onChange={(event) => updateAbout('description', event.target.value)}
                    />
                  </Stack>
                </Paper>

                <Paper sx={{ p: { xs: 2, sm: 3 } }}>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <Typography variant="h6">Notícias</Typography>
                      <Button
                        startIcon={<AddIcon />}
                        disabled={readOnly}
                        onClick={() => setContent((current) => ({
                          ...current,
                          news: [...current.news, { title: '', summary: '', body: '', publishedAt: new Date().toISOString() }],
                        }))}
                      >
                        Adicionar
                      </Button>
                    </Stack>
                    {content.news.map((item, index) => (
                      <Paper key={item._id || `news-${index}`} variant="outlined" sx={{ p: 2 }}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography fontWeight={700}>Notícia {index + 1}</Typography>
                            {!readOnly && (
                              <IconButton aria-label={`Excluir notícia ${index + 1}`} color="error" onClick={() => removeListItem('news', index, 'a notícia')}>
                                <DeleteOutlineIcon />
                              </IconButton>
                            )}
                          </Stack>
                          <TextField label="Título" required fullWidth disabled={readOnly} value={item.title} onChange={(event) => updateListItem('news', index, 'title', event.target.value)} />
                          <TextField label="Resumo" fullWidth disabled={readOnly} value={item.summary} onChange={(event) => updateListItem('news', index, 'summary', event.target.value)} />
                          <TextField label="Texto da notícia" fullWidth multiline minRows={3} disabled={readOnly} value={item.body} onChange={(event) => updateListItem('news', index, 'body', event.target.value)} />
                        </Stack>
                      </Paper>
                    ))}
                    {!content.news.length && <Typography color="text.secondary">Nenhuma notícia publicada.</Typography>}
                  </Stack>
                </Paper>

                <Paper sx={{ p: { xs: 2, sm: 3 } }}>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <Typography variant="h6">Documentos e boletins</Typography>
                      {!readOnly && (
                        <Button component="label" startIcon={<AddIcon />}>
                          Enviar arquivo
                          <input hidden type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={addDocument} />
                        </Button>
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">PDF, JPG, PNG ou WebP; até 3 MiB por arquivo.</Typography>
                    {content.documents.map((item, index) => (
                      <Paper key={item._id || `document-${index}`} variant="outlined" sx={{ p: 2 }}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">{item.fileName}</Typography>
                            {!readOnly && (
                              <IconButton aria-label={`Excluir documento ${index + 1}`} color="error" onClick={() => removeListItem('documents', index, 'o documento')}>
                                <DeleteOutlineIcon />
                              </IconButton>
                            )}
                          </Stack>
                          <TextField label="Nome exibido" required fullWidth disabled={readOnly} value={item.title} onChange={(event) => updateListItem('documents', index, 'title', event.target.value)} />
                          <TextField label="Descrição" fullWidth disabled={readOnly} value={item.description} onChange={(event) => updateListItem('documents', index, 'description', event.target.value)} />
                          {item.fileUrl?.startsWith('data:') && <Alert severity="info">Arquivo selecionado; será enviado ao salvar.</Alert>}
                        </Stack>
                      </Paper>
                    ))}
                    {!content.documents.length && <Typography color="text.secondary">Nenhum documento publicado.</Typography>}
                  </Stack>
                </Paper>

                <Paper sx={{ p: { xs: 2, sm: 3 } }}>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <Typography variant="h6">Contatos</Typography>
                      <Button
                        startIcon={<AddIcon />}
                        disabled={readOnly}
                        onClick={() => setContent((current) => ({
                          ...current,
                          contacts: [...current.contacts, { label: '', value: '' }],
                        }))}
                      >
                        Adicionar
                      </Button>
                    </Stack>
                    {content.contacts.map((item, index) => (
                      <Stack key={item._id || `contact-${index}`} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
                        <TextField label="Tipo (ex.: E-mail, Telefone)" required fullWidth disabled={readOnly} value={item.label} onChange={(event) => updateListItem('contacts', index, 'label', event.target.value)} />
                        <TextField label="Contato ou informação" required fullWidth disabled={readOnly} value={item.value} onChange={(event) => updateListItem('contacts', index, 'value', event.target.value)} />
                        {!readOnly && (
                          <IconButton aria-label={`Excluir contato ${index + 1}`} color="error" onClick={() => removeListItem('contacts', index, 'o contato')}>
                            <DeleteOutlineIcon />
                          </IconButton>
                        )}
                      </Stack>
                    ))}
                    {!content.contacts.length && <Typography color="text.secondary">Nenhum contato informado.</Typography>}
                  </Stack>
                </Paper>

                {!readOnly && (
                  <Button type="submit" variant="contained" size="large" startIcon={<SaveIcon />} disabled={saving} sx={{ alignSelf: 'flex-end' }}>
                    {saving ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                )}
              </Stack>
            </Box>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
