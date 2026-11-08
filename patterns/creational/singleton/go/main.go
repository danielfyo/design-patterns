// Singleton pattern: application configuration loaded exactly once.
//
// Run with: go run ./patterns/creational/singleton/go
package main

import (
	"fmt"
	"sync"
	"sync/atomic"
)

// AppConfig is the Singleton: one shared, read-only configuration object.
// Go has no private constructors: in a real package the type (or its fields) would be
// unexported so other packages can only obtain it through GetConfig.
type AppConfig struct {
	settings map[string]string
}

var (
	instance  *AppConfig
	once      sync.Once
	loadCount atomic.Int32
)

// GetConfig is the global access point. sync.Once guarantees the initialization
// function runs exactly once, even when many goroutines call GetConfig at the same time.
func GetConfig() *AppConfig {
	once.Do(func() {
		loadCount.Add(1)
		// Simulated expensive I/O (reading files, environment variables, a vault...).
		fmt.Println("[config] loading configuration...")
		instance = &AppConfig{settings: map[string]string{
			"appName":        "Shop API",
			"environment":    "production",
			"maxConnections": "20",
			"timeoutSeconds": "30",
		}}
	})
	return instance
}

// Get returns a setting. The comma-ok form lets callers detect missing keys.
func (c *AppConfig) Get(key string) (string, bool) {
	v, ok := c.settings[key]
	return v, ok
}

// MustGet returns a setting or panics: fine for keys the program cannot run without.
func (c *AppConfig) MustGet(key string) string {
	v, ok := c.Get(key)
	if !ok {
		panic(fmt.Sprintf("unknown setting %q", key))
	}
	return v
}

// DatabaseModule is a client: a module that reads the shared configuration.
type DatabaseModule struct{ Config *AppConfig }

func NewDatabaseModule() *DatabaseModule { return &DatabaseModule{Config: GetConfig()} }

func (m *DatabaseModule) Start() {
	fmt.Printf("DatabaseModule: opening pool with maxConnections=%s (%s)\n",
		m.Config.MustGet("maxConnections"), m.Config.MustGet("environment"))
}

// ApiModule is another, unrelated client that reads the same configuration.
type ApiModule struct{ Config *AppConfig }

func NewApiModule() *ApiModule { return &ApiModule{Config: GetConfig()} }

func (m *ApiModule) Start() {
	fmt.Printf("ApiModule: serving %q with timeoutSeconds=%s\n",
		m.Config.MustGet("appName"), m.Config.MustGet("timeoutSeconds"))
}

func main() {
	fmt.Println("=== Singleton Pattern: Application configuration ===")
	fmt.Println("Booting modules...")

	// Neither module creates the configuration: both ask for the single shared instance.
	database := NewDatabaseModule()
	api := NewApiModule()
	database.Start()
	api.Start()

	fmt.Printf("same instance: %t\n", database.Config == api.Config)

	fmt.Println("Settings (read through the shared instance):")
	for _, key := range []string{"appName", "environment", "maxConnections", "timeoutSeconds"} {
		fmt.Printf("  %-16s = %s\n", key, GetConfig().MustGet(key))
	}

	// Thread safety: many goroutines race for the instance. Each one writes into its own
	// slot; we print only after all of them finish, so the output stays deterministic.
	const workers = 8
	seen := make([]*AppConfig, workers)
	var wg sync.WaitGroup
	for i := range workers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			seen[i] = GetConfig()
		}()
	}
	wg.Wait()

	distinct := map[*AppConfig]struct{}{}
	for _, c := range seen {
		distinct[c] = struct{}{}
	}
	fmt.Printf("%d concurrent workers asked for the config...\n", workers)
	fmt.Printf("  distinct instances: %d\n", len(distinct))
	fmt.Printf("  times loaded: %d\n", loadCount.Load())
}
