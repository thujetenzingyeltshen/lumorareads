(() => {
  const form = document.getElementById("submitForm");
  const status = document.getElementById("submitStatus");
  if (!form || !status) return;

  const submitBtn = form.querySelector("button[type='submit']");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    status.textContent = "Sending your story...";
    if (submitBtn) submitBtn.disabled = true;

    try {
      const payload = new FormData(form);
      const res = await fetch(form.action, {
        method: "POST",
        body: payload,
        headers: {
          Accept: "application/json"
        }
      });

      if (!res.ok) {
        throw new Error(`Submit failed with status ${res.status}`);
      }

      window.location.href = "thankyou.html";
    } catch (err) {
      status.textContent = "Submission failed. Please try again.";
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();
