// migrations/030_create_customer_tracking_collection.go
package migrations

import (
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/daos"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/models"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(db dbx.Builder) error {
		dao := daos.New(db)

		collection, err := dao.FindCollectionByNameOrId("customers")
		if err != nil {
			return err
		}

		// 创建 customer_tracking 集合
		customerTrackingCollection := &models.Collection{}
		customerTrackingCollection.Id = ""
		customerTrackingCollection.Name = "customer_tracking"
		customerTrackingCollection.Type = models.CollectionTypeBase
		customerTrackingCollection.System = false
		customerTrackingCollection.Schema = schema.NewSchema(
			schema.NewTextField("customer_id", "Customer ID", true, false, false),
			schema.NewSelectField("status", "Status", false, false, []string{"Active", "Lead", "Follow-up", "Onboarded"}, "Lead", nil),
			schema.NewSelectField("priority", "Priority", false, false, []string{"Low", "Medium", "High"}, "Medium", nil),
			schema.NewSelectField("contact_status", "Contact Status", false, false, []string{"Contacted", "Replied", "No Reply"}, "Contacted", nil),
			schema.NewSelectField("next_action_icon", "Next Action Icon", false, false, []string{"event", "schedule", "warning", "check_circle", "calendar", "clock", "alert_triangle", "check"}, "calendar", nil),
			schema.NewTextField("next_action_text", "Next Action Text", false, false, false),
			schema.NewTextField("next_step_action", "Next Step Action", false, false, false),
			schema.NewDateField("next_step_date", "Next Step Date", false, false, "", types.DateMax, types.DateMin),
			schema.NewTextField("notes", "Notes", false, false, true),
		)
		customerTrackingCollection.ListRule = types.Pointer("")
		customerTrackingCollection.ViewRule = types.Pointer("")
		customerTrackingCollection.CreateRule = types.Pointer("")
		customerTrackingCollection.UpdateRule = types.Pointer("")
		customerTrackingCollection.DeleteRule = types.Pointer("")
		customerTrackingCollection.Options = types.ModelOptions{
			IntervalBetweenCreations: 0,
			AllowUsernameLogin:       false,
			RequireEmailConfirmation: false,
		}

		return dao.SaveCollection(customerTrackingCollection)
	}, func(db dbx.Builder) error {
		dao := daos.New(db)

		err := dao.DeleteCollection("customer_tracking")
		if err != nil {
			return err
		}

		return nil
	})
}