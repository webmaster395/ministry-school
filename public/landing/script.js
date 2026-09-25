(() => {
  "use strict";
  // Le script ne s'applique qu'une fois par affichage de la page (le rejeu en développement dupliquerait les accordéons)
  const landingRoot = document.querySelector(".landing");
  if (!landingRoot || landingRoot.dataset.scripted === "1") return;
  landingRoot.dataset.scripted = "1";
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
  const programTabsHost = document.querySelector(".program-tabs");
  const programPanelsHost = document.querySelector(".program-panels");
  const programSwitcher = document.querySelector(".program-switcher");
  const mobileProgramQuery = matchMedia("(max-width: 900px)");
  const mobileProgramList = document.createElement("div");
  mobileProgramList.className = "program-mobile-list";
  mobileProgramList.setAttribute("aria-label", "Choisir un horaire");
  if (programSwitcher && programPanelsHost) programSwitcher.insertBefore(mobileProgramList, programPanelsHost);

  const syncProgramLayout = () => {
    if (!programTabsHost || !programPanelsHost || !programSwitcher) return;
    if (mobileProgramQuery.matches) {
      programTabs.forEach((tab, index) => {
        let item = mobileProgramList.children[index];
        if (!item) {
          item = document.createElement("div");
          item.className = "program-mobile-item";
          mobileProgramList.appendChild(item);
        }
        item.append(tab, programPanels[index]);
      });
    } else {
      programTabs.forEach((tab) => programTabsHost.appendChild(tab));
      programPanels.forEach((panel) => programPanelsHost.appendChild(panel));
      mobileProgramList.replaceChildren();
    }
  };

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
  syncProgramLayout();
  mobileProgramQuery.addEventListener("change", syncProgramLayout);

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
      pricingCta.textContent = type === "member" ? "Activer mon compte Membership" : "Prendre ma place";
    });
  });

  const priceChoiceButtons = [...document.querySelectorAll("[data-price-choice]")];
  const priceChoicePanels = [...document.querySelectorAll("[data-price-panel]")];
  const activatePriceChoice = (button, focus = false) => {
    const choice = button.dataset.priceChoice;
    priceChoiceButtons.forEach((item) => {
      const selected = item === button;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    priceChoicePanels.forEach((panel) => {
      const selected = panel.dataset.pricePanel === choice;
      panel.hidden = !selected;
      panel.classList.toggle("active", selected);
    });
    if (focus) button.focus();
  };
  priceChoiceButtons.forEach((button, index) => {
    button.tabIndex = button.getAttribute("aria-selected") === "true" ? 0 : -1;
    button.addEventListener("click", () => activatePriceChoice(button));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + priceChoiceButtons.length) % priceChoiceButtons.length;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % priceChoiceButtons.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = priceChoiceButtons.length - 1;
      activatePriceChoice(priceChoiceButtons[nextIndex], true);
    });
  });

  const priceTabsRoot = document.querySelector(".price-tabs");
  if (priceTabsRoot && priceChoiceButtons.length && priceChoicePanels.length) {
    const mobileAccordion = document.createElement("div");
    mobileAccordion.className = "price-mobile-accordion";
    mobileAccordion.setAttribute("aria-label", "Choisir ta situation");

    priceChoiceButtons.forEach((sourceButton, index) => {
      const choice = sourceButton.dataset.priceChoice;
      const sourcePanel = priceChoicePanels.find((panel) => panel.dataset.pricePanel === choice);
      if (!sourcePanel) return;

      const item = document.createElement("section");
      item.className = "price-mobile-accordion__item";
      const trigger = document.createElement("button");
      const panel = sourcePanel.cloneNode(true);
      const panelId = `price-mobile-${choice}`;
      const startsOpen = choice === "general";

      trigger.type = "button";
      trigger.className = "price-mobile-accordion__trigger";
      trigger.setAttribute("aria-expanded", String(startsOpen));
      trigger.setAttribute("aria-controls", panelId);
      trigger.innerHTML = `<span><small>0${index + 1}</small>${sourceButton.textContent}</span><i aria-hidden="true">+</i>`;

      panel.id = panelId;
      panel.classList.add("price-mobile-accordion__panel");
      panel.removeAttribute("data-price-panel");
      panel.hidden = !startsOpen;
      panel.querySelectorAll(".checkout").forEach((link) => {
        if (!TICKET_URL) link.addEventListener("click", (event) => event.preventDefault());
      });

      trigger.addEventListener("click", () => {
        const opening = trigger.getAttribute("aria-expanded") !== "true";
        mobileAccordion.querySelectorAll(".price-mobile-accordion__trigger").forEach((otherTrigger) => {
          const otherPanel = document.getElementById(otherTrigger.getAttribute("aria-controls"));
          const active = otherTrigger === trigger && opening;
          otherTrigger.setAttribute("aria-expanded", String(active));
          if (otherPanel) otherPanel.hidden = !active;
        });
      });

      item.append(trigger, panel);
      mobileAccordion.append(item);
    });

    priceTabsRoot.querySelector(".price-tabs__panels").after(mobileAccordion);
  }

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
