// ----------------------------------------------------
// Admin Configuration
// ----------------------------------------------------
let supabaseClient = null;

if (typeof CONFIG !== 'undefined' && CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL') {
    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
} else {
    showError('admin-error', 'Supabase not configured. Cannot load logs.');
}

// ----------------------------------------------------
// UI Controllers
// ----------------------------------------------------
function switchView(viewId) {
    document.getElementById('admin-auth-view').classList.add('hidden');
    document.getElementById('admin-dashboard-view').classList.add('hidden');
    document.getElementById(viewId).classList.remove('hidden');
}

function showError(elementId, message) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.classList.remove('hidden');
}

function hideError(elementId) {
    document.getElementById(elementId).classList.add('hidden');
}

// ----------------------------------------------------
// Authentication
// ----------------------------------------------------
document.getElementById('admin-login-btn').addEventListener('click', () => {
    const pwd = document.getElementById('admin-password').value;
    hideError('admin-error');

    if (pwd === 'bracu2026') {
        // Success
        switchView('admin-dashboard-view');
        fetchLogs();
    } else {
        // Fail - Redirect back to decoy
        window.location.href = 'index.html';
    }
});

// ----------------------------------------------------
// Data Fetching
// ----------------------------------------------------
document.getElementById('refresh-logs-btn').addEventListener('click', fetchLogs);

async function fetchLogs() {
    if (!supabaseClient) return;

    const tbody = document.getElementById('logs-body');
    tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No activity logs found.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(log => {
            // Localize timestamp
            const localTime = new Date(log.created_at).toLocaleString();

            return `
                <tr class="log-row">
                    <td>${localTime}</td>
                    <td><strong>${log.event_type}</strong></td>
                    <td>${log.details}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("Error fetching logs:", err);
        tbody.innerHTML = '<tr><td colspan="3" style="color:red">Failed to load logs.</td></tr>';
    }
}
