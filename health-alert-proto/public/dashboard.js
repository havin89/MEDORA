(function () {
  function initDashboardTabs() {
    const tabBar = document.querySelector('.swipe-button');
    const paneContainer = document.querySelector('.dashboard-panes');
    if (!tabBar || !paneContainer) return; // not a dashboard page

    const tabs = Array.from(tabBar.querySelectorAll('button[role="tab"]'));
    const panes = Array.from(paneContainer.querySelectorAll('.dashboard-pane'));

    function activate(index) {
      if (index < 0 || index >= tabs.length) return;
      tabs.forEach((btn) => btn.classList.remove('active'));
      panes.forEach((p) => p.classList.remove('is-active'));
      const tab = tabs[index];
      const targetSel = tab.getAttribute('data-target');
      const target = targetSel ? document.querySelector(targetSel) : null;
      tab.classList.add('active');
      if (target) target.classList.add('is-active');
      // Scroll selected tab into view horizontally
      if (typeof tab.scrollIntoView === 'function') {
        tab.scrollIntoView({ inline: 'center', block: 'nearest' });
      }
      currentIndex = index;
    }

    // Determine initial index from existing active tab or first
    let currentIndex = Math.max(0, tabs.findIndex((t) => t.classList.contains('active')));
    if (currentIndex === -1) currentIndex = 0;
    activate(currentIndex);

    // Click handling
    tabs.forEach((btn, idx) => {
      btn.addEventListener('click', () => activate(idx));
    });

    // Swipe handling on the pane container
    let startX = 0;
    let startY = 0;
    let isTouching = false;

    function onTouchStart(e) {
      const t = e.touches && e.touches[0];
      if (!t) return;
      isTouching = true;
      startX = t.clientX;
      startY = t.clientY;
    }

    function onTouchMove(e) {
      // prevent vertical scroll lock if mostly horizontal
      if (!isTouching) return;
      const t = e.touches && e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 24) {
        e.preventDefault();
      }
    }

    function onTouchEnd(e) {
      if (!isTouching) return;
      isTouching = false;
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
        if (dx < 0) {
          // swipe left: next
          activate(Math.min(currentIndex + 1, tabs.length - 1));
        } else {
          // swipe right: prev
          activate(Math.max(currentIndex - 1, 0));
        }
      }
    }

    paneContainer.addEventListener('touchstart', onTouchStart, { passive: true });
    paneContainer.addEventListener('touchmove', onTouchMove, { passive: false });
    paneContainer.addEventListener('touchend', onTouchEnd, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboardTabs);
  } else {
    initDashboardTabs();
  }
})();
