export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://whatapptashmanager-api.onrender.com/api";

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
};

export const getTasks = async (query = "") => {
    let url = `${API_BASE_URL}/tasks`;
    if (query) url += `?${query}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok && res.status === 401) {
        localStorage.removeItem('token');
        window.location.reload();
    }
    return res.json();
};

export const getReminders = async () => {
    const res = await fetch(`${API_BASE_URL}/reminders`, { headers: { 'Content-Type': 'application/json' } });
    return res.json();
};

export const updateTaskStatus = async (id, status) => {
    const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ status })
    });
    return res.json();
};

export const deleteTask = async (id) => {
    const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: "DELETE",
        headers: getHeaders()
    });
    return res.json();
};

export const loginAuth = async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    return res.json();
};

export const checkHealth = async () => {
    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
    const res = await fetch(`${baseUrl}/health`);
    return res.json();
};
