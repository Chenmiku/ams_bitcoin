package station

import (
	"fmt"
	"os"
	"path/filepath"
)

type StaticConfig struct {
	ProjectFolder string
	AdminFolder   string
	AppUpdate     string
	PlayerFolder  string
	PlayerUpdate  string
	SellerFolder  string
}

func (u *StaticConfig) Check() {
	var err error
	if u.ProjectFolder == "" {
		u.ProjectFolder, err = os.Getwd()
		if err != nil {
			logger.Fatalf("get cwd failed %s", err)
		}
	}

	if u.AdminFolder == "" {
		u.AdminFolder = u.GetSubFolder("admin")
	}

	if u.PlayerFolder == "" {
		u.PlayerFolder = u.GetSubFolder("player")
	}

	if u.SellerFolder == "" {
		u.SellerFolder = u.GetSubFolder("seller")
	}

}

func (u StaticConfig) String() string {
	return fmt.Sprintf("static:folder=%s", u.ProjectFolder)
}

func (u *StaticConfig) GetSubFolder(folder string) string {
	return filepath.Join(u.ProjectFolder, folder)
}
