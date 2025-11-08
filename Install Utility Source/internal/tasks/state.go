package tasks

import (
	"strings"
	"sync"
)

type StepStatus string

const (
	StepStatusPending   StepStatus = "Pending"
	StepStatusRunning   StepStatus = "Running"
	StepStatusCompleted StepStatus = "Completed"
	StepStatusFailed    StepStatus = "Failed"
)

type State struct {
	mu          sync.RWMutex
	stepStatus  map[string]StepStatus
	stepLogs    map[string][]string
	SharedStore map[string]any
}

func NewState(stepIDs []string) *State {
	status := make(map[string]StepStatus)
	for _, id := range stepIDs {
		status[id] = StepStatusPending
	}

	return &State{
		stepStatus:  status,
		stepLogs:    make(map[string][]string),
		SharedStore: make(map[string]any),
	}
}

func (s *State) Status(stepID string) StepStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.stepStatus[stepID]
}

func (s *State) SetStatus(stepID string, status StepStatus) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.stepStatus[stepID] = status
}

func (s *State) AppendLog(stepID, line string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.stepLogs[stepID] = append(s.stepLogs[stepID], line)
}

func (s *State) Logs(stepID string) string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return strings.Join(s.stepLogs[stepID], "\n")
}
