document.addEventListener('DOMContentLoaded', () => {
	const loginSection = document.getElementById('login-section');
	const dashboardSection = document.getElementById('dashboard-section');
	const loginForm = document.getElementById('student-login-form');
	const loginStatus = document.getElementById('login-status');
	const logoutButton = document.getElementById('logout-button');
	const downloadIdCardButton = document.getElementById('download-id-card');
	const studentNavLinks = [...document.querySelectorAll('[data-student-view]')];
	const studentViewPanels = [...document.querySelectorAll('[data-student-view-panel]')];

	if (!loginSection || !dashboardSection || !loginForm) return;

	const activateStudentView = (viewName) => {
		studentNavLinks.forEach((link) => {
			const isActive = link.dataset.studentView === viewName;
			link.classList.toggle('is-active', isActive);
			if (isActive) link.setAttribute('aria-current', 'page');
			else link.removeAttribute('aria-current');
		});
		studentViewPanels.forEach((panel) => {
			const isActive = panel.dataset.studentViewPanel === viewName;
			panel.hidden = !isActive;
			panel.classList.toggle('is-active', isActive);
		});
	};

	studentNavLinks.forEach((link) => {
		link.addEventListener('click', () => activateStudentView(link.dataset.studentView));
	});

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
		const batchName = student.batch || student.batch_name || 'Batch-5';
		const learningMode = student.learning_mode || 'Not available';
		const timing = student.timing || student.class_timing || 'Not available';
		const admissionStatus = student.admission_status
			|| student.registration_status
			|| student.status
			|| 'Pending';
		const schedule = student.class_schedule
			|| student.schedule
			|| timing
			|| 'Schedule pending';

		setText('student-name-heading', fullName);
		setText('header-student-name', fullName, 'Student');
		setText('header-roll-number', rollNumber, 'Roll Number');
		setText('header-course', course, 'Enrolled Course');
		setText('student-name', fullName);
		setText('father-name', student.father_name || student.guardian_name);
		setText('profile-roll-number', rollNumber);
		setText('profile-cnic', student.cnic_number);
		setText('selected-course', course);
		setText('batch-name', batchName);
		setText('id-card-name', fullName, 'Student Name');
		setText('id-card-father-name', student.father_name || student.guardian_name);
		setText('id-card-cnic', student.cnic_number);
		setText('id-card-roll-number', rollNumber);
		setText('id-card-course', course, 'Modern Web Application Development');
		setText('learning-mode', learningMode);
		setText('class-schedule', schedule);
		setText('registration-status', admissionStatus);
		setText('courses-title', course, 'Enrolled Course');
		setText('courses-description', `${course || 'Your enrolled course'} learning content and resources are ready for your next session.`);
		setText('lms-profile-name', fullName);
		setText('lms-profile-father', student.father_name || student.guardian_name);
		setText('lms-profile-roll', rollNumber);
		setText('lms-profile-cnic', student.cnic_number);
		activateStudentView('dashboard');
	};

	loginForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		clearStatus();

		const rollInput = document.getElementById('roll-number');
		const cnicInput = document.getElementById('cnic-number');
		const rollNumber = rollInput?.value.trim().toUpperCase() || '';
		const cnicNumber = cnicInput?.value.trim() || '';
		const validRollNumber = /^[A-Z0-9]{2,3}-\d{4}$/.test(rollNumber);
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
				.eq('status', 'Approved')
				.maybeSingle();

			if (error) {
				console.error('Student portal database error:', error);
				showStatus('Unable to verify your details. Please try again.');
				return;
			}

			if (!student) {
				const { data: pendingStudent, error: pendingError } = await supabaseClient
					.from('students')
					.select('id')
					.eq('roll_number', rollNumber)
					.eq('cnic_number', cnicNumber)
					.eq('status', 'Pending')
					.maybeSingle();

				if (pendingError) {
					console.error('Pending student lookup error:', pendingError);
					showStatus('Unable to verify your details. Please try again.');
					return;
				}

				showStatus(pendingStudent
					? 'Your registration is currently under review by Admin.'
					: 'Invalid Roll Number or CNIC.');
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

	downloadIdCardButton?.addEventListener('click', async () => {
		const idCard = document.getElementById('student-id-card');
		if (!idCard) return;
		if (typeof window.html2pdf !== 'function') {
			showStatus('PDF download is unavailable. Please refresh and try again.');
			return;
		}

		const rollNumber = document.getElementById('id-card-roll-number')?.textContent.trim() || 'student';
		const originalText = downloadIdCardButton.textContent;
		downloadIdCardButton.disabled = true;
		downloadIdCardButton.textContent = 'Preparing PDF...';

		try {
			await window.html2pdf().set({
				margin: 8,
				filename: `stellax-student-id-${rollNumber}.pdf`,
				image: { type: 'jpeg', quality: 0.98 },
				 html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
				jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
			}).from(idCard).save();
		} catch (error) {
			console.error('ID card PDF export error:', error);
			showStatus('Unable to create the PDF. Please try again.');
		} finally {
			downloadIdCardButton.disabled = false;
			downloadIdCardButton.textContent = originalText;
		}
	});
});
