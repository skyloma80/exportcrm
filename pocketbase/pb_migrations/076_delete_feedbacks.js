/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 076: Delete feedbacks collection
 *
 * 用户反馈改为通过 skills 和邮件处理，不再持久化到数据库。
 */
migrate((app) => {
  try {
    const col = app.findCollectionByNameOrId("feedbacks");
    if (col) {
      app.delete(col);
      console.log("Deleted feedbacks collection");
    }
  } catch (e) {
    console.log("feedbacks collection not found, skipping");
  }
}, (app) => {
  console.log("Rollback not implemented for migration 076");
});
