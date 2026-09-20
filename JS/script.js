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
    const photoInput = document.getElementById('student-photo');
    const photoPreview = document.getElementById('photo-preview');

    photoInput?.addEventListener('change', () => {
        const file = photoInput.files?.[0];
        if (!file) {
            photoPreview.innerHTML = '<i class="fa-solid fa-camera" aria-hidden="true"></i>';
            return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            photoPreview.innerHTML = '';
            const image = document.createElement('img');
            image.src = reader.result;
            image.alt = 'Selected student profile photo preview';
            photoPreview.appendChild(image);
        });
        reader.readAsDataURL(file);
    });

    form?.addEventListener('reset', () => {
        photoPreview.innerHTML = '<i class="fa-solid fa-camera" aria-hidden="true"></i>';
    });

    const tabButtons = [...document.querySelectorAll('[data-tab-target]')];
    const tabPanels = [...document.querySelectorAll('.portal-tab-panel')];

    const activateTab = (targetId) => {
        tabButtons.forEach((button) => {
            const isActive = button.dataset.tabTarget === targetId;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', String(isActive));
        });
        tabPanels.forEach((panel) => {
            const isActive = panel.id === targetId;
            panel.classList.toggle('is-active', isActive);
            panel.hidden = !isActive;
        });
    };

    tabButtons.forEach((button) => {
        button.addEventListener('click', () => activateTab(button.dataset.tabTarget));
    });

    const supabaseClient = window.supabaseClient;
    const normalizeLookupValue = (value) => String(value || '').trim();
    const getLookupStudent = async (rollNumber, cnicNumber) => {
        if (!supabaseClient) throw new Error('Database connection unavailable.');
        const { data, error } = await supabaseClient
            .from('students')
            .select('*')
            .eq('roll_number', normalizeLookupValue(rollNumber).toUpperCase())
            .eq('cnic_number', normalizeLookupValue(cnicNumber))
            .maybeSingle();
        if (error) throw error;
        return data;
    };

    const showPanelMessage = (id, message, type = 'error') => {
        const messageElement = document.getElementById(id);
        if (!messageElement) return;
        messageElement.textContent = message;
        messageElement.className = `portal-panel-message is-visible ${type === 'success' ? 'is-success' : ''}`;
    };

    const getStudentCourse = (student) => student?.course_selected || student?.course || 'Not available';
    const getStudentBatch = (student) => student?.batch || student?.batch_preference || 'Pending';

    const generateQRCode = (rollNumber) => {
        const qrContainer = document.getElementById('qrcode');
        if (!qrContainer || !rollNumber || typeof window.QRCode !== 'function') return;

        qrContainer.innerHTML = '';
        new window.QRCode(qrContainer, {
            text: `https://stellaxacademy.com/attendance?roll=${encodeURIComponent(rollNumber)}`,
            width: 46,
            height: 46,
            colorDark: '#15334b',
            colorLight: '#ffffff',
            correctLevel: window.QRCode.CorrectLevel.H
        });
    };

    const fillIdCardPreview = (student) => {
        const setPreviewText = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value || 'Not available';
        };
        setPreviewText('preview-student-name', student.full_name || student.name);
        setPreviewText('preview-father-name', student.father_name || student.guardian_name);
        setPreviewText('preview-cnic', student.cnic_number);
        setPreviewText('preview-roll-number', student.roll_number);
        setPreviewText('preview-course', getStudentCourse(student));
        generateQRCode(student.roll_number);
        const previewPhoto = document.getElementById('preview-photo');
        const photoPlaceholder = document.getElementById('preview-photo-placeholder');
        if (previewPhoto && photoPlaceholder) {
            previewPhoto.src = student.photo_url || '';
            previewPhoto.hidden = !student.photo_url;
            photoPlaceholder.hidden = Boolean(student.photo_url);
        }
        document.getElementById('id-card-preview')?.removeAttribute('hidden');
    };

    const bindLookupForm = (formId, rollId, cnicId, messageId, onSuccess) => {
        const lookupForm = document.getElementById(formId);
        lookupForm?.addEventListener('submit', async (event) => {
            event.preventDefault();
            showPanelMessage(messageId, 'Searching...', 'success');
            try {
                const student = await getLookupStudent(
                    document.getElementById(rollId)?.value,
                    document.getElementById(cnicId)?.value
                );
                if (!student) {
                    showPanelMessage(messageId, 'No student record found for these details.');
                    return;
                }
                await onSuccess(student, messageId);
            } catch (error) {
                console.error(`${formId} lookup error:`, error);
                showPanelMessage(messageId, 'Unable to complete the search. Please try again.');
            }
        });
    };

    bindLookupForm('id-card-lookup-form', 'id-card-roll-number-input', 'id-card-cnic-input', 'id-card-lookup-message', (student, messageId) => {
        if (String(student.status || '').toLowerCase() !== 'approved') {
            showPanelMessage(messageId, 'Your ID card will be available after approval.');
            return;
        }
        fillIdCardPreview(student);
        showPanelMessage(messageId, 'ID card found. You can download the PDF below.', 'success');
    });

    bindLookupForm('status-lookup-form', 'status-roll-input', 'status-cnic-input', 'status-lookup-message', (student, messageId) => {
        const statusValue = student.status || student.admission_status || 'Pending';
        showPanelMessage(messageId, `Current status: ${statusValue}. Batch: ${getStudentBatch(student)}.`, 'success');
    });

    bindLookupForm('result-lookup-form', 'result-roll-input', 'result-cnic-input', 'result-lookup-message', (student, messageId) => {
        const result = student.result || student.final_result || student.exam_result || student.entry_test_result;
        showPanelMessage(messageId, result ? `Result: ${result}` : 'No result has been published for this student yet.', Boolean(result) ? 'success' : 'error');
    });

    document.getElementById('download-preview-pdf')?.addEventListener('click', async (event) => {
        const button = event.currentTarget;
        const preview = document.getElementById('registration-id-card-preview');
        if (!preview || typeof window.html2pdf !== 'function') {
            showPanelMessage('id-card-lookup-message', 'PDF download is unavailable. Please refresh and try again.');
            return;
        }
        const rollNumber = document.getElementById('preview-roll-number')?.textContent.trim() || 'student';
        button.disabled = true;
        button.textContent = 'Preparing PDF...';
        preview.classList.add('pdf-export');
        try {
            await window.html2pdf().set({
                margin: 10,
                filename: `stellax-id-card-${rollNumber}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).from(preview).save();
        } catch (error) {
            console.error('Registration ID card PDF error:', error);
            showPanelMessage('id-card-lookup-message', 'Unable to create the PDF. Please try again.');
        } finally {
            preview.classList.remove('pdf-export');
            button.disabled = false;
            button.textContent = 'Download PDF';
        }
    });

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
        const errorId = target.name === 'learningMode' ? 'learning-mode' : target.name === 'timing' ? 'timing' : target.id;
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
    const CNIC_PATTERN = /^[0-9]{13}$/;

    const getRequiredFieldLabel = (field) => {
        const label = field.closest('.field')?.querySelector('.field-label, label')?.textContent.trim();
        return label?.replace('*', '').trim() || field.name || field.id;
    };

    const validateRequiredFields = () => {
        const missingFields = [];
        const checkedRadioGroups = new Set();

        form.querySelectorAll('input, select, textarea').forEach((field) => {
            if (field.type === 'radio') {
                if (checkedRadioGroups.has(field.name)) return;
                checkedRadioGroups.add(field.name);

                if (!form.querySelector(`input[name="${field.name}"]:checked`)) {
                    missingFields.push(getRequiredFieldLabel(field));
                }
                return;
            }

            const isEmpty = field.type === 'checkbox'
                ? !field.checked
                : !field.value.trim();

            if (isEmpty) missingFields.push(getRequiredFieldLabel(field));
        });

        return missingFields;
    };

    // ------------------------------------------------
    // Submit handler
    // ------------------------------------------------
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        clearStatus();

        // ---- Safely capture values (optional chaining prevents
        //      "Cannot read properties of null" errors) ----
        const fullName = document.getElementById('full-name')?.value?.trim() || '';
        const fatherName = document.getElementById('father-name')?.value?.trim()
            || document.getElementById('guardian-name')?.value?.trim() || '';
        const dob = document.getElementById('dob')?.value?.trim()
            || document.getElementById('date-of-birth')?.value?.trim() || null;
        const gender = document.getElementById('gender')?.value
            || form.querySelector("input[name='gender']:checked")?.value || '';
        const email = document.getElementById('email')?.value?.trim() || '';
        const phone = document.getElementById('phone')?.value?.trim() || '';
        const guardianPhone = document.getElementById('father-phone')?.value?.trim()
            || document.getElementById('whatsapp')?.value?.trim() || '';
        const cnic = document.getElementById('cnic')?.value?.trim() || '';
        const address = document.getElementById('address')?.value?.trim() || '';
        const qualification = document.getElementById('qualification')?.value || '';
        const course = document.getElementById('course')?.value || '';
        const learningMode = form.querySelector("input[name='learningMode']:checked")?.value || 'Online';
        const timing = form.querySelector("input[name='timing']:checked")?.value || '';
        const agreement = document.getElementById('agreement')?.checked || false;
        const photoFile = photoInput?.files?.[0] || null;

        // ---- Validate every required field before format checks ----
        let hasErrors = false;
        const missingFields = validateRequiredFields();

        missingFields.forEach((fieldLabel) => {
            const field = [...form.querySelectorAll('[required]')]
                .find((control) => getRequiredFieldLabel(control) === fieldLabel);
            if (field) field.setAttribute('aria-invalid', 'true');
        });

        hasErrors = missingFields.length > 0;

        hasErrors = setError('full-name', fullName ? '' : 'Please enter your full name.') || hasErrors;
        hasErrors = setError('guardian-name', fatherName ? '' : "Please enter your father's / guardian's name.") || hasErrors;
        hasErrors = setError('date-of-birth', dob ? '' : 'Please enter your date of birth.') || hasErrors;
        hasErrors = setError('email', !email ? 'Please enter your email address.' : !EMAIL_PATTERN.test(email) ? 'Please enter a valid email address.' : '') || hasErrors;
        hasErrors = setError('phone', !phone ? 'Please enter your phone number.' : !PHONE_PATTERN.test(phone.replace(/[\s().+-]/g, '')) ? 'Please enter a valid phone number.' : '') || hasErrors;
        hasErrors = setError('whatsapp', !guardianPhone ? 'Please enter the student phone number.' : '') || hasErrors;
        hasErrors = setError('cnic', !cnic ? 'Please enter your CNIC / B-Form number.' : !CNIC_PATTERN.test(cnic) ? 'CNIC / B-Form must contain exactly 13 digits.' : '') || hasErrors;
        hasErrors = setError('course', course ? '' : 'Please select a course.') || hasErrors;
        hasErrors = setError('learning-mode', learningMode ? '' : 'Please choose a learning preference.') || hasErrors;
        hasErrors = setError('timing', timing ? '' : 'Please choose a class timing.') || hasErrors;
        hasErrors = setError('agreement', agreement ? '' : 'Please confirm that your information is correct.') || hasErrors;

        const photoError = !photoFile
            ? 'Please upload a passport-size student photo.'
            : !photoFile.type.startsWith('image/')
                ? 'Please upload an image file.'
                : photoFile.size > 2 * 1024 * 1024
                    ? 'Student photo must be 2MB or smaller.'
                    : '';
        hasErrors = setError('student-photo', photoError) || hasErrors;

        if (phone && guardianPhone && phone.replace(/\D/g, '') === guardianPhone.replace(/\D/g, '')) {
            hasErrors = setError('whatsapp', 'Student and father phone numbers must be different.') || hasErrors;
        }

        if (hasErrors) {
            form.querySelector("[aria-invalid='true']")?.focus();
            const missingMessage = missingFields.length
                ? `Please complete: ${missingFields.join(', ')}.`
                : 'Please fix the highlighted fields and try again.';
            showStatus(missingMessage, 'error');
            return;
        }

        // ---- Supabase client availability check ----
        const supabase = window.supabaseClient;
        if (!supabase) {
            showStatus('Error: Database connection not loaded. Please refresh the page.', 'error');
            return;
        }

        const normalizedCourse = course.trim().toLowerCase();
        const coursePrefixes = {
            'graphic designing': 'GA-',
            'digital marketing': 'DM-',
            'web & app development': 'WD-',
            'video editing': 'VE-',
            canva: 'CN-',
            freelancing: 'FL-'
        };
        const coursePrefix = coursePrefixes[normalizedCourse] || 'ST-';
        const seriesStart = normalizedCourse === 'freelancing' ? 2000 : 1000;
        const randomNumber = Math.floor(seriesStart + Math.random() * (10000 - seriesStart));
        const provisionalRollNumber = `${coursePrefix}${randomNumber}`;

        let photoUrl = '';
        try {
            const fileExtension = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
            const photoPath = `${provisionalRollNumber}-${cnic}.${fileExtension}`;
            const { error: uploadError } = await supabase.storage
                .from('student-photos')
                .upload(photoPath, photoFile, { contentType: photoFile.type, upsert: false });

            if (uploadError) throw uploadError;
            const { data: publicUrlData } = supabase.storage
                .from('student-photos')
                .getPublicUrl(photoPath);
            photoUrl = publicUrlData.publicUrl;
        } catch (error) {
            console.error('Student photo upload error:', error);
            showStatus('Photo upload failed. Please try again with a JPG or PNG image under 2MB.', 'error');
            return;
        }

        // ---- Insert into the Supabase 'students' table ----
        const studentData = {
            full_name: fullName,
            father_name: fatherName,
            dob: dob,
            gender: gender,
            email: email,
            phone_number: phone,
            guardian_phone: guardianPhone,
            cnic_number: cnic,
            address: address,
            qualification: qualification,
            course_selected: course,
            roll_number: provisionalRollNumber,
            learning_mode: learningMode,
            timing: timing,
            batch: 'Pending',
            status: 'Pending',
            photo_url: photoUrl
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
                const onlineMode = form.querySelector("input[name='learningMode'][value='Online']");
                if (onlineMode) onlineMode.checked = true;
                showStatus('Application Submitted Successfully! We will review your details and contact you soon.', 'success');
                status?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } catch (err) {
            console.error('Unexpected Error:', err);
            showStatus('An unexpected error occurred. Please try again.', 'error');
        }
    });
});
