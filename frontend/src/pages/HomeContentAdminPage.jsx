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

const emptyContent = { bulletins: [], news: [], documents: [] };

const readFile = (file) => new Promise((resolve, reject) => {
  const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (!acceptedTypes.includes(file.type)) {
    reject(new Error('Envie um arquivo PDF, JPG, PNG ou WebP.'));
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
        if (active) setPageError(getApiErrorMessage(error, 'Não foi possível carregar as publicações.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const addPost = (field) => setContent((current) => ({
    ...current,
    [field]: [...current[field], {
      title: '',
      summary: '',
      body: '',
      publishedAt: new Date().toISOString(),
    }],
  }));
  const updatePost = (field, index, key, value) => setContent((current) => ({
    ...current,
    [field]: current[field].map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )),
  }));
  const removeItem = async (field, index, label) => {
    if (!await confirm({
      title: `Excluir ${label}?`,
      message: 'O item será removido da página inicial quando as alterações forem salvas.',
      confirmLabel: 'Excluir',
      severity: 'error',
    })) return;
    setContent((current) => ({
      ...current,
      [field]: current[field].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addDocument = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const fileUrl = await readFile(file);
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
    if (content.documents.some((item) => !item.fileUrl || !item.fileName)) {
      notify('Selecione novamente o arquivo de cada documento antes de salvar.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/admin/home-content', content);
      setContent({ ...emptyContent, ...data.content });
      notify('Publicações atualizadas com sucesso.', 'success');
    } catch (error) {
      notify(getApiErrorMessage(error, 'Não foi possível salvar as alterações.'));
    } finally {
      setSaving(false);
    }
  };

  const renderPosts = (field, label, singular) => (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography variant="h6">{label}</Typography>
          <Button startIcon={<AddIcon />} disabled={readOnly} onClick={() => addPost(field)}>
            Adicionar
          </Button>
        </Stack>
        {content[field].map((item, index) => (
          <Paper key={item._id || `${field}-${index}`} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={700}>{singular} {index + 1}</Typography>
                {!readOnly && (
                  <IconButton
                    aria-label={`Excluir ${singular.toLowerCase()} ${index + 1}`}
                    color="error"
                    onClick={() => removeItem(field, index, singular.toLowerCase())}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                )}
              </Stack>
              <TextField
                label="Título"
                required
                fullWidth
                disabled={readOnly}
                value={item.title}
                onChange={(event) => updatePost(field, index, 'title', event.target.value)}
              />
              <TextField
                label="Resumo"
                fullWidth
                disabled={readOnly}
                value={item.summary}
                onChange={(event) => updatePost(field, index, 'summary', event.target.value)}
              />
              <TextField
                label="Texto"
                fullWidth
                multiline
                minRows={3}
                disabled={readOnly}
                value={item.body}
                onChange={(event) => updatePost(field, index, 'body', event.target.value)}
              />
            </Stack>
          </Paper>
        ))}
        {!content[field].length && <Typography color="text.secondary">Nenhum item publicado.</Typography>}
      </Stack>
    </Paper>
  );

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc', py: { xs: 3, md: 5 }, px: 2 }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
            <Box>
              <Button component={Link} to="/admin" startIcon={<ArrowBackIcon />} sx={{ mb: 1 }}>
                Voltar ao painel
              </Button>
              <Typography variant="h4" fontWeight={800}>Boletins, notícias e documentos</Typography>
              <Typography color="text.secondary">Publique e remova conteúdo da página inicial. Banner e informações do evento são fixos.</Typography>
            </Box>
            <Button component="a" href="/" target="_blank" rel="noopener noreferrer" variant="outlined">
              Ver página pública
            </Button>
          </Stack>

          {pageError && <Alert severity="error">{pageError}</Alert>}
          {readOnly && <Alert severity="info">Seu perfil pode consultar as publicações, mas não pode alterá-las.</Alert>}
          {loading ? (
            <Paper sx={{ p: 3 }}><Typography color="text.secondary">Carregando publicações...</Typography></Paper>
          ) : !pageError && (
            <Box component="form" onSubmit={saveContent}>
              <Stack spacing={2.5}>
                {renderPosts('bulletins', 'Boletins', 'Boletim')}
                {renderPosts('news', 'Notícias', 'Notícia')}

                <Paper sx={{ p: { xs: 2, sm: 3 } }}>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <Typography variant="h6">Documentos</Typography>
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
                              <IconButton aria-label={`Excluir documento ${index + 1}`} color="error" onClick={() => removeItem('documents', index, 'o documento')}>
                                <DeleteOutlineIcon />
                              </IconButton>
                            )}
                          </Stack>
                          <TextField
                            label="Nome exibido"
                            required
                            fullWidth
                            disabled={readOnly}
                            value={item.title}
                            onChange={(event) => setContent((current) => ({
                              ...current,
                              documents: current.documents.map((document, documentIndex) => (
                                documentIndex === index ? { ...document, title: event.target.value } : document
                              )),
                            }))}
                          />
                          <TextField
                            label="Descrição"
                            fullWidth
                            disabled={readOnly}
                            value={item.description}
                            onChange={(event) => setContent((current) => ({
                              ...current,
                              documents: current.documents.map((document, documentIndex) => (
                                documentIndex === index ? { ...document, description: event.target.value } : document
                              )),
                            }))}
                          />
                          {item.fileUrl?.startsWith('data:') && <Alert severity="info">Arquivo selecionado; será enviado ao salvar.</Alert>}
                        </Stack>
                      </Paper>
                    ))}
                    {!content.documents.length && <Typography color="text.secondary">Nenhum documento publicado.</Typography>}
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
