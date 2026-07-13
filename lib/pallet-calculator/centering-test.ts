/**
 * 测试居中问题
 */

import { calculateStackingPlan } from './stacking-algorithm'
import type { BoxDimension } from './box-parser'
import type { StackingConfig } from './stacking-algorithm'

// 只测试 625×390×450 的箱子
const boxes: BoxDimension[] = Array(12).fill(null).map((_, i) => ({ 
  length: 625, 
  width: 390, 
  height: 450, 
  id: `box_${i}`
}))

// 1200×1200 托盘
const config: StackingConfig = {
  palletLength: 1200,
  palletWidth: 1200,
  palletHeight: 150,
  effectiveHeight: 1450,
  overhangTolerance: 50,
  heightTolerance: 50,
}

const result = calculateStackingPlan(boxes, config)

console.log('=== 625×390×450 箱子在 1200×1200 托盘上的放置 ===\n')
console.log('理论计算：')
console.log('- 长度方向 (625): 1200 / 625 = 1.92 → 可放 1 个')
console.log('- 宽度方向 (390): 1200 / 390 = 3.08 → 可放 3 个')
console.log('- 每层可放: 1 × 3 = 3 个')
console.log('- 3个箱子宽度: 3 × 390 = 1170mm')
console.log('- 剩余空间: 1200 - 1170 = 30mm')
console.log('- 居中偏移: 30 / 2 = 15mm\n')

result.pallets.forEach((pallet, idx) => {
  console.log(`托盘 ${idx + 1}:`)
  console.log(`  箱子数: ${pallet.boxCount}`)
  console.log(`  外包装: ${pallet.grossDimensions.length}×${pallet.grossDimensions.width}×${pallet.grossDimensions.height}mm\n`)
  
  pallet.layers.forEach((layer, layerIdx) => {
    console.log(`  层 ${layerIdx + 1} (z=${layer.zOffset}mm):`)
    
    // 统计 Y 坐标
    const yPositions = new Set<number>()
    layer.boxes.forEach((box) => {
      yPositions.add(box.position.y)
    })
    
    console.log(`    Y 坐标: ${Array.from(yPositions).sort((a, b) => a - b).join(', ')}`)
    
    // 检查是否居中
    const minY = Math.min(...Array.from(yPositions))
    const maxY = Math.max(...Array.from(yPositions))
    const lastBoxEndY = maxY + 390 // 假设宽度是390
    
    console.log(`    最小 Y: ${minY}mm`)
    console.log(`    最大 Y: ${maxY}mm`)
    console.log(`    最后箱子结束: ${lastBoxEndY}mm`)
    console.log(`    左侧空间: ${minY - 0}mm`)
    console.log(`    右侧空间: ${1200 - lastBoxEndY}mm`)
    
    if (Math.abs((minY - 0) - (1200 - lastBoxEndY)) > 5) {
      console.log(`    ⚠️ 未居中！左右空间不对称`)
    } else {
      console.log(`    ✓ 已居中`)
    }
    
    console.log()
  })
})
