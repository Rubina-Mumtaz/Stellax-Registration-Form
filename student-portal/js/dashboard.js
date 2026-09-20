document.addEventListener('DOMContentLoaded', async () => {
    const dashboardView = document.getElementById('dashboard-view');
    const supabaseClient = window.supabaseClient;
    const storedStudentId = localStorage.getItem('studentId');

    if (!supabaseClient) {
        window.location.href = '../student-login/student-login.html';
        return;
    }

    const setText = (id, value, fallback = '') => {
        const element = document.getElementById(id);
        if (element) element.textContent = value ?? fallback;
    };
    const firstValue = (record, keys, fallback = 0) => {
        for (const key of keys) {
            if (record?.[key] !== null && record?.[key] !== undefined && record[key] !== '') return record[key];
        }
        return fallback;
    };
    const numberValue = (record, keys) => Number(firstValue(record, keys, 0)) || 0;
    const formatStat = (current, total) => `${current}/${total}`;
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);

    const getSession = async () => {
        try {
            const { data } = await supabaseClient.auth.getSession();
            return data?.session || null;
        } catch (error) {
            console.warn('Supabase Auth session unavailable:', error);
            return null;
        }
    };

    const findStudent = async (session) => {
        if (storedStudentId) {
            const { data, error } = await supabaseClient.from('students').select('*').eq('id', storedStudentId).maybeSingle();
            if (error) throw error;
            if (data) return data;
        }

        const email = session?.user?.email;
        if (!email) return null;
        const { data, error } = await supabaseClient.from('students').select('*').eq('email', email).maybeSingle();
        if (error) throw error;
        return data;
    };

    const renderFees = async (student) => {
        const body = document.getElementById('fee-table-body');
        if (!body) return;
        let records = [];
        const tableNames = ['fees', 'fee_records'];

        for (const tableName of tableNames) {
            let query = supabaseClient.from(tableName).select('*');
            if (student.id !== undefined && student.id !== null) query = query.eq('student_id', student.id);
            const result = await query;
            if (!result.error) {
                records = result.data || [];
                if (!records.length && student.roll_number) {
                    const rollResult = await supabaseClient.from(tableName).select('*').eq('roll_number', student.roll_number);
                    if (!rollResult.error) records = rollResult.data || [];
                }
                if (records.length || tableName === tableNames[tableNames.length - 1]) break;
            }
        }

        if (!records.length) {
            body.innerHTML = '<tr><td colspan="6">No fee records found</td></tr>';
            return;
        }

        body.innerHTML = records.map((fee) => {
            const month = firstValue(fee, ['month', 'billing_month', 'fee_month'], 'Current month');
            const amount = firstValue(fee, ['amount', 'fee_amount', 'total_amount'], 'Pending');
            const type = firstValue(fee, ['type', 'fee_type'], 'Monthly');
            const dueDate = firstValue(fee, ['due_date', 'dueDate'], 'Pending');
            const voucherId = firstValue(fee, ['voucher_id', 'voucherId', 'voucher_number'], 'Pending');
            const status = String(firstValue(fee, ['status', 'payment_status'], 'PENDING')).toUpperCase();
            const paidClass = status === 'PAID' ? ' paid' : '';
            return `<tr><td>${escapeHtml(month)}</td><td>${escapeHtml(amount)}</td><td>${escapeHtml(type)}</td><td>${escapeHtml(dueDate)}</td><td>${escapeHtml(voucherId)} <button class="copy-btn" type="button" aria-label="Copy voucher ID"><i class="fa-regular fa-copy"></i></button></td><td><span class="status-badge${paidClass}">${escapeHtml(status)}</span></td></tr>`;
        }).join('');
    };

    try {
        const session = await getSession();
        const student = await findStudent(session);
        if (!student) throw new Error('No active student session found.');

        const fullName = student.full_name || student.name || 'Student';
        const email = student.email || session?.user?.email || 'Student';
        const course = student.course_selected || student.course || 'Modern Web Application Development';
        const rollNumber = student.roll_number || 'Not assigned';
        const attendanceCurrent = numberValue(student, ['attendance_count', 'attended_classes', 'classes_attended']);
        const attendanceTotal = numberValue(student, ['total_classes', 'classes_total']);
        const assignmentCurrent = numberValue(student, ['assignments_submitted', 'completed_assignments']);
        const assignmentTotal = numberValue(student, ['total_assignments', 'assignments_total']);
        const progress = Math.max(0, Math.min(100, numberValue(student, ['progress_percentage', 'course_progress', 'completed_percentage'])));

        setText('sidebar-student-name', fullName, 'Student');
        setText('sidebar-student-contact', email || rollNumber, rollNumber);
        setText('breadcrumb-course', course, 'Modern Web Application Development');
        setText('selected-course', course, 'Modern Web Application Development');
        setText('profile-roll-number', rollNumber, 'Not assigned');
        setText('batch-name', student.batch || student.batch_name || 'Pending');
        setText('attendance-stat', formatStat(attendanceCurrent, attendanceTotal), '0/0');
        setText('assignment-stat', formatStat(assignmentCurrent, assignmentTotal), '0/0');
        setText('progress-label', `${progress}% Completed`, '0% Completed');
        document.getElementById('progress-bar-fill')?.style.setProperty('width', `${progress}%`);

        dashboardView.hidden = false;
        dashboardView.classList.add('active');
        dashboardView.style.display = 'block';
        await renderFees(student);
    } catch (error) {
        console.error('Student dashboard session error:', error);
        localStorage.removeItem('studentId');
        window.location.href = '../student-login/student-login.html';
    }
});
