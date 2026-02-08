/**
 * 工具函数：根据国家代码生成国旗emoji
 * @param countryCode 两位字母国家代码，如 "CN", "US"
 * @returns 对应的国旗emoji，如果无效则返回空字符串
 */
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return '';
  }

  // 将国家代码转换为区域指示符符号 (Regional Indicator Symbols)
  const [firstLetter, secondLetter] = countryCode.toUpperCase();
  const baseOffset = 0x1F1E6; // Regional Indicator Symbol Base (A)
  const firstChar = String.fromCodePoint(baseOffset + (firstLetter.charCodeAt(0) - 65));
  const secondChar = String.fromCodePoint(baseOffset + (secondLetter.charCodeAt(0) - 65));

  return firstChar + secondChar;
}

/**
 * 根据国家代码获取完整国家信息
 * @param countryCode 两位字母国家代码
 * @returns 国家的英文名称、中文名称和国旗emoji
 */
export function getCountryInfo(countryCode: string) {
  const countryMap: Record<string, { label: string; labelZh: string }> = {
    "AE": { label: "UAE", labelZh: "阿联酋" },
    "AR": { label: "Argentina", labelZh: "阿根廷" },
    "AT": { label: "Austria", labelZh: "奥地利" },
    "AU": { label: "Australia", labelZh: "澳大利亚" },
    "BD": { label: "Bangladesh", labelZh: "孟加拉国" },
    "BE": { label: "Belgium", labelZh: "比利时" },
    "BR": { label: "Brazil", labelZh: "巴西" },
    "CA": { label: "Canada", labelZh: "加拿大" },
    "CH": { label: "Switzerland", labelZh: "瑞士" },
    "CL": { label: "Chile", labelZh: "智利" },
    "CN": { label: "China", labelZh: "中国" },
    "CO": { label: "Colombia", labelZh: "哥伦比亚" },
    "DE": { label: "Germany", labelZh: "德国" },
    "EG": { label: "Egypt", labelZh: "埃及" },
    "ES": { label: "Spain", labelZh: "西班牙" },
    "FR": { label: "France", labelZh: "法国" },
    "GB": { label: "United Kingdom", labelZh: "英国" },
    "HK": { label: "Hong Kong", labelZh: "香港" },
    "ID": { label: "Indonesia", labelZh: "印度尼西亚" },
    "IE": { label: "Ireland", labelZh: "爱尔兰" },
    "IN": { label: "India", labelZh: "印度" },
    "IT": { label: "Italy", labelZh: "意大利" },
    "JP": { label: "Japan", labelZh: "日本" },
    "KR": { label: "South Korea", labelZh: "韩国" },
    "MX": { label: "Mexico", labelZh: "墨西哥" },
    "MY": { label: "Malaysia", labelZh: "马来西亚" },
    "NL": { label: "Netherlands", labelZh: "荷兰" },
    "NG": { label: "Nigeria", labelZh: "尼日利亚" },
    "NZ": { label: "New Zealand", labelZh: "新西兰" },
    "PE": { label: "Peru", labelZh: "秘鲁" },
    "PH": { label: "Philippines", labelZh: "菲律宾" },
    "PK": { label: "Pakistan", labelZh: "巴基斯坦" },
    "PL": { label: "Poland", labelZh: "波兰" },
    "RU": { label: "Russia", labelZh: "俄罗斯" },
    "SA": { label: "Saudi Arabia", labelZh: "沙特阿拉伯" },
    "SE": { label: "Sweden", labelZh: "瑞典" },
    "SG": { label: "Singapore", labelZh: "新加坡" },
    "TH": { label: "Thailand", labelZh: "泰国" },
    "TR": { label: "Turkey", labelZh: "土耳其" },
    "TW": { label: "Taiwan", labelZh: "台湾" },
    "US": { label: "United States", labelZh: "美国" },
    "VN": { label: "Vietnam", labelZh: "越南" },
    "ZA": { label: "South Africa", labelZh: "南非" },
  };

  const countryInfo = countryMap[countryCode.toUpperCase()];
  if (!countryInfo) {
    return null;
  }

  return {
    ...countryInfo,
    flag: getCountryFlag(countryCode),
  };
}