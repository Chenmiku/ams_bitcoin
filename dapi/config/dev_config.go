package config

import (
	"fmt"
)

type DevConfig struct {
	CPUProfile string
}

func (dc DevConfig) String() string {
	return fmt.Sprintf("dev:cpu=%s", dc.CPUProfile)
}
