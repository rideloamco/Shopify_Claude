/* Loam Co. — Theme JavaScript */
(function () {
  'use strict';

  /* ── Cart state ──────────────────────────────────────────────────────────── */
  const cartDrawer  = () => document.getElementById('cart-drawer');
  const cartOverlay = () => document.getElementById('cart-overlay');
  const cartBody    = () => document.getElementById('cart-drawer-body');
  const cartTotal   = () => document.getElementById('cart-total');

  function openCart() {
    cartDrawer()?.classList.add('is-open');
    cartOverlay()?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    cartDrawer()?.classList.remove('is-open');
    cartOverlay()?.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function formatMoney(cents) {
    return '£' + (cents / 100).toFixed(2);
  }

  /* ── Free-shipping progress ──────────────────────────────────────────────── */
  const FREE_SHIP_THRESHOLD = 5000; /* £50 in pence */

  function updateShippingBar(cart) {
    const bar = document.getElementById('cart-shipping');
    if (!bar) return;
    if (!cart || cart.item_count === 0) { bar.style.display = 'none'; return; }
    bar.style.display = 'block';

    const total = cart.total_price;
    const remaining = FREE_SHIP_THRESHOLD - total;
    const pct = Math.min(100, Math.round((total / FREE_SHIP_THRESHOLD) * 100));
    const fill = bar.querySelector('.cart-shipping__fill');
    const text = bar.querySelector('.cart-shipping__text');

    if (fill) fill.style.width = pct + '%';
    if (remaining > 0) {
      bar.classList.remove('cart-shipping--met');
      if (text) text.innerHTML = "You're <strong>" + formatMoney(remaining) + "</strong> away from free UK shipping";
    } else {
      bar.classList.add('cart-shipping--met');
      if (text) text.innerHTML = "<strong>✓ Free UK shipping unlocked</strong>";
    }
  }

  async function fetchCart() {
    const res = await fetch('/cart.js');
    return res.json();
  }

  async function refreshCart() {
    const cart = await fetchCart();

    /* Update all cart count badges */
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = cart.item_count;
      el.style.display = cart.item_count > 0 ? 'flex' : 'none';
    });

    const body = cartBody();
    if (!body) return;

    if (cart.items.length === 0) {
      body.innerHTML = '<p class="cart-drawer__empty">Bag\'s empty. Get to it.</p>'
        + '<a href="/collections/shop-all" class="btn btn--primary" style="margin-top:18px">SHOP THE KIT</a>';
    } else {
      body.innerHTML = cart.items.map((item, idx) => `
        <div class="cart-item">
          <div class="cart-item__image">
            ${item.image
              ? `<img src="${item.image}" alt="${item.product_title}" width="70" height="70" loading="lazy">`
              : ''}
          </div>
          <div class="cart-item__info">
            <div class="cart-item__name">${item.product_title}</div>
            ${item.variant_title && item.variant_title !== 'Default Title'
              ? `<div class="cart-item__variant">${item.variant_title}</div>` : ''}
            <div class="cart-item__price">${formatMoney(item.line_price)}</div>
            <button class="cart-item__remove" data-line="${idx + 1}">Remove</button>
          </div>
        </div>
      `).join('');
    }

    if (cartTotal()) {
      cartTotal().textContent = formatMoney(cart.total_price);
    }

    updateShippingBar(cart);
  }

  /* ── Add to cart ─────────────────────────────────────────────────────────── */
  document.body.addEventListener('click', async (e) => {
    /* Cart toggle buttons */
    if (e.target.closest('[data-action="open-cart"]')) {
      openCart();
      return;
    }

    /* Close cart */
    if (e.target.closest('[data-action="close-cart"]')) {
      closeCart();
      return;
    }

    /* Sticky mobile add-to-cart → trigger the main add button */
    if (e.target.closest('[data-sticky-atc]')) {
      document.querySelector('.product-add-to-cart')?.click();
      return;
    }

    /* Add to cart */
    const addBtn = e.target.closest('[data-add-to-cart]');
    if (addBtn) {
      const variantId = addBtn.dataset.variantId;
      if (!variantId) return;

      const originalText = addBtn.textContent;
      addBtn.disabled = true;
      addBtn.textContent = 'ADDING...';

      try {
        const res = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: parseInt(variantId), quantity: 1 }),
        });

        if (res.ok) {
          addBtn.textContent = '✓ ADDED';
          addBtn.classList.add('is-added');
          if (window.fbq) { fbq('track', 'AddToCart', { content_ids: [variantId], content_type: 'product' }); }
          await refreshCart();
          openCart();
          setTimeout(() => {
            addBtn.textContent = originalText;
            addBtn.classList.remove('is-added');
            addBtn.disabled = false;
          }, 2000);
        } else {
          const data = await res.json();
          alert(data.description || 'Could not add to cart.');
          addBtn.textContent = originalText;
          addBtn.disabled = false;
        }
      } catch {
        addBtn.textContent = originalText;
        addBtn.disabled = false;
      }
      return;
    }

    /* Remove from cart */
    const removeBtn = e.target.closest('.cart-item__remove');
    if (removeBtn) {
      const line = parseInt(removeBtn.dataset.line);
      await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line, quantity: 0 }),
      });
      await refreshCart();
      return;
    }

    /* Checkout button */
    if (e.target.closest('[data-action="checkout"]')) {
      window.location.href = '/checkout';
    }
  });

  /* ── Cart overlay click to close ─────────────────────────────────────────── */
  document.getElementById('cart-overlay')?.addEventListener('click', closeCart);

  /* ── Variant selector ────────────────────────────────────────────────────── */
  document.querySelectorAll('.variant-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.variant-selector__options');
      group?.querySelectorAll('.variant-option').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');

      const variantId = btn.dataset.variantId;
      const addBtn = document.querySelector('[data-add-to-cart]');
      if (addBtn && variantId) {
        addBtn.dataset.variantId = variantId;
        const available = btn.dataset.available !== 'false';
        addBtn.disabled = !available;
        addBtn.textContent = available ? 'ADD TO CART' : 'SOLD OUT';
        const stickyBtn = document.querySelector('.sticky-atc__btn');
        if (stickyBtn) {
          stickyBtn.disabled = !available;
          stickyBtn.textContent = available ? 'ADD TO CART' : 'SOLD OUT';
        }
      }

      /* Update price display */
      const price = btn.dataset.price;
      const compare = btn.dataset.comparePrice;
      const priceEl = document.querySelector('.product-page__price');
      const compareEl = document.querySelector('.product-page__compare-price');
      if (priceEl && price) priceEl.textContent = formatMoney(parseInt(price));
      const stickyPrice = document.querySelector('.sticky-atc__price');
      if (stickyPrice && price) stickyPrice.textContent = formatMoney(parseInt(price));
      if (compareEl) {
        compareEl.textContent = compare && parseInt(compare) > parseInt(price)
          ? formatMoney(parseInt(compare)) : '';
      }
    });
  });

  /* ── Product gallery thumbnails ──────────────────────────────────────────── */
  document.querySelectorAll('.product-page__thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const mainImg = document.querySelector('.product-page__main-image img');
      if (mainImg && thumb.dataset.src) {
        mainImg.src = thumb.dataset.src;
        mainImg.srcset = '';
      }
      document.querySelectorAll('.product-page__thumb').forEach(t => t.classList.remove('is-active'));
      thumb.classList.add('is-active');
    });
  });

  /* ── FAQ accordion ───────────────────────────────────────────────────────── */
  document.querySelectorAll('.faq-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('is-open');
      /* Close all */
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('is-open'));
      document.querySelectorAll('.faq-toggle').forEach(b => b.setAttribute('aria-expanded', 'false'));
      /* Toggle current */
      if (!isOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ── Newsletter form ─────────────────────────────────────────────────────── */
  document.querySelectorAll('.js-newsletter-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('[name="contact[email]"]');
      if (!emailInput?.value) return;

      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;

      try {
        const fd = new FormData(form);
        await fetch(form.action || '/contact', { method: 'POST', body: fd });

        const wrapper = form.closest('.js-newsletter-wrapper');
        if (wrapper) {
          wrapper.innerHTML = '<div class="newsletter-form--success">You\'re in. See you on the trails.</div>';
        }
      } catch {
        if (btn) btn.disabled = false;
      }
    });
  });

  /* ── Ambassador apply form ───────────────────────────────────────────────── */
  document.querySelectorAll('.js-apply-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'SENDING...'; }

      try {
        const fd = new FormData(form);
        await fetch('/contact', { method: 'POST', body: fd });

        const wrapper = form.closest('.js-apply-wrapper');
        if (wrapper) {
          const email = fd.get('contact[email]') || 'your inbox';
          wrapper.innerHTML = `
            <div class="form-success">
              <div class="form-success__title">Got it. We'll be in touch.</div>
              <div class="form-success__sub">Confirmation sent to <strong>${email}</strong>. Expect a reply within 7 days.</div>
            </div>`;
        }
      } catch {
        if (btn) { btn.disabled = false; btn.textContent = 'SUBMIT APPLICATION'; }
      }
    });
  });

  /* ── Copy to clipboard (dashboard) ──────────────────────────────────────── */
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
        const orig = btn.textContent;
        btn.textContent = 'COPIED';
        btn.classList.add('is-copied');
        setTimeout(() => { btn.textContent = orig; btn.classList.remove('is-copied'); }, 1500);
      } catch { /* clipboard unavailable */ }
    });
  });

  /* ── Dashboard tab nav ───────────────────────────────────────────────────── */
  document.querySelectorAll('[data-dash-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.dashNav;
      document.querySelectorAll('[data-dash-nav]').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      document.querySelectorAll('[data-dash-panel]').forEach(p => {
        p.style.display = p.dataset.dashPanel === target ? 'block' : 'none';
      });
    });
  });

  /* ── Mobile navigation ──────────────────────────────────────────────────── */
  const mobileNav        = document.getElementById('mobile-nav');
  const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
  const hamburgerBtn     = document.querySelector('[data-action="open-nav"]');

  function openNav() {
    mobileNav?.classList.add('is-open');
    mobileNavOverlay?.classList.add('is-open');
    hamburgerBtn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeNav() {
    mobileNav?.classList.remove('is-open');
    mobileNavOverlay?.classList.remove('is-open');
    hamburgerBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburgerBtn?.addEventListener('click', openNav);
  document.querySelector('[data-action="close-nav"]')?.addEventListener('click', closeNav);
  mobileNavOverlay?.addEventListener('click', closeNav);

  /* ── Product accordions (independent toggle) ─────────────────────────────── */
  document.querySelectorAll('.pdp-collapsible__toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.pdp-collapsible');
      const open = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ── Size guide modal ────────────────────────────────────────────────────── */
  const sizeGuide = document.getElementById('pdp-sizeguide');
  if (sizeGuide) {
    const closeSG = () => { sizeGuide.classList.remove('is-open'); document.body.style.overflow = ''; };
    document.querySelectorAll('[data-sizeguide-open]').forEach(b =>
      b.addEventListener('click', () => { sizeGuide.classList.add('is-open'); document.body.style.overflow = 'hidden'; })
    );
    sizeGuide.querySelector('[data-sizeguide-close]')?.addEventListener('click', closeSG);
    sizeGuide.addEventListener('click', (e) => { if (e.target === sizeGuide) closeSG(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSG(); });
  }

  /* ── Klaviyo styled newsletter form ──────────────────────────────────────── */
  document.querySelectorAll('.js-klaviyo-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const key = form.dataset.klaviyoKey;
      const list = form.dataset.klaviyoList;
      const input = form.querySelector('input[type="email"]');
      const email = ((input && input.value) || '').trim();
      const btn = form.querySelector('button');
      const msg = form.parentElement.querySelector('.newsletter-msg');
      const show = (t) => { if (msg) { msg.hidden = false; msg.textContent = t; } };
      if (!email || !key || !list) return;
      const original = btn.textContent;
      btn.disabled = true; btn.textContent = '...';
      try {
        const res = await fetch('https://a.klaviyo.com/client/subscriptions/?company_id=' + encodeURIComponent(key), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'revision': '2024-10-15' },
          body: JSON.stringify({
            data: {
              type: 'subscription',
              attributes: {
                custom_source: 'Website newsletter',
                profile: { data: { type: 'profile', attributes: { email: email } } }
              },
              relationships: { list: { data: { type: 'list', id: list } } }
            }
          })
        });
        if (res.ok) {
          form.reset();
          btn.textContent = '✓ JOINED';
          show("You're in — check your inbox to confirm.");
        } else {
          btn.disabled = false; btn.textContent = original;
          show('Something went wrong — please try again.');
        }
      } catch (err) {
        btn.disabled = false; btn.textContent = original;
        show('Something went wrong — please try again.');
      }
    });
  });

  /* ── Quick-add size picker on product cards ──────────────────────────────── */
  document.body.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-quick-add-toggle]');
    if (!toggle) return;
    const panel = toggle.parentElement.querySelector('.quick-add');
    if (!panel) return;
    if (panel.hasAttribute('hidden')) {
      panel.removeAttribute('hidden');
      toggle.setAttribute('aria-expanded', 'true');
    } else {
      panel.setAttribute('hidden', '');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  /* ── Init: refresh cart count on page load ───────────────────────────────── */
  fetchCart().then(cart => {
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = cart.item_count;
      el.style.display = cart.item_count > 0 ? 'flex' : 'none';
    });
    updateShippingBar(cart);
  }).catch(() => {});

})();
