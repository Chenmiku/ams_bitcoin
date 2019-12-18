package math

import (
	"testing"
)

func TestRandString(t *testing.T) {
	list := map[string]bool{}
	count := 1 << 24
	maker := RandStringMaker{Prefix: "v", Length: 20}
	for i := 0; i < count; i++ {
		id := maker.Next()
		if list[id] {
			t.Errorf("duplicate id %s", id)
			return
		}
		list[id] = true
	}
	t.Logf("generated %d ids without collison", count)
}
