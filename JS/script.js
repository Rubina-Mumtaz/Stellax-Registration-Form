// 1. Supabase Initialization
const SUPABASE_URL = 'https://cqquvlkxoqduxtvmcjzc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JoPIcMNiUVfI3ME_BCCvlg_mFxhD5BS';

// CDN script load check
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registration-form");
    const status = document.getElementById("form-status");

    // Helper: Error Message Display
    const setError = (fieldId, message) => {
        const field = document.getElementById(fieldId);
        const messageElement = document.getElementById(`${fieldId}-error`);
        const wrapper = field?.closest(".field") || document.querySelector(`#${fieldId}-group`)?.closest(".field");

        if (messageElement) messageElement.textContent = message;
        if (wrapper) wrapper.classList.toggle("has-error", Boolean(message));
        if (field) field.setAttribute("aria-invalid", String(Boolean(message)));
        return Boolean(message);
    };

    // Clear Error on User Input
    const clearErrorOnInput = (event) => {
        const target = event.target;
        const errorId = target.name === "learningMode" ? "learning-mode" : target.name === "batch" ? "batch" : target.id;
        setError(errorId, "");
        if (status) {
            status.classList.remove("is-visible");
            status.style.color = "";
        }
    };

    if (form) {
        form.addEventListener("input", clearErrorOnInput);
        form.addEventListener("change", clearErrorOnInput);

        // 2. Form Submit Event Handler
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            
            if (status) {
                status.classList.remove("is-visible");
                status.style.color = "";
            }

            // Safe Field Value Retrievals
            const fullName = document.getElementById("full-name")?.value.trim() || "";
            const email = document.getElementById("email")?.value.trim() || "";
            const phone = document.getElementById("phone")?.value.trim() || "";
            const cnic = document.getElementById("cnic")?.value.trim() || "";
            const course = document.getElementById("course")?.value || "";
            const learningMode = form.querySelector("input[name='learningMode']:checked");
            const batch = form.querySelector("input[name='batch']:checked");
            const agreement = document.getElementById("agreement")?.checked || false;

            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
            const phoneDigits = phone.replace(/[\s().+-]/g, "");
            let hasErrors = false;

            // Form Validations
            hasErrors = setError("full-name", fullName ? "" : "Please enter your full name.") || hasErrors;
            hasErrors = setError("email", !email ? "Please enter your email address." : !emailPattern.test(email) ? "Please enter a valid email address." : "") || hasErrors;
            hasErrors = setError("phone", !phone ? "Please enter your phone number." : !/^\d{7,15}$/.test(phoneDigits) ? "Please enter a valid phone number." : "") || hasErrors;
            hasErrors = setError("course", course ? "" : "Please select a course.") || hasErrors;
            hasErrors = setError("learning-mode", learningMode ? "" : "Please choose a learning preference.") || hasErrors;
            hasErrors = setError("batch", batch ? "" : "Please choose a batch preference.") || hasErrors;
            hasErrors = setError("agreement", agreement ? "" : "Please confirm that your information is correct.") || hasErrors;

            // Stop if form validation fails
            if (hasErrors) {
                const firstInvalid = form.querySelector("[aria-invalid='true']");
                firstInvalid?.focus();
                return;
            }

            // Status message during submission
            if (status) {
                status.textContent = "Submitting your application to Stellax Academy...";
                status.classList.add("is-visible");
            }

            if (!supabaseClient) {
                if (status) {
                    status.style.color = "#d9534f";
                    status.textContent = "Error: Supabase library not loaded. Please check HTML CDN script.";
                }
                return;
            }

            // Data mapping for Supabase Table
            const studentData = {
                full_name: fullName,
                email: email,
                phone_number: phone,
                cnic_number: cnic ? cnic : 'N/A',
                course_selected: course
            };

            // 3. Supabase Database Insertion
            try {
                const { data, error } = await supabaseClient
                    .from('students')
                    .insert([studentData]);

                if (error) {
                    console.error('Database Error:', error);
                    if (status) {
                        status.style.color = "#d9534f";
                        status.textContent = "Registration Failed: " + error.message;
                    }
                } else {
                    if (status) {
                        status.style.color = "#2e7d32";
                        status.textContent = "Your application form has been completed successfully! Record saved to database.";
                        status.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }
                    form.reset();
                }
            } catch (err) {
                console.error('Unexpected Error:', err);
                if (status) {
                    status.style.color = "#d9534f";
                    status.textContent = "An unexpected error occurred. Please try again.";
                }
            }
        });
    }
});










// document.addEventListener("DOMContentLoaded", () => {
// 	const form = document.getElementById("registration-form");
// 	const status = document.getElementById("form-status");

// 	const setError = (fieldId, message) => {
// 		const field = document.getElementById(fieldId);
// 		const messageElement = document.getElementById(`${fieldId}-error`);
// 		const wrapper = field?.closest(".field") || document.querySelector(`#${fieldId}-group`)?.closest(".field");

// 		if (messageElement) messageElement.textContent = message;
// 		if (wrapper) wrapper.classList.toggle("has-error", Boolean(message));
// 		if (field) field.setAttribute("aria-invalid", String(Boolean(message)));
// 		return Boolean(message);
// 	};

// 	const clearErrorOnInput = (event) => {
// 		const target = event.target;
// 		const errorId = target.name === "learningMode" ? "learning-mode" : target.name === "batch" ? "batch" : target.id;
// 		setError(errorId, "");
// 		if (status) status.classList.remove("is-visible");
// 	};

// 	form.addEventListener("input", clearErrorOnInput);
// 	form.addEventListener("change", clearErrorOnInput);

// 	form.addEventListener("submit", (event) => {
// 		event.preventDefault();
// 		if (status) status.classList.remove("is-visible");

// 		const fullName = document.getElementById("full-name").value.trim();
// 		const email = document.getElementById("email").value.trim();
// 		const phone = document.getElementById("phone").value.trim();
// 		const course = document.getElementById("course").value;
// 		const learningMode = form.querySelector("input[name='learningMode']:checked");
// 		const batch = form.querySelector("input[name='batch']:checked");
// 		const agreement = document.getElementById("agreement").checked;
// 		const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// 		const phoneDigits = phone.replace(/[\s().+-]/g, "");
// 		let hasErrors = false;

// 		hasErrors = setError("full-name", fullName ? "" : "Please enter your full name.") || hasErrors;
// 		hasErrors = setError("email", !email ? "Please enter your email address." : !emailPattern.test(email) ? "Please enter a valid email address." : "") || hasErrors;
// 		hasErrors = setError("phone", !phone ? "Please enter your phone number." : !/^\d{7,15}$/.test(phoneDigits) ? "Please enter a valid phone number." : "") || hasErrors;
// 		hasErrors = setError("course", course ? "" : "Please select a course.") || hasErrors;
// 		hasErrors = setError("learning-mode", learningMode ? "" : "Please choose a learning preference.") || hasErrors;
// 		hasErrors = setError("batch", batch ? "" : "Please choose a batch preference.") || hasErrors;
// 		hasErrors = setError("agreement", agreement ? "" : "Please confirm that your information is correct.") || hasErrors;

// 		if (hasErrors) {
// 			const firstInvalid = form.querySelector("[aria-invalid='true']");
// 			firstInvalid?.focus();
// 			return;
// 		}

// 		if (status) {
// 			status.textContent = "Your application form has been completed successfully. Firebase will be connected in the next step to securely save your application.";
// 			status.classList.add("is-visible");
// 			status.scrollIntoView({ behavior: "smooth", block: "nearest" });
// 		}
// 	});
// });

