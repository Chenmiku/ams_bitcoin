package station

import (
	"fmt"
	"os"
)

type StorageConfig struct {
	Upload      string
	Update      string
	Record      string
	MaxFileSize int64
}

const (
	oneGB = 1 << 30
	tenGB = 10 << 30
)

func (c *StorageConfig) Check() {
	if c.Upload == "" {
		c.Upload = "data/upload"
	}
	if c.Update == "" {
		c.Update = "data/update"
	}
	if c.Record == "" {
		c.Record = "data/record"
	}
	// child folder
	if c.MaxFileSize < oneGB {
		c.MaxFileSize = oneGB
	} else if c.MaxFileSize > tenGB {
		c.MaxFileSize = tenGB
	}
	go func() {
		for _, folder := range []string{c.Upload, c.Update, c.Record} {
			if err := createFolder(folder); err != nil {
				logger.Errorf("create folder %s error %s", folder, err.Error())
				break
			}
		}
	}()
}

func createFolder(folder string) error {
	return os.MkdirAll(folder, 0775)
}

func (c StorageConfig) String() string {
	return fmt.Sprintf("storage:upload=%s;record=%s", c.Upload, c.Record)
}
