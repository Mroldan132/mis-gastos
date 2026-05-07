import axios from 'axios';

const API_AUTH_URL = 'https://nwnsb3fd71.execute-api.us-east-2.amazonaws.com';
const API_GASTOS_URL = 'https://49m99hfwm6.execute-api.us-east-2.amazonaws.com';
const API_INGRESOS_URL = 'https://pp4091dt4e.execute-api.us-east-2.amazonaws.com';
const API_DASHBOARD_URL = 'https://1vdl5vxqm6.execute-api.us-east-2.amazonaws.com';
const API_CUOTAS_URL = 'https://m4ixixlyo9.execute-api.us-east-2.amazonaws.com';

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