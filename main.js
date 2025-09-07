// Main JavaScript file for E-Commerce Store

// Global variables
let currentUser = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize the application
function initializeApp() {
    // Check if user is logged in
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
        try {
            currentUser = JSON.parse(userData);
            updateCartCount();
        } catch (error) {
            console.error('Error parsing user data:', error);
            logout();
        }
    }
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('access_token') !== null;
}

// Logout function
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    currentUser = null;
    showToast('You have been logged out', 'info');
    setTimeout(() => {
        window.location.href = '/login';
    }, 1000);
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('notification-toast');
    const toastBody = document.getElementById('toast-message');
    
    if (!toast || !toastBody) {
        console.warn('Toast elements not found');
        return;
    }
    
    // Set message
    toastBody.textContent = message;
    
    // Set icon based on type
    const toastHeader = toast.querySelector('.toast-header i');
    const iconClasses = {
        success: 'fas fa-check-circle text-success',
        error: 'fas fa-exclamation-circle text-danger',
        warning: 'fas fa-exclamation-triangle text-warning',
        info: 'fas fa-info-circle text-primary'
    };
    
    if (toastHeader) {
        toastHeader.className = iconClasses[type] || iconClasses.info;
    }
    
    // Show toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: type === 'error' ? 5000 : 3000
    });
    bsToast.show();
}

// LocalStorage cart management
function getLocalCart() {
    try {
        return JSON.parse(localStorage.getItem('anonymous_cart')) || [];
    } catch {
        return [];
    }
}

function saveLocalCart(cartItems) {
    localStorage.setItem('anonymous_cart', JSON.stringify(cartItems));
}

function addToLocalCart(itemId, quantity = 1) {
    const cart = getLocalCart();
    const existingItem = cart.find(item => item.item_id === itemId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            item_id: itemId,
            quantity: quantity,
            id: Date.now() // temporary ID for local storage
        });
    }
    
    saveLocalCart(cart);
    updateCartCount();
}

function updateLocalCartQuantity(itemId, newQuantity) {
    const cart = getLocalCart();
    const itemIndex = cart.findIndex(item => item.item_id === itemId);
    
    if (itemIndex !== -1) {
        if (newQuantity <= 0) {
            cart.splice(itemIndex, 1);
        } else {
            cart[itemIndex].quantity = newQuantity;
        }
        saveLocalCart(cart);
        updateCartCount();
    }
}

function removeFromLocalCart(itemId) {
    const cart = getLocalCart().filter(item => item.item_id !== itemId);
    saveLocalCart(cart);
    updateCartCount();
}

// Update cart count in navigation
async function updateCartCount() {
    const cartBadge = document.getElementById('cart-count');
    if (!cartBadge) return;
    
    if (!isLoggedIn()) {
        // For anonymous users, count local cart items
        const localCart = getLocalCart();
        const totalItems = localCart.reduce((sum, item) => sum + item.quantity, 0);
        cartBadge.textContent = totalItems;
        cartBadge.style.display = totalItems > 0 ? 'inline' : 'none';
        return;
    }
    
    try {
        const response = await fetch('/api/cart', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        if (response.ok) {
            const cartData = await response.json();
            const totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
            cartBadge.textContent = totalItems;
            cartBadge.style.display = totalItems > 0 ? 'inline' : 'none';
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Debounce function for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle API errors
function handleApiError(error, defaultMessage = 'An error occurred') {
    console.error('API Error:', error);
    
    if (error.status === 401) {
        showToast('Your session has expired. Please login again.', 'warning');
        logout();
        return;
    }
    
    if (error.status === 403) {
        showToast('You do not have permission to perform this action.', 'error');
        return;
    }
    
    if (error.status >= 500) {
        showToast('Server error. Please try again later.', 'error');
        return;
    }
    
    showToast(defaultMessage, 'error');
}

// Make authenticated API request
async function makeAuthenticatedRequest(url, options = {}) {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
        throw new Error('No authentication token found');
    }
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
    
    const requestOptions = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                throw new Error('Authentication failed');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        return response;
    } catch (error) {
        console.error('Authenticated request failed:', error);
        throw error;
    }
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate password strength
function isValidPassword(password) {
    return password && password.length >= 6;
}

// Show loading state on button
function setButtonLoading(button, loading = true) {
    if (!button) return;
    
    if (loading) {
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Loading...';
        button.disabled = true;
    } else {
        button.innerHTML = button.dataset.originalText || button.innerHTML;
        button.disabled = false;
    }
}

// Form validation helper
function validateForm(formElement) {
    const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            isValid = false;
        } else {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        }
        
        // Special validation for email
        if (input.type === 'email' && input.value && !isValidEmail(input.value)) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
            isValid = false;
        }
        
        // Special validation for password
        if (input.type === 'password' && input.value && !isValidPassword(input.value)) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
            isValid = false;
        }
    });
    
    return isValid;
}

// Initialize form validation
function initializeFormValidation() {
    const forms = document.querySelectorAll('form[data-validate="true"]');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!validateForm(form)) {
                e.preventDefault();
                e.stopPropagation();
                showToast('Please fill in all required fields correctly', 'warning');
            }
        });
        
        // Real-time validation
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateForm(form);
            });
        });
    });
}

// Initialize enhanced features
document.addEventListener('DOMContentLoaded', function() {
    initializeFormValidation();
    
    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        setTimeout(() => {
            if (alert && alert.parentNode) {
                alert.style.opacity = '0';
                setTimeout(() => alert.remove(), 300);
            }
        }, 5000);
    });
});

// Merge local cart with user's database cart after login
async function mergeLocalCartWithDatabase() {
    const localCart = getLocalCart();
    if (localCart.length === 0) return;
    
    try {
        for (const localItem of localCart) {
            await fetch('/api/cart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ 
                    item_id: localItem.item_id, 
                    quantity: localItem.quantity 
                })
            });
        }
        
        // Clear local cart after successful merge
        localStorage.removeItem('anonymous_cart');
        showToast('Cart items merged successfully!', 'success');
    } catch (error) {
        console.error('Error merging cart:', error);
    }
}

// Export functions for use in other scripts
window.ecommerce = {
    showToast,
    isLoggedIn,
    logout,
    updateCartCount,
    formatCurrency,
    formatDate,
    debounce,
    handleApiError,
    makeAuthenticatedRequest,
    isValidEmail,
    isValidPassword,
    setButtonLoading,
    validateForm,
    getLocalCart,
    addToLocalCart,
    updateLocalCartQuantity,
    removeFromLocalCart,
    mergeLocalCartWithDatabase
};
