//go:build windows

package locks

import (
	"fmt"
	"net"
	"time"

	"github.com/Microsoft/go-winio"
)

const focusPipeName = `\\.\pipe\PinTheNote`

// tryAcquireInstance uses a named pipe as both the single-instance lock and the
// IPC channel. The first process to create the pipe becomes the running instance;
// subsequent ones connect to it (signaling it to show its window) and exit.
func TryAcquireInstance(_ string) (net.Listener, func(), error) {
	timeout := time.Second
	if conn, err := winio.DialPipe(focusPipeName, &timeout); err == nil {
		conn.Close()
		return nil, nil, ErrAlreadyRunning
	}

	ln, err := winio.ListenPipe(focusPipeName, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("create named pipe: %w", err)
	}

	return ln, func() {}, nil
}
