(() => {
  const revealItems = Array.from(document.querySelectorAll('[data-tn-reveal]'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('tn-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('tn-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('form[data-tn-quick-add]');
    if (!form || form.dataset.tnPending === 'true') return;

    const button = form.querySelector('[data-tn-quick-add-button]');
    if (!button || button.disabled) return;

    event.preventDefault();
    form.dataset.tnPending = 'true';
    const defaultLabel = button.textContent.trim();
    button.setAttribute('aria-busy', 'true');

    try {
      const body = new URLSearchParams(new FormData(form));
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body
      });
      if (!response.ok) throw new Error('Unable to add item');
      form.classList.add('tn-added');
      button.textContent = 'Added ✓';
      window.setTimeout(() => { window.location.assign('/cart'); }, 240);
    } catch (error) {
      form.dataset.tnPending = 'false';
      button.removeAttribute('aria-busy');
      button.textContent = 'Try again';
      window.setTimeout(() => { button.textContent = defaultLabel; }, 2200);
    }
  });

  const rotators = Array.from(document.querySelectorAll('[data-tn-rotator]'));
  rotators.forEach((rotator) => {
    const cards = Array.from(rotator.querySelectorAll('[data-tn-slide]'));
    const dots = Array.from(rotator.querySelectorAll('[data-tn-rotator-dot]'));
    const stage = rotator.querySelector('[data-tn-rotator-stage]');
    const previous = rotator.querySelector('[data-tn-rotator-prev]');
    const next = rotator.querySelector('[data-tn-rotator-next]');
    const count = rotator.querySelector('[data-tn-rotator-count]');
    const status = rotator.querySelector('[data-tn-rotator-status]');
    if (cards.length < 2 || !stage) return;

    let activeIndex = 0;
    let dragStartX = null;
    let ignoreClick = false;

    const normalize = (value) => (value + cards.length) % cards.length;
    const deltaFor = (index) => {
      let delta = index - activeIndex;
      const half = cards.length / 2;
      if (delta > half) delta -= cards.length;
      if (delta < -half) delta += cards.length;
      return delta;
    };

    const render = () => {
      cards.forEach((card, index) => {
        const delta = deltaFor(index);
        let position = 'hidden';
        if (delta === 0) position = 'active';
        else if (delta === -1) position = 'prev';
        else if (delta === 1) position = 'next';
        else if (delta < 0) position = 'far-left';
        else if (delta > 0) position = 'far-right';

        card.dataset.tnPosition = position;
        card.setAttribute('aria-hidden', position === 'active' ? 'false' : 'true');
        card.querySelectorAll('a, button').forEach((control) => {
          if (position === 'active') control.removeAttribute('tabindex');
          else control.setAttribute('tabindex', '-1');
        });
      });

      dots.forEach((dot, index) => {
        const selected = index === activeIndex;
        dot.setAttribute('aria-selected', String(selected));
        dot.setAttribute('tabindex', selected ? '0' : '-1');
      });

      const selectedCard = cards[activeIndex];
      const selectedTitle = selectedCard?.dataset.tnTitle || 'Travel essential';
      if (count) count.textContent = String(activeIndex + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
      if (status) status.textContent = selectedTitle + ' selected';
    };

    const setActive = (index) => {
      activeIndex = normalize(index);
      render();
    };

    previous?.addEventListener('click', () => setActive(activeIndex - 1));
    next?.addEventListener('click', () => setActive(activeIndex + 1));

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => setActive(index));
      dot.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : normalize(index + (event.key === 'ArrowRight' ? 1 : -1));
        setActive(nextIndex);
        dots[nextIndex]?.focus();
      });
    });

    stage.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setActive(activeIndex - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setActive(activeIndex + 1);
      }
      if (event.key === 'Home') {
        event.preventDefault();
        setActive(0);
      }
      if (event.key === 'End') {
        event.preventDefault();
        setActive(cards.length - 1);
      }
    });

    stage.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      dragStartX = event.clientX;
      stage.setPointerCapture?.(event.pointerId);
    });
    stage.addEventListener('pointerup', (event) => {
      if (dragStartX === null) return;
      const distance = event.clientX - dragStartX;
      dragStartX = null;
      if (Math.abs(distance) < 45) return;
      ignoreClick = true;
      setActive(activeIndex + (distance < 0 ? 1 : -1));
      window.setTimeout(() => { ignoreClick = false; }, 400);
    });
    stage.addEventListener('pointercancel', () => { dragStartX = null; });

    cards.forEach((card) => {
      card.addEventListener('click', (event) => {
        if (ignoreClick) {
          event.preventDefault();
          return;
        }
        if (card.dataset.tnPosition !== 'active') {
          event.preventDefault();
          setActive(Number(card.dataset.tnIndex));
        }
      });
    });

    render();
  });

})();