import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getApiErrorMessage } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useFeedback } from '../contexts/FeedbackContext';

const initialEntityForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  responsibleFullName: '',
  responsibleCpf: '',
  responsibleEmail: '',
};

const initialAthleteForm = {
  entityId: '',
  cpf: '',
  fullName: '',
  birthDate: '',
  phone: '',
  email: '',
  gender: 'masculino',
};

export default function AdminManagementPage() {
  const { logout } = useAuth();
  const { notify, confirm } = useFeedback();
  const [entities, setEntities] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [entityForm, setEntityForm] = useState(initialEntityForm);
  const [athleteForm, setAthleteForm] = useState(initialAthleteForm);
  const [editingEntityId, setEditingEntityId] = useState(null);
  const [editingAthleteId, setEditingAthleteId] = useState(null);

  const entityMap = useMemo(
    () => Object.fromEntries(entities.map((entity) => [entity._id, entity])),
    [entities]
  );

  const loadData = async () => {
    try {
      const [entitiesResponse, athletesResponse] = await Promise.all([
        api.get('/entities'),
        api.get('/athletes'),
      ]);
      setEntities(entitiesResponse.data.entities || []);
      setAthletes(athletesResponse.data.athletes || []);
    } catch (error) {
      notify(getApiErrorMessage(error, 'Não foi possível carregar os dados de gerenciamento.'));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEntitySave = async (event) => {
    event.preventDefault();
    const wasEditing = Boolean(editingEntityId);

    try {
      const payload = {
        name: entityForm.name,
        email: entityForm.email,
        password: entityForm.password,
        phone: entityForm.phone,
        responsible: {
          fullName: entityForm.responsibleFullName,
          cpf: entityForm.responsibleCpf,
          email: entityForm.responsibleEmail,
        },
      };

      if (editingEntityId) {
        await api.put(`/entities/${editingEntityId}`, payload);
      } else {
        await api.post('/entities', {
          ...payload,
          status: 'pending',
        });
      }

      setEntityForm(initialEntityForm);
      setEditingEntityId(null);
      await loadData();
      notify(wasEditing ? 'Entidade atualizada com sucesso.' : 'Entidade cadastrada com sucesso.', 'success');
    } catch (error) {
      notify(getApiErrorMessage(error, 'Erro ao salvar entidade.'));
    }
  };

  const handleAthleteSave = async (event) => {
    event.preventDefault();
    const wasEditing = Boolean(editingAthleteId);

    try {
      const payload = {
        entityId: athleteForm.entityId || undefined,
        cpf: athleteForm.cpf,
        fullName: athleteForm.fullName,
        birthDate: athleteForm.birthDate,
        phone: athleteForm.phone,
        email: athleteForm.email,
        gender: athleteForm.gender,
      };

      if (editingAthleteId) {
        await api.put(`/athletes/${editingAthleteId}`, payload);
      } else {
        if (!payload.entityId) {
          notify('Selecione a entidade do atleta.', 'warning');
          return;
        }
        await api.post('/athletes', payload);
      }

      setAthleteForm(initialAthleteForm);
      setEditingAthleteId(null);
      await loadData();
      notify(wasEditing ? 'Atleta atualizado com sucesso.' : 'Atleta cadastrado com sucesso.', 'success');
    } catch (error) {
      notify(getApiErrorMessage(error, 'Erro ao salvar atleta.'));
    }
  };

  const updateEntityStatus = async (id, status) => {
    try {
      const action = status === 'approved' ? 'approve' : 'reject';
      const response = await api.patch(`/entities/${id}/${action}`);
      await loadData();
      notify(
        response.data.emailSent === false
          ? 'Status atualizado, mas o e-mail não foi enviado. Verifique a configuração SMTP.'
          : 'Status da entidade atualizado com sucesso.',
        response.data.emailSent === false ? 'warning' : 'success'
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

  const editEntity = (entity) => {
    setEditingEntityId(entity._id);
    setEntityForm({
      name: entity.name,
      email: entity.email,
      password: '',
      phone: entity.phone,
      responsibleFullName: entity.responsible?.fullName || '',
      responsibleCpf: entity.responsible?.cpf || '',
      responsibleEmail: entity.responsible?.email || '',
    });
  };

  const editAthlete = (athlete) => {
    setEditingAthleteId(athlete._id);
    setAthleteForm({
      entityId: entityMap[athlete.entityId]?.status === 'approved' ? athlete.entityId : '',
      cpf: athlete.cpf,
      fullName: athlete.fullName,
      birthDate: athlete.birthDate ? new Date(athlete.birthDate).toISOString().slice(0, 10) : '',
      phone: athlete.phone,
      email: athlete.email,
      gender: athlete.gender,
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-jispe-green">Admin</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-800">Gestão geral</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/admin" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">Dashboard</Link>
            <button onClick={logout} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white">Sair</button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Entidades</h2>
              <button
                type="button"
                onClick={() => {
                  setEditingEntityId(null);
                  setEntityForm(initialEntityForm);
                }}
                className="rounded-xl bg-jispe-green px-3 py-2 text-sm font-medium text-white"
              >
                + Novo cadastro
              </button>
            </div>

            <form onSubmit={handleEntitySave} className="mb-6 grid gap-3 md:grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input value={entityForm.name} onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Nome da entidade" />
              <input type="email" value={entityForm.email} onChange={(e) => setEntityForm({ ...entityForm, email: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="E-mail" />
              <input type="password" value={entityForm.password} onChange={(e) => setEntityForm({ ...entityForm, password: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Senha (opcional para edição)" />
              <input value={entityForm.phone} onChange={(e) => setEntityForm({ ...entityForm, phone: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Telefone" />
              <input value={entityForm.responsibleFullName} onChange={(e) => setEntityForm({ ...entityForm, responsibleFullName: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Responsável" />
              <input value={entityForm.responsibleCpf} onChange={(e) => setEntityForm({ ...entityForm, responsibleCpf: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="CPF responsável" />
              <input type="email" value={entityForm.responsibleEmail} onChange={(e) => setEntityForm({ ...entityForm, responsibleEmail: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 md:col-span-2" placeholder="E-mail do responsável" />
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" className="rounded-xl bg-jispe-green px-4 py-2 font-semibold text-white">
                  {editingEntityId ? 'Salvar entidade' : 'Cadastrar entidade'}
                </button>
                {editingEntityId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEntityId(null);
                      setEntityForm(initialEntityForm);
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-slate-700"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Nome</th>
                    <th className="px-3 py-2 font-semibold">E-mail</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-3 py-4 text-slate-500">Nenhuma entidade cadastrada.</td>
                    </tr>
                  ) : (
                    entities.map((entity) => (
                      <tr key={entity._id} className="border-t border-slate-200 align-top">
                        <td className="px-3 py-3 font-medium text-slate-800">{entity.name}</td>
                        <td className="px-3 py-3 text-slate-600">{entity.email}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            entity.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : entity.status === 'rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-orange-100 text-orange-700'
                          }`}>
                            {entity.status}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {entity.status !== 'approved' && (
                              <button type="button" onClick={() => updateEntityStatus(entity._id, 'approved')} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white">Aprovar</button>
                            )}
                            {entity.status !== 'rejected' && (
                              <button type="button" onClick={() => updateEntityStatus(entity._id, 'rejected')} className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white">Rejeitar</button>
                            )}
                            <button type="button" onClick={() => editEntity(entity)} className="rounded-lg bg-amber-500 px-2 py-1 text-xs font-medium text-white">Editar</button>
                            <button type="button" onClick={() => deleteEntity(entity._id)} className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-medium text-white">Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Atletas</h2>
              <button
                type="button"
                onClick={() => {
                  setEditingAthleteId(null);
                  setAthleteForm(initialAthleteForm);
                }}
                className="rounded-xl bg-jispe-green px-3 py-2 text-sm font-medium text-white"
              >
                + Novo cadastro
              </button>
            </div>

            <form onSubmit={handleAthleteSave} className="mb-6 grid gap-3 md:grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <select value={athleteForm.entityId} onChange={(e) => setAthleteForm({ ...athleteForm, entityId: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 md:col-span-2">
                <option value="">Selecione uma entidade aprovada</option>
                {entities.filter((entity) => entity.status === 'approved').map((entity) => (
                  <option key={entity._id} value={entity._id}>{entity.name}</option>
                ))}
              </select>
              <input value={athleteForm.fullName} onChange={(e) => setAthleteForm({ ...athleteForm, fullName: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Nome completo" />
              <input value={athleteForm.cpf} onChange={(e) => setAthleteForm({ ...athleteForm, cpf: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="CPF" />
              <input type="date" value={athleteForm.birthDate} onChange={(e) => setAthleteForm({ ...athleteForm, birthDate: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" />
              <input value={athleteForm.phone} onChange={(e) => setAthleteForm({ ...athleteForm, phone: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Telefone" />
              <input type="email" value={athleteForm.email} onChange={(e) => setAthleteForm({ ...athleteForm, email: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 md:col-span-2" placeholder="E-mail" />
              <select value={athleteForm.gender} onChange={(e) => setAthleteForm({ ...athleteForm, gender: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 md:col-span-2">
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" className="rounded-xl bg-jispe-green px-4 py-2 font-semibold text-white">
                  {editingAthleteId ? 'Salvar atleta' : 'Cadastrar atleta'}
                </button>
                {editingAthleteId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAthleteId(null);
                      setAthleteForm(initialAthleteForm);
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-slate-700"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Nome</th>
                    <th className="px-3 py-2 font-semibold">Entidade</th>
                    <th className="px-3 py-2 font-semibold">Matrícula</th>
                    <th className="px-3 py-2 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {athletes.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-3 py-4 text-slate-500">Nenhum atleta cadastrado.</td>
                    </tr>
                  ) : (
                    athletes.map((athlete) => (
                      <tr key={athlete._id} className="border-t border-slate-200 align-top">
                        <td className="px-3 py-3 font-medium text-slate-800">{athlete.fullName}</td>
                        <td className="px-3 py-3 text-slate-600">{entityMap[athlete.entityId]?.name || '—'}</td>
                        <td className="px-3 py-3 text-slate-600">{athlete.matricula || '—'}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => editAthlete(athlete)} className="rounded-lg bg-amber-500 px-2 py-1 text-xs font-medium text-white">Editar</button>
                            <button type="button" onClick={() => deleteAthlete(athlete._id)} className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-medium text-white">Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
