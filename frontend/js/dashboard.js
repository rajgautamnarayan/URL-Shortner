// Dashboard functionality

let userUrls = [];
let currentUser = null;
let currentPage = 1;
const urlsPerPage = 10;

// Load dashboard data
const loadDashboard = async () => {
    try {
        // Load user data and URLs in parallel
        const [userResponse, urlsResponse] = await Promise.all([
            getCurrentUser(),
            getUserUrls()
        ]);

        currentUser = userResponse.data.user;
        userUrls = urlsResponse.data.urls;

        updateUserInfo();
        updateStats();
        renderUrlsTable();
    } catch (error) {
        console.error('Dashboard load error:', error);
        showAlert('Failed to load dashboard data', 'error');
    }
};

// Get user's URLs
const getUserUrls = async (page = 1) => {
    try {
        return await apiRequest(`/urls?page=${page}&limit=${urlsPerPage}`);
    } catch (error) {
        throw error;
    }
};

// Update user info display
const updateUserInfo = () => {
    const welcomeMessage = document.getElementById('welcomeMessage');
    const userEmail = document.getElementById('userEmail');
    
    if (welcomeMessage && currentUser) {
        welcomeMessage.textContent = `Welcome back, ${currentUser.name}!`;
    }
    
    if (userEmail && currentUser) {
        userEmail.textContent = currentUser.email;
    }
};

// Update statistics
const updateStats = () => {
    const totalUrlsEl = document.getElementById('totalUrls');
    const totalClicksEl = document.getElementById('totalClicks');
    const avgClicksEl = document.getElementById('avgClicks');

    if (!userUrls || userUrls.length === 0) {
        if (totalUrlsEl) totalUrlsEl.textContent = '0';
        if (totalClicksEl) totalClicksEl.textContent = '0';
        if (avgClicksEl) avgClicksEl.textContent = '0';
        return;
    }

    const totalUrls = userUrls.length;
    const totalClicks = userUrls.reduce((sum, url) => sum + url.clickCount, 0);
    const avgClicks = totalUrls > 0 ? Math.round(totalClicks / totalUrls) : 0;

    if (totalUrlsEl) totalUrlsEl.textContent = totalUrls;
    if (totalClicksEl) totalClicksEl.textContent = totalClicks;
    if (avgClicksEl) avgClicksEl.textContent = avgClicks;
};

// Render URLs table
const renderUrlsTable = () => {
    const tableBody = document.getElementById('urlsTableBody');
    if (!tableBody) return;

    if (!userUrls || userUrls.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <p>No URLs created yet. <a href="/">Create your first short URL</a></p>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = userUrls.map(url => `
        <tr>
            <td>
                <a href="${url.originalUrl}" target="_blank" class="url-link" title="${url.originalUrl}">
                    ${truncateUrl(url.originalUrl, 40)}
                </a>
            </td>
            <td>
                <div class="short-url-cell">
                    <span class="url-link">${url.shortCode}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${url.shortUrl}', this)">
                        Copy
                    </button>
                </div>
            </td>
            <td>
                <span class="click-count">${url.clickCount}</span>
            </td>
            <td>
                <span class="text-muted">${formatDate(url.createdAt)}</span>
            </td>
            <td>
                <span class="text-muted">
                    ${url.lastAccessed ? formatDate(url.lastAccessed) : 'Never'}
                </span>
            </td>
            <td>
                <div class="url-actions">
                    <button class="btn btn-small" onclick="viewUrlDetails('${url.id}')">
                        Details
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteUrl('${url.id}', '${url.shortCode}')">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Add CSS for short URL cell
    const style = document.createElement('style');
    style.textContent = `
        .short-url-cell {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .url-actions {
            display: flex;
            gap: 0.5rem;
        }
        .click-count {
            font-weight: 600;
            color: #667eea;
        }
    `;
    if (!document.querySelector('#dashboard-styles')) {
        style.id = 'dashboard-styles';
        document.head.appendChild(style);
    }
};

// Handle URL shortening form on dashboard
const handleDashboardUrlForm = () => {
    const urlForm = document.getElementById('urlForm');
    if (!urlForm) return;

    urlForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const urlInput = document.getElementById('urlInput');
        const submitBtn = urlForm.querySelector('button[type="submit"]');
        const resultDiv = document.getElementById('urlResult');
        
        try {
            const response = await shortenUrl(urlInput.value);
            
            // Show result
            if (resultDiv) {
                resultDiv.innerHTML = `
                    <div class="result fade-in">
                        <h3>URL Shortened Successfully!</h3>
                        <div class="short-url">${response.data.shortUrl}</div>
                        ${response.data.qrCode ? `
                            <div class="qr-code-section" style="margin: 1.5rem 0; text-align: center;">
                                <h4 style="margin-bottom: 1rem; color: #333;">📱 QR Code</h4>
                                <img src="${response.data.qrCode}" alt="QR Code" 
                                     style="max-width: 150px; border: 2px solid #eee; border-radius: 8px; padding: 8px; background: white; cursor: pointer;"
                                     onclick="showQRCodeModal('${response.data.qrCode}', '${response.data.shortUrl}', '${response.data.shortCode}')">
                                <div style="margin-top: 0.5rem;">
                                    <button class="btn btn-secondary btn-sm" onclick="downloadQRCodeFromModal('${response.data.qrCode}', '${response.data.shortCode}')">
                                        💾 Download
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                        <div class="url-actions">
                            <button class="btn btn-secondary" onclick="copyToClipboard('${response.data.shortUrl}', this)">
                                Copy Link
                            </button>
                            <a href="${response.data.shortUrl}" target="_blank" class="btn btn-secondary">
                                Test Link
                            </a>
                        </div>
                    </div>
                `;
            }
            
            // Clear form
            urlInput.value = '';
            
            // Refresh dashboard data
            await loadDashboard();
            
            showAlert('URL shortened successfully!', 'success');
        } catch (error) {
            console.error('URL shortening error:', error);
            showAlert(error.message || 'Failed to shorten URL', 'error');
        } finally {
            // Reset button
            submitBtn.innerHTML = 'Shorten URL';
            submitBtn.disabled = false;
        }
    });
};

// View URL details
const viewUrlDetails = async (urlId) => {
    try {
        const response = await apiRequest(`/urls/${urlId}`);
        const url = response.data;
        
        // Create modal or redirect to details page
        showUrlDetailsModal(url);
    } catch (error) {
        console.error('Failed to load URL details:', error);
        showAlert('Failed to load URL details', 'error');
    }
};

// Show URL details modal
const showUrlDetailsModal = (url) => {
    // Remove existing modal
    const existingModal = document.getElementById('urlDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'urlDetailsModal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeModal('urlDetailsModal')">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>URL Details</h2>
                    <button class="modal-close" onclick="closeModal('urlDetailsModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="detail-row">
                        <strong>Original URL:</strong>
                        <a href="${url.originalUrl}" target="_blank">${url.originalUrl}</a>
                    </div>
                    <div class="detail-row">
                        <strong>Short URL:</strong>
                        <div class="short-url-display">
                            ${url.shortUrl}
                            <button class="copy-btn" onclick="copyToClipboard('${url.shortUrl}', this)">Copy</button>
                        </div>
                    </div>
                    <div class="detail-row">
                        <strong>Total Clicks:</strong>
                        <span class="click-count">${url.clickCount}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Created:</strong>
                        <span>${formatDate(url.createdAt)}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Last Accessed:</strong>
                        <span>${url.lastAccessed ? formatDate(url.lastAccessed) : 'Never'}</span>
                    </div>
                    ${url.clicks && url.clicks.length > 0 ? `
                        <div class="recent-clicks">
                            <strong>Recent Clicks:</strong>
                            <div class="clicks-list">
                                ${url.clicks.slice(-10).reverse().map(click => `
                                    <div class="click-item">
                                        <span class="click-time">${formatDate(click.timestamp)}</span>
                                        <span class="click-ip">${click.ip || 'Unknown IP'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    // Add modal styles
    const modalStyles = document.createElement('style');
    modalStyles.textContent = `
        #urlDetailsModal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
        }
        .modal-overlay {
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        .modal-content {
            background: white;
            border-radius: 15px;
            max-width: 600px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #e1e1e1;
        }
        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
        }
        .modal-body {
            padding: 1.5rem;
        }
        .detail-row {
            margin-bottom: 1rem;
            padding: 0.75rem;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .detail-row strong {
            display: block;
            margin-bottom: 0.5rem;
            color: #333;
        }
        .short-url-display {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            word-break: break-all;
        }
        .recent-clicks {
            margin-top: 1.5rem;
        }
        .clicks-list {
            max-height: 200px;
            overflow-y: auto;
            margin-top: 0.5rem;
        }
        .click-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem;
            border-bottom: 1px solid #e1e1e1;
            font-size: 0.9rem;
        }
        .click-time {
            color: #666;
        }
        .click-ip {
            font-family: monospace;
            color: #333;
        }
    `;
    modal.appendChild(modalStyles);

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
};

// Close modal
const closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
};

// Delete URL
const deleteUrl = async (urlId, shortCode) => {
    if (!confirm(`Are you sure you want to delete the short URL "${shortCode}"? This action cannot be undone.`)) {
        return;
    }

    try {
        await apiRequest(`/urls/${urlId}`, {
            method: 'DELETE'
        });

        showAlert('URL deleted successfully', 'success');
        
        // Refresh dashboard
        await loadDashboard();
    } catch (error) {
        console.error('Delete URL error:', error);
        showAlert(error.message || 'Failed to delete URL', 'error');
    }
};

// Utility function to truncate URLs
const truncateUrl = (url, maxLength) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
};

// Export URLs (optional feature)
const exportUrls = () => {
    if (!userUrls || userUrls.length === 0) {
        showAlert('No URLs to export', 'info');
        return;
    }

    const csvContent = [
        ['Original URL', 'Short Code', 'Short URL', 'Clicks', 'Created', 'Last Accessed'],
        ...userUrls.map(url => [
            url.originalUrl,
            url.shortCode,
            url.shortUrl,
            url.clickCount,
            formatDate(url.createdAt),
            url.lastAccessed ? formatDate(url.lastAccessed) : 'Never'
        ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `url-shortener-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showAlert('URLs exported successfully', 'success');
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/dashboard') {
        loadDashboard();
        handleDashboardUrlForm();
    }
});

// Expose global functions
window.viewUrlDetails = viewUrlDetails;
window.deleteUrl = deleteUrl;
window.closeModal = closeModal;
window.exportUrls = exportUrls;
