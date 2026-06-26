#!/usr/bin/env python3
import sys, os, json, urllib.request, urllib.parse
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import CRM_API_URL, _headers

def list_files(path="/"):
    url = f"{CRM_API_URL}/api/disk/list?path={urllib.parse.quote(path)}"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

def get_folder_tree():
    url = f"{CRM_API_URL}/api/disk/folders"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

def ensure_folder(path):
    url = f"{CRM_API_URL}/api/disk/ensure-folder"
    data = json.dumps({"path": path}).encode()
    req = urllib.request.Request(url, data=data, headers=_headers(), method="POST")
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

def delete_file(path):
    url = f"{CRM_API_URL}/api/disk/delete?path={urllib.parse.quote(path)}"
    req = urllib.request.Request(url, headers=_headers(), method="DELETE")
    with urllib.request.urlopen(req) as r: return {"deleted": True, "path": path}

def download_url(path):
    return {"url": f"{CRM_API_URL}/api/disk/download?path={urllib.parse.quote(path)}"}

if __name__ == "__main__":
    if len(sys.argv) < 2: print("Usage: disk.py <list|tree|mkdir|delete|download> [path]"); sys.exit(1)
    cmd = sys.argv[1]
    try:
        path = sys.argv[2] if len(sys.argv)>2 else "/"
        if cmd == "list": result = list_files(path)
        elif cmd == "tree": result = get_folder_tree()
        elif cmd == "mkdir": result = ensure_folder(path)
        elif cmd == "delete": result = delete_file(path)
        elif cmd == "download": result = download_url(path)
        else: print("Unknown command"); sys.exit(1)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e: print(json.dumps({"error": str(e)}, ensure_ascii=False)); sys.exit(1)
