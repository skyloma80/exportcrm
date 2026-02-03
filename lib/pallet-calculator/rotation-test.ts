/**
 * 测试不同旋转方式对悬空的影响
 */

import { calculateStackingPlan } from './stacking-algorithm'
import type { BoxDimension } from './box-parser'
import type { StackingConfig } from './stacking-algorithm'

// 标准托盘配置 1200×1200 (中国标准托盘)
const config: StackingConfig = {
  palletLength: 1200,
  palletWidth: 1200,
  palletHeight: 150,
  effectiveHeight: 1450,
  overhangTolerance: 50,
  heightTolerance: 50,
}

function testRotation(rotation: string, lastBox: BoxDimension) {
  const boxes: BoxDimension[] = [
    // 3个 480×360×490
    { length: 480, width: 360, height: 490, id: 'box_0' },
    { length: 480, width: 360, height: 490, id: 'box_1' },
    { length: 480, width: 360, height: 490, id: 'box_2' },
    // 12个 625×390×450
    ...Array(12).fill(null).map((_, i) => ({ length: 625, width: 390, height: 450, id: `box_${i + 3}` })),
    // 2个 375×355×455
    { length: 375, width: 355, height: 455, id: 'box_15' },
    { length: 375, width: 355, height: 455, id: 'box_16' },
    // 最后一个箱子（不同旋转）
    lastBox,
  ]

  const result = calculateStackingPlan(boxes, config)

  console.log(`\n=== ${rotation} ===`)
  console.log(`托盘数: ${result.pallets.length}`)
  console.log(`利用率: ${result.utilizationPercent.toFixed(2)}%`)
  console.log(`计费体积: ${result.totalVolume.toFixed(3)} CBM`)

  result.pallets.forEach((pallet, idx) => {
    console.log(`\n托盘 ${idx + 1}:`)
    console.log(`  箱子数: ${pallet.boxCount}`)
    console.log(`  外包装: ${pallet.grossDimensions.length}×${pallet.grossDimensions.width}×${pallet.grossDimensions.height}mm`)
    
    pallet.layers.forEach((layer) => {
      layer.boxes.forEach((box) => {
        const dim = box.dimension
        if (dim.length === lastBox.length && dim.width === lastBox.width && dim.height === lastBox.height) {
          console.log(`  最后箱子位置: (${box.position.x}, ${box.position.y}, ${box.position.z})`)
          console.log(`  旋转: ${box.rotation}`)
          console.log(`  悬空: ${box.isOverhanging ? '是' : '否'}`)
          
          // 计算悬空距离
          const { l, w } = box.rotation === 'LWH' 
            ? { l: dim.length, w: dim.width }
            : { l: dim.width, w: dim.length }
          
          const leftOverhang = Math.max(0, -box.position.x)
          const rightOverhang = Math.max(0, box.position.x + l - config.palletLength)
          const backOverhang = Math.max(0, -box.position.y)
          const frontOverhang = Math.max(0, box.position.y + w - config.palletWidth)
          
          if (leftOverhang > 0) console.log(`  左侧悬空: ${leftOverhang}mm`)
          if (rightOverhang > 0) console.log(`  右侧悬空: ${rightOverhang}mm`)
          if (backOverhang > 0) console.log(`  后侧悬空: ${backOverhang}mm`)
          if (frontOverhang > 0) console.log(`  前侧悬空: ${frontOverhang}mm`)
          
          // 计算剩余空间
          const rightSpace = config.palletLength - (box.position.x + l)
          const frontSpace = config.palletWidth - (box.position.y + w)
          
          if (rightSpace > 0) console.log(`  右侧剩余: ${rightSpace}mm`)
          if (frontSpace > 0) console.log(`  前侧剩余: ${frontSpace}mm`)
        }
      })
    })
  })
}

// 测试三种旋转
console.log('原始尺寸: 420×290×640')
testRotation('420×290×640 (竖放)', { length: 420, width: 290, height: 640, id: 'last_1' })
testRotation('640×290×420 (横放-长边) ⭐推荐', { length: 640, width: 290, height: 420, id: 'last_2' })
testRotation('640×420×290 (横放-宽边)', { length: 640, width: 420, height: 290, id: 'last_3' })
