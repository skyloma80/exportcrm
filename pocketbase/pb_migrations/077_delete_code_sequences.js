/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 077: Delete code_sequences collection
 *
 * 不再使用独立的 code_sequences 集合维护编号。
 * 现在通过 `lib/services/code-generator.ts` 工具类查询对应集合中
 * 当前年份/月份的最大 code + 1 生成新编号。
 * 用户也可以手动指定 code，只需保证唯一性。
 */
migrate((app) => {
  try {
    const col = app.findCollectionByNameOrId("code_sequences");
    if (col) {
      app.delete(col);
      console.log("Deleted code_sequences collection");
    }
  } catch (e) {
    console.log("code_sequences collection not found, skipping");
  }
}, (app) => {
  console.log("Rollback not implemented for migration 077");
});
