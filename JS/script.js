document.addEventListener("DOMContentLoaded", () => {
	const form = document.getElementById("registration-form");
	const status = document.getElementById("form-status");

	const setError = (fieldId, message) => {
		const field = document.getElementById(fieldId);
		const messageElement = document.getElementById(`${fieldId}-error`);
		const wrapper = field?.closest(".field") || document.querySelector(`#${fieldId}-group`)?.closest(".field");

		if (messageElement) messageElement.textContent = message;
		if (wrapper) wrapper.classList.toggle("has-error", Boolean(message));
		if (field) field.setAttribute("aria-invalid", String(Boolean(message)));
		return Boolean(message);
	};

	const clearErrorOnInput = (event) => {
		const target = event.target;
		const errorId = target.name === "learningMode" ? "learning-mode" : target.name === "batch" ? "batch" : target.id;
		setError(errorId, "");
		if (status) status.classList.remove("is-visible");
	};

	form.addEventListener("input", clearErrorOnInput);
	form.addEventListener("change", clearErrorOnInput);

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		if (status) status.classList.remove("is-visible");

		const fullName = document.getElementById("full-name").value.trim();
		const email = document.getElementById("email").value.trim();
		const phone = document.getElementById("phone").value.trim();
		const course = document.getElementById("course").value;
		const learningMode = form.querySelector("input[name='learningMode']:checked");
		const batch = form.querySelector("input[name='batch']:checked");
		const agreement = document.getElementById("agreement").checked;
		const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
		const phoneDigits = phone.replace(/[\s().+-]/g, "");
		let hasErrors = false;

		hasErrors = setError("full-name", fullName ? "" : "Please enter your full name.") || hasErrors;
		hasErrors = setError("email", !email ? "Please enter your email address." : !emailPattern.test(email) ? "Please enter a valid email address." : "") || hasErrors;
		hasErrors = setError("phone", !phone ? "Please enter your phone number." : !/^\d{7,15}$/.test(phoneDigits) ? "Please enter a valid phone number." : "") || hasErrors;
		hasErrors = setError("course", course ? "" : "Please select a course.") || hasErrors;
		hasErrors = setError("learning-mode", learningMode ? "" : "Please choose a learning preference.") || hasErrors;
		hasErrors = setError("batch", batch ? "" : "Please choose a batch preference.") || hasErrors;
		hasErrors = setError("agreement", agreement ? "" : "Please confirm that your information is correct.") || hasErrors;

		if (hasErrors) {
			const firstInvalid = form.querySelector("[aria-invalid='true']");
			firstInvalid?.focus();
			return;
		}

		if (status) {
			status.textContent = "Your application form has been completed successfully. Firebase will be connected in the next step to securely save your application.";
			status.classList.add("is-visible");
			status.scrollIntoView({ behavior: "smooth", block: "nearest" });
		}
	});
});

