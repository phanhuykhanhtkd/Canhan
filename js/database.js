/**
 * ============================================================================
 * Tệp: database.js
 * Chức năng: Quản lý Cơ sở dữ liệu 13 Bảng chuẩn hóa (Dual-Engine:
 * Tự động đồng bộ Google Apps Script / Google Sheets + Lưu trữ tức thì LocalStorage)
 * ============================================================================
 */

const PersonalDB = (function() {
  const STORAGE_KEY = 'SO_TAY_CA_NHAN_V2_DB';
  const GAS_URL_KEY = 'SO_TAY_CA_NHAN_GAS_WEBAPP_URL';

  let state = null;

  /**
   * Kiểm tra xem ứng dụng đang chạy bên trong môi trường Google Apps Script hay không
   */
  function isRunningInGAS() {
    return typeof google !== 'undefined' && google.script && google.script.run;
  }

  function getRemoteGasUrl() {
    return localStorage.getItem(GAS_URL_KEY) || '';
  }

  function setRemoteGasUrl(url) {
    localStorage.setItem(GAS_URL_KEY, (url || '').trim());
  }

  /**
   * Tạo dữ liệu mặc định ban đầu (13 Bảng chuẩn đúng theo Đề án)
   */
  function createDefaultDatabaseState(withSampleData) {
    const now = '2026-11-01 08:30:00';

    const defaultConfig = {
      TEN_HE_THONG: 'SỔ TAY CÁ NHÂN',
      CHU_SO_HUU: 'Cán bộ Văn hóa – Tuyên truyền – Sự kiện',
      PHONG_THUY_MENH: 'KIM_THUY',
      NGAY_BAT_DAU_KY_LUONG: '13',
      NGAY_NHAN_LUONG_DU_KIEN: '15',
      LUONG_CO_BAN_DU_KIEN: '12500000',
      DINH_MUC_DUA_VO_THANG: '10000000',
      NGAN_SACH_CHI_TIEU_THANG: '18000000',
      DB_VERSION: '2026.11.01'
    };

    const defaultCategories = [
      // 11 Danh mục Công việc mặc định
      { ID_DANH_MUC: 'DM-CV-01', LOAI_DANH_MUC: 'CONG_VIEC', TEN_DANH_MUC: 'Văn hóa', MAU_SAC: '#1D4ED8', ICON: '🎭', HAN_MUC_THANG: 0, THU_TU: 1, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CV-02', LOAI_DANH_MUC: 'CONG_VIEC', TEN_DANH_MUC: 'Văn nghệ', MAU_SAC: '#7C3AED', ICON: '🎵', HAN_MUC_THANG: 0, THU_TU: 2, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CV-03', LOAI_DANH_MUC: 'CONG_VIEC', TEN_DANH_MUC: 'Thể dục thể thao (TDTT)', MAU_SAC: '#059669', ICON: '🏆', HAN_MUC_THANG: 0, THU_TU: 3, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CV-04', LOAI_DANH_MUC: 'CONG_VIEC', TEN_DANH_MUC: 'Tuyên truyền', MAU_SAC: '#D97706', ICON: '📢', HAN_MUC_THANG: 0, THU_TU: 4, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CV-05', LOAI_DANH_MUC: 'CONG_VIEC', TEN_DANH_MUC: 'Treo băng rôn, khẩu hiệu', MAU_SAC: '#DC2626', ICON: '🚩', HAN_MUC_THANG: 0, THU_TU: 5, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CV-06', LOAI_DANH_MUC: 'CONG_VIEC', TEN_DANH_MUC: 'Quảng cáo, cổ động', MAU_SAC: '#EA580C', ICON: '🎨', HAN_MUC_THANG: 0, THU_TU: 6, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CV-07', LOAI_DANH_MUC: 'CONG_VIEC', TEN_DANH_MUC: 'Lái xe', MAU_SAC: '#0284C7', ICON: '🚗', HAN_MUC_THANG: 0, THU_TU: 7, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CV-08', LOAI_DANH_MUC: 'CONG_VIEC', TEN_DANH_MUC: 'Đi công tác', MAU_SAC: '#4F46E5', ICON: '🧳', HAN_MUC_THANG: 0, THU_TU: 8, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CV-09', LOAI_DANH_MUC: 'CONG_VIEC', TEN_DANH_MUC: 'Hội nghị, hội thi, hội diễn', MAU_SAC: '#B45309', ICON: '🎤', HAN_MUC_THANG: 0, THU_TU: 9, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CV-10', LOAI_DANH_MUC: 'CONG_VIEC', TEN_DANH_MUC: 'Tổ chức sự kiện', MAU_SAC: '#BE185D', ICON: '🎪', HAN_MUC_THANG: 0, THU_TU: 10, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CV-11', LOAI_DANH_MUC: 'CONG_VIEC', TEN_DANH_MUC: 'Công việc khác', MAU_SAC: '#475569', ICON: '📋', HAN_MUC_THANG: 0, THU_TU: 11, TRANG_THAI: 'DANG_SU_DUNG' },

      // 7 Danh mục Thu nhập mặc định
      { ID_DANH_MUC: 'DM-THU-01', LOAI_DANH_MUC: 'THU_NHAP', TEN_DANH_MUC: 'Lương hằng tháng', MAU_SAC: '#059669', ICON: '💰', HAN_MUC_THANG: 0, THU_TU: 1, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-THU-02', LOAI_DANH_MUC: 'THU_NHAP', TEN_DANH_MUC: 'Tiền công', MAU_SAC: '#0284C7', ICON: '🛠️', HAN_MUC_THANG: 0, THU_TU: 2, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-THU-03', LOAI_DANH_MUC: 'THU_NHAP', TEN_DANH_MUC: 'Tiền thù lao', MAU_SAC: '#7C3AED', ICON: '🎖️', HAN_MUC_THANG: 0, THU_TU: 3, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-THU-04', LOAI_DANH_MUC: 'THU_NHAP', TEN_DANH_MUC: 'Tiền hỗ trợ', MAU_SAC: '#D97706', ICON: '🤝', HAN_MUC_THANG: 0, THU_TU: 4, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-THU-05', LOAI_DANH_MUC: 'THU_NHAP', TEN_DANH_MUC: 'Tiền làm thêm', MAU_SAC: '#0D9488', ICON: '⏱️', HAN_MUC_THANG: 0, THU_TU: 5, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-THU-06', LOAI_DANH_MUC: 'THU_NHAP', TEN_DANH_MUC: 'Thu nhập từ công việc phát sinh', MAU_SAC: '#2563EB', ICON: '📈', HAN_MUC_THANG: 0, THU_TU: 6, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-THU-07', LOAI_DANH_MUC: 'THU_NHAP', TEN_DANH_MUC: 'Thu nhập khác', MAU_SAC: '#64748B', ICON: '✨', HAN_MUC_THANG: 0, THU_TU: 7, TRANG_THAI: 'DANG_SU_DUNG' },

      // 12 Danh mục Chi tiêu mặc định
      { ID_DANH_MUC: 'DM-CHI-01', LOAI_DANH_MUC: 'CHI_TIEU', TEN_DANH_MUC: 'Đưa vợ', MAU_SAC: '#E11D48', ICON: '💝', HAN_MUC_THANG: 10000000, THU_TU: 1, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CHI-02', LOAI_DANH_MUC: 'CHI_TIEU', TEN_DANH_MUC: 'Ăn uống', MAU_SAC: '#EA580C', ICON: '🍜', HAN_MUC_THANG: 2500000, THU_TU: 2, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CHI-03', LOAI_DANH_MUC: 'CHI_TIEU', TEN_DANH_MUC: 'Sinh hoạt gia đình', MAU_SAC: '#D97706', ICON: '🏠', HAN_MUC_THANG: 2000000, THU_TU: 3, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CHI-04', LOAI_DANH_MUC: 'CHI_TIEU', TEN_DANH_MUC: 'Xăng xe', MAU_SAC: '#0284C7', ICON: '⛽', HAN_MUC_THANG: 1000000, THU_TU: 4, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CHI-05', LOAI_DANH_MUC: 'CHI_TIEU', TEN_DANH_MUC: 'Điện thoại, Internet', MAU_SAC: '#4F46E5', ICON: '📱', HAN_MUC_THANG: 500000, THU_TU: 5, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CHI-06', LOAI_DANH_MUC: 'CHI_TIEU', TEN_DANH_MUC: 'Mua sắm', MAU_SAC: '#9333EA', ICON: '🛍️', HAN_MUC_THANG: 1200000, THU_TU: 6, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CHI-07', LOAI_DANH_MUC: 'CHI_TIEU', TEN_DANH_MUC: 'Con cái', MAU_SAC: '#059669', ICON: '🎒', HAN_MUC_THANG: 2000000, THU_TU: 7, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CHI-08', LOAI_DANH_MUC: 'CHI_TIEU', TEN_DANH_MUC: 'Y tế', MAU_SAC: '#DC2626', ICON: '💊', HAN_MUC_THANG: 600000, THU_TU: 8, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CHI-09', LOAI_DANH_MUC: 'CHI_TIEU', TEN_DANH_MUC: 'Đi lại, công tác', MAU_SAC: '#0D9488', ICON: '🚌', HAN_MUC_THANG: 800000, THU_TU: 9, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CHI-10', LOAI_DANH_MUC: 'CHI_TIEU', TEN_DANH_MUC: 'Giải trí', MAU_SAC: '#DB2777', ICON: '☕', HAN_MUC_THANG: 800000, THU_TU: 10, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CHI-11', LOAI_DANH_MUC: 'CHI_TIEU', TEN_DANH_MUC: 'Trả nợ', MAU_SAC: '#475569', ICON: '🏦', HAN_MUC_THANG: 0, THU_TU: 11, TRANG_THAI: 'DANG_SU_DUNG' },
      { ID_DANH_MUC: 'DM-CHI-12', LOAI_DANH_MUC: 'CHI_TIEU', TEN_DANH_MUC: 'Chi tiêu khác', MAU_SAC: '#64748B', ICON: '📦', HAN_MUC_THANG: 1000000, THU_TU: 12, TRANG_THAI: 'DANG_SU_DUNG' }
    ];

    const defaultAccounts = [
      {
        ID_TAI_KHOAN: 'TK-TIEN-MAT',
        TEN_TAI_KHOAN: 'Tiền mặt tại ví',
        LOAI_TAI_KHOAN: 'TIEN_MAT',
        SO_DU_BAN_DAU: 3500000,
        NGAY_BAT_DAU: '2026-10-01',
        NGAN_HANG: 'Tiền mặt',
        SO_TAI_KHOAN_GHI_CHU: 'Tiền mặt chi tiêu hằng ngày & ứng việc',
        MAU_THE: '#065F46',
        TRANG_THAI: 'DANG_SU_DUNG'
      },
      {
        ID_TAI_KHOAN: 'TK-MB-BANK',
        TEN_TAI_KHOAN: 'Tài khoản MB Bank',
        LOAI_TAI_KHOAN: 'NGAN_HANG',
        SO_DU_BAN_DAU: 12000000,
        NGAY_BAT_DAU: '2026-10-01',
        NGAN_HANG: 'MB Bank (Quân Đội)',
        SO_TAI_KHOAN_GHI_CHU: 'TK nhận lương, phụ cấp & chuyển tiền đưa vợ',
        MAU_THE: '#0F2537',
        TRANG_THAI: 'DANG_SU_DUNG'
      },
      {
        ID_TAI_KHOAN: 'TK-VCB',
        TEN_TAI_KHOAN: 'Tài khoản Vietcombank',
        LOAI_TAI_KHOAN: 'NGAN_HANG',
        SO_DU_BAN_DAU: 8500000,
        NGAY_BAT_DAU: '2026-10-01',
        NGAN_HANG: 'Vietcombank',
        SO_TAI_KHOAN_GHI_CHU: 'TK nhận thù lao sự kiện, hội diễn & dự phòng',
        MAU_THE: '#1E3A8A',
        TRANG_THAI: 'DANG_SU_DUNG'
      }
    ];

    if (!withSampleData) {
      return {
        config: defaultConfig,
        categories: defaultCategories,
        works: [],
        workTransactions: [],
        incomes: [],
        expenses: [],
        accounts: defaultAccounts,
        savings: [],
        transfers: [],
        plans: [],
        reports: [],
        documents: [],
        logs: [
          { ID_LOG: 'LOG-INIT', THOI_GIAN: now, HANH_DONG: 'INIT', PHAN_HE: 'HE_THONG', DOI_TUONG_ID: 'CLEAN', MO_TA_CHI_TIET: 'Khởi tạo sổ tay mới (trống).' }
        ]
      };
    }

    // Dữ liệu mẫu thực tế sát 100% với đặc thù công việc trong Đề án
    const sampleWorks = [
      {
        ID_CONG_VIEC: 'CV-202611-001',
        TEN_CONG_VIEC: 'Treo băng rôn, khẩu hiệu tuyên truyền Ngày Pháp luật & Đại đoàn kết',
        NHOM_CONG_VIEC: 'Treo băng rôn, khẩu hiệu',
        NOI_DUNG: 'Thi công in ấn và treo 45 băng rôn dọc các trục đường chính trung tâm',
        NGUOI_GIAO: 'Trung tâm Văn hóa - Thông tin & Thể thao',
        DIA_DIEM: 'Các tuyến đường trung tâm',
        NGAY_BAT_DAU: '2026-10-20',
        NGAY_KET_THUC: '2026-10-23',
        SO_NGAY: 4,
        SO_BUOI: '4 ngày (8 buổi)',
        DU_KIEN_THU: 4500000,
        DUOC_DUYET: 4500000,
        HAN_THANH_TOAN: '2026-11-05',
        TRANG_THAI: 'Chờ thanh toán',
        GHI_CHU: 'Đã nghiệm thu thực tế, đã tạm ứng 2.000.000đ, chờ nhận nốt 2.500.000đ',
        TAI_LIEU: 'Bien_ban_nghiem_thu_bang_ron_T10.pdf',
        CREATED_AT: now,
        UPDATED_AT: now
      },
      {
        ID_CONG_VIEC: 'CV-202611-002',
        TEN_CONG_VIEC: 'Phục vụ âm thanh, ánh sáng & trang trí Hội diễn Văn nghệ quần chúng',
        NHOM_CONG_VIEC: 'Hội nghị, hội thi, hội diễn',
        NOI_DUNG: 'Dàn dựng sân khấu, trực kỹ thuật âm thanh 3 đêm sơ khảo và chung khảo (Minh họa đúng mục 3.3 Đề án)',
        NGUOI_GIAO: 'Phòng Văn hóa & Thông tin',
        DIA_DIEM: 'Nhà văn hóa trung tâm',
        NGAY_BAT_DAU: '2026-10-25',
        NGAY_KET_THUC: '2026-10-27',
        SO_NGAY: 3,
        SO_BUOI: '3 ngày (6 buổi)',
        DU_KIEN_THU: 3000000,
        DUOC_DUYET: 2800000,
        HAN_THANH_TOAN: '2026-11-08',
        TRANG_THAI: 'Chờ thanh toán',
        GHI_CHU: 'Tạm ứng lần 1: 500k, lần 2: 300k, thanh toán bổ sung: 1.000k -> Đã nhận 1.800k, Còn nhận 1.000k',
        TAI_LIEU: 'Ho_so_thanh_toan_hoi_dien.pdf',
        CREATED_AT: now,
        UPDATED_AT: now
      },
      {
        ID_CONG_VIEC: 'CV-202611-003',
        TEN_CONG_VIEC: 'Lái xe tuyên truyền lưu động ATGT & Chuyển đổi số đợt 2',
        NHOM_CONG_VIEC: 'Lái xe',
        NOI_DUNG: 'Chạy xe loa tuyên truyền lưu động tại 8 xã/phường theo kế hoạch',
        NGUOI_GIAO: 'Đội Tuyên truyền lưu động',
        DIA_DIEM: 'Các xã, phường trên địa bàn',
        NGAY_BAT_DAU: '2026-10-15',
        NGAY_KET_THUC: '2026-10-19',
        SO_NGAY: 5,
        SO_BUOI: '5 ngày (10 buổi)',
        DU_KIEN_THU: 2500000,
        DUOC_DUYET: 2500000,
        HAN_THANH_TOAN: '2026-10-28',
        TRANG_THAI: 'Đã thanh toán đủ',
        GHI_CHU: 'Đã nhận đủ 100% qua tài khoản MB Bank',
        TAI_LIEU: 'Lenh_dieu_xe_T10.pdf',
        CREATED_AT: now,
        UPDATED_AT: now
      },
      {
        ID_CONG_VIEC: 'CV-202611-004',
        TEN_CONG_VIEC: 'Tổ chức Giải Thể dục Thể thao chào mừng Ngày Nhà giáo 20/11',
        NHOM_CONG_VIEC: 'Thể dục thể thao (TDTT)',
        NOI_DUNG: 'Chuẩn bị sân bãi, maket, băng rôn và điều hành giải bóng chuyền hơi, cầu lông',
        NGUOI_GIAO: 'Ban Tổ chức Giải TDTT',
        DIA_DIEM: 'Nhà thi đấu đa năng',
        NGAY_BAT_DAU: '2026-11-01',
        NGAY_KET_THUC: '2026-11-03',
        SO_NGAY: 3,
        SO_BUOI: '3 ngày',
        DU_KIEN_THU: 3800000,
        DUOC_DUYET: 0,
        HAN_THANH_TOAN: '2026-11-18',
        TRANG_THAI: 'Đang thực hiện',
        GHI_CHU: 'Bắt đầu 01/11 đến 03/11 (3 ngày). Mới tạm ứng 1.000.000đ chi phí chuẩn bị',
        TAI_LIEU: '',
        CREATED_AT: now,
        UPDATED_AT: now
      },
      {
        ID_CONG_VIEC: 'CV-202611-005',
        TEN_CONG_VIEC: 'Thiết kế cụm pano cổ động trực quan kỷ niệm ngày thành lập Mặt trận',
        NHOM_CONG_VIEC: 'Quảng cáo, cổ động',
        NOI_DUNG: 'Thiết kế maket và lắp đặt khung pano tuyên truyền tại quảng trường',
        NGUOI_GIAO: 'Ủy ban MTTQ & Phòng Văn hóa',
        DIA_DIEM: 'Quảng trường trung tâm',
        NGAY_BAT_DAU: '2026-11-05',
        NGAY_KET_THUC: '2026-11-09',
        SO_NGAY: 5,
        SO_BUOI: '5 ngày',
        DU_KIEN_THU: 5200000,
        DUOC_DUYET: 5200000,
        HAN_THANH_TOAN: '2026-11-22',
        TRANG_THAI: 'Chưa thực hiện',
        GHI_CHU: 'Đã duyệt kinh phí 5.200.000đ, chuẩn bị triển khai ngày 05/11',
        TAI_LIEU: '',
        CREATED_AT: now,
        UPDATED_AT: now
      }
    ];

    const sampleWorkTransactions = [
      // CV-001: Đã ứng 2.000.000đ (Duyệt 4.500.000đ -> Còn 2.500.000đ)
      {
        ID_GIAO_DICH: 'GDCV-01',
        ID_CONG_VIEC: 'CV-202611-001',
        NGAY_GIAO_DICH: '2026-10-20',
        LOAI_GIAO_DICH: 'Tạm ứng nhận được',
        SO_TIEN: 2000000,
        TAI_KHOAN_ID: 'TK-TIEN-MAT',
        NOI_DUNG: 'Tạm ứng đợt 1 tiền vật tư và công treo băng rôn',
        CHUNG_TU: 'PTU-1020',
        GHI_CHU: 'Nhận tiền mặt'
      },
      // CV-002: Minh họa chính xác bảng ví dụ Mục 3.3 của Đề án (Dự kiến 3tr, Duyệt 2.8tr, Ứng 1: 500k, Ứng 2: 300k, Thanh toán bổ sung: 1tr -> Đã nhận 1.8tr, Còn 1tr)
      {
        ID_GIAO_DICH: 'GDCV-02',
        ID_CONG_VIEC: 'CV-202611-002',
        NGAY_GIAO_DICH: '2026-10-25',
        LOAI_GIAO_DICH: 'Tạm ứng nhận được',
        SO_TIEN: 500000,
        TAI_KHOAN_ID: 'TK-TIEN-MAT',
        NOI_DUNG: 'Tạm ứng lần 1 chuẩn bị Hội diễn văn nghệ',
        CHUNG_TU: 'PTU-1025',
        GHI_CHU: 'Đợt 1'
      },
      {
        ID_GIAO_DICH: 'GDCV-03',
        ID_CONG_VIEC: 'CV-202611-002',
        NGAY_GIAO_DICH: '2026-10-26',
        LOAI_GIAO_DICH: 'Tạm ứng nhận được',
        SO_TIEN: 300000,
        TAI_KHOAN_ID: 'TK-TIEN-MAT',
        NOI_DUNG: 'Tạm ứng lần 2 trực đêm chung khảo văn nghệ',
        CHUNG_TU: 'PTU-1026',
        GHI_CHU: 'Đợt 2'
      },
      {
        ID_GIAO_DICH: 'GDCV-04',
        ID_CONG_VIEC: 'CV-202611-002',
        NGAY_GIAO_DICH: '2026-10-29',
        LOAI_GIAO_DICH: 'Thanh toán bổ sung',
        SO_TIEN: 1000000,
        TAI_KHOAN_ID: 'TK-VCB',
        NOI_DUNG: 'Thanh toán bổ sung đợt 1 Hội diễn văn nghệ',
        CHUNG_TU: 'UNC-VCB-1029',
        GHI_CHU: 'Chuyển khoản Vietcombank'
      },
      // CV-003: Đã nhận đủ 2.500.000đ
      {
        ID_GIAO_DICH: 'GDCV-05',
        ID_CONG_VIEC: 'CV-202611-003',
        NGAY_GIAO_DICH: '2026-10-15',
        LOAI_GIAO_DICH: 'Tạm ứng nhận được',
        SO_TIEN: 1000000,
        TAI_KHOAN_ID: 'TK-MB-BANK',
        NOI_DUNG: 'Tạm ứng xăng xe và công tác phí chạy xe loa lưu động',
        CHUNG_TU: 'UNC-MB-1015',
        GHI_CHU: ''
      },
      {
        ID_GIAO_DICH: 'GDCV-06',
        ID_CONG_VIEC: 'CV-202611-003',
        NGAY_GIAO_DICH: '2026-10-28',
        LOAI_GIAO_DICH: 'Thanh toán bổ sung',
        SO_TIEN: 1500000,
        TAI_KHOAN_ID: 'TK-MB-BANK',
        NOI_DUNG: 'Quyết toán đủ tiền công lái xe tuyên truyền lưu động',
        CHUNG_TU: 'UNC-MB-1028',
        GHI_CHU: 'Hoàn tất 100%'
      },
      // CV-004: Đang thực hiện, ứng trước 1.000.000đ
      {
        ID_GIAO_DICH: 'GDCV-07',
        ID_CONG_VIEC: 'CV-202611-004',
        NGAY_GIAO_DICH: '2026-11-01',
        LOAI_GIAO_DICH: 'Tạm ứng nhận được',
        SO_TIEN: 1000000,
        TAI_KHOAN_ID: 'TK-VCB',
        NOI_DUNG: 'Tạm ứng chuẩn bị Giải TDTT chào mừng 20/11',
        CHUNG_TU: 'UNC-VCB-1101',
        GHI_CHU: ''
      }
    ];

    const sampleIncomes = [
      {
        ID_THU: 'THU-202611-01',
        NGAY_THU: '2026-10-15',
        LOAI_THU: 'Lương hằng tháng',
        NOI_DUNG: 'Lương và phụ cấp chuyên môn kỳ lương 13/10 – 12/11/2026',
        SO_TIEN: 12500000,
        DU_KIEN: 12500000,
        TAI_KHOAN_ID: 'TK-MB-BANK',
        KY_LUONG: '2026-11',
        GHI_CHU: 'Nhận lương qua MB Bank đúng ngày 15'
      },
      {
        ID_THU: 'THU-202611-02',
        NGAY_THU: '2026-10-22',
        LOAI_THU: 'Tiền hỗ trợ',
        NOI_DUNG: 'Tiền hỗ trợ trực cơ quan & công tác cơ sở cuối tuần',
        SO_TIEN: 1600000,
        DU_KIEN: 1500000,
        TAI_KHOAN_ID: 'TK-MB-BANK',
        KY_LUONG: '2026-11',
        GHI_CHU: 'Vượt dự kiến 100.000đ'
      },
      {
        ID_THU: 'THU-202611-03',
        NGAY_THU: '2026-10-30',
        LOAI_THU: 'Tiền làm thêm',
        NOI_DUNG: 'Bồi dưỡng hỗ trợ biên tập chương trình phát thanh cơ sở',
        SO_TIEN: 1200000,
        DU_KIEN: 1200000,
        TAI_KHOAN_ID: 'TK-VCB',
        KY_LUONG: '2026-11',
        GHI_CHU: ''
      }
    ];

    const sampleExpenses = [
      {
        ID_CHI: 'CHI-202611-01',
        NGAY_CHI: '2026-10-16',
        NHOM_CHI: 'Đưa vợ',
        NOI_DUNG: 'Đưa vợ tiền lương đợt 1 chăm lo gia đình & học phí cho con',
        SO_TIEN: 8000000,
        TAI_KHOAN_ID: 'TK-MB-BANK',
        HINH_THUC_TT: 'Chuyển khoản',
        LOAI_CHI: 'Gia đình ưu tiên',
        CHUNG_TU: 'CK-MB-1016',
        GHI_CHU: 'Chuyển khoản ngay sau khi nhận lương'
      },
      {
        ID_CHI: 'CHI-202611-02',
        NGAY_CHI: '2026-10-29',
        NHOM_CHI: 'Đưa vợ',
        NOI_DUNG: 'Đưa vợ thêm tiền thù lao quyết toán công việc trong tháng',
        SO_TIEN: 2000000,
        TAI_KHOAN_ID: 'TK-MB-BANK',
        HINH_THUC_TT: 'Chuyển khoản',
        LOAI_CHI: 'Gia đình ưu tiên',
        CHUNG_TU: 'CK-MB-1029',
        GHI_CHU: 'Hoàn thành đủ định mức 10.000.000đ đưa vợ kỳ này'
      },
      {
        ID_CHI: 'CHI-202611-03',
        NGAY_CHI: '2026-10-18',
        NHOM_CHI: 'Sinh hoạt gia đình',
        NOI_DUNG: 'Thanh toán tiền điện, nước và mua vật dụng gia đình',
        SO_TIEN: 1350000,
        TAI_KHOAN_ID: 'TK-VCB',
        HINH_THUC_TT: 'Chuyển khoản',
        LOAI_CHI: 'Chi cố định',
        CHUNG_TU: '',
        GHI_CHU: ''
      },
      {
        ID_CHI: 'CHI-202611-04',
        NGAY_CHI: '2026-10-21',
        NHOM_CHI: 'Xăng xe',
        NOI_DUNG: 'Đổ xăng đi treo băng rôn, kiểm tra cơ sở & thay dầu máy',
        SO_TIEN: 680000,
        TAI_KHOAN_ID: 'TK-TIEN-MAT',
        HINH_THUC_TT: 'Tiền mặt',
        LOAI_CHI: 'Chi thường xuyên',
        CHUNG_TU: '',
        GHI_CHU: ''
      },
      {
        ID_CHI: 'CHI-202611-05',
        NGAY_CHI: '2026-10-26',
        NHOM_CHI: 'Ăn uống',
        NOI_DUNG: 'Ăn trưa cùng tổ kỹ thuật dựng sân khấu & cà phê giao ban',
        SO_TIEN: 920000,
        TAI_KHOAN_ID: 'TK-TIEN-MAT',
        HINH_THUC_TT: 'Tiền mặt',
        LOAI_CHI: 'Chi thường xuyên',
        CHUNG_TU: '',
        GHI_CHU: ''
      },
      {
        ID_CHI: 'CHI-202611-06',
        NGAY_CHI: '2026-10-28',
        NHOM_CHI: 'Điện thoại, Internet',
        NOI_DUNG: 'Cước 4G Viettel và Internet cáp quang tại nhà',
        SO_TIEN: 450000,
        TAI_KHOAN_ID: 'TK-VCB',
        HINH_THUC_TT: 'Chuyển khoản',
        LOAI_CHI: 'Chi cố định',
        CHUNG_TU: '',
        GHI_CHU: ''
      },
      {
        ID_CHI: 'CHI-202611-07',
        NGAY_CHI: '2026-10-31',
        NHOM_CHI: 'Con cái',
        NOI_DUNG: 'Mua sách tham khảo và đóng tiền câu lạc bộ thể thao cho con',
        SO_TIEN: 1100000,
        TAI_KHOAN_ID: 'TK-VCB',
        HINH_THUC_TT: 'Chuyển khoản',
        LOAI_CHI: 'Gia đình ưu tiên',
        CHUNG_TU: '',
        GHI_CHU: ''
      }
    ];

    const sampleSavings = [
      {
        ID_TIET_KIEM: 'TKM-01',
        TEN_MUC_TIEU: 'Quỹ Dự Phòng & Tích Lũy An Toàn Gia Đình',
        SO_TIEN_MUC_TIEU: 50000000,
        SO_TIEN_HIEN_TAI: 28000000,
        NGAY_BAT_DAU: '2026-01-01',
        HAN_HOAN_THANH: '2026-12-31',
        LAI_SUAT_NAM: 5.8,
        NOI_GUI: 'Tiết kiệm Online MB Bank',
        TRANG_THAI: 'Đang tích lũy',
        GHI_CHU: 'Trích đều đặn mỗi kỳ lương 2-3 triệu đồng'
      },
      {
        ID_TIET_KIEM: 'TKM-02',
        TEN_MUC_TIEU: 'Quỹ Học Tập & Tương Lai Cho Con',
        SO_TIEN_MUC_TIEU: 40000000,
        SO_TIEN_HIEN_TAI: 18500000,
        NGAY_BAT_DAU: '2026-02-15',
        HAN_HOAN_THANH: '2027-06-01',
        LAI_SUAT_NAM: 6.1,
        NOI_GUI: 'Sổ Tiết kiệm Vietcombank',
        TRANG_THAI: 'Đang tích lũy',
        GHI_CHU: 'Tích lũy từ nguồn thù lao sự kiện, hội diễn'
      },
      {
        ID_TIET_KIEM: 'TKM-03',
        TEN_MUC_TIEU: 'Quỹ Nâng Cấp Phương Tiện & Thiết Bị Làm Việc',
        SO_TIEN_MUC_TIEU: 25000000,
        SO_TIEN_HIEN_TAI: 10000000,
        NGAY_BAT_DAU: '2026-05-01',
        HAN_HOAN_THANH: '2027-03-30',
        LAI_SUAT_NAM: 5.5,
        NOI_GUI: 'Tiết kiệm Tích lũy MB Bank',
        TRANG_THAI: 'Đang tích lũy',
        GHI_CHU: ''
      }
    ];

    const sampleTransfers = [
      {
        ID_CHUYEN_TIEN: 'CK-202611-01',
        NGAY_CHUYEN: '2026-10-17',
        LOAI_CHUYEN: 'GUI_TIET_KIEM',
        TAI_KHOAN_DI: 'TK-MB-BANK',
        TAI_KHOAN_DEN: 'QUY_TIET_KIEM',
        ID_TIET_KIEM: 'TKM-01',
        SO_TIEN: 3000000,
        NOI_DUNG: 'Trích lương kỳ tháng 11 gửi vào Quỹ Dự Phòng Gia Đình',
        GHI_CHU: 'Chuyển khoản nội bộ sang tiết kiệm (không tính là chi tiêu)'
      },
      {
        ID_CHUYEN_TIEN: 'CK-202611-02',
        NGAY_CHUYEN: '2026-10-23',
        LOAI_CHUYEN: 'NOI_BO',
        TAI_KHOAN_DI: 'TK-MB-BANK',
        TAI_KHOAN_DEN: 'TK-TIEN-MAT',
        ID_TIET_KIEM: '',
        SO_TIEN: 1500000,
        NOI_DUNG: 'Rút tiền mặt tại ATM MB Bank để chi tiêu xăng xe & ăn trưa',
        GHI_CHU: 'Chuyển tiền nội bộ giữa tài khoản ngân hàng và ví tiền mặt'
      }
    ];

    const samplePlans = [
      {
        ID_KE_HOACH: 'KH-202611-01',
        LOAI_KE_HOACH: 'DU_THU',
        NHOM_HANG_MUC: 'Tiền thù lao',
        NOI_DUNG: 'Dự thu tiền quyết toán còn lại của Treo băng rôn (2.5tr) & Hội diễn văn nghệ (1tr)',
        SO_TIEN_DU_KIEN: 3500000,
        NGAY_DU_KIEN: '2026-11-08',
        KY_LUONG: '2026-11',
        TRANG_THAI: 'CHO_THUC_HIEN',
        ID_GIAO_DICH_THUC_TE: '',
        GHI_CHU: 'Kế toán hẹn thanh toán trong tuần đầu tháng 11'
      },
      {
        ID_KE_HOACH: 'KH-202611-02',
        LOAI_KE_HOACH: 'DU_THU',
        NHOM_HANG_MUC: 'Lương hằng tháng',
        NOI_DUNG: 'Dự kiến nhận lương chuyên môn kỳ tiếp theo (15/11/2026)',
        SO_TIEN_DU_KIEN: 12500000,
        NGAY_DU_KIEN: '2026-11-15',
        KY_LUONG: '2026-12',
        TRANG_THAI: 'CHO_THUC_HIEN',
        ID_GIAO_DICH_THUC_TE: '',
        GHI_CHU: ''
      },
      {
        ID_KE_HOACH: 'KH-202611-03',
        LOAI_KE_HOACH: 'DU_CHI',
        NHOM_HANG_MUC: 'Sinh hoạt gia đình',
        NOI_DUNG: 'Dự chi quà chúc mừng Ngày Nhà giáo Việt Nam 20/11 & họp phụ huynh',
        SO_TIEN_DU_KIEN: 1500000,
        NGAY_DU_KIEN: '2026-11-18',
        KY_LUONG: '2026-12',
        TRANG_THAI: 'CHO_THUC_HIEN',
        ID_GIAO_DICH_THUC_TE: '',
        GHI_CHU: ''
      },
      {
        ID_KE_HOACH: 'KH-202611-04',
        LOAI_KE_HOACH: 'DU_CHI',
        NHOM_HANG_MUC: 'Đưa vợ',
        NOI_DUNG: 'Kế hoạch đưa vợ kỳ lương tháng tới (15/11)',
        SO_TIEN_DU_KIEN: 10000000,
        NGAY_DU_KIEN: '2026-11-16',
        KY_LUONG: '2026-12',
        TRANG_THAI: 'CHO_THUC_HIEN',
        ID_GIAO_DICH_THUC_TE: '',
        GHI_CHU: 'Khoản ưu tiên số 1 mỗi kỳ lương'
      }
    ];

    return {
      config: defaultConfig,
      categories: defaultCategories,
      works: sampleWorks,
      workTransactions: sampleWorkTransactions,
      incomes: sampleIncomes,
      expenses: sampleExpenses,
      accounts: defaultAccounts,
      savings: sampleSavings,
      transfers: sampleTransfers,
      plans: samplePlans,
      reports: [],
      documents: [],
      logs: [
        { ID_LOG: 'LOG-01', THOI_GIAN: now, HANH_DONG: 'INIT_SYSTEM', PHAN_HE: 'HE_THONG', DOI_TUONG_ID: 'V2.0', MO_TA_CHI_TIET: 'Khởi tạo Hệ thống Sổ Tay Cá Nhân v2.0 với đầy đủ 13 bảng dữ liệu chuẩn.' }
      ]
    };
  }

  function loadLocalState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.config && Array.isArray(parsed.works)) {
          state = parsed;
          return state;
        }
      }
    } catch (e) {}
    state = createDefaultDatabaseState(true);
    saveLocalState();
    return state;
  }

  function saveLocalState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function getState() {
    if (!state) loadLocalState();
    return state;
  }

  function addLog(action, moduleName, targetId, detail) {
    const s = getState();
    const now = new Date();
    const pad = function(n) { return n < 10 ? '0' + n : n; };
    const ts = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' +
               pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    s.logs.unshift({
      ID_LOG: 'LOG-' + now.getTime(),
      THOI_GIAN: ts,
      HANH_DONG: action,
      PHAN_HE: moduleName,
      DOI_TUONG_ID: targetId || '',
      MO_TA_CHI_TIET: detail || ''
    });
    if (s.logs.length > 150) s.logs.length = 150;
    saveLocalState();
  }

  function generateId(prefix) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return (prefix || 'ID') + '-' + Date.now().toString().slice(-6) + '-' + rand;
  }

  function upsertCollection(collectionKey, idField, item, prefix, logTitle) {
    const s = getState();
    const list = s[collectionKey] || [];
    if (!item[idField]) {
      item[idField] = generateId(prefix);
    }
    const idx = list.findIndex(function(x) { return String(x[idField]) === String(item[idField]); });
    if (idx >= 0) {
      list[idx] = Object.assign({}, list[idx], item);
      addLog('CAP_NHAT', collectionKey.toUpperCase(), item[idField], 'Cập nhật ' + (logTitle || item[idField]));
    } else {
      list.unshift(item);
      addLog('THEM_MOI', collectionKey.toUpperCase(), item[idField], 'Thêm mới ' + (logTitle || item[idField]));
    }
    s[collectionKey] = list;
    saveLocalState();

    // Nếu đang chạy trong Google Apps Script hoặc có URL đồng bộ, gửi ngầm lên Cloud
    syncSingleActionToCloud(collectionKey, item);
    return item;
  }

  function deleteFromCollection(collectionKey, idField, idValue, logTitle) {
    const s = getState();
    const list = s[collectionKey] || [];
    s[collectionKey] = list.filter(function(x) { return String(x[idField]) !== String(idValue); });
    addLog('XOA_MEM', collectionKey.toUpperCase(), idValue, 'Xóa ' + (logTitle || idValue));
    saveLocalState();
    return true;
  }

  /**
   * Đồng bộ với Google Apps Script (Nếu chạy trên GAS hoặc người dùng đã cấu hình Web App URL)
   */
  function syncSingleActionToCloud(collectionKey, item) {
    const actionMap = {
      works: 'saveWork',
      workTransactions: 'saveWorkTransaction',
      incomes: 'saveIncome',
      expenses: 'saveExpense',
      accounts: 'saveAccount',
      savings: 'saveSaving',
      transfers: 'saveTransfer',
      plans: 'savePlan',
      categories: 'saveCategory'
    };
    const action = actionMap[collectionKey];
    if (!action) return;

    if (isRunningInGAS()) {
      google.script.run.apiCall(action, item);
    } else {
      const url = getRemoteGasUrl();
      if (url) {
        fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: action, payload: item })
        }).catch(function() {});
      }
    }
  }

  /**
   * Tải dữ liệu từ Google Sheets về (nếu chạy trong GAS hoặc có Web App URL)
   */
  function fetchFromCloud(callback) {
    if (isRunningInGAS()) {
      google.script.run
        .withSuccessHandler(function(res) {
          if (res && res.success) {
            state = {
              config: res.config || state.config,
              categories: res.categories || [],
              works: res.works || [],
              workTransactions: res.workTransactions || [],
              incomes: res.incomes || [],
              expenses: res.expenses || [],
              accounts: res.accounts || [],
              savings: res.savings || [],
              transfers: res.transfers || [],
              plans: res.plans || [],
              reports: res.reports || [],
              documents: res.documents || [],
              logs: res.logs || []
            };
            saveLocalState();
            if (callback) callback(true, 'Đã đồng bộ dữ liệu trực tiếp từ Google Sheets!');
          } else if (callback) {
            callback(false, (res && res.message) || 'Không thể đọc dữ liệu từ Google Sheets.');
          }
        })
        .withFailureHandler(function(err) {
          if (callback) callback(false, err.message);
        })
        .apiCall('getBootstrapData', {});
      return;
    }

    const url = getRemoteGasUrl();
    if (!url) {
      if (callback) callback(false, 'Chưa cấu hình URL Web App Google Apps Script.');
      return;
    }

    const sep = url.indexOf('?') === -1 ? '?' : '&';
    fetch(url + sep + 'mode=api&action=getBootstrapData')
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (res && res.success) {
          state = {
            config: res.config || state.config,
            categories: res.categories || [],
            works: res.works || [],
            workTransactions: res.workTransactions || [],
            incomes: res.incomes || [],
            expenses: res.expenses || [],
            accounts: res.accounts || [],
            savings: res.savings || [],
            transfers: res.transfers || [],
            plans: res.plans || [],
            reports: res.reports || [],
            documents: res.documents || [],
            logs: res.logs || []
          };
          saveLocalState();
          if (callback) callback(true, 'Đã tải dữ liệu mới nhất từ Google Sheets!');
        } else if (callback) {
          callback(false, (res && res.message) || 'Phản hồi không hợp lệ.');
        }
      })
      .catch(function(err) {
        if (callback) callback(false, 'Lỗi kết nối URL Google Apps Script: ' + err.message);
      });
  }

  /**
   * Đẩy toàn bộ dữ liệu hiện tại lên Google Sheets
   */
  function pushAllToCloud(callback) {
    const s = getState();
    if (isRunningInGAS()) {
      google.script.run
        .withSuccessHandler(function(res) {
          if (callback) callback(res && res.success, (res && res.message) || 'Đã đồng bộ lên Google Sheets!');
        })
        .withFailureHandler(function(err) {
          if (callback) callback(false, err.message);
        })
        .apiCall('syncFullSnapshot', s);
      return;
    }

    const url = getRemoteGasUrl();
    if (!url) {
      if (callback) callback(false, 'Vui lòng nhập URL Web App Google Apps Script trong mục Cài đặt trước.');
      return;
    }

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'syncFullSnapshot', payload: s })
    })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (callback) callback(true, (res && res.message) || 'Đã đẩy toàn bộ dữ liệu lên Google Sheets!');
      })
      .catch(function() {
        if (callback) callback(true, 'Đã gửi yêu cầu đồng bộ dữ liệu lên Google Sheets!');
      });
  }

  function resetToSampleData() {
    state = createDefaultDatabaseState(true);
    saveLocalState();
    return state;
  }

  function clearAllBusinessData() {
    state = createDefaultDatabaseState(false);
    saveLocalState();
    return state;
  }

  function importFullJson(jsonObj) {
    if (!jsonObj || !jsonObj.config || !Array.isArray(jsonObj.accounts)) {
      throw new Error('Tệp sao lưu JSON không đúng cấu trúc Sổ Tay Cá Nhân.');
    }
    state = jsonObj;
    addLog('KHOI_PHUC', 'SAO_LUU', 'JSON_IMPORT', 'Khôi phục toàn bộ dữ liệu từ tệp sao lưu JSON.');
    saveLocalState();
    return state;
  }

  return {
    getState: getState,
    saveLocalState: saveLocalState,
    upsertCollection: upsertCollection,
    deleteFromCollection: deleteFromCollection,
    generateId: generateId,
    addLog: addLog,
    isRunningInGAS: isRunningInGAS,
    getRemoteGasUrl: getRemoteGasUrl,
    setRemoteGasUrl: setRemoteGasUrl,
    fetchFromCloud: fetchFromCloud,
    pushAllToCloud: pushAllToCloud,
    resetToSampleData: resetToSampleData,
    clearAllBusinessData: clearAllBusinessData,
    importFullJson: importFullJson
  };
})();
