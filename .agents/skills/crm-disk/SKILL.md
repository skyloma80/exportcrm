---
name: crm-disk
description: "File management - upload, download, list, and organize files in S3-compatible storage"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Files, Storage, S3, Disk]
depends_on: [crm-auth]
---

# CRM Disk / File Management Skill

Manage files in the CRM's S3-compatible storage system. Files are organized in a hierarchical folder structure and accessible via the disk UI or API.

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/disk/list` | GET | List files/folders in a path |
| `/api/disk/upload` | POST | Upload a file |
| `/api/disk/download` | GET | Download a file |
| `/api/disk/delete` | DELETE | Delete a file/folder |
| `/api/disk/folders` | GET | Get folder tree |
| `/api/disk/ensure-folder` | POST | Create folder |
| `/api/disk/file` | GET | Get file metadata |
| `/api/disk/image` | GET | Get image file |

## Common Operations

### List Files in Directory
```python
import urllib.request, json

url = f"{CRM_API_URL}/api/disk/list?path=/CompanyName/CustomerName/ProjectName"
req = urllib.request.Request(url, headers=get_pb_headers())
with urllib.request.urlopen(req) as r:
    files = json.loads(r.read())
    for f in files.get("data", []):
        print(f"{'📁' if f['isFolder'] else '📄'} {f['name']} "
              f"{'('+format_size(f.get('size',0))+')' if not f['isFolder'] else ''}")
```

### Upload File
```python
import urllib.request
import json

# Form upload
url = f"{CRM_API_URL}/api/disk/upload?path=/Target/Folder/Path"
# Using multipart form data with file
# Or via the upload form UI
```

### Create Folder Structure
```python
url = f"{CRM_API_URL}/api/disk/ensure-folder"
data = json.dumps({"path": "/Company/Customer/Project/Documents"}).encode()
req = urllib.request.Request(url, data=data, headers=get_pb_headers(), method="POST")
with urllib.request.urlopen(req) as r:
    result = json.loads(r.read())
```

### Get Folder Tree
```python
url = f"{CRM_API_URL}/api/disk/folders"
req = urllib.request.Request(url, headers=get_pb_headers())
with urllib.request.urlopen(req) as r:
    tree = json.loads(r.read())
```

### Download File
```python
url = f"{CRM_API_URL}/api/disk/download?path=/File/Path/document.pdf"
req = urllib.request.Request(url, headers=get_pb_headers(headers_only=True))
# Stream the response as binary file
```

## File Path Convention

```
/{company_name}/{customer_name}/{project_name}/{category}/{filename}
```

Example: `/Alustars/ABC Trading/Project 2024/Documents/spec.pdf`

## Document Paths (Auto-generated)

The CRM auto-generates document paths for orders:
```
/{company}/{customer}/{project}/{doc_type}/{filename}
```

| Doc Type | Folder |
|----------|--------|
| PI | `PI/` |
| PO | `PO/` |
| Quotations | `Quotations/` |
| RFQ | `RFQ/` |
| Shipments | `Shipments/` |
| Photos | `Photos/` |

## Quick Start

```bash
# List root folders
curl -H "Authorization: Bearer $CRM_API_TOKEN" \
  "${CRM_API_URL}/api/disk/list?path=/"

# Download a file
curl -H "Authorization: Bearer $CRM_API_TOKEN" \
  -o "output.pdf" \
  "${CRM_API_URL}/api/disk/download?path=/Company/Customer/Doc/spec.pdf"
```

## Usage in Hermes

1. Load crm-auth + crm-disk
2. List files/folders via API
3. Download/upload files as needed
4. Create folder structure for new projects
