// This file is copied from hoshi-admin's internal/controlplane/agent.go.
// The contract is defined there; change it there first and synchronise every
// managed service's copy (hoshi-admin docs/control-plane.md §6). Keeping the
// three files stdlib-only is what makes copying cheaper than a shared module.

package controlplane

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
)

// Agent is the service side of the contract: a managed service fills in the
// Handlers it supports and mounts Agent.Handler() under BasePath. Handlers left
// nil are reported as unsupported (405) rather than crashing, so a service can
// adopt the contract incrementally — health first, configuration later.

// MaxBodyBytes caps an inbound control-plane request body. The contract carries
// settings and small records, never uploads.
const MaxBodyBytes = 1 << 20

// Sentinel errors a Handlers implementation returns to select a status code.
var (
	// ErrNotFound → 404. Unknown resource id, unknown action, missing row.
	ErrNotFound = errors.New("controlplane: not found")
	// ErrConflict → 409. A ConfigPatch carrying a stale revision.
	ErrConflict = errors.New("controlplane: revision is stale, reload and retry")
	// ErrUnsupported → 405. The service does not implement this capability.
	ErrUnsupported = errors.New("controlplane: capability not supported")
)

// ValidationError → 400 with per-field messages. Returning it from ConfigPut,
// ResourceApply or Action lets the console mark the offending inputs.
type ValidationError struct {
	Message string
	Fields  map[string]string
}

func (e *ValidationError) Error() string {
	if e.Message != "" {
		return e.Message
	}
	return "controlplane: invalid input"
}

// Invalid builds a single-field ValidationError.
func Invalid(key, msg string) *ValidationError {
	return &ValidationError{Message: msg, Fields: map[string]string{key: msg}}
}

// Handlers is the set of capabilities a service exposes. Descriptor and Health
// are effectively mandatory: without them hoshi-admin cannot render a page for
// the service or report whether it is up.
type Handlers struct {
	Descriptor    func(ctx context.Context) (Descriptor, error)
	Health        func(ctx context.Context) (Health, error)
	ConfigGet     func(ctx context.Context) (ConfigDoc, error)
	ConfigPut     func(ctx context.Context, patch ConfigPatch) (ConfigResult, error)
	ResourceList  func(ctx context.Context, resource string, q Query) (ResourcePage, error)
	ResourceApply func(ctx context.Context, resource string, op ResourceOp) (ResourceResult, error)
	Action        func(ctx context.Context, action string, req ActionRequest) (ActionResult, error)
}

// Agent authenticates and dispatches control-plane requests.
type Agent struct {
	verifier *Verifier
	handlers Handlers
	// OnAudit, when set, is called after every mutating request that reached a
	// handler. Services use it to record who changed what in their own log, so
	// a change is traceable from the service side even if the admin platform is
	// unavailable. actor is the signing key id.
	OnAudit func(ctx context.Context, actor, action, detail string)
}

// NewAgent builds an agent. keys maps signing key id → shared secret; the admin
// platform is normally the only entry.
func NewAgent(keys map[string]string, h Handlers) (*Agent, error) {
	v, err := NewVerifier(keys)
	if err != nil {
		return nil, err
	}
	return &Agent{verifier: v, handlers: h}, nil
}

// Handler returns the routes for the contract. Mount it on the service's admin
// (or internal) listener:
//
//	mux.Handle(controlplane.BasePath+"/", agent.Handler())
func (a *Agent) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET "+BasePath+"/descriptor", a.wrap(a.descriptor))
	mux.HandleFunc("GET "+BasePath+"/health", a.wrap(a.health))
	mux.HandleFunc("GET "+BasePath+"/config", a.wrap(a.configGet))
	mux.HandleFunc("PUT "+BasePath+"/config", a.wrap(a.configPut))
	mux.HandleFunc("GET "+BasePath+"/resources/{id}", a.wrap(a.resourceList))
	mux.HandleFunc("POST "+BasePath+"/resources/{id}", a.wrap(a.resourceApply))
	mux.HandleFunc("POST "+BasePath+"/actions/{id}", a.wrap(a.action))
	return mux
}

// signedRequest carries the verified request through to a route handler.
type signedRequest struct {
	r     *http.Request
	body  []byte
	actor string
}

// wrap reads and authenticates the request before the route handler runs. Every
// control-plane route is authenticated — there is no unauthenticated discovery
// endpoint, because the descriptor itself reveals the shape of a service's
// configuration.
func (a *Agent) wrap(fn func(http.ResponseWriter, signedRequest) (any, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaxBodyBytes))
		if err != nil {
			writeError(w, http.StatusRequestEntityTooLarge, &ErrorBody{Error: "request body too large"})
			return
		}
		actor, err := a.verifier.Verify(r, body)
		if err != nil {
			// Deliberately uniform: distinguishing "unknown key" from "bad
			// signature" would let a caller probe which key ids exist.
			writeError(w, http.StatusUnauthorized, &ErrorBody{Error: "unauthorized"})
			return
		}
		out, err := fn(w, signedRequest{r: r, body: body, actor: actor})
		if err != nil {
			writeHandlerError(w, err)
			return
		}
		if out == nil {
			return // the handler already wrote its response
		}
		writeJSON(w, http.StatusOK, out)
	}
}

func (a *Agent) descriptor(_ http.ResponseWriter, req signedRequest) (any, error) {
	if a.handlers.Descriptor == nil {
		return nil, ErrUnsupported
	}
	d, err := a.handlers.Descriptor(req.r.Context())
	if err != nil {
		return nil, err
	}
	d.Contract = Version
	return d, nil
}

func (a *Agent) health(_ http.ResponseWriter, req signedRequest) (any, error) {
	if a.handlers.Health == nil {
		return nil, ErrUnsupported
	}
	return a.handlers.Health(req.r.Context())
}

func (a *Agent) configGet(_ http.ResponseWriter, req signedRequest) (any, error) {
	if a.handlers.ConfigGet == nil {
		return nil, ErrUnsupported
	}
	return a.handlers.ConfigGet(req.r.Context())
}

func (a *Agent) configPut(_ http.ResponseWriter, req signedRequest) (any, error) {
	if a.handlers.ConfigPut == nil {
		return nil, ErrUnsupported
	}
	var patch ConfigPatch
	if err := decode(req.body, &patch); err != nil {
		return nil, err
	}
	res, err := a.handlers.ConfigPut(req.r.Context(), patch)
	if err != nil {
		return nil, err
	}
	a.audit(req, "config.update", strings.Join(res.Applied, ","))
	return res, nil
}

func (a *Agent) resourceList(_ http.ResponseWriter, req signedRequest) (any, error) {
	if a.handlers.ResourceList == nil {
		return nil, ErrUnsupported
	}
	q := req.r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	return a.handlers.ResourceList(req.r.Context(), req.r.PathValue("id"), Query{
		Q:      q.Get("q"),
		Cursor: q.Get("cursor"),
		Limit:  limit,
	})
}

func (a *Agent) resourceApply(_ http.ResponseWriter, req signedRequest) (any, error) {
	if a.handlers.ResourceApply == nil {
		return nil, ErrUnsupported
	}
	var op ResourceOp
	if err := decode(req.body, &op); err != nil {
		return nil, err
	}
	switch op.Op {
	case OpCreate, OpUpdate, OpDelete:
	default:
		return nil, Invalid("op", "op must be create, update or delete")
	}
	resource := req.r.PathValue("id")
	res, err := a.handlers.ResourceApply(req.r.Context(), resource, op)
	if err != nil {
		return nil, err
	}
	a.audit(req, "resource."+op.Op, resource+"/"+op.ID)
	return res, nil
}

func (a *Agent) action(_ http.ResponseWriter, req signedRequest) (any, error) {
	if a.handlers.Action == nil {
		return nil, ErrUnsupported
	}
	var in ActionRequest
	// An action with no fields is legitimately sent with an empty body.
	if len(req.body) > 0 {
		if err := decode(req.body, &in); err != nil {
			return nil, err
		}
	}
	id := req.r.PathValue("id")
	res, err := a.handlers.Action(req.r.Context(), id, in)
	if err != nil {
		return nil, err
	}
	a.audit(req, "action."+id, res.Message)
	return res, nil
}

func (a *Agent) audit(req signedRequest, action, detail string) {
	if a.OnAudit != nil {
		a.OnAudit(req.r.Context(), req.actor, action, detail)
	}
}

func decode(body []byte, dst any) error {
	dec := json.NewDecoder(strings.NewReader(string(body)))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return &ValidationError{Message: fmt.Sprintf("malformed request body: %v", err)}
	}
	return nil
}

func writeHandlerError(w http.ResponseWriter, err error) {
	var ve *ValidationError
	switch {
	case errors.As(err, &ve):
		writeError(w, http.StatusBadRequest, &ErrorBody{Error: ve.Error(), FieldErrors: ve.Fields})
	case errors.Is(err, ErrNotFound):
		writeError(w, http.StatusNotFound, &ErrorBody{Error: err.Error()})
	case errors.Is(err, ErrConflict):
		writeError(w, http.StatusConflict, &ErrorBody{Error: err.Error()})
	case errors.Is(err, ErrUnsupported):
		writeError(w, http.StatusMethodNotAllowed, &ErrorBody{Error: err.Error()})
	default:
		writeError(w, http.StatusInternalServerError, &ErrorBody{Error: err.Error()})
	}
}

func writeError(w http.ResponseWriter, status int, body *ErrorBody) {
	writeJSON(w, status, body)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
