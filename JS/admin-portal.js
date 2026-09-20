let allStudents = [];

document.addEventListener('DOMContentLoaded', () => {
	const supabase = window.supabaseClient;
	const loginSection = document.getElementById('login-section');
	const dashboardSection = document.getElementById('dashboard-section');
	const loginForm = document.getElementById('admin-login-form');
	const loginError = document.getElementById('login-error');
	const logoutButton = document.getElementById('logout-button');
	const tableBody = document.getElementById('student-table-body');
	const rowTemplate = document.getElementById('student-row-template');
	const searchInput = document.getElementById('search-input') || document.getElementById('student-search');
	const searchButton = document.getElementById('student-search-button');
	const courseFilter = document.getElementById('course-filter');
	const batchFilter = document.getElementById('batch-filter');
	const statusFilter = document.getElementById('status-filter');
	const trainerForm = document.getElementById('trainer-form');

	if (!loginSection || !dashboardSection || !loginForm || !tableBody) return;

	const normalize = (value) => String(value ?? '').toLowerCase().trim();
	const normalizeCnic = (value) => normalize(value).replace(/-/g, '');
	const getStudentName = (student) => student.full_name || student.name || 'Unnamed Student';
	const getFatherName = (student) => student.father_name || student.guardian_name || 'Not available';
	const getRollNumber = (student) => student.roll_number || student.rollNumber || '';
	const getCnic = (student) => student.cnic_number || student.cnic || student.cnicNumber || '';
	const getPhone = (student) => student.phone || student.phone_number || student.whatsapp || student.father_phone || '';
	const getCourse = (student) => student.course_selected || student.course || '';
	const getBatch = (student) => student.batch || student.batch_preference || student.batch_name || student.batch_number || 'Pending';
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

	const updateStats = () => {
		const pendingCount = allStudents.filter((student) => {
			const status = String(student.status || '').toLowerCase().trim();
			return status === 'pending'
				|| status === 'unapproved'
				|| status === ''
				|| status === 'null';
		}).length;
		const approvedCount = allStudents.filter((student) => {
			const status = String(student.status || '').toLowerCase().trim();
			return status === 'approved' || status === 'active';
		}).length;
		const activeBatches = new Set(
			allStudents
				.map((student) => student.batch)
				.filter((batch) => batch && batch !== 'Pending')
		).size;

		setText('total-students', allStudents.length);
		setText('pending-approvals', pendingCount);
		setText('active-students', approvedCount);
		setText('active-batches', activeBatches);
	};

	const renderEmptyState = (message = 'No matching students found.') => {
		tableBody.innerHTML = `<tr class="empty-state"><td colspan="9">${message}</td></tr>`;
	};

	const renderTable = (students) => {
		tableBody.innerHTML = '';
		if (!students.length) {
			renderEmptyState();
			return;
		}

		students.forEach((student) => {
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
			const approveButton = row.querySelector('[data-action="approve"]');
			if (approveButton && student.id != null) {
				approveButton.setAttribute('onclick', `approveStudent('${String(student.id).replace(/'/g, "\\'")}')`);
			}

			tableBody.appendChild(row);
		});
	};

	const applyFilters = () => {
		const query = normalize(searchInput?.value);
		const compactQuery = normalizeCnic(query);
		const selectedCourse = normalize(courseFilter?.value);
		const selectedBatch = normalize(batchFilter?.value);
		const selectedStatus = normalize(statusFilter?.value);

		const filteredStudents = allStudents.filter((student) => {
			const searchableText = [
				student.full_name,
				student.roll_number,
				student.father_name,
				student.phone,
				student.phone_number
			]
				.map(normalize)
				.join(' ');
			const studentCnic = normalizeCnic(student.cnic_number);

			return (!query || searchableText.includes(query) || studentCnic.includes(compactQuery))
				&& (!selectedCourse || normalize(getCourse(student)) === selectedCourse)
				&& (!selectedBatch || normalize(getBatch(student)) === selectedBatch)
				&& (!selectedStatus || normalize(getStatus(student)) === selectedStatus);
		});

		renderTable(filteredStudents);
	};

	const loadStudents = async () => {
		if (!supabase) throw new Error('Supabase client is unavailable.');

		const { data, error } = await supabase.from('students').select('*');
		console.log('Admin students fetch data:', data);
		console.log('Admin students fetch error:', error);
		if (error) throw error;

		allStudents = data || [];
		updateStats();
		applyFilters();

		const updatedAt = document.getElementById('last-updated');
		if (updatedAt) {
			const now = new Date();
			updatedAt.dateTime = now.toISOString();
			updatedAt.textContent = `Last updated ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
		}
	};

	const generateRollNumber = (student) => {
		const coursePrefixes = {
			'digital marketing': 'DM',
			'web & app development': 'WD',
			'graphic designing': 'GA',
			'video editing': 'VE',
			freelancing: 'FL',
			canva: 'CN'
		};
		const prefix = coursePrefixes[normalize(getCourse(student))] || 'FL';
		const usedRollNumbers = new Set(allStudents.map(getRollNumber).filter(Boolean));
		let number = 2001;
		let candidate = `${prefix}-${number}`;
		while (usedRollNumbers.has(candidate)) candidate = `${prefix}-${++number}`;
		return candidate;
	};

	const updateStudentStatus = async (student, status) => {
		if (!student.id) throw new Error('This student record has no database id.');
		const updates = { status };
		if (status === 'Approved') {
			updates.batch = 'Batch-5';
			updates.roll_number = getRollNumber(student) || generateRollNumber(student);
		}
		const { error } = await supabase.from('students').update(updates).eq('id', student.id);
		if (error) throw error;
		await loadStudents();
	};

	window.approveStudent = async (studentId) => {
		try {
			if (!studentId) {
				window.alert('Invalid Student ID!');
				return;
			}

			const student = allStudents.find((item) => String(item.id) === String(studentId));
			const courseName = String(getCourse(student || '')).toLowerCase().trim();
			let prefix = 'ST-';
			if (courseName.includes('canva')) prefix = 'CV-';
			else if (courseName.includes('freelance')) prefix = 'FL-';
			else if (courseName.includes('web')) prefix = 'WD-';
			else if (courseName.includes('marketing') || courseName.includes('digital')) prefix = 'DM-';
			else if (courseName.includes('graphic') || courseName.includes('design')) prefix = 'GD-';

			const generatedRoll = prefix + Math.floor(1000 + Math.random() * 9000);

			const { data, error } = await supabase
				.from('students')
				.update({
					status: 'Approved',
					batch_preference: 'Batch-5',
					roll_number: generatedRoll
				})
				.eq('id', studentId)
				.select();

			if (error) {
				console.error('Supabase Approval Error:', error);
				window.alert(`Approval failed: ${error.message}`);
				return;
			}

			console.log('Approved student:', data);
			window.alert(`Student Approved Successfully! Roll No: ${generatedRoll}`);
			await loadStudents();
		} catch (error) {
			console.error('Unexpected Error:', error);
			window.alert(`Error approving student: ${error.message}`);
		}
	};

	tableBody.addEventListener('click', async (event) => {
		const button = event.target.closest('[data-action]');
		if (!button) return;
		const row = button.closest('tr');
		const student = allStudents.find((item) => String(item.id) === row?.dataset.studentId);
		const action = button.dataset.action;
		if (!student || !action) return;
		if (action === 'approve') return;

		if (action === 'delete' && !window.confirm(`Delete ${getStudentName(student)} from the student records?`)) return;
		const originalText = button.textContent;
		setButtonBusy(button, true, 'Saving...', originalText);

		try {
			if (action === 'delete') {
				const { error } = await supabase.from('students').delete().eq('id', student.id);
				if (error) throw error;
				await loadStudents();
			} else {
				await updateStudentStatus(student, 'Rejected');
			}
		} catch (error) {
			console.error('Student action error:', error);
			window.alert('Unable to update this student record. Please try again.');
		} finally {
			setButtonBusy(button, false, 'Saving...', originalText);
		}
	});

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
			const { error } = await supabase.auth.signInWithPassword({ email, password });
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

	if (searchInput) {
		searchInput.value = '';
		searchInput.addEventListener('input', applyFilters);
		searchInput.addEventListener('keyup', applyFilters);
	}
	searchButton?.addEventListener('click', applyFilters);
	[courseFilter, batchFilter, statusFilter].forEach((control) => {
		if (control) {
			control.value = '';
			control.addEventListener('change', applyFilters);
		}
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
			const { error } = await supabase.from('trainers').insert(trainer);
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
			await supabase?.auth.signOut();
		} catch (error) {
			console.error('Admin logout error:', error);
		}
		allStudents = [];
		loginForm.reset();
		showError('');
		renderEmptyState('No student records available.');
		setView(false);
		document.getElementById('admin-email')?.focus();
	});

	const restoreSession = async () => {
		if (!supabase?.auth) return;
		const { data } = await supabase.auth.getSession();
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
