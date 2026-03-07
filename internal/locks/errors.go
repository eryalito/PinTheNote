package locks

import "errors"

var ErrAlreadyRunning = errors.New("another instance of PinTheNote is already running")
