import axios from 'axios';

const API_AUTH_URL = 'https://nwnsb3fd71.execute-api.us-east-2.amazonaws.com';
const API_GASTOS_URL = 'https://49m99hfwm6.execute-api.us-east-2.amazonaws.com';
const API_INGRESOS_URL = 'https://pp4091dt4e.execute-api.us-east-2.amazonaws.com';
const API_DASHBOARD_URL = 'https://1vdl5vxqm6.execute-api.us-east-2.amazonaws.com';
const API_CUOTAS_URL = 'https://m4ixixlyo9.execute-api.us-east-2.amazonaws.com';
const API_METAS_URL = 'https://x3rfewotne.execute-api.us-east-2.amazonaws.com';


// 2. Exportamos las instancias configuradas
export const apiAuth = axios.create({ 
    baseURL: API_AUTH_URL, 
    headers: { 'Content-Type': 'application/json' } 
});

export const apiGastos = axios.create({ 
    baseURL: API_GASTOS_URL, 
    headers: { 'Content-Type': 'application/json' } 
});

export const apiIngresos = axios.create({ 
    baseURL: API_INGRESOS_URL, 
    headers: { 'Content-Type': 'application/json' } 
});

export const apiDashboard = axios.create({ 
    baseURL: API_DASHBOARD_URL, 
    headers: { 'Content-Type': 'application/json' } 
});

export const apiCuotas = axios.create({ 
    baseURL: API_CUOTAS_URL, 
    headers: { 'Content-Type': 'application/json' } 
});

export const apiMetas = axios.create({
    baseURL: API_METAS_URL,
    headers: { 'Content-Type': 'application/json' }
});

// 3. Todas las APIs (menos el login) envian el token y, si el backend lo rechaza, se vuelve al login
[apiGastos, apiIngresos, apiDashboard, apiCuotas, apiMetas].forEach((api) => {
    api.interceptors.request.use((config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });

    api.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401) {
                localStorage.clear();
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }
    );
});