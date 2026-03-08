(() => {
  const form = document.getElementById("submitForm");
  const status = document.getElementById("submitStatus");
  if (!form || !status) return;

  const submitBtn = form.querySelector("button[type='submit']");

  form.addEventListener("submit", (e) => {
    if (!form.checkValidity()) {
      e.preventDefault();
      form.reportValidity();
      return;
    }
    // Let the browser submit the form normally so FormSubmit can process it.
    status.textContent = "Sending your story...";
    if (submitBtn) submitBtn.disabled = true;
  });
})();
