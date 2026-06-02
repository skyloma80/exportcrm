/**
 * International Trade Standards Constants
 * 国际贸易标准常量
 * 
 * This file contains all standard constants used in international trade,
 * including Incoterms, container types, units, packaging, shipping methods, etc.
 */

// ============================================================================
// Incoterms 2020 - 国际贸易术语
// ============================================================================

export interface Incoterm {
  code: string;
  name: string;
  name_cn: string;
  description: string;
  description_cn: string;
  group: 'E' | 'F' | 'C' | 'D';
  applicableTo: 'any' | 'sea';
}

export const INCOTERMS: Record<string, Incoterm> = {
  EXW: {
    code: 'EXW',
    name: 'Ex Works',
    name_cn: '工厂交货',
    description: 'Seller makes goods available at their premises',
    description_cn: '卖方在其所在地将货物交给买方处置',
    group: 'E',
    applicableTo: 'any',
  },
  FCA: {
    code: 'FCA',
    name: 'Free Carrier',
    name_cn: '货交承运人',
    description: 'Seller delivers goods to carrier nominated by buyer',
    description_cn: '卖方将货物交给买方指定的承运人',
    group: 'F',
    applicableTo: 'any',
  },
  CPT: {
    code: 'CPT',
    name: 'Carriage Paid To',
    name_cn: '运费付至',
    description: 'Seller pays freight to named destination',
    description_cn: '卖方支付运费至指定目的地',
    group: 'C',
    applicableTo: 'any',
  },
  CIP: {
    code: 'CIP',
    name: 'Carriage and Insurance Paid To',
    name_cn: '运费保险费付至',
    description: 'Seller pays freight and insurance to named destination',
    description_cn: '卖方支付运费和保险费至指定目的地',
    group: 'C',
    applicableTo: 'any',
  },
  DAP: {
    code: 'DAP',
    name: 'Delivered At Place',
    name_cn: '目的地交货',
    description: 'Seller delivers goods at named place of destination',
    description_cn: '卖方在指定目的地交货',
    group: 'D',
    applicableTo: 'any',
  },
  DDU: {
    code: 'DDU',
    name: 'Delivered Duty Unpaid',
    name_cn: '未完税交货',
    description: 'Seller delivers goods to named place, buyer pays duties',
    description_cn: '卖方在指定目的地交货，买方支付关税',
    group: 'D',
    applicableTo: 'any',
  },
  DPU: {
    code: 'DPU',
    name: 'Delivered at Place Unloaded',
    name_cn: '卸货地交货',
    description: 'Seller delivers and unloads goods at named place',
    description_cn: '卖方在指定地点卸货交货',
    group: 'D',
    applicableTo: 'any',
  },
  DDP: {
    code: 'DDP',
    name: 'Delivered Duty Paid',
    name_cn: '完税后交货',
    description: 'Seller delivers goods cleared for import',
    description_cn: '卖方完成进口清关后交货',
    group: 'D',
    applicableTo: 'any',
  },
  FAS: {
    code: 'FAS',
    name: 'Free Alongside Ship',
    name_cn: '船边交货',
    description: 'Seller delivers goods alongside vessel at port',
    description_cn: '卖方在装运港将货物交至船边',
    group: 'F',
    applicableTo: 'sea',
  },
  FOB: {
    code: 'FOB',
    name: 'Free On Board',
    name_cn: '船上交货',
    description: 'Seller delivers goods on board vessel at port',
    description_cn: '卖方在装运港将货物装上船',
    group: 'F',
    applicableTo: 'sea',
  },
  CFR: {
    code: 'CFR',
    name: 'Cost and Freight',
    name_cn: '成本加运费',
    description: 'Seller pays freight to destination port',
    description_cn: '卖方支付运费至目的港',
    group: 'C',
    applicableTo: 'sea',
  },
  CIF: {
    code: 'CIF',
    name: 'Cost, Insurance and Freight',
    name_cn: '成本保险费加运费',
    description: 'Seller pays freight and insurance to destination port',
    description_cn: '卖方支付运费和保险费至目的港',
    group: 'C',
    applicableTo: 'sea',
  },
};

export const INCOTERM_LIST = Object.values(INCOTERMS);

// ============================================================================
// Container Types - 集装箱类型
// ============================================================================

export interface ContainerType {
  code: string;
  name: string;
  name_cn: string;
  length_ft: number;
  volume_cbm: number;
  max_weight_kg: number;
  internal_length_m: number;
  internal_width_m: number;
  internal_height_m: number;
}

export const CONTAINER_TYPES: Record<string, ContainerType> = {
  '20GP': {
    code: '20GP',
    name: "20' General Purpose",
    name_cn: '20英尺普通柜',
    length_ft: 20,
    volume_cbm: 28,
    max_weight_kg: 21770,
    internal_length_m: 5.9,
    internal_width_m: 2.35,
    internal_height_m: 2.39,
  },
  '40GP': {
    code: '40GP',
    name: "40' General Purpose",
    name_cn: '40英尺普通柜',
    length_ft: 40,
    volume_cbm: 58,
    max_weight_kg: 26680,
    internal_length_m: 12.03,
    internal_width_m: 2.35,
    internal_height_m: 2.39,
  },
  '40HQ': {
    code: '40HQ',
    name: "40' High Cube",
    name_cn: '40英尺高柜',
    length_ft: 40,
    volume_cbm: 68,
    max_weight_kg: 26460,
    internal_length_m: 12.03,
    internal_width_m: 2.35,
    internal_height_m: 2.69,
  },
  '45HQ': {
    code: '45HQ',
    name: "45' High Cube",
    name_cn: '45英尺高柜',
    length_ft: 45,
    volume_cbm: 76,
    max_weight_kg: 25600,
    internal_length_m: 13.56,
    internal_width_m: 2.35,
    internal_height_m: 2.69,
  },
  '20RF': {
    code: '20RF',
    name: "20' Reefer",
    name_cn: '20英尺冷藏柜',
    length_ft: 20,
    volume_cbm: 26,
    max_weight_kg: 21320,
    internal_length_m: 5.44,
    internal_width_m: 2.29,
    internal_height_m: 2.27,
  },
  '40RF': {
    code: '40RF',
    name: "40' Reefer",
    name_cn: '40英尺冷藏柜',
    length_ft: 40,
    volume_cbm: 56,
    max_weight_kg: 26280,
    internal_length_m: 11.56,
    internal_width_m: 2.29,
    internal_height_m: 2.27,
  },
  '20OT': {
    code: '20OT',
    name: "20' Open Top",
    name_cn: '20英尺开顶柜',
    length_ft: 20,
    volume_cbm: 27,
    max_weight_kg: 21750,
    internal_length_m: 5.89,
    internal_width_m: 2.35,
    internal_height_m: 2.35,
  },
  '40OT': {
    code: '40OT',
    name: "40' Open Top",
    name_cn: '40英尺开顶柜',
    length_ft: 40,
    volume_cbm: 57,
    max_weight_kg: 26630,
    internal_length_m: 12.03,
    internal_width_m: 2.35,
    internal_height_m: 2.35,
  },
};

export const CONTAINER_TYPE_LIST = Object.values(CONTAINER_TYPES);

// ============================================================================
// Units of Measurement - 计量单位
// ============================================================================

export interface Unit {
  code: string;
  name: string;
  name_cn: string;
  category: 'quantity' | 'weight' | 'length' | 'volume' | 'area';
}

export const UNITS: Record<string, Unit> = {
  // Quantity units - 数量单位
  PCS: { code: 'PCS', name: 'Pieces', name_cn: '个', category: 'quantity' },
  EA: { code: 'EA', name: 'Each', name_cn: '个', category: 'quantity' },
  UNIT: { code: 'UNIT', name: 'Unit', name_cn: '个', category: 'quantity' },

  SET: { code: 'SET', name: 'Sets', name_cn: '套', category: 'quantity' },
  PAIR: { code: 'PAIR', name: 'Pairs', name_cn: '对', category: 'quantity' },
  DOZ: { code: 'DOZ', name: 'Dozens', name_cn: '打', category: 'quantity' },
  CTN: { code: 'CTN', name: 'Cartons', name_cn: '箱', category: 'quantity' },
  PKG: { code: 'PKG', name: 'Packages', name_cn: '包', category: 'quantity' },
  ROLL: { code: 'ROLL', name: 'Rolls', name_cn: '卷', category: 'quantity' },

  // Weight units - 重量单位
  KG: { code: 'KG', name: 'Kilograms', name_cn: '千克', category: 'weight' },
  G: { code: 'G', name: 'Grams', name_cn: '克', category: 'weight' },
  MT: { code: 'MT', name: 'Metric Tons', name_cn: '公吨', category: 'weight' },
  LB: { code: 'LB', name: 'Pounds', name_cn: '磅', category: 'weight' },
  OZ: { code: 'OZ', name: 'Ounces', name_cn: '盎司', category: 'weight' },

  // Length units - 长度单位
  M: { code: 'M', name: 'Meters', name_cn: '米', category: 'length' },
  CM: { code: 'CM', name: 'Centimeters', name_cn: '厘米', category: 'length' },
  MM: { code: 'MM', name: 'Millimeters', name_cn: '毫米', category: 'length' },
  FT: { code: 'FT', name: 'Feet', name_cn: '英尺', category: 'length' },
  IN: { code: 'IN', name: 'Inches', name_cn: '英寸', category: 'length' },
  YD: { code: 'YD', name: 'Yards', name_cn: '码', category: 'length' },

  // Volume units - 体积单位
  CBM: { code: 'CBM', name: 'Cubic Meters', name_cn: '立方米', category: 'volume' },
  L: { code: 'L', name: 'Liters', name_cn: '升', category: 'volume' },
  ML: { code: 'ML', name: 'Milliliters', name_cn: '毫升', category: 'volume' },
  CUFT: { code: 'CUFT', name: 'Cubic Feet', name_cn: '立方英尺', category: 'volume' },
  GAL: { code: 'GAL', name: 'Gallons', name_cn: '加仑', category: 'volume' },

  // Area units - 面积单位
  SQM: { code: 'SQM', name: 'Square Meters', name_cn: '平方米', category: 'area' },
  SQFT: { code: 'SQFT', name: 'Square Feet', name_cn: '平方英尺', category: 'area' },
};

export const UNIT_LIST = Object.values(UNITS);
export const QUANTITY_UNITS = UNIT_LIST.filter(u => u.category === 'quantity');
export const WEIGHT_UNITS = UNIT_LIST.filter(u => u.category === 'weight');
export const LENGTH_UNITS = UNIT_LIST.filter(u => u.category === 'length');
export const VOLUME_UNITS = UNIT_LIST.filter(u => u.category === 'volume');

// ============================================================================
// Packaging Types - 包装类型
// ============================================================================

export interface PackagingType {
  code: string;
  name: string;
  name_cn: string;
}

export const PACKAGING_TYPES: Record<string, PackagingType> = {
  CARTON: { code: 'CARTON', name: 'Carton', name_cn: '纸箱' },
  PALLET: { code: 'PALLET', name: 'Pallet', name_cn: '木托盘' },
  CASE: { code: 'CASE', name: 'Wooden Case', name_cn: '木箱' },
  CRATE: { code: 'CRATE', name: 'Wooden Crate', name_cn: '木条箱' },
  BAG: { code: 'BAG', name: 'Bag', name_cn: '编织袋' },
  DRUM: { code: 'DRUM', name: 'Drum', name_cn: '铁桶' },
  BUNDLE: { code: 'BUNDLE', name: 'Bundle', name_cn: '捆装' },
  ROLL: { code: 'ROLL', name: 'Roll', name_cn: '卷装' },
  BULK: { code: 'BULK', name: 'Bulk', name_cn: '散装' },
  CONTAINER: { code: 'CONTAINER', name: 'Container', name_cn: '集装箱' },
  SHRINK_WRAP: { code: 'SHRINK_WRAP', name: 'Shrink Wrap', name_cn: '热缩膜' },
  BLISTER: { code: 'BLISTER', name: 'Blister Pack', name_cn: '吸塑包装' },
};

export const PACKAGING_TYPE_LIST = Object.values(PACKAGING_TYPES);

// ============================================================================
// Shipping Methods - 运输方式
// ============================================================================

export interface ShippingMethod {
  code: string;
  name: string;
  name_cn: string;
  category: 'sea' | 'air' | 'land' | 'express' | 'rail';
}

export const SHIPPING_METHODS: Record<string, ShippingMethod> = {
  // Sea freight - 海运
  SEA_FCL: { code: 'SEA_FCL', name: 'Sea FCL (Full Container Load)', name_cn: '海运整箱', category: 'sea' },
  SEA_LCL: { code: 'SEA_LCL', name: 'Sea LCL (Less Container Load)', name_cn: '海运拼箱', category: 'sea' },
  SEA_BULK: { code: 'SEA_BULK', name: 'Sea Bulk', name_cn: '海运散货', category: 'sea' },

  // Air freight - 空运
  AIR_EXPRESS: { code: 'AIR_EXPRESS', name: 'Air Express', name_cn: '航空快递', category: 'air' },
  AIR_CARGO: { code: 'AIR_CARGO', name: 'Air Cargo', name_cn: '航空货运', category: 'air' },

  // Land transport - 陆运
  TRUCK: { code: 'TRUCK', name: 'Truck', name_cn: '卡车运输', category: 'land' },

  // Rail - 铁路
  RAIL: { code: 'RAIL', name: 'Rail', name_cn: '铁路运输', category: 'rail' },
  RAIL_CHINA_EUROPE: { code: 'RAIL_CHINA_EUROPE', name: 'China-Europe Railway', name_cn: '中欧班列', category: 'rail' },

  // Express - 快递
  DHL: { code: 'DHL', name: 'DHL Express', name_cn: 'DHL快递', category: 'express' },
  FEDEX: { code: 'FEDEX', name: 'FedEx', name_cn: '联邦快递', category: 'express' },
  UPS: { code: 'UPS', name: 'UPS', name_cn: 'UPS快递', category: 'express' },
  TNT: { code: 'TNT', name: 'TNT', name_cn: 'TNT快递', category: 'express' },
  SF: { code: 'SF', name: 'SF Express', name_cn: '顺丰速运', category: 'express' },
};

export const SHIPPING_METHOD_LIST = Object.values(SHIPPING_METHODS);

// ============================================================================
// Insurance Types - 保险类型
// ============================================================================

export interface InsuranceType {
  code: string;
  name: string;
  name_cn: string;
  category: 'basic' | 'additional' | 'special';
  description: string;
}

export const INSURANCE_TYPES: Record<string, InsuranceType> = {
  // Basic insurance - 基本险
  FPA: {
    code: 'FPA',
    name: 'Free from Particular Average',
    name_cn: '平安险',
    category: 'basic',
    description: 'Covers total loss and general average only',
  },
  WPA: {
    code: 'WPA',
    name: 'With Particular Average',
    name_cn: '水渍险',
    category: 'basic',
    description: 'Covers partial loss caused by natural disasters',
  },
  ALL_RISKS: {
    code: 'ALL_RISKS',
    name: 'All Risks',
    name_cn: '一切险',
    category: 'basic',
    description: 'Covers all risks of physical loss or damage',
  },

  // Additional insurance - 附加险
  TPND: {
    code: 'TPND',
    name: 'Theft, Pilferage and Non-Delivery',
    name_cn: '盗窃提货不着险',
    category: 'additional',
    description: 'Covers theft and non-delivery',
  },
  RAIN: {
    code: 'RAIN',
    name: 'Fresh Water Rain Damage',
    name_cn: '淡水雨淋险',
    category: 'additional',
    description: 'Covers damage from fresh water and rain',
  },
  BREAKAGE: {
    code: 'BREAKAGE',
    name: 'Breakage',
    name_cn: '破碎险',
    category: 'additional',
    description: 'Covers breakage of fragile goods',
  },
  LEAKAGE: {
    code: 'LEAKAGE',
    name: 'Leakage',
    name_cn: '渗漏险',
    category: 'additional',
    description: 'Covers leakage of liquid cargo',
  },
  RUST: {
    code: 'RUST',
    name: 'Rust',
    name_cn: '锈损险',
    category: 'additional',
    description: 'Covers rust damage to metal goods',
  },

  // Special insurance - 特殊险
  STRIKE: {
    code: 'STRIKE',
    name: 'Strike Risk',
    name_cn: '罢工险',
    category: 'special',
    description: 'Covers loss due to strikes',
  },
  WAR: {
    code: 'WAR',
    name: 'War Risk',
    name_cn: '战争险',
    category: 'special',
    description: 'Covers loss due to war',
  },
};

export const INSURANCE_TYPE_LIST = Object.values(INSURANCE_TYPES);

// ============================================================================
// Mold Types - 模具类型 (for metal processing)
// ============================================================================

export interface MoldType {
  code: string;
  name: string;
  name_cn: string;
}

export const MOLD_TYPES: Record<string, MoldType> = {
  DIE_CASTING: { code: 'DIE_CASTING', name: 'Die Casting Mold', name_cn: '压铸模' },
  STAMPING: { code: 'STAMPING', name: 'Stamping Die', name_cn: '冲压模' },
  INJECTION: { code: 'INJECTION', name: 'Injection Mold', name_cn: '注塑模' },
  CNC_FIXTURE: { code: 'CNC_FIXTURE', name: 'CNC Fixture', name_cn: 'CNC夹具' },
  FORGING: { code: 'FORGING', name: 'Forging Die', name_cn: '锻造模' },
  EXTRUSION: { code: 'EXTRUSION', name: 'Extrusion Die', name_cn: '挤压模' },
};

export const MOLD_TYPE_LIST = Object.values(MOLD_TYPES);

// ============================================================================
// Surface Treatments - 表面处理 (for metal processing)
// ============================================================================

export interface SurfaceTreatment {
  code: string;
  name: string;
  name_cn: string;
}

export const SURFACE_TREATMENTS: Record<string, SurfaceTreatment> = {
  ANODIZING: { code: 'ANODIZING', name: 'Anodizing', name_cn: '阳极氧化' },
  ELECTROPLATING: { code: 'ELECTROPLATING', name: 'Electroplating', name_cn: '电镀' },
  POWDER_COATING: { code: 'POWDER_COATING', name: 'Powder Coating', name_cn: '粉末喷涂' },
  PAINTING: { code: 'PAINTING', name: 'Painting', name_cn: '喷漆' },
  POLISHING: { code: 'POLISHING', name: 'Polishing', name_cn: '抛光' },
  BRUSHING: { code: 'BRUSHING', name: 'Brushing', name_cn: '拉丝' },
  SANDBLASTING: { code: 'SANDBLASTING', name: 'Sandblasting', name_cn: '喷砂' },
  PASSIVATION: { code: 'PASSIVATION', name: 'Passivation', name_cn: '钝化' },
  GALVANIZING: { code: 'GALVANIZING', name: 'Galvanizing', name_cn: '镀锌' },
  CHROME_PLATING: { code: 'CHROME_PLATING', name: 'Chrome Plating', name_cn: '镀铬' },
  NICKEL_PLATING: { code: 'NICKEL_PLATING', name: 'Nickel Plating', name_cn: '镀镍' },
  E_COATING: { code: 'E_COATING', name: 'E-Coating', name_cn: '电泳' },
};

export const SURFACE_TREATMENT_LIST = Object.values(SURFACE_TREATMENTS);

// ============================================================================
// Materials - 材质 (for metal processing)
// ============================================================================

export interface Material {
  code: string;
  name: string;
  name_cn: string;
  category: 'aluminum' | 'steel' | 'stainless' | 'copper' | 'zinc' | 'other';
}

export const MATERIALS: Record<string, Material> = {
  // Aluminum alloys
  AL6061: { code: 'AL6061', name: 'Aluminum 6061', name_cn: '铝合金6061', category: 'aluminum' },
  AL6063: { code: 'AL6063', name: 'Aluminum 6063', name_cn: '铝合金6063', category: 'aluminum' },
  AL7075: { code: 'AL7075', name: 'Aluminum 7075', name_cn: '铝合金7075', category: 'aluminum' },
  ADC12: { code: 'ADC12', name: 'ADC12 Die Cast Aluminum', name_cn: '压铸铝ADC12', category: 'aluminum' },
  A380: { code: 'A380', name: 'A380 Die Cast Aluminum', name_cn: '压铸铝A380', category: 'aluminum' },

  // Carbon steel
  Q235: { code: 'Q235', name: 'Carbon Steel Q235', name_cn: '碳钢Q235', category: 'steel' },
  Q345: { code: 'Q345', name: 'Carbon Steel Q345', name_cn: '碳钢Q345', category: 'steel' },
  SPCC: { code: 'SPCC', name: 'Cold Rolled Steel SPCC', name_cn: '冷轧钢SPCC', category: 'steel' },
  SPHC: { code: 'SPHC', name: 'Hot Rolled Steel SPHC', name_cn: '热轧钢SPHC', category: 'steel' },

  // Stainless steel
  SS304: { code: 'SS304', name: 'Stainless Steel 304', name_cn: '不锈钢304', category: 'stainless' },
  SS316: { code: 'SS316', name: 'Stainless Steel 316', name_cn: '不锈钢316', category: 'stainless' },
  SS201: { code: 'SS201', name: 'Stainless Steel 201', name_cn: '不锈钢201', category: 'stainless' },

  // Copper alloys
  BRASS: { code: 'BRASS', name: 'Brass', name_cn: '黄铜', category: 'copper' },
  BRONZE: { code: 'BRONZE', name: 'Bronze', name_cn: '青铜', category: 'copper' },
  COPPER: { code: 'COPPER', name: 'Pure Copper', name_cn: '紫铜', category: 'copper' },

  // Zinc alloys
  ZAMAK3: { code: 'ZAMAK3', name: 'Zamak 3', name_cn: '锌合金3号', category: 'zinc' },
  ZAMAK5: { code: 'ZAMAK5', name: 'Zamak 5', name_cn: '锌合金5号', category: 'zinc' },
};

export const MATERIAL_LIST = Object.values(MATERIALS);

// ============================================================================
// Customer Types - 客户类型
// ============================================================================

export const CUSTOMER_TYPES = {
  DIRECT: { code: 'direct', name: 'Direct Customer', name_cn: '直接客户' },
  AGENT: { code: 'agent', name: 'Agent', name_cn: '代理商' },
  DISTRIBUTOR: { code: 'distributor', name: 'Distributor', name_cn: '分销商' },
} as const;

// ============================================================================
// Supplier Types - 供应商类型
// ============================================================================

export const SUPPLIER_TYPES = {
  MANUFACTURER: { code: 'manufacturer', name: 'Manufacturer', name_cn: '生产厂家' },
  TRADER: { code: 'trader', name: 'Trader', name_cn: '贸易商' },
  AGENT: { code: 'agent', name: 'Agent', name_cn: '代理商' },
} as const;

// ============================================================================
// Rating Scale - 评级
// ============================================================================

export const RATINGS = [1, 2, 3, 4, 5] as const;
export type Rating = typeof RATINGS[number];

// ============================================================================
// Export all constants
// ============================================================================

export const TRADE_STANDARDS = {
  INCOTERMS,
  CONTAINER_TYPES,
  UNITS,
  PACKAGING_TYPES,
  SHIPPING_METHODS,
  INSURANCE_TYPES,
  MOLD_TYPES,
  SURFACE_TREATMENTS,
  MATERIALS,
  CUSTOMER_TYPES,
  SUPPLIER_TYPES,
  RATINGS,
};

export default TRADE_STANDARDS;
