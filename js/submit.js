(() => {
  const form = document.getElementById("submitForm");
  const status = document.getElementById("submitStatus");
  if (!form || !status) return;

  const submitBtn = form.querySelector("button[type='submit']");
  const endpoint = "https://formsubmit.co/ajax/lumora.micro@gmail.com";
  const nextInput = form.querySelector("input[name='_next']");
  if (nextInput) {
    nextInput.value = `${window.location.origin}//thankyou/`;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    status.textContent = "Sending your story...";
    if (submitBtn) submitBtn.disabled = true;

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const res = await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      });

      if (!res.ok) {
        throw new Error(`Submit failed with status ${res.status}`);
      }

      window.location.href = "/thankyou/";
    } catch (err) {
      // Fallback: force native form POST if AJAX path fails.
      form.method = "POST";
      form.action = "https://formsubmit.co/lumora.micro@gmail.com";
      form.submit();
    }
  });
})();


