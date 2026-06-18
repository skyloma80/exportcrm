import { describe, it, expect } from 'vitest'
import { calculateStackingPlan } from './stacking-algorithm'
import type { BoxDimension } from './box-parser'
import type { StackingConfig } from './stacking-algorithm'

describe('Stacking Algorithm Optimization Test', () => {
  it('should not separate boxes that can fit together into 3 separate pallets', () => {
    // 370*250*200*37
    // 360*300*240*20
    // 300*200*200*6
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
      palletWidth: 1000,
      palletHeight: 150,
      effectiveHeight: 1450,
      overhangTolerance: 50,
      heightTolerance: 50,
    }
    
    const result = calculateStackingPlan(boxes, config)
    
    console.log('Resulting Pallets count:', result.pallets.length)
    result.pallets.forEach((p, idx) => {
      const counts: Record<string, number> = {}
      p.placedBoxes.forEach((pb) => {
        const key = `${pb.dimension.length}*${pb.dimension.width}*${pb.dimension.height}`
        counts[key] = (counts[key] || 0) + 1
      })
      console.log(`Pallet ${idx + 1} counts:`, counts)
    })
    
    expect(result.pallets.length).toBeLessThan(3)
  })

  it('prioritizeFullLayers: 2 SKUs each with exact full layers should fit on 1 pallet', () => {
    // 370*250*200: on 1200*1000, best layout = 3x4=12 per layer. 36 / 12 = 3 full layers, 0 leftover.
    // 360*300*240: on 1200*1000, best layout = 3x3=9 per layer. 18 / 9 = 2 full layers, 0 leftover.
    // Heights: 3*200 + 2*240 = 600 + 480 = 1080mm < 1450mm effectiveHeight → should fit on 1 pallet.
    const boxes: BoxDimension[] = []
    for (let i = 0; i < 36; i++) {
      boxes.push({ id: `a_${i}`, length: 370, width: 250, height: 200 })
    }
    for (let i = 0; i < 18; i++) {
      boxes.push({ id: `b_${i}`, length: 360, width: 300, height: 240 })
    }

    const config: StackingConfig = {
      palletLength: 1200,
      palletWidth: 1000,
      palletHeight: 150,
      effectiveHeight: 1450,
      overhangTolerance: 50,
      heightTolerance: 50,
      prioritizeFullLayers: true,
    }

    const result = calculateStackingPlan(boxes, config)
    console.log('--- Test: 2 SKUs full layers, prioritizeFullLayers=true ---')
    console.log('Pallets:', result.pallets.length)
    result.pallets.forEach((p, idx) => {
      const counts: Record<string, number> = {}
      p.placedBoxes.forEach((pb) => {
        const key = `${pb.dimension.length}*${pb.dimension.width}*${pb.dimension.height}`
        counts[key] = (counts[key] || 0) + 1
      })
      console.log(`  Pallet ${idx + 1} height=${p.totalHeight}mm, boxes:`, counts)
    })

    // Key assertion: both SKUs should fit on 1 pallet
    expect(result.pallets.length).toBe(1)
    expect(result.pallets[0].boxCount).toBe(54)
  })

  it('prioritizeFullLayers: 2 SKUs mixed with leftover should still produce 1 pallet', () => {
    const boxes: BoxDimension[] = []
    for (let i = 0; i < 20; i++) {
      boxes.push({ id: `box_1_${i}`, length: 360, width: 300, height: 240 })
    }
    for (let i = 0; i < 6; i++) {
      boxes.push({ id: `box_2_${i}`, length: 300, width: 200, height: 200 })
    }

    const config: StackingConfig = {
      palletLength: 1200,
      palletWidth: 1000,
      palletHeight: 150,
      effectiveHeight: 1450,
      overhangTolerance: 50,
      heightTolerance: 50,
      prioritizeFullLayers: true,
    }

    const result = calculateStackingPlan(boxes, config)
    console.log('--- Test with prioritizeFullLayers: true ---')
    result.pallets.forEach((p, idx) => {
      const counts: Record<string, number> = {}
      p.placedBoxes.forEach((pb) => {
        const key = `${pb.dimension.length}*${pb.dimension.width}*${pb.dimension.height}`
        counts[key] = (counts[key] || 0) + 1
      })
      console.log(`Pallet ${idx + 1} counts:`, counts)
    })

    expect(result.pallets.length).toBe(1)
  })
})
