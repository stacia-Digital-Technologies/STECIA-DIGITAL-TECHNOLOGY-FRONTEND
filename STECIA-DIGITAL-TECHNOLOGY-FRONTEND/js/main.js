(function () {
  'use strict';

  /* Light / dark theme (the saved choice is applied early by theme.js) */
  var root = document.documentElement;
  var themeBtn = document.querySelector('.theme-toggle');
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    if (themeBtn) {
      var label = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      themeBtn.setAttribute('aria-label', label);
      themeBtn.setAttribute('title', label);
    }
  }
  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('stecia-theme', next); } catch (e) { /* storage unavailable */ }
    });
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    var saved = null;
    try { saved = localStorage.getItem('stecia-theme'); } catch (err) { /* ignore */ }
    if (!saved) applyTheme(e.matches ? 'dark' : 'light');
  });

  /* Mobile navigation */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 861px)').addEventListener('change', function () { setOpen(false); });
  }

  /* Gentle reveal as sections scroll into view */
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('js');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.hero__grid > *, .section__head, .card, .steps li, .client-list li, .values li, .details div, .form, .cta__inner').forEach(function (el) {
      el.setAttribute('data-reveal', '');
      io.observe(el);
    });
  }

  /* Floating header state + hero scroll animation */
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var heroEl = document.querySelector('.hero'), hdr = document.querySelector('.site-header'), h1 = document.querySelector('.hero h1'), ticking = false;
  if (h1 && !reduced) {
    var words = h1.textContent.trim().split(/\s+/);
    h1.setAttribute('aria-label', words.join(' '));
    h1.innerHTML = words.map(function (w, i) { return '<span class="hw" aria-hidden="true"><span style="--i:' + i + '">' + w + '</span></span>'; }).join(' ');
  }
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    if (hdr) hdr.classList.toggle('is-scrolled', y > 24);
    if (heroEl && !reduced && heroEl.offsetHeight) heroEl.style.setProperty('--p', Math.min(1, Math.max(0, y / heroEl.offsetHeight)).toFixed(3));
  }
  /* Background logo: scroll sets a target, the logo eases toward it every frame (smooth, no jumps) */
  var logoEl = document.querySelector('.logo-bg'), cur = null, tgt = null, lraf = 0;
  function logoTargets() {
    var d = document.documentElement, vh = window.innerHeight, y = window.scrollY;
    var max = Math.max(1, d.scrollHeight - vh), p = Math.min(1, Math.max(0, y / max));
    var hh = heroEl && heroEl.offsetHeight ? heroEl.offsetHeight : vh;
    return {
      lx: Math.sin(p * Math.PI * 2) * 18,
      ly: (p - 0.5) * 26,
      lr: p * 540,
      ls: 1 + 0.4 * Math.sin(p * Math.PI),
      lf: Math.min(1, y / (vh * 0.6)),
      hp: Math.min(1, y / hh)
    };
  }
  function logoFrame() {
    lraf = 0;
    var moving = false, s = document.documentElement.style;
    for (var k in tgt) {
      var diff = tgt[k] - cur[k];
      if (Math.abs(diff) > 0.0005) { cur[k] += diff * 0.08; moving = true; } else { cur[k] = tgt[k]; }
      s.setProperty('--' + k, cur[k].toFixed(4));
    }
    if (moving) lraf = requestAnimationFrame(logoFrame);
  }
  function logoScroll() {
    if (!logoEl || reduced) return;
    tgt = logoTargets();
    if (!cur) { cur = {}; for (var k in tgt) cur[k] = tgt[k]; }
    if (!lraf) lraf = requestAnimationFrame(logoFrame);
  }
  logoScroll();
  window.addEventListener('scroll', logoScroll, { passive: true });
  window.addEventListener('resize', logoScroll);
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* Services band video: fall back to the file next to the page, pause for reduced motion or when off screen */
  var bv = document.querySelector('.band__video');
  if (bv) {
    var srcEl = bv.querySelector('source');
    if (srcEl) srcEl.addEventListener('error', function () { bv.src = 'earth.mp4'; bv.load(); bv.play().catch(function () {}); });
    if (reduced) { bv.pause(); bv.removeAttribute('autoplay'); }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { bv.play().catch(function () {}); } else { bv.pause(); } }); }, { threshold: 0.05 }).observe(bv);
    }
  }

  /* Contact form: validate, then open the visitor's email app with the enquiry prefilled */
  var form = document.getElementById('enquiry-form');
  if (!form) return;

  var ENQUIRY_ENDPOINT = 'https://formsubmit.co/ajax/info@steciadigtech.com'; /* enquiries are delivered to this inbox */
  var status = document.getElementById('form-status');
  var rules = {
    name: function (v) { return v.trim().length >= 2 || 'Enter your full name.'; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Enter a valid email address, such as name@example.com.'; },
    phone: function (v) { return v.trim() === '' || /^\+?[0-9\s()-]{7,18}$/.test(v.trim()) || 'Enter a valid phone number, such as +260 97 000 0000.'; },
    service: function (v) { return v !== '' || 'Select the service you need.'; },
    message: function (v) { return v.trim().length >= 10 || 'Describe your project in at least 10 characters.'; }
  };

  function check(field) {
    var input = form.elements[field];
    var wrap = input.closest('.field');
    var result = rules[field](input.value);
    var error = wrap.querySelector('.field__error');
    wrap.classList.toggle('has-error', result !== true);
    input.setAttribute('aria-invalid', String(result !== true));
    error.textContent = result === true ? '' : result;
    return result === true;
  }

  Object.keys(rules).forEach(function (f) {
    form.elements[f].addEventListener('blur', function () { check(f); });
    form.elements[f].addEventListener('input', function () {
      if (form.elements[f].closest('.field').classList.contains('has-error')) check(f);
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var firstInvalid = null;
    Object.keys(rules).forEach(function (f) {
      if (!check(f) && !firstInvalid) firstInvalid = form.elements[f];
    });
    if (firstInvalid) { firstInvalid.focus(); return; }

    var v = function (n) { return form.elements[n].value.trim(); };
    var btn = form.querySelector('button[type="submit"]'), label = btn.textContent;
    var summary = 'Name: ' + v('name') + '\nEmail: ' + v('email') + (v('phone') ? '\nPhone: ' + v('phone') : '') + '\nService: ' + v('service') + '\n\n' + v('message');
    function say(text, links) {
      status.hidden = false; status.textContent = text;
      (links || []).forEach(function (l) {
        status.appendChild(document.createElement('br'));
        var a = document.createElement('a'); a.href = l.href; a.textContent = l.text; a.rel = 'noopener';
        if (l.blank) a.target = '_blank';
        if (l.btn) a.className = 'btn btn--primary btn--sm';
        status.appendChild(a);
      });
    }
    if (form.elements._honey && form.elements._honey.value) return;
    btn.disabled = true; btn.textContent = 'Sending\u2026';
    say('Sending your enquiry\u2026');
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    fetch(ENQUIRY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ name: v('name'), email: v('email'), phone: v('phone'), service: v('service'), message: v('message'),
        _subject: 'Website enquiry: ' + v('service'), _replyto: v('email'), _template: 'table', _captcha: 'false' }),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        if (j && (j.success === true || j.success === 'true')) {
          say('Thank you, ' + v('name').split(' ')[0] + '. Your enquiry has been sent. Our team will reply by email or phone shortly.');
          form.reset();
        } else { throw new Error('not accepted'); }
      })
      .catch(function () {
        say('We could not send your enquiry from this page right now. You can send the same details on WhatsApp, or call us on 0573 991 995.', [
          { href: 'https://wa.me/260573991995?text=' + encodeURIComponent('Hello STECIA, I would like to make an enquiry.\n\n' + summary), text: 'Send on WhatsApp', btn: true, blank: true },
          { href: 'tel:+260573991995', text: 'Call 0573 991 995' }
        ]);
      })
      .then(function () { clearTimeout(timer); btn.disabled = false; btn.textContent = label; });
  });
})();


(function(){
  var names=['home','services','about','contact'];
  function visible(){return names.some(function(v){return !document.getElementById('view-'+v).hidden;});}
  function show(){
    var n=location.hash.slice(1)||'home';
    if(names.indexOf(n)<0){ if(visible())return; n='home'; }
    names.forEach(function(v){document.getElementById('view-'+v).hidden=(v!==n);});
    document.querySelectorAll('.nav__link').forEach(function(a){
      if(a.getAttribute('href')==='#'+n)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    document.title={home:'STECIA Digital Technologies | ICT Solutions in Zambia',services:'Products & Services | STECIA Digital Technologies',about:'About Us | STECIA Digital Technologies',contact:'Contact Us | STECIA Digital Technologies'}[n];
    window.scrollTo(0,0);
    var nav=document.getElementById('site-nav'),tg=document.querySelector('.nav-toggle');
    if(nav&&nav.classList.contains('is-open')){nav.classList.remove('is-open');tg.setAttribute('aria-expanded','false');tg.setAttribute('aria-label','Open menu');}
  }
  window.addEventListener('hashchange',show);show();
})();
