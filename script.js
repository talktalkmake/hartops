(() => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const form = document.getElementById("contact-form");
  if (!form) return;

  const status = document.getElementById("form-status");
  const baseClass = status.className;
  const setStatus = (text, isError = false) => {
    status.textContent = text;
    status.className = isError ? `${baseClass} error` : baseClass;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = new FormData(form);
    if (data.get("botcheck")) return;

    setStatus("Sending…");

    try {
      const res = await fetch(form.action, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success) {
        const block = document.createElement("p");
        block.setAttribute("role", "status");
        block.textContent = "Thanks — your message is in. I'll be in touch within a couple of working days.";
        form.replaceWith(block);
      } else {
        setStatus(json?.message || "Something went wrong. Please email tom directly or try again.", true);
      }
    } catch (err) {
      setStatus("Network error. Please try again, or email tom directly.", true);
    }
  });
})();
