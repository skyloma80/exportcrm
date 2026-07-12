import copy

class PalletPacker:
    def __init__(self, pallet_specs, overhang_limits, pallet_height=150, support_threshold=0.8):
        """
        pallet_specs: 托盘规格列表，如:
          [
            {'name': '1200x1200', 'dims': [1200, 1200, 1600]},
            {'name': '1200x1000', 'dims': [1200, 1000, 1600]},
            {'name': '1200x800',  'dims': [1200, 800,  1600]},
            {'name': '1000x1000', 'dims': [1000, 1000, 1600]}
          ]
          尺寸格式为 [长, 宽, 基础限高] (单位均为 mm)
        overhang_limits: [长边总公差, 宽边总公差, 高度总公差] (如 [50, 50, 50])
        pallet_height: 托盘自身厚度 (默认 150mm)，箱子净高限额 = 基础限高 + 高度公差 - 托盘高度
        support_threshold: 要求的底面积最小支撑比例 (默认 0.8)
        """
        self.pallet_specs = pallet_specs
        self.overhang_l, self.overhang_w, self.overhang_h = overhang_limits
        self.pallet_height = pallet_height
        self.support_threshold = support_threshold

        # 对托盘规格按底面积从大到小排序，模拟时可以方便按大小遍历
        # 例如 1200x1200, 1200x1000, 1000x1000, 1200x800
        self.sorted_pallet_specs = sorted(
            pallet_specs, 
            key=lambda x: (x['dims'][0] * x['dims'][1]), 
            reverse=True
        )

    def _get_sorted_items(self, test_array):
        """
        对货箱进行复合排序，以确保物理稳定性 (重下轻上，避免上宽下窄)
        """
        flat_items = []
        for idx, box in enumerate(test_array):
            if len(box) == 5:
                l, w, h, qty, weight = box
            else:
                l, w, h, qty = box
                weight = l * w * h / 1e6  # 估算重量

            if l < w:
                l, w = w, l

            for i in range(qty):
                flat_items.append({
                    'id': f"Box_{l}x{w}x{h}_{idx}_{i}",
                    'dims': [l, w, h],
                    'weight': weight,
                    'bottom_area': l * w,
                    'volume': l * w * h
                })

        flat_items.sort(key=lambda x: (-x['weight'], -x['bottom_area'], -x['volume']))
        return flat_items

    def _check_overlap(self, box_x, box_y, box_z, box_l, box_w, box_h, packed_items):
        for item in packed_items:
            ix, iy, iz = item['pos']
            il, iw, ih = item['dims']
            if (box_x < ix + il and box_x + box_l > ix and
                box_y < iy + iw and box_y + box_w > iy and
                box_z < iz + ih and box_z + box_h > iz):
                return True
        return False

    def _check_support_spec(self, box_x, box_y, box_z, box_l, box_w, packed_items, px_min, px_max, py_min, py_max):
        """
        参数化的支撑面积校验，根据当前模拟托盘的具体范围进行计算
        """
        box_area = float(box_l * box_w)
        if box_area == 0:
            return False, 0.0

        overlap_area = 0.0

        if box_z == 0:
            # 校验与实体托盘表面的重叠
            x_overlap_min = max(box_x, px_min)
            x_overlap_max = min(box_x + box_l, px_max)
            y_overlap_min = max(box_y, py_min)
            y_overlap_max = min(box_y + box_w, py_max)

            if x_overlap_max > x_overlap_min and y_overlap_max > y_overlap_min:
                overlap_area = (x_overlap_max - x_overlap_min) * (y_overlap_max - y_overlap_min)
        else:
            # 校验与下方盒子的重叠
            for item in packed_items:
                ix, iy, iz = item['pos']
                il, iw, ih = item['dims']
                if abs(iz + ih - box_z) < 1e-5:
                    x_overlap_min = max(box_x, ix)
                    x_overlap_max = min(box_x + box_l, ix + il)
                    y_overlap_min = max(box_y, iy)
                    y_overlap_max = min(box_y + box_w, iy + iw)

                    if x_overlap_max > x_overlap_min and y_overlap_max > y_overlap_min:
                        overlap_area += (x_overlap_max - x_overlap_min) * (y_overlap_max - y_overlap_min)

        support_ratio = overlap_area / box_area
        return support_ratio >= self.support_threshold, support_ratio

    def _project_extreme_point(self, x, y, z, packed_items, px_min, py_min):
        px = px_min
        py = py_min
        pz = 0.0

        for item in packed_items:
            ix, iy, iz = item['pos']
            il, iw, ih = item['dims']
            if iy <= y < iy + iw and iz <= z < iz + ih:
                if ix + il <= x:
                    px = max(px, ix + il)

        for item in packed_items:
            ix, iy, iz = item['pos']
            il, iw, ih = item['dims']
            if ix <= x < ix + il and iz <= z < iz + ih:
                if iy + iw <= y:
                    py = max(py, iy + iw)

        for item in packed_items:
            ix, iy, iz = item['pos']
            il, iw, ih = item['dims']
            if ix <= x < ix + il and iy <= y < iy + iw:
                if iz + ih <= z:
                    pz = max(pz, iz + ih)

        return px, py, pz

    def _update_extreme_points_spec(self, packed_items, max_l, max_w, max_h, px_min, py_min):
        eps = {(0.0, 0.0, 0.0), (px_min, py_min, 0.0)}

        for item in packed_items:
            ix, iy, iz = item['pos']
            il, iw, ih = item['dims']

            raw_points = [
                (ix + il, iy, iz),
                (ix, iy + iw, iz),
                (ix, iy, iz + ih)
            ]

            for rx, ry, rz in raw_points:
                if rx < max_l and ry < max_w and rz < max_h:
                    px, py, pz = self._project_extreme_point(rx, ry, rz, packed_items, px_min, py_min)
                    eps.add((rx, ry, rz))
                    eps.add((px, ry, rz))
                    eps.add((rx, py, rz))
                    eps.add((rx, ry, pz))
                    eps.add((px, py, pz))

        # 增强：在同层箱子之间的间隙中添加候选点
        z_levels = {}
        for item in packed_items:
            iz = item['pos'][2]
            if iz not in z_levels:
                z_levels[iz] = []
            z_levels[iz].append(item)

        for iz, layer_items in z_levels.items():
            # X方向间隙：按x排序，找相邻箱子之间的空隙
            sorted_by_x = sorted(layer_items, key=lambda it: it['pos'][0])
            for i in range(len(sorted_by_x) - 1):
                a = sorted_by_x[i]
                b = sorted_by_x[i + 1]
                ax_end = a['pos'][0] + a['dims'][0]
                bx_start = b['pos'][0]
                if bx_start - ax_end > 1:  # 有间隙
                    gap_x = ax_end
                    # 在间隙的y范围交集处添加点
                    ay_start, ay_end = a['pos'][1], a['pos'][1] + a['dims'][1]
                    by_start, by_end = b['pos'][1], b['pos'][1] + b['dims'][1]
                    y_overlap_start = max(ay_start, by_start)
                    y_overlap_end = min(ay_end, by_end)
                    if y_overlap_end > y_overlap_start:
                        mid_y = (y_overlap_start + y_overlap_end) / 2
                        if gap_x < max_l and mid_y < max_w:
                            eps.add((gap_x, mid_y, iz))

            # Y方向间隙：按y排序，找相邻箱子之间的空隙
            sorted_by_y = sorted(layer_items, key=lambda it: it['pos'][1])
            for i in range(len(sorted_by_y) - 1):
                a = sorted_by_y[i]
                b = sorted_by_y[i + 1]
                ay_end = a['pos'][1] + a['dims'][1]
                by_start = b['pos'][1]
                if by_start - ay_end > 1:  # 有间隙
                    gap_y = ay_end
                    ax_start, ax_end = a['pos'][0], a['pos'][0] + a['dims'][0]
                    bx_start, bx_end = b['pos'][0], b['pos'][0] + b['dims'][0]
                    x_overlap_start = max(ax_start, bx_start)
                    x_overlap_end = min(ax_end, bx_end)
                    if x_overlap_end > x_overlap_start:
                        mid_x = (x_overlap_start + x_overlap_end) / 2
                        if mid_x < max_l and gap_y < max_w:
                            eps.add((mid_x, gap_y, iz))

        valid_eps = set()
        for x, y, z in eps:
            if x >= max_l or y >= max_w or z >= max_h:
                continue

            inside_item = False
            for item in packed_items:
                ix, iy, iz = item['pos']
                il, iw, ih = item['dims']
                if ix <= x < ix + il and iy <= y < iy + iw and iz <= z < iz + ih:
                    inside_item = True
                    break

            if not inside_item:
                valid_eps.add((x, y, z))

        return list(valid_eps)

    def _center_packed_items(self, packed_items, base_l, base_w):
        """
        后处理居中：将已装载的所有箱子整体的几何中心移到当前托盘尺寸的中央
        """
        if not packed_items:
            return

        min_x = min(item['pos'][0] for item in packed_items)
        max_x = max(item['pos'][0] + item['dims'][0] for item in packed_items)
        min_y = min(item['pos'][1] for item in packed_items)
        max_y = max(item['pos'][1] + item['dims'][1] for item in packed_items)

        packed_l = max_x - min_x
        packed_w = max_y - min_y

        # 当前托盘的几何中心 (考虑在 [0, base_l + overhang_l] 范围中居中对齐)
        pallet_center_x = (base_l + self.overhang_l) / 2.0
        pallet_center_y = (base_w + self.overhang_w) / 2.0

        # 当前箱子包络块的几何中心
        center_x = min_x + packed_l / 2.0
        center_y = min_y + packed_w / 2.0

        shift_x = pallet_center_x - center_x
        shift_y = pallet_center_y - center_y

        for item in packed_items:
            item['pos'][0] += shift_x
            item['pos'][1] += shift_y

    def _pack_single_pallet(self, pallet_spec, items_to_pack):
        """
        使用指定的托盘规格虚拟装载当前剩余货物
        返回: (已装载箱子在 items_to_pack 中的 index 列表, 装载的箱子数据列表)
        """
        base_l, base_w, base_h = pallet_spec['dims']
        max_l = base_l + self.overhang_l
        max_w = base_w + self.overhang_w
        # 箱体本身的限高 = 托盘限高 + 高度公差 - 托盘自身厚度
        max_h = base_h + self.overhang_h - self.pallet_height

        px_min = self.overhang_l / 2.0
        px_max = px_min + base_l
        py_min = self.overhang_w / 2.0
        py_max = py_min + base_w

        packed_items = []
        eps = [(px_min, py_min, 0.0), (0.0, 0.0, 0.0)]
        packed_indices = []

        for idx, item in enumerate(items_to_pack):
            item_l, item_w, item_h = item['dims']
            best_score = None
            best_placement = None

            for ep in eps:
                ex, ey, ez = ep
                orientations = [(item_l, item_w), (item_w, item_l)]

                for ol, ow in orientations:
                    # 1. 边界校验
                    if ex + ol > max_l or ey + ow > max_w or ez + item_h > max_h:
                        continue

                    # 2. 重叠碰撞校验
                    if self._check_overlap(ex, ey, ez, ol, ow, item_h, packed_items):
                        continue

                    # 3. 支撑校验
                    is_supported, ratio = self._check_support_spec(
                        ex, ey, ez, ol, ow, packed_items,
                        px_min, px_max, py_min, py_max
                    )
                    if not is_supported:
                        continue

                    # 4. 评分评分 (高度优先 -> 悬空最少 -> 靠角靠边)
                    overhang_left = max(0.0, px_min - ex)
                    overhang_right = max(0.0, (ex + ol) - px_max)
                    overhang_front = max(0.0, py_min - ey)
                    overhang_back = max(0.0, (ey + ow) - py_max)
                    total_overhang = overhang_left + overhang_right + overhang_front + overhang_back

                    score = (ez, total_overhang, ey, ex)

                    if best_score is None or score < best_score:
                        best_score = score
                        best_placement = (ex, ey, ez, ol, ow)

            if best_placement:
                bx, by, bz, bl, bw = best_placement
                packed_items.append({
                    'id': item['id'],
                    'name': f"Box_{item_l}x{item_w}x{item_h}",
                    'pos': [bx, by, bz],
                    'dims': [bl, bw, item_h],
                    'weight': item['weight']
                })
                packed_indices.append(idx)
                # 更新 EPs
                eps = self._update_extreme_points_spec(packed_items, max_l, max_w, max_h, px_min, py_min)

        return packed_indices, packed_items

    def _try_fit_into_pallet(self, pallet_result, item):
        """
        尝试将单个箱子放入已有托盘的空隙中。
        返回 True 如果成功放入并更新了 pallet_result。
        """
        spec = None
        for s in self.pallet_specs:
            if s['name'] == pallet_result['spec_name']:
                spec = s
                break
        if not spec:
            return False

        base_l, base_w, base_h = spec['dims']
        max_l = base_l + self.overhang_l
        max_w = base_w + self.overhang_w
        max_h = base_h + self.overhang_h - self.pallet_height
        px_min = self.overhang_l / 2.0
        px_max = px_min + base_l
        py_min = self.overhang_w / 2.0
        py_max = py_min + base_w

        packed_items = pallet_result['packed_items']
        item_l, item_w, item_h = item['dims']
        if item_l < item_w:
            item_l, item_w = item_w, item_l

        eps = self._update_extreme_points_spec(packed_items, max_l, max_w, max_h, px_min, py_min)
        best_score = None
        best_placement = None

        for ep in eps:
            ex, ey, ez = ep
            for ol, ow in [(item_l, item_w), (item_w, item_l)]:
                if ex + ol > max_l or ey + ow > max_w or ez + item_h > max_h:
                    continue
                if self._check_overlap(ex, ey, ez, ol, ow, item_h, packed_items):
                    continue
                is_supported, ratio = self._check_support_spec(
                    ex, ey, ez, ol, ow, packed_items, px_min, px_max, py_min, py_max
                )
                if not is_supported:
                    continue
                overhang_left = max(0.0, px_min - ex)
                overhang_right = max(0.0, (ex + ol) - px_max)
                overhang_front = max(0.0, py_min - ey)
                overhang_back = max(0.0, (ey + ow) - py_max)
                total_overhang = overhang_left + overhang_right + overhang_front + overhang_back
                score = (ez, total_overhang, ey, ex)
                if best_score is None or score < best_score:
                    best_score = score
                    best_placement = (ex, ey, ez, ol, ow)

        if best_placement:
            bx, by, bz, bl, bw = best_placement
            packed_items.append({
                'id': item['id'],
                'name': f"Box_{item_l}x{item_w}x{item_h}",
                'pos': [bx, by, bz],
                'dims': [bl, bw, item_h],
                'weight': item['weight']
            })
            self._center_packed_items(packed_items, base_l, base_w)
            return True
        return False

    def pack(self, test_array):
        """
        自适应多规格托盘混装打托计算
        """
        items_to_pack = self._get_sorted_items(test_array)
        pallets = []

        while len(items_to_pack) > 0:
            best_spec = None
            best_packed_indices = []
            best_packed_items = []
            best_score_key = (-1, float('inf'))  # (装载的总体积/数量, 托盘底面积)

            # 遍历所有规格托盘，选择最优的那一个
            # 优化原则：
            # 1. 如果有规格能装下剩余的“全部”货箱，则在所有能装下的规格中，选“底面积最小”的那款（节约空间与托盘）
            # 2. 如果没有任何规格能一次性装完剩余的全部货箱，则选择“装载货箱总体积最大”的那款托盘。若总体积相同，选“底面积最小”的。
            
            all_packed_specs = [] # 能把当前剩余箱子 100% 全部装下的托盘规格列表
            
            # 首先运行模拟
            sim_results = {}
            for spec in self.sorted_pallet_specs:
                packed_indices, packed_items = self._pack_single_pallet(spec, items_to_pack)
                sim_results[spec['name']] = (packed_indices, packed_items)
                
                if len(packed_indices) == len(items_to_pack):
                    all_packed_specs.append((spec, packed_indices, packed_items))

            # 根据规则选择最佳规格
            if all_packed_specs:
                # 规则 1：都能装完，选择托盘面积最小的
                # 由于 self.sorted_pallet_specs 按面积降序排序，我们只需要反向遍历或者取面积最小的
                all_packed_specs.sort(key=lambda x: (x[0]['dims'][0] * x[0]['dims'][1]))
                best_spec, best_packed_indices, best_packed_items = all_packed_specs[0]
            else:
                # 规则 2：都无法一次性装完，选择装载总体积最大优先，面积最小次之
                best_spec = None
                max_vol = -1
                min_area = float('inf')
                
                for spec in self.sorted_pallet_specs:
                    packed_indices, packed_items = sim_results[spec['name']]
                    packed_vol = sum(item['dims'][0] * item['dims'][1] * item['dims'][2] for item in packed_items)
                    spec_area = spec['dims'][0] * spec['dims'][1]
                    
                    if packed_vol > max_vol:
                        max_vol = packed_vol
                        min_area = spec_area
                        best_spec = spec
                        best_packed_indices = packed_indices
                        best_packed_items = packed_items
                    elif packed_vol == max_vol and spec_area < min_area:
                        min_area = spec_area
                        best_spec = spec
                        best_packed_indices = packed_indices
                        best_packed_items = packed_items

            if not best_packed_items:
                print("【错误】存在单箱尺寸超限的货箱，无法放入任何规格的托盘！")
                break

            # 对最终选定的托盘排布执行后处理：水平质心居中对齐
            base_l, base_w = best_spec['dims'][:2]
            self._center_packed_items(best_packed_items, base_l, base_w)

            # 组装托盘排布结果
            pallet_result = {
                'id': len(pallets) + 1,
                'spec_name': best_spec['name'],
                'base_l': base_l,
                'base_w': base_w,
                'base_h': best_spec['dims'][2],
                'packed_items': best_packed_items
            }
            pallets.append(pallet_result)

            # 从待装箱列表中移除已装载货物
            for index in sorted(best_packed_indices, reverse=True):
                items_to_pack.pop(index)

        # 后处理：尝试将剩余箱子放入已有托盘的空隙
        if items_to_pack and pallets:
            still_remaining = []
            for item in items_to_pack:
                fitted = False
                for pallet in pallets:
                    if self._try_fit_into_pallet(pallet, item):
                        fitted = True
                        break
                if not fitted:
                    still_remaining.append(item)
            items_to_pack = still_remaining

        # 如果还有剩余，创建新托盘
        while items_to_pack:
            best_spec = None
            best_packed_indices = []
            best_packed_items = []
            for spec in self.sorted_pallet_specs:
                packed_indices, packed_items = self._pack_single_pallet(spec, items_to_pack)
                if packed_indices:
                    packed_vol = sum(it['dims'][0]*it['dims'][1]*it['dims'][2] for it in packed_items)
                    spec_area = spec['dims'][0]*spec['dims'][1]
                    if best_spec is None or packed_vol > best_vol or (packed_vol == best_vol and spec_area < best_area):
                        best_spec = spec
                        best_packed_indices = packed_indices
                        best_packed_items = packed_items
                        best_vol = packed_vol
                        best_area = spec_area
            if not best_packed_items:
                break
            base_l, base_w = best_spec['dims'][:2]
            self._center_packed_items(best_packed_items, base_l, base_w)
            pallets.append({
                'id': len(pallets)+1, 'spec_name': best_spec['name'],
                'base_l': base_l, 'base_w': base_w, 'base_h': best_spec['dims'][2],
                'packed_items': best_packed_items
            })
            for index in sorted(best_packed_indices, reverse=True):
                items_to_pack.pop(index)

        return pallets
