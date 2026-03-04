package services

type DetailedVersionInfo struct {
	Version   string `json:"version"`
	Commit    string `json:"commit"`
	BuildDate string `json:"buildDate"`
}

type VersionService struct {
	DetailedVersionInfo DetailedVersionInfo
}

func (s *VersionService) GetVersionInfo() DetailedVersionInfo {
	return s.DetailedVersionInfo
}
