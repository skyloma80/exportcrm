import { calculateStackingPlan } from './stacking-algorithm'
import type { BoxDimension } from './box-parser'
import type { StackingConfig } from './stacking-algorithm'

const boxes: BoxDimension[] = []
for (let i = 0; i < 37; i++) {
  boxes.push({ id: `box_1_${i}`, length: 370, width: 250, height: 200 })
}
for (let i = 0; i < 20; i++) {
  boxes.push({ id: `box_2_${i}`, length: 360, width: 300, height: 240 })
}
for (let i = 0; i < 6; i++) {
  boxes.push({ id: `box_3_${i}`, length: 300, width: 200, height: 200 })
}

const config: StackingConfig = {
  palletLength: 1200,
  palletWidth: 1200,
  palletHeight: 150,
  effectiveHeight: 1450,
  overhangTolerance: 50,
  heightTolerance: 50,
}

const result = calculateStackingPlan(boxes, config)

result.pallets.forEach((pallet, pIdx) => {
  console.log(`\n=== 托盘 ${pIdx + 1} (${pallet.boxCount} 箱, 高度 ${pallet.totalHeight}mm) ===`)
  
  // 按 z 排序输出所有箱子
  const sorted = [...pallet.placedBoxes].sort((a, b) => {
    if (a.position.z !== b.position.z) return a.position.z - b.position.z
    if (a.position.y !== b.position.y) return a.position.y - b.position.y
    return a.position.x - b.position.x
  })
  
  sorted.forEach((pb, idx) => {
    const { position, rotation, dimension, isOverhanging, layerIndex } = pb
    const l = rotation === 'LWH' ? dimension.length : dimension.width
    const w = rotation === 'LWH' ? dimension.width : dimension.length
    const h = dimension.height
    const label = `#${idx + 1}`
    const highlight = idx + 1 >= 50 && idx + 1 <= 62 ? ' <<<<<' : ''
    console.log(
      `  ${label.padEnd(4)} ${dimension.length}x${dimension.width}x${dimension.height}  ` +
      `pos=(${String(position.x).padStart(5)}, ${String(position.y).padStart(5)}, ${String(position.z).padStart(5)})  ` +
      `rot=${rotation}  size=(${l}x${w}x${h})  layer=${layerIndex}  ` +
      (isOverhanging ? 'OVERHANG' : '') + highlight
    )
  })
  
  // 按层统计
  console.log('\n  --- 层统计 ---')
  const layerMap = new Map<number, Array<typeof pallet.placedBoxes[0]>>()
  for (const pb of sorted) {
    const z = pb.position.z
    if (!layerMap.has(z)) layerMap.set(z, [])
    layerMap.get(z)!.push(pb)
  }
  for (const [z, boxes] of Array.from(layerMap.entries()).sort(([a], [b]) => a - b)) {
    const types = new Map<string, number>()
    for (const b of boxes) {
      const k = `${b.dimension.length}x${b.dimension.width}x${b.dimension.height}`
      types.set(k, (types.get(k) || 0) + 1)
    }
    const typeStr = Array.from(types.entries()).map(([k, v]) => `${k}=${v}`).join(', ')
    console.log(`  z=${String(z).padStart(5)} | ${boxes.length} 箱 | ${typeStr}`)
  }
})
