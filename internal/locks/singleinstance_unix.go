//go:build !windows

package locks

import (
	"fmt"
	"net"
	"os"
	"path/filepath"
	"syscall"
)

// TryAcquireInstance uses flock for single-instance detection and a Unix domain
// socket for IPC. Both are safe with CGo/GTK because no OS signals are involved.
func TryAcquireInstance(appDir string) (net.Listener, func(), error) {
	lockPath := filepath.Join(appDir, "app.lock")
	f, err := os.OpenFile(lockPath, os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return nil, nil, fmt.Errorf("open lock file: %w", err)
	}

	if err := syscall.Flock(int(f.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		f.Close()
		if err == syscall.EWOULDBLOCK {
			socketPath := filepath.Join(appDir, "focus.sock")
			if conn, dialErr := net.Dial("unix", socketPath); dialErr == nil {
				conn.Close()
			}
			return nil, nil, ErrAlreadyRunning
		}
		return nil, nil, fmt.Errorf("acquire lock: %w", err)
	}

	socketPath := filepath.Join(appDir, "focus.sock")
	os.Remove(socketPath) // clean up stale socket from a previous crash
	ln, err := net.Listen("unix", socketPath)
	if err != nil {
		syscall.Flock(int(f.Fd()), syscall.LOCK_UN) //nolint:errcheck
		f.Close()
		return nil, nil, fmt.Errorf("listen on socket: %w", err)
	}

	cleanup := func() {
		os.Remove(socketPath)
		syscall.Flock(int(f.Fd()), syscall.LOCK_UN) //nolint:errcheck
		f.Close()
	}
	return ln, cleanup, nil
}
