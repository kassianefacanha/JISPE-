import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Button,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { DataGrid, ptBR } from '@mui/x-data-grid';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useFeedback } from '../contexts/FeedbackContext';

const athleteExportColumns = [
  { key: 'fullName', label: 'Nome' },
  { key: 'entityName', label: 'Entidade' },
  { key: 'matricula', label: 'Matrícula' },
  { key: 'cpf', label: 'CPF' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Telefone' },
  { key: 'modality', label: 'Modalidade' },
  { key: 'naipe', label: 'Naipe' },
  { key: 'birthDate', label: 'Data de nascimento' },
];

const downloadFile = (filename, content, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const escapeCsvValue = (value) => {
  const text = String(value ?? '').replace(/\r?\n/g, ' ');
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const formatBirthDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

export default function EntityDashboard() {
  const { user, logout } = useAuth();
  const { notify, confirm } = useFeedback();
  const [athletes, setAthletes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [columnVisibilityModel, setColumnVisibilityModel] = useState({});
  const [detailAthlete, setDetailAthlete] = useState(null);
  const [exportDialog, setExportDialog] = useState({ open: false, type: 'csv', selectedColumns: [] });

  const loadAthletes = async () => {
    try {
      const athletesResponse = await api.get('/athletes');
      setAthletes(athletesResponse.data.athletes || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadAthletes();
  }, []);

  const searchValue = searchTerm.trim().toLocaleLowerCase('pt-BR');
  const filteredAthletes = athletes.filter((athlete) => (
    !searchValue || [athlete.fullName, athlete.matricula, athlete.cpf, athlete.email, athlete.phone, athlete.modality]
      .some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(searchValue))
  ));

  const athleteRows = filteredAthletes.map((athlete) => ({
    ...athlete,
    entityName: user?.name || '—',
    matricula: athlete.matricula || '—',
    cpf: athlete.cpf || '—',
    email: athlete.email || '—',
    phone: athlete.phone || '—',
    modality: athlete.modality || '—',
    naipe: athlete.naipe || athlete.gender || '—',
    birthDate: formatBirthDate(athlete.birthDate),
  }));

  const deleteAthlete = async (athlete) => {
    const confirmed = await confirm({
      title: 'Excluir atleta',
      message: `Deseja excluir o atleta "${athlete.fullName || 'selecionado'}"?`,
      confirmLabel: 'Excluir',
      severity: 'error',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/athletes/${athlete._id}`);
      await loadAthletes();
      notify('Atleta excluído com sucesso.', 'success');
    } catch (error) {
      notify(error.response?.data?.message || 'Erro ao excluir atleta.');
    }
  };

  const downloadBadge = async (athlete) => {
    try {
      const response = await api.get(`/athletes/${athlete._id}/badge`, { responseType: 'blob' });
      downloadFile(`carteirinha-${athlete.matricula || athlete._id}.pdf`, response.data, 'application/pdf');
      notify('Carteirinha gerada. O download foi iniciado.', 'success');
    } catch (error) {
      let message = error.response?.data?.message || error.message || 'Erro ao gerar carteirinha.';
      if (error.response?.data instanceof Blob) {
        try {
          const payload = JSON.parse(await error.response.data.text());
          message = payload.message || message;
        } catch {
          message = 'Erro ao gerar carteirinha.';
        }
      }
      notify(message);
    }
  };

  const openExportDialog = (type) => {
    setExportDialog({
      open: true,
      type,
      selectedColumns: athleteExportColumns.map((column) => column.key),
    });
    setExportMenuAnchor(null);
  };

  const exportAthletes = () => {
    const columns = athleteExportColumns.filter((column) => exportDialog.selectedColumns.includes(column.key));
    const filename = 'atletas-entidade';

    if (exportDialog.type === 'csv') {
      const lines = [
        columns.map((column) => escapeCsvValue(column.label)).join(','),
        ...athleteRows.map((row) => columns.map((column) => escapeCsvValue(row[column.key])).join(',')),
      ];
      downloadFile(`${filename}.csv`, `\uFEFF${lines.join('\n')}\n`, 'text/csv;charset=utf-8;');
    } else if (exportDialog.type === 'excel') {
      const rows = athleteRows.map((row) => Object.fromEntries(columns.map((column) => [column.label, row[column.key] ?? ''])));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Atletas');
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      downloadFile(`${filename}.xlsx`, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
      const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = document.internal.pageSize.getWidth();
      const pageHeight = document.internal.pageSize.getHeight();
      let cursorY = 42;
      document.setFont('helvetica', 'bold');
      document.setFontSize(14);
      document.text('Atletas cadastrados', 32, cursorY);
      cursorY += 24;
      document.setFont('helvetica', 'normal');
      document.setFontSize(8);

      athleteRows.forEach((row) => {
        const content = columns.map((column) => `${column.label}: ${row[column.key] ?? '—'}`).join(' | ');
        const lines = document.splitTextToSize(content, pageWidth - 64);
        const rowHeight = lines.length * 11 + 8;
        if (cursorY + rowHeight > pageHeight - 32) {
          document.addPage();
          cursorY = 36;
        }
        document.text(lines, 32, cursorY);
        cursorY += rowHeight;
      });

      downloadFile(`${filename}.pdf`, document.output('blob'), 'application/pdf');
    }

    setExportDialog((current) => ({ ...current, open: false }));
  };

  const athleteColumns = [
    { field: 'fullName', headerName: 'Nome', flex: 1.5, minWidth: 180 },
    { field: 'entityName', headerName: 'Entidade', flex: 1, minWidth: 150 },
    { field: 'matricula', headerName: 'Matrícula', flex: 1, minWidth: 120 },
    { field: 'cpf', headerName: 'CPF', flex: 1, minWidth: 120 },
    { field: 'email', headerName: 'E-mail', flex: 1.2, minWidth: 160 },
    { field: 'phone', headerName: 'Telefone', flex: 1, minWidth: 130 },
    { field: 'modality', headerName: 'Modalidade', flex: 1, minWidth: 140 },
    { field: 'naipe', headerName: 'Naipe', flex: 1, minWidth: 110 },
    { field: 'birthDate', headerName: 'Data de nascimento', flex: 1, minWidth: 150 },
  ].map((column) => ({
    ...column,
    sortable: false,
    filterable: true,
    renderCell: (params) => (
      <Box sx={{ fontWeight: column.field === 'fullName' ? 700 : 400, display: 'flex', alignItems: 'center', minHeight: '100%' }}>
        {params.value ?? '—'}
      </Box>
    ),
  }));

  athleteColumns.push({
    field: 'actions',
    headerName: 'Ações',
    width: 164,
    sortable: false,
    filterable: false,
    disableColumnMenu: true,
    renderCell: (params) => (
      <Stack direction="row" spacing={0.25}>
        <IconButton color="info" size="small" onClick={() => setDetailAthlete(params.row)} title="Ver detalhes">
          <VisibilityIcon fontSize="small" />
        </IconButton>
        <IconButton color="warning" size="small" component={Link} to={`/entity/atletas/novo?id=${params.row._id}`} title="Editar">
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton color="inherit" size="small" onClick={() => deleteAthlete(params.row)} title="Excluir">
          <DeleteIcon fontSize="small" />
        </IconButton>
        <IconButton color="secondary" size="small" onClick={() => downloadBadge(params.row)} title="Gerar carteirinha">
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Stack>
    ),
  });

  const toggleColumnVisibility = (field) => {
    setColumnVisibilityModel((current) => ({ ...current, [field]: current[field] === false }));
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc', py: { xs: 3, md: 6 }, px: 2 }}>
      <Container maxWidth="xl">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
            <Box component="img" src="/logo.png" alt="JISPE 2026" sx={{ display: 'block', width: { xs: 72, sm: 104 }, maxWidth: '35vw', height: 'auto', flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="primary.main" sx={{ letterSpacing: 3, fontWeight: 800 }}>
                Entidade
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: 22, sm: 34 }, lineHeight: 1.15 }}>
                Painel da entidade
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" color="inherit" onClick={logout}>Sair</Button>
          </Stack>
        </Stack>

        <Paper sx={{ p: { xs: 2, md: 3 }, border: '1px solid #e2e8f0' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="caption" color="text.secondary">Entidade</Typography>
              <Typography variant="h6" fontWeight={700}>{user?.name || 'Entidade'}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="caption" color="text.secondary">Atletas cadastrados</Typography>
              <Typography variant="h5" fontWeight={800}>{athletes.length}</Typography>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ mt: 4, p: { xs: 2, md: 3 }, borderRadius: 4, border: '1px solid #e2e8f0' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              Atletas cadastrados
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField
                size="small"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar atleta"
                inputProps={{ 'aria-label': 'Buscar atleta' }}
                sx={{ width: { xs: '100%', sm: 220 } }}
              />
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button variant="outlined" size="small" sx={{ textTransform: 'none', minWidth: 100 }} onClick={(event) => setColumnMenuAnchor(event.currentTarget)}>
                  Colunas
                </Button>
                <Button variant="contained" size="small" startIcon={<DownloadIcon />} sx={{ textTransform: 'none', minWidth: 110 }} onClick={(event) => setExportMenuAnchor(event.currentTarget)}>
                  Exportar
                </Button>
                <Button component={Link} to="/entity/atletas/novo" variant="contained" size="small" startIcon={<AddIcon />} sx={{ textTransform: 'none', minWidth: 150 }}>
                  Novo cadastro
                </Button>
              </Stack>
            </Stack>
          </Stack>

          <Menu anchorEl={columnMenuAnchor} open={Boolean(columnMenuAnchor)} onClose={() => setColumnMenuAnchor(null)}>
            <Box sx={{ p: 1, minWidth: 220 }}>
              {athleteExportColumns.map((column) => (
                <Stack key={column.key} direction="row" alignItems="center" spacing={1} sx={{ px: 1, py: 0.5 }}>
                  <Checkbox checked={columnVisibilityModel[column.key] !== false} onChange={() => toggleColumnVisibility(column.key)} size="small" />
                  <Typography variant="body2">{column.label}</Typography>
                </Stack>
              ))}
            </Box>
          </Menu>

          <Menu anchorEl={exportMenuAnchor} open={Boolean(exportMenuAnchor)} onClose={() => setExportMenuAnchor(null)}>
            <MenuItem onClick={() => openExportDialog('csv')}>CSV</MenuItem>
            <MenuItem onClick={() => openExportDialog('excel')}>Excel</MenuItem>
            <MenuItem onClick={() => openExportDialog('pdf')}>PDF</MenuItem>
          </Menu>

          <Paper variant="outlined" sx={{ overflow: 'hidden', p: 1.5 }}>
            <DataGrid
              rows={athleteRows.map((row) => ({ ...row, id: row._id }))}
              columns={athleteColumns}
              autoHeight
              disableRowSelectionOnClick
              disableColumnMenu
              pageSizeOptions={[5, 10, 25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 100 } } }}
              columnVisibilityModel={columnVisibilityModel}
              onColumnVisibilityModelChange={setColumnVisibilityModel}
              sx={{
                border: 0,
                '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f8fafc', fontWeight: 700 },
                '& .MuiDataGrid-row:hover': { backgroundColor: '#f8fafc' },
              }}
              localeText={{
                ...ptBR.components.MuiDataGrid.defaultProps.localeText,
                noRowsLabel: searchValue ? 'Nenhum atleta encontrado.' : 'Ainda não há atletas cadastrados.',
              }}
            />
          </Paper>
        </Paper>
      </Container>

      <Dialog open={Boolean(detailAthlete)} onClose={() => setDetailAthlete(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Detalhes do atleta</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            {[
              ['Nome', detailAthlete?.fullName],
              ['CPF', detailAthlete?.cpf],
              ['Matrícula', detailAthlete?.matricula],
              ['E-mail', detailAthlete?.email],
              ['Telefone', detailAthlete?.phone],
              ['Modalidade', detailAthlete?.modality],
              ['Naipe', detailAthlete?.naipe || detailAthlete?.gender],
              ['Categoria', detailAthlete?.ageCategory],
              ['Data de nascimento', formatBirthDate(detailAthlete?.birthDate)],
            ].map(([label, value]) => (
              <Typography key={label}><strong>{label}:</strong> {value || '—'}</Typography>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailAthlete(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={exportDialog.open} onClose={() => setExportDialog((current) => ({ ...current, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>Selecionar colunas para exportação</DialogTitle>
        <DialogContent>
          <Grid container spacing={1} sx={{ mt: 0.5 }}>
            {athleteExportColumns.map((column) => (
              <Grid item xs={12} sm={6} key={column.key}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Checkbox
                    checked={exportDialog.selectedColumns.includes(column.key)}
                    onChange={() => setExportDialog((current) => ({
                      ...current,
                      selectedColumns: current.selectedColumns.includes(column.key)
                        ? current.selectedColumns.filter((key) => key !== column.key)
                        : [...current.selectedColumns, column.key],
                    }))}
                  />
                  <Typography variant="body2">{column.label}</Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog((current) => ({ ...current, open: false }))}>Cancelar</Button>
          <Button variant="contained" onClick={exportAthletes} disabled={!exportDialog.selectedColumns.length}>Exportar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
