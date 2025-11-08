package tasks

type ActionType string

const (
	ActionTypePowerShell ActionType = "powershell"
	ActionTypeInfo       ActionType = "info"
	ActionTypeFileWrite  ActionType = "file_write"
)

type Action struct {
	ID            string
	Title         string
	Description   string
	Type          ActionType
	PowerShell    string
	FilePath      string
	FileContents  string
	RequiresAdmin bool
}
