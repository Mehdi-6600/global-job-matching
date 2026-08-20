// src/lib/payment/plans.ts

export const PLANS = [
  {
    id: "free",
    name: "رایگان",
    price: 0,
    features: [
      "مشاهده ۵ شغل در روز",
      "ذخیره ۲ شغل",
      "پشتیبانی پایه"
    ],
  },
  {
    id: "pro",
    name: "حرفه‌ای",
    price: 9.99,
    features: [
      "مشاهده نامحدود شغل",
      "ذخیره نامحدود شغل",
      "اولویت در جستجو",
      "پشتیبانی ۲۴/۷"
    ],
  },
  {
    id: "employer",
    name: "کارفرما",
    price: 29.99,
    features: [
      "همه امکانات پلن حرفه‌ای",
      "انتشار آگهی شغل",
      "دسترسی به رزومه‌ها",
      "تحلیل بازار کار"
    ],
  },
];

export const WALLETS = {
  "BTC": "bc1qd8pz8kh8ghh5dzlz4y5t8fgzyhe6y8y67j33m3",
  "USDT-ERC20": "0x0CAF488206AC367C37Cd6a56C71d9b1BC9D7Be5c",
  "USDT-TRC20": "TU3QBM4VnypRobQHh1w1n7QXdFQ8yPqRex",
  "DOGE": "DJyuoTooAZYdC8NPpuAbUBKhjmeoWSBnFS",
  "TON": "UQDol0GBbL3km5-9F4rEQO8UQnUo6XJbsG_LwBcG_6cPs1oh",
};
