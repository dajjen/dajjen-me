/* dajjen.me – David Backman
   Small vanilla JS: nav state, scroll reveal, contact form. */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Footer year ---------- */
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Nav: scrolled state ---------- */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Nav: mobile toggle ---------- */
  const toggle = $("#navToggle");
  const menu = $("#mobileMenu");
  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Stäng meny" : "Öppna meny");
    menu.hidden = !open;
    menu.classList.toggle("is-open", open);
  };
  const isOpen = () => menu.classList.contains("is-open");
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    setMenu(!isOpen());
  });
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) setMenu(false);
  });
  document.addEventListener("click", (e) => {
    if (isOpen() && !menu.contains(e.target)) setMenu(false);
  });

  /* ---------- Nav: active section highlight ---------- */
  const navLinks = $$("[data-nav]");
  const sections = navLinks
    .map((a) => $(a.getAttribute("href")))
    .filter(Boolean)
    .filter((el, i, arr) => arr.indexOf(el) === i);

  const setActive = (id) => {
    navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + id));
  };

  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.2, 0.5, 1] }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Scroll reveal ---------- */
  const reveals = $$(".reveal");
  // Show anything already in the first viewport immediately (no wait for the observer).
  reveals.forEach((el) => {
    if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-visible");
  });
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    reveals.filter((el) => !el.classList.contains("is-visible")).forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Card spotlight (pointer position) ---------- */
  $$(".card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
      card.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
    });
  });

  /* ---------- Toast ---------- */
  const toast = $("#toast");
  let toastTimer;
  const showToast = (title, desc, isError) => {
    $(".toast__title", toast).textContent = title;
    $(".toast__desc", toast).textContent = desc;
    toast.classList.toggle("is-error", !!isError);
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.hidden = true), 6000);
  };
  toast.addEventListener("click", () => (toast.hidden = true));

  /* ---------- Contact form ---------- */
  // Skickas till Cloudflare Worker (src/worker.js) som mejlar via Email Routing.
  const CONTACT_ENDPOINT = "/api/contact";

  const form = $("#contactForm");
  const status = $("#formStatus");
  const submitBtn = $("#submitBtn");
  const submitLabel = $(".btn__label", submitBtn);

  const rules = [
    { name: "name", max: 100, required: "Namn krävs", tooLong: "Namn får vara max 100 tecken" },
    { name: "email", max: 255, required: "E-post krävs", tooLong: "E-post får vara max 255 tecken", email: "Ange en giltig e-postadress" },
    { name: "message", max: 1000, required: "Meddelande krävs", tooLong: "Meddelande får vara max 1000 tecken" },
  ];

  const validate = (data) => {
    for (const r of rules) {
      const field = form.elements[r.name].closest(".field");
      field.classList.remove("is-invalid");
      const v = data[r.name];
      let err = null;
      if (!v) err = r.required;
      else if (v.length > r.max) err = r.tooLong;
      else if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) err = r.email;
      if (err) {
        field.classList.add("is-invalid");
        form.elements[r.name].focus();
        return err;
      }
    }
    return null;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    status.className = "form__status";

    if (form.elements.honeypot.value) return; // bot

    const data = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      message: form.elements.message.value.trim(),
    };

    const err = validate(data);
    if (err) {
      status.textContent = err;
      status.classList.add("is-error");
      showToast("Valideringsfel", err, true);
      return;
    }

    submitBtn.disabled = true;
    submitLabel.textContent = "Skickar...";

    try {
      const res = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, honeypot: form.elements.honeypot.value }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "HTTP " + res.status);

      form.reset();
      status.textContent = "Tack för ditt meddelande. Jag återkommer så snart som möjligt.";
      status.classList.add("is-success");
      showToast("Meddelande skickat!", "Tack för ditt meddelande. Jag återkommer så snart som möjligt.");
    } catch (error) {
      console.error(error);
      const msg = error && error.message && !/^HTTP \d+$/.test(error.message)
        ? error.message
        : "Det gick inte att skicka meddelandet. Försök igen senare.";
      status.textContent = msg;
      status.classList.add("is-error");
      showToast("Något gick fel", msg, true);
    } finally {
      submitBtn.disabled = false;
      submitLabel.textContent = "Skicka meddelande";
    }
  });

  // Clear invalid state when typing
  $$("input, textarea", form).forEach((el) =>
    el.addEventListener("input", () => el.closest(".field").classList.remove("is-invalid"))
  );
})();
