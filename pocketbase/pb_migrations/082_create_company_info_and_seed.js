/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 082: Create company_info collection + seed data
 *
 * 公司信息表（备用），种子数据从 seeds/document_branding.json 同步
 */
migrate((app) => {
  // 1. Create collection (skip if already exists -> idempotent)
  try {
    var existingCol = app.findCollectionByNameOrId("company_info");
    if (!existingCol) {
      const collection = new Collection({
        name: "company_info",
        type: "base",
        system: false,
        fields: [
          { name: "company_name", type: "text", required: false, max: 500 },
          { name: "company_name_cn", type: "text", required: false, max: 500 },
          { name: "address", type: "text", required: false, max: 1000 },
          { name: "email", type: "text", required: false, max: 200 },
          { name: "phone", type: "text", required: false, max: 100 },
          { name: "website", type: "text", required: false, max: 200 },
        ],
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
      });
      app.save(collection);
      console.log("Created company_info collection");
    } else {
      console.log("company_info already exists, skipping creation.");
    }
  } catch(e) {
    console.log("company_info create error: " + e);
  }

  // 2. Seed document_branding (if empty)
  try {
    var existing = app.findRecordsByFilter("document_branding", "1=1");
    if (existing.length === 0) {
      app.save(new Record(app.findCollectionByNameOrId("document_branding"), {
        company_name: "ALUSTARS INTERNATIONAL CO., LTD",
        company_name_cn: "重庆星铝国际贸易有限公司",
        website_url: "www.alustars.com",
        vat: "91500109MADTT20C93",
        logo_base64: "",
        logo_url: "https://cowork-storage-public-cdn.lx.netease.com/lxbg/2025/07/18/54b05de1c8c249bc9fd0d8aae593593f.png",
        stamp_base64: "",
        signature_base64: "",
        logo_path: "/logo-alustars-naranja.png",
        stamp_path: "/stamp-alustars.png",
        primary_office: {
          name: "Chongqing Alustars International Co.,Ltd.",
          name_cn: "重庆星铝国际贸易有限公司",
          address: "No.194,Jiarui Avenue,Beibei District, 400707 Chongqing, China",
          address_cn: "重庆市北碚区蔡家岗镇嘉瑞大道194号14-1",
          phone: "+86 15923354664",
          email: "z.zela@alustars.com"
        },
        secondary_office: {
          name: "ALUSTARS INTERNATIONAL CO., LTD.",
          name_cn: "",
          address: "Valencia 264 Principal, 08007 Barcelona, Spain",
          address_cn: "西班牙巴塞罗那 Valencia 264 Principal, 08007",
          phone: "(+34) 607630594",
          email: "c.feliu@alustars.com"
        },
        default_signer: {
          name: "Carlos Feliu",
          name_cn: "Carlos Feliu",
          title: "VP of Business Development",
          title_cn: "副总裁"
        }
      }));
      console.log("Seeded document_branding with default data");
    }
  } catch(e) {
    console.log("Seed document_branding error: " + e);
  }

  // 3. Seed company_info (if empty)
  try {
    var existing = app.findRecordsByFilter("company_info", "1=1");
    if (existing.length === 0) {
      app.save(new Record(app.findCollectionByNameOrId("company_info"), {
        company_name: "ALUSTARS INTERNATIONAL CO., LTD",
        company_name_cn: "重庆星铝国际贸易有限公司",
        address: "No.194,Jiarui Avenue,Beibei District, 400707 Chongqing, China",
        email: "z.zela@alustars.com",
        phone: "+86 15923354664",
        website: "www.alustars.com"
      }));
      console.log("Seeded company_info with default data");
    }
  } catch(e) {
    console.log("Seed company_info error: " + e);
  }
}, (app) => {
  console.log("Rollback not implemented.");
});
