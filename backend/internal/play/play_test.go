package play

import "testing"

func TestRecommend(t *testing.T) {
	cases := []struct {
		name    string
		regions []Region
		want    string
	}{
		{
			name: "healthy beats unhealthy even at higher latency",
			regions: []Region{
				{ID: "a", Healthy: false, LatencyMS: 10},
				{ID: "b", Healthy: true, LatencyMS: 90},
			},
			want: "b",
		},
		{
			name: "lowest latency among healthy",
			regions: []Region{
				{ID: "a", Healthy: true, LatencyMS: 80},
				{ID: "b", Healthy: true, LatencyMS: 40},
				{ID: "c", Healthy: true, LatencyMS: 60},
			},
			want: "b",
		},
		{
			name: "load breaks a latency tie",
			regions: []Region{
				{ID: "a", Healthy: true, LatencyMS: 50, Load: 0.9},
				{ID: "b", Healthy: true, LatencyMS: 50, Load: 0.2},
			},
			want: "b",
		},
		{
			name: "all unhealthy falls back to lowest latency",
			regions: []Region{
				{ID: "a", Healthy: false, LatencyMS: 120},
				{ID: "b", Healthy: false, LatencyMS: 70},
			},
			want: "b",
		},
		{
			name:    "empty yields no recommendation",
			regions: nil,
			want:    "",
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := Recommend(c.regions); got != c.want {
				t.Errorf("Recommend() = %q, want %q", got, c.want)
			}
		})
	}
}
