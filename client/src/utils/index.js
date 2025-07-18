import { proxy } from "valtio";
import { apiService } from "../services/api.js";

const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('amarTasks-theme');
    return savedTheme ? JSON.parse(savedTheme) : true;
};

const getInitialSignedIn = () => {
    const token = localStorage.getItem('amarTasks-token');
    const user = localStorage.getItem('amarTasks-user');
    return !!(token && user);
};

export const store = proxy({
    signedIn: getInitialSignedIn(),
    list: [],
    dark: getInitialTheme(),
    task: false,
    loading: false,
    error: null
});

export const setTheme = (isDark) => {
    store.dark = isDark;
    localStorage.setItem('amarTasks-theme', JSON.stringify(isDark));
};

export const toggleTheme = () => {
    const newTheme = !store.dark;
    setTheme(newTheme);
};

export const setSignedIn = (isSignedIn) => {
    store.signedIn = isSignedIn;
    if (!isSignedIn) {
        localStorage.removeItem('amarTasks-token');
        localStorage.removeItem('amarTasks-user');
        localStorage.removeItem('amarTasks-signedIn');
        store.list = [];
    }
};

export const loadTasks = async () => {
    try {
        store.loading = true;
        store.error = null;
        const response = await apiService.getTasks();
        
        if (response.success) {
            store.list = response.tasks.map(task => ({
                id: task._id,
                title: task.title,
                status: task.status,
                remTime: task.remTime,
                importance: task.importance,
                urgency: task.urgency,
                priority: task.priority,
                color: task.color
            }));
        }
    } catch (error) {
        store.error = error.message;
        console.error('Failed to load tasks:', error);
    } finally {
        store.loading = false;
    }
};

export const saveTask = async (task) => {
    try {
        store.loading = true;
        store.error = null;
        
        const response = await apiService.createTask({
            title: task.title,
            remTime: task.remTime,
            importance: task.importance,
            urgency: task.urgency,
            priority: task.priority,
            color: task.color
        });
        
        if (response.success) {
            const newTask = {
                id: response.task._id,
                title: response.task.title,
                status: response.task.status,
                remTime: response.task.remTime,
                importance: response.task.importance,
                urgency: response.task.urgency,
                priority: response.task.priority,
                color: response.task.color
            };
            store.list = [newTask, ...store.list];
            return newTask;
        }
    } catch (error) {
        store.error = error.message;
        console.error('Failed to save task:', error);
        throw error;
    } finally {
        store.loading = false;
    }
};

export const updateTask = async (taskId, updates) => {
    try {
        store.loading = true;
        store.error = null;
        
        const response = await apiService.updateTask(taskId, updates);
        
        if (response.success) {
            store.list = store.list.map(task => 
                task.id === taskId 
                    ? { 
                        ...task, 
                        ...updates,
                        id: response.task._id 
                    }
                    : task
            );
        }
    } catch (error) {
        store.error = error.message;
        console.error('Failed to update task:', error);
        throw error;
    } finally {
        store.loading = false;
    }
};

export const deleteTask = async (taskId) => {
    try {
        store.loading = true;
        store.error = null;
        
        const response = await apiService.deleteTask(taskId);
        
        if (response.success) {
            store.list = store.list.filter(task => task.id !== taskId);
        }
    } catch (error) {
        store.error = error.message;
        console.error('Failed to delete task:', error);
        throw error;
    } finally {
        store.loading = false;
    }
}

export const words = [
    {id: 0, text: "My"},
    {id: 1, text: "আমার"},
    {id: 2, text: "My"},
    {id: 3, text: "Meine"},
    {id: 4, text: "Mes"},
    {id: 5, text: "Мои"},
    {id: 6, text: "My"},
    {id: 7, text: "আমার"},
    {id: 8, text: "Meine"},
    {id: 9, text: "Mes"},
    {id: 11, text: "আমার"},
    {id: 10, text: "Мои"}
];

export const calculateRemaining = (remTime) => {
    const now = new Date();
    const [datePart, timePart] = remTime.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    const target = new Date(year, month - 1, day, hour, minute);
    const diff = target - now;
    
    if (diff <= 0) return 'Overdue';
    
    const mins = Math.floor(diff / 60000) % 60;
    const hours = Math.floor(diff / 3600000) % 24;
    const days = Math.floor(diff / 86400000);
    
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    parts.push(`${mins}m`);
    
    return parts.join(' ') + ' left';
};

export const getLocalDateTime = (date = new Date()) => {
    const d = date;
    const pad = (n) => n.toString().padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const getPriority = (importance, urgency) => {
    if (importance > 2) {
        return urgency > 2 ? 1 : 3;
    } else {
        return urgency > 2 ? 2 : 4;
    }
};

export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};