/**
 * 贸易常量配置
 * 港口、贸易条款、货币等常用配置
 * 使用常量而非数据库，提高性能
 */

// ==================== 常用港口 ====================
export const PORTS = [
  // 中国港口
  { code: 'CNSHA', name: 'Shanghai', name_cn: '上海港', country: 'China', country_cn: '中国', type: 'sea' },
  { code: 'CNNGB', name: 'Ningbo', name_cn: '宁波港', country: 'China', country_cn: '中国', type: 'sea' },
  { code: 'CNSZX', name: 'Shenzhen', name_cn: '深圳港', country: 'China', country_cn: '中国', type: 'sea' },
  { code: 'CNCAN', name: 'Guangzhou', name_cn: '广州港', country: 'China', country_cn: '中国', type: 'sea' },
  { code: 'CNTAO', name: 'Qingdao', name_cn: '青岛港', country: 'China', country_cn: '中国', type: 'sea' },
  { code: 'CNTXG', name: 'Tianjin', name_cn: '天津港', country: 'China', country_cn: '中国', type: 'sea' },
  { code: 'CNXMN', name: 'Xiamen', name_cn: '厦门港', country: 'China', country_cn: '中国', type: 'sea' },
  { code: 'CNDLC', name: 'Dalian', name_cn: '大连港', country: 'China', country_cn: '中国', type: 'sea' },
  { code: 'CNLYG', name: 'Lianyungang', name_cn: '连云港', country: 'China', country_cn: '中国', type: 'sea' },
  { code: 'CNFOC', name: 'Fuzhou', name_cn: '福州港', country: 'China', country_cn: '中国', type: 'sea' },
  
  // 美国港口
  { code: 'USLAX', name: 'Los Angeles', name_cn: '洛杉矶港', country: 'United States', country_cn: '美国', type: 'sea' },
  { code: 'USLGB', name: 'Long Beach', name_cn: '长滩港', country: 'United States', country_cn: '美国', type: 'sea' },
  { code: 'USNYC', name: 'New York', name_cn: '纽约港', country: 'United States', country_cn: '美国', type: 'sea' },
  { code: 'USSEA', name: 'Seattle', name_cn: '西雅图港', country: 'United States', country_cn: '美国', type: 'sea' },
  { code: 'USOAK', name: 'Oakland', name_cn: '奥克兰港', country: 'United States', country_cn: '美国', type: 'sea' },
  { code: 'USSAV', name: 'Savannah', name_cn: '萨凡纳港', country: 'United States', country_cn: '美国', type: 'sea' },
  
  // 欧洲港口
  { code: 'NLRTM', name: 'Rotterdam', name_cn: '鹿特丹港', country: 'Netherlands', country_cn: '荷兰', type: 'sea' },
  { code: 'DEHAM', name: 'Hamburg', name_cn: '汉堡港', country: 'Germany', country_cn: '德国', type: 'sea' },
  { code: 'BEANR', name: 'Antwerp', name_cn: '安特卫普港', country: 'Belgium', country_cn: '比利时', type: 'sea' },
  { code: 'GBFXT', name: 'Felixstowe', name_cn: '费利克斯托港', country: 'United Kingdom', country_cn: '英国', type: 'sea' },
  { code: 'GBLGP', name: 'London Gateway', name_cn: '伦敦门户港', country: 'United Kingdom', country_cn: '英国', type: 'sea' },
  
  // 亚洲其他港口
  { code: 'SGSIN', name: 'Singapore', name_cn: '新加坡港', country: 'Singapore', country_cn: '新加坡', type: 'sea' },
  { code: 'HKHKG', name: 'Hong Kong', name_cn: '香港港', country: 'Hong Kong', country_cn: '香港', type: 'sea' },
  { code: 'KRPUS', name: 'Busan', name_cn: '釜山港', country: 'South Korea', country_cn: '韩国', type: 'sea' },
  { code: 'JPTYO', name: 'Tokyo', name_cn: '东京港', country: 'Japan', country_cn: '日本', type: 'sea' },
  { code: 'JPYOK', name: 'Yokohama', name_cn: '横滨港', country: 'Japan', country_cn: '日本', type: 'sea' },
  { code: 'MYPKG', name: 'Port Klang', name_cn: '巴生港', country: 'Malaysia', country_cn: '马来西亚', type: 'sea' },
  { code: 'THBKK', name: 'Bangkok', name_cn: '曼谷港', country: 'Thailand', country_cn: '泰国', type: 'sea' },
  { code: 'VNSGN', name: 'Ho Chi Minh', name_cn: '胡志明港', country: 'Vietnam', country_cn: '越南', type: 'sea' },
  
  // 中东港口
  { code: 'AEJEA', name: 'Jebel Ali', name_cn: '杰贝阿里港', country: 'UAE', country_cn: '阿联酋', type: 'sea' },
  { code: 'AEDXB', name: 'Dubai', name_cn: '迪拜港', country: 'UAE', country_cn: '阿联酋', type: 'sea' },
  
  // 澳洲港口
  { code: 'AUSYD', name: 'Sydney', name_cn: '悉尼港', country: 'Australia', country_cn: '澳大利亚', type: 'sea' },
  { code: 'AUMEL', name: 'Melbourne', name_cn: '墨尔本港', country: 'Australia', country_cn: '澳大利亚', type: 'sea' },
] as const

export type PortCode = typeof PORTS[number]['code']

// ==================== 贸易条款 (Incoterms 2020) ====================
export const INCOTERMS = [
  { code: 'EXW', name: 'Ex Works', name_cn: '工厂交货', description: '卖方在其所在地交货' },
  { code: 'FCA', name: 'Free Carrier', name_cn: '货交承运人', description: '卖方将货物交给买方指定的承运人' },
  { code: 'CPT', name: 'Carriage Paid To', name_cn: '运费付至', description: '卖方支付运费至指定目的地' },
  { code: 'CIP', name: 'Carriage and Insurance Paid to', name_cn: '运费保险费付至', description: '卖方支付运费和保险费至指定目的地' },
  { code: 'DAP', name: 'Delivered At Place', name_cn: '目的地交货', description: '卖方在指定目的地交货' },
  { code: 'DPU', name: 'Delivered at Place Unloaded', name_cn: '卸货地交货', description: '卖方在指定目的地卸货后交货' },
  { code: 'DDU', name: 'Delivered Duty Unpaid', name_cn: '未完税交货', description: '卖方在指定目的地交货，买方负责清关和税费' },
  { code: 'DDP', name: 'Delivered Duty Paid', name_cn: '完税后交货', description: '卖方承担所有费用和风险至目的地' },
  { code: 'FAS', name: 'Free Alongside Ship', name_cn: '船边交货', description: '卖方在装运港船边交货（仅海运）' },
  { code: 'FOB', name: 'Free On Board', name_cn: '船上交货', description: '卖方在装运港船上交货（仅海运）' },
  { code: 'CFR', name: 'Cost and Freight', name_cn: '成本加运费', description: '卖方支付运费至目的港（仅海运）' },
  { code: 'CIF', name: 'Cost, Insurance and Freight', name_cn: '成本保险费加运费', description: '卖方支付运费和保险费至目的港（仅海运）' },
] as const

export type IncotermCode = typeof INCOTERMS[number]['code']

// ==================== 货币 ====================
export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', name_cn: '美元', symbol: '$' },
  { code: 'EUR', name: 'Euro', name_cn: '欧元', symbol: '€' },
  { code: 'CNY', name: 'Chinese Yuan', name_cn: '人民币', symbol: '¥' },
  { code: 'GBP', name: 'British Pound', name_cn: '英镑', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', name_cn: '日元', symbol: '¥' },
  { code: 'HKD', name: 'Hong Kong Dollar', name_cn: '港币', symbol: 'HK$' },
  { code: 'AUD', name: 'Australian Dollar', name_cn: '澳元', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', name_cn: '加元', symbol: 'C$' },
  { code: 'SGD', name: 'Singapore Dollar', name_cn: '新加坡元', symbol: 'S$' },
  { code: 'KRW', name: 'South Korean Won', name_cn: '韩元', symbol: '₩' },
  { code: 'THB', name: 'Thai Baht', name_cn: '泰铢', symbol: '฿' },
  { code: 'MYR', name: 'Malaysian Ringgit', name_cn: '马来西亚林吉特', symbol: 'RM' },
  { code: 'INR', name: 'Indian Rupee', name_cn: '印度卢比', symbol: '₹' },
  { code: 'AED', name: 'UAE Dirham', name_cn: '阿联酋迪拉姆', symbol: 'د.إ' },
] as const

export type CurrencyCode = typeof CURRENCIES[number]['code']

// ==================== 付款条款 ====================
export const PAYMENT_TERMS = [
  { code: 'TT_ADVANCE', name: 'T/T in Advance', name_cn: '预付电汇', description: '发货前全额付款' },
  { code: 'TT_30_70', name: 'T/T 30% advance, 70% before shipment', name_cn: '30%预付，70%发货前', description: '30%定金，70%发货前付清' },
  { code: 'TT_30_70_BL', name: 'T/T 30% advance, 70% against B/L', name_cn: '30%预付，70%见提单', description: '30%定金，70%见提单副本付款' },
  { code: 'TT100', name: 'T/T 100% before shipment', name_cn: '发货前付清', description: '发货前支付100%' },
  { code: 'TT50', name: 'T/T 50% deposit, 50% before shipment', name_cn: '50%定金，50%发货前', description: '50%定金，50%发货前付清' },
  { code: 'TT30', name: 'T/T 30% deposit, 70% before shipment', name_cn: '30%定金，70%发货前', description: '30%定金，70%发货前付清' },
  { code: 'LC_SIGHT', name: 'L/C at Sight', name_cn: '即期信用证', description: '即期不可撤销信用证' },
  { code: 'LC_30', name: 'L/C 30 Days', name_cn: '30天信用证', description: '30天远期信用证' },
  { code: 'LC_60', name: 'L/C 60 Days', name_cn: '60天信用证', description: '60天远期信用证' },
  { code: 'LC_90', name: 'L/C 90 Days', name_cn: '90天信用证', description: '90天远期信用证' },
  { code: 'DP_SIGHT', name: 'D/P at Sight', name_cn: '即期付款交单', description: '即期付款交单' },
  { code: 'DA_30', name: 'D/A 30 Days', name_cn: '30天承兑交单', description: '30天承兑交单' },
  { code: 'DA_60', name: 'D/A 60 Days', name_cn: '60天承兑交单', description: '60天承兑交单' },
  { code: 'OA_30', name: 'O/A 30 Days', name_cn: '30天赊销', description: '发货后30天付款' },
  { code: 'OA_60', name: 'O/A 60 Days', name_cn: '60天赊销', description: '发货后60天付款' },
  { code: 'OA_90', name: 'O/A 90 Days', name_cn: '90天赊销', description: '发货后90天付款' },
] as const

export type PaymentTermCode = typeof PAYMENT_TERMS[number]['code']

// ==================== Helper Functions ====================

export function findPortByCode(code: string) {
  return PORTS.find(p => p.code === code)
}

export function getPortsByCountry(country: string) {
  return PORTS.filter(p => p.country === country || p.country_cn === country)
}

export function getChinaPorts() {
  return PORTS.filter(p => p.country === 'China')
}

export function findIncotermByCode(code: string) {
  return INCOTERMS.find(i => i.code === code)
}

export function findCurrencyByCode(code: string) {
  return CURRENCIES.find(c => c.code === code)
}

export function findPaymentTermByCode(code: string) {
  return PAYMENT_TERMS.find(p => p.code === code)
}

// ==================== 托盘规格 ====================
export const PALLET_SPECS = [
  { code: 'EUR1', name: 'Euro Pallet', name_cn: '欧标托盘', length: 1200, width: 800, height: 144, maxLoad: 1500 },
  { code: 'EUR2', name: 'Euro Pallet 2', name_cn: '欧标托盘2', length: 1200, width: 1000, height: 144, maxLoad: 1500 },
  { code: 'ASIA', name: 'Asia Pallet', name_cn: '亚洲托盘', length: 1100, width: 1100, height: 150, maxLoad: 1500 },
  { code: 'US48', name: 'US Standard', name_cn: '美标托盘', length: 1219, width: 1016, height: 150, maxLoad: 1500 },
  { code: 'CN12', name: 'China Standard', name_cn: '中国标准托盘', length: 1200, width: 1200, height: 150, maxLoad: 1500 },
  { code: 'CN11', name: 'China 1100', name_cn: '中国1100托盘', length: 1100, width: 1100, height: 150, maxLoad: 1500 },
] as const

export type PalletSpecCode = typeof PALLET_SPECS[number]['code']

export interface PalletSpec {
  code: string
  name: string
  name_cn: string
  length: number  // mm
  width: number   // mm
  height: number  // mm (pallet's own height)
  maxLoad: number // kg
}

// ==================== 托盘材质 ====================
export const PALLET_MATERIALS = [
  { code: 'WOOD_FUMI', name: 'Fumigated Wood Pallet', name_cn: '熏蒸木托盘', color: '#8B7355', textureType: 'wood' as const, requiresFumigation: true },
  { code: 'WOOD_FREE', name: 'Fumigation-Free Wood Pallet', name_cn: '免熏蒸木托盘', color: '#DEB887', textureType: 'wood' as const, requiresFumigation: false },
  { code: 'PLYWOOD', name: 'Plywood Pallet', name_cn: '胶合板托盘', color: '#D2B48C', textureType: 'wood' as const, requiresFumigation: false },
  { code: 'PLASTIC', name: 'Plastic Pallet', name_cn: '塑料托盘', color: '#4169E1', textureType: 'plastic' as const, requiresFumigation: false },
  { code: 'METAL', name: 'Metal Pallet', name_cn: '金属托盘', color: '#708090', textureType: 'metal' as const, requiresFumigation: false },
] as const

export type PalletMaterialCode = typeof PALLET_MATERIALS[number]['code']

export interface PalletMaterial {
  code: string
  name: string
  name_cn: string
  color: string        // Hex color for 3D rendering
  textureType: 'wood' | 'plastic' | 'metal'
  requiresFumigation: boolean
}

// ==================== 单位 ====================
export const UNITS = [
  // 数量单位
  { code: 'PCS', name: 'Pieces', name_cn: '件', category: 'quantity' },
  { code: 'SETS', name: 'Sets', name_cn: '套', category: 'quantity' },
  { code: 'PAIRS', name: 'Pairs', name_cn: '双', category: 'quantity' },
  { code: 'DOZ', name: 'Dozens', name_cn: '打', category: 'quantity' },
  { code: 'CTN', name: 'Cartons', name_cn: '箱', category: 'quantity' },
  { code: 'PKG', name: 'Packages', name_cn: '包', category: 'quantity' },
  { code: 'ROL', name: 'Rolls', name_cn: '卷', category: 'quantity' },
  { code: 'EA', name: 'Each', name_cn: '个', category: 'quantity' },
  { code: 'KIT', name: 'Kit', name_cn: '套件', category: 'quantity' },
  { code: 'SET', name: 'Set', name_cn: '组', category: 'quantity' },
  { code: 'BX', name: 'Box', name_cn: '盒', category: 'quantity' },
  { code: 'BAG', name: 'Bag', name_cn: '袋', category: 'quantity' },
  { code: 'BTL', name: 'Bottle', name_cn: '瓶', category: 'quantity' },
  { code: 'CAN', name: 'Can', name_cn: '罐', category: 'quantity' },
  { code: 'DRM', name: 'Drum', name_cn: '桶', category: 'quantity' },

  // 重量单位
  { code: 'KG', name: 'Kilograms', name_cn: '千克', category: 'weight' },
  { code: 'G', name: 'Grams', name_cn: '克', category: 'weight' },
  { code: 'MG', name: 'Milligrams', name_cn: '毫克', category: 'weight' },
  { code: 'T', name: 'Metric Ton', name_cn: '公吨', category: 'weight' },
  { code: 'LB', name: 'Pounds', name_cn: '磅', category: 'weight' },
  { code: 'OZ', name: 'Ounces', name_cn: '盎司', category: 'weight' },
  { code: 'TON', name: 'Ton', name_cn: '吨', category: 'weight' },
  { code: 'CT', name: 'Carat', name_cn: '克拉', category: 'weight' },

  // 长度单位
  { code: 'M', name: 'Meters', name_cn: '米', category: 'length' },
  { code: 'CM', name: 'Centimeters', name_cn: '厘米', category: 'length' },
  { code: 'MM', name: 'Millimeters', name_cn: '毫米', category: 'length' },
  { code: 'IN', name: 'Inches', name_cn: '英寸', category: 'length' },
  { code: 'FT', name: 'Feet', name_cn: '英尺', category: 'length' },
  { code: 'YD', name: 'Yards', name_cn: '码', category: 'length' },
  { code: 'KM', name: 'Kilometers', name_cn: '公里', category: 'length' },

  // 面积单位
  { code: 'SQM', name: 'Square Meters', name_cn: '平方米', category: 'area' },
  { code: 'SQCM', name: 'Square Centimeters', name_cn: '平方厘米', category: 'area' },
  { code: 'SQMM', name: 'Square Millimeters', name_cn: '平方毫米', category: 'area' },
  { code: 'SQFT', name: 'Square Feet', name_cn: '平方英尺', category: 'area' },
  { code: 'SQIN', name: 'Square Inches', name_cn: '平方英寸', category: 'area' },
  { code: 'ARE', name: 'Are', name_cn: '公亩', category: 'area' },
  { code: 'HA', name: 'Hectare', name_cn: '公顷', category: 'area' },
  { code: 'ACRE', name: 'Acre', name_cn: '英亩', category: 'area' },

  // 体积单位
  { code: 'CBM', name: 'Cubic Meters', name_cn: '立方米', category: 'volume' },
  { code: 'L', name: 'Liters', name_cn: '升', category: 'volume' },
  { code: 'ML', name: 'Milliliters', name_cn: '毫升', category: 'volume' },
  { code: 'GL', name: 'Gallons', name_cn: '加仑', category: 'volume' },
  { code: 'QT', name: 'Quarts', name_cn: '夸脱', category: 'volume' },
  { code: 'PT', name: 'Pints', name_cn: '品脱', category: 'volume' },
  { code: 'CUFT', name: 'Cubic Feet', name_cn: '立方英尺', category: 'volume' },
  { code: 'CUI', name: 'Cubic Inches', name_cn: '立方英寸', category: 'volume' },
  { code: 'M3', name: 'Cubic Meter', name_cn: '立方米', category: 'volume' },

  // 时间单位
  { code: 'HR', name: 'Hours', name_cn: '小时', category: 'time' },
  { code: 'MIN', name: 'Minutes', name_cn: '分钟', category: 'time' },
  { code: 'SEC', name: 'Seconds', name_cn: '秒', category: 'time' },
  { code: 'DAY', name: 'Days', name_cn: '天', category: 'time' },
  { code: 'WK', name: 'Weeks', name_cn: '周', category: 'time' },
  { code: 'MON', name: 'Months', name_cn: '月', category: 'time' },
  { code: 'YR', name: 'Years', name_cn: '年', category: 'time' },
] as const

export type UnitCode = typeof UNITS[number]['code']

// ==================== Pallet Helper Functions ====================

export function findPalletSpecByCode(code: string): PalletSpec | undefined {
  return PALLET_SPECS.find(p => p.code === code) as PalletSpec | undefined
}

export function findPalletMaterialByCode(code: string): PalletMaterial | undefined {
  return PALLET_MATERIALS.find(m => m.code === code) as PalletMaterial | undefined
}

// Default exports for convenience
export default {
  PORTS,
  INCOTERMS,
  CURRENCIES,
  PAYMENT_TERMS,
  PALLET_SPECS,
  PALLET_MATERIALS,
  findPortByCode,
  getPortsByCountry,
  getChinaPorts,
  findIncotermByCode,
  findCurrencyByCode,
  findPaymentTermByCode,
  findPalletSpecByCode,
  findPalletMaterialByCode,
}
