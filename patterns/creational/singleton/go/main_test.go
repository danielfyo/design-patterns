package main

import (
	"bytes"
	"io"
	"os"
	"sync"
	"testing"
)

// resetSingleton forgets the cached instance so the test starts as if the program had
// just started. It only works because the test lives in the same package.
func resetSingleton(t *testing.T) {
	t.Helper()
	reset := func() {
		instance = nil
		once = sync.Once{}
		loadCount.Store(0)
	}
	reset()
	t.Cleanup(reset)
}

func TestGetConfigAlwaysReturnsTheSameObject(t *testing.T) {
	resetSingleton(t)
	var first, second *AppConfig
	captureStdout(t, func() {
		first = GetConfig()
		second = GetConfig()
	})

	if first != second {
		t.Errorf("GetConfig() returned %p and %p, want the same pointer", first, second)
	}
}

func TestConfigurationIsLoadedExactlyOnce(t *testing.T) {
	resetSingleton(t)
	out := captureStdout(t, func() {
		for range 10 {
			GetConfig().MustGet("appName")
		}
	})

	if got := loadCount.Load(); got != 1 {
		t.Errorf("loadCount = %d, want 1", got)
	}
	if want := "[config] loading configuration...\n"; out != want {
		t.Errorf("output = %q, want %q", out, want)
	}
}

func TestConcurrentCallersAllReceiveTheSameInstance(t *testing.T) {
	resetSingleton(t)
	const workers = 16
	seen := make([]*AppConfig, workers)
	captureStdout(t, func() {
		var wg sync.WaitGroup
		for i := range workers {
			wg.Add(1)
			go func() {
				defer wg.Done()
				seen[i] = GetConfig()
			}()
		}
		wg.Wait()
	})

	for i, c := range seen {
		if c != seen[0] {
			t.Errorf("worker %d got %p, want %p", i, c, seen[0])
		}
	}
	if got := loadCount.Load(); got != 1 {
		t.Errorf("loadCount = %d, want 1", got)
	}
}

func TestGetReturnsTheKnownSettings(t *testing.T) {
	resetSingleton(t)
	var config *AppConfig
	captureStdout(t, func() { config = GetConfig() })

	tests := []struct{ key, want string }{
		{"appName", "Shop API"},
		{"environment", "production"},
		{"maxConnections", "20"},
		{"timeoutSeconds", "30"},
	}
	for _, tt := range tests {
		t.Run(tt.key, func(t *testing.T) {
			got, ok := config.Get(tt.key)
			if !ok || got != tt.want {
				t.Errorf("Get(%q) = %q, %t; want %q, true", tt.key, got, ok, tt.want)
			}
		})
	}
}

func TestGetReportsAnUnknownSetting(t *testing.T) {
	resetSingleton(t)
	var config *AppConfig
	captureStdout(t, func() { config = GetConfig() })

	if got, ok := config.Get("missing"); ok || got != "" {
		t.Errorf(`Get("missing") = %q, %t; want "", false`, got, ok)
	}
}

func TestMustGetPanicsOnAnUnknownSetting(t *testing.T) {
	resetSingleton(t)
	var config *AppConfig
	captureStdout(t, func() { config = GetConfig() })

	defer func() {
		if r := recover(); r != `unknown setting "missing"` {
			t.Errorf("recover() = %v, want the unknown setting panic", r)
		}
	}()
	config.MustGet("missing")
}

func TestUnrelatedModulesShareTheSameConfiguration(t *testing.T) {
	resetSingleton(t)
	var database *DatabaseModule
	var api *ApiModule
	captureStdout(t, func() {
		database = NewDatabaseModule()
		api = NewApiModule()
	})

	if database.Config != api.Config || database.Config != GetConfig() {
		t.Errorf("modules hold different configs: %p vs %p", database.Config, api.Config)
	}
}

func TestModulesStartWithValuesReadFromTheSharedInstance(t *testing.T) {
	resetSingleton(t)
	var database *DatabaseModule
	var api *ApiModule
	captureStdout(t, func() { // drop the one-time loading line
		database = NewDatabaseModule()
		api = NewApiModule()
	})

	got := captureStdout(t, func() {
		database.Start()
		api.Start()
	})

	want := "DatabaseModule: opening pool with maxConnections=20 (production)\n" +
		"ApiModule: serving \"Shop API\" with timeoutSeconds=30\n"
	if got != want {
		t.Errorf("output = %q, want %q", got, want)
	}
}

func TestDemoPrintsTheExpectedOutput(t *testing.T) {
	resetSingleton(t)
	want, err := os.ReadFile("../expected_output.txt")
	if err != nil {
		t.Fatal(err)
	}
	if got := captureStdout(t, main); got != string(want) {
		t.Errorf("output mismatch:\n--- got ---\n%s\n--- want ---\n%s", got, want)
	}
}

// captureStdout runs fn and returns everything it printed to os.Stdout.
func captureStdout(t *testing.T, fn func()) string {
	t.Helper()
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	original := os.Stdout
	os.Stdout = w
	defer func() { os.Stdout = original }()

	fn()
	_ = w.Close()

	var buf bytes.Buffer
	if _, err := io.Copy(&buf, r); err != nil {
		t.Fatal(err)
	}
	return buf.String()
}
