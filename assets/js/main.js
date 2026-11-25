/* =========================================================
   MOVEXA Packers & Movers — site scripts
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Header shadow on scroll ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -60px 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Date inputs: no past dates ---------- */
  var today = new Date();
  var iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  document.querySelectorAll('input[type="date"]').forEach(function (el) { el.min = iso; });

  /* ---------- Pre-fill forms from URL (?from=&to=&service=) ---------- */
  var params = new URLSearchParams(window.location.search);
  ['from', 'to', 'service', 'size'].forEach(function (key) {
    var val = params.get(key);
    if (!val) return;
    document.querySelectorAll('[name="' + key + '"]').forEach(function (el) { el.value = val; });
  });

  /* ---------- Enquiry forms (quote / contact / feedback) ----------
     These forms validate in the browser and show a confirmation.
     Connect them to your mail handler or CRM by setting the form's
     `action` attribute (e.g. action="send-enquiry.php") and removing
     the data-demo attribute. */
  document.querySelectorAll('form.js-enquiry').forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      if (!form.checkValidity()) {
        ev.preventDefault();
        ev.stopPropagation();
        form.classList.add('was-validated');
        var firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      if (form.hasAttribute('data-demo')) {
        ev.preventDefault();
        var ok = form.querySelector('.form-success');
        if (ok) {
          ok.classList.add('show');
          ok.setAttribute('tabindex', '-1');
          ok.focus();
        }
        form.reset();
        form.classList.remove('was-validated');
      }
    });
  });

  /* ---------- Home estimator → calculator ---------- */
  var estimator = document.getElementById('homeEstimator');
  if (estimator) {
    estimator.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var q = new URLSearchParams(new FormData(estimator));
      window.location.href = 'moving-cost-calculator.html?' + q.toString();
    });
  }

  /* ---------- Moving cost calculator ----------
     IMPORTANT: the rates below are SAMPLE figures so the calculator
     works out of the box. Replace them with your own pricing. */
  var RATES = {
    size: { // base range for local moves, in ₹
      '1rk': [4000, 7000],
      '1bhk': [6000, 11000],
      '2bhk': [9000, 16000],
      '3bhk': [13000, 24000],
      '4bhk': [18000, 34000],
      'office-small': [15000, 30000],
      'office-large': [35000, 80000],
      'vehicle': [3500, 7000]
    },
    perKm: [14, 26],          // added per km beyond the included local distance
    includedKm: 25,
    service: {                // multiplier on the base range
      'Home shifting': 1,
      'Office relocation': 1.15,
      'Industrial relocation': 1.6,
      'Car & bike transport': 0.8,
      'Car transportation': 0.85,
      'Bike transportation': 0.5,
      'Packing & unpacking': 0.45,
      'Loading & unloading': 0.3,
      'Warehousing & storage': 0.6,
      'Transfer bills & documents': 0.1
    },
    access: {
      'lift': 1,
      'ground': 1,
      'stairs-low': 1.06,
      'stairs-high': 1.14,
      'long-carry': 1.08
    }
  };

  var calc = document.getElementById('costCalculator');
  if (calc) {
    var out = document.getElementById('estimateRange');
    var note = document.getElementById('estimateNote');
    var fmt = function (n) { return '₹ ' + (Math.round(n / 500) * 500).toLocaleString('en-IN'); };

    var run = function (show) {
      var f = new FormData(calc);
      var size = RATES.size[f.get('size')];
      if (!size) {
        if (show) { out.textContent = 'Choose a move size'; out.classList.add('is-placeholder'); }
        return false;
      }
      var km = Math.max(0, parseFloat(f.get('distance')) || 0);
      var extraKm = Math.max(0, km - RATES.includedKm);
      var s = RATES.service[f.get('service')] || 1;
      var a = RATES.access[f.get('access')] || 1;
      var lo = (size[0] * s + extraKm * RATES.perKm[0]) * a;
      var hi = (size[1] * s + extraKm * RATES.perKm[1]) * a;
      out.textContent = fmt(lo) + ' – ' + fmt(hi);
      out.classList.remove('is-placeholder');
      if (note) {
        note.textContent = (km ? km + ' km' : 'Local move') + ' · ' + (f.get('service') || 'Home shifting') +
          '. Distance, inventory, access and handling can affect your final quote.';
      }
      return true;
    };

    calc.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!calc.checkValidity()) { calc.classList.add('was-validated'); return; }
      run(true);
      var preview = document.getElementById('estimatePreview');
      if (preview && window.innerWidth < 992) preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    calc.addEventListener('change', function () { if (calc.querySelector('[name="size"]').value) run(false); });
    if (params.get('from') || params.get('size')) run(false);
    // "Request a confirmed quote" opens the popup form, pre-filled from this calculator (see popup section below).
  }

  /* ---------- Popup quote / call-back form ----------
     Every CTA button with data-bs-target="#quoteModal" opens this form.
     data-popup="callback" switches it to a short call-back request.
     AUTO_POPUP_DELAY: show the popup once per visit after this many
     milliseconds. Set to 0 to turn the automatic popup off. */
  var AUTO_POPUP_DELAY = 8000;
  var AUTO_POPUP_SKIP = ['get-a-quote.html', 'contact.html'];

  var modalEl = document.getElementById('quoteModal');
  if (modalEl && window.bootstrap) {
    var pForm = document.getElementById('popupQuote');
    var pTitle = document.getElementById('quoteModalTitle');
    var pSub = document.getElementById('quoteModalSub');
    var pEyebrow = document.getElementById('quoteModalEyebrow');
    var pSubmit = document.getElementById('pq-submit');
    var pSource = document.getElementById('pq-source');
    var page = (location.pathname.split('/').pop() || 'index.html');

    var MODES = {
      quote: {
        eyebrow: 'Free quote · No obligation',
        title: 'Get a free moving quote',
        sub: 'Share a few details and our team will call you back with a quote.',
        submit: 'Get my free quote'
      },
      callback: {
        eyebrow: 'Talk to our team',
        title: 'Request a call back',
        sub: 'Leave your number and a moving coordinator will call you.',
        submit: 'Request a call back'
      },
      auto: {
        eyebrow: 'Planning a move?',
        title: 'Get your free moving quote',
        sub: 'It takes less than a minute — our team will call you back.',
        submit: 'Get my free quote'
      }
    };

    var setVal = function (name, value) {
      var el = pForm.querySelector('[name="' + name + '"]');
      if (el && value && !el.value) el.value = value;
    };

    modalEl.addEventListener('show.bs.modal', function (ev) {
      var trigger = ev.relatedTarget;
      var mode = trigger ? (trigger.getAttribute('data-popup') || 'quote') : 'auto';
      var copy = MODES[mode] || MODES.quote;
      var isCallback = mode === 'callback';

      pEyebrow.textContent = copy.eyebrow;
      pTitle.textContent = trigger && trigger.getAttribute('data-popup-title') || copy.title;
      pSub.textContent = copy.sub;
      pSubmit.firstChild.nodeValue = copy.submit + ' ';
      pForm.classList.toggle('is-callback', isCallback);
      pForm.querySelectorAll('.quote-only input, .quote-only select').forEach(function (el) { el.disabled = isCallback; });
      pForm.querySelectorAll('.callback-only textarea').forEach(function (el) { el.disabled = !isCallback; });

      // Which CTA opened the form (useful when you connect the form to email/CRM)
      pSource.value = (trigger ? trigger.textContent.replace(/\s+/g, ' ').trim() : 'Automatic popup') + ' | ' + page;

      // Pre-fill from the page context
      var calcForm = document.getElementById('costCalculator');
      if (trigger && trigger.id === 'toQuote' && calcForm) {
        ['from', 'to', 'service', 'date'].forEach(function (k) {
          var src = calcForm.querySelector('[name="' + k + '"]');
          if (src) setVal(k, src.value);
        });
      }
      var inline = document.getElementById('quote');
      if (inline) {
        var svc = inline.querySelector('[name="service"]');
        var from = inline.querySelector('[name="from"]');
        if (svc) setVal('service', svc.value);
        if (from) setVal('from', from.value);
      }
      try { sessionStorage.setItem('mx_popup_seen', '1'); } catch (e) { /* storage unavailable */ }
    });

    modalEl.addEventListener('shown.bs.modal', function () {
      var first = pForm.querySelector('input:not([type="hidden"]):not([disabled])');
      if (first && window.innerWidth >= 576) first.focus();
    });

    // Hide the success message when the popup is opened again
    modalEl.addEventListener('hidden.bs.modal', function () {
      var ok = pForm.querySelector('.form-success');
      if (ok && ok.classList.contains('show')) {
        ok.classList.remove('show');
        try { sessionStorage.setItem('mx_popup_done', '1'); } catch (e) { /* storage unavailable */ }
      }
    });

    // Open directly with a link like page.html#get-quote
    if (location.hash === '#get-quote') {
      bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }

    // Automatic popup, once per visit
    var seen = false;
    try { seen = !!(sessionStorage.getItem('mx_popup_seen') || sessionStorage.getItem('mx_popup_done')); } catch (e) { seen = true; }
    if (AUTO_POPUP_DELAY > 0 && !seen && AUTO_POPUP_SKIP.indexOf(page) === -1) {
      setTimeout(function () {
        var busy = document.querySelector('.modal.show') ||
          (document.activeElement && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName));
        if (!busy) bootstrap.Modal.getOrCreateInstance(modalEl).show();
      }, AUTO_POPUP_DELAY);
    }
  }

  /* ---------- Gallery: filters + viewer ---------- */
  var gallery = document.getElementById('gallery');
  if (gallery) {
    var items = Array.prototype.slice.call(gallery.querySelectorAll('.gallery-item'));
    var buttons = document.querySelectorAll('.filter-btn');
    var vImg = document.getElementById('viewerImg');
    var vTitle = document.getElementById('viewerTitle');
    var vMeta = document.getElementById('viewerMeta');
    var current = 0;

    var visible = function () { return items.filter(function (i) { return !i.classList.contains('is-hidden'); }); };

    var show = function (idx) {
      var list = visible();
      if (!list.length) return;
      current = (idx + list.length) % list.length;
      var el = list[current];
      var img = el.querySelector('img');
      vImg.style.opacity = 0;
      setTimeout(function () {
        vImg.src = img.getAttribute('src');
        vImg.alt = img.alt;
        vImg.style.opacity = 1;
      }, 120);
      vTitle.textContent = el.dataset.title;
      vMeta.innerHTML = el.dataset.tag + ' &middot; <span class="count">Photo ' + (current + 1) + ' of ' + list.length + '</span>';
    };

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        var f = btn.dataset.filter;
        items.forEach(function (i) { i.classList.toggle('is-hidden', f !== 'all' && i.dataset.cat !== f); });
        show(0);
      });
    });

    items.forEach(function (el) {
      var open = function () {
        show(visible().indexOf(el));
        document.getElementById('viewer').scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
      el.querySelector('.gallery-card').addEventListener('click', open);
      el.querySelector('.gallery-card').addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });

    document.getElementById('viewerPrev').addEventListener('click', function () { show(current - 1); });
    document.getElementById('viewerNext').addEventListener('click', function () { show(current + 1); });
    document.getElementById('viewer').addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
    show(5);
  }

  /* ---------- Service areas: location search ---------- */
  var locForm = document.getElementById('locationSearch');
  if (locForm) {
    var cards = document.querySelectorAll('[data-keywords]');
    var msg = document.getElementById('locationMsg');
    locForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var q = (locForm.querySelector('input').value || '').trim().toLowerCase();
      var hits = 0;
      cards.forEach(function (c) {
        var match = !q || c.dataset.keywords.toLowerCase().indexOf(q) > -1;
        c.classList.toggle('d-none', !match);
        if (match) hits++;
      });
      msg.classList.toggle('d-none', hits > 0);
      document.querySelectorAll('[data-region]').forEach(function (r) {
        r.classList.toggle('d-none', !r.querySelector('[data-keywords]:not(.d-none)'));
      });
    });
    locForm.querySelector('input').addEventListener('input', function (e) {
      if (!e.target.value) {
        cards.forEach(function (c) { c.classList.remove('d-none'); });
        document.querySelectorAll('[data-region]').forEach(function (r) { r.classList.remove('d-none'); });
        msg.classList.add('d-none');
      }
    });
  }
})();
