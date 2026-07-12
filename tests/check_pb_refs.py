import os, glob

total = table = text = 0
for f in sorted(glob.glob(os.path.join(".agents", "skills", "**", "SKILL.md"), recursive=True)):
    with open(f, "r", encoding="utf-8") as fh:
        c = fh.read()
    if "PB 集合参考" in c:
        total += 1
        if "| 集合名 | 说明 |" in c:
            table += 1
        else:
            text += 1
            print(f"Text only: {os.path.relpath(f)}")

print(f"Total: {total} (table: {table}, text-only: {text})")
