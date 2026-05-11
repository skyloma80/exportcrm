/**
 * Stacking Algorithm Service
 * 托盘堆放算法 - 计算箱子在托盘上的最优堆放方案
 */

import type { BoxDimension } from './box-parser'

export interface Position3D {
  x: number
  y: number
  z: number
}

export type BoxRotation = 'LWH' | 'WLH'  // 只考虑水平旋转

export interface PlacedBox {
  dimension: BoxDimension
  position: Position3D
  rotation: BoxRotation
  isOverhanging: boolean
  layerIndex: number
}

export interface Layer {
  boxes: PlacedBox[]
  height: number
  zOffset: number
}

export interface Dimensions {
  length: number
  width: number
  height: number
}

// 托盘规格信息（用于混合托盘方案）
export interface PalletSpecInfo {
  code: string
  name_cn: string
  length: number
  width: number
  height: number
}

export interface PalletPlan {
  layers: Layer[]
  totalHeight: number
  boxCount: number
  grossDimensions: Dimensions
  placedBoxes: PlacedBox[]
  palletSpec?: PalletSpecInfo  // 该托盘使用的规格（混合托盘时使用）
}

export interface StackingPlan {
  pallets: PalletPlan[]
  totalBoxes: number
  totalVolume: number           // 计费体积 CBM (基于托盘外包装尺寸)
  netVolume: number             // 净体积 CBM (箱子实际体积之和)
  utilizationPercent: number
  unplacedBoxes: BoxDimension[]
}

export interface StackingConfig {
  palletLength: number
  palletWidth: number
  palletHeight: number
  effectiveHeight: number
  overhangTolerance: number
  heightTolerance: number
}

/**
 * 获取箱子在指定旋转下的尺寸
 */
function getRotatedDimensions(box: BoxDimension, rotation: BoxRotation): { l: number; w: number; h: number } {
  if (rotation === 'LWH') {
    return { l: box.length, w: box.width, h: box.height }
  } else {
    return { l: box.width, w: box.length, h: box.height }
  }
}

/**
 * 计算一层中可以放置多少个相同尺寸的箱子（网格布局）
 */
function calculateGridLayout(
  boxL: number,
  boxW: number,
  palletL: number,
  palletW: number,
  overhang: number
): { countX: number; countY: number; offsetX: number; offsetY: number } {
  // 可用空间（公差是总共可超出的量，不是每边）
  // 例如：托盘1200 + 公差50 = 最大1250
  const availableL = palletL + overhang
  const availableW = palletW + overhang

  // 计算每个方向可以放多少个
  const countX = Math.floor(availableL / boxL)
  const countY = Math.floor(availableW / boxW)

  // 计算实际使用的空间
  const usedL = countX * boxL
  const usedW = countY * boxW

  // 计算居中偏移
  // 当 usedL > palletL 时，偏移为负，表示箱子会超出托盘边缘（居中悬空）
  const rawOffsetX = (palletL - usedL) / 2
  const rawOffsetY = (palletW - usedW) / 2

  // 限制偏移量：每边最多悬空 overhang/2
  const maxOverhangPerSide = overhang / 2
  const offsetX = Math.max(-maxOverhangPerSide, rawOffsetX)
  const offsetY = Math.max(-maxOverhangPerSide, rawOffsetY)

  return { countX, countY, offsetX, offsetY }
}

/**
 * 已放置箱子的完整信息（包含高度）
 */
interface PlacedBoxInfo {
  x: number
  y: number
  l: number
  w: number
  z: number      // 箱子底部 z 坐标
  topZ: number   // 箱子顶部 z 坐标
}

/**
 * 检查箱子是否有足够的支撑 (优化版：包含重心校验)
 */
function hasEnoughSupport(
  x: number,
  y: number,
  z: number,
  boxL: number,
  boxW: number,
  allPlacedBoxes: PlacedBoxInfo[],
  config: StackingConfig
): boolean {
  if (z === 0) return true; // 第一层直接放托盘

  const boxArea = boxL * boxW;
  let supportedArea = 0;
  
  // 箱子底面中心点 (重心)
  const centerX = x + boxL / 2;
  const centerY = y + boxW / 2;
  let isCenterSupported = false;

  for (const placed of allPlacedBoxes) {
    if (Math.abs(placed.topZ - z) > 1) continue;

    // 计算重叠区域
    const overlapX1 = Math.max(x, placed.x);
    const overlapY1 = Math.max(y, placed.y);
    const overlapX2 = Math.min(x + boxL, placed.x + placed.l);
    const overlapY2 = Math.min(y + boxW, placed.y + placed.w);

    if (overlapX2 > overlapX1 && overlapY2 > overlapY1) {
      supportedArea += (overlapX2 - overlapX1) * (overlapY2 - overlapY1);
      
      // 检查重心是否落在该支撑箱子的范围内 (给予一小点容差)
      if (centerX >= placed.x - 1 && centerX <= placed.x + placed.l + 1 &&
          centerY >= placed.y - 1 && centerY <= placed.y + placed.w + 1) {
        isCenterSupported = true;
      }
    }
  }

  // 1. 面积支撑必须大于 60% (提高要求，50%太容易翘边)
  // 2. 重心必须有实物支撑 (防止翻转)
  return supportedArea >= (boxArea * 0.6) && isCenterSupported;
}

/**
 * 检查箱子是否与已放置的箱子在3D空间中重叠
 */
function canPlaceAt3D(
  x: number,
  y: number,
  z: number,
  boxL: number,
  boxW: number,
  boxH: number,
  allPlacedBoxes: PlacedBoxInfo[]
): boolean {
  for (const placed of allPlacedBoxes) {
    // 检查 XY 平面重叠
    const overlapX = x < placed.x + placed.l && x + boxL > placed.x
    const overlapY = y < placed.y + placed.w && y + boxW > placed.y
    // 检查 Z 轴重叠
    const overlapZ = z < placed.topZ && z + boxH > placed.z
    
    if (overlapX && overlapY && overlapZ) {
      return false
    }
  }
  return true
}

/**
 * 获取所有可能的放置高度（基于已放置箱子的顶面）
 */
function getAvailableHeights(allPlacedBoxes: PlacedBoxInfo[]): number[] {
  const heights = new Set<number>([0]) // 始终包含地面
  for (const box of allPlacedBoxes) {
    heights.add(box.topZ)
  }
  return Array.from(heights).sort((a, b) => a - b)
}

/**
 * 获取紧贴指定高度下方箱子的水平包围盒
 * 用于约束上层箱子的放置范围，防止"上宽下窄"的不稳定堆叠
 */
function getLowerLayerFootprint(
  allPlacedBoxes: PlacedBoxInfo[],
  currentZ: number
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const supportBoxes = allPlacedBoxes.filter(b => Math.abs(b.topZ - currentZ) <= 1)
  if (supportBoxes.length === 0) return null

  return {
    minX: Math.min(...supportBoxes.map(b => b.x)),
    maxX: Math.max(...supportBoxes.map(b => b.x + b.l)),
    minY: Math.min(...supportBoxes.map(b => b.y)),
    maxY: Math.max(...supportBoxes.map(b => b.y + b.w))
  }
}

/**
 * 找空位算法：在托盘上找到可以放置箱子的位置
 * 使用 Bottom-Left 策略：优先放在最低、最左的位置
 * @param footprint 下层包围盒约束（z>0时传入，防止上层超出下层范围）
 */
function findFreePosition(
  boxL: number,
  boxW: number,
  boxH: number,
  z: number,
  allPlacedBoxes: PlacedBoxInfo[],
  config: StackingConfig,
  footprint?: { minX: number; maxX: number; minY: number; maxY: number } | null
): { x: number; y: number } | null {
  const maxOverhangPerSide = config.overhangTolerance / 2

  // z>0 时：候选范围约束在下层包围盒内（防止上宽下窄）
  // z=0 时：使用完整托盘范围（含悬空公差）
  let minX: number, minY: number, maxX: number, maxY: number
  if (z > 0 && footprint) {
    // 上层：x/y 范围约束在下层包围盒内
    minX = footprint.minX
    minY = footprint.minY
    maxX = footprint.maxX - boxL
    maxY = footprint.maxY - boxW
  } else {
    minX = -maxOverhangPerSide
    minY = -maxOverhangPerSide
    maxX = config.palletLength + maxOverhangPerSide - boxL
    maxY = config.palletWidth + maxOverhangPerSide - boxW
  }

  // 如果箱子太大，放不下
  if (maxX < minX || maxY < minY) {
    return null
  }

  // 收集所有可能的 X 坐标候选点
  const xCandidates = new Set<number>([minX, 0])
  for (const placed of allPlacedBoxes) {
    xCandidates.add(placed.x) // 箱子左边
    xCandidates.add(placed.x + placed.l) // 箱子右边
  }

  // 收集所有可能的 Y 坐标候选点
  const yCandidates = new Set<number>([minY, 0])
  for (const placed of allPlacedBoxes) {
    yCandidates.add(placed.y) // 箱子后边
    yCandidates.add(placed.y + placed.w) // 箱子前边
  }

  // 按 Bottom-Left 顺序尝试所有候选位置
  const sortedX = Array.from(xCandidates).filter(x => x >= minX && x <= maxX).sort((a, b) => a - b)
  const sortedY = Array.from(yCandidates).filter(y => y >= minY && y <= maxY).sort((a, b) => a - b)

  for (const y of sortedY) {
    for (const x of sortedX) {
      // 检查是否与已放置的箱子重叠
      if (canPlaceAt3D(x, y, z, boxL, boxW, boxH, allPlacedBoxes)) {
        // 检查是否有足够支撑（第一层不需要）
        if (z === 0 || hasEnoughSupportForFreePlace(x, y, z, boxL, boxW, allPlacedBoxes)) {
          return { x, y }
        }
      }
    }
  }

  return null
}

/**
 * 检查自由放置时的支撑（简化版，允许部分支撑）
 */
function hasEnoughSupportForFreePlace(
  x: number,
  y: number,
  z: number,
  boxL: number,
  boxW: number,
  allPlacedBoxes: PlacedBoxInfo[],
  _config?: StackingConfig
): boolean {
  const boxArea = boxL * boxW
  let supportedArea = 0

  for (const placed of allPlacedBoxes) {
    // 只有顶面高度等于当前 z 的箱子才能提供支撑
    if (Math.abs(placed.topZ - z) > 1) {
      continue
    }

    // 计算重叠区域
    const overlapX1 = Math.max(x, placed.x)
    const overlapY1 = Math.max(y, placed.y)
    const overlapX2 = Math.min(x + boxL, placed.x + placed.l)
    const overlapY2 = Math.min(y + boxW, placed.y + placed.w)

    if (overlapX2 > overlapX1 && overlapY2 > overlapY1) {
      supportedArea += (overlapX2 - overlapX1) * (overlapY2 - overlapY1)
    }
  }

  // 要求至少50%的底面积有支撑
  return supportedArea >= boxArea * 0.5
}

/**
 * 在单个托盘上堆放箱子（混合算法：网格 + 找空位）
 * 策略：
 * 1. 优先使用网格算法（适合相同尺寸批量放置，且居中对齐）
 * 2. 找空位算法作为补充（填充剩余空间）
 * 3. 智能排序：按底面积排序，优先放大底面积的箱子
 */
function stackOnPallet(
  boxes: BoxDimension[],
  config: StackingConfig,
  palletSpec?: PalletSpecInfo
): { pallet: PalletPlan; remainingBoxes: BoxDimension[] } {
  const allPlacedBoxes: PlacedBoxInfo[] = []
  const placedBoxResults: PlacedBox[] = []
  let remainingBoxes = [...boxes]

  // 按底面积排序（长×宽），大底面积优先
  // 这样可以先占据托盘底部空间，小箱子可以填充缝隙或堆叠在上层
  remainingBoxes.sort((a, b) => {
    const areaA = a.length * a.width
    const areaB = b.length * b.width
    if (areaB !== areaA) {
      return areaB - areaA
    }
    // 底面积相同时，高的优先（重的在下面，更稳定）
    return b.height - a.height
  })

  let changed = true
  let iteration = 0
  const maxIterations = 100

  // 持续尝试放置箱子，直到无法放置更多
  while (changed && remainingBoxes.length > 0 && iteration < maxIterations) {
    changed = false
    iteration++
    const stillRemaining: BoxDimension[] = []

    for (const box of remainingBoxes) {
      let placed = false

      // 获取所有可能的放置高度
      const availableHeights = getAvailableHeights(allPlacedBoxes)

      // 尝试两种旋转
      const rotations: BoxRotation[] = ['LWH', 'WLH']

      for (const rotation of rotations) {
        if (placed) break

        const { l, w, h } = getRotatedDimensions(box, rotation)

        // 尝试每个可能的高度
        for (const z of availableHeights) {
          if (placed) break

          // 检查高度是否超出
          if (z + h > config.effectiveHeight + config.heightTolerance) {
            continue
          }

          // 获取下层包围盒（z>0时，上层放置必须约束在下层范围内，防止"上宽下窄"）
          const footprint = z > 0 ? getLowerLayerFootprint(allPlacedBoxes, z) : null

          // 智能策略选择：
          // - 如果当前层是空的，优先使用网格算法（保证居中对齐）
          // - 如果当前层已有相同尺寸的箱子，继续使用网格算法（保持居中）
          // - 如果当前层有不同尺寸的箱子，使用找空位算法（灵活填充）
          const boxesAtThisLevel = allPlacedBoxes.filter(b => b.z === z)
          const isEmptyLevel = boxesAtThisLevel.length === 0

          // 检查当前层是否都是相同尺寸
          let allSameSize = true
          if (boxesAtThisLevel.length > 0) {
            const firstBox = boxesAtThisLevel[0]
            for (const b of boxesAtThisLevel) {
              if (b.l !== firstBox.l || b.w !== firstBox.w) {
                allSameSize = false
                break
              }
            }
            // 还要检查当前箱子是否与层中的箱子尺寸相同
            if (allSameSize && (l !== firstBox.l || w !== firstBox.w)) {
              allSameSize = false
            }
          }

          const useGridFirst = isEmptyLevel || allSameSize

          if (useGridFirst) {
            // 空层或相同尺寸：使用网格算法
            // z>0 时：网格基于下层包围盒尺寸（防止上层超出下层），z=0 时：基于完整托盘
            let gridL = config.palletLength
            let gridW = config.palletWidth
            let gridBaseX = 0
            let gridBaseY = 0

            if (z > 0 && footprint) {
              gridL = footprint.maxX - footprint.minX
              gridW = footprint.maxY - footprint.minY
              gridBaseX = footprint.minX
              gridBaseY = footprint.minY
            }

            const layout = calculateGridLayout(l, w, gridL, gridW, z > 0 ? 0 : config.overhangTolerance)

            if (layout.countX > 0 && layout.countY > 0) {
              // 在网格中找空位
              for (let iy = 0; iy < layout.countY && !placed; iy++) {
                for (let ix = 0; ix < layout.countX && !placed; ix++) {
                  const x = gridBaseX + layout.offsetX + ix * l
                  const y = gridBaseY + layout.offsetY + iy * w

                  // 检查是否与已放置的箱子重叠（3D检查）
                  if (!canPlaceAt3D(x, y, z, l, w, h, allPlacedBoxes)) {
                    continue
                  }

                  // 检查是否有足够支撑
                  if (!hasEnoughSupport(x, y, z, l, w, allPlacedBoxes, config)) {
                    continue
                  }

                  // 放置箱子
                  placeBox(x, y, z, l, w, h, box, rotation, allPlacedBoxes, placedBoxResults, config)
                  placed = true
                  changed = true
                }
              }
            }

            // 网格失败，尝试找空位（传入 footprint 约束上层范围）
            if (!placed) {
              const freePos = findFreePosition(l, w, h, z, allPlacedBoxes, config, footprint)
              if (freePos) {
                placeBox(freePos.x, freePos.y, z, l, w, h, box, rotation, allPlacedBoxes, placedBoxResults, config)
                placed = true
                changed = true
                break
              }
            }
          } else {
            // 混合尺寸层：优先找空位算法（传入 footprint 约束上层范围）
            const freePos = findFreePosition(l, w, h, z, allPlacedBoxes, config, footprint)
            if (freePos) {
              placeBox(freePos.x, freePos.y, z, l, w, h, box, rotation, allPlacedBoxes, placedBoxResults, config)
              placed = true
              changed = true
              break
            }

            // 找空位失败，尝试网格（同样约束在下层范围内）
            let gridL = config.palletLength
            let gridW = config.palletWidth
            let gridBaseX = 0
            let gridBaseY = 0

            if (z > 0 && footprint) {
              gridL = footprint.maxX - footprint.minX
              gridW = footprint.maxY - footprint.minY
              gridBaseX = footprint.minX
              gridBaseY = footprint.minY
            }

            const layout = calculateGridLayout(l, w, gridL, gridW, z > 0 ? 0 : config.overhangTolerance)

            if (layout.countX > 0 && layout.countY > 0) {
              for (let iy = 0; iy < layout.countY && !placed; iy++) {
                for (let ix = 0; ix < layout.countX && !placed; ix++) {
                  const x = gridBaseX + layout.offsetX + ix * l
                  const y = gridBaseY + layout.offsetY + iy * w

                  // 检查是否与已放置的箱子重叠（3D检查）
                  if (!canPlaceAt3D(x, y, z, l, w, h, allPlacedBoxes)) {
                    continue
                  }

                  // 检查是否有足够支撑
                  if (!hasEnoughSupport(x, y, z, l, w, allPlacedBoxes, config)) {
                    continue
                  }

                  // 放置箱子
                  placeBox(x, y, z, l, w, h, box, rotation, allPlacedBoxes, placedBoxResults, config)
                  placed = true
                  changed = true
                }
              }
            }
          }
        }
      }

      if (!placed) {
        stillRemaining.push(box)
      }
    }

    remainingBoxes = stillRemaining
  }

  return buildPalletResult(allPlacedBoxes, placedBoxResults, config, palletSpec, remainingBoxes)
}

/**
 * 放置箱子的辅助函数
 */
function placeBox(
  x: number,
  y: number,
  z: number,
  l: number,
  w: number,
  h: number,
  box: BoxDimension,
  rotation: BoxRotation,
  allPlacedBoxes: PlacedBoxInfo[],
  placedBoxResults: PlacedBox[],
  config: StackingConfig
): void {
  const isOverhanging = x < 0 || y < 0 ||
    x + l > config.palletLength || y + w > config.palletWidth

  allPlacedBoxes.push({ x, y, l, w, z, topZ: z + h })
  placedBoxResults.push({
    dimension: box,
    position: { x, y, z },
    rotation,
    isOverhanging,
    layerIndex: z === 0 ? 0 : Math.floor(z / 100) // 简化的层索引
  })
}

/**
 * 构建托盘结果
 */
function buildPalletResult(
  allPlacedBoxes: PlacedBoxInfo[],
  placedBoxResults: PlacedBox[],
  config: StackingConfig,
  palletSpec: PalletSpecInfo | undefined,
  remainingBoxes: BoxDimension[]
): { pallet: PalletPlan; remainingBoxes: BoxDimension[] } {
  // 构建层信息
  const layerMap = new Map<number, PlacedBox[]>()
  for (const box of placedBoxResults) {
    const zKey = box.position.z
    if (!layerMap.has(zKey)) {
      layerMap.set(zKey, [])
    }
    layerMap.get(zKey)!.push(box)
  }

  const layers: Layer[] = Array.from(layerMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([zOffset, boxes]) => {
      const maxHeight = Math.max(...boxes.map(b => {
        const { h } = getRotatedDimensions(b.dimension, b.rotation)
        return h
      }))
      return {
        boxes,
        height: maxHeight,
        zOffset
      }
    })

  // 计算总体尺寸
  let minX = 0, minY = 0
  let maxX = 0, maxY = 0, maxZ = 0

  for (const box of allPlacedBoxes) {
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.l)
    maxY = Math.max(maxY, box.y + box.w)
    maxZ = Math.max(maxZ, box.topZ)
  }

  const actualLength = maxX - minX
  const actualWidth = maxY - minY

  return {
    pallet: {
      layers,
      totalHeight: maxZ,
      boxCount: placedBoxResults.length,
      grossDimensions: {
        length: Math.max(actualLength, config.palletLength),
        width: Math.max(actualWidth, config.palletWidth),
        height: maxZ + config.palletHeight
      },
      placedBoxes: placedBoxResults,
      palletSpec
    },
    remainingBoxes
  }
}

/**
 * 计算箱子净体积 (CBM)
 */
function calculateNetVolumeCBM(boxes: BoxDimension[]): number {
  return boxes.reduce((sum, box) => {
    return sum + (box.length * box.width * box.height) / 1_000_000_000
  }, 0)
}

/**
 * 计算单个托盘的计费体积 (CBM)
 * 计费体积 = 最大长 × 最大宽 × 总高度（含托盘高度）
 * 长宽取托盘尺寸和实际货物尺寸的较大值
 */
function calculatePalletChargeableVolume(pallet: PalletPlan): number {
  const { grossDimensions } = pallet
  // grossDimensions 已经包含了托盘高度，且长宽已取较大值
  return (grossDimensions.length * grossDimensions.width * grossDimensions.height) / 1_000_000_000
}

/**
 * 主算法：计算堆放方案（按尺寸分组，纯托盘优先）
 */
export function calculateStackingPlan(boxes: BoxDimension[], config: StackingConfig): StackingPlan {
  if (boxes.length === 0) {
    return {
      pallets: [],
      totalBoxes: 0,
      totalVolume: 0,
      netVolume: 0,
      utilizationPercent: 0,
      unplacedBoxes: []
    }
  }

  const pallets: PalletPlan[] = [];
  let remainingBoxes = [...boxes];

  // 1. 同品优先策略：将箱子按尺寸分组（生成特征 Key）
  const skuGroups = new Map<string, BoxDimension[]>();
  for (const box of remainingBoxes) {
    // 保证长始终大于宽，作为统一特征
    const l = Math.max(box.length, box.width);
    const w = Math.min(box.length, box.width);
    const key = `${l}x${w}x${box.height}`;
    if (!skuGroups.has(key)) skuGroups.set(key, []);
    skuGroups.get(key)!.push(box);
  }

  // 2. 尝试为每组 SKU 独立打包纯托盘
  const mixedBoxes: BoxDimension[] = [];
  for (const [key, groupBoxes] of skuGroups.entries()) {
    let currentSkuRemaining = [...groupBoxes];
    
    // 只要该 SKU 的数量够多，就尝试打纯托盘
    while (currentSkuRemaining.length > 0) {
      const { pallet, remainingBoxes: leftover } = stackOnPallet(currentSkuRemaining, config);
      
      // 评估打出来的这个托盘好不好（比如箱子数量 >= 4 或者 没剩箱子）
      // 避免几个零星的箱子占用一个完整的纯托盘
      const isGoodPurePallet = pallet.boxCount > 0 && 
        (pallet.boxCount >= 4 || leftover.length === 0);

      if (isGoodPurePallet) {
        pallets.push(pallet);
        currentSkuRemaining = leftover;
      } else {
        // 不足以打成一个好托盘的尾货，退回到混合池中
        mixedBoxes.push(...currentSkuRemaining);
        break;
      }
    }
  }

  // 3. 处理所有剩下的尾货（混合打包）
  remainingBoxes = mixedBoxes;
  while (remainingBoxes.length > 0) {
    const { pallet, remainingBoxes: leftover } = stackOnPallet(remainingBoxes, config);
    if (pallet.boxCount === 0) break;
    
    pallets.push(pallet);
    remainingBoxes = leftover;
  }

  // 4. 计算统计数据
  const totalPlacedBoxes = pallets.reduce((sum, p) => sum + p.boxCount, 0)
  const placedBoxDimensions = pallets.flatMap(p => p.placedBoxes.map(pb => pb.dimension))
  
  // 净体积：所有箱子实际体积之和
  const netVolume = calculateNetVolumeCBM(placedBoxDimensions)
  
  // 计费体积：每个托盘的外包装尺寸体积之和
  const totalVolume = pallets.reduce((sum, pallet) => {
    return sum + calculatePalletChargeableVolume(pallet)
  }, 0)
  
  // 利用率 = 净体积 / 计费体积
  const utilizationPercent = totalVolume > 0 ? (netVolume / totalVolume) * 100 : 0
  
  return {
    pallets,
    totalBoxes: totalPlacedBoxes,
    totalVolume,
    netVolume,
    utilizationPercent,
    unplacedBoxes: remainingBoxes
  }
}

/**
 * 智能计算最优托盘方案
 * 遍历所有托盘规格，找出利用率最高的方案
 */
export interface OptimalPlanResult {
  bestPlan: StackingPlan
  bestPalletSpec: { code: string; name_cn: string; length: number; width: number; height: number }
  allResults: Array<{
    palletSpec: { code: string; name_cn: string; length: number; width: number; height: number }
    plan: StackingPlan
    score: number  // 综合评分
  }>
}

export function calculateOptimalPlan(
  boxes: BoxDimension[],
  palletSpecs: Array<{ code: string; name_cn: string; length: number; width: number; height: number }>,
  baseConfig: Omit<StackingConfig, 'palletLength' | 'palletWidth' | 'palletHeight'>
): OptimalPlanResult {
  const results: OptimalPlanResult['allResults'] = []
  
  for (const spec of palletSpecs) {
    const config: StackingConfig = {
      ...baseConfig,
      palletLength: spec.length,
      palletWidth: spec.width,
      palletHeight: spec.height
    }
    
    const plan = calculateStackingPlan(boxes, config)
    
    // 综合评分：利用率权重60% + 托盘数量权重40%（托盘越少越好）
    // 托盘数量评分：1个托盘=100分，每多一个托盘减10分，最低0分
    const utilizationScore = plan.utilizationPercent
    const palletCountScore = Math.max(0, 100 - (plan.pallets.length - 1) * 10)
    const score = utilizationScore * 0.6 + palletCountScore * 0.4
    
    results.push({
      palletSpec: spec,
      plan,
      score
    })
  }

  // 按评分排序，找出最优方案
  results.sort((a, b) => b.score - a.score)


  
  const best = results[0]
  
  return {
    bestPlan: best.plan,
    bestPalletSpec: best.palletSpec,
    allResults: results
  }
}

/**
 * 混合托盘智能计算
 * 策略：贪心算法 - 每个托盘都选择能最大化利用率的规格
 * 目标：最小化总计费体积
 */
export interface MixedPalletResult {
  plan: StackingPlan
  palletBreakdown: Array<{
    spec: PalletSpecInfo
    count: number
  }>
  totalVolumeSaved: number  // 相比单一托盘节省的体积
}

export function calculateMixedPalletPlan(
  boxes: BoxDimension[],
  palletSpecs: Array<{ code: string; name_cn: string; length: number; width: number; height: number }>,
  baseConfig: Omit<StackingConfig, 'palletLength' | 'palletWidth' | 'palletHeight'>
): MixedPalletResult {
  if (boxes.length === 0) {
    return {
      plan: {
        pallets: [],
        totalBoxes: 0,
        totalVolume: 0,
        netVolume: 0,
        utilizationPercent: 0,
        unplacedBoxes: []
      },
      palletBreakdown: [],
      totalVolumeSaved: 0
    }
  }

  const allPallets: PalletPlan[] = []
  const palletCounts = new Map<string, number>()

  // 相同规格优先策略：按规格分组后排序，使相同规格箱子聚合
  // 这样贪心时优先把同一规格的箱子填满一个托盘，避免混放导致的上宽下窄问题
  const specOrder = new Map<string, number>()
  for (const box of boxes) {
    const key = `${box.length}x${box.width}x${box.height}`
    specOrder.set(key, (specOrder.get(key) || 0) + 1)
  }
  // 按数量从多到少排序规格，数量多的规格优先整批放置
  const sortedSpecKeys = Array.from(specOrder.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)

  let remainingBoxes = [...boxes].sort((a, b) => {
    const keyA = `${a.length}x${a.width}x${a.height}`
    const keyB = `${b.length}x${b.width}x${b.height}`
    const idxA = sortedSpecKeys.indexOf(keyA)
    const idxB = sortedSpecKeys.indexOf(keyB)
    return idxA - idxB
  })

  // 贪心策略：每次选择最优托盘规格
  while (remainingBoxes.length > 0) {
    let bestResult: { 
      pallet: PalletPlan
      spec: PalletSpecInfo
      score: number  // 综合评分：利用率 * 装箱数 / 计费体积
      leftover: BoxDimension[]
    } | null = null

    // 尝试每种托盘规格
    for (const spec of palletSpecs) {
      const config: StackingConfig = {
        ...baseConfig,
        palletLength: spec.length,
        palletWidth: spec.width,
        palletHeight: spec.height
      }
      
      const { pallet, remainingBoxes: leftover } = stackOnPallet(remainingBoxes, config, spec)
      if (pallet.boxCount === 0) continue
      
      // 计算这个托盘的效率评分
      const palletVolume = calculatePalletChargeableVolume(pallet)
      const boxesVolume = calculateNetVolumeCBM(pallet.placedBoxes.map(pb => pb.dimension))
      const utilization = palletVolume > 0 ? boxesVolume / palletVolume : 0
      
      // 评分公式：利用率越高越好，同时考虑装箱数量
      // 如果能装完所有剩余箱子，给予额外加分
      const canFinish = leftover.length === 0
      const score = utilization * (canFinish ? 1.5 : 1) - (palletVolume * 0.001)
      
      if (!bestResult || score > bestResult.score) {
        bestResult = { pallet, spec, score, leftover }
      }
    }

    if (!bestResult || bestResult.pallet.boxCount === 0) {
      // 无法放置更多箱子
      break
    }

    allPallets.push(bestResult.pallet)
    palletCounts.set(bestResult.spec.code, (palletCounts.get(bestResult.spec.code) || 0) + 1)
    remainingBoxes = bestResult.leftover
  }

  // 计算统计数据
  const totalPlacedBoxes = allPallets.reduce((sum, p) => sum + p.boxCount, 0)
  const placedBoxDimensions = allPallets.flatMap(p => p.placedBoxes.map(pb => pb.dimension))
  const netVolume = calculateNetVolumeCBM(placedBoxDimensions)
  const totalVolume = allPallets.reduce((sum, pallet) => sum + calculatePalletChargeableVolume(pallet), 0)
  const utilizationPercent = totalVolume > 0 ? (netVolume / totalVolume) * 100 : 0

  // 计算单一最大托盘方案的体积（用于比较节省了多少）
  const largestSpec = [...palletSpecs].sort((a, b) => (b.length * b.width) - (a.length * a.width))[0]
  const singleConfig: StackingConfig = {
    ...baseConfig,
    palletLength: largestSpec.length,
    palletWidth: largestSpec.width,
    palletHeight: largestSpec.height
  }
  const singlePalletPlan = calculateStackingPlan(boxes, singleConfig)
  const volumeSaved = singlePalletPlan.totalVolume - totalVolume

  // 构建托盘分布
  const palletBreakdown: MixedPalletResult['palletBreakdown'] = []
  for (const [code, count] of palletCounts) {
    const spec = palletSpecs.find(s => s.code === code)
    if (spec) {
      palletBreakdown.push({ spec, count })
    }
  }

  return {
    plan: {
      pallets: allPallets,
      totalBoxes: totalPlacedBoxes,
      totalVolume,
      netVolume,
      utilizationPercent,
      unplacedBoxes: remainingBoxes
    },
    palletBreakdown,
    totalVolumeSaved: Math.max(0, volumeSaved)
  }
}

export default {
  calculateStackingPlan,
  calculateOptimalPlan,
  calculateMixedPalletPlan
}
