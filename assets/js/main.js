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

  /* ---------- Enquiry forms (quote / call back / contact / feedback) ----------
     Every form has two send buttons: "Send on WhatsApp" and "Send by Email".
     After the browser validates the form, the details are written into a
     ready-to-send WhatsApp message or email to MOVEXA. The visitor only has
     to tap Send in their own app. This page then moves to thank-you.html.
     The message text is kept in sessionStorage (this browser tab only) so
     the thank-you page can offer it again if the app didn't open. */
  var THANK_YOU_PAGE = 'thank-you.html';
  var MX_WHATSAPP = '919649347222';
  var MX_EMAIL = 'info@movexalogistics.in';
  var TITLES = {
    quote: 'Free quote request',
    callback: 'Call back request',
    contact: 'Website enquiry',
    feedback: 'Customer feedback'
  };
  var formType = function (form) {
    if (form.id === 'popupQuote') return form.classList.contains('is-callback') ? 'callback' : 'quote';
    if (form.id === 'enquiry') return 'contact';
    if (form.id === 'feedback') return 'feedback';
    return 'quote';
  };
  var fmtDate = function (v) {
    var d = new Date(v + 'T00:00:00');
    return isNaN(d) ? v : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  var waLink = function (text) { return 'https://wa.me/' + MX_WHATSAPP + '?text=' + encodeURIComponent(text); };
  var mailLink = function (subject, text) {
    return 'mailto:' + MX_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);
  };

  // "Label: value" lines for every filled-in field (name and mobile first)
  var formLines = function (form) {
    var first = [], lines = [];
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled || el.tagName === 'BUTTON' || el.type === 'hidden' || el.type === 'submit') return;
      var v = (el.value || '').trim();
      if (!v) return;
      var lab = el.id ? form.querySelector('label[for="' + el.id + '"]') : null;
      var label = el.name === 'message' ? 'Message' : (lab ? lab.textContent.trim() : el.name);
      if (el.name === 'mobile') v = '+91 ' + v;
      if (el.type === 'date') v = fmtDate(v);
      (el.name === 'name' || el.name === 'mobile' ? first : lines).push(label + ': ' + v);
    });
    return first.concat(lines);
  };

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
      if (!form.hasAttribute('data-demo')) return;
      ev.preventDefault();

      var type = formType(form);
      var via = ev.submitter && ev.submitter.value === 'email' ? 'email' : 'whatsapp';
      var nameEl = form.querySelector('[name="name"]');
      var subject = TITLES[type] + (nameEl && nameEl.value.trim() ? ' - ' + nameEl.value.trim() : '');
      var text = ['Hi MOVEXA,', TITLES[type] + ' from the website:', ''].concat(formLines(form)).join('\n');

      // Short summary for the thank-you page
      var lead = { type: type, via: via, subject: subject, text: text };
      ['from', 'to', 'service', 'date', 'topic', 'branch'].forEach(function (k) {
        var el = form.querySelector('[name="' + k + '"]');
        if (el && !el.disabled && el.value.trim()) lead[k] = el.value.trim();
      });
      try { sessionStorage.setItem('mx_lead', JSON.stringify(lead)); } catch (e) { /* storage unavailable */ }
      form.querySelectorAll('[type="submit"]').forEach(function (b) { b.disabled = true; });

      if (via === 'email') {
        window.location.href = mailLink(subject, text);       // opens the email app
        setTimeout(function () { window.location.href = THANK_YOU_PAGE; }, 800);
      } else {
        window.open(waLink(text), '_blank', 'noopener');     // opens WhatsApp
        window.location.href = THANK_YOU_PAGE;
      }
    });
  });

  /* ---------- Thank-you page: wording for the form that was sent ---------- */
  var ty = document.getElementById('thankYou');
  if (ty) {
    var lead = null;
    try { lead = JSON.parse(sessionStorage.getItem('mx_lead') || 'null'); } catch (e) { lead = null; }
    if (lead) {
      var WHAT = { quote: 'quote request', callback: 'call back request', contact: 'message', feedback: 'feedback' };
      var BADGE = { quote: 'Quote request', callback: 'Call back request', contact: 'Your message', feedback: 'Your feedback' };
      var what = WHAT[lead.type] || WHAT.quote;
      var q = function (k) { return ty.querySelector('[data-ty="' + k + '"]'); };
      q('badge').textContent = (BADGE[lead.type] || BADGE.quote) + ' · Almost done';
      q('lead').textContent = lead.via === 'email'
        ? 'Your ' + what + ' is ready in your email app — just hit Send ✅ and our team will get back to you shortly. 📧'
        : 'Your ' + what + ' is ready in WhatsApp — just tap Send ✅ and our team will get back to you shortly. 📞';

      // Short summary of what they sent
      var items = [];
      if (lead.from && lead.to) items.push('📍 ' + lead.from + ' → ' + lead.to);
      else if (lead.from) items.push('📍 From ' + lead.from);
      if (lead.service) items.push('🚚 ' + lead.service);
      if (lead.date) items.push('📅 ' + fmtDate(lead.date));
      if (lead.topic) items.push('💬 ' + lead.topic);
      if (lead.branch) items.push('🏢 ' + lead.branch);
      var list = q('summary');
      if (items.length && list) {
        items.forEach(function (txt) { var li = document.createElement('li'); li.textContent = txt; list.appendChild(li); });
        list.hidden = false;
      }

      // The same message again, in case the app didn't open
      if (lead.text) {
        document.querySelectorAll('[data-ty="wa"]').forEach(function (a) { a.href = waLink(lead.text); });
        document.querySelectorAll('[data-ty="mail"]').forEach(function (a) { a.href = mailLink(lead.subject || 'Website enquiry', lead.text); });
        var retry = q('retry');
        if (retry) retry.hidden = false;
      }
    }
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
     It only opens when a visitor clicks a CTA (or visits page.html#get-quote);
     it no longer opens by itself on page load. */
  var modalEl = document.getElementById('quoteModal');
  if (modalEl && window.bootstrap) {
    var pForm = document.getElementById('popupQuote');
    var pTitle = document.getElementById('quoteModalTitle');
    var pSub = document.getElementById('quoteModalSub');
    var pEyebrow = document.getElementById('quoteModalEyebrow');
    var pSource = document.getElementById('pq-source');
    var page = (location.pathname.split('/').pop() || 'index.html');

    var MODES = {
      quote: {
        eyebrow: 'Free quote · No obligation',
        title: 'Get a free moving quote',
        sub: 'Fill in a few details and send them to us on WhatsApp or by email.'
      },
      callback: {
        eyebrow: 'Talk to our team',
        title: 'Request a call back',
        sub: 'Leave your number and send it on WhatsApp or by email — we’ll call you back.'
      }
    };

    var setVal = function (name, value) {
      var el = pForm.querySelector('[name="' + name + '"]');
      if (el && value && !el.value) el.value = value;
    };

    modalEl.addEventListener('show.bs.modal', function (ev) {
      var trigger = ev.relatedTarget;
      var mode = trigger ? (trigger.getAttribute('data-popup') || 'quote') : 'quote';
      var copy = MODES[mode] || MODES.quote;
      var isCallback = mode === 'callback';

      pEyebrow.textContent = copy.eyebrow;
      pTitle.textContent = trigger && trigger.getAttribute('data-popup-title') || copy.title;
      pSub.textContent = copy.sub;
      pForm.classList.toggle('is-callback', isCallback);
      pForm.querySelectorAll('.quote-only input, .quote-only select').forEach(function (el) { el.disabled = isCallback; });
      pForm.querySelectorAll('.callback-only textarea').forEach(function (el) { el.disabled = !isCallback; });

      // Which CTA opened the form (useful when you connect the form to email/CRM)
      pSource.value = (trigger ? trigger.textContent.replace(/\s+/g, ' ').trim() : 'Direct link') + ' | ' + page;

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
    });

    modalEl.addEventListener('shown.bs.modal', function () {
      var first = pForm.querySelector('input:not([type="hidden"]):not([disabled])');
      if (first && window.innerWidth >= 576) first.focus();
    });

    // Open directly with a link like page.html#get-quote
    if (location.hash === '#get-quote') {
      bootstrap.Modal.getOrCreateInstance(modalEl).show();
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
        vImg.src = img.getAttribute('data-full') || img.getAttribute('src');
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
    show(0);
  }
})();
