(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Nav background on scroll ---------- */
  const nav = document.getElementById("nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Reveal on scroll ---------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Splash (Lottie) ----------
     droplet.json markers: each mood loops for 60 frames, followed by a
     30 frame transition into the next mood.
       hydrated 0–60 · okay 90–150 · thirsty 180–240 · parched 270–330
       parched_to_hydrated 330–360 */
  const MOODS = [
    { name: "hydrated", colour: "#3394ff", fill: 100 },
    { name: "okay", colour: "#4f9fe6", fill: 68 },
    { name: "thirsty", colour: "#7b9bb8", fill: 36 },
    { name: "parched", colour: "#9a9474", fill: 8 },
  ];
  const loopOf = (level) => [level * 90, level * 90 + 60];

  function createSplash(container) {
    if (!window.lottie) return null;
    const anim = lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: true,
      autoplay: false,
      path: "assets/splash.json",
      rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
    });
    anim.addEventListener("DOMLoaded", () => {
      if (reduceMotion) anim.goToAndStop(0, true);
      else anim.playSegments(loopOf(0), true);
    });
    return anim;
  }

  // Build the chain of transition segments from one mood to another,
  // skipping the idle loops in between so jumps stay snappy.
  function pathBetween(from, to) {
    const segments = [];
    if (to > from) {
      for (let l = from; l < to; l++) segments.push([l * 90 + 60, l * 90 + 90]);
    } else if (to === 0 && from === 3) {
      segments.push([330, 360]);
    } else {
      for (let l = from; l > to; l--) segments.push([l * 90, l * 90 - 30]);
    }
    segments.push(loopOf(to));
    return segments;
  }

  // Decorative Splashes (hero + CTA): always happy
  document.querySelectorAll(".lottie:not(#splashPlayground)").forEach(createSplash);

  // Interactive Splash
  const stage = document.getElementById("splashPlayground");
  if (stage) {
    const anim = createSplash(stage);
    const label = document.getElementById("moodLabel");
    const meter = document.getElementById("meterFill");
    const buttons = document.querySelectorAll(".mood-picker button");
    const drinkBtn = document.getElementById("drinkBtn");
    let level = 0;
    let idleTimer = null;
    let inView = false;

    const setMood = (next) => {
      next = Math.max(0, Math.min(3, next));
      if (next === level) return;
      if (anim && anim.isLoaded) {
        if (reduceMotion) anim.goToAndStop(loopOf(next)[0], true);
        else anim.playSegments(pathBetween(level, next), true);
      }
      level = next;
      const mood = MOODS[level];
      label.textContent = mood.name;
      label.style.color = mood.colour;
      meter.style.width = mood.fill + "%";
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.level === level)));
      scheduleThirst();
    };

    // Splash slowly gets thirstier while you're watching and not helping
    const scheduleThirst = () => {
      clearTimeout(idleTimer);
      if (!inView || reduceMotion || level >= 3) return;
      idleTimer = setTimeout(() => setMood(level + 1), 6000);
    };

    const splash = () => {
      stage.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.08, 0.92)" },
          { transform: "scale(0.96, 1.05)" },
          { transform: "scale(1)" },
        ],
        { duration: 450, easing: "ease-out" }
      );
    };

    const giveDrink = () => {
      if (!reduceMotion) splash();
      if (level === 0) scheduleThirst();
      else setMood(level === 3 ? 0 : level - 1);
    };

    buttons.forEach((b) => b.addEventListener("click", () => setMood(+b.dataset.level)));
    drinkBtn.addEventListener("click", giveDrink);
    stage.addEventListener("click", giveDrink);

    new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) scheduleThirst();
        else clearTimeout(idleTimer);
      },
      { threshold: 0.4 }
    ).observe(stage);
  }

  /* ---------- Screenshot gallery ---------- */
  const gallery = document.getElementById("gallery");
  if (gallery) {
    const step = () => gallery.querySelector("figure").offsetWidth + 28;
    document.querySelectorAll(".gallery-controls button").forEach((btn) =>
      btn.addEventListener("click", () =>
        gallery.scrollBy({ left: step() * +btn.dataset.dir, behavior: "smooth" })
      )
    );

    // Drag to scroll with a mouse
    let startX = 0;
    let startScroll = 0;
    let dragging = false;
    gallery.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      dragging = true;
      startX = e.clientX;
      startScroll = gallery.scrollLeft;
      gallery.classList.add("dragging");
      gallery.setPointerCapture(e.pointerId);
    });
    gallery.addEventListener("pointermove", (e) => {
      if (dragging) gallery.scrollLeft = startScroll - (e.clientX - startX);
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      gallery.classList.remove("dragging");
      const nearest = Math.round(gallery.scrollLeft / step()) * step();
      gallery.scrollTo({ left: nearest, behavior: "smooth" });
    };
    gallery.addEventListener("pointerup", endDrag);
    gallery.addEventListener("pointercancel", endDrag);
  }

  /* ---------- CTA bubbles ---------- */
  const bubbles = document.querySelector(".cta-bubbles");
  if (bubbles && !reduceMotion) {
    for (let i = 0; i < 14; i++) {
      const b = document.createElement("span");
      const size = 8 + Math.random() * 26;
      b.style.cssText = `width:${size}px;height:${size}px;left:${Math.random() * 100}%;animation-duration:${
        6 + Math.random() * 8
      }s;animation-delay:${-Math.random() * 12}s`;
      bubbles.appendChild(b);
    }
  }
})();
