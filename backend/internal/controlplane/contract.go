// This file is copied from hoshi-admin's internal/controlplane/contract.go.
// The contract is defined there; change it there first and synchronise every
// managed service's copy (hoshi-admin docs/control-plane.md §6). Keeping the
// three files stdlib-only is what makes copying cheaper than a shared module.

// Package controlplane defines the Hoshi Control Plane Contract — the uniform
// protocol every managed Hoshivel service exposes so that hoshi-admin can
// configure and operate it without carrying service-specific UI code.
//
// A service mounts an Agent (agent.go) under /control/v1 and describes itself
// with a Descriptor: which settings it has, which collections can be edited and
// which one-shot operations can be invoked. hoshi-admin renders that descriptor
// into a console at runtime, so a service that grows a new setting needs no
// change in the admin platform at all.
//
// The wire types, the signing scheme (sign.go) and the agent (agent.go) are
// stdlib-only on purpose: they are copied verbatim into each managed service's
// own repository, which must not inherit dependencies from the admin platform.
// The client (client.go) is the admin-side caller and stays here.
package controlplane

// Version is the contract revision implemented by this package. A service
// reports the revision it speaks in Descriptor.Contract; hoshi-admin refuses to
// drive a service whose revision it does not understand.
const Version = 1

// BasePath is where an agent mounts inside the managed service.
const BasePath = "/control/v1"

// Field types understood by the console renderer. A service that emits an
// unknown type gets a read-only text box, never a broken form.
const (
	TypeString   = "string"   // single-line text
	TypeText     = "text"     // multi-line text
	TypeSecret   = "secret"   // write-only credential; never read back in the clear
	TypeInt      = "int"      // whole number
	TypeFloat    = "float"    // decimal number (coordinates, ratios)
	TypeBool     = "bool"     // checkbox
	TypeDuration = "duration" // Go duration string, e.g. "15m"
	TypeURL      = "url"      // absolute http(s) URL
	TypeEnum     = "enum"     // one of Field.Options
	TypeCSV      = "csv"      // comma-separated list, edited as one line per item
)

// Health statuses, worst-wins when hoshi-admin rolls several services up into
// one platform-wide indicator.
const (
	StatusOK       = "ok"
	StatusDegraded = "degraded"
	StatusDown     = "down"
	// StatusUnreachable is never sent by a service — hoshi-admin records it when
	// the service could not be contacted at all.
	StatusUnreachable = "unreachable"
)

// Resource operations.
const (
	OpCreate = "create"
	OpUpdate = "update"
	OpDelete = "delete"
)

// Descriptor is a service's self-description: everything hoshi-admin needs to
// render its console page.
type Descriptor struct {
	Service   string     `json:"service"`  // stable slug, e.g. "hoshi-id"
	Name      string     `json:"name"`     // display name, e.g. "Hoshi ID"
	Version   string     `json:"version"`  // service build version
	Contract  int        `json:"contract"` // contract revision (Version)
	Summary   string     `json:"summary,omitempty"`
	Sections  []Section  `json:"sections,omitempty"`
	Resources []Resource `json:"resources,omitempty"`
	Actions   []Action   `json:"actions,omitempty"`
}

// Section groups related settings on the console's configuration tab.
type Section struct {
	ID     string  `json:"id"`
	Title  string  `json:"title"`
	Help   string  `json:"help,omitempty"`
	Fields []Field `json:"fields"`
}

// Field describes one setting. Keys are namespaced by their section
// ("identity.session_ttl") and that namespaced form is what appears in
// ConfigDoc.Values.
type Field struct {
	Key         string   `json:"key"`
	Label       string   `json:"label"`
	Type        string   `json:"type"`
	Help        string   `json:"help,omitempty"`
	Options     []Option `json:"options,omitempty"`
	Placeholder string   `json:"placeholder,omitempty"`
	Required    bool     `json:"required,omitempty"`
	// ReadOnly fields are shown but never submitted — for values that are
	// deployment-level (env vars, flags) and cannot be changed at runtime.
	ReadOnly bool `json:"readOnly,omitempty"`
	Min      *int `json:"min,omitempty"`
	Max      *int `json:"max,omitempty"`
}

// Option is one choice of a TypeEnum field.
type Option struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// Resource is an editable collection — OAuth clients, routing nodes, accounts.
type Resource struct {
	ID      string   `json:"id"`
	Title   string   `json:"title"`
	Help    string   `json:"help,omitempty"`
	Columns []Column `json:"columns"`
	// Fields are the editor form for a row. A field whose key is absent from
	// Columns is edit-only (secrets, for instance).
	Fields []Field `json:"fields"`
	// Ops lists the permitted operations (OpCreate/OpUpdate/OpDelete). An empty
	// Ops makes the collection read-only.
	Ops []string `json:"ops,omitempty"`
	// Searchable advertises that ResourceList honours Query.Q.
	Searchable bool `json:"searchable,omitempty"`
}

// Column is one cell in a resource's table view.
type Column struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	Type  string `json:"type,omitempty"`
}

// Action is a one-shot operation: revoke sessions, re-probe nodes, broadcast.
type Action struct {
	ID     string  `json:"id"`
	Title  string  `json:"title"`
	Help   string  `json:"help,omitempty"`
	Fields []Field `json:"fields,omitempty"`
	// Danger renders the trigger destructively and, with Confirm, requires the
	// operator to acknowledge before the call is made.
	Danger  bool   `json:"danger,omitempty"`
	Confirm string `json:"confirm,omitempty"`
}

// Health is the service's own view of its condition.
type Health struct {
	Status  string   `json:"status"`
	Message string   `json:"message,omitempty"`
	Checks  []Check  `json:"checks,omitempty"`
	Metrics []Metric `json:"metrics,omitempty"`
}

// Check is one named sub-system probe (database, cache, upstream…).
type Check struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	Status string `json:"status"`
	Detail string `json:"detail,omitempty"`
}

// Metric is a headline number for the dashboard. Values are pre-formatted by
// the service so the console never has to know a metric's unit.
type Metric struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Value string `json:"value"`
}

// ConfigDoc is the current configuration. Revision is an opaque token used for
// optimistic concurrency: a ConfigPatch carrying a stale revision is rejected
// with 409 rather than silently overwriting another operator's edit.
type ConfigDoc struct {
	Revision string         `json:"revision"`
	Values   map[string]any `json:"values"`
}

// ConfigPatch updates a subset of settings. Only the keys present are touched.
type ConfigPatch struct {
	Revision string         `json:"revision"`
	Values   map[string]any `json:"values"`
}

// ConfigResult is the post-apply state, so the console can refresh without a
// second round trip.
type ConfigResult struct {
	Revision string         `json:"revision"`
	Values   map[string]any `json:"values"`
	Applied  []string       `json:"applied,omitempty"`
	Message  string         `json:"message,omitempty"`
}

// Query narrows a resource listing.
type Query struct {
	Q      string `json:"q,omitempty"`
	Cursor string `json:"cursor,omitempty"`
	Limit  int    `json:"limit,omitempty"`
}

// Row is one record of a resource.
type Row struct {
	ID     string         `json:"id"`
	Values map[string]any `json:"values"`
}

// ResourcePage is a listing response. Next is an opaque cursor; empty means the
// listing is complete.
type ResourcePage struct {
	Rows  []Row  `json:"rows"`
	Next  string `json:"next,omitempty"`
	Total int    `json:"total,omitempty"`
}

// ResourceOp mutates a resource.
type ResourceOp struct {
	Op     string         `json:"op"`
	ID     string         `json:"id,omitempty"`
	Values map[string]any `json:"values,omitempty"`
}

// ResourceResult reports the outcome. Row carries the stored record so the
// console can show server-assigned fields (generated IDs, one-time secrets).
type ResourceResult struct {
	OK      bool   `json:"ok"`
	Row     *Row   `json:"row,omitempty"`
	Message string `json:"message,omitempty"`
}

// ActionRequest carries an action's form values.
type ActionRequest struct {
	Values map[string]any `json:"values,omitempty"`
}

// ActionResult reports an action's outcome. Data is free-form detail the
// console renders as a key/value block.
type ActionResult struct {
	OK      bool           `json:"ok"`
	Message string         `json:"message,omitempty"`
	Data    map[string]any `json:"data,omitempty"`
}

// ErrorBody is the error envelope for every non-2xx control-plane response.
type ErrorBody struct {
	Error string `json:"error"`
	// FieldErrors maps a Field.Key to a per-field message so the console can
	// mark the offending input instead of showing one opaque banner.
	FieldErrors map[string]string `json:"fieldErrors,omitempty"`
}
