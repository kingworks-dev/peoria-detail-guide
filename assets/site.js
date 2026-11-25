(function () {
  "use strict";
  var d = document, w = window;
  var reduce = w.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = w.matchMedia && matchMedia("(hover:hover) and (pointer:fine)").matches;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || d).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  var top = d.getElementById("top"), hero = d.getElementById("hero");

  // phone menu: one full-screen sheet, closes on a link tap or Escape
  var mbtn = d.getElementById("mbtn"), mnav = d.getElementById("mnav");
  if (mbtn && mnav && top) {
    var label = mbtn.querySelector("span");
    mbtn.addEventListener("click", function () {
      var open = top.classList.toggle("open");
      mbtn.setAttribute("aria-expanded", open ? "true" : "false");
      if (label) label.textContent = open ? "Close" : "Menu";
      d.body.style.overflow = open ? "hidden" : "";
    });
    mnav.addEventListener("click", function (ev) {
      if (ev.target.closest("a") && top.classList.contains("open")) mbtn.click();
    });
    d.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && top.classList.contains("open")) mbtn.click();
    });
  }

  // headline: each word rises out of its own line mask once, on load
  $$(".split").forEach(function (h) {
    if (reduce) return;
    var words = h.textContent.trim().split(/\s+/);
    h.setAttribute("aria-label", h.textContent.trim());
    h.innerHTML = words.map(function (wd, i) {
      return '<span class="w" aria-hidden="true"><span style="--i:' + i + '">' + wd.replace(/[<&]/g, "") + "</span></span>";
    }).join(" ");
    requestAnimationFrame(function () { h.classList.add("go"); });
  });

  // reveals: things ease in as they arrive. Anything already on screen when a capture or a slow device is late
  // is revealed in place (only what is in view, never the whole page).
  var rises = $$(".rise, .wipe");
  function show(el) { el.classList.add("in"); }
  if (reduce || !("IntersectionObserver" in w)) {
    rises.forEach(show);
  } else {
    var io = new IntersectionObserver(function (es) {
      var n = 0;
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.style.transitionDelay = (n++ % 4) * 70 + "ms";
        show(en.target);
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    rises.forEach(function (r) { io.observe(r); });
    var inView = function () {
      var vh = w.innerHeight;
      rises.forEach(function (el) {
        if (el.classList.contains("in")) return;
        var r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) { el.style.transitionDelay = "0ms"; show(el); }
      });
    };
    setTimeout(inView, 1600);
    w.addEventListener("scroll", function () { clearTimeout(inView.t); inView.t = setTimeout(inView, 700); }, { passive: true });
  }

  // count-ups: a number settles to its printed value when it arrives (the printed value is the default)
  function countUp(el) {
    var end = parseInt(el.getAttribute("data-count"), 10);
    if (!end || end > 9999 || reduce) return;
    var t0 = 0, dur = 1100;
    var tick = function (t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      el.textContent = String(Math.round(end * (1 - Math.pow(1 - k, 4))));
      if (k < 1) requestAnimationFrame(tick); else el.textContent = String(end);
    };
    requestAnimationFrame(tick);
  }
  var counts = $$("[data-count]");
  if ("IntersectionObserver" in w) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { cio.unobserve(en.target); countUp(en.target); } });
    }, { threshold: 0.6 });
    counts.forEach(function (c) { cio.observe(c); });
  }

  // cursor: a soft light follows the pointer over the hero; buttons lean toward it
  if (fine && !reduce) {
    var glow = $(".hero-glow");
    if (hero && glow) {
      hero.addEventListener("mousemove", function (ev) {
        var r = hero.getBoundingClientRect();
        glow.style.setProperty("--mx", (ev.clientX - r.left) + "px");
        glow.style.setProperty("--my", (ev.clientY - r.top) + "px");
      });
    }
    $$(".btn, .act").forEach(function (b) {
      b.addEventListener("mousemove", function (ev) {
        var r = b.getBoundingClientRect();
        b.style.transform = "translate(" + ((ev.clientX - r.left - r.width / 2) * 0.12).toFixed(1) + "px," +
          ((ev.clientY - r.top - r.height / 2) * 0.22).toFixed(1) + "px)";
      });
      b.addEventListener("mouseleave", function () { b.style.transform = ""; });
    });
  }

  // town filter: chips narrow the list; a chapter with nobody left in it folds away
  var fbar = d.getElementById("filters"), fcount = d.getElementById("fcount");
  if (fbar) {
    var entries = $$(".entries > li.entry"), chaps = $$(".chap");
    fbar.addEventListener("click", function (ev) {
      var chip = ev.target.closest(".chip");
      if (!chip) return;
      $$(".chip", fbar).forEach(function (c) { c.classList.remove("on"); });
      chip.classList.add("on");
      var t = chip.getAttribute("data-town") || "", shown = 0;
      entries.forEach(function (r) {
        var hit = !t || (r.getAttribute("data-town") || "").indexOf(t) > -1;
        r.hidden = !hit;
        if (hit) { shown++; r.classList.add("in"); }
      });
      $$(".entries > li:not(.entry), .inter").forEach(function (li) { li.hidden = !!t; });
      chaps.forEach(function (c) { c.hidden = !$$(".entry:not([hidden])", c).length; });
      // kit-d4: a part header folds away with the last of its runs
      $$(".part-hd").forEach(function (h) {
        var pn = h.getAttribute("data-part");
        h.hidden = !$$('.chap[data-part="' + pn + '"]').some(function (c) { return !c.hidden; });
      });
      if (fcount) fcount.textContent = t ? shown + " of " + entries.length : "";
    });
  }

  // kit-d4: on desktop the long entry descriptions fold to three lines with a "Read more" (phones fold to four, below)
  if (w.matchMedia("(min-width:761px)").matches) {
    $$(".entry.lead .e-text, .entry.quote .e-text").forEach(function (box) {
      var p = $(".e-blurb", box);
      if (!p || p.textContent.length < 240) return;
      box.classList.add("clamp", "clamp-d");
      var b = d.createElement("button");
      b.type = "button"; b.className = "e-more e-more-d"; b.textContent = "Read more";
      b.setAttribute("aria-expanded", "false");
      b.addEventListener("click", function () {
        var open = box.classList.toggle("clamp");
        b.textContent = open ? "Read more" : "Show less";
        b.setAttribute("aria-expanded", open ? "false" : "true");
      });
      box.appendChild(b);
    });
  }
  // phone: long descriptions fold to four lines with a "Read more"
  if (w.matchMedia("(max-width:760px)").matches) {
    var fc = $(".feat-copy");
    if (fc && fc.textContent.length > 260) {
      fc.classList.add("clamp");
      var fb = d.createElement("button");
      fb.type = "button"; fb.className = "e-more e-more-feat"; fb.textContent = "Read more";
      fb.setAttribute("aria-expanded", "false");
      fb.addEventListener("click", function () {
        var open = fc.classList.toggle("clamp");
        fb.textContent = open ? "Read more" : "Show less";
        fb.setAttribute("aria-expanded", open ? "false" : "true");
      });
      fc.parentNode.insertBefore(fb, fc.nextSibling);
    }
    $$(".e-text").forEach(function (box) {
      var p = $(".e-blurb", box);
      if (!p || p.textContent.length < 220) return;
      box.classList.add("clamp");
      var b = d.createElement("button");
      b.type = "button"; b.className = "e-more"; b.textContent = "Read more";
      b.setAttribute("aria-expanded", "false");
      b.addEventListener("click", function () {
        var open = box.classList.toggle("clamp");
        b.textContent = open ? "Read more" : "Show less";
        b.setAttribute("aria-expanded", open ? "false" : "true");
      });
      box.appendChild(b);
    });
  }

  // section index: smooth anchors and a highlight for the chapter being read
  var idxLinks = $$(".idx-a");
  idxLinks.forEach(function (a) {
    a.addEventListener("click", function (ev) {
      var t = d.getElementById("tier-" + a.getAttribute("data-tier"));
      if (!t) return;
      ev.preventDefault();
      t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  });

  // ---- scroll-linked: one rAF loop for everything that follows the scroll position ----
  var sprog = $(".sprog"), art = $(".hero-art"), heroIn = $(".hero-in");
  var chapEls = $$(".chap").map(function (c) {
    return { el: c, photo: $(".st-photo", c), imgs: $$(".st-img", c), cards: $$(".st-card", c), ticks: $$(".st-ticks li", c),
      num: $(".st-count b", c), items: $$(".entry", c), cur: "" };
  });
  var deskMQ = w.matchMedia("(min-width:1000px)");
  // the pinned stage: light the frame of the entry being read (state, not motion: it runs with reduced motion too)
  function stage() {
    if (!deskMQ.matches) return;
    var vh = w.innerHeight;
    chapEls.forEach(function (c) {
      if (!c.photo) return;
      var cr = c.el.getBoundingClientRect();
      c.photo.style.setProperty("--rp", clamp((vh * 0.5 - cr.top) / Math.max(1, cr.height - vh * 0.4), 0, 1).toFixed(3));
      // the entry being read: the last one whose top has crossed the reading line (the middle of the screen); a chapter
      // not reached yet shows its first entry, one already passed its last
      var cur = null, line = vh * 0.5;
      c.items.forEach(function (it) {
        if (it.hidden) return;
        if (!cur || it.getBoundingClientRect().top < line) cur = it;
      });
      var v = cur ? cur.getAttribute("data-rank") : "";
      if (!v || v === c.cur) return;
      c.cur = v;
      var on = function (el) { el.classList.toggle("on", el.getAttribute("data-rank") === v); };
      // kit-d4: the frame that was showing stays under the new one while the new one wipes in
      c.imgs.forEach(function (el) {
        el.classList.toggle("prev", el.classList.contains("on") && el.getAttribute("data-rank") !== v);
      });
      c.imgs.forEach(on); c.cards.forEach(on);
      c.ticks.forEach(function (t) {
        var r = t.getAttribute("data-rank");
        t.classList.toggle("on", r === v); t.classList.toggle("past", r < v);
      });
      if (c.num) {
        c.num.textContent = v;
        c.num.classList.remove("roll");
        c.num.getBoundingClientRect();
        c.num.classList.add("roll");
      }
    });
  }
  var mList = $(".m-list"), mItems = $$(".m-item"), mNum = d.getElementById("mnum"), mSec = d.getElementById("method");
  var mVis = $$(".m-v"), mTicks = $$("#mticks li"), mOn = 0;
  var mbar = d.getElementById("mbar"), cta = d.getElementById("herocta");
  var drift = $$(".band-row .wide img");

  function frame() {
    var y = w.scrollY || 0, vh = w.innerHeight;
    if (top && hero) top.classList.toggle("solid", y > hero.offsetHeight - 100);
    if (sprog) {
      var h = d.documentElement.scrollHeight - vh;
      sprog.style.transform = "scaleX(" + (h > 0 ? clamp(y / h, 0, 1) : 0).toFixed(4) + ")";
    }
    if (mbar && cta) {
      var cr = cta.getBoundingClientRect();
      var past = cr.bottom < 0;
      var nearEnd = d.documentElement.scrollHeight - (y + vh) < 260;
      mbar.classList.toggle("on", past && !nearEnd);
    }
    stage();
    if (reduce) return;
    if (art && hero && y < hero.offsetHeight * 1.2) {
      art.style.transform = "translate3d(0," + (y * 0.22).toFixed(1) + "px,0)";
      if (heroIn) {
        heroIn.style.transform = "translate3d(0," + (y * -0.08).toFixed(1) + "px,0)";
        heroIn.style.opacity = String(clamp(1 - y / (hero.offsetHeight * 0.85), 0, 1).toFixed(3));
      }
    }
    // method: progress through the criteria, the active one lit
    if (mList && mItems.length && mSec) {
      var mr = mList.getBoundingClientRect();
      var k = clamp((vh * 0.6 - mr.top) / Math.max(1, mr.height), 0, 1);
      mSec.style.setProperty("--k", k.toFixed(3));
      var on = 0;
      mItems.forEach(function (li, i) { if (li.getBoundingClientRect().top < vh * 0.62) on = i; });
      mItems.forEach(function (li, i) { li.classList.toggle("on", i === on && mr.top < vh * 0.62); });
      if (mNum) mNum.textContent = (on + 1 < 10 ? "0" : "") + (on + 1);
      if (on !== mOn) {
        mOn = on;
        mVis.forEach(function (v, i) { v.classList.toggle("on", i === on); });
        mTicks.forEach(function (v, i) { v.classList.toggle("on", i === on); });
      }
      var bar = $(".m-prog i");
      if (bar) bar.style.setProperty("--k", k.toFixed(3));
    }
    // photographs inside the list drift a little slower than the text
    drift.forEach(function (im) {
      var r = im.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var p = (r.top + r.height / 2 - vh / 2) / vh;
      im.style.transform = "translate3d(0," + (p * -28).toFixed(1) + "px,0) scale(1.1)";
    });
  }
  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; frame(); });
  }
  w.addEventListener("scroll", onScroll, { passive: true });
  w.addEventListener("resize", onScroll);
  frame();

  // the town ticker only runs while it is on screen
  var track = $(".ticker ul");
  if (track) {
    track.innerHTML += track.innerHTML;
    if ("IntersectionObserver" in w) {
      new IntersectionObserver(function (es) {
        track.style.animationPlayState = es[0].isIntersecting ? "running" : "paused";
      }).observe(track);
    }
  }

  // lead form: same-origin JSON to the shared kingaisites backend
  var form = d.getElementById("sform");
  if (form) {
    var done = d.getElementById("sdone"), err = d.getElementById("serr"), btn = form.querySelector("button");
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      err.textContent = "";
      var fd = new FormData(form), body = { slug: form.getAttribute("data-slug") };
      fd.forEach(function (v, k) { body[k] = String(v).trim(); });
      btn.disabled = true;
      btn.textContent = "Sending…";
      fetch("https://kingaisites.com/api/lead", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok || !res.j.ok) throw new Error(res.j.error || "Something went wrong.");
          form.hidden = true;
          done.classList.add("on");
          done.setAttribute("tabindex", "-1");
          done.focus();
        })
        .catch(function (e) {
          err.textContent = e.message + " You can also write to hello@kingaisites.com.";
          btn.disabled = false;
          btn.textContent = btn.getAttribute("data-label");
        });
    });
  }

  // the printed year follows the calendar
  var yr = d.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();
})();
