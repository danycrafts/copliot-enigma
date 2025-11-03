package activity

import "time"

// Event captures a desktop activity observation.
type Event struct {
	ID          string  `json:"id"`
	Category    string  `json:"category"`
	Description string  `json:"description"`
	Timestamp   string  `json:"timestamp"`
	Confidence  float64 `json:"confidence"`
}

// SampleFeed provides deterministic data suitable for UI prototypes.
func SampleFeed(now time.Time) []Event {
	return []Event{
		{
			ID:          "evt-001",
			Category:    "Research",
			Description: "Visited project documentation and reviewed integration notes.",
			Timestamp:   now.Add(-10 * time.Minute).Format(time.RFC3339Nano),
			Confidence:  0.92,
		},
		{
			ID:          "evt-002",
			Category:    "Coding",
			Description: "Edited frontend settings form and saved configuration.",
			Timestamp:   now.Add(-25 * time.Minute).Format(time.RFC3339Nano),
			Confidence:  0.88,
		},
		{
			ID:          "evt-003",
			Category:    "Communication",
			Description: "Composed status update email to product stakeholders.",
			Timestamp:   now.Add(-55 * time.Minute).Format(time.RFC3339Nano),
			Confidence:  0.79,
		},
	}
}
