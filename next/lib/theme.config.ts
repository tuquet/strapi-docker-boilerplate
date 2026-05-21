/**
 * CONFIGURATION ENGINE - CENTRAL THEME & STYLE OVERWRITES
 * Designed and Architected by Senior Frontend Architect.
 * 
 * Đây là trung tâm cấu hình giao diện (SaaS/Multitenant Template).
 * Giúp dễ dàng chuyển đổi phong cách giao diện từ "Doanh nghiệp (SaaS/Tech)" sang "Nghệ thuật (Tattoo Studio)"
 * mà không cần phải can thiệp hay sửa đổi trực tiếp vào cấu trúc code của từng component.
 */

export interface ThemeConfig {
  /**
   * Phông chữ chủ đạo cho các tiêu đề lớn (Heading).
   * Ví dụ:
   * - 'font-serif tracking-wide': Mang phong cách cổ điển, Gothic, thủ công, cực kỳ hợp cho tiệm Tattoo.
   * - 'font-sans font-bold': Mang phong cách hiện đại, tối giản, phù hợp cho SaaS/Tech.
   */
  titleFontClass: string;

  /**
   * Phông chữ cho phần nội dung mô tả (Body text).
   */
  bodyFontClass: string;

  /**
   * Cấu hình phông chữ và gradient màu chữ chung cho các thẻ Heading
   */
  heading: {
    fontClass?: string;
    gradientClass: string;
  };

  /**
   * Cấu hình chi tiết cho phần Hero Section
   */
  hero: {
    /**
     * Lớp phủ tiêu đề (ví dụ: hiệu ứng chữ gradient chuyển màu từ trắng sang xám)
     */
    titleGradientClass: string;
    
    /**
     * Bật/tắt hiệu ứng chữ phát sáng dạng Neon cho tiêu đề.
     */
    enableTitleGlow: boolean;

    /**
     * Giá trị đổ bóng neon cho chữ (text-shadow) nếu enableTitleGlow = true
     */
    titleGlowStyle: string;
  };

  /**
   * Cấu hình hiệu ứng phát sáng Neon dùng chung cho dự án
   */
  neonGlow: {
    primary: string; // Violet (ví dụ: 'rgba(139, 92, 246, 0.45)')
    secondary: string; // Blue (ví dụ: 'rgba(59, 130, 246, 0.25)')
    cardGlowText: {
      active: string; // Màu phát sáng khi cuộn đến card (phần Quy trình 3 bước)
      inactive: string; // Màu tĩnh của chữ số khi chưa cuộn đến
    };
  };

  /**
   * Các dải màu phát sáng nền (ambient light)
   */
  ambientGlow: {
    color1: string; // Vùng sáng lớn 1
    color2: string; // Vùng sáng 2
    color3: string; // Vùng sáng 3
  };

  /**
   * Cấu hình phong cách hiển thị cho nút bấm chính (Primary Button)
   */
  primaryButton: {
    /**
     * Variant mặc định của nút bấm.
     * - 'neon-glow': Nút bấm phát sáng viền Neon huyền ảo (hoàn hảo cho Tattoo Studio).
     * - 'primary': Nút bấm tiêu chuẩn màu solid sáng của template gốc.
     * - 'outline' | 'simple' | 'muted': Các dạng nút cơ bản khác.
     */
    variant: 'neon-glow' | 'primary' | 'outline' | 'simple' | 'muted';
    
    /**
     * Lớp Tailwind bổ sung riêng cho nút bấm chính
     */
    customClass?: string;

    /**
     * Thuộc tính màu phát sáng của nút bấm neon (rgba)
     */
    glowColor?: string;

    /**
     * Thuộc tính màu phát sáng của nút bấm neon khi hover (rgba)
     */
    hoverGlowColor?: string;

    /**
     * Lớp Tailwind màu viền cho nút bấm neon
     */
    borderColorClass?: string;
  };

  /**
   * Cấu hình màu sắc giao diện phần Bảng Giá (Pricing)
   */
  pricing: {
    badgeGradientClass: string;
    checkmarkBgClass: string;
  };

  /**
   * Cấu hình màu sắc phần Sản phẩm nổi bật (Featured Products)
   */
  products: {
    priceBadgeBgClass: string;
  };

  /**
   * Trạng thái hoạt động của các thành phần đồ họa nền
   */
  effects: {
    starBackground: boolean;
    shootingStars: boolean;
    canvasRevealColors: [number, number, number][]; // Mảng màu RGB dùng cho lưới hạt Canvas Reveal
  };
}

/**
 * CẤU HÌNH GIAO DIỆN HOÀN HẢO CHO TIỆM TATTOO (TATTOO STUDIO THEME OVERWRITE)
 */
export const themeConfig: ThemeConfig = {
  titleFontClass: 'font-serif tracking-wide italic font-semibold', // Chuyển sang phông Serif nghiêng nghệ thuật và phong trần
  bodyFontClass: 'font-sans',
  
  heading: {
    gradientClass: 'bg-clip-text text-transparent bg-gradient-to-b from-neutral-300 via-neutral-100 to-neutral-400',
  },

  hero: {
    titleGradientClass: 'bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 via-neutral-100 to-neutral-400',
    enableTitleGlow: true,
    titleGlowStyle: '0 0 40px rgba(139, 92, 246, 0.25), 0 0 15px rgba(59, 130, 246, 0.15)', // Neon glow nhẹ cho tiêu đề Hero
  },

  neonGlow: {
    primary: 'rgba(139, 92, 246, 0.45)', // Violet
    secondary: 'rgba(59, 130, 246, 0.25)', // Blue
    cardGlowText: {
      active: '0 0 25px rgba(139, 92, 246, 0.45), 0 0 10px rgba(59, 130, 246, 0.25)',
      inactive: '0 0 0px rgba(139, 92, 246, 0)',
    },
  },

  ambientGlow: {
    color1: 'hsla(260, 100%, 85%, .08)', // Violet HSL 260
    color2: 'hsla(220, 100%, 55%, .02)', // Blue/Indigo HSL 220
    color3: 'hsla(260, 100%, 45%, .02)', // Darker Violet
  },

  primaryButton: {
    variant: 'neon-glow', // Kích hoạt nút bấm phát sáng viền Neon
    customClass: 'hover:scale-105 transition-all duration-300 font-medium',
    glowColor: 'rgba(139, 92, 246, 0.3)',
    hoverGlowColor: 'rgba(139, 92, 246, 0.65)',
    borderColorClass: 'border-violet-500/50 hover:border-violet-400',
  },

  pricing: {
    badgeGradientClass: 'bg-gradient-to-r from-transparent via-violet-500 to-transparent',
    checkmarkBgClass: 'bg-violet-600',
  },

  products: {
    priceBadgeBgClass: 'bg-gradient-to-r from-purple-500 via-violet-500 to-blue-500',
  },

  effects: {
    starBackground: true,
    shootingStars: true,
    canvasRevealColors: [
      [139, 92, 246], // Violet
      [59, 130, 246],  // Blue
    ],
  },
};
