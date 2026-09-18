document.addEventListener('DOMContentLoaded', () => {
	const supabaseClient = window.supabaseClient;
	const loginSection = document.getElementById('login-section');
	const dashboardSection = document.getElementById('dashboard-section');
	const loginForm = document.getElementById('admin-login-form');
	const loginError = document.getElementById('login-error');
	const logoutButton = document.getElementById('logout-button');
	const tableBody = document.getElementById('student-table-body');
	const rowTemplate = document.getElementById('student-row-template');
	const searchInput = document.getElementById('student-search');
	const courseFilter = document.getElementById('course-filter');
	const batchFilter = document.getElementById('batch-filter');
	const statusFilter = document.getElementById('status-filter');
	const trainerForm = document.getElementById('trainer-form');
	let students = [];

	if (!loginSection || !dashboardSection || !loginForm || !tableBody) return;

	const normalize = (value) => String(value || '').trim().toLowerCase();

	const getStudentName = (student) => student.full_name || student.name || 'Unnamed Student';
	const getFatherName = (student) => student.father_name || student.guardian_name || 'Not available';
	const getRollNumber = (student) => student.roll_number || student.rollNumber || '';
	const getCnic = (student) => student.cnic_number || student.cnic || student.cnicNumber || '';
	const getPhone = (student) => student.phone || student.phone_number || student.whatsapp || student.father_phone || '';
	const getCourse = (student) => student.course_selected || student.course || '';
	const getBatch = (student) => student.batch_name || student.batch || student.batch_number || student.batch_preference || 'Batch-5';
	const getStatus = (student) => student.status || student.admission_status || student.registration_status || 'Pending';

	const setText = (id, value) => {
		const element = document.getElementById(id);
		if (element) element.textContent = value;
	};

	const showError = (message) => {
		if (!loginError) return;
		loginError.textContent = message;
		loginError.hidden = !message;
	};

	const setView = (showDashboard) => {
		loginSection.hidden = showDashboard;
		loginSection.style.display = showDashboard ? 'none' : '';
		dashboardSection.hidden = !showDashboard;
		dashboardSection.style.display = showDashboard ? '' : 'none';
	};

	const setButtonBusy = (button, busy, busyText, idleText) => {
		if (!button) return;
		button.disabled = busy;
		button.textContent = busy ? busyText : idleText;
	};

	const getFilteredStudents = () => {
		const query = normalize(searchInput?.value);
		const selectedCourse = normalize(courseFilter?.value);
		const selectedBatch = normalize(batchFilter?.value);
		const selectedStatus = normalize(statusFilter?.value);

		return students.filter((student) => {
			const searchableText = [getStudentName(student), getRollNumber(student), getCnic(student)]
				.map(normalize)
				.join(' ');
			return (!query || searchableText.includes(query))
				&& (!selectedCourse || normalize(getCourse(student)) === selectedCourse)
				&& (!selectedBatch || normalize(getBatch(student)) === selectedBatch)
				&& (!selectedStatus || normalize(getStatus(student)) === selectedStatus);
		});
	};

	const updateStats = () => {
		const pendingCount = students.filter((student) => normalize(getStatus(student)) === 'pending').length;
		const approvedCount = students.filter((student) => normalize(getStatus(student)) === 'approved').length;
		const batches = new Set(students.map(getBatch).filter(Boolean));
		setText('total-students', students.length);
		setText('pending-approvals', pendingCount);
		setText('active-students', approvedCount);
		setText('active-batches', batches.size || 0);
	};

	const renderEmptyState = (message = 'No student records available.') => {
		tableBody.innerHTML = `<tr class="empty-state"><td colspan="9">${message}</td></tr>`;
	};

	const renderStudents = () => {
		const filteredStudents = getFilteredStudents();
		tableBody.innerHTML = '';

		if (!filteredStudents.length) {
			renderEmptyState('No students match the selected filters.');
			updateStats();
			return;
		}

		filteredStudents.forEach((student) => {
			const row = rowTemplate?.content.firstElementChild
				? rowTemplate.content.firstElementChild.cloneNode(true)
				: document.createElement('tr');
			row.dataset.studentId = student.id || '';
			row.dataset.rollNumber = getRollNumber(student);

			if (!rowTemplate?.content.firstElementChild) {
				row.innerHTML = '<td></td>'.repeat(9);
			}

			const values = {
				rollNumber: getRollNumber(student) || 'Pending',
				fullName: getStudentName(student),
				fatherName: getFatherName(student),
				cnic: getCnic(student) || 'Not available',
				phone: getPhone(student) || 'Not available',
				course: getCourse(student) || 'Not specified',
				batch: getBatch(student),
				status: getStatus(student)
			};

			Object.entries(values).forEach(([field, value]) => {
				const cell = row.querySelector(`[data-field="${field}"]`);
				if (!cell) return;
				cell.textContent = value;
				if (field === 'status') cell.dataset.status = value;
			});

			tableBody.appendChild(row);
		});
		updateStats();
	};

	const loadStudents = async () => {
		if (!supabaseClient) throw new Error('Supabase client is unavailable.');
		const { data, error } = await supabaseClient.from('students').select('*');
		if (error) throw error;
		students = data || [];
		renderStudents();
		const updatedAt = document.getElementById('last-updated');
		if (updatedAt) {
			const now = new Date();
			updatedAt.dateTime = now.toISOString();
			updatedAt.textContent = `Last updated ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
		}
	};

	const generateRollNumber = () => {
		const numbers = students
			.map(getRollNumber)
			.map((rollNumber) => Number(String(rollNumber).match(/(\d+)$/)?.[1] || 0))
			.filter(Number.isFinite);
		const nextNumber = Math.max(2000, ...numbers) + 1;
		return `FL-${nextNumber}`;
	};

	const updateStudentStatus = async (student, status) => {
		if (!student.id) throw new Error('This student record has no database id.');
		const updates = { status };
		if (status === 'Approved' && !getRollNumber(student)) updates.roll_number = generateRollNumber();
		const { error } = await supabaseClient.from('students').update(updates).eq('id', student.id);
		if (error) throw error;
		await loadStudents();
	};

	const handleStudentAction = async (button) => {
		const row = button.closest('tr');
		const student = students.find((item) => String(item.id) === row?.dataset.studentId);
		const action = button.dataset.action;
		if (!student || !action) return;

		if (action === 'delete' && !window.confirm(`Delete ${getStudentName(student)} from the student records?`)) return;
		const originalText = button.textContent;
		setButtonBusy(button, true, 'Saving...', originalText);

		try {
			if (action === 'delete') {
				const { error } = await supabaseClient.from('students').delete().eq('id', student.id);
				if (error) throw error;
				await loadStudents();
			} else {
				await updateStudentStatus(student, action === 'approve' ? 'Approved' : 'Rejected');
			}
		} catch (error) {
			console.error('Student action error:', error);
			window.alert('Unable to update this student record. Please try again.');
		} finally {
			setButtonBusy(button, false, 'Saving...', originalText);
		}
	};

	loginForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		showError('');
		const emailInput = document.getElementById('admin-email');
		const passwordInput = document.getElementById('admin-password');
		const email = emailInput?.value.trim() || '';
		const password = passwordInput?.value || '';
		const submitButton = loginForm.querySelector('button[type="submit"]');

		if (!email || !password || !emailInput?.checkValidity()) {
			showError('Enter a valid administrator email and password.');
			(email ? passwordInput : emailInput)?.focus();
			return;
		}

		setButtonBusy(submitButton, true, 'Signing in...', 'Login as Administrator');
		try {
			const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
			if (error) throw error;
			setView(true);
			await loadStudents();
		} catch (error) {
			console.error('Admin authentication error:', error);
			showError(error.message === 'Invalid login credentials'
				? 'Invalid administrator email or password.'
				: 'Unable to sign in. Please try again.');
		} finally {
			setButtonBusy(submitButton, false, 'Signing in...', 'Login as Administrator');
		}
	});

	[searchInput, courseFilter, batchFilter, statusFilter].forEach((control) => {
		control?.addEventListener(control === searchInput ? 'input' : 'change', renderStudents);
	});

	tableBody.addEventListener('click', (event) => {
		const button = event.target.closest('[data-action]');
		if (button) handleStudentAction(button);
	});

	trainerForm?.addEventListener('submit', async (event) => {
		event.preventDefault();
		const submitButton = trainerForm.querySelector('button[type="submit"]');
		const formData = new FormData(trainerForm);
		const trainer = {
			name: String(formData.get('trainerName') || '').trim(),
			email: String(formData.get('trainerEmail') || '').trim(),
			assigned_course: String(formData.get('assignedCourse') || '').trim()
		};
		if (!trainer.name || !trainer.email || !trainer.assigned_course) return;

		setButtonBusy(submitButton, true, 'Adding...', 'Add Trainer');
		try {
			const { error } = await supabaseClient.from('trainers').insert(trainer);
			if (error) throw error;
			trainerForm.reset();
			window.alert('Trainer added successfully.');
		} catch (error) {
			console.error('Trainer creation error:', error);
			window.alert('Unable to add the trainer. Please try again.');
		} finally {
			setButtonBusy(submitButton, false, 'Adding...', 'Add Trainer');
		}
	});

	logoutButton?.addEventListener('click', async () => {
		try {
			await supabaseClient?.auth.signOut();
		} catch (error) {
			console.error('Admin logout error:', error);
		}
		students = [];
		loginForm.reset();
		showError('');
		renderEmptyState();
		setView(false);
		document.getElementById('admin-email')?.focus();
	});

	const restoreSession = async () => {
		if (!supabaseClient?.auth) return;
		const { data } = await supabaseClient.auth.getSession();
		if (!data.session) return;
		setView(true);
		try {
			await loadStudents();
		} catch (error) {
			console.error('Admin session restore error:', error);
			showError('Unable to load the student dashboard. Please sign in again.');
			setView(false);
		}
	};

	setView(false);
	restoreSession();
});
