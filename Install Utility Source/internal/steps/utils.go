package steps

import (
	"archive/zip"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func ensureDir(path string) error {
	if path == "" {
		return errors.New("directory path is empty")
	}
	return os.MkdirAll(path, 0o755)
}

func abs(path string) (string, error) {
	if path == "" {
		return "", errors.New("path is empty")
	}
	if filepath.IsAbs(path) {
		return filepath.Clean(path), nil
	}
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	return filepath.Join(wd, path), nil
}

func downloadFile(url, dest string) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("download failed: %s", resp.Status)
	}

	if err := ensureDir(filepath.Dir(dest)); err != nil {
		return err
	}

	tmp := dest + ".tmp"
	f, err := os.Create(tmp)
	if err != nil {
		return err
	}
	defer f.Close()

	if _, err := io.Copy(f, resp.Body); err != nil {
		return err
	}

	if err := f.Close(); err != nil {
		return err
	}

	return os.Rename(tmp, dest)
}

func extractZip(zipPath, dest string) error {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer r.Close()

	if err := os.RemoveAll(dest); err != nil {
		return err
	}
	if err := ensureDir(dest); err != nil {
		return err
	}

	for _, f := range r.File {
		target := filepath.Join(dest, f.Name)
		if !strings.HasPrefix(target, dest) {
			return fmt.Errorf("zip entry escapes destination: %s", f.Name)
		}
		if f.FileInfo().IsDir() {
			if err := ensureDir(target); err != nil {
				return err
			}
			continue
		}
		if err := ensureDir(filepath.Dir(target)); err != nil {
			return err
		}
		rc, err := f.Open()
		if err != nil {
			return err
		}
		out, err := os.OpenFile(target, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, f.Mode())
		if err != nil {
			rc.Close()
			return err
		}
		if _, err := io.Copy(out, rc); err != nil {
			rc.Close()
			out.Close()
			return err
		}
		rc.Close()
		out.Close()
	}
	return nil
}

func copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.Mode()&os.ModeSymlink != 0 {
			// Skip symlinks; the deployment step recreates necessary junctions.
			return nil
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if info.IsDir() {
			return ensureDir(target)
		}
		return copyFile(path, target)
	})
}

func copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	if err := ensureDir(filepath.Dir(dst)); err != nil {
		return err
	}
	info, err := os.Stat(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, info.Mode())
}

func replaceFirst(s, old, new string) (string, bool) {
	idx := strings.Index(s, old)
	if idx == -1 {
		return s, false
	}
	return s[:idx] + new + s[idx+len(old):], true
}

func setIniValue(contents, key, value string) string {
	lines := strings.Split(contents, "\n")
	keyPrefix := key + " ="
	replaced := false
	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, keyPrefix) || strings.HasPrefix(trimmed, key+"=") {
			lines[i] = key + " = " + value
			replaced = true
		}
	}
	if !replaced {
		lines = append(lines, key+" = "+value)
	}
	return strings.Join(lines, "\n")
}

func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	rand.Seed(time.Now().UnixNano())
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}

func findMariaDBBinDir() (string, error) {
	candidates := []string{
		filepath.Join(os.Getenv("ProgramFiles"), "MariaDB"),
		filepath.Join(os.Getenv("ProgramFiles"), "MariaDB 11.8"),
		filepath.Join(os.Getenv("ProgramFiles(x86)"), "MariaDB"),
	}

	// Include versioned directories under Program Files
	programFiles := []string{os.Getenv("ProgramFiles"), os.Getenv("ProgramFiles(x86)")}
	for _, base := range programFiles {
		entries, err := os.ReadDir(base)
		if err == nil {
			for _, entry := range entries {
				if entry.IsDir() && strings.HasPrefix(strings.ToLower(entry.Name()), "mariadb") {
					candidates = append(candidates, filepath.Join(base, entry.Name()))
				}
			}
		}
	}

	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		bin := filepath.Join(candidate, "bin")
		if fileExists(filepath.Join(bin, "mysql.exe")) {
			return bin, nil
		}
	}
	return "", errors.New("could not locate MariaDB bin directory")
}

func findMariaDBConfig(binDir string) (string, error) {
	candidates := []string{
		filepath.Join(filepath.Dir(filepath.Dir(binDir)), "data", "my.ini"),
		filepath.Join(filepath.Dir(binDir), "data", "my.ini"),
		filepath.Join(filepath.Dir(binDir), "my.ini"),
		filepath.Join(filepath.Dir(binDir), "my-default.ini"),
	}
	for _, candidate := range candidates {
		if fileExists(candidate) {
			return candidate, nil
		}
	}
	return "", errors.New("could not locate MariaDB configuration file")
}

func escapeSingleQuotes(val string) string {
	return strings.ReplaceAll(val, "'", "''")
}

func escapeSQLString(val string) string {
	val = strings.ReplaceAll(val, `\`, `\\`)
	val = strings.ReplaceAll(val, "'", "\\'")
	return val
}
