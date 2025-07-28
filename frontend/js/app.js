// API Configuration
const API_BASE_URL = 'https://urlify-loky.onrender.com/api';

// Utility functions
const showAlert = (message, type = 'info') => {
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} fade-in`;
    alert.textContent = message;

    // Find a good place to insert the alert
    const container = document.querySelector('.form-container') || 
                     document.querySelector('.dashboard') || 
                     document.querySelector('.container');
    
    if (container) {
        container.insertBefore(alert, container.firstChild);
    }

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
};

const getAuthToken = () => {
    return localStorage.getItem('authToken');
};

const setAuthToken = (token) => {
    localStorage.setItem('authToken', token);
};

const removeAuthToken = () => {
    localStorage.removeItem('authToken');
};

const isAuthenticated = () => {
    return !!getAuthToken();
};

// API request helper
const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getAuthToken();

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API request error:', error);
        
        // Handle authentication errors
        if (error.message.includes('expired') || error.message.includes('invalid')) {
            removeAuthToken();
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                window.location.href = '/login';
            }
        }
        
        throw error;
    }
};

// Navigation management
const updateNavigation = () => {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    const isAuth = isAuthenticated();
    
    if (isAuth) {
        navLinks.innerHTML = `
            <li><a href="/dashboard">Dashboard</a></li>
            <li><a href="#" onclick="logout()" class="btn">Logout</a></li>
        `;
    } else {
        navLinks.innerHTML = `
            <li><a href="/login">Login</a></li>
            <li><a href="/register" class="btn">Sign Up</a></li>
        `;
    }
};

// Logout function
const logout = () => {
    removeAuthToken();
    showAlert('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = '/';
    }, 1000);
};

// Copy to clipboard functionality
const copyToClipboard = async (text, button) => {
    try {
        await navigator.clipboard.writeText(text);
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    } catch (error) {
        console.error('Failed to copy text:', error);
        showAlert('Failed to copy to clipboard', 'error');
    }
};

// Format date for display
const formatDate = (dateString) => {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

// Validate URL
const isValidUrl = (string) => {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

// URL shortening functionality
const shortenUrl = async (originalUrl) => {
    if (!originalUrl.trim()) {
        throw new Error('Please enter a URL');
    }

    if (!isValidUrl(originalUrl)) {
        throw new Error('Please enter a valid URL (must start with http:// or https://)');
    }

    return await apiRequest('/shorten', {
        method: 'POST',
        body: JSON.stringify({ originalUrl: originalUrl.trim() }),
    });
};

// Initialize page
const initializePage = () => {
    updateNavigation();
    
    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Add loading states to forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn && !submitBtn.disabled) {
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span class="loading"></span>Processing...';
                submitBtn.disabled = true;
                
                // Re-enable button after 5 seconds as fallback
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 5000);
            }
        });
    });
};

// Check authentication status and redirect if needed
const checkAuthRedirect = () => {
    const currentPath = window.location.pathname;
    const publicPaths = ['/', '/login', '/register', '/404.html', '/500.html'];
    const isPublicPath = publicPaths.includes(currentPath) || currentPath.match(/^\/[a-zA-Z0-9]{6,8}$/);
    
    if (!isAuthenticated() && !isPublicPath) {
        window.location.href = '/login';
    } else if (isAuthenticated() && (currentPath === '/login' || currentPath === '/register')) {
        window.location.href = '/dashboard';
    }
};

// Error handling for network issues
window.addEventListener('online', () => {
    showAlert('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    showAlert('You are offline. Some features may not work.', 'error');
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializePage();
    checkAuthRedirect();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showAlert('An unexpected error occurred. Please refresh the page.', 'error');
});

// Expose global functions
window.logout = logout;
window.copyToClipboard = copyToClipboard;
window.showAlert = showAlert;
