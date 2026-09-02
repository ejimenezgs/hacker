/* ==========================================================================
   HÄCKER COCINAS MÉXICO — interacción v2
   Sin preloader: el contenido es lo primero. Reveals sutiles y contadores.
   ========================================================================== */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Entrada del hero (inmediata, sin bloquear contenido) ---------- */
  setTimeout(function () { document.body.classList.add("is-loaded"); }, 30);

  /* ---------- Header con estado de scroll ---------- */
  var header = document.getElementById("siteHeader");
  var lastScrollState = false;
  var ticking = false;

  function onScrollHeader() {
    var scrolled = window.scrollY > 24;
    if (scrolled !== lastScrollState && header) {
      header.classList.toggle("is-scrolled", scrolled);
      lastScrollState = scrolled;
    }
  }

  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      onScrollHeader();
      ticking = false;
    });
  }, { passive: true });
  onScrollHeader();

  /* ---------- Menú móvil ---------- */
  var navToggle = document.getElementById("navToggle");
  var siteNav = document.getElementById("siteNav");

  if (navToggle && siteNav) {
    var navLinks = siteNav.querySelectorAll("a");

    var setNav = function (open) {
      siteNav.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      document.body.style.overflow = open ? "hidden" : "";
      if (open && navLinks.length) navLinks[0].focus();
    };

    navToggle.addEventListener("click", function () {
      setNav(!siteNav.classList.contains("is-open"));
    });

    navLinks.forEach(function (link) {
      link.addEventListener("click", function () { setNav(false); });
    });

    // Escape cierra el menú y devuelve el foco al botón
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && siteNav.classList.contains("is-open")) {
        setNav(false);
        navToggle.focus();
      }
    });

    // El foco no se escapa detrás del overlay abierto
    siteNav.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || !siteNav.classList.contains("is-open")) return;
      var first = navLinks[0];
      var last = navLinks[navLinks.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        navToggle.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        navToggle.focus();
      }
    });

    navToggle.addEventListener("keydown", function (e) {
      if (e.key === "Tab" && !e.shiftKey && siteNav.classList.contains("is-open")) {
        e.preventDefault();
        navLinks[0].focus();
      }
    });
  }

  /* ---------- Revelado al hacer scroll ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");

  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Contadores de cifras ---------- */
  var counters = document.querySelectorAll("[data-count]");

  function formatCount(value, el) {
    var plain = el.hasAttribute("data-plain");
    var text = plain ? String(value) : value.toLocaleString("es-MX");
    return (el.getAttribute("data-prefix") || "") + text + (el.getAttribute("data-suffix") || "");
  }

  function runCounter(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (prefersReducedMotion) {
      el.textContent = formatCount(target, el);
      return;
    }
    var start = null;
    var DURATION = 1500;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / DURATION, 1);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = formatCount(Math.round(target * eased), el);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { countObserver.observe(el); });
  } else {
    counters.forEach(function (el) {
      el.textContent = formatCount(parseInt(el.getAttribute("data-count"), 10) || 0, el);
    });
  }

  /* ---------- Hero · proceso en cuatro fases ----------
     La secuencia se trata como una transformación continua, no como slides:
     espacio → plano superpuesto → estructura que emerge → acabados finales.
     Cada capa usa profundidad, máscara y solape distintos para reforzar el
     efecto parallax sin romper la alineación exacta de los renders. */
  var scrollyHero = (function () {
    var hero = document.getElementById("inicio");
    var track = document.getElementById("heroTrack");
    var pin = hero ? hero.querySelector(".hero__pin") : null;
    var scenes = hero ? Array.prototype.slice.call(hero.querySelectorAll(".hero__scene")) : [];
    var copies = hero ? Array.prototype.slice.call(hero.querySelectorAll(".hero__copy")) : [];
    var steps = hero ? Array.prototype.slice.call(hero.querySelectorAll(".hero__steps li")) : [];
    var cue = document.getElementById("heroCue");
    var currentLabel = document.getElementById("heroProgressCurrent");
    var mobileMq = window.matchMedia("(max-width: 900px)");
    var lastPhase = -1;
    var lastProgress = -1;
    var tickingHero = false;

    function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
    function mix(a, b, t) { return a + (b - a) * t; }
    function smoothstep(a, b, p) {
      var t = clamp((p - a) / (b - a), 0, 1);
      return t * t * (3 - 2 * t);
    }

    function getProgress() {
      if (!track || !pin) return 0;
      var top = track.getBoundingClientRect().top + window.scrollY;
      var distance = Math.max(1, track.offsetHeight - pin.offsetHeight);
      return clamp((window.scrollY - top) / distance, 0, 1);
    }

    function phaseFromProgress(p) {
      if (p < 0.20) return 0;
      if (p < 0.43) return 1;
      if (p < 0.69) return 2;
      return 3;
    }

    function setSceneStyle(scene, opacity, transform, clipPath, zIndex) {
      scene.style.opacity = clamp(opacity, 0, 1).toFixed(3);
      scene.style.transform = transform;
      scene.style.clipPath = clipPath || "inset(0 0 0 0)";
      scene.style.webkitClipPath = clipPath || "inset(0 0 0 0)";
      scene.style.zIndex = String(zIndex);
    }

    function renderScenes(p) {
      var isMobile = mobileMq.matches;

      /* 01 · ESPACIO
         Permanece debajo del plano el tiempo suficiente para que el trazado
         se perciba como una capa real sobre la arquitectura. */
      var spaceOut = smoothstep(0.24, 0.43, p);
      var spaceScale = mix(1.014, 1.032, smoothstep(0.00, 0.43, p));
      var spaceY = mix(0, -0.65, smoothstep(0.00, 0.43, p));
      setSceneStyle(
        scenes[0],
        1 - (spaceOut * 0.96),
        "translate3d(0," + spaceY.toFixed(3) + "%,0) scale(" + spaceScale.toFixed(4) + ")",
        "inset(0 0 0 0)",
        1
      );

      /* 02 · PLANO
         Entra como overlay y se mueve a una velocidad apenas distinta del
         fondo. El pequeño desfase crea profundidad sin desalinear el render. */
      var planIn = smoothstep(0.12, 0.31, p);
      var planOut = smoothstep(0.47, 0.64, p);
      var planOpacity = planIn * (1 - planOut);
      var planLocal = smoothstep(0.12, 0.64, p);
      var planScale = mix(isMobile ? 1.022 : 1.028, 1.010, planLocal);
      var planY = mix(isMobile ? 0.7 : 1.15, isMobile ? -0.35 : -0.8, planLocal);
      setSceneStyle(
        scenes[1],
        planOpacity,
        "translate3d(0," + planY.toFixed(3) + "%,0) scale(" + planScale.toFixed(4) + ")",
        "inset(0 0 0 0)",
        2
      );

      /* 03 · ESTRUCTURA
         Desktop: emerge desde el suelo. Mobile: aparece desde el centro para
         no duplicar visualmente el gesto vertical del dedo. */
      var structureIn = smoothstep(0.41, 0.61, p);
      var structureOut = smoothstep(0.70, 0.84, p);
      var structureOpacity = structureIn * (1 - structureOut * 0.90);
      var structureLocal = smoothstep(0.41, 0.78, p);
      var structureScale = mix(isMobile ? 1.018 : 1.024, 1.001, structureLocal);
      var structureY = mix(isMobile ? 1.1 : 2.5, 0, structureLocal);
      var structureClip;
      if (isMobile) {
        var sideInset = mix(50, 0, structureIn);
        structureClip = "inset(0 " + sideInset.toFixed(2) + "% 0 " + sideInset.toFixed(2) + "%)";
      } else {
        var bottomInset = mix(100, 0, structureIn);
        structureClip = "inset(" + bottomInset.toFixed(2) + "% 0 0 0)";
      }
      setSceneStyle(
        scenes[2],
        structureOpacity,
        "translate3d(0," + structureY.toFixed(3) + "%,0) scale(" + structureScale.toFixed(4) + ")",
        structureClip,
        3
      );

      /* 04 · RESULTADO
         El acabado final se aplica sobre la estructura mediante máscara. La
         animación termina antes del final del track para dejar un hold real. */
      var finalIn = smoothstep(0.68, 0.86, p);
      var finalLocal = smoothstep(0.68, 0.91, p);
      var finalScale = mix(isMobile ? 1.022 : 1.035, 1.000, finalLocal);
      var finalY = mix(isMobile ? 0.45 : 0.8, 0, finalLocal);
      var finalClip;
      if (isMobile) {
        var finalSides = mix(18, 0, finalIn);
        var finalTopBottom = mix(8, 0, finalIn);
        finalClip = "inset(" + finalTopBottom.toFixed(2) + "% " + finalSides.toFixed(2) + "% " + finalTopBottom.toFixed(2) + "% " + finalSides.toFixed(2) + "%)";
      } else {
        var finalRight = mix(100, 0, finalIn);
        finalClip = "inset(0 " + finalRight.toFixed(2) + "% 0 0)";
      }
      setSceneStyle(
        scenes[3],
        finalIn,
        "translate3d(0," + finalY.toFixed(3) + "%,0) scale(" + finalScale.toFixed(4) + ")",
        finalClip,
        4
      );
    }

    function render(p) {
      if (!hero) return;
      lastProgress = p;
      renderScenes(p);

      var phase = phaseFromProgress(p);
      if (phase !== lastPhase) {
        copies.forEach(function (copy, i) { copy.classList.toggle("is-active", i === phase); });
        steps.forEach(function (step, i) {
          step.classList.toggle("is-active", i === phase);
          step.classList.toggle("is-done", i < phase);
        });
        if (currentLabel) currentLabel.textContent = "0" + (phase + 1);
        lastPhase = phase;
      }

      if (cue) cue.classList.toggle("is-hidden", p > 0.035);
      hero.style.setProperty("--hero-progress", p.toFixed(4));
      hero.style.setProperty("--hero-final", smoothstep(0.76, 0.90, p).toFixed(4));
    }

    function update() {
      tickingHero = false;
      render(getProgress());
    }

    function requestUpdate() {
      if (tickingHero) return;
      tickingHero = true;
      requestAnimationFrame(update);
    }

    if (!hero || !track || !pin || scenes.length !== 4) {
      return { activo: function () { return false; } };
    }

    hero.classList.add("hero--scrolly");

    if (prefersReducedMotion) {
      hero.classList.add("hero--reduced");
      scenes.forEach(function (scene, i) {
        scene.style.opacity = i === 3 ? "1" : "0";
        scene.style.clipPath = "inset(0 0 0 0)";
        scene.style.webkitClipPath = "inset(0 0 0 0)";
        scene.style.transform = "none";
      });
      copies.forEach(function (copy, i) { copy.classList.toggle("is-active", i === 3); });
      steps.forEach(function (step, i) {
        step.classList.toggle("is-active", i === 3);
        step.classList.toggle("is-done", i < 3);
      });
      if (currentLabel) currentLabel.textContent = "04";
      if (cue) cue.classList.add("is-hidden");
    } else {
      window.addEventListener("scroll", requestUpdate, { passive: true });
      window.addEventListener("resize", requestUpdate);
      if (mobileMq.addEventListener) mobileMq.addEventListener("change", requestUpdate);
      requestUpdate();
    }

    return {
      activo: function () { return true; },
      estado: function () { return { progreso: lastProgress, fase: lastPhase + 1 }; }
    };
  })();
  window.__scrolly = scrollyHero;

  /* ---------- Reproductor del film ---------- */
  var filmVideo = document.getElementById("filmVideo");
  var filmPlay = document.getElementById("filmPlay");

  if (filmVideo && filmPlay) {
    var filmWrap = filmVideo.parentElement;

    filmPlay.addEventListener("click", function () {
      filmVideo.muted = false;
      filmVideo.currentTime = 0;
      var p = filmVideo.play();
      if (p && p.catch) p.catch(function () {});
    });

    filmVideo.addEventListener("play", function () {
      filmWrap.classList.add("is-playing");
    });

    filmVideo.addEventListener("pause", function () {
      if (filmVideo.currentTime === 0 || filmVideo.ended) {
        filmWrap.classList.remove("is-playing");
      }
    });
  }

  /* ---------- Tarjetas de YouTube: reproducir en sitio ---------- */
  document.querySelectorAll(".yt-card[data-yt]").forEach(function (card) {
    card.addEventListener("click", function (event) {
      event.preventDefault();
      var id = card.getAttribute("data-yt");
      var iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
      iframe.title = card.querySelector(".yt-card__title") ? card.querySelector(".yt-card__title").textContent : "Video de Häcker Küchen";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.setAttribute("allowfullscreen", "");
      card.appendChild(iframe);
    }, { once: true });
  });

  /* ---------- Formulario (sin backend todavía) ---------- */
  var form = document.getElementById("contactForm");
  var hint = document.getElementById("formHint");

  /* ---------- Asistente de 3 pasos ----------
     Progresivo: sin JS los tres pasos quedan visibles y el formulario
     funciona igual. Con JS, un paso a la vez con barra de progreso. */
  if (form) {
    var pasos = form.querySelectorAll(".wizard__panel");
    var etiquetas = ["TU PROYECTO", "EL ESPACIO", "TUS DATOS"];
    var wizardLabel = document.getElementById("wizardLabel");
    var wizardBar = document.getElementById("wizardBar");
    var btnPrev = document.getElementById("wizardPrev");
    var btnNext = document.getElementById("wizardNext");
    var pasoActual = 0;

    if (pasos.length === 3 && wizardLabel && btnPrev && btnNext) {
      form.classList.add("is-wizard");

      var pintarPaso = function (enfocar) {
        pasos.forEach(function (p, i) { p.classList.toggle("is-active", i === pasoActual); });
        form.classList.toggle("is-first", pasoActual === 0);
        form.classList.toggle("is-last", pasoActual === pasos.length - 1);
        wizardLabel.textContent = "PASO 0" + (pasoActual + 1) + " / 03 · " + etiquetas[pasoActual];
        if (wizardBar) wizardBar.style.width = ((pasoActual + 1) / pasos.length * 100).toFixed(1) + "%";
        if (enfocar) {
          var primero = pasos[pasoActual].querySelector("input:not([type=radio]), select, textarea, input[type=radio]:checked");
          if (primero) primero.focus();
        }
      };

      btnNext.addEventListener("click", function () {
        if (pasoActual < pasos.length - 1) { pasoActual++; pintarPaso(true); }
      });

      btnPrev.addEventListener("click", function () {
        if (pasoActual > 0) { pasoActual--; pintarPaso(true); }
      });

      // Enter en pasos intermedios avanza en vez de enviar
      form.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && pasoActual < pasos.length - 1 && e.target.tagName !== "TEXTAREA") {
          e.preventDefault();
          pasoActual++;
          pintarPaso(true);
        }
      });

      pintarPaso(false);

      // Si la validación del envío falla, saltar al paso de los datos
      form.addEventListener("invalid-datos", function () {
        pasoActual = 2;
        pintarPaso(false);
      });
    }
  }

  if (form && hint) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var nombre = document.getElementById("f-nombre");
      var email = document.getElementById("f-email");
      var privacidad = document.getElementById("f-privacidad");
      var invalido = null;
      var mensaje = "";

      [nombre, email].forEach(function (campo) { campo.removeAttribute("aria-invalid"); });

      if (!nombre.value.trim()) {
        invalido = nombre;
        mensaje = "Escribe tu nombre completo para poder contactarte.";
      } else if (!email.value.trim() || !email.validity.valid) {
        invalido = email;
        mensaje = "Escribe un correo electrónico válido, por ejemplo nombre@correo.mx.";
      } else if (privacidad && !privacidad.checked) {
        invalido = privacidad;
        mensaje = "Necesitamos tu consentimiento del aviso de privacidad para contactarte.";
      }

      if (invalido) {
        // El error identifica el campo concreto y lleva el foco hasta él.
        // Si el asistente está en otro paso, primero muestra el de los datos.
        if (invalido !== privacidad) invalido.setAttribute("aria-invalid", "true");
        form.dispatchEvent(new Event("invalid-datos"));
        hint.textContent = mensaje;
        invalido.focus();
        return;
      }

      // TODO al publicar: añadir action="https://formspree.io/f/XXXX" method="POST"
      // al <form> y sustituir estas dos líneas por el envío real (fetch).
      hint.textContent = "Gracias, " + nombre.value.trim().split(" ")[0] + ". Un asesor te contactará muy pronto.";
      form.reset();
    });
  }

  /* ---------- Año dinámico ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
