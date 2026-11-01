/**
 * ============================================================================
 * Tệp: app.js
 * Chức năng: Bộ điều khiển Giao diện Trung tâm (UI Controller v2.5 Luxury),
 * Hỗ trợ: Light/Dark Mode, Accordion Đóng/Mở thông minh, 8 Phân hệ, 5 Biểu đồ.
 * ============================================================================
 */

const AppController = (function() {
  const COLOR_MODE_KEY = 'SO_TAY_CA_NHAN_COLOR_MODE';
  const ACCORDION_STATE_KEY = 'SO_TAY_CA_NHAN_ACCORDION_STATE';

  let currentTab = 'dashboard';
  let currentPeriodMode = 'KY_LUONG';
  let customStartDate = '2026-10-13';
  let customEndDate = '2026-11-12';
  let quickActionsOpen = true;

  // Bộ lọc từng phân hệ
  let workFilter = { search: '', category: 'ALL', status: 'ALL' };
  let incomeFilter = { search: '', type: 'ALL' };
  let expenseFilter = { search: '', category: 'ALL', account: 'ALL' };
  let planFilter = { type: 'ALL', status: 'ALL' };
  let categorySubTab = 'CONG_VIEC';

  function init() {
    // Nhận diện chế độ iOS Standalone (khi thêm ra Màn hình chính điện thoại) để tự bù khoảng trống tai thỏ
    try {
      const isStandalone = window.navigator.standalone === true ||
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
      if (isStandalone) {
        document.body.classList.add('ios-standalone');
      }
    } catch (e) {}

    const db = PersonalDB.getState();

    // 1. Áp dụng chủ đề Phong thủy Ngũ hành
    const savedTheme = (db.config && db.config.PHONG_THUY_MENH) || 'KIM_THUY';
    applyFengShuiTheme(savedTheme, false);

    // 2. Áp dụng Chế độ Sáng / Tối (Light / Dark Mode)
    const savedColorMode = localStorage.getItem(COLOR_MODE_KEY) || 'light';
    setColorMode(savedColorMode, false);

    // 3. Khôi phục trạng thái đóng/mở của các mục Nhóm 1, 2, 3, 4, 5, 6
    initAccordionStates();

    // 4. Hiển thị Lịch Âm Dương Can Chi trên Topbar
    renderLunarCalendarBar();

    // 5. Khởi tạo sự kiện giao diện
    bindGlobalEvents();

    // 6. Render toàn bộ giao diện
    refreshAllViews();

    // 7. Tự động đồng bộ nếu chạy trong Google Apps Script hoặc đã gắn URL Cloud
    if (PersonalDB.isRunningInGAS() || PersonalDB.getRemoteGasUrl()) {
      PersonalDB.fetchFromCloud(function(ok, msg) {
        if (ok) {
          refreshAllViews();
          showToast('☁️ ' + msg);
        }
      });
    }
  }

  /**
   * Chuyển đổi Chế độ Sáng (Light Mode) / Chế độ Tối Hoàng Gia (Dark Mode)
   */
  function setColorMode(mode, notify) {
    const target = mode === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-color-mode', target);
    localStorage.setItem(COLOR_MODE_KEY, target);

    const iconEl = document.getElementById('colorModeIcon');
    const labelEl = document.getElementById('colorModeLabel');
    if (iconEl) iconEl.textContent = target === 'dark' ? '☀️' : '🌙';
    if (labelEl) labelEl.textContent = target === 'dark' ? 'Sáng' : 'Tối';

    if (notify !== false) {
      showToast(target === 'dark' ? '🌙 Đã bật Chế độ Tối Hoàng Gia' : '☀️ Đã bật Chế độ Sáng Minh Đường');
    }
  }

  function toggleColorMode() {
    const current = document.documentElement.getAttribute('data-color-mode') || 'light';
    setColorMode(current === 'dark' ? 'light' : 'dark', true);
  }

  /**
   * Quản lý Đóng / Mở (Accordion) các Nhóm 1, 2, 3, 4, 5, 6 trên Dashboard
   */
  function initAccordionStates() {
    const allIds = ['acc-work', 'acc-income', 'acc-expense', 'acc-finance', 'acc-charts', 'acc-recent'];
    let saved = null;
    try {
      const raw = localStorage.getItem(ACCORDION_STATE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (e) {}

    // Mặc định: thu gọn gọn gàng các nhóm 1..5, chỉ mở nhóm 6 (hoặc thu gọn hết trên điện thoại)
    const isMobile = window.innerWidth <= 768;
    allIds.forEach(function(id) {
      const card = document.getElementById(id);
      if (!card) return;
      let shouldOpen = false;
      if (saved && saved[id] !== undefined) {
        shouldOpen = Boolean(saved[id]);
      } else {
        shouldOpen = !isMobile && id === 'acc-work';
      }
      card.classList.toggle('open', shouldOpen);
    });
  }

  function saveAccordionStates() {
    const allIds = ['acc-work', 'acc-income', 'acc-expense', 'acc-finance', 'acc-charts', 'acc-recent'];
    const map = {};
    allIds.forEach(function(id) {
      const card = document.getElementById(id);
      if (card) map[id] = card.classList.contains('open');
    });
    try {
      localStorage.setItem(ACCORDION_STATE_KEY, JSON.stringify(map));
    } catch (e) {}
  }

  function toggleAccordion(accId) {
    const card = document.getElementById(accId);
    if (!card) return;
    card.classList.toggle('open');
    saveAccordionStates();
  }

  function setAllAccordions(openBool) {
    const allIds = ['acc-work', 'acc-income', 'acc-expense', 'acc-finance', 'acc-charts', 'acc-recent'];
    allIds.forEach(function(id) {
      const card = document.getElementById(id);
      if (card) card.classList.toggle('open', openBool);
    });
    saveAccordionStates();
    showToast(openBool ? '📂 Đã mở chi tiết tất cả các nhóm' : '📁 Đã thu gọn tất cả các nhóm');
  }

  function toggleQuickActions() {
    quickActionsOpen = !quickActionsOpen;
    const bar = document.getElementById('heroQuickActionsBar');
    const btn = document.getElementById('btnToggleQuickActions');
    if (bar) bar.style.display = quickActionsOpen ? 'grid' : 'none';
    if (btn) btn.textContent = quickActionsOpen ? 'Thu gọn ▴' : 'Mở nút nhập ▾';
  }

  function applyFengShuiTheme(themeKey, notify) {
    document.documentElement.setAttribute('data-theme', themeKey);
    const db = PersonalDB.getState();
    db.config.PHONG_THUY_MENH = themeKey;
    PersonalDB.saveLocalState();

    const themeSelect = document.getElementById('topThemeSelect');
    if (themeSelect && themeSelect.value !== themeKey) {
      themeSelect.value = themeKey;
    }

    const info = FengShuiEngine.getThemeInfo(themeKey);
    const pillEl = document.getElementById('fengShuiElementPill');
    if (pillEl) {
      pillEl.textContent = '✦ ' + info.element;
    }

    if (notify) {
      showToast('✨ Đã chuyển giao diện Phong Thủy: ' + info.name);
      refreshAllViews();
    }
  }

  function renderLunarCalendarBar() {
    const cal = FengShuiEngine.getTodaySolarAndCanChi(new Date('2026-11-01T12:00:00'));
    const el = document.getElementById('lunarDateText');
    if (el) {
      el.textContent = cal.weekday + ', ' + cal.solarFormatted + ' • Ngày ' + cal.dayCanChi;
    }
  }

  function bindGlobalEvents() {
    const periodSel = document.getElementById('topPeriodSelect');
    if (periodSel) {
      periodSel.addEventListener('change', function(e) {
        currentPeriodMode = e.target.value;
        const customBox = document.getElementById('customDateRangeBox');
        if (customBox) {
          customBox.classList.toggle('show', currentPeriodMode === 'TUY_CHON');
        }
        refreshAllViews();
      });
    }

    const btnApplyCustomDate = document.getElementById('btnApplyCustomDate');
    if (btnApplyCustomDate) {
      btnApplyCustomDate.addEventListener('click', function() {
        customStartDate = document.getElementById('customStartInput').value || '2026-10-01';
        customEndDate = document.getElementById('customEndInput').value || '2026-11-30';
        refreshAllViews();
      });
    }

    const themeSel = document.getElementById('topThemeSelect');
    if (themeSel) {
      themeSel.addEventListener('change', function(e) {
        applyFengShuiTheme(e.target.value, true);
      });
    }
  }

  function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab-pane').forEach(function(pane) {
      pane.classList.toggle('active', pane.id === 'tab-' + tabId);
    });
    document.querySelectorAll('.nav-item').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.mobile-nav-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    toggleMobileSidebar(false);

    const titleMap = {
      dashboard: 'Tổng Quan Công Việc & Tài Chính',
      work: 'Quản Lý Công Việc & Tạm Ứng',
      income: 'Quản Lý Lương & Thu Nhập',
      expense: 'Quản Lý Chi Tiêu & Quỹ Đưa Vợ',
      accounts: 'Tiền Mặt, Ngân Hàng & Tiết Kiệm',
      report: 'Báo Cáo Thống Kê & Xuất File',
      plan: 'Kế Hoạch Dự Thu – Dự Chi',
      settings: 'Danh Mục, Kỳ Lương & Sao Lưu'
    };
    const pageTitle = document.getElementById('currentPageTitle');
    if (pageTitle && titleMap[tabId]) {
      pageTitle.textContent = titleMap[tabId];
    }

    refreshAllViews();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleMobileSidebar(forceState) {
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;
    const isOpen = forceState !== undefined ? forceState : !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', isOpen);
    if (overlay) overlay.classList.toggle('show', isOpen);
  }

  /**
   * Làm mới toàn bộ các màn hình & chỉ số
   */
  function refreshAllViews() {
    const db = PersonalDB.getState();
    const periodRange = AccountingEngine.getPeriodDateRange(
      currentPeriodMode,
      db.config,
      customStartDate,
      customEndDate
    );
    const metrics = AccountingEngine.computeFullMetrics(db, periodRange);

    setText('sidebarTotalAssets', AccountingEngine.formatCurrency(metrics.totalMoneyAssets));
    setText('sidebarPeriodLabel', periodRange.label);
    setText('navUnpaidBadge', metrics.unpaidWorksCount);

    renderDashboard(db, metrics);
    renderWorkModule(db, metrics);
    renderIncomeModule(db, metrics);
    renderExpenseModule(db, metrics);
    renderAccountsAndSavingsModule(db, metrics);
    renderPlanModule(db, metrics);
    renderReportModule(db, metrics);
    renderSettingsModule(db, metrics);
  }

  /* ========================================================================
     1. RENDER PHÂN HỆ TỔNG QUAN (DASHBOARD)
     ======================================================================== */
  function renderDashboard(db, m) {
    const harmony = FengShuiEngine.evaluateWealthHarmony(m);
    const themeInfo = FengShuiEngine.getThemeInfo(db.config.PHONG_THUY_MENH);

    setText('heroGreetingTitle', '✦ ' + harmony.statusTitle + ' (' + harmony.score + '/100 điểm)');
    setText('heroGreetingSub', harmony.advice + ' • ' + themeInfo.motto);
    setText('heroTotalAssets', AccountingEngine.formatCurrency(m.totalMoneyAssets));
    setText('dashboardPeriodBadge', m.periodRange.label);

    // Hiển thị nút "🌱 Nạp dữ liệu mẫu" ngay trên Banner nếu sổ đang trống (0đ)
    const btnSeed = document.getElementById('btnHeroSeedSample');
    if (btnSeed) {
      btnSeed.style.display = (m.totalMoneyAssets === 0 && m.totalWorksCount === 0) ? 'inline-flex' : 'none';
    }

    // 3 Chỉ số tóm tắt nhanh ngay trên Hero Banner
    setText('heroMiniIncome', '+' + AccountingEngine.formatCurrency(m.totalActualIncome));
    setText('heroMiniExpense', '-' + AccountingEngine.formatCurrency(m.totalExpense));
    setText('heroMiniPendingWork', AccountingEngine.formatCurrency(m.totalRemainingFromWork));

    // Các nhãn tóm tắt trên thanh tiêu đề Accordion khi thu gọn
    setText('accSumWork', m.totalWorksCount + ' việc • Còn thu: ' + AccountingEngine.formatCurrency(m.totalRemainingFromWork));
    setText('accSumIncome', 'Thực nhận: ' + AccountingEngine.formatCurrency(m.totalActualIncome));
    setText('accSumExpense', 'Chi: ' + AccountingEngine.formatCurrency(m.totalExpense) + ' • Đưa vợ: ' + m.wifePercent + '%');
    setText('accSumFinance', 'Mặt+NH: ' + AccountingEngine.formatCurrency(m.totalCurrentBalance));
    setText('accSumAlerts', m.smartAlerts.length + ' thông báo');

    // 1.1 Nhóm Công việc (5 chỉ số)
    setText('kpiWorkTotal', m.totalWorksCount + ' việc');
    setText('kpiWorkInProgress', m.inProgressWorksCount + ' việc');
    setText('kpiWorkCompleted', m.completedWorksCount + ' việc');
    setText('kpiWorkUnpaid', m.unpaidWorksCount + ' việc');
    setText('kpiWorkDueSoon', m.dueSoonWorksCount + ' việc');
    setText('kpiWorkRemainingMoney', 'Còn thu: ' + AccountingEngine.formatCurrency(m.totalRemainingFromWork));

    // 1.2 Nhóm Thu nhập (5 chỉ số)
    setText('kpiIncomeSalary', AccountingEngine.formatCurrency(m.salaryReceived));
    setText('kpiIncomeOther', AccountingEngine.formatCurrency(m.nonSalaryIncome));
    setText('kpiIncomeFromWork', AccountingEngine.formatCurrency(m.workReceivedInPeriod));
    setText('kpiIncomeExpected', AccountingEngine.formatCurrency(m.totalExpectedReceivable));
    setText('kpiIncomeRemainingWork', AccountingEngine.formatCurrency(m.totalRemainingFromWork));

    // 1.3 Nhóm Chi tiêu (4 chỉ số)
    setText('kpiExpenseTotal', AccountingEngine.formatCurrency(m.totalExpense));
    setText('kpiExpenseWife', AccountingEngine.formatCurrency(m.wifeAllowancePaid));
    setText('kpiExpenseLiving', AccountingEngine.formatCurrency(m.livingExpense));
    setText('kpiExpenseOther', AccountingEngine.formatCurrency(m.otherExpense));

    // 1.4 Nhóm Tài chính (6 chỉ số)
    setText('kpiFinCash', AccountingEngine.formatCurrency(m.totalCash));
    setText('kpiFinBank', AccountingEngine.formatCurrency(m.totalBank));
    setText('kpiFinSavings', AccountingEngine.formatCurrency(m.totalSavings));
    setText('kpiFinCurrentBal', AccountingEngine.formatCurrency(m.totalCurrentBalance));
    setText('kpiFinPlanIn', AccountingEngine.formatCurrency(m.plannedIncome));
    setText('kpiFinPlanOut', AccountingEngine.formatCurrency(m.plannedExpense));

    // Thẻ Tiến độ Quỹ Đưa Vợ
    setText('dashWifePaid', AccountingEngine.formatCurrency(m.wifeAllowancePaid));
    setText('dashWifeTarget', AccountingEngine.formatCurrency(m.wifeTarget));
    setText('dashWifePercent', m.wifePercent + '%');
    setText('dashWifeStatusText', m.wifeRemaining > 0
      ? ('Còn cần đưa thêm: ' + AccountingEngine.formatCurrency(m.wifeRemaining))
      : '🎉 Đã hoàn thành đủ 100% chỉ tiêu đưa vợ kỳ này!');
    const wifeBar = document.getElementById('dashWifeProgressBar');
    if (wifeBar) {
      wifeBar.style.width = m.wifePercent + '%';
      wifeBar.style.background = m.wifePercent >= 100 ? 'var(--success)' : 'var(--wife-pink)';
    }

    // Cảnh báo thông minh
    const alertContainer = document.getElementById('dashboardSmartAlerts');
    if (alertContainer) {
      alertContainer.innerHTML = m.smartAlerts.map(function(al) {
        return '<div class="smart-alert-item ' + al.level + '">' +
          '<div><strong>' + escapeHtml(al.title) + '</strong><div style="font-size:11.5px;opacity:0.85;margin-top:2px;">' + escapeHtml(al.detail) + '</div></div>' +
        '</div>';
      }).join('');
    }

    // Vẽ 5 Biểu đồ trực quan trên Dashboard
    renderDashboardCharts(db, m);

    // Bảng Công việc gần đây
    const recentWorksTbody = document.getElementById('dashboardRecentWorksBody');
    if (recentWorksTbody) {
      const topWorks = m.enrichedWorks.slice(0, 5);
      recentWorksTbody.innerHTML = topWorks.map(function(w) {
        return '<tr>' +
          '<td><div class="font-bold" style="color:var(--heading-color)">' + escapeHtml(w.TEN_CONG_VIEC) + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);">' + escapeHtml(w.NHOM_CONG_VIEC) + ' • ' + AccountingEngine.formatVnDate(w.NGAY_BAT_DAU) + ' → ' + AccountingEngine.formatVnDate(w.NGAY_KET_THUC) + ' (' + w.SO_NGAY + ' ngày)</div></td>' +
          '<td class="text-right font-bold">' + AccountingEngine.formatCurrency(w._baseTarget) +
          (w._isProvisional ? '<div style="font-size:10px;color:var(--warning);">(Dự kiến)</div>' : '<div style="font-size:10px;color:var(--success);">(Đã duyệt)</div>') + '</td>' +
          '<td class="text-right" style="color:var(--success);font-weight:700;">' + AccountingEngine.formatCurrency(w._netReceived) + '</td>' +
          '<td class="text-right" style="color:' + (w._remaining > 0 ? 'var(--danger)' : 'var(--text-muted)') + ';font-weight:800;">' + AccountingEngine.formatCurrency(w._remaining) + '</td>' +
          '<td class="text-center">' + renderWorkStatusBadge(w.TRANG_THAI) + '</td>' +
          '<td class="text-center">' +
            '<button class="btn btn-sm btn-outline" onclick="AppController.openWorkDetailModal(\'' + w.ID_CONG_VIEC + '\')">Chi tiết</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }
  }

  function renderDashboardCharts(db, m) {
    const chart1El = document.getElementById('chartIncomeStructure');
    if (chart1El) {
      const items1 = [
        { label: 'Lương thực nhận', value: m.salaryReceived, color: '#10B981' },
        { label: 'Tiền thực nhận từ Công việc', value: m.workReceivedInPeriod, color: '#3B82F6' },
        { label: 'Thu nhập ngoài lương (Hỗ trợ/Làm thêm)', value: m.nonSalaryIncome, color: '#8B5CF6' },
        { label: 'Khoản công việc còn phải nhận', value: m.totalRemainingFromWork, color: '#F59E0B' }
      ];
      chart1El.innerHTML = buildHorizontalBarsHtml(items1, Math.max(m.totalActualIncome, m.totalRemainingFromWork, 1));
    }

    const chart2El = document.getElementById('chartExpenseByGroup');
    if (chart2El) {
      const expEntries = Object.keys(m.expenseByCategory).map(function(k) {
        return {
          label: k,
          value: m.expenseByCategory[k],
          color: k === 'Đưa vợ' ? '#E11D48' : '#3B82F6'
        };
      }).sort(function(a, b) { return b.value - a.value; });
      chart2El.innerHTML = expEntries.length > 0
        ? buildHorizontalBarsHtml(expEntries, m.totalExpense || 1)
        : '<div style="text-align:center;color:var(--text-muted);padding:20px;">Chưa có khoản chi tiêu nào trong kỳ này.</div>';
    }

    const chart3El = document.getElementById('chartCashflowComparison');
    if (chart3El) {
      const maxVal = Math.max(m.totalActualIncome, m.totalExpense, m.totalSavings, 1);
      const items3 = [
        { label: 'Tổng Thu Thực Tế Trong Kỳ', value: m.totalActualIncome, color: '#10B981' },
        { label: 'Tổng Chi Tiêu Thực Tế (Gồm Đưa vợ)', value: m.totalExpense, color: '#E11D48' },
        { label: 'Dòng Tiền Ròng Còn Lại Trong Kỳ', value: Math.max(0, m.netCashflow), color: '#D4AF37' },
        { label: 'Tổng Quỹ Tiết Kiệm Tích Lũy', value: m.totalSavings, color: '#3B82F6' }
      ];
      chart3El.innerHTML = buildHorizontalBarsHtml(items3, maxVal);
    }

    const chart4El = document.getElementById('chartWorkByCategory');
    if (chart4El) {
      const workEntries = Object.keys(m.workByCategory).map(function(k) {
        return { label: k, value: m.workByCategory[k], color: '#D4AF37' };
      }).sort(function(a, b) { return b.value - a.value; });
      const maxWork = workEntries.reduce(function(acc, cur) { return Math.max(acc, cur.value); }, 1);
      chart4El.innerHTML = workEntries.length > 0
        ? buildHorizontalBarsHtml(workEntries, maxWork)
        : '<div style="text-align:center;color:var(--text-muted);padding:20px;">Chưa có dữ liệu nhóm công việc.</div>';
    }

    const chart5El = document.getElementById('chartAccountBalances');
    if (chart5El) {
      const accItems = m.enrichedAccounts.map(function(a) {
        return {
          label: a.TEN_TAI_KHOAN + ' (' + a.NGAN_HANG + ')',
          value: Math.max(0, a._currentBalance),
          color: a.LOAI_TAI_KHOAN === 'TIEN_MAT' ? '#10B981' : '#3B82F6'
        };
      });
      accItems.push({
        label: 'Tổng Sổ / Mục Tiêu Tiết Kiệm',
        value: m.totalSavings,
        color: '#D4AF37'
      });
      chart5El.innerHTML = buildHorizontalBarsHtml(accItems, Math.max(m.totalMoneyAssets, 1));
    }
  }

  function buildHorizontalBarsHtml(items, totalBase) {
    return items.map(function(item) {
      const pct = Math.min(100, Math.max(4, Math.round((item.value / (totalBase || 1)) * 100)));
      return '<div class="horiz-bar-row">' +
        '<div class="horiz-bar-label">' +
          '<span>' + escapeHtml(item.label) + '</span>' +
          '<span style="color:var(--heading-color);font-weight:800;">' + AccountingEngine.formatCurrency(item.value) + '</span>' +
        '</div>' +
        '<div class="horiz-bar-track">' +
          '<div class="horiz-bar-fill" style="width:' + pct + '%;background:' + item.color + ';"></div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ========================================================================
     2. RENDER PHÂN HỆ CÔNG VIỆC & TẠM ỨNG / THANH TOÁN
     ======================================================================== */
  function renderWorkModule(db, m) {
    const catSelect = document.getElementById('workCategoryFilter');
    if (catSelect && catSelect.options.length <= 1) {
      const jobCats = (db.categories || []).filter(function(c) { return c.LOAI_DANH_MUC === 'CONG_VIEC'; });
      catSelect.innerHTML = '<option value="ALL">Tất cả nhóm công việc (11 nhóm)</option>' +
        jobCats.map(function(c) {
          return '<option value="' + escapeHtml(c.TEN_DANH_MUC) + '">' + (c.ICON || '📋') + ' ' + escapeHtml(c.TEN_DANH_MUC) + '</option>';
        }).join('');
    }

    setText('workSumCount', m.enrichedWorks.length + ' việc');
    setText('workSumExpected', AccountingEngine.formatCurrency(m.totalWorkExpected));
    setText('workSumApproved', AccountingEngine.formatCurrency(m.totalWorkApproved));
    setText('workSumReceived', AccountingEngine.formatCurrency(m.totalWorkReceivedAll));
    setText('workSumRemaining', AccountingEngine.formatCurrency(m.totalRemainingFromWork));

    const filtered = m.enrichedWorks.filter(function(w) {
      if (workFilter.category !== 'ALL' && w.NHOM_CONG_VIEC !== workFilter.category) return false;
      if (workFilter.status === 'UNPAID' && w._remaining <= 0) return false;
      if (workFilter.status !== 'ALL' && workFilter.status !== 'UNPAID' && w.TRANG_THAI !== workFilter.status) return false;
      if (workFilter.search) {
        const q = workFilter.search.toLowerCase();
        const haystack = (w.TEN_CONG_VIEC + ' ' + w.NOI_DUNG + ' ' + w.NGUOI_GIAO + ' ' + w.DIA_DIEM + ' ' + w.ID_CONG_VIEC).toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }
      return true;
    });

    const tbody = document.getElementById('workTableBody');
    if (tbody) {
      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="padding:28px;color:var(--text-muted);">Không tìm thấy công việc phù hợp với bộ lọc.</td></tr>';
      } else {
        tbody.innerHTML = filtered.map(function(w) {
          return '<tr>' +
            '<td><span class="badge badge-navy">' + escapeHtml(w.ID_CONG_VIEC) + '</span></td>' +
            '<td>' +
              '<div class="font-bold" style="color:var(--heading-color);font-size:13.5px;">' + escapeHtml(w.TEN_CONG_VIEC) + '</div>' +
              '<div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">👤 Giao: <b>' + escapeHtml(w.NGUOI_GIAO || 'Chủ động') + '</b> • 📍 ' + escapeHtml(w.DIA_DIEM || 'Cơ sở') + '</div>' +
              (w.GHI_CHU ? '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">📝 ' + escapeHtml(w.GHI_CHU) + '</div>' : '') +
            '</td>' +
            '<td><span class="badge badge-info">' + escapeHtml(w.NHOM_CONG_VIEC) + '</span></td>' +
            '<td>' +
              '<div class="font-bold">' + AccountingEngine.formatVnDate(w.NGAY_BAT_DAU) + ' → ' + AccountingEngine.formatVnDate(w.NGAY_KET_THUC) + '</div>' +
              '<div style="font-size:11.5px;color:var(--success);font-weight:700;">⏱️ ' + w.SO_NGAY + ' ngày' + (w.SO_BUOI ? ' (' + escapeHtml(w.SO_BUOI) + ')' : '') + '</div>' +
            '</td>' +
            '<td class="text-right">' +
              '<div>Dự kiến: <b>' + AccountingEngine.formatCurrency(w.DU_KIEN_THU) + '</b></div>' +
              '<div style="font-weight:700;">Được duyệt: ' + (w.DUOC_DUYET > 0 ? AccountingEngine.formatCurrency(w.DUOC_DUYET) : '<span style="color:var(--warning)">Chưa duyệt</span>') + '</div>' +
            '</td>' +
            '<td class="text-right">' +
              '<div style="color:var(--success);font-weight:800;">' + AccountingEngine.formatCurrency(w._netReceived) + '</div>' +
              '<div style="font-size:11px;color:var(--text-muted);">Ứng: ' + AccountingEngine.formatCurrency(w._advanceTotal) + ' | TT: ' + AccountingEngine.formatCurrency(w._settlementTotal) + '</div>' +
            '</td>' +
            '<td class="text-right">' +
              '<div style="font-size:14px;font-weight:900;color:' + (w._remaining > 0 ? 'var(--danger)' : 'var(--success)') + ';">' + AccountingEngine.formatCurrency(w._remaining) + '</div>' +
              (w._isProvisional && w._remaining > 0 ? '<span class="badge badge-warning" style="font-size:10px;">Tạm tính theo dự kiến</span>' : '') +
              (w._overpaid > 0 ? '<div class="badge badge-danger" style="font-size:10px;">⚠️ Vượt duyệt ' + AccountingEngine.formatCurrency(w._overpaid) + '</div>' : '') +
            '</td>' +
            '<td class="text-center">' + renderWorkStatusBadge(w.TRANG_THAI) + '</td>' +
            '<td class="text-center">' +
              '<div style="display:flex;gap:5px;justify-content:center;flex-wrap:wrap;">' +
                '<button class="btn btn-sm btn-gold" onclick="AppController.openWorkTxModal(\'' + w.ID_CONG_VIEC + '\')">+ Ứng/Thu</button>' +
                '<button class="btn btn-sm btn-outline" onclick="AppController.openWorkDetailModal(\'' + w.ID_CONG_VIEC + '\')">Chi tiết</button>' +
                '<button class="btn btn-sm btn-outline" onclick="AppController.openWorkModal(\'' + w.ID_CONG_VIEC + '\')">Sửa</button>' +
                '<button class="btn btn-sm btn-danger" onclick="AppController.deleteWork(\'' + w.ID_CONG_VIEC + '\')">Xóa</button>' +
              '</div>' +
            '</td>' +
          '</tr>';
        }).join('');
      }
    }

    const txTbody = document.getElementById('workTxHistoryBody');
    if (txTbody) {
      const workMap = {};
      m.enrichedWorks.forEach(function(w) { workMap[w.ID_CONG_VIEC] = w.TEN_CONG_VIEC; });
      const accMap = {};
      (db.accounts || []).forEach(function(a) { accMap[a.ID_TAI_KHOAN] = a.TEN_TAI_KHOAN; });

      const allTxs = (db.workTransactions || []).slice().sort(function(a, b) {
        return String(b.NGAY_GIAO_DICH).localeCompare(String(a.NGAY_GIAO_DICH));
      });

      txTbody.innerHTML = allTxs.map(function(tx) {
        const isRefund = tx.LOAI_GIAO_DICH === 'Hoàn trả tạm ứng' || tx.LOAI_GIAO_DICH === 'Thu hồi tiền tạm ứng';
        return '<tr>' +
          '<td>' + AccountingEngine.formatVnDate(tx.NGAY_GIAO_DICH) + '</td>' +
          '<td class="font-bold">' + escapeHtml(workMap[tx.ID_CONG_VIEC] || tx.ID_CONG_VIEC) + '</td>' +
          '<td><span class="badge ' + (isRefund ? 'badge-danger' : (tx.LOAI_GIAO_DICH === 'Tạm ứng nhận được' ? 'badge-warning' : 'badge-success')) + '">' + escapeHtml(tx.LOAI_GIAO_DICH) + '</span></td>' +
          '<td>' + escapeHtml(tx.NOI_DUNG || '') + '</td>' +
          '<td>' + escapeHtml(accMap[tx.TAI_KHOAN_ID] || tx.TAI_KHOAN_ID) + '</td>' +
          '<td class="text-right font-bold" style="color:' + (isRefund ? 'var(--danger)' : 'var(--success)') + ';">' + (isRefund ? '-' : '+') + AccountingEngine.formatCurrency(tx.SO_TIEN) + '</td>' +
          '<td class="text-center">' +
            '<button class="btn btn-sm btn-danger" onclick="AppController.deleteWorkTx(\'' + tx.ID_GIAO_DICH + '\')">Xóa</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }
  }

  function renderWorkStatusBadge(status) {
    const map = {
      'Đã thanh toán đủ': 'badge-success',
      'Đã hoàn thành': 'badge-info',
      'Chờ thanh toán': 'badge-warning',
      'Đang thực hiện': 'badge-gold',
      'Chưa thực hiện': 'badge-navy',
      'Tạm dừng': 'badge-danger',
      'Đã hủy': 'badge-danger'
    };
    return '<span class="badge ' + (map[status] || 'badge-navy') + '">' + escapeHtml(status || 'Đang thực hiện') + '</span>';
  }

  /* ========================================================================
     3. RENDER PHÂN HỆ THU NHẬP & KỲ LƯƠNG
     ======================================================================== */
  function renderIncomeModule(db, m) {
    const startDay = db.config.NGAY_BAT_DAU_KY_LUONG || '13';
    const payDay = db.config.NGAY_NHAN_LUONG_DU_KIEN || '15';
    const expectedSalary = Number(db.config.LUONG_CO_BAN_DU_KIEN) || 12500000;

    setText('incPeriodRuleInfo', 'Chu kỳ lương thiết lập: Từ ngày ' + startDay + ' tháng trước đến ngày ' + (Number(startDay) - 1 || 30) + ' tháng này • Ngày nhận lương dự kiến: Ngày ' + payDay + ' hằng tháng • Lương dự kiến: ' + AccountingEngine.formatCurrency(expectedSalary));

    setText('incSumSalary', AccountingEngine.formatCurrency(m.salaryReceived));
    setText('incSumOther', AccountingEngine.formatCurrency(m.nonSalaryIncome));
    setText('incSumWorkLinked', AccountingEngine.formatCurrency(m.workReceivedInPeriod));
    setText('incSumTotalActual', AccountingEngine.formatCurrency(m.totalActualIncome));

    const accMap = {};
    (db.accounts || []).forEach(function(a) { accMap[a.ID_TAI_KHOAN] = a.TEN_TAI_KHOAN; });

    const list = (db.incomes || []).filter(function(inc) {
      if (incomeFilter.type !== 'ALL' && inc.LOAI_THU !== incomeFilter.type) return false;
      if (incomeFilter.search) {
        const q = incomeFilter.search.toLowerCase();
        if ((inc.NOI_DUNG + ' ' + inc.LOAI_THU + ' ' + inc.GHI_CHU).toLowerCase().indexOf(q) === -1) return false;
      }
      return true;
    });

    const tbody = document.getElementById('incomeTableBody');
    if (tbody) {
      tbody.innerHTML = list.map(function(inc) {
        return '<tr>' +
          '<td>' + AccountingEngine.formatVnDate(inc.NGAY_THU) + '</td>' +
          '<td><span class="badge badge-success">' + escapeHtml(inc.LOAI_THU) + '</span></td>' +
          '<td><div class="font-bold">' + escapeHtml(inc.NOI_DUNG) + '</div>' +
          (inc.GHI_CHU ? '<div style="font-size:11px;color:var(--text-muted);">' + escapeHtml(inc.GHI_CHU) + '</div>' : '') + '</td>' +
          '<td><span class="badge badge-navy">Kỳ ' + escapeHtml(inc.KY_LUONG || '2026-11') + '</span></td>' +
          '<td>' + escapeHtml(accMap[inc.TAI_KHOAN_ID] || inc.TAI_KHOAN_ID) + '</td>' +
          '<td class="text-right font-bold" style="color:var(--success);font-size:14px;">+' + AccountingEngine.formatCurrency(inc.SO_TIEN) + '</td>' +
          '<td class="text-center">' +
            '<button class="btn btn-sm btn-outline" onclick="AppController.openIncomeModal(\'' + inc.ID_THU + '\')">Sửa</button> ' +
            '<button class="btn btn-sm btn-danger" onclick="AppController.deleteIncome(\'' + inc.ID_THU + '\')">Xóa</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }
  }

  /* ========================================================================
     4. RENDER PHÂN HỆ CHI TIÊU & QUỸ ĐƯA VỢ
     ======================================================================== */
  function renderExpenseModule(db, m) {
    setText('expWifePaid', AccountingEngine.formatCurrency(m.wifeAllowancePaid));
    setText('expWifeTarget', AccountingEngine.formatCurrency(m.wifeTarget));
    setText('expWifeRemaining', AccountingEngine.formatCurrency(m.wifeRemaining));
    setText('expTotalAll', AccountingEngine.formatCurrency(m.totalExpense));

    const expCatFilter = document.getElementById('expenseCategoryFilter');
    if (expCatFilter && expCatFilter.options.length <= 1) {
      const cats = (db.categories || []).filter(function(c) { return c.LOAI_DANH_MUC === 'CHI_TIEU'; });
      expCatFilter.innerHTML = '<option value="ALL">Tất cả 12 nhóm chi tiêu</option>' +
        cats.map(function(c) {
          return '<option value="' + escapeHtml(c.TEN_DANH_MUC) + '">' + (c.ICON || '💸') + ' ' + escapeHtml(c.TEN_DANH_MUC) + '</option>';
        }).join('');
    }

    const budgetBox = document.getElementById('expenseBudgetProgressList');
    if (budgetBox) {
      const expCats = (db.categories || []).filter(function(c) { return c.LOAI_DANH_MUC === 'CHI_TIEU' && Number(c.HAN_MUC_THANG) > 0; });
      budgetBox.innerHTML = expCats.map(function(cat) {
        const spent = m.expenseByCategory[cat.TEN_DANH_MUC] || 0;
        const limit = Number(cat.HAN_MUC_THANG) || 1;
        const pct = Math.min(100, Math.round((spent / limit) * 100));
        const isOver = spent > limit;
        const barColor = isOver ? 'var(--danger)' : (pct >= 80 ? 'var(--warning)' : 'var(--success)');
        return '<div class="horiz-bar-row">' +
          '<div class="horiz-bar-label">' +
            '<span>' + (cat.ICON || '📌') + ' <b>' + escapeHtml(cat.TEN_DANH_MUC) + '</b></span>' +
            '<span><b>' + AccountingEngine.formatCurrency(spent) + '</b> / ' + AccountingEngine.formatCurrency(limit) + ' (' + Math.round((spent / limit) * 100) + '%)</span>' +
          '</div>' +
          '<div class="horiz-bar-track"><div class="horiz-bar-fill" style="width:' + pct + '%;background:' + barColor + ';"></div></div>' +
        '</div>';
      }).join('');
    }

    const accMap = {};
    (db.accounts || []).forEach(function(a) { accMap[a.ID_TAI_KHOAN] = a.TEN_TAI_KHOAN; });

    const list = (db.expenses || []).filter(function(exp) {
      if (expenseFilter.category !== 'ALL' && exp.NHOM_CHI !== expenseFilter.category) return false;
      if (expenseFilter.search) {
        const q = expenseFilter.search.toLowerCase();
        if ((exp.NOI_DUNG + ' ' + exp.NHOM_CHI + ' ' + exp.GHI_CHU).toLowerCase().indexOf(q) === -1) return false;
      }
      return true;
    });

    const tbody = document.getElementById('expenseTableBody');
    if (tbody) {
      tbody.innerHTML = list.map(function(exp) {
        const isWife = exp.NHOM_CHI === 'Đưa vợ';
        return '<tr>' +
          '<td>' + AccountingEngine.formatVnDate(exp.NGAY_CHI) + '</td>' +
          '<td><span class="badge ' + (isWife ? 'badge-wife' : 'badge-warning') + '">' + (isWife ? '💝 ' : '') + escapeHtml(exp.NHOM_CHI) + '</span></td>' +
          '<td><div class="font-bold">' + escapeHtml(exp.NOI_DUNG) + '</div>' +
          (exp.GHI_CHU ? '<div style="font-size:11px;color:var(--text-muted);">' + escapeHtml(exp.GHI_CHU) + '</div>' : '') + '</td>' +
          '<td>' + escapeHtml(accMap[exp.TAI_KHOAN_ID] || exp.TAI_KHOAN_ID) + '</td>' +
          '<td><span class="badge badge-navy">' + escapeHtml(exp.HINH_THUC_TT || 'Chuyển khoản') + '</span></td>' +
          '<td class="text-right font-bold" style="color:' + (isWife ? 'var(--wife-pink)' : 'var(--danger)') + ';font-size:14px;">-' + AccountingEngine.formatCurrency(exp.SO_TIEN) + '</td>' +
          '<td class="text-center">' +
            '<button class="btn btn-sm btn-outline" onclick="AppController.openExpenseModal(\'' + exp.ID_CHI + '\')">Sửa</button> ' +
            '<button class="btn btn-sm btn-danger" onclick="AppController.deleteExpense(\'' + exp.ID_CHI + '\')">Xóa</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }
  }

  /* ========================================================================
     5. RENDER PHÂN HỆ TÀI KHOẢN, CHUYỂN TIỀN & TIẾT KIỆM
     ======================================================================== */
  function renderAccountsAndSavingsModule(db, m) {
    const cardsGrid = document.getElementById('accountsCardGrid');
    if (cardsGrid) {
      cardsGrid.innerHTML = m.enrichedAccounts.map(function(acc) {
        const bg = acc.MAU_THE || (acc.LOAI_TAI_KHOAN === 'TIEN_MAT' ? '#065F46' : '#0F2537');
        return '<div class="bank-card" style="background:linear-gradient(135deg, ' + bg + ' 0%, #091724 100%);">' +
          '<div class="bank-card-top">' +
            '<div>' +
              '<div style="font-size:10.5px;text-transform:uppercase;color:var(--gold-300);letter-spacing:0.5px;">' + (acc.LOAI_TAI_KHOAN === 'TIEN_MAT' ? '💵 TIỀN MẶT TẠI QUỸ' : '🏦 TÀI KHOẢN NGÂN HÀNG') + '</div>' +
              '<div style="font-size:15.5px;font-weight:800;margin-top:2px;">' + escapeHtml(acc.TEN_TAI_KHOAN) + '</div>' +
            '</div>' +
            '<button class="btn btn-sm btn-outline" style="background:rgba(255,255,255,0.12);color:#FFF;border:none;" onclick="AppController.openAccountModal(\'' + acc.ID_TAI_KHOAN + '\')">Sửa</button>' +
          '</div>' +
          '<div style="font-size:11px;color:rgba(255,255,255,0.75);">Số dư hiện có thực tế:</div>' +
          '<div class="bank-card-balance">' + AccountingEngine.formatCurrency(acc._currentBalance) + '</div>' +
          '<div class="bank-card-Flows">' +
            '<span>Đầu kỳ: <b>' + AccountingEngine.formatCurrency(acc._openingBalance) + '</b></span>' +
            '<span style="color:#6EE7B7;">+Vào: ' + AccountingEngine.formatCurrency(acc._totalIn) + '</span>' +
            '<span style="color:#FDA4AF;">-Ra: ' + AccountingEngine.formatCurrency(acc._totalOut) + '</span>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    const savingsGrid = document.getElementById('savingsGoalsGrid');
    if (savingsGrid) {
      const savings = db.savings || [];
      savingsGrid.innerHTML = savings.map(function(s) {
        const cur = Number(s.SO_TIEN_HIEN_TAI) || 0;
        const target = Number(s.SO_TIEN_MUC_TIEU) || 1;
        const pct = Math.min(100, Math.round((cur / target) * 100));
        return '<div class="kpi-card gold-border">' +
          '<div class="kpi-top">' +
            '<div>' +
              '<span class="badge badge-gold">🎯 ' + escapeHtml(s.NOI_GUI || 'Sổ Tiết kiệm') + '</span>' +
              '<h4 style="font-size:14.5px;font-weight:800;color:var(--heading-color);margin-top:6px;">' + escapeHtml(s.TEN_MUC_TIEU) + '</h4>' +
            '</div>' +
            '<span style="font-size:17px;font-weight:900;color:var(--gold-500);">' + pct + '%</span>' +
          '</div>' +
          '<div style="margin:10px 0;">' +
            '<div style="display:flex;justify-content:space-between;font-size:12px;">' +
              '<span>Đã tích lũy: <b style="color:var(--success);font-size:13.5px;">' + AccountingEngine.formatCurrency(cur) + '</b></span>' +
              '<span>Mục tiêu: <b>' + AccountingEngine.formatCurrency(target) + '</b></span>' +
            '</div>' +
            '<div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:' + pct + '%;background:var(--gold-gradient);"></div></div>' +
            '<div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;">' +
              '<span>Lãi suất: ' + (s.LAI_SUAT_NAM || 0) + '%/năm</span>' +
              '<span>Hạn: ' + (AccountingEngine.formatVnDate(s.HAN_HOAN_THANH) || 'Dài hạn') + '</span>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">' +
            '<button class="btn btn-sm btn-gold" onclick="AppController.openSavingTxModal(\'' + s.ID_TIET_KIEM + '\', \'GUI_TIET_KIEM\')">+ Gửi thêm</button>' +
            '<button class="btn btn-sm btn-outline" onclick="AppController.openSavingTxModal(\'' + s.ID_TIET_KIEM + '\', \'RUT_TIET_KIEM\')">- Rút về TK</button>' +
            '<button class="btn btn-sm btn-outline" onclick="AppController.openSavingGoalModal(\'' + s.ID_TIET_KIEM + '\')">Sửa</button>' +
            '<button class="btn btn-sm btn-danger" onclick="AppController.deleteSaving(\'' + s.ID_TIET_KIEM + '\')">Xóa</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    const transferTbody = document.getElementById('transferTableBody');
    if (transferTbody) {
      const accMap = { QUY_TIET_KIEM: '🐷 Quỹ / Sổ Tiết Kiệm' };
      (db.accounts || []).forEach(function(a) { accMap[a.ID_TAI_KHOAN] = a.TEN_TAI_KHOAN; });

      const transfers = db.transfers || [];
      transferTbody.innerHTML = transfers.map(function(tr) {
        return '<tr>' +
          '<td>' + AccountingEngine.formatVnDate(tr.NGAY_CHUYEN) + '</td>' +
          '<td><span class="badge badge-info">' + escapeHtml(tr.LOAI_CHUYEN || 'NOI_BO') + '</span></td>' +
          '<td class="font-bold">' + escapeHtml(accMap[tr.TAI_KHOAN_DI] || tr.TAI_KHOAN_DI) + '</td>' +
          '<td class="font-bold" style="color:var(--success);">→ ' + escapeHtml(accMap[tr.TAI_KHOAN_DEN] || tr.TAI_KHOAN_DEN) + '</td>' +
          '<td>' + escapeHtml(tr.NOI_DUNG || '') + '</td>' +
          '<td class="text-right font-bold">' + AccountingEngine.formatCurrency(tr.SO_TIEN) + '</td>' +
          '<td class="text-center"><button class="btn btn-sm btn-danger" onclick="AppController.deleteTransfer(\'' + tr.ID_CHUYEN_TIEN + '\')">Xóa</button></td>' +
        '</tr>';
      }).join('');
    }
  }

  /* ========================================================================
     6. RENDER PHÂN HỆ DỰ THU – DỰ CHI
     ======================================================================== */
  function renderPlanModule(db, m) {
    setText('planSumIncome', AccountingEngine.formatCurrency(m.plannedIncome));
    setText('planSumWorkPending', AccountingEngine.formatCurrency(m.totalRemainingFromWork));
    setText('planSumExpense', AccountingEngine.formatCurrency(m.plannedExpense));
    setText('planNetBalance', AccountingEngine.formatCurrency(m.totalCurrentBalance + m.plannedIncome + m.totalRemainingFromWork - m.plannedExpense));

    const plans = (db.plans || []).filter(function(p) {
      if (planFilter.type !== 'ALL' && p.LOAI_KE_HOACH !== planFilter.type) return false;
      if (planFilter.status !== 'ALL' && p.TRANG_THAI !== planFilter.status) return false;
      return true;
    });

    const tbody = document.getElementById('planTableBody');
    if (tbody) {
      tbody.innerHTML = plans.map(function(p) {
        const isIncome = p.LOAI_KE_HOACH === 'DU_THU';
        const isDone = p.TRANG_THAI === 'DA_THUC_HIEN';
        return '<tr>' +
          '<td>' + AccountingEngine.formatVnDate(p.NGAY_DU_KIEN) + '</td>' +
          '<td><span class="badge ' + (isIncome ? 'badge-success' : 'badge-warning') + '">' + (isIncome ? '📈 Dự thu' : '📉 Dự chi') + '</span></td>' +
          '<td class="font-bold">' + escapeHtml(p.NHOM_HANG_MUC) + '</td>' +
          '<td><div>' + escapeHtml(p.NOI_DUNG) + '</div>' + (p.GHI_CHU ? '<div style="font-size:11px;color:var(--text-muted);">' + escapeHtml(p.GHI_CHU) + '</div>' : '') + '</td>' +
          '<td class="text-right font-bold" style="color:' + (isIncome ? 'var(--success)' : 'var(--danger)') + ';">' + AccountingEngine.formatCurrency(p.SO_TIEN_DU_KIEN) + '</td>' +
          '<td class="text-center"><span class="badge ' + (isDone ? 'badge-success' : 'badge-gold') + '">' + (isDone ? '✅ Đã thực hiện' : '⏳ Chờ thực hiện') + '</span></td>' +
          '<td class="text-center">' +
            (!isDone ? '<button class="btn btn-sm btn-gold" onclick="AppController.executePlanNow(\'' + p.ID_KE_HOACH + '\')">⚡ Thực hiện ngay</button> ' : '') +
            '<button class="btn btn-sm btn-outline" onclick="AppController.openPlanModal(\'' + p.ID_KE_HOACH + '\')">Sửa</button> ' +
            '<button class="btn btn-sm btn-danger" onclick="AppController.deletePlan(\'' + p.ID_KE_HOACH + '\')">Xóa</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }
  }

  /* ========================================================================
     7. RENDER PHÂN HỆ BÁO CÁO & THỐNG KÊ TỔNG HỢP
     ======================================================================== */
  function renderReportModule(db, m) {
    setText('repPeriodTitle', m.periodRange.label + ' (Từ ' + AccountingEngine.formatVnDate(m.periodRange.startDate) + ' đến ' + AccountingEngine.formatVnDate(m.periodRange.endDate) + ')');

    const tbody = document.getElementById('reportSummaryTableBody');
    if (tbody) {
      const rows = [
        { group: 'I. BÁO CÁO CÔNG VIỆC', name: '1. Tổng số công việc theo dõi', val: m.totalWorksCount + ' công việc (Đang làm: ' + m.inProgressWorksCount + ', Hoàn thành: ' + m.completedWorksCount + ')' },
        { group: 'I. BÁO CÁO CÔNG VIỆC', name: '2. Tổng kinh phí công việc dự kiến / được duyệt', val: AccountingEngine.formatCurrency(m.totalWorkExpected) + ' / Duyệt: ' + AccountingEngine.formatCurrency(m.totalWorkApproved) },
        { group: 'I. BÁO CÁO CÔNG VIỆC', name: '3. Tổng tiền công việc đã thực nhận lũy kế', val: AccountingEngine.formatCurrency(m.totalWorkReceivedAll) },
        { group: 'I. BÁO CÁO CÔNG VIỆC', name: '4. Tổng khoản tiền công việc CÒN ĐƯỢC NHẬN', val: AccountingEngine.formatCurrency(m.totalRemainingFromWork) },

        { group: 'II. BÁO CÁO THU NHẬP TRONG KỲ', name: '5. Tổng lương hằng tháng thực nhận', val: AccountingEngine.formatCurrency(m.salaryReceived) },
        { group: 'II. BÁO CÁO THU NHẬP TRONG KỲ', name: '6. Tổng thu nhập ngoài lương (Tiền công, hỗ trợ, làm thêm)', val: AccountingEngine.formatCurrency(m.nonSalaryIncome) },
        { group: 'II. BÁO CÁO THU NHẬP TRONG KỲ', name: '7. Dòng tiền nhận từ công việc trong kỳ (Tạm ứng + Thanh toán)', val: AccountingEngine.formatCurrency(m.workReceivedInPeriod) },
        { group: 'II. BÁO CÁO THU NHẬP TRONG KỲ', name: '8. TỔNG THU THỰC TẾ TRONG KỲ (5 + 6 + 7)', val: AccountingEngine.formatCurrency(m.totalActualIncome), bold: true },

        { group: 'III. BÁO CÁO CHI TIÊU TRONG KỲ', name: '9. Tiền đưa vợ trong kỳ (Định mức: ' + AccountingEngine.formatCurrency(m.wifeTarget) + ')', val: AccountingEngine.formatCurrency(m.wifeAllowancePaid) + ' (' + m.wifePercent + '%)' },
        { group: 'III. BÁO CÁO CHI TIÊU TRONG KỲ', name: '10. Chi phí sinh hoạt gia đình, ăn uống, con cái, viễn thông', val: AccountingEngine.formatCurrency(m.livingExpense) },
        { group: 'III. BÁO CÁO CHI TIÊU TRONG KỲ', name: '11. Chi phí xăng xe, đi lại & chi cá nhân khác', val: AccountingEngine.formatCurrency(m.otherExpense) },
        { group: 'III. BÁO CÁO CHI TIÊU TRONG KỲ', name: '12. TỔNG CHI TIÊU THỰC TẾ TRONG KỲ (9 + 10 + 11)', val: AccountingEngine.formatCurrency(m.totalExpense), bold: true },

        { group: 'IV. BÁO CÁO TÀI CHÍNH & TÀI SẢN', name: '13. DÒNG TIỀN RÒNG TRONG KỲ (Tổng thu thực tế - Tổng chi thực tế)', val: AccountingEngine.formatCurrency(m.netCashflow), bold: true },
        { group: 'IV. BÁO CÁO TÀI CHÍNH & TÀI SẢN', name: '14. Tổng tiền mặt tại ví hiện có', val: AccountingEngine.formatCurrency(m.totalCash) },
        { group: 'IV. BÁO CÁO TÀI CHÍNH & TÀI SẢN', name: '15. Tổng số dư các tài khoản Ngân hàng (MB Bank, VCB...)', val: AccountingEngine.formatCurrency(m.totalBank) },
        { group: 'IV. BÁO CÁO TÀI CHÍNH & TÀI SẢN', name: '16. Tổng tiền tích lũy trong các Sổ / Mục tiêu Tiết kiệm', val: AccountingEngine.formatCurrency(m.totalSavings) },
        { group: 'IV. BÁO CÁO TÀI CHÍNH & TÀI SẢN', name: '17. TỔNG TÀI SẢN TIỀN HIỆN CÓ (14 + 15 + 16)', val: AccountingEngine.formatCurrency(m.totalMoneyAssets), bold: true }
      ];

      tbody.innerHTML = rows.map(function(r) {
        return '<tr style="' + (r.bold ? 'background:rgba(212,175,55,0.12);font-weight:800;' : '') + '">' +
          '<td><span class="badge badge-navy">' + escapeHtml(r.group) + '</span></td>' +
          '<td style="' + (r.bold ? 'font-weight:800;color:var(--heading-color);' : '') + '">' + escapeHtml(r.name) + '</td>' +
          '<td class="text-right" style="' + (r.bold ? 'font-weight:900;font-size:14.5px;color:var(--heading-color);' : 'font-weight:700;') + '">' + escapeHtml(r.val) + '</td>' +
        '</tr>';
      }).join('');
    }
  }

  /* ========================================================================
     8. RENDER PHÂN HỆ CÀI ĐẶT, DANH MỤC & SAO LƯU
     ======================================================================== */
  function renderSettingsModule(db) {
    setInputValue('cfgOwnerName', db.config.CHU_SO_HUU || '');
    setInputValue('cfgSalaryStartDay', db.config.NGAY_BAT_DAU_KY_LUONG || '13');
    setInputValue('cfgSalaryPayDay', db.config.NGAY_NHAN_LUONG_DU_KIEN || '15');
    setInputValue('cfgExpectedSalary', db.config.LUONG_CO_BAN_DU_KIEN || '12500000');
    setInputValue('cfgWifeAllowance', db.config.DINH_MUC_DUA_VO_THANG || '10000000');
    setInputValue('cfgMonthlyBudget', db.config.NGAN_SACH_CHI_TIEU_THANG || '18000000');
    setInputValue('cfgThemeMenh', db.config.PHONG_THUY_MENH || 'KIM_THUY');
    setInputValue('cfgGasWebAppUrl', PersonalDB.getRemoteGasUrl());
    setInputValue('quickGasUrlInput', PersonalDB.getRemoteGasUrl());

    const catTbody = document.getElementById('settingsCategoryBody');
    if (catTbody) {
      const cats = (db.categories || []).filter(function(c) { return c.LOAI_DANH_MUC === categorySubTab; });
      catTbody.innerHTML = cats.map(function(c) {
        return '<tr>' +
          '<td class="text-center" style="font-size:18px;">' + escapeHtml(c.ICON || '📌') + '</td>' +
          '<td class="font-bold">' + escapeHtml(c.TEN_DANH_MUC) + '</td>' +
          '<td><span class="badge badge-navy">' + escapeHtml(c.LOAI_DANH_MUC) + '</span></td>' +
          '<td class="text-right">' + (Number(c.HAN_MUC_THANG) > 0 ? AccountingEngine.formatCurrency(c.HAN_MUC_THANG) : 'Không giới hạn') + '</td>' +
          '<td class="text-center">' +
            '<button class="btn btn-sm btn-outline" onclick="AppController.openCategoryModal(\'' + c.ID_DANH_MUC + '\')">Sửa</button> ' +
            '<button class="btn btn-sm btn-danger" onclick="AppController.deleteCategory(\'' + c.ID_DANH_MUC + '\')">Xóa</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    const logTbody = document.getElementById('systemLogsBody');
    if (logTbody) {
      const logs = (db.logs || []).slice(0, 30);
      logTbody.innerHTML = logs.map(function(l) {
        return '<tr>' +
          '<td>' + escapeHtml(l.THOI_GIAN) + '</td>' +
          '<td><span class="badge badge-info">' + escapeHtml(l.HANH_DONG) + '</span></td>' +
          '<td>' + escapeHtml(l.PHAN_HE) + '</td>' +
          '<td>' + escapeHtml(l.MO_TA_CHI_TIET) + '</td>' +
        '</tr>';
      }).join('');
    }
  }

  /* ========================================================================
     CÁC HÀM MỞ MODAL & LƯU DỮ LIỆU NGHIỆP VỤ
     ======================================================================== */
  function openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add('open');
  }

  function closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('open');
  }

  function populateCategorySelect(selectId, type) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const db = PersonalDB.getState();
    const cats = (db.categories || []).filter(function(c) { return c.LOAI_DANH_MUC === type; });
    sel.innerHTML = cats.map(function(c) {
      return '<option value="' + escapeHtml(c.TEN_DANH_MUC) + '">' + (c.ICON || '') + ' ' + escapeHtml(c.TEN_DANH_MUC) + '</option>';
    }).join('');
  }

  function populateAccountSelect(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const db = PersonalDB.getState();
    sel.innerHTML = (db.accounts || []).map(function(a) {
      return '<option value="' + escapeHtml(a.ID_TAI_KHOAN) + '">' + escapeHtml(a.TEN_TAI_KHOAN) + ' (' + escapeHtml(a.NGAN_HANG) + ')</option>';
    }).join('');
  }

  function openWorkModal(workId) {
    populateCategorySelect('formWorkCategory', 'CONG_VIEC');
    const db = PersonalDB.getState();
    const existing = workId ? (db.works || []).find(function(w) { return w.ID_CONG_VIEC === workId; }) : null;

    setInputValue('formWorkId', existing ? existing.ID_CONG_VIEC : '');
    setInputValue('formWorkName', existing ? existing.TEN_CONG_VIEC : '');
    setInputValue('formWorkCategory', existing ? existing.NHOM_CONG_VIEC : 'Văn hóa');
    setInputValue('formWorkAssigner', existing ? existing.NGUOI_GIAO : '');
    setInputValue('formWorkLocation', existing ? existing.DIA_DIEM : '');
    setInputValue('formWorkStart', existing ? existing.NGAY_BAT_DAU : '2026-11-01');
    setInputValue('formWorkEnd', existing ? existing.NGAY_KET_THUC : '2026-11-03');
    setInputValue('formWorkSessions', existing ? existing.SO_BUOI : '');
    setInputValue('formWorkExpected', existing ? existing.DU_KIEN_THU : '');
    setInputValue('formWorkApproved', existing ? existing.DUOC_DUYET : '');
    setInputValue('formWorkDueDate', existing ? existing.HAN_THANH_TOAN : '2026-11-15');
    setInputValue('formWorkStatus', existing ? existing.TRANG_THAI : 'Đang thực hiện');
    setInputValue('formWorkDesc', existing ? existing.NOI_DUNG : '');
    setInputValue('formWorkNote', existing ? existing.GHI_CHU : '');
    setInputValue('formWorkDoc', existing ? existing.TAI_LIEU : '');

    updateWorkDaysPreview();
    openModal('modalWork');
  }

  function updateWorkDaysPreview() {
    const s = document.getElementById('formWorkStart').value;
    const e = document.getElementById('formWorkEnd').value;
    const days = AccountingEngine.calcDaysInclusive(s, e);
    setText('formWorkDaysCalculated', days + ' ngày (Từ ' + AccountingEngine.formatVnDate(s) + ' đến ' + AccountingEngine.formatVnDate(e) + ')');
  }

  function saveWorkFromModal() {
    const name = document.getElementById('formWorkName').value.trim();
    if (!name) {
      alert('Vui lòng nhập Tên công việc!');
      return;
    }
    const start = document.getElementById('formWorkStart').value || '2026-11-01';
    const end = document.getElementById('formWorkEnd').value || start;
    const days = AccountingEngine.calcDaysInclusive(start, end);

    const item = {
      ID_CONG_VIEC: document.getElementById('formWorkId').value || PersonalDB.generateId('CV'),
      TEN_CONG_VIEC: name,
      NHOM_CONG_VIEC: document.getElementById('formWorkCategory').value,
      NGUOI_GIAO: document.getElementById('formWorkAssigner').value.trim(),
      DIA_DIEM: document.getElementById('formWorkLocation').value.trim(),
      NGAY_BAT_DAU: start,
      NGAY_KET_THUC: end,
      SO_NGAY: days,
      SO_BUOI: document.getElementById('formWorkSessions').value.trim() || (days + ' ngày'),
      DU_KIEN_THU: Number(document.getElementById('formWorkExpected').value) || 0,
      DUOC_DUYET: Number(document.getElementById('formWorkApproved').value) || 0,
      HAN_THANH_TOAN: document.getElementById('formWorkDueDate').value,
      TRANG_THAI: document.getElementById('formWorkStatus').value,
      NOI_DUNG: document.getElementById('formWorkDesc').value.trim(),
      GHI_CHU: document.getElementById('formWorkNote').value.trim(),
      TAI_LIEU: document.getElementById('formWorkDoc').value.trim()
    };

    PersonalDB.upsertCollection('works', 'ID_CONG_VIEC', item, 'CV', item.TEN_CONG_VIEC);
    closeModal('modalWork');
    refreshAllViews();
    showToast('✅ Đã lưu công việc: ' + item.TEN_CONG_VIEC);
  }

  function deleteWork(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa công việc này?')) return;
    PersonalDB.deleteFromCollection('works', 'ID_CONG_VIEC', id, 'công việc');
    refreshAllViews();
    showToast('🗑️ Đã xóa công việc.');
  }

  function openWorkTxModal(preselectedWorkId, defaultType) {
    const db = PersonalDB.getState();
    const workSel = document.getElementById('formWorkTxWorkId');
    if (workSel) {
      workSel.innerHTML = (db.works || []).map(function(w) {
        return '<option value="' + escapeHtml(w.ID_CONG_VIEC) + '">' + escapeHtml(w.TEN_CONG_VIEC) + '</option>';
      }).join('');
    }
    populateAccountSelect('formWorkTxAccount');

    if (preselectedWorkId) setInputValue('formWorkTxWorkId', preselectedWorkId);
    setInputValue('formWorkTxType', defaultType || 'Tạm ứng nhận được');
    setInputValue('formWorkTxDate', '2026-11-01');
    setInputValue('formWorkTxAmount', '');
    setInputValue('formWorkTxDesc', '');
    setInputValue('formWorkTxDoc', '');
    openModal('modalWorkTx');
  }

  function saveWorkTxFromModal() {
    const workId = document.getElementById('formWorkTxWorkId').value;
    const amount = Number(document.getElementById('formWorkTxAmount').value) || 0;
    if (!workId || amount <= 0) {
      alert('Vui lòng chọn công việc và nhập số tiền lớn hơn 0!');
      return;
    }

    const tx = {
      ID_GIAO_DICH: PersonalDB.generateId('GDCV'),
      ID_CONG_VIEC: workId,
      NGAY_GIAO_DICH: document.getElementById('formWorkTxDate').value || '2026-11-01',
      LOAI_GIAO_DICH: document.getElementById('formWorkTxType').value,
      SO_TIEN: amount,
      TAI_KHOAN_ID: document.getElementById('formWorkTxAccount').value,
      NOI_DUNG: document.getElementById('formWorkTxDesc').value.trim() || document.getElementById('formWorkTxType').value,
      CHUNG_TU: document.getElementById('formWorkTxDoc').value.trim()
    };

    PersonalDB.upsertCollection('workTransactions', 'ID_GIAO_DICH', tx, 'GDCV', tx.NOI_DUNG);

    const db = PersonalDB.getState();
    const enriched = AccountingEngine.computeEnrichedWorks(db).find(function(w) { return w.ID_CONG_VIEC === workId; });
    if (enriched && enriched.DUOC_DUYET > 0 && enriched._netReceived >= enriched.DUOC_DUYET) {
      const targetWork = db.works.find(function(w) { return w.ID_CONG_VIEC === workId; });
      if (targetWork) {
        targetWork.TRANG_THAI = 'Đã thanh toán đủ';
        PersonalDB.saveLocalState();
      }
    }

    closeModal('modalWorkTx');
    refreshAllViews();
    showToast('✅ Đã ghi nhận ' + tx.LOAI_GIAO_DICH + ': ' + AccountingEngine.formatCurrency(amount));
  }

  function deleteWorkTx(id) {
    if (!confirm('Xóa giao dịch tạm ứng/thanh toán này?')) return;
    PersonalDB.deleteFromCollection('workTransactions', 'ID_GIAO_DICH', id, 'giao dịch công việc');
    refreshAllViews();
    showToast('🗑️ Đã xóa giao dịch công việc.');
  }

  function openWorkDetailModal(workId) {
    const db = PersonalDB.getState();
    const enriched = AccountingEngine.computeEnrichedWorks(db).find(function(w) { return w.ID_CONG_VIEC === workId; });
    if (!enriched) return;

    const accMap = {};
    (db.accounts || []).forEach(function(a) { accMap[a.ID_TAI_KHOAN] = a.TEN_TAI_KHOAN; });

    const body = document.getElementById('workDetailModalBody');
    if (body) {
      const txsHtml = enriched._transactions.length === 0
        ? '<tr><td colspan="5" class="text-center" style="padding:16px;color:var(--text-muted);">Chưa có giao dịch tạm ứng hay thanh toán nào.</td></tr>'
        : enriched._transactions.map(function(t) {
            return '<tr>' +
              '<td>' + AccountingEngine.formatVnDate(t.NGAY_GIAO_DICH) + '</td>' +
              '<td><span class="badge badge-info">' + escapeHtml(t.LOAI_GIAO_DICH) + '</span></td>' +
              '<td>' + escapeHtml(t.NOI_DUNG) + '</td>' +
              '<td>' + escapeHtml(accMap[t.TAI_KHOAN_ID] || t.TAI_KHOAN_ID) + '</td>' +
              '<td class="text-right font-bold">' + AccountingEngine.formatCurrency(t.SO_TIEN) + '</td>' +
            '</tr>';
          }).join('');

      body.innerHTML =
        '<div style="background:var(--bg-subtle);padding:14px;border-radius:12px;margin-bottom:14px;border:1px solid var(--border-color);">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
            '<div><span class="badge badge-navy">' + escapeHtml(enriched.ID_CONG_VIEC) + '</span> <span class="badge badge-info">' + escapeHtml(enriched.NHOM_CONG_VIEC) + '</span></div>' +
            renderWorkStatusBadge(enriched.TRANG_THAI) +
          '</div>' +
          '<h3 style="margin:8px 0 4px;color:var(--heading-color);">' + escapeHtml(enriched.TEN_CONG_VIEC) + '</h3>' +
          '<p style="font-size:13px;color:var(--text-secondary);">' + escapeHtml(enriched.NOI_DUNG) + '</p>' +
          '<div style="font-size:12px;color:var(--text-muted);margin-top:6px;">👤 Đơn vị giao: <b>' + escapeHtml(enriched.NGUOI_GIAO) + '</b> • 📍 Địa điểm: <b>' + escapeHtml(enriched.DIA_DIEM) + '</b> • ⏱️ Thời gian: <b>' + AccountingEngine.formatVnDate(enriched.NGAY_BAT_DAU) + ' → ' + AccountingEngine.formatVnDate(enriched.NGAY_KET_THUC) + ' (' + enriched.SO_NGAY + ' ngày)</b></div>' +
        '</div>' +
        '<div class="kpi-grid-4" style="margin-bottom:14px;">' +
          '<div class="kpi-card"><div class="kpi-title">Dự kiến thu</div><div class="kpi-value">' + AccountingEngine.formatCurrency(enriched.DU_KIEN_THU) + '</div></div>' +
          '<div class="kpi-card"><div class="kpi-title">Số tiền được duyệt</div><div class="kpi-value text-gold">' + (enriched.DUOC_DUYET > 0 ? AccountingEngine.formatCurrency(enriched.DUOC_DUYET) : 'Chưa duyệt') + '</div></div>' +
          '<div class="kpi-card"><div class="kpi-title">Tổng tiền đã nhận</div><div class="kpi-value text-success">' + AccountingEngine.formatCurrency(enriched._netReceived) + '</div></div>' +
          '<div class="kpi-card"><div class="kpi-title">Còn được nhận</div><div class="kpi-value text-danger">' + AccountingEngine.formatCurrency(enriched._remaining) + '</div></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
          '<h4 style="color:var(--heading-color);">Lịch sử Tạm ứng & Thanh toán của công việc này</h4>' +
          '<button class="btn btn-sm btn-gold" onclick="AppController.closeModal(\'modalWorkDetail\');AppController.openWorkTxModal(\'' + enriched.ID_CONG_VIEC + '\')">+ Thêm Tạm ứng / Thanh toán</button>' +
        '</div>' +
        '<div class="table-responsive"><table class="data-table"><thead><tr><th>Ngày</th><th>Loại giao dịch</th><th>Nội dung</th><th>Tài khoản</th><th class="text-right">Số tiền</th></tr></thead><tbody>' + txsHtml + '</tbody></table></div>';
    }
    openModal('modalWorkDetail');
  }

  function openIncomeModal(incId) {
    populateCategorySelect('formIncomeType', 'THU_NHAP');
    populateAccountSelect('formIncomeAccount');
    const db = PersonalDB.getState();
    const existing = incId ? (db.incomes || []).find(function(i) { return i.ID_THU === incId; }) : null;

    setInputValue('formIncomeId', existing ? existing.ID_THU : '');
    setInputValue('formIncomeDate', existing ? existing.NGAY_THU : '2026-11-01');
    setInputValue('formIncomeType', existing ? existing.LOAI_THU : 'Lương hằng tháng');
    setInputValue('formIncomeAmount', existing ? existing.SO_TIEN : '');
    setInputValue('formIncomeAccount', existing ? existing.TAI_KHOAN_ID : 'TK-MB-BANK');
    setInputValue('formIncomePeriod', existing ? existing.KY_LUONG : '2026-11');
    setInputValue('formIncomeDesc', existing ? existing.NOI_DUNG : '');
    setInputValue('formIncomeNote', existing ? existing.GHI_CHU : '');
    openModal('modalIncome');
  }

  function saveIncomeFromModal() {
    const amount = Number(document.getElementById('formIncomeAmount').value) || 0;
    if (amount <= 0) {
      alert('Vui lòng nhập số tiền thu nhập lớn hơn 0!');
      return;
    }
    const type = document.getElementById('formIncomeType').value;
    const item = {
      ID_THU: document.getElementById('formIncomeId').value || PersonalDB.generateId('THU'),
      NGAY_THU: document.getElementById('formIncomeDate').value || '2026-11-01',
      LOAI_THU: type,
      SO_TIEN: amount,
      DU_KIEN: amount,
      TAI_KHOAN_ID: document.getElementById('formIncomeAccount').value,
      KY_LUONG: document.getElementById('formIncomePeriod').value || '2026-11',
      NOI_DUNG: document.getElementById('formIncomeDesc').value.trim() || type,
      GHI_CHU: document.getElementById('formIncomeNote').value.trim()
    };
    PersonalDB.upsertCollection('incomes', 'ID_THU', item, 'THU', item.NOI_DUNG);
    closeModal('modalIncome');
    refreshAllViews();
    showToast('💰 Đã ghi nhận khoản thu: ' + AccountingEngine.formatCurrency(amount));
  }

  function deleteIncome(id) {
    if (!confirm('Xóa khoản thu nhập này?')) return;
    PersonalDB.deleteFromCollection('incomes', 'ID_THU', id, 'khoản thu nhập');
    refreshAllViews();
    showToast('🗑️ Đã xóa khoản thu nhập.');
  }

  function openExpenseModal(expId, presetCategory) {
    populateCategorySelect('formExpenseCategory', 'CHI_TIEU');
    populateAccountSelect('formExpenseAccount');
    const db = PersonalDB.getState();
    const existing = expId ? (db.expenses || []).find(function(e) { return e.ID_CHI === expId; }) : null;

    setInputValue('formExpenseId', existing ? existing.ID_CHI : '');
    setInputValue('formExpenseDate', existing ? existing.NGAY_CHI : '2026-11-01');
    setInputValue('formExpenseCategory', existing ? existing.NHOM_CHI : (presetCategory || 'Ăn uống'));
    setInputValue('formExpenseAmount', existing ? existing.SO_TIEN : '');
    setInputValue('formExpenseAccount', existing ? existing.TAI_KHOAN_ID : (presetCategory === 'Đưa vợ' ? 'TK-MB-BANK' : 'TK-TIEN-MAT'));
    setInputValue('formExpenseMethod', existing ? existing.HINH_THUC_TT : (presetCategory === 'Đưa vợ' ? 'Chuyển khoản' : 'Tiền mặt'));
    setInputValue('formExpenseDesc', existing ? existing.NOI_DUNG : (presetCategory === 'Đưa vợ' ? 'Đưa vợ tiền sinh hoạt gia đình trong kỳ' : ''));
    setInputValue('formExpenseNote', existing ? existing.GHI_CHU : '');
    openModal('modalExpense');
  }

  function saveExpenseFromModal() {
    const amount = Number(document.getElementById('formExpenseAmount').value) || 0;
    if (amount <= 0) {
      alert('Vui lòng nhập số tiền chi tiêu lớn hơn 0!');
      return;
    }
    const cat = document.getElementById('formExpenseCategory').value;
    const item = {
      ID_CHI: document.getElementById('formExpenseId').value || PersonalDB.generateId('CHI'),
      NGAY_CHI: document.getElementById('formExpenseDate').value || '2026-11-01',
      NHOM_CHI: cat,
      SO_TIEN: amount,
      TAI_KHOAN_ID: document.getElementById('formExpenseAccount').value,
      HINH_THUC_TT: document.getElementById('formExpenseMethod').value,
      LOAI_CHI: cat === 'Đưa vợ' ? 'Gia đình ưu tiên' : 'Chi thường xuyên',
      NOI_DUNG: document.getElementById('formExpenseDesc').value.trim() || cat,
      GHI_CHU: document.getElementById('formExpenseNote').value.trim()
    };
    PersonalDB.upsertCollection('expenses', 'ID_CHI', item, 'CHI', item.NOI_DUNG);
    closeModal('modalExpense');
    refreshAllViews();
    showToast((cat === 'Đưa vợ' ? '💝 Đã ghi nhận Đưa vợ: ' : '💸 Đã ghi nhận khoản chi: ') + AccountingEngine.formatCurrency(amount));
  }

  function deleteExpense(id) {
    if (!confirm('Xóa khoản chi tiêu này?')) return;
    PersonalDB.deleteFromCollection('expenses', 'ID_CHI', id, 'khoản chi tiêu');
    refreshAllViews();
    showToast('🗑️ Đã xóa khoản chi tiêu.');
  }

  function openAccountModal(accId) {
    const db = PersonalDB.getState();
    const existing = accId ? (db.accounts || []).find(function(a) { return a.ID_TAI_KHOAN === accId; }) : null;
    setInputValue('formAccId', existing ? existing.ID_TAI_KHOAN : '');
    setInputValue('formAccName', existing ? existing.TEN_TAI_KHOAN : '');
    setInputValue('formAccType', existing ? existing.LOAI_TAI_KHOAN : 'NGAN_HANG');
    setInputValue('formAccBank', existing ? existing.NGAN_HANG : '');
    setInputValue('formAccInitial', existing ? existing.SO_DU_BAN_DAU : '0');
    setInputValue('formAccNote', existing ? existing.SO_TAI_KHOAN_GHI_CHU : '');
    openModal('modalAccount');
  }

  function saveAccountFromModal() {
    const name = document.getElementById('formAccName').value.trim();
    if (!name) {
      alert('Vui lòng nhập tên tài khoản!');
      return;
    }
    const item = {
      ID_TAI_KHOAN: document.getElementById('formAccId').value || PersonalDB.generateId('TK'),
      TEN_TAI_KHOAN: name,
      LOAI_TAI_KHOAN: document.getElementById('formAccType').value,
      NGAN_HANG: document.getElementById('formAccBank').value.trim() || name,
      SO_DU_BAN_DAU: Number(document.getElementById('formAccInitial').value) || 0,
      NGAY_BAT_DAU: '2026-10-01',
      SO_TAI_KHOAN_GHI_CHU: document.getElementById('formAccNote').value.trim(),
      TRANG_THAI: 'DANG_SU_DUNG'
    };
    PersonalDB.upsertCollection('accounts', 'ID_TAI_KHOAN', item, 'TK', item.TEN_TAI_KHOAN);
    closeModal('modalAccount');
    refreshAllViews();
    showToast('🏦 Đã lưu tài khoản: ' + item.TEN_TAI_KHOAN);
  }

  function openTransferModal() {
    populateAccountSelect('formTransferFrom');
    populateAccountSelect('formTransferTo');
    const db = PersonalDB.getState();
    if (db.accounts && db.accounts.length > 1) {
      setInputValue('formTransferFrom', db.accounts[1].ID_TAI_KHOAN);
      setInputValue('formTransferTo', db.accounts[0].ID_TAI_KHOAN);
    }
    setInputValue('formTransferDate', '2026-11-01');
    setInputValue('formTransferAmount', '');
    setInputValue('formTransferDesc', 'Chuyển tiền nội bộ giữa các tài khoản');
    openModal('modalTransfer');
  }

  function saveTransferFromModal() {
    const fromId = document.getElementById('formTransferFrom').value;
    const toId = document.getElementById('formTransferTo').value;
    const amount = Number(document.getElementById('formTransferAmount').value) || 0;
    if (fromId === toId) {
      alert('Tài khoản nguồn và tài khoản đích phải khác nhau!');
      return;
    }
    if (amount <= 0) {
      alert('Vui lòng nhập số tiền chuyển lớn hơn 0!');
      return;
    }
    const item = {
      ID_CHUYEN_TIEN: PersonalDB.generateId('CK'),
      NGAY_CHUYEN: document.getElementById('formTransferDate').value || '2026-11-01',
      LOAI_CHUYEN: 'NOI_BO',
      TAI_KHOAN_DI: fromId,
      TAI_KHOAN_DEN: toId,
      SO_TIEN: amount,
      NOI_DUNG: document.getElementById('formTransferDesc').value.trim() || 'Chuyển tiền nội bộ'
    };
    PersonalDB.upsertCollection('transfers', 'ID_CHUYEN_TIEN', item, 'CK', item.NOI_DUNG);
    closeModal('modalTransfer');
    refreshAllViews();
    showToast('🔄 Đã chuyển tiền nội bộ: ' + AccountingEngine.formatCurrency(amount));
  }

  function deleteTransfer(id) {
    if (!confirm('Xóa giao dịch chuyển tiền này?')) return;
    PersonalDB.deleteFromCollection('transfers', 'ID_CHUYEN_TIEN', id, 'chuyển tiền');
    refreshAllViews();
    showToast('🗑️ Đã xóa giao dịch chuyển tiền.');
  }

  function openSavingGoalModal(savingId) {
    const db = PersonalDB.getState();
    const existing = savingId ? (db.savings || []).find(function(s) { return s.ID_TIET_KIEM === savingId; }) : null;
    setInputValue('formSavingId', existing ? existing.ID_TIET_KIEM : '');
    setInputValue('formSavingName', existing ? existing.TEN_MUC_TIEU : '');
    setInputValue('formSavingTarget', existing ? existing.SO_TIEN_MUC_TIEU : '');
    setInputValue('formSavingCurrent', existing ? existing.SO_TIEN_HIEN_TAI : '0');
    setInputValue('formSavingPlace', existing ? existing.NOI_GUI : 'Sổ Tiết kiệm MB Bank');
    setInputValue('formSavingRate', existing ? existing.LAI_SUAT_NAM : '5.8');
    setInputValue('formSavingDeadline', existing ? existing.HAN_HOAN_THANH : '2026-12-31');
    openModal('modalSavingGoal');
  }

  function saveSavingGoalFromModal() {
    const name = document.getElementById('formSavingName').value.trim();
    if (!name) {
      alert('Vui lòng nhập tên mục tiêu tiết kiệm!');
      return;
    }
    const item = {
      ID_TIET_KIEM: document.getElementById('formSavingId').value || PersonalDB.generateId('TKM'),
      TEN_MUC_TIEU: name,
      SO_TIEN_MUC_TIEU: Number(document.getElementById('formSavingTarget').value) || 0,
      SO_TIEN_HIEN_TAI: Number(document.getElementById('formSavingCurrent').value) || 0,
      NOI_GUI: document.getElementById('formSavingPlace').value.trim(),
      LAI_SUAT_NAM: Number(document.getElementById('formSavingRate').value) || 0,
      NGAY_BAT_DAU: '2026-11-01',
      HAN_HOAN_THANH: document.getElementById('formSavingDeadline').value,
      TRANG_THAI: 'Đang tích lũy'
    };
    PersonalDB.upsertCollection('savings', 'ID_TIET_KIEM', item, 'TKM', item.TEN_MUC_TIEU);
    closeModal('modalSavingGoal');
    refreshAllViews();
    showToast('🐷 Đã lưu mục tiêu tiết kiệm: ' + item.TEN_MUC_TIEU);
  }

  function openSavingTxModal(savingId, mode) {
    const db = PersonalDB.getState();
    const sel = document.getElementById('formSavingTxGoalId');
    if (sel) {
      sel.innerHTML = (db.savings || []).map(function(s) {
        return '<option value="' + escapeHtml(s.ID_TIET_KIEM) + '">' + escapeHtml(s.TEN_MUC_TIEU) + ' (Hiện có: ' + AccountingEngine.formatCurrency(s.SO_TIEN_HIEN_TAI) + ')</option>';
      }).join('');
    }
    populateAccountSelect('formSavingTxAccount');
    if (savingId) setInputValue('formSavingTxGoalId', savingId);
    setInputValue('formSavingTxType', mode || 'GUI_TIET_KIEM');
    setInputValue('formSavingTxDate', '2026-11-01');
    setInputValue('formSavingTxAmount', '');
    setInputValue('formSavingTxNote', '');
    openModal('modalSavingTx');
  }

  function saveSavingTxFromModal() {
    const savingId = document.getElementById('formSavingTxGoalId').value;
    const txType = document.getElementById('formSavingTxType').value;
    const accId = document.getElementById('formSavingTxAccount').value;
    const amount = Number(document.getElementById('formSavingTxAmount').value) || 0;
    if (!savingId || amount <= 0) {
      alert('Vui lòng chọn mục tiêu tiết kiệm và nhập số tiền hợp lệ!');
      return;
    }

    const db = PersonalDB.getState();
    const goal = (db.savings || []).find(function(s) { return s.ID_TIET_KIEM === savingId; });
    if (!goal) return;

    if (txType === 'RUT_TIET_KIEM' && amount > Number(goal.SO_TIEN_HIEN_TAI)) {
      alert('Số tiền rút vượt quá số dư hiện có trong mục tiêu tiết kiệm này!');
      return;
    }

    goal.SO_TIEN_HIEN_TAI = txType === 'GUI_TIET_KIEM'
      ? (Number(goal.SO_TIEN_HIEN_TAI) + amount)
      : (Number(goal.SO_TIEN_HIEN_TAI) - amount);
    PersonalDB.upsertCollection('savings', 'ID_TIET_KIEM', goal, 'TKM', goal.TEN_MUC_TIEU);

    const tr = {
      ID_CHUYEN_TIEN: PersonalDB.generateId('CK'),
      NGAY_CHUYEN: document.getElementById('formSavingTxDate').value || '2026-11-01',
      LOAI_CHUYEN: txType,
      TAI_KHOAN_DI: txType === 'GUI_TIET_KIEM' ? accId : 'QUY_TIET_KIEM',
      TAI_KHOAN_DEN: txType === 'GUI_TIET_KIEM' ? 'QUY_TIET_KIEM' : accId,
      ID_TIET_KIEM: savingId,
      SO_TIEN: amount,
      NOI_DUNG: (txType === 'GUI_TIET_KIEM' ? 'Gửi tiết kiệm: ' : 'Rút tiết kiệm: ') + goal.TEN_MUC_TIEU
    };
    PersonalDB.upsertCollection('transfers', 'ID_CHUYEN_TIEN', tr, 'CK', tr.NOI_DUNG);

    closeModal('modalSavingTx');
    refreshAllViews();
    showToast('🐷 Đã cập nhật sổ tiết kiệm: ' + AccountingEngine.formatCurrency(amount));
  }

  function deleteSaving(id) {
    if (!confirm('Xóa mục tiêu tiết kiệm này?')) return;
    PersonalDB.deleteFromCollection('savings', 'ID_TIET_KIEM', id, 'mục tiêu tiết kiệm');
    refreshAllViews();
    showToast('🗑️ Đã xóa mục tiêu tiết kiệm.');
  }

  function openPlanModal(planId) {
    const db = PersonalDB.getState();
    const existing = planId ? (db.plans || []).find(function(p) { return p.ID_KE_HOACH === planId; }) : null;
    setInputValue('formPlanId', existing ? existing.ID_KE_HOACH : '');
    setInputValue('formPlanType', existing ? existing.LOAI_KE_HOACH : 'DU_CHI');
    setInputValue('formPlanCategory', existing ? existing.NHOM_HANG_MUC : 'Sinh hoạt gia đình');
    setInputValue('formPlanDate', existing ? existing.NGAY_DU_KIEN : '2026-11-10');
    setInputValue('formPlanAmount', existing ? existing.SO_TIEN_DU_KIEN : '');
    setInputValue('formPlanDesc', existing ? existing.NOI_DUNG : '');
    setInputValue('formPlanNote', existing ? existing.GHI_CHU : '');
    openModal('modalPlan');
  }

  function savePlanFromModal() {
    const amount = Number(document.getElementById('formPlanAmount').value) || 0;
    if (amount <= 0) {
      alert('Vui lòng nhập số tiền dự kiến lớn hơn 0!');
      return;
    }
    const item = {
      ID_KE_HOACH: document.getElementById('formPlanId').value || PersonalDB.generateId('KH'),
      LOAI_KE_HOACH: document.getElementById('formPlanType').value,
      NHOM_HANG_MUC: document.getElementById('formPlanCategory').value.trim() || 'Hạng mục kế hoạch',
      NGAY_DU_KIEN: document.getElementById('formPlanDate').value || '2026-11-10',
      SO_TIEN_DU_KIEN: amount,
      NOI_DUNG: document.getElementById('formPlanDesc').value.trim(),
      GHI_CHU: document.getElementById('formPlanNote').value.trim(),
      KY_LUONG: '2026-11',
      TRANG_THAI: 'CHO_THUC_HIEN'
    };
    PersonalDB.upsertCollection('plans', 'ID_KE_HOACH', item, 'KH', item.NOI_DUNG);
    closeModal('modalPlan');
    refreshAllViews();
    showToast('📅 Đã lưu kế hoạch Dự thu / Dự chi!');
  }

  function executePlanNow(planId) {
    const db = PersonalDB.getState();
    const plan = (db.plans || []).find(function(p) { return p.ID_KE_HOACH === planId; });
    if (!plan) return;

    if (!confirm('Xác nhận chuyển khoản "' + plan.NOI_DUNG + '" (' + AccountingEngine.formatCurrency(plan.SO_TIEN_DU_KIEN) + ') thành giao dịch THỰC TẾ và cập nhật vào số dư tài khoản MB Bank?')) {
      return;
    }

    if (plan.LOAI_KE_HOACH === 'DU_THU') {
      PersonalDB.upsertCollection('incomes', 'ID_THU', {
        ID_THU: PersonalDB.generateId('THU'),
        NGAY_THU: '2026-11-01',
        LOAI_THU: plan.NHOM_HANG_MUC,
        NOI_DUNG: plan.NOI_DUNG + ' (Thực hiện từ Dự thu)',
        SO_TIEN: Number(plan.SO_TIEN_DU_KIEN),
        DU_KIEN: Number(plan.SO_TIEN_DU_KIEN),
        TAI_KHOAN_ID: 'TK-MB-BANK',
        KY_LUONG: '2026-11'
      }, 'THU', plan.NOI_DUNG);
    } else {
      PersonalDB.upsertCollection('expenses', 'ID_CHI', {
        ID_CHI: PersonalDB.generateId('CHI'),
        NGAY_CHI: '2026-11-01',
        NHOM_CHI: plan.NHOM_HANG_MUC,
        NOI_DUNG: plan.NOI_DUNG + ' (Thực hiện từ Dự chi)',
        SO_TIEN: Number(plan.SO_TIEN_DU_KIEN),
        TAI_KHOAN_ID: 'TK-MB-BANK',
        HINH_THUC_TT: 'Chuyển khoản'
      }, 'CHI', plan.NOI_DUNG);
    }

    plan.TRANG_THAI = 'DA_THUC_HIEN';
    PersonalDB.upsertCollection('plans', 'ID_KE_HOACH', plan, 'KH', plan.NOI_DUNG);
    refreshAllViews();
    showToast('⚡ Đã chuyển Dự kiến thành Giao dịch Thực tế!');
  }

  function deletePlan(id) {
    if (!confirm('Xóa khoản dự thu/dự chi này?')) return;
    PersonalDB.deleteFromCollection('plans', 'ID_KE_HOACH', id, 'kế hoạch');
    refreshAllViews();
    showToast('🗑️ Đã xóa kế hoạch.');
  }

  function saveQuickGasUrl() {
    const url = (document.getElementById('quickGasUrlInput').value || '').trim();
    PersonalDB.setRemoteGasUrl(url);
    setInputValue('cfgGasWebAppUrl', url);
    if (!url) {
      showToast('ℹ️ Đã xóa đường dẫn kết nối Google Apps Script.');
      return;
    }
    showToast('⏳ Đang kết nối và đồng bộ dữ liệu từ Google Sheets...');
    PersonalDB.fetchFromCloud(function(ok, msg) {
      refreshAllViews();
      showToast(ok ? ('✅ ' + msg) : ('⚠️ ' + msg));
    });
  }

  function saveSettingsConfig() {
    const db = PersonalDB.getState();
    db.config.CHU_SO_HUU = document.getElementById('cfgOwnerName').value.trim();
    db.config.NGAY_BAT_DAU_KY_LUONG = document.getElementById('cfgSalaryStartDay').value;
    db.config.NGAY_NHAN_LUONG_DU_KIEN = document.getElementById('cfgSalaryPayDay').value;
    db.config.LUONG_CO_BAN_DU_KIEN = document.getElementById('cfgExpectedSalary').value;
    db.config.DINH_MUC_DUA_VO_THANG = document.getElementById('cfgWifeAllowance').value;
    db.config.NGAN_SACH_CHI_TIEU_THANG = document.getElementById('cfgMonthlyBudget').value;
    const theme = document.getElementById('cfgThemeMenh').value;
    const gasUrl = document.getElementById('cfgGasWebAppUrl').value.trim();

    PersonalDB.setRemoteGasUrl(gasUrl);
    applyFengShuiTheme(theme, false);
    PersonalDB.addLog('CAP_NHAT_CAU_HINH', 'CAU_HINH', 'ALL', 'Cập nhật cấu hình Kỳ lương, Định mức đưa vợ & Phong thủy');
    PersonalDB.saveLocalState();
    refreshAllViews();
    showToast('✅ Đã lưu toàn bộ Cấu hình Hệ thống & Kỳ lương!');
  }

  function switchCategorySubTab(type) {
    categorySubTab = type;
    refreshAllViews();
  }

  function openCategoryModal(catId) {
    const db = PersonalDB.getState();
    const existing = catId ? (db.categories || []).find(function(c) { return c.ID_DANH_MUC === catId; }) : null;
    setInputValue('formCatId', existing ? existing.ID_DANH_MUC : '');
    setInputValue('formCatType', existing ? existing.LOAI_DANH_MUC : categorySubTab);
    setInputValue('formCatName', existing ? existing.TEN_DANH_MUC : '');
    setInputValue('formCatIcon', existing ? existing.ICON : '📌');
    setInputValue('formCatLimit', existing ? existing.HAN_MUC_THANG : '0');
    openModal('modalCategory');
  }

  function saveCategoryFromModal() {
    const name = document.getElementById('formCatName').value.trim();
    if (!name) {
      alert('Vui lòng nhập tên danh mục!');
      return;
    }
    const item = {
      ID_DANH_MUC: document.getElementById('formCatId').value || PersonalDB.generateId('DM'),
      LOAI_DANH_MUC: document.getElementById('formCatType').value,
      TEN_DANH_MUC: name,
      ICON: document.getElementById('formCatIcon').value.trim() || '📌',
      HAN_MUC_THANG: Number(document.getElementById('formCatLimit').value) || 0,
      TRANG_THAI: 'DANG_SU_DUNG'
    };
    PersonalDB.upsertCollection('categories', 'ID_DANH_MUC', item, 'DM', item.TEN_DANH_MUC);
    closeModal('modalCategory');
    refreshAllViews();
    showToast('✅ Đã lưu danh mục: ' + item.TEN_DANH_MUC);
  }

  function deleteCategory(id) {
    if (!confirm('Xóa danh mục này?')) return;
    PersonalDB.deleteFromCollection('categories', 'ID_DANH_MUC', id, 'danh mục');
    refreshAllViews();
    showToast('🗑️ Đã xóa danh mục.');
  }

  function exportExcelCsv() {
    const db = PersonalDB.getState();
    const periodRange = AccountingEngine.getPeriodDateRange(currentPeriodMode, db.config, customStartDate, customEndDate);
    const m = AccountingEngine.computeFullMetrics(db, periodRange);

    const lines = [
      ['HỆ THỐNG SỔ TAY CÁ NHÂN - BÁO CÁO TỔNG HỢP CÔNG VIỆC & TÀI CHÍNH'],
      ['Kỳ thống kê:', periodRange.label, 'Từ ngày:', periodRange.startDate, 'Đến ngày:', periodRange.endDate],
      [],
      ['I. TỔNG HỢP CHỈ SỐ CHÍNH', 'GIÁ TRỊ (VND)'],
      ['Tổng lương thực nhận', m.salaryReceived],
      ['Tổng thu nhập ngoài lương', m.nonSalaryIncome],
      ['Tổng tiền thực nhận từ công việc trong kỳ', m.workReceivedInPeriod],
      ['TỔNG THU THỰC TẾ TRONG KỲ', m.totalActualIncome],
      ['Tiền đưa vợ trong kỳ', m.wifeAllowancePaid],
      ['Chi phí sinh hoạt & ăn uống', m.livingExpense],
      ['Chi phí khác', m.otherExpense],
      ['TỔNG CHI TIÊU THỰC TẾ TRONG KỲ', m.totalExpense],
      ['DÒNG TIỀN RÒNG TRONG KỲ', m.netCashflow],
      ['Khoản tiền công việc còn phải nhận', m.totalRemainingFromWork],
      ['Tổng tiền mặt hiện có', m.totalCash],
      ['Tổng tiền ngân hàng hiện có', m.totalBank],
      ['Tổng tiền tiết kiệm tích lũy', m.totalSavings],
      ['TỔNG TÀI SẢN TIỀN HIỆN CÓ', m.totalMoneyAssets],
      [],
      ['II. DANH SÁCH CÔNG VIỆC & ĐỐI CHIẾU THANH TOÁN'],
      ['Mã CV', 'Tên công việc', 'Nhóm công việc', 'Bắt đầu', 'Kết thúc', 'Số ngày', 'Dự kiến thu', 'Được duyệt', 'Đã nhận', 'Còn được nhận', 'Trạng thái']
    ];

    m.enrichedWorks.forEach(function(w) {
      lines.push([
        w.ID_CONG_VIEC, w.TEN_CONG_VIEC, w.NHOM_CONG_VIEC, w.NGAY_BAT_DAU, w.NGAY_KET_THUC,
        w.SO_NGAY, w.DU_KIEN_THU, w.DUOC_DUYET, w._netReceived, w._remaining, w.TRANG_THAI
      ]);
    });

    const csvContent = '\uFEFF' + lines.map(function(row) {
      return row.map(function(cell) {
        const s = String(cell !== undefined && cell !== null ? cell : '').replace(/"/g, '""');
        return '"' + s + '"';
      }).join(',');
    }).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'BAO_CAO_SO_TAY_CA_NHAN_' + periodRange.startDate + '_' + periodRange.endDate + '.csv';
    link.click();
    showToast('📊 Đã xuất file Excel (.CSV tiếng Việt) thành công!');
  }

  function exportBackupJson() {
    const db = PersonalDB.getState();
    const jsonStr = JSON.stringify(db, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'SAO_LUU_SO_TAY_CA_NHAN_V2_' + new Date().toISOString().slice(0, 10) + '.json';
    link.click();
    showToast('💾 Đã tải xuống tệp Sao lưu toàn bộ dữ liệu (.JSON)!');
  }

  function handleImportBackupJson(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (confirm('Khôi phục dữ liệu từ tệp sao lưu này sẽ thay thế dữ liệu hiện tại. Bạn có chắc chắn muốn tiếp tục?')) {
          PersonalDB.importFullJson(parsed);
          refreshAllViews();
          showToast('✅ Đã khôi phục toàn bộ dữ liệu thành công!');
        }
      } catch (err) {
        alert('Lỗi đọc tệp sao lưu: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function triggerCloudBackup() {
    if (PersonalDB.isRunningInGAS()) {
      showToast('⏳ Đang tạo bản sao lưu trên Google Drive...');
      google.script.run
        .withSuccessHandler(function(res) {
          showToast('☁️ ' + (res && res.message ? res.message : 'Sao lưu Google Drive hoàn tất!'));
        })
        .withFailureHandler(function(err) {
          alert('Lỗi sao lưu Drive: ' + err.message);
        })
        .apiCall('createBackup', {});
    } else {
      exportBackupJson();
    }
  }

  function updateWorkFilter() {
    workFilter.search = (document.getElementById('workSearchInput').value || '').trim();
    workFilter.category = document.getElementById('workCategoryFilter').value || 'ALL';
    workFilter.status = document.getElementById('workStatusFilter').value || 'ALL';
    refreshAllViews();
  }

  function updateIncomeFilter() {
    incomeFilter.search = (document.getElementById('incomeSearchInput').value || '').trim();
    incomeFilter.type = document.getElementById('incomeTypeFilter').value || 'ALL';
    refreshAllViews();
  }

  function updateExpenseFilter() {
    expenseFilter.search = (document.getElementById('expenseSearchInput').value || '').trim();
    expenseFilter.category = document.getElementById('expenseCategoryFilter').value || 'ALL';
    refreshAllViews();
  }

  function updatePlanFilter() {
    planFilter.type = document.getElementById('planTypeFilter').value || 'ALL';
    planFilter.status = document.getElementById('planStatusFilter').value || 'ALL';
    refreshAllViews();
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function setInputValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : '';
  }

  function escapeHtml(str) {
    return String(str !== undefined && str !== null ? str : '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function seedSampleDataNow() {
    PersonalDB.resetToSampleData();
    refreshAllViews();
    closeModal('modalQuickStyle');
    showToast('🌱 Đã nạp bộ dữ liệu mẫu đầy đủ!');
    if (PersonalDB.isRunningInGAS() || PersonalDB.getRemoteGasUrl()) {
      PersonalDB.pushAllToCloud(function(ok, msg) {
        if (ok) showToast('☁️ Đã đồng bộ dữ liệu mẫu lên Google Sheets!');
      });
    }
  }

  function showToast(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'toast-msg';
    div.innerHTML = '<span>' + escapeHtml(msg) + '</span>';
    container.appendChild(div);
    setTimeout(function() {
      div.style.opacity = '0';
      setTimeout(function() { div.remove(); }, 300);
    }, 3200);
  }

  return {
    init: init,
    switchTab: switchTab,
    toggleMobileSidebar: toggleMobileSidebar,
    setColorMode: setColorMode,
    toggleColorMode: toggleColorMode,
    toggleAccordion: toggleAccordion,
    setAllAccordions: setAllAccordions,
    toggleQuickActions: toggleQuickActions,
    openModal: openModal,
    closeModal: closeModal,
    openWorkModal: openWorkModal,
    updateWorkDaysPreview: updateWorkDaysPreview,
    saveWorkFromModal: saveWorkFromModal,
    deleteWork: deleteWork,
    openWorkTxModal: openWorkTxModal,
    saveWorkTxFromModal: saveWorkTxFromModal,
    deleteWorkTx: deleteWorkTx,
    openWorkDetailModal: openWorkDetailModal,
    openIncomeModal: openIncomeModal,
    saveIncomeFromModal: saveIncomeFromModal,
    deleteIncome: deleteIncome,
    openExpenseModal: openExpenseModal,
    saveExpenseFromModal: saveExpenseFromModal,
    deleteExpense: deleteExpense,
    openAccountModal: openAccountModal,
    saveAccountFromModal: saveAccountFromModal,
    openTransferModal: openTransferModal,
    saveTransferFromModal: saveTransferFromModal,
    deleteTransfer: deleteTransfer,
    openSavingGoalModal: openSavingGoalModal,
    saveSavingGoalFromModal: saveSavingGoalFromModal,
    openSavingTxModal: openSavingTxModal,
    saveSavingTxFromModal: saveSavingTxFromModal,
    deleteSaving: deleteSaving,
    openPlanModal: openPlanModal,
    savePlanFromModal: savePlanFromModal,
    executePlanNow: executePlanNow,
    deletePlan: deletePlan,
    saveQuickGasUrl: saveQuickGasUrl,
    saveSettingsConfig: saveSettingsConfig,
    switchCategorySubTab: switchCategorySubTab,
    openCategoryModal: openCategoryModal,
    saveCategoryFromModal: saveCategoryFromModal,
    deleteCategory: deleteCategory,
    exportExcelCsv: exportExcelCsv,
    exportBackupJson: exportBackupJson,
    handleImportBackupJson: handleImportBackupJson,
    triggerCloudBackup: triggerCloudBackup,
    updateWorkFilter: updateWorkFilter,
    updateIncomeFilter: updateIncomeFilter,
    updateExpenseFilter: updateExpenseFilter,
    updatePlanFilter: updatePlanFilter,
    refreshAllViews: refreshAllViews,
    seedSampleDataNow: seedSampleDataNow,
    showToast: showToast
  };
})();

document.addEventListener('DOMContentLoaded', function() {
  AppController.init();
});
