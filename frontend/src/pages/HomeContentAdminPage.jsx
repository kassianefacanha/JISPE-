import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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

const emptyContent = { news: [], documents: [] };

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

  const addPost = () => setContent((current) => ({
    ...current,
    news: [...current.news, {
      title: '',
      type: 'Informativa',
      summary: '',
      body: '',
      link: '',
      publishedAt: new Date().toISOString(),
    }],
  }));
  const updatePost = (index, key, value) => setContent((current) => ({
    ...current,
    news: current.news.map((item, itemIndex) => (
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
      ...(field === 'documents' ? {
        news: current.news.map((news) => (
          news.documentId === (current.documents[index]._id || current.documents[index].clientId)
            ? { ...news, documentId: '' }
            : news
        )),
      } : {}),
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
          clientId: crypto.randomUUID(),
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

  const renderNews = () => (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography variant="h6">Notícias</Typography>
          <Button startIcon={<AddIcon />} disabled={readOnly} onClick={addPost}>
            Adicionar
          </Button>
        </Stack>
        {content.news.map((item, index) => (
          <Paper key={item._id || `news-${index}`} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={700}>Notícia {index + 1}</Typography>
                {!readOnly && (
                  <IconButton
                    aria-label={`Excluir notícia ${index + 1}`}
                    color="error"
                    onClick={() => removeItem('news', index, 'a notícia')}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                )}
              </Stack>
              <FormControl fullWidth disabled={readOnly}>
                <InputLabel id={`news-type-${index}`}>Tipo da notícia</InputLabel>
                <Select
                  labelId={`news-type-${index}`}
                  label="Tipo da notícia"
                  value={item.type || 'Informativa'}
                  onChange={(event) => updatePost(index, 'type', event.target.value)}
                >
                  {['Boletim', 'Informativa', 'Aviso', 'Comunicado', 'Outra'].map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Título"
                required
                fullWidth
                disabled={readOnly}
                value={item.title}
                onChange={(event) => updatePost(index, 'title', event.target.value)}
              />
              <TextField
                label="Resumo"
                fullWidth
                disabled={readOnly}
                value={item.summary}
                onChange={(event) => updatePost(index, 'summary', event.target.value)}
              />
              <TextField
                label="Texto"
                fullWidth
                multiline
                minRows={3}
                disabled={readOnly}
                value={item.body}
                onChange={(event) => updatePost(index, 'body', event.target.value)}
              />
              <TextField
                label="Link complementar (opcional)"
                type="url"
                fullWidth
                disabled={readOnly}
                placeholder="https://exemplo.com"
                helperText="Será exibido junto ao texto completo da notícia. Use um endereço http:// ou https://."
                inputProps={{ maxLength: 2048 }}
                value={item.link || ''}
                onChange={(event) => updatePost(index, 'link', event.target.value)}
              />
              <FormControl fullWidth disabled={readOnly || !content.documents.length}>
                <InputLabel id={`news-document-${index}`}>Documento para baixar (opcional)</InputLabel>
                <Select
                  labelId={`news-document-${index}`}
                  label="Documento para baixar (opcional)"
                  value={item.documentId || ''}
                  onChange={(event) => updatePost(index, 'documentId', event.target.value)}
                >
                  <MenuItem value="">Nenhum documento vinculado</MenuItem>
                  {content.documents.map((document, documentIndex) => {
                    const documentId = document._id || document.clientId;
                    return (
                      <MenuItem key={documentId || documentIndex} value={documentId}>
                        {document.title || document.fileName}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Stack>
          </Paper>
        ))}
        {!content.news.length && <Typography color="text.secondary">Nenhuma notícia publicada.</Typography>}
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
              <Typography variant="h4" fontWeight={800}>Notícias e documentos</Typography>
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
                {renderNews()}

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
                      <Paper key={item._id || item.clientId || `document-${index}`} variant="outlined" sx={{ p: 2 }}>
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
                          {item.fileUrl?.startsWith('data:') && (
                            <Alert severity="info">Documento disponível para vincular às notícias após o envio.</Alert>
                          )}
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
