import re, os, glob

base = os.path.join(os.path.dirname(__file__), "..", ".agents", "skills")
files = glob.glob(os.path.join(base, "**", "SKILL.md"), recursive=True)

# 函数名替换表
replacements = {
    "pb_list": "list_records",
    "pb_create": "create_record",
    "pb_update": "update_record",
    "pb_delete": "delete_record",
}

# 移除 | 来源 | 列头和对应的迁移编号
source_header_pat = re.compile(r"^\| 集合名 \| 说明 \| 来源 \|$", re.MULTILINE)
source_row_pat = re.compile(r"^\| `\w+` \| .+? \| .+? 号迁移.*? \|$", re.MULTILINE)

# 移除标题中的 （XXX 号迁移创建）
header_migration_pat = re.compile(r"（\d+ 号迁移.*?）")
header_migration_pat2 = re.compile(r"（\d+ 号迁移重构.*?）")

# 移除段落中的 "已在 XXX 号迁移中删除"
para_migration_pat = re.compile(r"已在 \d+ 号迁移中删除[。，,;；]?")
para_migration_pat2 = re.compile(r"，已在 \d+ 号迁移中删除")

for fpath in sorted(files):
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
    orig = content

    for old, new in replacements.items():
        content = content.replace(old, new)

    content = source_header_pat.sub("| 集合名 | 说明 |", content)

    # 在移除表头后，移除带迁移号的行（确保表头已被处理）
    # 但注意有些文件可能表格格式不同，需要保留不含迁移号的行
    rows = content.split("\n")
    new_rows = []
    in_source_table = False
    skip_header_already = False
    for r in rows:
        stripped = r.strip()
        # 跳过已处理过的表头
        if "| 集合名 | 说明 |" in stripped and "来源" not in stripped:
            # 跳过之后紧跟的 |---|---| 分隔行
            skip_header_already = False
        # 处理带迁移号的行
        if re.match(r"^\| `\w+` \| .+? \| \d+ 号迁移", stripped):
            continue
        new_rows.append(r)
    content = "\n".join(new_rows)

    # 清理标题中的迁移标记
    content = header_migration_pat.sub("", content)
    content = header_migration_pat2.sub("", content)

    # 清理段落中的迁移删除标记
    content = para_migration_pat.sub("", content)
    content = para_migration_pat2.sub("", content)

    if content != orig:
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated: {os.path.relpath(fpath, base)}")
    else:
        print(f"Unchanged: {os.path.relpath(fpath, base)}")

print("Done")
