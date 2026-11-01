/**
 * ============================================================================
 * Tệp: accounting.js
 * Chức năng: Bộ máy Hạch toán Tài chính, Quyết toán Công việc, Kỳ lương linh hoạt,
 * Tính số dư Tài khoản/Tiết kiệm & Cảnh báo thông minh (Tuân thủ 100% Phần IV Đề án).
 * ============================================================================
 */

const AccountingEngine = (function() {

  /**
   * Tính số ngày thực hiện công việc: (Ngày kết thúc - Ngày bắt đầu) + 1
   */
  function calcDaysInclusive(startStr, endStr) {
    if (!startStr || !endStr) return 1;
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    const diff = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }

  /**
   * Tính khoảng thời gian (Từ ngày - Đến ngày) dựa theo chế độ lọc Kỳ thống kê
   */
  function getPeriodDateRange(periodMode, config, customStart, customEnd, refDateObj) {
    const ref = refDateObj || new Date('2026-11-01T12:00:00');
    const year = ref.getFullYear();
    const month = ref.getMonth() + 1; // 1..12
    const day = ref.getDate();
    const startDayCfg = Number((config && config.NGAY_BAT_DAU_KY_LUONG) || 13);

    const pad = function(n) { return n < 10 ? '0' + n : '' + n; };
    const fmt = function(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); };
    const lastDayOfMonth = function(y, m) { return new Date(y, m, 0).getDate(); };

    if (periodMode === 'KY_LUONG') {
      if (startDayCfg <= 1) {
        return {
          startDate: fmt(year, month, 1),
          endDate: fmt(year, month, lastDayOfMonth(year, month)),
          label: 'Kỳ lương tháng ' + pad(month) + '/' + year + ' (01/' + pad(month) + ' – ' + lastDayOfMonth(year, month) + '/' + pad(month) + ')'
        };
      }
      let sYear = year, sMonth = month, eYear = year, eMonth = month;
      if (day < startDayCfg) {
        sMonth = month - 1;
        if (sMonth < 1) { sMonth = 12; sYear = year - 1; }
      } else {
        eMonth = month + 1;
        if (eMonth > 12) { eMonth = 1; eYear = year + 1; }
      }
      const endDay = startDayCfg - 1;
      return {
        startDate: fmt(sYear, sMonth, startDayCfg),
        endDate: fmt(eYear, eMonth, endDay),
        label: 'Kỳ lương ' + pad(startDayCfg) + '/' + pad(sMonth) + ' – ' + pad(endDay) + '/' + pad(eMonth) + '/' + eYear
      };
    }

    if (periodMode === 'THANG_NAY') {
      return {
        startDate: fmt(year, month, 1),
        endDate: fmt(year, month, lastDayOfMonth(year, month)),
        label: 'Tháng ' + pad(month) + '/' + year
      };
    }

    if (periodMode === 'THANG_TRUOC') {
      let pm = month - 1, py = year;
      if (pm < 1) { pm = 12; py = year - 1; }
      return {
        startDate: fmt(py, pm, 1),
        endDate: fmt(py, pm, lastDayOfMonth(py, pm)),
        label: 'Tháng trước (' + pad(pm) + '/' + py + ')'
      };
    }

    if (periodMode === 'QUY_NAY') {
      const q = Math.floor((month - 1) / 3) + 1;
      const sm = (q - 1) * 3 + 1;
      const em = sm + 2;
      return {
        startDate: fmt(year, sm, 1),
        endDate: fmt(year, em, lastDayOfMonth(year, em)),
        label: 'Quý ' + q + '/' + year
      };
    }

    if (periodMode === 'NAM_NAY') {
      return {
        startDate: fmt(year, 1, 1),
        endDate: fmt(year, 12, 31),
        label: 'Cả năm ' + year
      };
    }

    if (periodMode === 'TUY_CHON' && customStart && customEnd) {
      return {
        startDate: customStart,
        endDate: customEnd,
        label: 'Từ ' + formatVnDate(customStart) + ' đến ' + formatVnDate(customEnd)
      };
    }

    // TAT_CA
    return {
      startDate: '2020-01-01',
      endDate: '2035-12-31',
      label: 'Toàn bộ thời gian'
    };
  }

  function isInRange(dateStr, startStr, endStr) {
    if (!dateStr) return false;
    const d = String(dateStr).substring(0, 10);
    return d >= startStr && d <= endStr;
  }

  /**
   * Tính toán chi tiết từng Công việc và đối chiếu các giao dịch Tạm ứng / Thanh toán
   */
  function computeEnrichedWorks(dbState) {
    const works = dbState.works || [];
    const txs = dbState.workTransactions || [];

    return works.map(function(w) {
      const relatedTxs = txs.filter(function(t) {
        return String(t.ID_CONG_VIEC) === String(w.ID_CONG_VIEC);
      });

      let advanceTotal = 0;
      let settlementTotal = 0;
      let refundTotal = 0;
      let adjustmentTotal = 0;

      relatedTxs.forEach(function(t) {
        const amt = Number(t.SO_TIEN) || 0;
        const type = String(t.LOAI_GIAO_DICH || '');
        if (type === 'Tạm ứng nhận được') {
          advanceTotal += amt;
        } else if (type === 'Thanh toán bổ sung') {
          settlementTotal += amt;
        } else if (type === 'Hoàn trả tạm ứng' || type === 'Thu hồi tiền tạm ứng') {
          refundTotal += amt;
        } else if (type === 'Điều chỉnh quyết toán') {
          adjustmentTotal += amt;
        }
      });

      const netReceived = advanceTotal + settlementTotal + adjustmentTotal - refundTotal;
      const expected = Number(w.DU_KIEN_THU) || 0;
      const approved = Number(w.DUOC_DUYET) || 0;
      const baseTarget = approved > 0 ? approved : expected;
      const isProvisional = approved <= 0;
      const remaining = Math.max(0, baseTarget - netReceived);
      const overpaid = (approved > 0 && netReceived > approved) ? (netReceived - approved) : 0;
      const days = calcDaysInclusive(w.NGAY_BAT_DAU, w.NGAY_KET_THUC);

      // Kiểm tra công việc sắp đến hạn hoặc quá hạn nhận tiền
      let dueSoon = false;
      if (remaining > 0 && w.HAN_THANH_TOAN) {
        const dueTime = new Date(w.HAN_THANH_TOAN).getTime();
        const refTime = new Date('2026-11-01').getTime();
        const diffDays = Math.ceil((dueTime - refTime) / (1000 * 60 * 60 * 24));
        if (diffDays <= 10) dueSoon = true;
      }

      return Object.assign({}, w, {
        SO_NGAY: days,
        _transactions: relatedTxs,
        _advanceTotal: advanceTotal,
        _settlementTotal: settlementTotal,
        _refundTotal: refundTotal,
        _adjustmentTotal: adjustmentTotal,
        _netReceived: netReceived,
        _baseTarget: baseTarget,
        _isProvisional: isProvisional,
        _remaining: remaining,
        _overpaid: overpaid,
        _dueSoon: dueSoon
      });
    });
  }

  /**
   * Tính toán Số dư hiện tại của từng Tài khoản (Tiền mặt, MB Bank, Vietcombank...)
   * Công thức: Số dư cuối = Số dư đầu + Tổng tiền vào - Tổng tiền ra
   */
  function computeAccountBalances(dbState) {
    const accounts = dbState.accounts || [];
    const workTxs = dbState.workTransactions || [];
    const incomes = dbState.incomes || [];
    const expenses = dbState.expenses || [];
    const transfers = dbState.transfers || [];

    return accounts.map(function(acc) {
      const accId = String(acc.ID_TAI_KHOAN);
      const opening = Number(acc.SO_DU_BAN_DAU) || 0;
      let totalIn = 0;
      let totalOut = 0;

      // 1. Giao dịch công việc (Tạm ứng / Thanh toán vào TK; Hoàn trả ra khỏi TK)
      workTxs.forEach(function(tx) {
        if (String(tx.TAI_KHOAN_ID) === accId) {
          const amt = Number(tx.SO_TIEN) || 0;
          if (tx.LOAI_GIAO_DICH === 'Hoàn trả tạm ứng' || tx.LOAI_GIAO_DICH === 'Thu hồi tiền tạm ứng') {
            totalOut += amt;
          } else {
            totalIn += amt;
          }
        }
      });

      // 2. Thu nhập (Lương, Tiền công, Hỗ trợ...)
      incomes.forEach(function(inc) {
        if (String(inc.TAI_KHOAN_ID) === accId) {
          totalIn += (Number(inc.SO_TIEN) || 0);
        }
      });

      // 3. Chi tiêu (Đưa vợ, Ăn uống, Xăng xe...)
      expenses.forEach(function(exp) {
        if (String(exp.TAI_KHOAN_ID) === accId) {
          totalOut += (Number(exp.SO_TIEN) || 0);
        }
      });

      // 4. Chuyển tiền nội bộ & Gửi/Rút tiết kiệm
      transfers.forEach(function(tr) {
        const amt = Number(tr.SO_TIEN) || 0;
        if (String(tr.TAI_KHOAN_DI) === accId) {
          totalOut += amt;
        }
        if (String(tr.TAI_KHOAN_DEN) === accId) {
          totalIn += amt;
        }
      });

      const currentBalance = opening + totalIn - totalOut;
      return Object.assign({}, acc, {
        _openingBalance: opening,
        _totalIn: totalIn,
        _totalOut: totalOut,
        _currentBalance: currentBalance
      });
    });
  }

  /**
   * Tổng hợp toàn bộ các chỉ số cho Dashboard, Báo cáo & Cảnh báo theo Kỳ đang chọn
   */
  function computeFullMetrics(dbState, periodRange) {
    const startStr = periodRange.startDate;
    const endStr = periodRange.endDate;
    const config = dbState.config || {};

    const enrichedWorks = computeEnrichedWorks(dbState);
    const enrichedAccounts = computeAccountBalances(dbState);

    // Lọc dữ liệu theo kỳ
    const periodWorks = enrichedWorks.filter(function(w) {
      return isInRange(w.NGAY_BAT_DAU, startStr, endStr) ||
             isInRange(w.NGAY_KET_THUC, startStr, endStr) ||
             w._remaining > 0;
    });

    const periodWorkTxs = (dbState.workTransactions || []).filter(function(t) {
      return isInRange(t.NGAY_GIAO_DICH, startStr, endStr);
    });

    const periodIncomes = (dbState.incomes || []).filter(function(inc) {
      return isInRange(inc.NGAY_THU, startStr, endStr);
    });

    const periodExpenses = (dbState.expenses || []).filter(function(exp) {
      return isInRange(exp.NGAY_CHI, startStr, endStr);
    });

    const pendingPlans = (dbState.plans || []).filter(function(p) {
      return p.TRANG_THAI !== 'DA_THUC_HIEN' && p.TRANG_THAI !== 'HUY';
    });

    // --- 1. NHÓM CHỈ SỐ CÔNG VIỆC ---
    const totalWorksCount = enrichedWorks.length;
    const inProgressWorksCount = enrichedWorks.filter(function(w) { return w.TRANG_THAI === 'Đang thực hiện' || w.TRANG_THAI === 'Chưa thực hiện'; }).length;
    const completedWorksCount = enrichedWorks.filter(function(w) { return w.TRANG_THAI === 'Đã hoàn thành' || w.TRANG_THAI === 'Đã thanh toán đủ'; }).length;
    const unpaidWorks = enrichedWorks.filter(function(w) { return w._remaining > 0 && w.TRANG_THAI !== 'Đã hủy'; });
    const dueSoonWorks = unpaidWorks.filter(function(w) { return w._dueSoon; });

    let totalWorkExpected = 0;
    let totalWorkApproved = 0;
    let totalWorkReceivedAll = 0;
    let totalRemainingFromWork = 0;

    enrichedWorks.forEach(function(w) {
      if (w.TRANG_THAI === 'Đã hủy') return;
      totalWorkExpected += w.DU_KIEN_THU;
      totalWorkApproved += w.DUOC_DUYET;
      totalWorkReceivedAll += w._netReceived;
      totalRemainingFromWork += w._remaining;
    });

    // Dòng tiền thực nhận từ công việc trong kỳ
    let workReceivedInPeriod = 0;
    let workAdvanceInPeriod = 0;
    let workSettlementInPeriod = 0;
    periodWorkTxs.forEach(function(tx) {
      const amt = Number(tx.SO_TIEN) || 0;
      if (tx.LOAI_GIAO_DICH === 'Tạm ứng nhận được') {
        workAdvanceInPeriod += amt;
        workReceivedInPeriod += amt;
      } else if (tx.LOAI_GIAO_DICH === 'Thanh toán bổ sung' || tx.LOAI_GIAO_DICH === 'Điều chỉnh quyết toán') {
        workSettlementInPeriod += amt;
        workReceivedInPeriod += amt;
      } else if (tx.LOAI_GIAO_DICH === 'Hoàn trả tạm ứng' || tx.LOAI_GIAO_DICH === 'Thu hồi tiền tạm ứng') {
        workReceivedInPeriod -= amt;
      }
    });

    // --- 2. NHÓM CHỈ SỐ THU NHẬP TRONG KỲ ---
    let salaryReceived = 0;
    let nonSalaryIncome = 0;
    periodIncomes.forEach(function(inc) {
      const amt = Number(inc.SO_TIEN) || 0;
      if (inc.LOAI_THU === 'Lương hằng tháng') {
        salaryReceived += amt;
      } else {
        nonSalaryIncome += amt;
      }
    });

    const totalActualIncome = salaryReceived + nonSalaryIncome + workReceivedInPeriod;

    // --- 3. NHÓM CHỈ SỐ CHI TIÊU TRONG KỲ ---
    let totalExpense = 0;
    let wifeAllowancePaid = 0;
    let livingExpense = 0;
    let otherExpense = 0;
    const expenseByCategory = {};

    periodExpenses.forEach(function(exp) {
      const amt = Number(exp.SO_TIEN) || 0;
      const cat = exp.NHOM_CHI || 'Chi tiêu khác';
      totalExpense += amt;
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amt;

      if (cat === 'Đưa vợ') {
        wifeAllowancePaid += amt;
      } else if (cat === 'Sinh hoạt gia đình' || cat === 'Ăn uống' || cat === 'Điện thoại, Internet' || cat === 'Con cái') {
        livingExpense += amt;
      } else {
        otherExpense += amt;
      }
    });

    const wifeTarget = Number(config.DINH_MUC_DUA_VO_THANG) || 10000000;
    const wifeRemaining = Math.max(0, wifeTarget - wifeAllowancePaid);
    const wifePercent = wifeTarget > 0 ? Math.min(100, Math.round((wifeAllowancePaid / wifeTarget) * 100)) : 100;

    // --- 4. NHÓM CHỈ SỐ TÀI CHÍNH, NGÂN HÀNG & TIẾT KIỆM ---
    let totalCash = 0;
    let totalBank = 0;
    enrichedAccounts.forEach(function(acc) {
      if (acc.LOAI_TAI_KHOAN === 'TIEN_MAT') {
        totalCash += acc._currentBalance;
      } else {
        totalBank += acc._currentBalance;
      }
    });

    let totalSavings = 0;
    let totalSavingsTarget = 0;
    (dbState.savings || []).forEach(function(s) {
      totalSavings += (Number(s.SO_TIEN_HIEN_TAI) || 0);
      totalSavingsTarget += (Number(s.SO_TIEN_MUC_TIEU) || 0);
    });

    const totalCurrentBalance = totalCash + totalBank;
    const totalMoneyAssets = totalCash + totalBank + totalSavings;
    const netCashflow = totalActualIncome - totalExpense;

    // Dự thu & Dự chi chưa thực hiện
    let plannedIncome = 0;
    let plannedExpense = 0;
    pendingPlans.forEach(function(p) {
      const amt = Number(p.SO_TIEN_DU_KIEN) || 0;
      if (p.LOAI_KE_HOACH === 'DU_THU') plannedIncome += amt;
      else plannedExpense += amt;
    });

    // Tổng dự kiến thu = Dự thu kế hoạch + Khoản công việc còn phải nhận
    const totalExpectedReceivable = plannedIncome + totalRemainingFromWork;

    // --- 5. DỮ LIỆU CHO 5 BIỂU ĐỒ TRÊN DASHBOARD ---
    const workByCategory = {};
    enrichedWorks.forEach(function(w) {
      if (w.TRANG_THAI === 'Đã hủy') return;
      const cat = w.NHOM_CONG_VIEC || 'Công việc khác';
      workByCategory[cat] = (workByCategory[cat] || 0) + w._baseTarget;
    });

    // --- 6. CẢNH BÁO THÔNG MINH ---
    const smartAlerts = [];
    if (unpaidWorks.length > 0) {
      smartAlerts.push({
        level: 'warning',
        title: 'Có ' + unpaidWorks.length + ' công việc còn khoản phải thu (' + formatCurrency(totalRemainingFromWork) + ')',
        detail: 'Nhấn vào mục Công việc để theo dõi hạn thanh toán và ghi nhận quyết toán.'
      });
    }

    enrichedWorks.forEach(function(w) {
      if (w._overpaid > 0) {
        smartAlerts.push({
          level: 'danger',
          title: 'Cảnh báo vượt duyệt: ' + w.TEN_CONG_VIEC,
          detail: 'Tổng tạm ứng/đã nhận đang vượt số tiền được duyệt ' + formatCurrency(w._overpaid) + '. Cần đối chiếu hoặc hoàn trả.'
        });
      }
    });

    if (wifeRemaining > 0) {
      smartAlerts.push({
        level: 'info',
        title: 'Tiến độ Quỹ Đưa Vợ: Đã đạt ' + wifePercent + '% (' + formatCurrency(wifeAllowancePaid) + ' / ' + formatCurrency(wifeTarget) + ')',
        detail: 'Còn thiếu ' + formatCurrency(wifeRemaining) + ' để hoàn thành định mức đưa vợ kỳ này.'
      });
    } else {
      smartAlerts.push({
        level: 'success',
        title: 'Tuyệt vời! Đã hoàn thành 100% định mức Tiền Đưa Vợ trong kỳ (' + formatCurrency(wifeAllowancePaid) + ')',
        detail: 'Gia đạo an vui, hậu phương vững chắc – Phong thủy tài chính đại cát!'
      });
    }

    const monthlyBudget = Number(config.NGAN_SACH_CHI_TIEU_THANG) || 18000000;
    if (monthlyBudget > 0 && totalExpense > monthlyBudget) {
      smartAlerts.push({
        level: 'danger',
        title: 'Cảnh báo vượt tổng hạn mức chi tiêu kỳ (' + formatCurrency(totalExpense) + ' / ' + formatCurrency(monthlyBudget) + ')',
        detail: 'Đã vượt ' + formatCurrency(totalExpense - monthlyBudget) + '. Nên rà soát các khoản chi không thiết yếu.'
      });
    }

    return {
      periodRange: periodRange,
      enrichedWorks: enrichedWorks,
      enrichedAccounts: enrichedAccounts,
      periodIncomes: periodIncomes,
      periodExpenses: periodExpenses,
      periodWorkTxs: periodWorkTxs,

      // Chỉ số Công việc
      totalWorksCount: totalWorksCount,
      inProgressWorksCount: inProgressWorksCount,
      completedWorksCount: completedWorksCount,
      unpaidWorksCount: unpaidWorks.length,
      dueSoonWorksCount: dueSoonWorks.length,
      totalWorkExpected: totalWorkExpected,
      totalWorkApproved: totalWorkApproved,
      totalWorkReceivedAll: totalWorkReceivedAll,
      totalRemainingFromWork: totalRemainingFromWork,

      // Chỉ số Thu nhập
      salaryReceived: salaryReceived,
      nonSalaryIncome: nonSalaryIncome,
      workReceivedInPeriod: workReceivedInPeriod,
      workAdvanceInPeriod: workAdvanceInPeriod,
      workSettlementInPeriod: workSettlementInPeriod,
      totalActualIncome: totalActualIncome,
      totalExpectedReceivable: totalExpectedReceivable,

      // Chỉ số Chi tiêu & Đưa vợ
      totalExpense: totalExpense,
      wifeAllowancePaid: wifeAllowancePaid,
      wifeTarget: wifeTarget,
      wifeRemaining: wifeRemaining,
      wifePercent: wifePercent,
      livingExpense: livingExpense,
      otherExpense: otherExpense,
      monthlyBudget: monthlyBudget,

      // Chỉ số Tài chính & Tiết kiệm
      totalCash: totalCash,
      totalBank: totalBank,
      totalSavings: totalSavings,
      totalSavingsTarget: totalSavingsTarget,
      totalCurrentBalance: totalCurrentBalance,
      totalMoneyAssets: totalMoneyAssets,
      netCashflow: netCashflow,
      plannedIncome: plannedIncome,
      plannedExpense: plannedExpense,

      // Dữ liệu Biểu đồ & Cảnh báo
      expenseByCategory: expenseByCategory,
      workByCategory: workByCategory,
      smartAlerts: smartAlerts
    };
  }

  function formatCurrency(val) {
    const num = Math.round(Number(val) || 0);
    return num.toLocaleString('vi-VN') + 'đ';
  }

  function formatVnDate(dateStr) {
    if (!dateStr) return '';
    const clean = String(dateStr).substring(0, 10);
    const parts = clean.split('-');
    if (parts.length !== 3) return dateStr;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  return {
    calcDaysInclusive: calcDaysInclusive,
    getPeriodDateRange: getPeriodDateRange,
    computeEnrichedWorks: computeEnrichedWorks,
    computeAccountBalances: computeAccountBalances,
    computeFullMetrics: computeFullMetrics,
    formatCurrency: formatCurrency,
    formatVnDate: formatVnDate
  };
})();
