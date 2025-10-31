document.addEventListener("DOMContentLoaded", () => {
  const doctorForm = document.getElementById("doctorForm");
  const inst = document.getElementById("institutionId");
  const email = document.getElementById("docEmail");
  const pwd = document.getElementById("docPassword");
  const consent = document.getElementById("docConsent");
  const msg = document.getElementById("formMessage");

  const isNonEmpty = v => v.trim().length > 0;
  const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isStrongPassword = v => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v);
  const isInstitutionId = v => /^[A-Za-z0-9\-_.]{4,20}$/.test(v);

  // real-time validation
  inst.addEventListener("input", () => setError("err-institutionId", isInstitutionId(inst.value) ? "" : "ID must be 4-20 chars"));
  email.addEventListener("input", () => setError("err-docEmail", isEmail(email.value) ? "" : "Invalid email"));
  pwd.addEventListener("input", () => setError("err-docPassword", isStrongPassword(pwd.value) ? "" : "Min 8 chars, upper+lower+digit"));
  consent.addEventListener("change", () => setError("err-docConsent", consent.checked ? "" : "You must consent"));

  doctorForm.addEventListener("submit", (e) => {
    e.preventDefault();
    clearFormMessage(msg);
    let valid = true;

    if (!isInstitutionId(inst.value)) { setError("err-institutionId", "ID must be 4-20 chars"); valid=false; } else setError("err-institutionId","");
    if (!isEmail(email.value)) { setError("err-docEmail","Invalid email"); valid=false; } else setError("err-docEmail","");
    if (!isStrongPassword(pwd.value)) { setError("err-docPassword","Min 8 chars, upper+lower+digit"); valid=false; } else setError("err-docPassword","");
    if (!consent.checked) { setError("err-docConsent","You must consent"); valid=false; } else setError("err-docConsent","");

    if (!valid) { showFormMessage(msg, "Please fix errors", true); return; }

    // demo redirect
    window.location.href = "doctor-dashboard.html";
  });

  function setError(id, message) {
    const el = document.getElementById(id);
    el.textContent = message || "";
    el.style.display = message ? "block" : "none";
  }

  function showFormMessage(el, text, isError=false){
    el.textContent = text;
    el.style.color = isError ? "crimson" : "green";
  }

  function clearFormMessage(el){ el.textContent=""; }
});

if (valid) {
  // Check doctor credentials using data.json (pseudo example)
  fetch("data.json")
    .then(res => res.json())
    .then(data => {
      const doctor = data.doctors.find(
        d => d.email === email.value && d.password === pwd.value
      );

      if (doctor) {
        // ✅ Save doctor info to localStorage
        localStorage.setItem("loggedInDoctor", JSON.stringify(doctor));

        // Redirect to dashboard
        window.location.href = "doctor-dashboard.html";
      } else {
        showFormMessage(msg, "Invalid email or password", true);
      }
    });
}

