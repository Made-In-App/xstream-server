package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

type StreamRelay struct {
	xtreamBaseURL string
	xtreamUser    string
	xtreamPass    string
	logger        *logrus.Logger
	client        *http.Client
}

type activeStream struct {
	streamID string
	streamType string
	clients   int
	mu        sync.Mutex
}

var (
	activeStreams = make(map[string]*activeStream)
	streamsMu     sync.RWMutex
)

func main() {
	logger := logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})
	logger.SetLevel(logrus.InfoLevel)

	xtreamBaseURL := os.Getenv("XTREAM_BASE_URL")
	xtreamUser := os.Getenv("XTREAM_USERNAME")
	xtreamPass := os.Getenv("XTREAM_PASSWORD")
	port := os.Getenv("STREAM_RELAY_PORT")
	if port == "" {
		port = "8090"
	}

	if xtreamBaseURL == "" || xtreamUser == "" || xtreamPass == "" {
		logger.Fatal("Missing required environment variables: XTREAM_BASE_URL, XTREAM_USERNAME, XTREAM_PASSWORD")
	}

	relay := &StreamRelay{
		xtreamBaseURL: strings.TrimSuffix(xtreamBaseURL, "/"),
		xtreamUser:    xtreamUser,
		xtreamPass:    xtreamPass,
		logger:        logger,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Handle stream requests: /live/username/password/streamId.m3u8
	// or /movie/username/password/streamId.ts
	// or /series/username/password/streamId.mkv
	http.HandleFunc("/live/", relay.handleStream("live"))
	http.HandleFunc("/movie/", relay.handleStream("movie"))
	http.HandleFunc("/series/", relay.handleStream("series"))

	// Cleanup inactive streams periodically
	go relay.cleanupInactiveStreams()

	srv := &http.Server{
		Addr:              ":" + port,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	logger.WithFields(logrus.Fields{
		"port": port,
		"xtream_url": xtreamBaseURL,
	}).Info("stream relay starting")

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.WithError(err).Fatal("stream relay failed")
	}
}

func (r *StreamRelay) handleStream(streamType string) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		// Parse path: /type/username/password/streamId.ext
		path := strings.TrimPrefix(req.URL.Path, "/"+streamType+"/")
		parts := strings.Split(path, "/")
		
		if len(parts) < 3 {
			http.Error(w, "Invalid path format", http.StatusBadRequest)
			return
		}

		// Extract stream ID (last part, remove extension)
		streamID := parts[len(parts)-1]
		streamID = strings.TrimSuffix(streamID, filepath.Ext(streamID))

		// Track active stream
		streamKey := fmt.Sprintf("%s:%s", streamType, streamID)
		r.trackStream(streamKey, streamType, streamID)
		defer r.untrackStream(streamKey)

		// Build upstream URL using configured Xtream credentials
		var upstreamPath string
		switch streamType {
		case "live":
			upstreamPath = fmt.Sprintf("/live/%s/%s/%s", r.xtreamUser, r.xtreamPass, streamID)
		case "movie":
			upstreamPath = fmt.Sprintf("/movie/%s/%s/%s.ts", r.xtreamUser, r.xtreamPass, streamID)
		case "series":
			upstreamPath = fmt.Sprintf("/series/%s/%s/%s.mkv", r.xtreamUser, r.xtreamPass, streamID)
		}

		upstreamURL := r.xtreamBaseURL + upstreamPath

		// Add query parameters if present
		if req.URL.RawQuery != "" {
			upstreamURL += "?" + req.URL.RawQuery
		}

		r.logger.WithFields(logrus.Fields{
			"stream_type": streamType,
			"stream_id":   streamID,
			"upstream":    upstreamURL,
		}).Debug("proxying stream request")

		// Create request to upstream
		upstreamReq, err := http.NewRequestWithContext(req.Context(), req.Method, upstreamURL, nil)
		if err != nil {
			r.logger.WithError(err).Error("failed to create upstream request")
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Copy headers
		for key, values := range req.Header {
			if key != "Host" {
				for _, value := range values {
					upstreamReq.Header.Add(key, value)
				}
			}
		}

		// Make request to upstream
		resp, err := r.client.Do(upstreamReq)
		if err != nil {
			r.logger.WithError(err).Error("failed to connect to upstream")
			http.Error(w, "Failed to connect to upstream", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		// Copy response headers
		for key, values := range resp.Header {
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}
		w.WriteHeader(resp.StatusCode)

		// Stream response body
		_, err = io.Copy(w, resp.Body)
		if err != nil {
			r.logger.WithError(err).Warn("error streaming response")
		}
	}
}

func (r *StreamRelay) trackStream(key, streamType, streamID string) {
	streamsMu.Lock()
	defer streamsMu.Unlock()

	stream, exists := activeStreams[key]
	if !exists {
		stream = &activeStream{
			streamID:   streamID,
			streamType: streamType,
			clients:    0,
		}
		activeStreams[key] = stream
		r.logger.WithFields(logrus.Fields{
			"stream_key": key,
			"stream_type": streamType,
			"stream_id": streamID,
		}).Info("new stream session started")
	}

	stream.mu.Lock()
	stream.clients++
	clients := stream.clients
	stream.mu.Unlock()

	r.logger.WithFields(logrus.Fields{
		"stream_key": key,
		"clients":    clients,
	}).Debug("client connected to stream")
}

func (r *StreamRelay) untrackStream(key string) {
	streamsMu.Lock()
	defer streamsMu.Unlock()

	stream, exists := activeStreams[key]
	if !exists {
		return
	}

	stream.mu.Lock()
	stream.clients--
	clients := stream.clients
	stream.mu.Unlock()

	r.logger.WithFields(logrus.Fields{
		"stream_key": key,
		"clients":    clients,
	}).Debug("client disconnected from stream")

	if clients <= 0 {
		delete(activeStreams, key)
		r.logger.WithField("stream_key", key).Info("stream session ended (no clients)")
	}
}

func (r *StreamRelay) cleanupInactiveStreams() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		streamsMu.RLock()
		count := len(activeStreams)
		streamsMu.RUnlock()

		r.logger.WithField("active_streams", count).Debug("cleanup check")
	}
}
