package prompts

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

var reader = bufio.NewReader(os.Stdin)

func AskString(question string, required bool) (string, error) {
	return AskStringDefault(question, "", required)
}

func AskStringDefault(question, def string, required bool) (string, error) {
	prompt := question
	if def != "" {
		prompt = fmt.Sprintf("%s [%s]", question, def)
	}

	for {
		fmt.Printf("%s: ", prompt)
		value, err := reader.ReadString('\n')
		if err != nil {
			return "", err
		}
		value = strings.TrimSpace(value)
		if value == "" {
			if def != "" {
				return def, nil
			}
			if required {
				fmt.Println("This value is required.")
				continue
			}
		}
		return value, nil
	}
}

func AskPassword(question string) (string, error) {
	// PowerShell host does not easily support masking without heavy interop.
	// For now prompt normally but redact the value in logs.
	return AskString(fmt.Sprintf("%s (input hidden in logs)", question), true)
}

func Confirm(question string, defaultYes bool) (bool, error) {
	def := "[Y/n]"
	if !defaultYes {
		def = "[y/N]"
	}

	for {
		fmt.Printf("%s %s ", question, def)
		value, err := reader.ReadString('\n')
		if err != nil {
			return false, err
		}
		value = strings.TrimSpace(strings.ToLower(value))
		if value == "" {
			return defaultYes, nil
		}
		switch value {
		case "y", "yes":
			return true, nil
		case "n", "no":
			return false, nil
		default:
			fmt.Println("Please answer yes or no.")
		}
	}
}
