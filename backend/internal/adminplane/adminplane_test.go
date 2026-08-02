package adminplane_test

import (
	"context"
	"errors"
	"path/filepath"
	"testing"

	"github.com/hoshivel/hoshi-sdk/go/controlplane"
	"github.com/hoshivel/sr-web/backend/internal/adminplane"
	"github.com/hoshivel/sr-web/backend/internal/config"
	"github.com/hoshivel/sr-web/backend/internal/play"
)

// fakeRouter stands in for the probe loop so the tests are deterministic and
// never touch the network.
type fakeRouter struct {
	snapshot play.Response
	reprobes int
}

func (f *fakeRouter) Snapshot() play.Response { return f.snapshot }
func (f *fakeRouter) Reprobe()                { f.reprobes++ }

func newAdapter(t *testing.T, regions []config.Region, snap play.Response) (*adminplane.Adapter, *config.Store, *fakeRouter) {
	t.Helper()
	file := config.File{
		Listen:               config.Listen{Port: 8090},
		ProbeIntervalSeconds: 10,
		ProbeTimeoutSeconds:  3,
		MaxCandidates:        3,
		Regions:              regions,
	}
	store := config.NewStore(file, filepath.Join(t.TempDir(), "config.json"))
	rt := &fakeRouter{snapshot: snap}
	return adminplane.New(store, rt, "test", nil), store, rt
}

func TestDescriptorIsRenderable(t *testing.T) {
	adapter, _, _ := newAdapter(t, nil, play.Response{})
	desc, err := adapter.Descriptor(context.Background())
	if err != nil {
		t.Fatalf("Descriptor: %v", err)
	}
	if desc.Service != "sr-web" {
		t.Fatalf("service = %q", desc.Service)
	}
	known := map[string]bool{
		controlplane.TypeString: true, controlplane.TypeText: true, controlplane.TypeSecret: true,
		controlplane.TypeInt: true, controlplane.TypeFloat: true, controlplane.TypeBool: true,
		controlplane.TypeDuration: true, controlplane.TypeURL: true, controlplane.TypeEnum: true,
		controlplane.TypeCSV: true,
	}
	for _, section := range desc.Sections {
		for _, f := range section.Fields {
			if f.Key == "" || f.Label == "" || !known[f.Type] {
				t.Fatalf("section %s: unrenderable field %+v", section.ID, f)
			}
		}
	}
	for _, resource := range desc.Resources {
		if len(resource.Columns) == 0 || len(resource.Fields) == 0 {
			t.Fatalf("resource %s cannot be rendered: %+v", resource.ID, resource)
		}
	}
}

func TestConfigRoundTripAndValidation(t *testing.T) {
	adapter, store, _ := newAdapter(t, nil, play.Response{})
	ctx := context.Background()

	doc, err := adapter.ConfigGet(ctx)
	if err != nil {
		t.Fatalf("ConfigGet: %v", err)
	}
	if doc.Values[adminplane.KeyMaxCandidates] != 3 {
		t.Fatalf("maxCandidates = %v, want 3", doc.Values[adminplane.KeyMaxCandidates])
	}

	res, err := adapter.ConfigPut(ctx, controlplane.ConfigPatch{
		Revision: doc.Revision,
		Values: map[string]any{
			adminplane.KeyMaxCandidates:  float64(5), // JSON numbers decode as float64
			adminplane.KeyAllowedOrigins: []any{"https://sr.hoshivel.com"},
		},
	})
	if err != nil {
		t.Fatalf("ConfigPut: %v", err)
	}
	if res.Values[adminplane.KeyMaxCandidates] != 5 {
		t.Fatalf("maxCandidates not applied: %+v", res.Values)
	}
	if got := store.MaxCandidates(); got != 5 {
		t.Fatalf("store.MaxCandidates = %d, want 5", got)
	}
	if origins := store.AllowedOrigins(); len(origins) != 1 || origins[0] != "https://sr.hoshivel.com" {
		t.Fatalf("allowed origins not applied: %v", origins)
	}

	// A replayed patch must be rejected rather than overwriting a change made in
	// between by someone else.
	if _, err := adapter.ConfigPut(ctx, controlplane.ConfigPatch{
		Revision: doc.Revision, Values: map[string]any{adminplane.KeyMaxCandidates: float64(9)},
	}); !errors.Is(err, controlplane.ErrConflict) {
		t.Fatalf("stale revision accepted: %v", err)
	}

	var ve *controlplane.ValidationError
	bad := map[string]any{
		adminplane.KeyMaxCandidates:     float64(0),         // below the minimum
		adminplane.KeyProbeInterval:     float64(1.5),       // not an integer
		adminplane.KeyAllowedOrigins:    []any{"not-a-url"}, // not an origin
		"dispatch.unknown":              "x",                // unknown key
		adminplane.KeyTrustProxyHeaders: "yes",              // wrong type
	}
	for key, value := range bad {
		if _, err := adapter.ConfigPut(ctx, controlplane.ConfigPatch{
			Values: map[string]any{key: value},
		}); !errors.As(err, &ve) {
			t.Fatalf("invalid %s=%v accepted: %v", key, value, err)
		}
	}
}

// TestConfigPutPreservesUnpatchedGeoOverrides guards the trap in UpdateSettings:
// it replaces the whole settings block, so a patch that only touches one geo
// field must not wipe the country-centroid overrides an operator configured by
// hand in config.json.
func TestConfigPutPreservesUnpatchedGeoOverrides(t *testing.T) {
	file := config.File{
		Listen: config.Listen{Port: 8090}, ProbeIntervalSeconds: 10,
		ProbeTimeoutSeconds: 3, MaxCandidates: 3,
		Geo: config.GeoConfig{
			CountryCoords: map[string][2]float64{"TW": {23.7, 120.9}},
		},
	}
	store := config.NewStore(file, filepath.Join(t.TempDir(), "config.json"))
	adapter := adminplane.New(store, &fakeRouter{}, "test", nil)

	if _, err := adapter.ConfigPut(context.Background(), controlplane.ConfigPatch{
		Values: map[string]any{adminplane.KeyTrustProxyHeaders: true},
	}); err != nil {
		t.Fatalf("ConfigPut: %v", err)
	}
	coords := store.Settings().Geo.CountryCoords
	if len(coords) != 1 || coords["TW"] != [2]float64{23.7, 120.9} {
		t.Fatalf("country overrides lost by an unrelated patch: %v", coords)
	}
	if !store.Settings().Geo.TrustProxyHeaders {
		t.Fatal("the patched field was not applied")
	}
}

func TestRegionLifecycle(t *testing.T) {
	adapter, store, _ := newAdapter(t, nil, play.Response{})
	ctx := context.Background()

	create := controlplane.ResourceOp{Op: controlplane.OpCreate, ID: "tw1", Values: map[string]any{
		"id": "tw1", "host": "tw1.svc.hoshivel.com", "url": "https://tw1.svc.hoshivel.com/",
		"lat": 25.03, "lon": 121.56, "country": "tw",
	}}
	if _, err := adapter.ResourceApply(ctx, "regions", create); err != nil {
		t.Fatalf("create region: %v", err)
	}
	regions := store.Regions()
	if len(regions) != 1 || regions[0].ID != "tw1" || regions[0].Country != "TW" {
		t.Fatalf("region not stored (country should be upper-cased): %+v", regions)
	}
	if regions[0].Lat != 25.03 {
		t.Fatalf("latitude lost: %v", regions[0].Lat)
	}

	// Creating the same id twice must be refused, not silently overwrite.
	if _, err := adapter.ResourceApply(ctx, "regions", create); err == nil {
		t.Fatal("duplicate region id accepted")
	}

	update := controlplane.ResourceOp{Op: controlplane.OpUpdate, ID: "tw1", Values: map[string]any{
		// A body naming a different node must not be able to edit that one.
		"id": "hk1", "host": "tw1.svc.hoshivel.com", "url": "https://tw1.svc.hoshivel.com/play",
		"disabled": true,
	}}
	if _, err := adapter.ResourceApply(ctx, "regions", update); err != nil {
		t.Fatalf("update region: %v", err)
	}
	regions = store.Regions()
	if len(regions) != 1 || regions[0].ID != "tw1" || !regions[0].Disabled {
		t.Fatalf("update went to the wrong record: %+v", regions)
	}

	if _, err := adapter.ResourceApply(ctx, "regions",
		controlplane.ResourceOp{Op: controlplane.OpDelete, ID: "tw1"}); err != nil {
		t.Fatalf("delete region: %v", err)
	}
	if len(store.Regions()) != 0 {
		t.Fatalf("region survived deletion: %+v", store.Regions())
	}
}

func TestRegionValidation(t *testing.T) {
	adapter, _, _ := newAdapter(t, nil, play.Response{})
	ctx := context.Background()

	cases := map[string]struct {
		values map[string]any
		field  string
	}{
		"no id":         {map[string]any{"host": "h", "url": "https://h/"}, "id"},
		"id with slash": {map[string]any{"id": "a/b", "host": "h", "url": "https://h/"}, "id"},
		"no host":       {map[string]any{"id": "a", "url": "https://h/"}, "host"},
		"relative url":  {map[string]any{"id": "a", "host": "h", "url": "/play"}, "url"},
		"bad health url": {map[string]any{
			"id": "a", "host": "h", "url": "https://h/", "health_url": "healthz",
		}, "health_url"},
		"latitude out of range": {map[string]any{
			"id": "a", "host": "h", "url": "https://h/", "lat": 120.0,
		}, "lat"},
		"longitude out of range": {map[string]any{
			"id": "a", "host": "h", "url": "https://h/", "lon": -200.0,
		}, "lon"},
		"bad country": {map[string]any{
			"id": "a", "host": "h", "url": "https://h/", "country": "TWN",
		}, "country"},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := adapter.ResourceApply(ctx, "regions",
				controlplane.ResourceOp{Op: controlplane.OpCreate, ID: "a", Values: tc.values})
			var ve *controlplane.ValidationError
			if !errors.As(err, &ve) {
				t.Fatalf("invalid region accepted: %v", err)
			}
			if ve.Fields[tc.field] == "" {
				t.Fatalf("error not attributed to %s: %+v", tc.field, ve.Fields)
			}
		})
	}
}

func TestResourceListMergesLiveProbeResults(t *testing.T) {
	regions := []config.Region{
		{ID: "hk1", Host: "hk1.svc.hoshivel.com", URL: "https://hk1/"},
		{ID: "jp1", Host: "jp1.svc.hoshivel.com", URL: "https://jp1/", Disabled: true},
	}
	snap := play.Response{Regions: []play.Region{
		{ID: "hk1", Host: "hk1.svc.hoshivel.com", Healthy: true, LatencyMS: 42},
	}}
	adapter, _, _ := newAdapter(t, regions, snap)

	page, err := adapter.ResourceList(context.Background(), "regions", controlplane.Query{})
	if err != nil || len(page.Rows) != 2 {
		t.Fatalf("ResourceList = %+v, err = %v", page, err)
	}
	byID := map[string]map[string]any{}
	for _, row := range page.Rows {
		byID[row.ID] = row.Values
	}
	// The configured node and its live probe result belong on the same row —
	// that is the whole point of an operator opening this table.
	if byID["hk1"]["healthy"] != "健康" || byID["hk1"]["latency_ms"] != 42 {
		t.Fatalf("live probe result not merged: %+v", byID["hk1"])
	}
	// A disabled node is not probed, so it must read as disabled rather than
	// as a node that failed its health check.
	if byID["jp1"]["healthy"] != "已停用" {
		t.Fatalf("disabled node shown as %v", byID["jp1"]["healthy"])
	}
}

func TestHealthReflectsProbeState(t *testing.T) {
	ctx := context.Background()

	t.Run("all healthy", func(t *testing.T) {
		adapter, _, _ := newAdapter(t, nil, play.Response{
			Regions:       []play.Region{{ID: "hk1", Healthy: true, LatencyMS: 30}},
			RecommendedID: "hk1",
		})
		h, _ := adapter.Health(ctx)
		if h.Status != controlplane.StatusOK {
			t.Fatalf("status = %q, want ok", h.Status)
		}
	})

	t.Run("some unreachable", func(t *testing.T) {
		adapter, _, _ := newAdapter(t, nil, play.Response{Regions: []play.Region{
			{ID: "hk1", Healthy: true, LatencyMS: 30}, {ID: "jp1"},
		}})
		h, _ := adapter.Health(ctx)
		if h.Status != controlplane.StatusDegraded {
			t.Fatalf("status = %q, want degraded", h.Status)
		}
	})

	t.Run("none healthy", func(t *testing.T) {
		adapter, _, _ := newAdapter(t, nil, play.Response{Regions: []play.Region{{ID: "hk1"}}})
		h, _ := adapter.Health(ctx)
		if h.Status != controlplane.StatusDown {
			t.Fatalf("status = %q, want down", h.Status)
		}
	})

	t.Run("no regions at all", func(t *testing.T) {
		// Nothing to probe is not "fine": a player pressing Play has nowhere to go.
		adapter, _, _ := newAdapter(t, nil, play.Response{})
		h, _ := adapter.Health(ctx)
		if h.Status != controlplane.StatusDown {
			t.Fatalf("status = %q, want down when no node is configured", h.Status)
		}
	})
}

func TestReprobeAction(t *testing.T) {
	adapter, _, rt := newAdapter(t, nil, play.Response{
		Regions: []play.Region{{ID: "hk1", Healthy: true}}, RecommendedID: "hk1",
	})
	res, err := adapter.Action(context.Background(), "reprobe", controlplane.ActionRequest{})
	if err != nil || !res.OK {
		t.Fatalf("reprobe: %+v, err = %v", res, err)
	}
	if rt.reprobes != 1 {
		t.Fatalf("router.Reprobe called %d times, want 1", rt.reprobes)
	}
	if _, err := adapter.Action(context.Background(), "nope", controlplane.ActionRequest{}); !errors.Is(err, controlplane.ErrNotFound) {
		t.Fatalf("unknown action: %v", err)
	}
	if _, err := adapter.ResourceList(context.Background(), "nope", controlplane.Query{}); !errors.Is(err, controlplane.ErrNotFound) {
		t.Fatalf("unknown resource: %v", err)
	}
}
