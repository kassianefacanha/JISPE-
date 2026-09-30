import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, ptBR } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useAuth } from '../contexts/AuthContext';
import { useFeedback } from '../contexts/FeedbackContext';
import AdminRegistrationSettings from './AdminRegistrationSettings';
import api, { getApiErrorMessage } from '../services/api';

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

const formatBirthDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const escapeCsvValue = (value) => {
  const text = String(value ?? '').replace(/\r?\n/g, ' ');
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const exportCsv = (rows, columns, filename) => {
  const csvRows = [
    columns.map((column) => escapeCsvValue(column.label)).join(','),
    ...rows.map((row) => columns.map((column) => escapeCsvValue(row[column.key])).join(',')),
  ];

  downloadFile(filename, `${csvRows.join('\n')}\n`, 'text/csv;charset=utf-8;');
};

const exportExcel = (rows, columns, filename) => {
  const worksheetData = rows.map((row) => {
    const item = {};
    columns.forEach((column) => {
      item[column.label] = row[column.key] ?? '';
    });
    return item;
  });

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadFile(filename, excelBuffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
};

const getLogoPngDataUrl = async () => {
  const response = await fetch('/logo.png');
  if (!response.ok) throw new Error(`Não foi possível carregar a logo (HTTP ${response.status}).`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler a logo para montar o PDF.'));
    reader.readAsDataURL(blob);
  });
};

const exportPdf = async (rows, columns, filename) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 36;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;
  const colWidth = usableWidth / columns.length;
  const rowHeight = 22;
  const tableTop = margin + 55;
  let y = tableTop;

  const palette = {
    dark: [15, 23, 42],
    green: [16, 185, 129],
    greenSoft: [236, 253, 245],
    orange: [249, 115, 22],
    orangeSoft: [255, 247, 237],
    slate: [71, 85, 105],
    border: [203, 213, 225],
    white: [255, 255, 255],
  };

  const logoDataUrl = await getLogoPngDataUrl();
  const logoWidth = 100;
  const logoHeight = 60;
  doc.addImage(logoDataUrl, 'PNG', (pageWidth - logoWidth) / 2, 6, logoWidth, logoHeight);
  doc.setTextColor(...palette.dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Exportação em tabela', pageWidth / 2, 78, { align: 'center' });
  doc.setTextColor(...palette.dark);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  const drawHeader = () => {
    const headerY = y;
    columns.forEach((column, index) => {
      const x = margin + index * colWidth;
      doc.setFillColor(...palette.green);
      doc.setTextColor(...palette.white);
      doc.roundedRect(x, headerY, colWidth, rowHeight, 3, 3, 'F');
      const label = String(column.label || '').slice(0, 24);
      doc.text(label, x + 6, headerY + 14, { maxWidth: colWidth - 12 });
    });
    doc.setTextColor(...palette.dark);
    y += rowHeight;
  };

  const drawRow = (row) => {
    const rowData = columns.map((column) => String(row[column.key] ?? ''));
    const lineCount = Math.max(1, ...rowData.map((value) => doc.splitTextToSize(value, colWidth - 12).length));
    const cellHeight = rowHeight * lineCount;

    if (y + cellHeight > pageHeight - margin) {
      doc.addPage();
      y = tableTop;
      drawHeader();
    }

    columns.forEach((column, index) => {
      const x = margin + index * colWidth;
      const value = String(row[column.key] ?? '');
      const wrapped = doc.splitTextToSize(value, colWidth - 12);
      doc.setDrawColor(...palette.border);
      doc.setFillColor(...(index % 2 === 0 ? palette.greenSoft : palette.orangeSoft));
      doc.roundedRect(x, y, colWidth, cellHeight, 2, 2, 'F');
      doc.rect(x, y, colWidth, cellHeight);
      doc.setTextColor(...palette.dark);
      wrapped.slice(0, 3).forEach((line, lineIndex) => {
        doc.text(line, x + 6, y + 12 + lineIndex * 10);
      });
    });
    y += cellHeight;
  };

  drawHeader();
  rows.forEach((row) => {
    if (y > pageHeight - margin - 30) {
      doc.addPage();
      y = tableTop;
      drawHeader();
    }
    drawRow(row);
  });
  downloadFile(filename, doc.output('blob'), 'application/pdf');
};

export default function AdminDashboard() {
  const { logout } = useAuth();
  const { notify, confirm } = useFeedback();
  const [activeTab, setActiveTab] = useState('entidades');
  const [entities, setEntities] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [entityFilter, setEntityFilter] = useState({ search: '', status: 'all' });
  const [athleteFilter, setAthleteFilter] = useState({ search: '', entity: 'all' });
  const [entityColumnMenuAnchor, setEntityColumnMenuAnchor] = useState(null);
  const [athleteColumnMenuAnchor, setAthleteColumnMenuAnchor] = useState(null);
  const [entityExportMenuAnchor, setEntityExportMenuAnchor] = useState(null);
  const [athleteExportMenuAnchor, setAthleteExportMenuAnchor] = useState(null);
  const [exportDialog, setExportDialog] = useState({ open: false, tab: 'entidades', type: 'csv', selectedColumns: [] });
  const [detailDialog, setDetailDialog] = useState({ open: false, type: 'entidade', data: null });
  const [entityColumnVisibilityModel, setEntityColumnVisibilityModel] = useState({});
  const [athleteColumnVisibilityModel, setAthleteColumnVisibilityModel] = useState({});

  const entityMap = useMemo(
    () => Object.fromEntries(entities.map((entity) => [entity._id, entity])),
    [entities]
  );

  const filteredEntities = useMemo(() => {
    const searchValue = entityFilter.search.trim().toLowerCase();

    return entities.filter((entity) => {
      const matchesSearch = !searchValue || [entity.name, entity.email, entity.responsible?.fullName, entity.responsible?.cpf].some((value) => String(value || '').toLowerCase().includes(searchValue));
      const matchesStatus = entityFilter.status === 'all' || entity.status === entityFilter.status;
      return matchesSearch && matchesStatus;
    });
  }, [entities, entityFilter]);

  const filteredAthletes = useMemo(() => {
    const searchValue = athleteFilter.search.trim().toLowerCase();

    return athletes.filter((athlete) => {
      const entityStatus = entityMap[athlete.entityId]?.status;
      const entityName = entityMap[athlete.entityId]?.name || '';
      const matchesSearch = !searchValue || [athlete.fullName, athlete.cpf, athlete.email, athlete.matricula, entityName].some((value) => String(value || '').toLowerCase().includes(searchValue));
      const matchesEntity = athleteFilter.entity === 'all' || athlete.entityId === athleteFilter.entity;
      const matchesStatus = entityFilter.status === 'all' || entityStatus === entityFilter.status;
      return matchesSearch && matchesEntity && matchesStatus;
    });
  }, [athletes, entityMap, athleteFilter, entityFilter.status]);

  const stats = useMemo(() => {
    const representedEntities = new Set(
      athletes.map((athlete) => String(athlete.entityId?._id || athlete.entityId || '')).filter(Boolean)
    );
    const modalityCounts = athletes.reduce((counts, athlete) => {
      const modality = String(athlete.modality || '').trim();
      if (modality) counts.set(modality, (counts.get(modality) || 0) + 1);
      return counts;
    }, new Map());
    const representedModalities = modalityCounts.size;
    const modalityStats = Array.from(modalityCounts, ([modality, count]) => ({
      title: `Modalidade: ${modality}`,
      value: count,
      color: 'green',
    })).sort((first, second) => second.value - first.value || first.title.localeCompare(second.title, 'pt-BR'));

    if (activeTab === 'entidades') {
      return [
        { title: 'Total de entidades', value: entities.length, color: 'slate' },
        { title: 'Pendentes de aprovação', value: entities.filter((entity) => entity.status === 'pending').length, color: 'orange' },
        { title: 'Aprovadas', value: entities.filter((entity) => entity.status === 'approved').length, color: 'green' },
        { title: 'Rejeitadas', value: entities.filter((entity) => entity.status === 'rejected').length, color: 'red' },
        { title: 'Atletas vinculados', value: athletes.length, color: 'blue' },
        { title: 'Aprovadas sem atletas', value: entities.filter((entity) => entity.status === 'approved' && !representedEntities.has(String(entity._id))).length, color: 'purple' },
      ];
    }

    if (activeTab === 'modalidades') {
      return [
        { title: 'Atletas cadastrados', value: athletes.length, color: 'slate' },
        { title: 'Modalidades representadas', value: representedModalities, color: 'orange' },
        ...modalityStats,
      ];
    }

    if (activeTab !== 'atletas') return [];

    return [
      { title: 'Atletas cadastrados', value: athletes.length, color: 'slate' },
      { title: 'Masculino', value: athletes.filter((athlete) => (athlete.naipe || athlete.gender) === 'masculino').length, color: 'blue' },
      { title: 'Feminino', value: athletes.filter((athlete) => (athlete.naipe || athlete.gender) === 'feminino').length, color: 'pink' },
      { title: 'Misto', value: athletes.filter((athlete) => (athlete.naipe || athlete.gender) === 'misto').length, color: 'purple' },
      { title: 'Entidades participantes', value: representedEntities.size, color: 'green' },
      { title: 'Modalidades representadas', value: representedModalities, color: 'orange' },
      { title: 'Fotos pendentes', value: athletes.filter((athlete) => !athlete.photoUrl).length, color: 'red' },
      { title: 'Comprovantes pendentes', value: athletes.filter((athlete) => !athlete.proofUrl).length, color: 'orange' },
      ...modalityStats,
    ];
  }, [activeTab, athletes, entities]);

  const loadData = async () => {
    try {
      const [entitiesResponse, athletesResponse] = await Promise.all([
        api.get('/entities'),
        api.get('/athletes'),
      ]);
      setEntities(entitiesResponse.data.entities || []);
      setAthletes(athletesResponse.data.athletes || []);
    } catch (error) {
      notify(getApiErrorMessage(error, 'Não foi possível carregar os dados do painel.'));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateEntityStatus = async (id, status) => {
    try {
      const action = status === 'approved' ? 'approve' : 'reject';
      const response = await api.patch(`/entities/${id}/${action}`);
      await loadData();
      notify(
        response.data.emailStatus === 'pending'
          ? 'Status atualizado. O envio do e-mail foi iniciado em segundo plano.'
          : response.data.emailSent === false
            ? 'Status atualizado, mas o e-mail não foi enviado. Verifique a configuração SMTP.'
          : 'Status da entidade atualizado com sucesso.',
        response.data.emailStatus === 'pending' ? 'info' : response.data.emailSent === false ? 'warning' : 'success'
      );
    } catch (error) {
      notify(getApiErrorMessage(error, 'Erro ao alterar status.'));
    }
  };

  const deleteEntity = async (id) => {
    const entity = entities.find((item) => item._id === id);
    const associatedAthletes = athletes.filter((athlete) => athlete.entityId === id).map((athlete) => athlete.fullName).filter(Boolean);

    if (associatedAthletes.length > 0) {
      notify(`Não é possível excluir a entidade "${entity?.name || 'selecionada'}" porque há atletas associados: ${associatedAthletes.join(', ')}.`, 'warning');
      return;
    }

    const confirmed = await confirm({
      title: 'Excluir entidade',
      message: `Deseja excluir a entidade "${entity?.name || 'selecionada'}"?`,
      confirmLabel: 'Excluir',
      severity: 'error',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/entities/${id}`);
      await loadData();
      notify('Entidade excluída com sucesso.', 'success');
    } catch (error) {
      const serverNames = error.response?.data?.athletes || [];
      if (serverNames.length > 0) {
        notify(`Não é possível excluir a entidade porque há atletas associados: ${serverNames.join(', ')}.`, 'warning');
        return;
      }
      notify(getApiErrorMessage(error, 'Erro ao excluir entidade.'));
    }
  };

  const deleteAthlete = async (id) => {
    const athlete = athletes.find((item) => item._id === id);
    const confirmed = await confirm({
      title: 'Excluir atleta',
      message: `Deseja excluir o atleta "${athlete?.fullName || 'selecionado'}"?`,
      confirmLabel: 'Excluir',
      severity: 'error',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/athletes/${id}`);
      await loadData();
      notify('Atleta excluído com sucesso.', 'success');
    } catch (error) {
      notify(getApiErrorMessage(error, 'Erro ao excluir atleta.'));
    }
  };

  const entityColumns = [
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'E-mail' },
    { key: 'status', label: 'Status' },
    { key: 'responsibleName', label: 'Responsável' },
    { key: 'responsibleCpf', label: 'CPF do responsável' },
  ];

  const athleteColumns = [
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

  const isEntityColumnVisible = (columnKey) => entityColumnVisibilityModel[columnKey] !== false;
  const isAthleteColumnVisible = (columnKey) => athleteColumnVisibilityModel[columnKey] !== false;

  const toggleEntityColumnVisibility = (columnKey) => {
    setEntityColumnVisibilityModel((current) => {
      const next = { ...current };

      if (next[columnKey] === false) {
        delete next[columnKey];
        return next;
      }

      next[columnKey] = false;
      return next;
    });
  };

  const toggleAthleteColumnVisibility = (columnKey) => {
    setAthleteColumnVisibilityModel((current) => {
      const next = { ...current };

      if (next[columnKey] === false) {
        delete next[columnKey];
        return next;
      }

      next[columnKey] = false;
      return next;
    });
  };

  const openExportDialog = (tab, type) => {
    const availableColumns = tab === 'entidades' ? entityColumns : athleteColumns;
    setExportDialog({
      open: true,
      tab,
      type,
      selectedColumns: availableColumns.map((column) => column.key),
    });
  };

  const downloadBadge = async (athleteId) => {
    try {
      const response = await api.get(`/athletes/${athleteId}/badge`, { responseType: 'blob' });
      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = `carteirinha-${athleteId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      notify('Carteirinha gerada. O download foi iniciado.', 'success');
    } catch (error) {
      let message = getApiErrorMessage(error, 'Erro ao gerar carteirinha.');
      if (error.response?.data instanceof Blob) {
        try {
          const payload = JSON.parse(await error.response.data.text());
          message = payload.message || message;
        } catch {
          message = getApiErrorMessage(error, 'Erro ao gerar carteirinha.');
        }
      }
      notify(message);
    }
  };

  const toggleExportColumn = (columnKey) => {
    setExportDialog((current) => {
      const selectedColumns = current.selectedColumns.includes(columnKey)
        ? current.selectedColumns.filter((key) => key !== columnKey)
        : [...current.selectedColumns, columnKey];

      return { ...current, selectedColumns };
    });
  };

  const prepareEntityRows = filteredEntities.map((entity) => ({
    ...entity,
    status: entity.status,
    responsibleName: entity.responsible?.fullName || '—',
    responsibleCpf: entity.responsible?.cpf || '—',
  }));

  const prepareAthleteRows = filteredAthletes.map((athlete) => ({
    ...athlete,
    entityName: entityMap[athlete.entityId]?.name || '—',
    cpf: athlete.cpf || '—',
    email: athlete.email || '—',
    phone: athlete.phone || '—',
    modality: athlete.modality || '—',
    naipe: athlete.naipe || '—',
    birthDate: formatBirthDate(athlete.birthDate),
  }));

  const entityGridColumns = [
    ...entityColumns.map((column) => {
      const field = column.key;
      const label = column.label;

      return {
        field,
        headerName: label,
        flex: field === 'name' ? 1.5 : 1,
        minWidth: field === 'status' ? 140 : 120,
        sortable: false,
        filterable: true,
        renderCell: (params) => {
          if (field === 'status') {
            const status = params.value || 'pending';
            const statusLabel = {
              pending: 'Pendente',
              approved: 'Aprovada',
              rejected: 'Rejeitada',
            }[status] || 'Pendente';

            return (
              <Chip
                label={statusLabel}
                size="small"
                color={status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'warning'}
                sx={{ fontWeight: 700 }}
              />
            );
          }

          return <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '100%' }}>{params.value ?? '—'}</Box>;
        },
      };
    }),
    {
      field: 'actions',
      headerName: 'Ações',
      width: 190,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} useFlexGap>
          {params.row.status !== 'approved' && (
            <IconButton color="success" size="small" onClick={() => updateEntityStatus(params.row._id, 'approved')} title="Aprovar">
              <CheckCircleIcon fontSize="small" />
            </IconButton>
          )}
          {params.row.status !== 'rejected' && (
            <IconButton color="error" size="small" onClick={() => updateEntityStatus(params.row._id, 'rejected')} title="Rejeitar">
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton color="info" size="small" onClick={() => setDetailDialog({ open: true, type: 'entidade', data: params.row })} title="Ver detalhes">
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton color="warning" size="small" component={Link} to={`/admin/entidades/novo?id=${params.row._id}`} title="Editar">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton color="inherit" size="small" onClick={() => deleteEntity(params.row._id)} title="Excluir">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const athleteGridColumns = [
    ...athleteColumns.map((column) => {
      const field = column.key;
      const label = column.label;

      return {
        field,
        headerName: label,
        flex: field === 'fullName' ? 1.5 : 1,
        minWidth: 120,
        sortable: false,
        filterable: true,
        renderCell: (params) => {
          if (field === 'fullName') {
            return <Box sx={{ fontWeight: 700, display: 'flex', alignItems: 'center' }}>{params.value ?? '—'}</Box>;
          }

          return <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '100%' }}>{params.value ?? '—'}</Box>;
        },
      };
    }),
    {
      field: 'actions',
      headerName: 'Ações',
      width: 190,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} useFlexGap>
          <IconButton color="info" size="small" onClick={() => setDetailDialog({ open: true, type: 'atleta', data: params.row })} title="Ver detalhes">
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton color="warning" size="small" component={Link} to={`/admin/atletas/novo?id=${params.row._id}`} title="Editar">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton color="inherit" size="small" onClick={() => deleteAthlete(params.row._id)} title="Excluir">
            <DeleteIcon fontSize="small" />
          </IconButton>
          <IconButton color="secondary" size="small" onClick={() => downloadBadge(params.row._id)} title="Gerar carteirinha">
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const finalizeExport = async () => {
    const currentRows = exportDialog.tab === 'entidades' ? prepareEntityRows : prepareAthleteRows;
    const selectedColumns = (exportDialog.tab === 'entidades' ? entityColumns : athleteColumns).filter((column) => exportDialog.selectedColumns.includes(column.key));

    if (selectedColumns.length === 0) {
      notify('Selecione ao menos uma coluna para exportar.', 'warning');
      return;
    }

    const filenamePrefix = exportDialog.tab === 'entidades' ? 'entidades' : 'atletas';
    try {
      if (exportDialog.type === 'csv') {
        exportCsv(currentRows, selectedColumns, `${filenamePrefix}.csv`);
      } else if (exportDialog.type === 'excel') {
        exportExcel(currentRows, selectedColumns, `${filenamePrefix}.xlsx`);
      } else if (exportDialog.type === 'pdf') {
        await exportPdf(currentRows, selectedColumns, `${filenamePrefix}.pdf`);
      }
      notify('Arquivo exportado com sucesso.', 'success');
    } catch (error) {
      notify(error.message || 'Não foi possível exportar os dados para PDF.');
      return;
    }

    setExportDialog({ open: false, tab: 'entidades', type: 'csv', selectedColumns: [] });
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc', py: { xs: 3, md: 5 }, px: 2 }}>
      <Container maxWidth="xl">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
            <Box component="img" src="/logo.png" alt="JISPE 2026" sx={{ display: 'block', width: { xs: 72, sm: 104 }, maxWidth: '35vw', height: 'auto', flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="primary.main" sx={{ letterSpacing: 3, fontWeight: 800 }}>
                Admin
              </Typography>
              <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ fontSize: { xs: 22, sm: 34 }, lineHeight: 1.15 }}>
                Dashboard administrativo
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button component={Link} to="/perfil" variant="outlined" startIcon={<ManageAccountsIcon />}>
              Perfil
            </Button>
            <Button variant="contained" color="inherit" onClick={logout}>
              Sair
            </Button>
          </Stack>
        </Stack>

        {stats.length > 0 && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {stats.map((card) => (
              <Grid item xs={12} sm={6} md={3} key={card.title}>
                <StatCard title={card.title} value={card.value} color={card.color} />
              </Grid>
            ))}
          </Grid>
        )}

        <Paper sx={{ border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              borderBottom: '1px solid #e2e8f0',
              '& .MuiTab-root': { minWidth: { xs: 118, sm: 160 }, whiteSpace: 'nowrap' },
            }}
          >
            <Tab value="entidades" label="Entidades" />
            <Tab value="atletas" label="Atletas" />
            <Tab value="modalidades" label="Modalidades" />
          </Tabs>

          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {activeTab === 'entidades' ? (
              <Box>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ alignSelf: 'center' }}>
                      Entidades cadastradas
                    </Typography>
                    <TextField
                      value={entityFilter.search}
                      onChange={(event) => setEntityFilter((current) => ({ ...current, search: event.target.value }))}
                      placeholder="Buscar entidade"
                      size="small"
                      sx={{ minWidth: { xs: '100%', md: 220 } }}
                    />
                    <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 180 } }}>
                      <InputLabel id="entity-status-label">Status</InputLabel>
                      <Select
                        labelId="entity-status-label"
                        value={entityFilter.status}
                        label="Status"
                        onChange={(event) => setEntityFilter((current) => ({ ...current, status: event.target.value }))}
                      >
                        <MenuItem value="all">Todos os status</MenuItem>
                        <MenuItem value="pending">Pendentes</MenuItem>
                        <MenuItem value="approved">Aprovadas</MenuItem>
                        <MenuItem value="rejected">Rejeitadas</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ textTransform: 'none', minWidth: 110 }}
                      onClick={(event) => setEntityColumnMenuAnchor(event.currentTarget)}
                    >
                      Colunas
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      sx={{ textTransform: 'none', minWidth: 110 }}
                      startIcon={<DownloadIcon />}
                      onClick={(event) => setEntityExportMenuAnchor(event.currentTarget)}
                    >
                      Exportar
                    </Button>
                    <Button
                      component={Link}
                      to="/admin/entidades/novo"
                      variant="contained"
                      size="small"
                      sx={{ textTransform: 'none', minWidth: 140 }}
                      startIcon={<AddIcon />}
                    >
                      Novo cadastro
                    </Button>
                  </Stack>
                </Stack>

                <Menu
                  anchorEl={entityColumnMenuAnchor}
                  open={Boolean(entityColumnMenuAnchor)}
                  onClose={() => setEntityColumnMenuAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <Box sx={{ p: 1, minWidth: 220 }}>
                    {entityColumns.map((column) => (
                      <Stack key={column.key} direction="row" alignItems="center" spacing={1} sx={{ px: 1, py: 0.5 }}>
                        <Checkbox
                          checked={isEntityColumnVisible(column.key)}
                          onChange={() => toggleEntityColumnVisibility(column.key)}
                          size="small"
                        />
                        <Typography variant="body2">{column.label}</Typography>
                      </Stack>
                    ))}
                  </Box>
                </Menu>

                <Menu
                  anchorEl={entityExportMenuAnchor}
                  open={Boolean(entityExportMenuAnchor)}
                  onClose={() => setEntityExportMenuAnchor(null)}
                >
                  <MenuItem onClick={() => { openExportDialog('entidades', 'csv'); setEntityExportMenuAnchor(null); }}>CSV</MenuItem>
                  <MenuItem onClick={() => { openExportDialog('entidades', 'excel'); setEntityExportMenuAnchor(null); }}>Excel</MenuItem>
                  <MenuItem onClick={() => { openExportDialog('entidades', 'pdf'); setEntityExportMenuAnchor(null); }}>PDF</MenuItem>
                </Menu>

                <Paper variant="outlined" sx={{ overflow: 'hidden', p: 1.5 }}>
                  <DataGrid
                    rows={prepareEntityRows.map((row) => ({ ...row, id: row._id }))}
                    columns={entityGridColumns}
                    autoHeight
                    disableRowSelectionOnClick
                    disableColumnMenu
                    pageSizeOptions={[5, 10, 25, 50, 100]}
                    initialState={{ pagination: { paginationModel: { pageSize: 100 } } }}
                    columnVisibilityModel={entityColumnVisibilityModel}
                    onColumnVisibilityModelChange={(model) => setEntityColumnVisibilityModel(model)}
                    sx={{
                      border: 0,
                      '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f8fafc', fontWeight: 700 },
                      '& .MuiDataGrid-row:hover': { backgroundColor: '#f8fafc' },
                    }}
                    localeText={{
                      ...ptBR.components.MuiDataGrid.defaultProps.localeText,
                      noRowsLabel: 'Nenhuma entidade cadastrada com esse filtro.',
                    }}
                  />
                </Paper>
              </Box>
            ) : activeTab === 'atletas' ? (
              <Box>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ alignSelf: 'center' }}>
                      Atletas cadastrados
                    </Typography>
                    <TextField
                      value={athleteFilter.search}
                      onChange={(event) => setAthleteFilter((current) => ({ ...current, search: event.target.value }))}
                      placeholder="Buscar atleta"
                      size="small"
                      sx={{ minWidth: { xs: '100%', md: 220 } }}
                    />
                    <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 200 } }}>
                      <InputLabel id="athlete-entity-label">Entidade</InputLabel>
                      <Select
                        labelId="athlete-entity-label"
                        value={athleteFilter.entity}
                        label="Entidade"
                        onChange={(event) => setAthleteFilter((current) => ({ ...current, entity: event.target.value }))}
                      >
                        <MenuItem value="all">Todas as entidades</MenuItem>
                        {entities.map((entity) => (
                          <MenuItem key={entity._id} value={entity._id}>{entity.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ textTransform: 'none', minWidth: 110 }}
                      onClick={(event) => setAthleteColumnMenuAnchor(event.currentTarget)}
                    >
                      Colunas
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      sx={{ textTransform: 'none', minWidth: 110 }}
                      startIcon={<DownloadIcon />}
                      onClick={(event) => setAthleteExportMenuAnchor(event.currentTarget)}
                    >
                      Exportar
                    </Button>
                    <Button
                      component={Link}
                      to="/admin/atletas/novo"
                      variant="contained"
                      size="small"
                      sx={{ textTransform: 'none', minWidth: 140 }}
                      startIcon={<AddIcon />}
                    >
                      Novo cadastro
                    </Button>
                  </Stack>
                </Stack>

                <Menu
                  anchorEl={athleteColumnMenuAnchor}
                  open={Boolean(athleteColumnMenuAnchor)}
                  onClose={() => setAthleteColumnMenuAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <Box sx={{ p: 1, minWidth: 220 }}>
                    {athleteColumns.map((column) => (
                      <Stack key={column.key} direction="row" alignItems="center" spacing={1} sx={{ px: 1, py: 0.5 }}>
                        <Checkbox
                          checked={isAthleteColumnVisible(column.key)}
                          onChange={() => toggleAthleteColumnVisibility(column.key)}
                          size="small"
                        />
                        <Typography variant="body2">{column.label}</Typography>
                      </Stack>
                    ))}
                  </Box>
                </Menu>

                <Menu
                  anchorEl={athleteExportMenuAnchor}
                  open={Boolean(athleteExportMenuAnchor)}
                  onClose={() => setAthleteExportMenuAnchor(null)}
                >
                  <MenuItem onClick={() => { openExportDialog('atletas', 'csv'); setAthleteExportMenuAnchor(null); }}>CSV</MenuItem>
                  <MenuItem onClick={() => { openExportDialog('atletas', 'excel'); setAthleteExportMenuAnchor(null); }}>Excel</MenuItem>
                  <MenuItem onClick={() => { openExportDialog('atletas', 'pdf'); setAthleteExportMenuAnchor(null); }}>PDF</MenuItem>
                </Menu>

                <Paper variant="outlined" sx={{ overflow: 'hidden', p: 1.5 }}>
                  <DataGrid
                    rows={prepareAthleteRows.map((row) => ({ ...row, id: row._id }))}
                    columns={athleteGridColumns}
                    autoHeight
                    disableRowSelectionOnClick
                    disableColumnMenu
                    pageSizeOptions={[5, 10, 25, 50, 100]}
                    initialState={{ pagination: { paginationModel: { pageSize: 100 } } }}
                    columnVisibilityModel={athleteColumnVisibilityModel}
                    onColumnVisibilityModelChange={(model) => setAthleteColumnVisibilityModel(model)}
                    sx={{
                      border: 0,
                      '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f8fafc', fontWeight: 700 },
                      '& .MuiDataGrid-row:hover': { backgroundColor: '#f8fafc' },
                    }}
                    localeText={{
                      ...ptBR.components.MuiDataGrid.defaultProps.localeText,
                      noRowsLabel: 'Nenhum atleta cadastrado com esse filtro.',
                    }}
                  />
                </Paper>
              </Box>
            ) : (
              <AdminRegistrationSettings entities={entities} />
            )}
          </Box>
        </Paper>
      </Container>

      <DetailDialog detailDialog={detailDialog} setDetailDialog={setDetailDialog} />
      <ExportSelectionDialog exportDialog={exportDialog} setExportDialog={setExportDialog} onConfirm={finalizeExport} />
    </Box>
  );
}

function DetailDialog({ detailDialog, setDetailDialog }) {
  if (!detailDialog.open || !detailDialog.data) return null;

  const isEntity = detailDialog.type === 'entidade';
  const data = detailDialog.data;
  const fields = isEntity
    ? [
        ['Nome', data.name],
        ['E-mail', data.email],
        ['Telefone', data.phone],
        ['Status', ({ approved: 'Aprovada', pending: 'Pendente', rejected: 'Rejeitada' })[data.status] || data.status],
        ['Nome do responsável', data.responsible?.fullName],
        ['CPF do responsável', data.responsible?.cpf],
        ['E-mail do responsável', data.responsible?.email],
      ]
    : [
        ['Nome', data.fullName],
        ['CPF', data.cpf],
        ['E-mail', data.email],
        ['Telefone', data.phone],
        ['Modalidade', data.modality],
        ['Naipe', data.naipe],
        ['Data de nascimento', data.birthDate || '—'],
        ['Matrícula', data.matricula],
        ['Entidade', data.entityName || data.entityId],
      ];

  const photoUrl = isEntity ? data.responsible?.photoUrl : data.photoUrl;
  const proofUrl = isEntity ? data.responsible?.proofUrl : data.proofUrl;
  const hasPreviewImage = Boolean(photoUrl);
  const downloadableFiles = [proofUrl].filter(Boolean);
  const hasDownloadableFile = downloadableFiles.length > 0;

  const closeDialog = () => setDetailDialog({ open: false, type: isEntity ? 'entidade' : 'atleta', data: null });

  return (
    <Dialog open={detailDialog.open} onClose={closeDialog} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1, px: 2 }}>
        {isEntity ? 'Detalhes da entidade' : 'Detalhes do atleta'}
      </DialogTitle>
      <DialogContent dividers sx={{ px: 2, py: 1.5 }}>
        <Grid container spacing={1.25}>
          {fields.map(([label, value]) => (
            <Grid item xs={12} md={6} key={label}>
              <Card variant="outlined" sx={{ height: '100%', borderRadius: 0, borderColor: '#e2e8f0' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, lineHeight: 1.2 }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" color="text.primary" fontWeight={700} sx={{ lineHeight: 1.4 }}>
                    {value ?? '—'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={6}>
            <Box sx={{ minHeight: 150, display: 'flex', alignItems: 'center', gap: 2, p: 2, border: '1px dashed #94a3b8', borderRadius: 1, backgroundColor: '#f8fafc' }}>
              {hasPreviewImage ? (
                <Box component="img" src={photoUrl} alt={isEntity ? 'Foto do responsável' : 'Foto do atleta'} sx={{ width: 76, height: 100, flexShrink: 0, objectFit: 'cover', borderRadius: 1, border: '1px solid #cbd5e1' }} />
              ) : (
                <Box sx={{ width: 76, height: 100, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1, backgroundColor: '#e2e8f0', color: '#64748b' }}>
                  <ImageOutlinedIcon />
                </Box>
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={700}>{isEntity ? 'Foto do responsável' : 'Foto do atleta'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {hasPreviewImage ? 'Foto enviada' : 'Nenhuma foto enviada'}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ minHeight: 150, display: 'flex', alignItems: 'center', gap: 2, p: 2, border: '1px dashed #94a3b8', borderRadius: 1, backgroundColor: '#f8fafc' }}>
              <Box sx={{ width: 76, height: 100, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1, backgroundColor: '#e2e8f0', color: '#64748b' }}>
                <DescriptionOutlinedIcon />
              </Box>
              <Stack spacing={1} sx={{ minWidth: 0, alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>{isEntity ? 'Documento do responsável' : 'Documento do atleta'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {hasDownloadableFile ? 'Comprovante enviado' : 'Nenhum documento enviado'}
                  </Typography>
                </Box>
                {downloadableFiles.map((url, index) => (
                  <Button
                    key={`${url}-${index}`}
                    component="a"
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    sx={{ textTransform: 'none' }}
                  >
                    Baixar documento
                  </Button>
                ))}
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
        <Button onClick={closeDialog} variant="contained" size="small">
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ExportSelectionDialog({ exportDialog, setExportDialog, onConfirm }) {
  if (!exportDialog.open) return null;

  const availableColumns = exportDialog.tab === 'entidades'
    ? [
        { key: 'name', label: 'Nome' },
        { key: 'email', label: 'E-mail' },
        { key: 'status', label: 'Status' },
        { key: 'responsibleName', label: 'Responsável' },
        { key: 'responsibleCpf', label: 'CPF do responsável' },
      ]
    : [
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

  return (
    <Dialog open={exportDialog.open} onClose={() => setExportDialog((current) => ({ ...current, open: false }))} maxWidth="sm" fullWidth>
      <DialogTitle>Selecionar colunas para exportação</DialogTitle>
      <DialogContent>
        <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
          {availableColumns.map((column) => (
            <Grid item xs={12} sm={6} key={column.key}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Checkbox
                    checked={exportDialog.selectedColumns.includes(column.key)}
                    onChange={() => {
                      setExportDialog((current) => {
                        const selectedColumns = current.selectedColumns.includes(column.key)
                          ? current.selectedColumns.filter((key) => key !== column.key)
                          : [...current.selectedColumns, column.key];
                        return { ...current, selectedColumns };
                      });
                    }}
                  />
                  <Typography variant="body2">{column.label}</Typography>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setExportDialog((current) => ({ ...current, open: false }))}>Cancelar</Button>
        <Button variant="contained" onClick={onConfirm}>Exportar</Button>
      </DialogActions>
    </Dialog>
  );
}

function StatCard({ title, value, color, detail }) {
  const palette = {
    slate: { background: '#f1f5f9', color: '#0f172a', border: '#e2e8f0' },
    green: { background: '#ecfdf5', color: '#047857', border: '#bbf7d0' },
    orange: { background: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    red: { background: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    blue: { background: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    pink: { background: '#fdf2f8', color: '#be185d', border: '#fbcfe8' },
    purple: { background: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  };

  const style = palette[color] || palette.slate;

  return (
    <Card sx={{ borderRadius: 4, border: `1px solid ${style.border}`, backgroundColor: style.background }}>
      <CardContent>
        <Typography variant="body2" color={style.color} fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ mt: 1, fontWeight: 800, color: style.color }}>
          {value}
        </Typography>
        {detail && (
          <Typography variant="caption" color="text.secondary">
            {detail}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
