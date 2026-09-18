document.addEventListener('DOMContentLoaded', () => {
	const loginSection = document.getElementById('login-section');
	const dashboardSection = document.getElementById('dashboard-section');
	const loginForm = document.getElementById('student-login-form');
	const loginStatus = document.getElementById('login-status');
	const logoutButton = document.getElementById('logout-button');
	const downloadIdCardButton = document.getElementById('download-id-card');

	if (!loginSection || !dashboardSection || !loginForm) return;

	const setText = (id, value, fallback = 'Not available') => {
		const element = document.getElementById(id);
		if (element) element.textContent = value || fallback;
	};

	const showStatus = (message, type = 'error') => {
		if (!loginStatus) return;

		loginStatus.textContent = message;
		loginStatus.hidden = false;
		loginStatus.classList.toggle('is-success', type === 'success');
	};

	const clearStatus = () => {
		if (!loginStatus) return;

		loginStatus.textContent = '';
		loginStatus.hidden = true;
		loginStatus.classList.remove('is-success');
	};

	const showLogin = () => {
		loginSection.hidden = false;
		loginSection.style.display = '';
		dashboardSection.hidden = true;
		dashboardSection.style.display = 'none';
		clearStatus();
	};

	const showDashboard = () => {
		loginSection.hidden = true;
		loginSection.style.display = 'none';
		dashboardSection.hidden = false;
		dashboardSection.style.display = '';
	};

	const populateDashboard = (student) => {
		const fullName = student.full_name || student.name;
		const rollNumber = student.roll_number;
		const course = student.course_selected || student.course;
		const batchName = student.batch_name || student.batch || 'Batch-5';
		const learningMode = student.learning_mode || 'Not available';
		const admissionStatus = student.admission_status
			|| student.registration_status
			|| student.status
			|| 'Pending';
		const schedule = student.class_schedule
			|| student.schedule
			|| student.batch_preference
			|| 'Schedule pending';

		setText('student-name-heading', fullName);
		setText('student-name', fullName);
		setText('father-name', student.father_name || student.guardian_name);
		setText('profile-roll-number', rollNumber);
		setText('profile-cnic', student.cnic_number);
		setText('selected-course', course);
		setText('batch-name', batchName);
		setText('id-card-name', fullName, 'Student Name');
		setText('id-card-roll-number', rollNumber);
		setText('learning-mode', learningMode);
		setText('class-schedule', schedule);
		setText('registration-status', admissionStatus);
	};

	loginForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		clearStatus();

		const rollInput = document.getElementById('roll-number');
		const cnicInput = document.getElementById('cnic-number');
		const rollNumber = rollInput?.value.trim().toUpperCase() || '';
		const cnicNumber = cnicInput?.value.trim() || '';
		const validRollNumber = /^[A-Z]{2}-\d{4}$/.test(rollNumber);
		const validCnicNumber = /^\d{13}$/.test(cnicNumber);

		if (!rollNumber || !cnicNumber || !validRollNumber || !validCnicNumber) {
			showStatus('Enter a valid Roll Number and 13-digit CNIC.');
			(validRollNumber ? cnicInput : rollInput)?.focus();
			return;
		}

		const supabaseClient = window.supabaseClient;
		if (!supabaseClient) {
			console.error('Supabase client is unavailable.');
			showStatus('Database connection unavailable. Please refresh and try again.');
			return;
		}

		const submitButton = loginForm.querySelector('button[type="submit"]');
		if (submitButton) {
			submitButton.disabled = true;
			submitButton.textContent = 'Checking details...';
		}

		try {
			const { data: student, error } = await supabaseClient
				.from('students')
				.select('*')
				.eq('roll_number', rollNumber)
				.eq('cnic_number', cnicNumber)
				.maybeSingle();

			if (error) {
				console.error('Student portal database error:', error);
				showStatus('Unable to verify your details. Please try again.');
				return;
			}

			if (!student) {
				showStatus('Invalid Roll Number or CNIC.');
				return;
			}

			populateDashboard(student);
			showDashboard();
		} catch (error) {
			console.error('Unexpected student portal error:', error);
			showStatus('Something went wrong while logging in. Please try again.');
		} finally {
			if (submitButton) {
				submitButton.disabled = false;
				submitButton.textContent = 'Login to Dashboard';
			}
		}
	});

	logoutButton?.addEventListener('click', () => {
		loginForm.reset();
		showLogin();
		document.getElementById('roll-number')?.focus();
	});

	downloadIdCardButton?.addEventListener('click', () => {
		window.print();
	});
});
