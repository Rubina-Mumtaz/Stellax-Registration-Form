document.addEventListener('DOMContentLoaded', () => {
	const supabaseClient = window.supabaseClient;
	const loginSection = document.getElementById('login-section');
	const dashboardSection = document.getElementById('dashboard-section');
	const loginForm = document.getElementById('trainer-login-form');
	const authError = document.getElementById('auth-error');
	const logoutButton = document.getElementById('logout-button');
	const courseFilter = document.getElementById('course-filter');
	const batchFilter = document.getElementById('batch-filter');
	const tableBody = document.getElementById('student-table-body')
		|| document.getElementById('student-roster-body');
	const saveAttendanceButton = document.getElementById('save-attendance-button');
	const rosterStatus = document.getElementById('roster-status');
	const today = new Date().toISOString().slice(0, 10);
	let students = [];
	let attendanceByRollNumber = new Map();

	if (!loginSection || !dashboardSection || !loginForm || !tableBody) return;

	const setText = (id, value) => {
		const element = document.getElementById(id);
		if (element) element.textContent = value;
	};

	const showMessage = (element, message, type = 'success') => {
		if (!element) return;

		element.textContent = message;
		element.hidden = !message;
		element.classList.toggle('trainer-status--error', type === 'error');
	};

	const setView = (isDashboardVisible) => {
		loginSection.hidden = isDashboardVisible;
		loginSection.style.display = isDashboardVisible ? 'none' : '';
		dashboardSection.hidden = !isDashboardVisible;
		dashboardSection.style.display = isDashboardVisible ? '' : 'none';
	};

	const normalize = (value) => String(value || '').trim().toLowerCase();

	const getStudentCourse = (student) => student.course_selected || student.course || '';

	const getStudentBatch = (student) => student.batch_name
		|| student.batch
		|| student.batch_number
		|| student.batch_preference
		|| '';

	const getExplicitStudentBatch = (student) => student.batch_name
		|| student.batch
		|| student.batch_number
		|| '';

	const getStudentRollNumber = (student) => student.roll_number || student.rollNumber || '';

	const getStudentName = (student) => student.full_name || student.name || 'Unnamed Student';

	const matchesCourse = (student, selectedCourse) => {
		if (!selectedCourse || selectedCourse === 'all') return true;
		return normalize(getStudentCourse(student)).replace(/[^a-z0-9]/g, '')
			=== normalize(selectedCourse).replace(/[^a-z0-9]/g, '');
	};

	const matchesBatch = (student, selectedBatch) => {
		if (!selectedBatch) return true;
		const studentBatch = getExplicitStudentBatch(student);
		return !studentBatch || normalize(studentBatch) === normalize(selectedBatch);
	};

	const getFilteredStudents = () => students.filter((student) => (
		matchesCourse(student, courseFilter?.value)
		&& matchesBatch(student, batchFilter?.value)
	));

	const getAttendanceStatus = (student) => {
		const rollNumber = getStudentRollNumber(student);
		return normalize(attendanceByRollNumber.get(rollNumber)
			|| student.attendance_status
			|| student.attendance
			|| '');
	};

	const escapeHtml = (value) => String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');

	const updateStats = () => {
		const visibleStudents = getFilteredStudents();
		const presentCount = visibleStudents.filter((student) => getAttendanceStatus(student) === 'present').length;
		const absentCount = visibleStudents.filter((student) => getAttendanceStatus(student) === 'absent').length;

		setText('total-students', visibleStudents.length);
		setText('present-today', presentCount);
		setText('absent-today', absentCount);
		setText('pending-tasks', absentCount);
	};

	const renderEmptyRoster = () => {
		tableBody.innerHTML = '<tr><td colspan="5">No students found for the selected course and batch.</td></tr>';
	};

	const renderRoster = () => {
		const visibleStudents = getFilteredStudents();
		tableBody.innerHTML = '';

		if (!visibleStudents.length) {
			renderEmptyRoster();
			updateStats();
			return;
		}

		visibleStudents.forEach((student) => {
			const rollNumber = getStudentRollNumber(student);
			const name = getStudentName(student);
			const course = getStudentCourse(student) || 'Not specified';
			const status = getAttendanceStatus(student);
			const row = document.createElement('tr');
			row.className = 'roster-row';
			row.dataset.course = escapeHtml(normalize(course));
			row.dataset.batch = escapeHtml(getStudentBatch(student));

			row.innerHTML = `
				<td data-label="Roll Number">${escapeHtml(rollNumber)}</td>
				<td data-label="Student Name">${escapeHtml(name)}</td>
				<td data-label="Course">${escapeHtml(course)}</td>
				<td data-label="Attendance Status">
					<fieldset class="attendance-control">
						<legend class="visually-hidden">Attendance for ${escapeHtml(name)}</legend>
						<label><input type="radio" name="attendance-${escapeHtml(rollNumber)}" value="present" ${status === 'present' ? 'checked' : ''}> Present</label>
						<label><input type="radio" name="attendance-${escapeHtml(rollNumber)}" value="absent" ${status === 'absent' ? 'checked' : ''}> Absent</label>
					</fieldset>
				</td>
				<td data-label="Actions"><button class="table-action" type="button" data-action="view" data-roll-number="${escapeHtml(rollNumber)}">View</button></td>
			`;

			tableBody.appendChild(row);
		});

		updateStats();
	};

	const loadTodayAttendance = async () => {
		attendanceByRollNumber = new Map();

		const { data, error } = await supabaseClient
			.from('attendance')
			.select('roll_number, status')
			.eq('attendance_date', today);

		if (error) {
			console.error('Attendance fetch error:', error);
			return;
		}

		data?.forEach((record) => {
			if (record.roll_number && record.status) {
				attendanceByRollNumber.set(record.roll_number, normalize(record.status));
			}
		});
	};

	const loadStudents = async () => {
		if (!supabaseClient) {
			console.error('Supabase client is unavailable.');
			showMessage(rosterStatus, 'Database connection unavailable.', 'error');
			return;
		}

		showMessage(rosterStatus, 'Loading students...');

		const { data, error } = await supabaseClient
			.from('students')
			.select('*');

		if (error) {
			console.error('Student roster database error:', error);
			students = [];
			renderRoster();
			showMessage(rosterStatus, 'Unable to load the student roster.', 'error');
			return;
		}

		students = data || [];
		await loadTodayAttendance();
		renderRoster();
		showMessage(rosterStatus, 'Roster updated.');
	};

	const authenticateTrainer = async (email, password) => {
		if (!supabaseClient?.auth) {
			throw new Error('Supabase Auth is unavailable.');
		}

		const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
		if (error) throw error;

		return data.user;
	};

	loginForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		showMessage(authError, '');

		const emailInput = document.getElementById('trainer-login-email');
		const passwordInput = document.getElementById('trainer-login-password');
		const email = emailInput?.value.trim() || '';
		const password = passwordInput?.value || '';
		const submitButton = loginForm.querySelector('button[type="submit"]');

		if (!email || !password || !emailInput?.checkValidity()) {
			showMessage(authError, 'Please enter a valid email and password.', 'error');
			(email ? passwordInput : emailInput)?.focus();
			return;
		}

		if (submitButton) {
			submitButton.disabled = true;
			submitButton.textContent = 'Signing in...';
		}

		try {
			const user = await authenticateTrainer(email, password);
			setText('trainer-name', user.user_metadata?.full_name || user.user_metadata?.name || 'Trainer');
			setText('trainer-email', user.email || email);
			setView(true);
			await loadStudents();
		} catch (error) {
			console.error('Trainer authentication error:', error);
			showMessage(authError, error.message === 'Invalid login credentials'
				? 'Invalid email or password.'
				: 'Unable to sign in. Please try again.', 'error');
		} finally {
			if (submitButton) {
				submitButton.disabled = false;
				submitButton.textContent = 'Login to Dashboard';
			}
		}
	});

	courseFilter?.addEventListener('change', renderRoster);
	batchFilter?.addEventListener('change', renderRoster);

	tableBody.addEventListener('change', (event) => {
		if (!event.target.matches('input[type="radio"]')) return;

		const rollNumber = event.target.name.replace('attendance-', '');
		attendanceByRollNumber.set(rollNumber, event.target.value);
		updateStats();
	});

	saveAttendanceButton?.addEventListener('click', async () => {
		const visibleStudents = getFilteredStudents();
		const records = visibleStudents.map((student) => {
			const rollNumber = getStudentRollNumber(student);
			const status = attendanceByRollNumber.get(rollNumber);
			return {
				student_id: student.id || null,
				roll_number: rollNumber,
				attendance_date: today,
				status,
				course: getStudentCourse(student),
				batch: getStudentBatch(student) || batchFilter?.value || null
			};
		}).filter((record) => record.status);

		if (!records.length) {
			showMessage(rosterStatus, 'Mark Present or Absent for at least one student.', 'error');
			return;
		}

		saveAttendanceButton.disabled = true;
		saveAttendanceButton.textContent = 'Saving...';

		try {
			const { error } = await supabaseClient
				.from('attendance')
				.upsert(records, { onConflict: 'roll_number,attendance_date' });

			if (error) throw error;

			showMessage(rosterStatus, 'Attendance saved successfully.');
		} catch (error) {
			console.error('Attendance save error:', error);
			showMessage(rosterStatus, 'Unable to save attendance. Please try again.', 'error');
		} finally {
			saveAttendanceButton.disabled = false;
			saveAttendanceButton.textContent = 'Save Attendance';
		}
	});

	logoutButton?.addEventListener('click', async () => {
		if (supabaseClient?.auth) {
			const { error } = await supabaseClient.auth.signOut();
			if (error) console.error('Trainer logout error:', error);
		}

		loginForm.reset();
		students = [];
		attendanceByRollNumber.clear();
		tableBody.innerHTML = '';
		setView(false);
		showMessage(authError, '');
	});

	const restoreSession = async () => {
		if (!supabaseClient?.auth) return;

		const { data, error } = await supabaseClient.auth.getSession();
		if (error) {
			console.error('Trainer session error:', error);
			return;
		}

		if (data.session?.user) {
			setText('trainer-name', data.session.user.user_metadata?.full_name || 'Trainer');
			setText('trainer-email', data.session.user.email || '');
			setView(true);
			await loadStudents();
		}
	};

	setText('dashboard-date', new Date().toLocaleDateString(undefined, {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	}));
	restoreSession();
});
