package business

import (
	"db/mgo"
	"fmt"
)

type BusinessConfig struct {
	mgo.BaseModel `bson:",inline"`
	General       GeneralConfig `bson:"general" json:"general"`
}

func (c BusinessConfig) String() string {
	return fmt.Sprintf("business=[%s]", c.General)
}

func (c *BusinessConfig) Check() {
	c.General.Check()
}
