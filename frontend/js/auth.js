// Authentication functionality

// Login function
const login = async (email, password) => {
    try {
        const response = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        setAuthToken(response.data.token);
        return response;
    } catch (error) {
        throw error;
    }
};

// Register function
const register = async (name, email, password) => {
    try {
        const response = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password }),
        });

        setAuthToken(response.data.token);
        return response;
    } catch (error) {
        throw error;
    }
};

// Get current user
const getCurrentUser = async () => {
    try {
        return await apiRequest('/auth/me');
    } catch (error) {
        throw error;
    }
};

// Handle login form submission
const handleLoginForm = () => {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        try {
            await login(email, password);
            showAlert('Login successful! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        } catch (error) {
            console.error('Login error:', error);
            showAlert(error.message || 'Login failed. Please try again.', 'error');
        } finally {
            // Reset button
            submitBtn.innerHTML = 'Login';
            submitBtn.disabled = false;
        }
    });
};

// Handle register form submission
const handleRegisterForm = () => {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const submitBtn = registerForm.querySelector('button[type="submit"]');

        // Client-side validation
        if (password !== confirmPassword) {
            showAlert('Passwords do not match', 'error');
            submitBtn.innerHTML = 'Sign Up';
            submitBtn.disabled = false;
            return;
        }

        if (password.length < 6) {
            showAlert('Password must be at least 6 characters long', 'error');
            submitBtn.innerHTML = 'Sign Up';
            submitBtn.disabled = false;
            return;
        }

        // Check password strength
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);

        if (!hasLower || !hasUpper || !hasNumber) {
            showAlert('Password must contain at least one lowercase letter, one uppercase letter, and one number', 'error');
            submitBtn.innerHTML = 'Sign Up';
            submitBtn.disabled = false;
            return;
        }

        try {
            await register(name, email, password);
            showAlert('Registration successful! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        } catch (error) {
            console.error('Registration error:', error);
            let errorMessage = 'Registration failed. Please try again.';
            
            if (error.message.includes('already exists')) {
                errorMessage = 'An account with this email already exists. Please use a different email or try logging in.';
            } else if (error.message.includes('validation')) {
                errorMessage = 'Please check your input and try again.';
            }
            
            showAlert(errorMessage, 'error');
        } finally {
            // Reset button
            submitBtn.innerHTML = 'Sign Up';
            submitBtn.disabled = false;
        }
    });
};

// Password strength indicator
const addPasswordStrengthIndicator = () => {
    const passwordField = document.getElementById('password');
    if (!passwordField) return;

    const strengthIndicator = document.createElement('div');
    strengthIndicator.className = 'password-strength mt-1';
    strengthIndicator.innerHTML = `
        <div class="strength-bar">
            <div class="strength-fill"></div>
        </div>
        <div class="strength-text text-muted"></div>
    `;

    passwordField.parentNode.appendChild(strengthIndicator);

    // Add CSS for strength indicator
    const style = document.createElement('style');
    style.textContent = `
        .password-strength {
            margin-top: 0.5rem;
        }
        .strength-bar {
            height: 4px;
            background: #e1e1e1;
            border-radius: 2px;
            overflow: hidden;
            margin-bottom: 0.25rem;
        }
        .strength-fill {
            height: 100%;
            transition: width 0.3s ease, background-color 0.3s ease;
            width: 0%;
            background: #dc3545;
        }
        .strength-text {
            font-size: 0.8rem;
        }
    `;
    document.head.appendChild(style);

    passwordField.addEventListener('input', (e) => {
        const password = e.target.value;
        const fill = strengthIndicator.querySelector('.strength-fill');
        const text = strengthIndicator.querySelector('.strength-text');

        if (!password) {
            fill.style.width = '0%';
            text.textContent = '';
            return;
        }

        let strength = 0;
        let strengthText = '';

        // Check length
        if (password.length >= 6) strength++;
        if (password.length >= 8) strength++;

        // Check character types
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

        // Determine strength level and color
        if (strength < 3) {
            fill.style.width = '33%';
            fill.style.background = '#dc3545';
            strengthText = 'Weak';
        } else if (strength < 5) {
            fill.style.width = '66%';
            fill.style.background = '#ffc107';
            strengthText = 'Medium';
        } else {
            fill.style.width = '100%';
            fill.style.background = '#28a745';
            strengthText = 'Strong';
        }

        text.textContent = strengthText;
    });
};

// Real-time email validation
const addEmailValidation = () => {
    const emailField = document.getElementById('email');
    if (!emailField) return;

    emailField.addEventListener('blur', (e) => {
        const email = e.target.value;
        if (email && !isValidEmail(email)) {
            showAlert('Please enter a valid email address', 'error');
            emailField.focus();
        }
    });
};

// Email validation helper
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Initialize authentication pages
document.addEventListener('DOMContentLoaded', () => {
    handleLoginForm();
    handleRegisterForm();
    addPasswordStrengthIndicator();
    addEmailValidation();
    
    // Show/hide password functionality
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const passwordField = btn.previousElementSibling;
            const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordField.setAttribute('type', type);
            btn.textContent = type === 'password' ? '👁' : '🙈';
        });
    });
});
