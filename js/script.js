// script.js
/* global bootstrap, $ */
let isDark = false
$(document).ready(function () {
  console.log("jQuery is ready!");

  
  /* ---------- theme - Day / Night (localStorage) ---------- */
  const THEME_KEY = 'site-theme';

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark');
      document.body.style.backgroundColor = "#0d0d0d";
      $('[id^=theme-toggle]').attr('aria-pressed', 'true').text('☀️');
    } else {
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = "#fff";
      $('[id^=theme-toggle]').attr('aria-pressed', 'false').text('🌙');
    }
  }

  function loadTheme() {
    let theme = localStorage.getItem(THEME_KEY);
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    applyTheme(theme);
  }

  loadTheme();

  $(document).on('click', '#theme-toggle', function () {
    const currentTheme = document.body.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    localStorage.setItem(THEME_KEY, newTheme);
    applyTheme(newTheme);

    if (typeof showToast === 'function') {
      showToast(`${newTheme === 'dark' ? 'Night' : 'Day'} mode enabled`, 1200);
    }
  });

  /* ---------- ensure modals never leave backdrop or block scroll ---------- */
  // On any modal hidden event - remove stray backdrops and restore body
  $(document).on('hidden.bs.modal', '.modal', function () {
    // Remove any leftover backdrops
    $('.modal-backdrop').remove();
    // Ensure body classes and styles are cleaned up
    $('body').removeClass('modal-open');
    $('body').css('padding-right', '');
    // re-enable touch moves if previously blocked
    $(document).off('touchmove.modalblock');
  });

  // Extra safety: in case a backdrop remains at any point, allow escape via click on backdrop
  $(document).on('click', '.modal-backdrop', function () {
    // try to hide any open modal
    $('.modal.show').each(function () {
      try {
        var inst = bootstrap.Modal.getInstance(this);
        if (inst) inst.hide();
      } catch (e) {}
    });
    $('.modal-backdrop').remove();
    $('body').removeClass('modal-open').css('padding-right', '');
  });

  /* ---------- datetime display ---------- */
  function updateDateTime() {
    var el = $('#datetime');
    if (!el.length) return;
    var now = new Date();
    var s = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0');
    el.text(s);
  }
  updateDateTime();
  setInterval(updateDateTime, 60 * 1000);

  /* ---------- scroll progress ---------- */
  var $progress = $("#scroll-progress");
  if (!$progress.length) { $("body").prepend('<div id="scroll-progress"></div>'); $progress = $("#scroll-progress"); }
  $(window).on("scroll resize", function() {
    var docHeight = $(document).height() - $(window).height();
    var scrollTop = $(window).scrollTop();
    var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    $progress.css("width", pct + "%");
  });

  /* ---------- Search + other UI (kept) ---------- */
  function buildSearchList() {
    var items = [];
    $('.place').each(function () {
      var $this = $(this);
      var title = $.trim($this.find('h2').first().text() || $this.text());
      if (title) items.push({ text: title, el: $this });
    });
    if (!items.length) {
      $('.card h2, .card-title').each(function () {
        var t = $.trim($(this).text());
        if (t) items.push({ text: t, el: $(this).closest('.place') });
      });
    }
    return items;
  }
  var searchItems = buildSearchList();

  function renderSuggestions(q) {
    var $s = $('#suggestions');
    if (!$s.length) return;
    $s.empty();
    if (!q) { $s.hide(); return; }
    var qLower = q.toLowerCase();
    var matches = searchItems.filter(function (it) {
      return it.text.toLowerCase().indexOf(qLower) !== -1;
    }).slice(0, 10);
    if (!matches.length) { $s.hide(); return; }
    matches.forEach(function (m, idx) {
      var li = $('<div role="option" tabindex="-1" class="list-group-item"></div>');
      var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      var html = m.text.replace(re, '<span class="search-highlight">$1</span>');
      li.html(html);
      li.data('targetEl', m.el);
      li.attr('id','suggestion-'+idx);
      $s.append(li);
    });
    $s.show();
    $s.data('active-index', -1);
  }

  function applyLiveFilter(q) {
    if (typeof q === 'undefined' || q === null) q = $('#search-input').val() || '';
    q = q.trim().toLowerCase();
    $('p, h1, h2, h3, h4, h5, .card-title, .card-text').each(function(){
      $(this).html($(this).text());
    });
    if (!q) {
      $('.place').show();
      $('#suggestions').hide();
      return;
    }
    $('.place').each(function () {
      var txt = $(this).text().toLowerCase();
      if (txt.indexOf(q) === -1) $(this).hide(); else $(this).show();
    });
    var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    $('p, h1, h2, h3, h4, h5, .card-title, .card-text').each(function () {
      var html = $(this).html();
      if (html.toLowerCase().indexOf(q) !== -1) {
        $(this).html(html.replace(re, '<span class="search-highlight">$1</span>'));
      }
    });
  }

  $('#search-input').on('input', function () {
    var q = $(this).val();
    renderSuggestions(q);
    applyLiveFilter(q);
  });

  $('#suggestions').on('click', '.list-group-item', function () {
    var txt = $(this).text();
    $('#search-input').val(txt).trigger('input').focus();
    var targetEl = $(this).data('targetEl');
    if (targetEl && targetEl.length) {
      $('html,body').animate({ scrollTop: targetEl.offset().top - 80 }, 360);
      $('#suggestions').hide();
    }
  });

  $('#search-input').on('keydown', function (e) {
    var $s = $('#suggestions');
    if ($s.is(':hidden')) return;
    var active = $s.data('active-index') || -1;
    var items = $s.find('.list-group-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      active = Math.min(active + 1, items.length - 1);
      items.removeClass('active');
      $(items.get(active)).addClass('active').focus();
      $s.data('active-index', active);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      active = Math.max(active - 1, 0);
      items.removeClass('active');
      $(items.get(active)).addClass('active').focus();
      $s.data('active-index', active);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && items.length) {
        $(items.get(active)).trigger('click');
      }
    } else if (e.key === 'Escape') {
      $s.hide();
    }
  });

  $('#search-input').on('blur', function () {
    setTimeout(function () { $('#suggestions').hide(); }, 180);
  });

  /* ---------- Animated counters ---------- */
  function animateCounters() {
    $('.counter').each(function () {
      var $this = $(this);
      var target = parseInt($this.attr('data-target') || $this.text() || 0, 10);
      $({ count: parseInt($this.text(), 10) || 0 }).animate({ count: target }, {
        duration: 1500,
        easing: 'swing',
        step: function (now) { $this.text(Math.floor(now)); },
        complete: function () { $this.text(target); }
      });
    });
  }
  function onScrollCheckCounters() {
    $('.counter').each(function () {
      var $el = $(this);
      if ($el.data('count-animated')) return;
      var top = $el.offset().top;
      var winBottom = $(window).scrollTop() + $(window).height();
      if (winBottom > top + 20) {
        $el.data('count-animated', true);
        setTimeout(animateCounters, 120);
      }
    });
  }
  $(window).on('scroll resize', onScrollCheckCounters);
  onScrollCheckCounters();

  /* ---------- Lazy-load images ---------- */
  function lazyLoadImages() {
    $('img[data-src]').not('.lazy-loaded').each(function () {
      var img = this;
      if ('IntersectionObserver' in window) {
        // handled by global IO below
      } else {
        var $i = $(img);
        var src = $i.attr('data-src');
        if (src) { $i.attr('src', src).addClass('lazy-loaded').removeClass('placeholder').removeAttr('data-src'); }
      }
    });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var img = entry.target;
          var $img = $(img);
          var src = $img.attr('data-src');
          if (src) {
            $img.attr('src', src).addClass('lazy-loaded').removeClass('placeholder');
            $img.removeAttr('data-src');
          }
          obs.unobserve(img);
        }
      });
    }, { rootMargin: '120px 0px' });
    $('img[data-src]').each(function () { io.observe(this); });
  } else {
    lazyLoadImages();
  }
  $(window).on('load scroll resize', lazyLoadImages);

  /* ---------- Copy to clipboard ---------- */
  $(document).on('click', '.copy-btn', function () {
    var $btn = $(this);
    var selector = $btn.data('copy');
    if (!selector) { showToast('Nothing to copy'); return; }
    var $target = $(selector);
    if ($target.length === 0) { showToast('Target not found'); return; }
    var text = $target.text() || $target.val() || '';
    if (!navigator.clipboard) {
      var $tmp = $('<textarea>').val(text).appendTo('body').select();
      try { document.execCommand('copy'); showToast('Copied'); } catch (err) { showToast('Copy failed'); }
      $tmp.remove();
    } else {
      navigator.clipboard.writeText(text).then(function () {
        var prev = $btn.text();
        $btn.text('✓ Copied');
        setTimeout(function () { $btn.text(prev); }, 1200);
        showToast('Copied to clipboard');
      }).catch(function () { showToast('Copy failed'); });
    }
  });

  /* ---------- Toasts ---------- */
  function showToast(msg, timeout) {
    timeout = timeout || 2200;
    var $cont = $('#toast-container');
    if (!$cont.length) {
      $cont = $('<div id="toast-container" aria-live="polite" aria-atomic="true"></div>').appendTo('body');
    }
    var $t = $('<div class="toast-item" role="status"></div>').text(msg).appendTo($cont);
    $t.hide().fadeIn(200);
    setTimeout(function () { $t.fadeOut(200, function () { $t.remove(); }); }, timeout);
  }

  /* ---------- Contact form handling + validation ---------- */
  $(document).on('submit', '#contact-form', function (e) {
    e.preventDefault();
    var $form = $(this);
    var formEl = $form[0];
    if (!formEl.checkValidity()) {
      $form.addClass('was-validated');
      showToast('Please correct errors in the form', 1600);
      return;
    }
    var $btn = $form.find('button[type="submit"], .submit-btn').first();
    if (!$btn.length) { showToast('Form submitted'); return; }
    var originalHtml = $btn.html();
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...');
    setTimeout(function () {
      $btn.prop('disabled', false).html(originalHtml);
      $form[0].reset();
      $form.removeClass('was-validated');
      showToast('Message sent');
    }, 1200);
  });

  /* ---------- Subscribe modal open (use single instance) ---------- */
  $(document).on('click', '#open-popup, #open-popup-hero', function () {
    var modalEl = document.getElementById('subscribeModal');
    if (!modalEl) return;
    // Use single instance
    var inst = bootstrap.Modal.getInstance(modalEl);
    if (!inst) inst = new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true });
    inst.show();
  });

  /* ---------- Subscribe form submit: robust hide + cleanup ---------- */
  $(document).on('submit', '#subscribe-form', function (e) {
    e.preventDefault();
    var $form = $(this);
    var formEl = $form[0];
    if (!formEl.checkValidity()) {
      $form.addClass('was-validated');
      showToast('Please enter a valid email', 1400);
      return;
    }
    var email = $form.find('input[name="email"]').val();
    var $submit = $form.find('button[type="submit"]').first();
    var original = $submit.html();
    $submit.prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Subscribing...');
    // simulate submission
    setTimeout(function () {
      $submit.prop('disabled', false).html(original);
      // Hide modal robustly
      var modalEl = document.getElementById('subscribeModal');
      if (modalEl) {
        try {
          var modalInst = bootstrap.Modal.getInstance(modalEl);
          if (!modalInst) {
            modalInst = new bootstrap.Modal(modalEl);
          }
          modalInst.hide();
        } catch (err) {
          // fallback: remove show class and backdrop
          $(modalEl).removeClass('show').attr('aria-hidden','true').css('display','none');
          $('.modal-backdrop').remove();
          $('body').removeClass('modal-open').css('padding-right','');
        }
      }
      // ensure cleanup of any stray backdrop and body state
      setTimeout(function () {
        $('.modal-backdrop').remove();
        $('body').removeClass('modal-open').css('padding-right','');
        $(document).off('touchmove.modalblock');
      }, 120);
      // reset form
      $form[0].reset();
      $form.removeClass('was-validated');
      showToast('Subscribed: ' + email, 1600);
    }, 900);
  });

  /* ---------- safety: ensure modals closed on page navigation or errors ---------- */
  $(window).on('beforeunload', function () {
    $('.modal.show').each(function () {
      try { var inst = bootstrap.Modal.getInstance(this); if (inst) inst.hide(); } catch (e) {}
    });
    $('.modal-backdrop').remove();
    $('body').removeClass('modal-open').css('padding-right','');
  });

  /* ---------- Misc small setup ---------- */
  function refreshSearchList() { searchItems = buildSearchList(); }
  $('section.gallery img').each(function () {
    var $img = $(this);
    if (!$img.attr('data-src')) {
      var s = $img.attr('src') || '';
      if (s) {
        $img.attr('data-src', s);
        $img.attr('src', 'images/placeholder-small.jpg');
        $img.addClass('placeholder');
      }
    }
  });
  if (typeof io !== 'undefined') {
    $('img[data-src]').each(function () { try { io.observe(this); } catch(e){} });
  } else {
    lazyLoadImages();
  }

  const travelQuotes = [
    "Travel is the only thing you buy that makes you richer.",
    "Adventure is worthwhile.",
    "The world is a book, and those who do not travel read only one page.",
    "Jobs fill your pocket, but adventures fill your soul."
  ];
  function showRandomQuote() {
    const quote = travelQuotes[Math.floor(Math.random() * travelQuotes.length)];
    var el = document.getElementById('random-quote');
    if (el) el.textContent = quote;
  }
  window.addEventListener('load', showRandomQuote);

  /* ---------- User Auth: Sign Up / Log In / Profile ---------- */
  // Simple localStorage-based demo
  function getUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]');
  }
  function saveUser(user) {
    var users = getUsers();
    users.push(user);
    localStorage.setItem('users', JSON.stringify(users));
  }
  function findUser(email) {
    var users = getUsers();
    return users.find(u => u.email === email);
  }
  function setCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }
  function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser') || 'null');
  }
  function logoutUser() {
    localStorage.removeItem('currentUser');
    location.href = 'index.html';
  }

  // Inject auth modals if not present
  if (!$('#authModal').length) {
    $('body').append(`
      <div class="modal fade" id="authModal" tabindex="-1" aria-labelledby="authModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-sm modal-dialog-centered">
          <div class="modal-content">
            <form id="auth-form" class="needs-validation" novalidate>
              <div class="modal-header">
                <h5 class="modal-title" id="authModalLabel">Sign Up / Log In</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <label for="auth-email" class="form-label">Email</label>
                <input id="auth-email" name="email" type="email" class="form-control" placeholder="you@example.com" required aria-required="true" />
                <div class="invalid-feedback">Enter a valid email.</div>
                <label for="auth-password" class="form-label mt-2">Password</label>
                <input id="auth-password" name="password" type="password" class="form-control" placeholder="Password" required aria-required="true" minlength="6" />
                <div class="invalid-feedback">Password must be at least 6 characters, include a number and a letter.</div>
                <label for="auth-name" class="form-label mt-2">Name</label>
                <input id="auth-name" name="name" type="text" class="form-control" placeholder="Your name" required aria-required="true" />
                <div class="invalid-feedback">Enter your name.</div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
                <button class="btn btn-primary" type="submit">Sign Up / Log In</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
  }

  // Show auth modal on button click
  $(document).on('click', '#auth-btn', function () {
    var modalEl = document.getElementById('authModal');
    if (!modalEl) return;
    var inst = bootstrap.Modal.getInstance(modalEl);
    if (!inst) inst = new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true });
    inst.show();
  });

  // Auth form submit
  $(document).on('submit', '#auth-form', function (e) {
    e.preventDefault();
    var $form = $(this);
    var email = $form.find('[name="email"]').val().trim();
    var password = $form.find('[name="password"]').val();
    var name = $form.find('[name="name"]').val().trim();
    var validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    var validPassword = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password);
    if (!validEmail || !validPassword || !name) {
      $form.addClass('was-validated');
      showToast('Check your inputs', 1600);
      return;
    }
    var user = findUser(email);
    if (!user) {
      user = { email, password, name };
      saveUser(user);
      setCurrentUser(user);
      showToast('Account created & logged in');
    } else if (user.password === password) {
      setCurrentUser(user);
      showToast('Logged in');
    } else {
      showToast('Wrong password', 1600);
      return;
    }
    bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
    setTimeout(function () { location.href = 'profile.html'; }, 600);
  });

  // Inject profile page if needed
  if (location.pathname.endsWith('profile.html')) {
    var user = getCurrentUser();
    if (!user) {
      location.href = 'index.html';
      return;
    }
    $('body').html(`
      <nav class="navbar navbar-expand-lg navbar-dark bg-primary sticky-top">
        <div class="container">
          <a class="navbar-brand fw-bold" href="index.html">TravelLite</a>
          <button id="logout-btn" class="btn btn-sm btn-outline-light ms-auto">Logout</button>
        </div>
      </nav>
      <main class="container site-layout">
        <section class="main-content">
          <h1 class="page-title">Profile</h1>
          <div class="card p-4 mb-4">
            <p><strong>Name:</strong> ${user.name}</p>
            <p><strong>Email:</strong> ${user.email}</p>
          </div>
        </section>
      </main>
      <footer class="site-footer">
        <p>Team: Mukhammedali Khassenov, Shakarim Ainatayev, Kuanysh Seitzhan</p>
      </footer>
    `);
    $(document).on('click', '#logout-btn', function () {
      logoutUser();
    });
  }

  /* ---------- Form Validation: phone, email, password ---------- */
  $(document).on('submit', 'form', function (e) {
    var $form = $(this);
    var valid = true;
    $form.find('input,textarea').each(function () {
      var $el = $(this);
      var val = $el.val();
      if ($el.attr('required') && !val) valid = false;
      if ($el.attr('type') === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) valid = false;
      if ($el.attr('type') === 'password' && val && !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(val)) valid = false;
      if ($el.attr('type') === 'tel' && val && !/^\+?\d{10,}$/.test(val)) valid = false;
    });
    if (!valid) {
      $form.addClass('was-validated');
      showToast('Please correct errors in the form', 1600);
      e.preventDefault();
      return false;
    }
  });

  /* ---------- Search & Filtration: store results in localStorage ---------- */
  $('#search-input').on('input', function () {
    var q = $(this).val();
    renderSuggestions(q);
    applyLiveFilter(q);
    localStorage.setItem('lastSearch', q);
  });
  // On page load, restore last search
  if (localStorage.getItem('lastSearch')) {
    $('#search-input').val(localStorage.getItem('lastSearch')).trigger('input');
  }

  /* ---------- External API Integration: Example - Random Joke ---------- */
  function loadJoke() {
    $.get('https://api.chucknorris.io/jokes/random', function (data) {
      $('#random-quote').text(data.value);
    });
  }
  // Replace travel quote with API joke for demo
  window.addEventListener('load', loadJoke);
});
