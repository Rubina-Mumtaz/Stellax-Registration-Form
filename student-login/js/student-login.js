document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = [...document.querySelectorAll('[data-tab-target]')];
    const tabPanels = [...document.querySelectorAll('[role="tabpanel"]')];
    const loginForm = document.getElementById('student-login-form');
    const createPasswordForm = document.getElementById('create-password-form');

    const activateTab = (targetId) => {
        tabButtons.forEach((button) => {
            const isActive = button.dataset.tabTarget === targetId;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', String(isActive));
        });
        tabPanels.forEach((panel) => { panel.hidden = panel.id !== targetId; });
    };

    tabButtons.forEach((button) => {
        button.addEventListener('click', () => activateTab(button.dataset.tabTarget));
    });

    document.querySelectorAll('[data-password-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
            const input = document.getElementById(button.dataset.passwordToggle);
            if (!input) return;
            const isVisible = input.type === 'text';
            input.type = isVisible ? 'password' : 'text';
            button.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
            button.setAttribute('title', isVisible ? 'Show password' : 'Hide password');
        });
    });

    const normalizeCnic = (value) => String(value || '').replace(/\D/g, '');
    const showStatus = (id, message, type = 'error') => {
        const status = document.getElementById(id);
        if (!status) return;
        status.textContent = message;
        status.hidden = false;
        status.classList.toggle('is-success', type === 'success');
    };
    const clearStatus = (id) => {
        const status = document.getElementById(id);
        if (!status) return;
        status.textContent = '';
        status.hidden = true;
        status.classList.remove('is-success');
    };
    const setLoading = (form, loading, label) => {
        const button = form?.querySelector('button[type="submit"]');
        if (!button) return;
        button.disabled = loading;
        if (loading) {
            button.dataset.originalLabel = button.textContent;
            button.textContent = label;
        } else {
            button.textContent = button.dataset.originalLabel || button.textContent;
        }
    };
    const getClient = () => {
        if (!window.supabaseClient) throw new Error('Database connection unavailable.');
        return window.supabaseClient;
    };

    loginForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearStatus('login-status');
        const cnic = normalizeCnic(document.getElementById('login-cnic')?.value);
        const password = document.getElementById('login-password')?.value || '';

        if (!/^\d{13}$/.test(cnic) || !password) {
            showStatus('login-status', 'Enter a valid 13-digit CNIC and password.');
            return;
        }

        setLoading(loginForm, true, 'CHECKING...');
        try {
            const client = getClient();
            const { data: student, error } = await client
                .from('students')
                .select('id, email, status')
                .eq('cnic_number', cnic)
                .maybeSingle();

            if (error) throw error;
            if (!student || student.status?.toLowerCase() !== 'approved' || !student.email) {
                showStatus('login-status', 'Invalid CNIC or password.');
                return;
            }

            const { error: authError } = await client.auth.signInWithPassword({
                email: student.email,
                password
            });
            if (authError) {
                showStatus('login-status', 'Invalid CNIC or password.');
                return;
            }

            localStorage.setItem('studentId', String(student.id));
            window.location.href = '../student-portal/student-portal.html';
        } catch (error) {
            console.error('Student login error:', error);
            showStatus('login-status', 'Unable to verify your details. Please try again.');
        } finally {
            setLoading(loginForm, false);
        }
    });

    createPasswordForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearStatus('password-status');
        const cnic = normalizeCnic(document.getElementById('password-cnic')?.value);
        const dob = document.getElementById('password-dob')?.value || '';
        const password = document.getElementById('create-password')?.value || '';

        if (!/^\d{13}$/.test(cnic) || !dob || password.length < 6) {
            showStatus('password-status', 'Enter a valid 13-digit CNIC, DOB, and a password of at least 6 characters.');
            return;
        }

        setLoading(createPasswordForm, true, 'SUBMITTING...');
        try {
            const client = getClient();
            const { data: student, error: lookupError } = await client
                .from('students')
                .select('id, email')
                .eq('cnic_number', cnic)
                .eq('dob', dob)
                .maybeSingle();

            if (lookupError) throw lookupError;
            if (!student || !student.email) {
                showStatus('password-status', 'No student record matches this CNIC and DOB.');
                return;
            }

            const originalPassword = password;
            const maskedPassword = '*'.repeat(originalPassword.length);
            const { error: authError } = await client.auth.signUp({
                email: student.email,
                password: originalPassword
            });
            if (authError) throw authError;

            const { error: updateError } = await client
                .from('students')
                .update({ password: maskedPassword })
                .eq('id', student.id);

            if (updateError) throw updateError;
            createPasswordForm.reset();
            showStatus('password-status', 'Password created successfully. You can now log in.', 'success');
        } catch (error) {
            console.error('Student password setup error:', error);
            showStatus('password-status', 'Unable to create your password. Please try again.');
        } finally {
            setLoading(createPasswordForm, false);
        }
    });
});
