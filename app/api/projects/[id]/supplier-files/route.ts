/**
 * Supplier Quotation Files API
 * 供应商原始报价文件上传/列表/删除
 * 
 * 存储路径: Customers/{customerName}/{projectName}/供应商报价/{supplierName}/
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStorage } from '@/lib/s3/storage';
import { createServerPocketBase } from '@/lib/pocketbase/server';

interface PathInfo {
  customerName: string;
  projectName: string;
}

async function getProjectPathInfo(projectId: string): Promise<PathInfo | null> {
  try {
    const pb = await createServerPocketBase();
    const project = await pb.collection('projects').getOne(projectId, {
      expand: 'customer',
    });
    
    const customerName = project.expand?.customer?.name || 
                         project.expand?.customer?.name_cn || 
                         'Unknown';
    const projectName = project.name || project.name_cn || 'Unknown';
    
    return { customerName, projectName };
  } catch {
    return null;
  }
}

function getSupplierFilePath(pathInfo: PathInfo, supplierName: string): string {
  return `Customers/${pathInfo.customerName}/${pathInfo.projectName}/供应商报价/${supplierName}/`;
}

// GET - 列出所有供应商的报价文件
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    
    const pathInfo = await getProjectPathInfo(projectId);
    if (!pathInfo) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const pb = await createServerPocketBase();
    const storage = createStorage();
    
    // 获取项目的所有询价供应商
    const rfqs = await pb.collection('rfqs').getFullList({
      filter: `project = "${projectId}"`,
    });
    
    if (rfqs.length === 0) {
      return NextResponse.json({ files: [] });
    }

    const rfqIds = rfqs.map(r => r.id);
    const rfqFilter = rfqIds.map(id => `rfq = "${id}"`).join(' || ');
    
    let rfqSuppliers = await pb.collection('rfq_suppliers').getFullList({
      filter: rfqFilter,
      expand: 'supplier',
    });

    // 如果指定了 supplierId，只查询该供应商
    if (supplierId) {
      rfqSuppliers = rfqSuppliers.filter(s => s.supplier === supplierId);
    }

    const files: Array<{
      supplierId: string;
      supplierName: string;
      fileName: string;
      filePath: string;
      fileUrl: string;
    }> = [];

    for (const rfqSupplier of rfqSuppliers) {
      const supplierName = rfqSupplier.expand?.supplier?.name || 
                          rfqSupplier.expand?.supplier?.name_cn || 
                          rfqSupplier.supplier;
      
      const folderPath = getSupplierFilePath(pathInfo, supplierName);
      const { data: folderFiles } = await storage.list({ prefix: folderPath });
      
      for (const file of folderFiles) {
        if (!file.isFolder && file.name !== '.keep') {
          files.push({
            supplierId: rfqSupplier.supplier,
            supplierName,
            fileName: file.name,
            filePath: file.path,
            fileUrl: `/api/disk/download?path=${encodeURIComponent(file.path)}`,
          });
        }
      }
    }

    return NextResponse.json({ files });
  } catch (error: any) {
    console.error('Failed to list supplier files:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - 上传供应商报价文件
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const supplierId = formData.get('supplierId') as string;

    if (!file || !supplierId) {
      return NextResponse.json(
        { error: 'Missing file or supplierId' },
        { status: 400 }
      );
    }

    const pathInfo = await getProjectPathInfo(projectId);
    if (!pathInfo) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 获取供应商名称
    const pb = await createServerPocketBase();
    const supplier = await pb.collection('suppliers').getOne(supplierId);
    const supplierName = supplier.name || supplier.name_cn || supplierId;

    const storage = createStorage();
    const folderPath = getSupplierFilePath(pathInfo, supplierName);
    
    // 删除该供应商目录下的旧文件（只保留一个文件）
    const { data: existingFiles } = await storage.list({ prefix: folderPath });
    for (const existingFile of existingFiles) {
      if (!existingFile.isFolder && existingFile.name !== '.keep') {
        await storage.remove(existingFile.path);
      }
    }

    // 上传新文件
    const uploadPath = `${folderPath}${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await storage.upload(uploadPath, buffer, {
      contentType: file.type,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      supplierId,
      fileName: file.name,
      filePath: uploadPath,
      fileUrl: `/api/disk/download?path=${encodeURIComponent(uploadPath)}`,
    });
  } catch (error: any) {
    console.error('Failed to upload supplier file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - 删除供应商报价文件
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');

    if (!supplierId) {
      return NextResponse.json({ error: 'Missing supplierId' }, { status: 400 });
    }

    const pathInfo = await getProjectPathInfo(projectId);
    if (!pathInfo) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 获取供应商名称
    const pb = await createServerPocketBase();
    const supplier = await pb.collection('suppliers').getOne(supplierId);
    const supplierName = supplier.name || supplier.name_cn || supplierId;

    const storage = createStorage();
    const folderPath = getSupplierFilePath(pathInfo, supplierName);
    
    // 删除该供应商目录下的所有文件
    const { data: files } = await storage.list({ prefix: folderPath });
    for (const file of files) {
      if (!file.isFolder) {
        await storage.remove(file.path);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete supplier file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
