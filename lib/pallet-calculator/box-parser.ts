/**
 * Box Parser Service
 * 解析多行文本中的箱子尺寸
 * 支持多种分隔符格式: *, x, X, ×, 空格
 */

export interface BoxDimension {
  length: number  // mm
  width: number   // mm
  height: number  // mm
  weight?: number // kg（可选，用于重量限制检查）
  id: string      // unique identifier
  isLeftover?: boolean // 是否为尾数纸箱
}

export interface ParseError {
  line: number
  content: string
  message: string
}

export interface ParseResult {
  boxes: BoxDimension[]
  errors: ParseError[]
  totalCount: number
}

// 单个规格的正则模式 (长*宽*高 或 长*宽*高*数量)，不包含空格作为分隔符
const SINGLE_SPEC_PATTERN = /(\d+(?:\.\d+)?)[*xX×](\d+(?:\.\d+)?)[*xX×](\d+(?:\.\d+)?)(?:[*xX×](\d+))?/g

let idCounter = 0

function generateId(): string {
  return `box_${Date.now()}_${++idCounter}`
}

/**
 * 解析单个规格字符串
 */
function parseSpec(
  length: number,
  width: number, 
  height: number,
  quantity: number = 1
): BoxDimension[] {
  const boxes: BoxDimension[] = []
  for (let i = 0; i < quantity; i++) {
    boxes.push({
      length,
      width,
      height,
      id: generateId()
    })
  }
  return boxes
}

/**
 * 解析单行尺寸文本
 * 支持格式: 
 * - 625*390*450 (单个箱子)
 * - 625*390*450*3 (3个相同箱子)
 * - 625*390*450*15 480*360*490*3 (同一行多个规格，空格分隔)
 */
function parseLine(line: string, lineNumber: number): { boxes?: BoxDimension[]; error?: ParseError } {
  const trimmed = line.trim()
  
  // 跳过空行
  if (!trimmed) {
    return {}
  }
  
  const boxes: BoxDimension[] = []
  const matches = [...trimmed.matchAll(SINGLE_SPEC_PATTERN)]
  
  if (matches.length === 0) {
    return {
      error: {
        line: lineNumber,
        content: trimmed,
        message: `格式错误，请使用 "长*宽*高" 或 "长*宽*高*数量" 格式，如 625*390*450 或 625*390*450*3`
      }
    }
  }
  
  for (const match of matches) {
    const length = parseFloat(match[1])
    const width = parseFloat(match[2])
    const height = parseFloat(match[3])
    const quantity = match[4] ? parseInt(match[4], 10) : 1
    
    if (length <= 0 || width <= 0 || height <= 0) {
      return {
        error: {
          line: lineNumber,
          content: trimmed,
          message: `尺寸值必须大于0`
        }
      }
    }
    
    if (quantity <= 0) {
      return {
        error: {
          line: lineNumber,
          content: trimmed,
          message: `数量必须大于0`
        }
      }
    }
    
    boxes.push(...parseSpec(length, width, height, quantity))
  }
  
  return { boxes }
}

/**
 * 解析多行箱子尺寸文本
 * @param text 多行文本，每行一个箱子尺寸
 * @returns ParseResult 包含解析的箱子、错误和总数
 */
export function parseBoxDimensions(text: string): ParseResult {
  const lines = text.split('\n')
  const boxes: BoxDimension[] = []
  const errors: ParseError[] = []
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1
    const result = parseLine(line, lineNumber)
    
    if (result.boxes) {
      boxes.push(...result.boxes)
    }
    if (result.error) {
      errors.push(result.error)
    }
  })
  
  return {
    boxes,
    errors,
    totalCount: boxes.length
  }
}

/**
 * 格式化箱子尺寸为字符串
 * @param box 箱子尺寸对象
 * @returns 格式化的字符串，如 "625*390*450"
 */
export function formatBoxDimension(box: BoxDimension): string {
  return `${box.length}*${box.width}*${box.height}`
}

/**
 * 格式化多个箱子尺寸为多行文本
 */
export function formatBoxDimensions(boxes: BoxDimension[]): string {
  return boxes.map(formatBoxDimension).join('\n')
}

/**
 * 验证单个尺寸字符串是否有效
 */
export function isValidDimensionString(text: string): boolean {
  const trimmed = text.trim()
  return SINGLE_SPEC_PATTERN.test(trimmed)
}

export default {
  parseBoxDimensions,
  formatBoxDimension,
  formatBoxDimensions,
  isValidDimensionString
}
