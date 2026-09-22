(() => {
  "use strict";
  // Renseignée par LandingScripts à partir de NEXT_PUBLIC_BILLETWEB_URL
  const TICKET_URL = window.__TICKET_URL__ || "";

  document.querySelectorAll(".ticket").forEach((link) => {
    if (TICKET_URL) {
      link.href = TICKET_URL;
      link.rel = "noopener noreferrer";
    } else if (link.classList.contains("checkout")) {
      link.setAttribute("aria-disabled", "true");
      link.title = "Lien de billetterie à renseigner";
      link.onclick = (event) => event.preventDefault();
    }
  });

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  const infoButton = document.querySelector(".info");
  const definition = document.querySelector("#definition");
  if (infoButton && definition) {
    infoButton.onclick = () => {
      const isOpen = infoButton.getAttribute("aria-expanded") === "true";
      infoButton.setAttribute("aria-expanded", String(!isOpen));
      definition.hidden = isOpen;
    };
  }

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const navToggle = document.querySelector(".nav-toggle");
  const heroMenu = document.querySelector("#hero-menu");
  if (navToggle && heroMenu) {
    const closeMenu = () => {
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Ouvrir le menu");
      heroMenu.classList.remove("is-open");
    };
    navToggle.addEventListener("click", () => {
      const opening = navToggle.getAttribute("aria-expanded") !== "true";
      navToggle.setAttribute("aria-expanded", String(opening));
      navToggle.setAttribute("aria-label", opening ? "Fermer le menu" : "Ouvrir le menu");
      heroMenu.classList.toggle("is-open", opening);
    });
    heroMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  const evolvingLabel = document.querySelector("#panel-growth .program-panel__meta small");
  if (evolvingLabel) evolvingLabel.textContent = "Un créneau qui évolue au cours de l’année";
  const carousel = document.querySelector(".sensitivity-carousel");
  const track = document.querySelector(".sensitivity-track");
  const slides = [...document.querySelectorAll(".sensitivity-slide")];
  const dots = [...document.querySelectorAll(".sensitivity-dots button")];

  if (carousel && track && slides.length && dots.length) {
    let currentSlide = 0;
    let touchStart = 0;
    let autoplay;

    const showSlide = (nextSlide, userInitiated = false) => {
      currentSlide = (nextSlide + slides.length) % slides.length;
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
      slides.forEach((slide, index) => slide.setAttribute("aria-hidden", String(index !== currentSlide)));
      dots.forEach((dot, index) => {
        dot.classList.toggle("active", index === currentSlide);
        if (index === currentSlide) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
      if (userInitiated) clearInterval(autoplay);
    };

    dots.forEach((dot, index) => dot.addEventListener("click", () => showSlide(index, true)));
    carousel.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") showSlide(currentSlide - 1, true);
      if (event.key === "ArrowRight") showSlide(currentSlide + 1, true);
    });
    carousel.addEventListener("touchstart", (event) => {
      touchStart = event.changedTouches[0].clientX;
    }, { passive: true });
    carousel.addEventListener("touchend", (event) => {
      const distance = event.changedTouches[0].clientX - touchStart;
      if (Math.abs(distance) > 45) showSlide(currentSlide + (distance < 0 ? 1 : -1), true);
    }, { passive: true });
    carousel.addEventListener("mouseenter", () => clearInterval(autoplay));
    carousel.addEventListener("focusin", () => clearInterval(autoplay));

    if (!reducedMotion) autoplay = setInterval(() => showSlide(currentSlide + 1), 5200);
  }

  const programAccordions = [...document.querySelectorAll(".program-accordion")];
  programAccordions.forEach((accordion) => {
    accordion.addEventListener("toggle", () => {
      if (!accordion.open) return;
      programAccordions.forEach((otherAccordion) => {
        if (otherAccordion !== accordion) otherAccordion.open = false;
      });
    });
  });

  const programTabs = [...document.querySelectorAll("[data-program-tab]")];
  const programPanels = [...document.querySelectorAll("[data-program-panel]")];
  const activateProgramTab = (tab, moveFocus = false) => {
    const target = tab.dataset.programTab;
    programTabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });
    programPanels.forEach((panel) => {
      const active = panel.dataset.programPanel === target;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });
    if (moveFocus) tab.focus();
  };
  programTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateProgramTab(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + programTabs.length) % programTabs.length;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % programTabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = programTabs.length - 1;
      activateProgramTab(programTabs[nextIndex], true);
    });
  });

  const phaseTabs = [...document.querySelectorAll("[data-phase-tab]")];
  const phasePanels = [...document.querySelectorAll("[data-phase-panel]")];
  const activatePhase = (tab, moveFocus = false) => {
    const target = tab.dataset.phaseTab;
    phaseTabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });
    phasePanels.forEach((panel) => {
      const active = panel.dataset.phasePanel === target;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });
    if (moveFocus) tab.focus();
  };
  phaseTabs.forEach((tab, index) => {
    tab.tabIndex = index === 0 ? 0 : -1;
    tab.addEventListener("click", () => activatePhase(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + phaseTabs.length) % phaseTabs.length;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % phaseTabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = phaseTabs.length - 1;
      activatePhase(phaseTabs[nextIndex], true);
    });
  });

  const priceButtons = [...document.querySelectorAll("[data-price-type]")];
  const pricingCard = document.querySelector(".pricing-card");
  const pricingLabel = document.querySelector("[data-pricing-label]");
  const pricingAmount = document.querySelector("[data-pricing-amount]");
  const pricingDescription = document.querySelector("[data-pricing-description]");
  const memberMessage = document.querySelector("[data-member-message]");
  const pricingCta = document.querySelector("[data-pricing-cta]");
  const pricingOptions = {
    general: {
      label: "Ministry School 2026–2027",
      amount: "900 €",
      description: "Le tarif complet pour suivre l’ensemble du parcours Ministry School.",
    },
    member: {
      label: "Tarif membre actif MLK",
      amount: "90 €",
      description: "Soit 10 € par journée grâce au tarif préférentiel réservé aux membres actifs.",
    },
  };
  priceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.priceType;
      const option = pricingOptions[type];
      priceButtons.forEach((item) => item.setAttribute("aria-selected", String(item === button)));
      pricingLabel.textContent = option.label;
      pricingAmount.textContent = option.amount;
      pricingDescription.textContent = option.description;
      memberMessage.hidden = type !== "member";
      pricingCard.classList.toggle("member-active", type === "member");
      pricingCta.textContent = "Prendre ma place";
    });
  });

  const revealedElements = document.querySelectorAll(".reveal");
  if (reducedMotion || !window.IntersectionObserver) {
    revealedElements.forEach((element) => element.classList.add("shown"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("shown");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    revealedElements.forEach((element) => observer.observe(element));
  }
})();
