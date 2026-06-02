/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("so");
  if (!collection) {
    return;
  }

  // 检查字段是否已存在
  const existingField = collection.fields.getByName("project_id");
  if (existingField) {
    return;
  }

  // 获取 projects 集合的 ID
  const projectsCollection = app.findCollectionByNameOrId("projects");
  if (!projectsCollection) {
    return;
  }

  // 严格按照 051 号脚本的成功语法添加字段
  collection.fields.add(new Field({
    name: "project_id",
    type: "relation",
    required: false,
    collectionId: projectsCollection.id,
    cascadeDelete: false,
    maxSelect: 1
  }));

  return app.save(collection);
}, (app) => {
  // 回滚逻辑
  const collection = app.findCollectionByNameOrId("so");
  if (collection) {
    const field = collection.fields.getByName("project_id");
    if (field) {
      collection.fields.removeById(field.id);
      return app.save(collection);
    }
  }
});
