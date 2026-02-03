'use client'

import { useRef, useState, Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import type { StackingPlan, PlacedBox, PalletPlan } from '@/lib/pallet-calculator/stacking-algorithm'
import type { PalletSpec, PalletMaterial } from '@/lib/constants/trade-constants'

interface Viewer3DProps {
  stackingPlan: StackingPlan | null
  palletSpec: PalletSpec
  material: PalletMaterial
  activePalletIndex?: number
  showAllPallets?: boolean // 新增：是否显示所有托盘
}

// 缩放因子：将mm转换为Three.js单位
const SCALE = 0.001

// 托盘之间的间距 (米)
const PALLET_GAP = 0.3

// 箱子颜色调色板
const BOX_COLORS = [
  '#D2691E', // 巧克力色
  '#CD853F', // 秘鲁色
  '#DEB887', // 实木色
  '#F4A460', // 沙棕色
  '#D2B48C', // 棕褐色
]

// 获取材质颜色
function getMaterialColor(material: PalletMaterial): string {
  return material.color
}

// 托盘组件
function Pallet({ spec, material }: { spec: PalletSpec; material: PalletMaterial }) {
  const color = getMaterialColor(material)
  const l = spec.length * SCALE
  const w = spec.width * SCALE
  const h = spec.height * SCALE
  
  // 托盘由多个部分组成
  const boardThickness = 0.02
  const legHeight = h - boardThickness * 2
  const legWidth = 0.1
  
  return (
    <group position={[0, h / 2, 0]}>
      {/* 顶板 */}
      <mesh position={[0, h / 2 - boardThickness / 2, 0]}>
        <boxGeometry args={[l, boardThickness, w]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      
      {/* 底板 */}
      <mesh position={[0, -h / 2 + boardThickness / 2, 0]}>
        <boxGeometry args={[l, boardThickness, w]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      
      {/* 支撑腿 - 9个 */}
      {[-1, 0, 1].map(xi => 
        [-1, 0, 1].map(zi => (
          <mesh 
            key={`leg-${xi}-${zi}`}
            position={[
              xi * (l / 2 - legWidth / 2 - 0.02),
              0,
              zi * (w / 2 - legWidth / 2 - 0.02)
            ]}
          >
            <boxGeometry args={[legWidth, legHeight, legWidth]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        ))
      )}
      
      {/* 边框线 */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(l, h, w)]} />
        <lineBasicMaterial color="#333" />
      </lineSegments>
    </group>
  )
}

// 单个箱子组件
function Box({ 
  placedBox, 
  colorIndex,
  onHover,
  palletLength,
  palletWidth
}: { 
  placedBox: PlacedBox
  colorIndex: number
  onHover: (box: PlacedBox | null) => void
  palletLength: number
  palletWidth: number
}) {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<THREE.Mesh>(null)
  
  const { dimension, position, rotation, isOverhanging } = placedBox
  
  // 根据旋转获取实际尺寸
  const l = rotation === 'LWH' ? dimension.length : dimension.width
  const w = rotation === 'LWH' ? dimension.width : dimension.length
  const h = dimension.height
  
  // 转换位置 (从mm到Three.js单位)
  // position.x/y 是相对于托盘左下角(0,0)的坐标
  // 需要转换为相对于托盘中心的坐标
  const x = (position.x + l / 2 - palletLength / 2) * SCALE
  const y = (position.z + h / 2) * SCALE
  const z = (position.y + w / 2 - palletWidth / 2) * SCALE
  
  const baseColor = BOX_COLORS[colorIndex % BOX_COLORS.length]
  const color = hovered ? '#FFD700' : baseColor
  
  return (
    <group position={[x, y, z]}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          onHover(placedBox)
        }}
        onPointerOut={() => {
          setHovered(false)
          onHover(null)
        }}
      >
        <boxGeometry args={[l * SCALE, h * SCALE, w * SCALE]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.6}
          transparent={isOverhanging}
          opacity={isOverhanging ? 0.8 : 1}
        />
      </mesh>
      
      {/* 边框 */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(l * SCALE, h * SCALE, w * SCALE)]} />
        <lineBasicMaterial color={isOverhanging ? '#FF6600' : '#333'} linewidth={isOverhanging ? 2 : 1} />
      </lineSegments>
      
      {/* 悬停提示 */}
      {hovered && (
        <Html position={[0, h * SCALE / 2 + 0.1, 0]} center>
          <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            {dimension.length} × {dimension.width} × {dimension.height} mm
            {isOverhanging && <span className="text-orange-400 ml-1">(悬空)</span>}
          </div>
        </Html>
      )}
    </group>
  )
}

// 单个托盘的堆放展示
function PalletStack({ 
  pallet, 
  spec, 
  material,
  onBoxHover,
  palletIndex,
  showLabel
}: { 
  pallet: PalletPlan
  spec: PalletSpec
  material: PalletMaterial
  onBoxHover: (box: PlacedBox | null) => void
  palletIndex?: number
  showLabel?: boolean
}) {
  // 如果托盘有自己的规格信息，使用它；否则使用传入的默认规格
  const actualSpec = pallet.palletSpec ? {
    ...spec,
    length: pallet.palletSpec.length,
    width: pallet.palletSpec.width,
    height: pallet.palletSpec.height,
    name_cn: pallet.palletSpec.name_cn
  } : spec
  
  return (
    <group>
      {/* 托盘底座 - 居中放置 */}
      <group position={[0, 0, 0]}>
        <Pallet spec={actualSpec} material={material} />
        
        {/* 托盘编号标签 */}
        {showLabel && palletIndex !== undefined && (
          <Html position={[0, -0.1, 0]} center>
            <div className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-bold whitespace-nowrap">
              托盘 #{palletIndex + 1}
              {pallet.palletSpec && (
                <span className="text-xs ml-1 opacity-80">
                  ({pallet.palletSpec.length}×{pallet.palletSpec.width})
                </span>
              )}
            </div>
          </Html>
        )}
      </group>
      
      {/* 箱子 - 位置已经是相对于托盘中心的 */}
      <group position={[0, actualSpec.height * SCALE, 0]}>
        {pallet.placedBoxes.map((box, index) => (
          <Box 
            key={box.dimension.id} 
            placedBox={box} 
            colorIndex={index}
            onHover={onBoxHover}
            palletLength={actualSpec.length}
            palletWidth={actualSpec.width}
          />
        ))}
      </group>
    </group>
  )
}

// 场景组件
function Scene({ 
  stackingPlan, 
  palletSpec, 
  material,
  activePalletIndex = 0,
  showAllPallets = false
}: Viewer3DProps) {
  const [, setHoveredBox] = useState<PlacedBox | null>(null)
  
  const pallets = stackingPlan?.pallets || []
  const palletCount = pallets.length
  
  // 计算多托盘布局的位置
  const palletPositions = useMemo(() => {
    if (!showAllPallets || palletCount <= 1) {
      return [[0, 0, 0]]
    }
    
    // 计算每个托盘的X偏移（并排放置）
    // 考虑每个托盘可能有不同的尺寸
    const positions: [number, number, number][] = []
    let currentX = 0
    
    for (let i = 0; i < pallets.length; i++) {
      const pallet = pallets[i]
      const palletLength = pallet.palletSpec?.length || palletSpec.length
      
      if (i === 0) {
        positions.push([0, 0, 0])
        currentX = palletLength * SCALE / 2 + PALLET_GAP
      } else {
        const prevPallet = pallets[i - 1]
        const prevLength = prevPallet.palletSpec?.length || palletSpec.length
        currentX += prevLength * SCALE / 2 + PALLET_GAP + palletLength * SCALE / 2
        positions.push([currentX - positions[0][0], 0, 0])
      }
    }
    
    // 居中调整
    const totalWidth = currentX + (pallets[pallets.length - 1].palletSpec?.length || palletSpec.length) * SCALE / 2
    const offset = totalWidth / 2
    return positions.map(p => [p[0] - offset + (pallets[0].palletSpec?.length || palletSpec.length) * SCALE / 2, p[1], p[2]] as [number, number, number])
  }, [showAllPallets, palletCount, palletSpec.length, pallets])
  
  // 计算相机目标点和距离 - 使用稳定的值
  const cameraConfig = useMemo(() => {
    if (showAllPallets && palletCount > 1) {
      const totalWidth = palletCount * (palletSpec.length * SCALE + PALLET_GAP)
      return {
        target: [0, 0.5, 0] as [number, number, number],
        gridSize: Math.max(4, totalWidth + 2)
      }
    }
    return {
      target: [0, 0.5, 0] as [number, number, number],
      gridSize: 4
    }
  }, [showAllPallets, palletCount, palletSpec.length])
  
  return (
    <>
      {/* 光照 */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      
      {/* 地面网格 */}
      <gridHelper args={[cameraConfig.gridSize, 20, '#888', '#ccc']} position={[0, 0, 0]} />
      
      {/* 托盘和箱子 */}
      {showAllPallets && palletCount > 0 ? (
        // 显示所有托盘
        pallets.map((pallet, index) => (
          <group key={index} position={palletPositions[index] as [number, number, number]}>
            <PalletStack 
              pallet={pallet}
              spec={palletSpec}
              material={material}
              onBoxHover={setHoveredBox}
              palletIndex={index}
              showLabel={palletCount > 1}
            />
          </group>
        ))
      ) : pallets[activePalletIndex] ? (
        // 只显示当前选中的托盘
        <PalletStack 
          pallet={pallets[activePalletIndex]}
          spec={palletSpec}
          material={material}
          onBoxHover={setHoveredBox}
        />
      ) : (
        // 如果没有堆放方案，只显示空托盘
        <group position={[0, 0, 0]}>
          <Pallet spec={palletSpec} material={material} />
        </group>
      )}
      
      {/* 相机控制 */}
      <OrbitControls 
        makeDefault
        enableDamping={false}
        minDistance={0.5}
        maxDistance={15}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={false}
        zoomSpeed={1}
        rotateSpeed={0.5}
      />
    </>
  )
}

// 加载占位
function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
      <div className="text-gray-500">加载3D场景...</div>
    </div>
  )
}

// 主组件
export function PalletViewer3D(props: Viewer3DProps) {
  const palletCount = props.stackingPlan?.pallets.length || 0
  
  return (
    <div className="relative w-full h-[400px] bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg overflow-hidden">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [3, 3, 3], fov: 50 }}
          shadows
          style={{ width: '100%', height: '100%' }}
        >
          <Scene {...props} />
        </Canvas>
      </Suspense>
      
      {/* 托盘数量提示 */}
      {palletCount > 1 && props.showAllPallets && (
        <div className="absolute top-2 left-2 text-sm text-gray-700 bg-white/90 px-3 py-1 rounded shadow">
          共 {palletCount} 个托盘
        </div>
      )}
      
      {/* 控制提示 */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded">
        拖拽旋转 | 滚轮缩放
      </div>
    </div>
  )
}

export default PalletViewer3D
