// ==================================================
// Stellax Academy — Registration Form Logic
// Handles validation + Supabase insertion for the
// student registration form on index.html.
// Loads with `defer` AFTER supaBase/supabase.js,
// so window.supabaseClient is already initialized.
// ==================================================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registration-form');
    const status = document.getElementById('form-status');

    // Nothing to do if the form isn't on this page.
    if (!form) return;

    // ------------------------------------------------
    // Error display helpers
    // ------------------------------------------------

    // Shows/clears an error message under a field and
    // toggles the .has-error class on its .field wrapper.
    const setError = (fieldId, message) => {
        const field = document.getElementById(fieldId);
        const messageElement = document.getElementById(`${fieldId}-error`);
        const wrapper = field?.closest('.field') || document.querySelector(`#${fieldId}-group`)?.closest('.field');

        if (messageElement) messageElement.textContent = message;
        if (wrapper) wrapper.classList.toggle('has-error', Boolean(message));
        if (field) {
            if (message) {
                field.setAttribute('aria-invalid', 'true');
            } else {
                field.removeAttribute('aria-invalid');
            }
        }
        return Boolean(message);
    };

    // ------------------------------------------------
    // Status message helpers
    // (Reuses existing CSS classes: .form-status and .is-visible,
    //  so no stylesheet changes are needed.)
    // ------------------------------------------------

    let statusTimer = null;

    const showStatus = (message, type) => {
        if (!status) return;

        status.textContent = message;
        status.classList.add('is-visible');
        status.style.color = type === 'error' ? '#d9534f' : '#2e7d32';

        // Clear any pending auto-dismiss so rapid resubmits don't race.
        if (statusTimer) {
            clearTimeout(statusTimer);
            statusTimer = null;
        }

        // Errors persist so the user can read/fix them;
        // success messages auto-dismiss after 6 seconds.
        if (type === 'success') {
            statusTimer = setTimeout(() => {
                if (status) {
                    status.classList.remove('is-visible');
                    status.style.color = '';
                }
                statusTimer = null;
            }, 6000);
        }
    };

    const clearStatus = () => {
        if (statusTimer) {
            clearTimeout(statusTimer);
            statusTimer = null;
        }
        if (status) {
            status.classList.remove('is-visible');
            status.style.color = '';
        }
    };

    // Clear a field's error as soon as the user edits it again.
    const clearErrorOnInput = (event) => {
        const target = event.target;
        const errorId = target.name === 'learningMode' ? 'learning-mode' : target.name === 'batch' ? 'batch' : target.id;
        if (errorId) setError(errorId, '');

        // Also hide any submission status message while the user corrects things.
        if (status?.classList.contains('is-visible')) {
            clearStatus();
        }
    };

    form.addEventListener('input', clearErrorOnInput);
    form.addEventListener('change', clearErrorOnInput);

    // ------------------------------------------------
    // Validation patterns
    // ------------------------------------------------
    const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const PHONE_PATTERN = /^\d{7,15}$/;
    const CNIC_PATTERN = /^(?:\d{5}-\d{7}-\d|\d{13})$/;

    // ------------------------------------------------
    // Submit handler
    // ------------------------------------------------
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        clearStatus();

        // ---- Safely capture values (optional chaining prevents
        //      "Cannot read properties of null" errors) ----
        const fullName = document.getElementById('full-name')?.value?.trim() || '';
        const email = document.getElementById('email')?.value?.trim() || '';
        const phone = document.getElementById('phone')?.value?.trim() || '';
        const cnic = document.getElementById('cnic')?.value?.trim();
        const course = document.getElementById('course')?.value || '';
        const learningMode = form.querySelector("input[name='learningMode']:checked");
        const batch = form.querySelector("input[name='batch']:checked");
        const agreement = document.getElementById('agreement')?.checked || false;

        // ---- Validate mandatory fields ----
        // Full Name, Email, Phone, Course, Agreement,
        // plus the learning-mode / batch radio groups.
        let hasErrors = false;

        hasErrors = setError('full-name', fullName ? '' : 'Please enter your full name.') || hasErrors;
        hasErrors = setError('email', !email ? 'Please enter your email address.' : !EMAIL_PATTERN.test(email) ? 'Please enter a valid email address.' : '') || hasErrors;
        hasErrors = setError('phone', !phone ? 'Please enter your phone number.' : !PHONE_PATTERN.test(phone.replace(/[\s().+-]/g, '')) ? 'Please enter a valid phone number.' : '') || hasErrors;
        hasErrors = setError('cnic', !cnic ? 'Please enter your CNIC / B-Form number.' : !CNIC_PATTERN.test(cnic) ? 'Please enter a valid CNIC / B-Form number.' : '') || hasErrors;
        hasErrors = setError('course', course ? '' : 'Please select a course.') || hasErrors;
        hasErrors = setError('learning-mode', learningMode ? '' : 'Please choose a learning preference.') || hasErrors;
        hasErrors = setError('batch', batch ? '' : 'Please choose a batch preference.') || hasErrors;
        hasErrors = setError('agreement', agreement ? '' : 'Please confirm that your information is correct.') || hasErrors;

        if (hasErrors) {
            form.querySelector("[aria-invalid='true']")?.focus();
            showStatus('Please fix the highlighted fields and try again.', 'error');
            return;
        }

        // ---- Supabase client availability check ----
        const supabase = window.supabaseClient;
        if (!supabase) {
            showStatus('Error: Database connection not loaded. Please refresh the page.', 'error');
            return;
        }

        // ---- Insert into the Supabase 'students' table ----
        const studentData = {
            full_name: fullName,
            email: email,
            phone_number: phone,
            cnic_number: cnic,
            course_selected: course
        };

        try {
            const { data, error } = await supabase
                .from('students')
                .insert([studentData]);

            if (error) {
                console.error('Database Error:', error);
                showStatus('Registration Failed: ' + error.message, 'error');
            } else {
                form.reset();
                showStatus('Your application has been submitted successfully! Data saved to Supabase.', 'success');
                status?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } catch (err) {
            console.error('Unexpected Error:', err);
            showStatus('An unexpected error occurred. Please try again.', 'error');
        }
    });
});
