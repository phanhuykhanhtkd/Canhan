/**
 * ============================================================================
 * Tệp: lunar-fengshui.js
 * Chức năng: Tính Lịch Âm Dương Việt Nam (Can Chi), Ngũ Hành Phong Thủy Tài Lộc
 * và Phân tích Cân bằng Âm Dương Dòng Tiền (Thu - Chi - Tích Lũy).
 * ============================================================================
 */

const FengShuiEngine = (function() {
  const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  const THEMES = {
    KIM_THUY: {
      code: 'KIM_THUY',
      name: 'Kim Thủy Tụ Tài (Navy & Vàng Đồng)',
      element: 'Kim sinh Thủy – Thủy quản Tài Lộc',
      motto: 'Minh đường sáng sủa, Kim Thủy tương sinh, tiền tài tụ hội vững bền.',
      auspiciousNote: 'Thích hợp quyết toán công việc, thu hồi công nợ và gửi tích lũy.'
    },
    MOC: {
      code: 'MOC',
      name: 'Thủy Mộc Sinh Khí (Xanh Ngọc & Vàng)',
      element: 'Thủy dưỡng Mộc – Sinh sôi phát triển',
      motto: 'Mộc khí vượng phát, công việc hanh thông, quý nhân giao việc đều đặn.',
      auspiciousNote: 'Thích hợp nhận nhiệm vụ mới, ký kết sự kiện và mở rộng nguồn thu.'
    },
    HOA: {
      code: 'HOA',
      name: 'Mộc Hỏa Hồng Phát (Đỏ Hoàng Gia & Vàng)',
      element: 'Mộc sinh Hỏa – Nhiệt huyết hồng phát',
      motto: 'Hỏa quang rực rỡ, danh tiếng lan tỏa, tài lộc bứt phá mạnh mẽ.',
      auspiciousNote: 'Thích hợp hoàn thành dứt điểm các việc tồn đọng và đốc thúc thanh toán.'
    },
    THO: {
      code: 'THO',
      name: 'Hỏa Thổ Vững Bền (Nâu Trầm & Vàng)',
      element: 'Hỏa sinh Thổ – Điền sản vững chắc',
      motto: 'Thổ dày載 vật, gia đạo bình an, tích lũy tiết kiệm và quỹ gia đình sung túc.',
      auspiciousNote: 'Thích hợp vun đắp quỹ gia đình, đưa vợ và lập kế hoạch dài hạn.'
    },
    KIM: {
      code: 'KIM',
      name: 'Bạch Kim Thịnh Vượng (Titan & Vàng Ròng)',
      element: 'Thổ sinh Kim – Kỷ luật minh bạch',
      motto: 'Kim khí chuẩn mực, sổ sách phân minh, kiểm soát chi tiêu chặt chẽ.',
      auspiciousNote: 'Thích hợp đối chiếu sổ sách, rà soát ngân sách và tối ưu dòng tiền.'
    }
  };

  // Thuật toán tính Julius Day Number để suy ra Can Chi của Ngày chính xác
  function getJulianDayNumber(dd, mm, yy) {
    const a = Math.floor((14 - mm) / 12);
    const y = yy + 4800 - a;
    const m = mm + 12 * a - 3;
    return dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }

  function getTodaySolarAndCanChi(dateObj) {
    const d = dateObj || new Date();
    const dd = d.getDate();
    const mm = d.getMonth() + 1;
    const yy = d.getFullYear();
    const weekday = WEEKDAYS[d.getDay()];

    const jdn = getJulianDayNumber(dd, mm, yy);
    const dayCan = CAN[(jdn + 9) % 10];
    const dayChi = CHI[(jdn + 1) % 12];
    const yearCan = CAN[(yy + 6) % 10];
    const yearChi = CHI[(yy + 8) % 12];

    const solarFormatted = (dd < 10 ? '0' + dd : dd) + '/' + (mm < 10 ? '0' + mm : mm) + '/' + yy;
    return {
      weekday: weekday,
      solarFormatted: solarFormatted,
      dayCanChi: dayCan + ' ' + dayChi,
      yearCanChi: yearCan + ' ' + yearChi,
      fullDisplay: weekday + ', ' + solarFormatted + ' • Ngày ' + dayCan + ' ' + dayChi + ' (Năm ' + yearCan + ' ' + yearChi + ')'
    };
  }

  /**
   * Đánh giá Chỉ số Phong Thủy Tài Chính (Dựa trên tỷ lệ Tích lũy, Công nợ & Chi tiêu)
   */
  function evaluateWealthHarmony(metrics) {
    const income = Number(metrics.totalActualIncome) || 0;
    const expense = Number(metrics.totalExpense) || 0;
    const totalAssets = Number(metrics.totalMoneyAssets) || 0;
    const pendingWork = Number(metrics.totalRemainingFromWork) || 0;

    let score = 82;
    let statusTitle = 'KIM THỦY TƯƠNG SINH – TỤ TÀI VƯỢNG LỘC';
    let advice = 'Dòng tiền dương khí mạnh, thu lớn hơn chi, tài khoản và quỹ tiết kiệm giữ nhịp tăng trưởng tốt.';

    if (income > 0) {
      const spendRatio = expense / income;
      if (spendRatio <= 0.65) {
        score = 95;
        statusTitle = 'ĐẠI CÁT TỤ TÀI – DÒNG TIỀN DỒI DÀO';
        advice = 'Tỷ lệ giữ tiền xuất sắc (chi tiêu dưới 65% thu nhập). Rất tốt để trích thêm vào Quỹ Tiết Kiệm.';
      } else if (spendRatio <= 0.88) {
        score = 85;
        statusTitle = 'CÂN BẰNG ÂM DƯƠNG – TÀI CHÍNH ỔN ĐỊNH';
        advice = 'Thu chi hài hòa, quỹ gia đình và tiền đưa vợ đảm bảo đúng kế hoạch.';
      } else if (spendRatio <= 1.0) {
        score = 72;
        statusTitle = 'LƯU THÔNG NHANH – CẦN GIỮ TỤ KHÍ';
        advice = 'Chi tiêu đang tiệm cận mức thu nhập. Nên hạn chế các khoản chi phát sinh ngoài kế hoạch.';
      } else {
        score = 60;
        statusTitle = 'TIẾT KHÍ HƠI MẠNH – CẦN THU HỒI CÔNG NỢ';
        advice = 'Chi trong kỳ đang cao hơn thu thực nhận. Hãy ưu tiên thu hồi các khoản công việc chờ thanh toán.';
      }
    }

    if (pendingWork > 0) {
      advice += ' Hiện có ' + pendingWork.toLocaleString('vi-VN') + 'đ tiền công việc còn phải nhận.';
    }

    return {
      score: score,
      statusTitle: statusTitle,
      advice: advice,
      totalAssets: totalAssets
    };
  }

  function getThemeInfo(themeKey) {
    return THEMES[themeKey] || THEMES.KIM_THUY;
  }

  return {
    getTodaySolarAndCanChi: getTodaySolarAndCanChi,
    evaluateWealthHarmony: evaluateWealthHarmony,
    getThemeInfo: getThemeInfo,
    THEMES: THEMES
  };
})();
