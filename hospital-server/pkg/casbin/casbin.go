package casbin

import (
	"github.com/casbin/casbin/v3"
	"github.com/casbin/casbin/v3/model"
	gormadapter "github.com/casbin/gorm-adapter/v3"
	"gorm.io/gorm"
)

const modelConf = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && keyMatch2(r.obj, p.obj) && r.act == p.act
`

func NewEnforcer(db *gorm.DB) (*casbin.Enforcer, error) {
	adapter, err := gormadapter.NewAdapterByDB(db)
	if err != nil {
		return nil, err
	}

	m, err := model.NewModelFromString(modelConf)
	if err != nil {
		return nil, err
	}

	e, err := casbin.NewEnforcer(m, adapter)
	if err != nil {
		return nil, err
	}

	if err := e.LoadPolicy(); err != nil {
		return nil, err
	}

	return e, nil
}

func SetupDefaultPolicies(e *casbin.Enforcer) error {
	policies := [][]string{
		{"admin", "/api/admin/*", "GET"},
		{"admin", "/api/admin/*", "POST"},
		{"admin", "/api/admin/*", "PUT"},
		{"admin", "/api/admin/*", "DELETE"},
	}

	for _, p := range policies {
		e.AddPolicy(p)
	}

	return e.SavePolicy()
}
