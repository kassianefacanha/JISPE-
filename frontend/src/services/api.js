import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getApiErrorMessage = (error, fallback = 'Não foi possível concluir a operação.') => {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;

  if (status >= 500) {
    if (serverMessage && serverMessage !== 'Erro interno do servidor') return serverMessage;
    return 'Sistema temporariamente indisponível. Tente novamente em alguns instantes.';
  }

  if (!error?.response && (error?.request || error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED')) {
    return 'Não foi possível acessar o sistema agora. Verifique sua internet ou tente novamente em alguns instantes.';
  }

  return serverMessage || fallback;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jispe_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
