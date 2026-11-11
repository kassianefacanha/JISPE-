import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api, { getApiErrorMessage } from '../services/api';

const MetricCard = ({ title, value, color = '#047857' }) => (
  <Card variant="outlined" sx={{ height: '100%', borderColor: '#e2e8f0' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Typography variant="body2" color="text.secondary">{title}</Typography>
      <Typography variant="h4" fontWeight={800} color={color} sx={{ mt: 0.75 }}>{value}</Typography>
    </CardContent>
  </Card>
);

const StatBars = ({ items, color = '#10b981' }) => {
  const maxValue = Math.max(1, ...items.map((item) => item.value));

  return (
    <Stack spacing={2}>
      {items.map((item) => (
        <Box key={item.label}>
          <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ mb: 0.75 }}>
            <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{item.label}</Typography>
            <Typography variant="body2" fontWeight={700}>{item.value}</Typography>
          </Stack>
          <Box sx={{ height: 8, borderRadius: 99, bgcolor: '#f1f5f9', overflow: 'hidden' }}>
            <Box sx={{ width: `${(item.value / maxValue) * 100}%`, height: '100%', borderRadius: 99, bgcolor: color }} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
};

export default function AdminStatisticsPage() {
  const [entities, setEntities] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api.get('/entities'), api.get('/athletes')])
      .then(([entitiesResponse, athletesResponse]) => {
        if (!active) return;
        setEntities(entitiesResponse.data.entities || []);
        setAthletes(athletesResponse.data.athletes || []);
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'Não foi possível carregar as estatísticas.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const statistics = useMemo(() => {
    const representedEntities = new Set(athletes
      .map((athlete) => String(athlete.entityId?._id || athlete.entityId || ''))
      .filter(Boolean));
    const modalityCounts = new Map();
    athletes.forEach((athlete) => {
      [...new Set([athlete.modality, ...(athlete.modalities || [])].filter(Boolean))]
        .forEach((modality) => modalityCounts.set(modality, (modalityCounts.get(modality) || 0) + 1));
    });

    return {
      representedEntities: representedEntities.size,
      approvedEntitiesWithoutAthletes: entities.filter(
        (entity) => entity.status === 'approved' && !representedEntities.has(String(entity._id))
      ).length,
      athletesWithoutPhotos: athletes.filter((athlete) => !athlete.photoUrl).length,
      athletesWithoutProofs: athletes.filter((athlete) => !athlete.proofUrl).length,
      modalityCounts: [...modalityCounts]
        .map(([label, value]) => ({ label, value }))
        .sort((first, second) => second.value - first.value || first.label.localeCompare(second.label, 'pt-BR')),
      approval: [
        { label: 'Aprovados', value: athletes.filter((athlete) => (athlete.approvalStatus || 'approved') === 'approved').length },
        { label: 'Aguardando aprovação', value: athletes.filter((athlete) => athlete.approvalStatus === 'pending').length },
        { label: 'Reprovados', value: athletes.filter((athlete) => athlete.approvalStatus === 'rejected').length },
      ],
      entityApproval: [
        { label: 'Aprovados', value: entities.filter((entity) => entity.status === 'approved').length },
        { label: 'Aguardando aprovação', value: entities.filter((entity) => entity.status === 'pending').length },
        { label: 'Reprovados', value: entities.filter((entity) => entity.status === 'rejected').length },
      ],
      gender: [
        { label: 'Masculino', value: athletes.filter((athlete) => (athlete.naipe || athlete.gender) === 'masculino').length },
        { label: 'Feminino', value: athletes.filter((athlete) => (athlete.naipe || athlete.gender) === 'feminino').length },
        { label: 'Misto', value: athletes.filter((athlete) => (athlete.naipe || athlete.gender) === 'misto').length },
      ],
    };
  }, [athletes]);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc', pt: { xs: 3, md: 5 }, pb: { xs: 14, md: 5 }, px: 2 }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
            <Box>
              <Button component={Link} to="/admin" startIcon={<ArrowBackIcon />} sx={{ mb: 1 }}>
                Voltar ao painel
              </Button>
              <Typography variant="h4" fontWeight={800}>Estatísticas</Typography>
              <Typography color="text.secondary">Visão geral dos órgãos, atletas e modalidades.</Typography>
            </Box>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}
          {loading ? (
            <Paper sx={{ p: 3 }}><Typography color="text.secondary">Carregando estatísticas...</Typography></Paper>
          ) : !error && (
            <>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}><MetricCard title="Atletas cadastrados" value={athletes.length} /></Grid>
                <Grid item xs={6} md={3}><MetricCard title="Órgãos cadastrados" value={entities.length} color="#1d4ed8" /></Grid>
                <Grid item xs={6} md={3}><MetricCard title="Órgãos participantes" value={statistics.representedEntities} color="#7c3aed" /></Grid>
                <Grid item xs={6} md={3}><MetricCard title="Órgãos aprovados sem atletas" value={statistics.approvedEntitiesWithoutAthletes} color="#be123c" /></Grid>
                <Grid item xs={6} md={3}><MetricCard title="Modalidades" value={statistics.modalityCounts.length} color="#c2410c" /></Grid>
                <Grid item xs={6} md={3}><MetricCard title="Fotos pendentes" value={statistics.athletesWithoutPhotos} color="#b45309" /></Grid>
                <Grid item xs={6} md={3}><MetricCard title="Comprovantes pendentes" value={statistics.athletesWithoutProofs} color="#b45309" /></Grid>
              </Grid>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
                    <Typography variant="h6" fontWeight={800} sx={{ mb: 2.5 }}>Atletas por modalidade</Typography>
                    {statistics.modalityCounts.length
                      ? <StatBars items={statistics.modalityCounts} />
                      : <Typography color="text.secondary">Ainda não há inscrições por modalidade.</Typography>}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2} sx={{ height: '100%' }}>
                    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, flex: 1 }}>
                      <Typography variant="h6" fontWeight={800} sx={{ mb: 2.5 }}>Situação dos órgãos</Typography>
                      <StatBars items={statistics.entityApproval} color="#f97316" />
                    </Paper>
                    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, flex: 1 }}>
                      <Typography variant="h6" fontWeight={800} sx={{ mb: 2.5 }}>Situação dos cadastros</Typography>
                      <StatBars items={statistics.approval} color="#3b82f6" />
                    </Paper>
                    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, flex: 1 }}>
                      <Typography variant="h6" fontWeight={800} sx={{ mb: 2.5 }}>Atletas por naipe</Typography>
                      <StatBars items={statistics.gender} color="#8b5cf6" />
                    </Paper>
                  </Stack>
                </Grid>
              </Grid>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
