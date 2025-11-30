/*
 * Iptv-Proxy is a project to proxyfie an m3u file and to proxyfie an Xtream iptv service (client API).
 * Copyright (C) 2020  Pierre-Emmanuel Jacquier
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

package server

import (
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jamesnetherton/m3u"
	xtreamapi "github.com/pierre-emmanuelJ/iptv-proxy/pkg/xtream-proxy"
	uuid "github.com/satori/go.uuid"
)

type cacheMeta struct {
	string
	time.Time
}

var hlsChannelsRedirectURL map[string]url.URL = map[string]url.URL{}
var hlsChannelsRedirectURLLock = sync.RWMutex{}

// Round-robin counter per selezione server
var xtreamServerCounter int64 = 0
var xtreamServerCounterLock = sync.Mutex{}

// XXX Use key/value storage e.g: etcd, redis...
// and remove that dirty globals
var xtreamM3uCache map[string]cacheMeta = map[string]cacheMeta{}
var xtreamM3uCacheLock = sync.RWMutex{}

// Cache per il backup.m3u parsato
var backupM3uCache *m3u.Playlist = nil
var backupM3uCacheTime time.Time
var backupM3uCacheLock = sync.RWMutex{}
const backupM3uCacheDuration = 1 * time.Hour // Cache per 1 ora

// Cache per mappare streamID -> direct_source per backup account
var backupStreamIDCache map[int]string = make(map[int]string)
var backupStreamIDCacheLock = sync.RWMutex{}
var backupStreamIDCacheTime time.Time

func (c *Config) cacheXtreamM3u(playlist *m3u.Playlist, cacheName string) error {
	xtreamM3uCacheLock.Lock()
	defer xtreamM3uCacheLock.Unlock()

	tmp := *c
	tmp.playlist = playlist

	path := filepath.Join(os.TempDir(), uuid.NewV4().String()+".iptv-proxy.m3u")
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	if err := tmp.marshallInto(f, true); err != nil {
		return err
	}
	xtreamM3uCache[cacheName] = cacheMeta{path, time.Now()}

	return nil
}

func (c *Config) xtreamGenerateM3u(ctx *gin.Context, extension string) (*m3u.Playlist, error) {
	client, err := xtreamapi.New(c.XtreamUser.String(), c.XtreamPassword.String(), c.XtreamBaseURL, ctx.Request.UserAgent())
	if err != nil {
		return nil, err
	}

	cat, err := client.GetLiveCategories()
	if err != nil {
		return nil, err
	}

	// this is specific to xtream API,
	// prefix with "live" if there is an extension.
	var prefix string
	if extension != "" {
		extension = "." + extension
		prefix = "live/"
	}

	var playlist = new(m3u.Playlist)
	playlist.Tracks = make([]m3u.Track, 0)

	for _, category := range cat {
		live, err := client.GetLiveStreams(fmt.Sprint(category.ID))
		if err != nil {
			return nil, err
		}

		for _, stream := range live {
			track := m3u.Track{Name: stream.Name, Length: -1, URI: "", Tags: nil}

			//TODO: Add more tag if needed.
			if stream.EPGChannelID != "" {
				track.Tags = append(track.Tags, m3u.Tag{Name: "tvg-id", Value: stream.EPGChannelID})
			}
			if stream.Name != "" {
				track.Tags = append(track.Tags, m3u.Tag{Name: "tvg-name", Value: stream.Name})
			}
			if stream.Icon != "" {
				track.Tags = append(track.Tags, m3u.Tag{Name: "tvg-logo", Value: stream.Icon})
			}
			if category.Name != "" {
				track.Tags = append(track.Tags, m3u.Tag{Name: "group-title", Value: category.Name})
			}

			track.URI = fmt.Sprintf("%s/%s%s/%s/%s%s", c.XtreamBaseURL, prefix, c.XtreamUser, c.XtreamPassword, fmt.Sprint(stream.ID), extension)
			playlist.Tracks = append(playlist.Tracks, track)
		}
	}

	return playlist, nil
}

func (c *Config) xtreamGetAuto(ctx *gin.Context) {
	newQuery := ctx.Request.URL.Query()
	q := c.RemoteURL.Query()
	for k, v := range q {
		if k == "username" || k == "password" {
			continue
		}

		newQuery.Add(k, strings.Join(v, ","))
	}
	ctx.Request.URL.RawQuery = newQuery.Encode()

	c.xtreamGet(ctx)
}

func (c *Config) xtreamGet(ctx *gin.Context) {
	// Se l'utente è "amici_backup", restituisci il backup.m3u invece di chiamare il server Xtream
	if username, exists := ctx.Get("authenticated_user"); exists {
		if usernameStr, ok := username.(string); ok && strings.HasSuffix(usernameStr, "_backup") {
			c.getBackupM3U(ctx)
			return
		}
	}

	rawURL := fmt.Sprintf("%s/get.php?username=%s&password=%s", c.XtreamBaseURL, c.XtreamUser, c.XtreamPassword)

	q := ctx.Request.URL.Query()

	for k, v := range q {
		if k == "username" || k == "password" {
			continue
		}

		rawURL = fmt.Sprintf("%s&%s=%s", rawURL, k, strings.Join(v, ","))
	}

	m3uURL, err := url.Parse(rawURL)
	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	xtreamM3uCacheLock.RLock()
	meta, ok := xtreamM3uCache[m3uURL.String()]
	d := time.Since(meta.Time)
	if !ok || d.Hours() >= float64(c.M3UCacheExpiration) {
		log.Printf("[iptv-proxy] %v | %s | xtream cache m3u file\n", time.Now().Format("2006/01/02 - 15:04:05"), ctx.ClientIP())
		xtreamM3uCacheLock.RUnlock()
		playlist, err := m3u.Parse(m3uURL.String())
		if err != nil {
			ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
			return
		}
		if err := c.cacheXtreamM3u(&playlist, m3uURL.String()); err != nil {
			ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
			return
		}
	} else {
		xtreamM3uCacheLock.RUnlock()
	}

	ctx.Header("Content-Disposition", fmt.Sprintf(`attachment; filename=%q`, c.M3UFileName))
	xtreamM3uCacheLock.RLock()
	path := xtreamM3uCache[m3uURL.String()].string
	xtreamM3uCacheLock.RUnlock()
	ctx.Header("Content-Type", "application/octet-stream")

	ctx.File(path)
}

func (c *Config) xtreamApiGet(ctx *gin.Context) {
	// Se l'utente è "amici_backup", restituisci il backup.m3u invece di chiamare il server Xtream
	if username, exists := ctx.Get("authenticated_user"); exists {
		if usernameStr, ok := username.(string); ok && strings.HasSuffix(usernameStr, "_backup") {
			c.getBackupM3U(ctx)
			return
		}
	}

	const (
		apiGet = "apiget"
	)

	var (
		extension = ctx.Query("output")
		cacheName = apiGet + extension
	)

	xtreamM3uCacheLock.RLock()
	meta, ok := xtreamM3uCache[cacheName]
	d := time.Since(meta.Time)
	if !ok || d.Hours() >= float64(c.M3UCacheExpiration) {
		log.Printf("[iptv-proxy] %v | %s | xtream cache API m3u file\n", time.Now().Format("2006/01/02 - 15:04:05"), ctx.ClientIP())
		xtreamM3uCacheLock.RUnlock()
		playlist, err := c.xtreamGenerateM3u(ctx, extension)
		if err != nil {
			ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
			return
		}
		if err := c.cacheXtreamM3u(playlist, cacheName); err != nil {
			ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
			return
		}
	} else {
		xtreamM3uCacheLock.RUnlock()
	}

	ctx.Header("Content-Disposition", fmt.Sprintf(`attachment; filename=%q`, c.M3UFileName))
	xtreamM3uCacheLock.RLock()
	path := xtreamM3uCache[cacheName].string
	xtreamM3uCacheLock.RUnlock()
	ctx.Header("Content-Type", "application/octet-stream")

	ctx.File(path)

}

func (c *Config) xtreamPlayerAPIGET(ctx *gin.Context) {
	c.xtreamPlayerAPI(ctx, ctx.Request.URL.Query())
}

func (c *Config) xtreamPlayerAPIPOST(ctx *gin.Context) {
	contents, err := ioutil.ReadAll(ctx.Request.Body)
	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	q, err := url.ParseQuery(string(contents))
	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	c.xtreamPlayerAPI(ctx, q)
}

func (c *Config) xtreamPlayerAPI(ctx *gin.Context, q url.Values) {
	var action string
	if len(q["action"]) > 0 {
		action = q["action"][0]
	}

	// Per amici_backup, converti il backup.m3u in formato Xtream API
	if username, exists := ctx.Get("authenticated_user"); exists {
		if usernameStr, ok := username.(string); ok && strings.HasSuffix(usernameStr, "_backup") {
			// Se non c'è azione, restituisci info account
			if action == "" {
				ctx.JSON(http.StatusOK, gin.H{
					"user_info": gin.H{
						"username": usernameStr,
						"password": c.ProxyConfig.Password.String(),
						"message":  "Welcome - Backup account",
						"auth":     1,
						"status":   "Active",
						"exp_date": "9999999999",
						"is_trial": "0",
						"active_cons": "0",
						"created_at": "0",
						"max_connections": "1",
						"allowed_output_formats": []string{"m3u8"},
					},
					"server_info": gin.H{
						"url":            c.HostConfig.Hostname,
						"port":           fmt.Sprintf("%d", c.AdvertisedPort),
						"https_port":     "",
						"server_protocol": "http",
						"rtmp_port":      "0",
						"timezone":       "Europe/Rome",
						"timestamp_now":  time.Now().Unix(),
						"time_now":        time.Now().Format("2006-01-02 15:04:05"),
						"process":        false,
					},
				})
				return
			}

			// Per le azioni, leggi il backup.m3u e restituisci i contenuti convertiti
			backupPlaylist, err := c.loadBackupM3U()
			if err != nil {
				log.Printf("[iptv-proxy] Error loading backup.m3u: %v", err)
				ctx.JSON(http.StatusOK, []interface{}{})
				return
			}

			switch action {
			case "get_live_categories", "get_vod_categories", "get_series_categories":
				categories, _ := c.extractCategoriesFromM3U(backupPlaylist)
				ctx.JSON(http.StatusOK, categories)
				return
			case "get_live_streams":
				categoryID := ""
				if len(q["category_id"]) > 0 {
					categoryID = q["category_id"][0]
				}
				streams := c.convertM3UToLiveStreams(backupPlaylist, categoryID, usernameStr)
				ctx.JSON(http.StatusOK, streams)
				return
			case "get_vod_streams":
				categoryID := ""
				if len(q["category_id"]) > 0 {
					categoryID = q["category_id"][0]
				}
				streams := c.convertM3UToVODStreams(backupPlaylist, categoryID, usernameStr)
				ctx.JSON(http.StatusOK, streams)
				return
			case "get_series":
				categoryID := ""
				if len(q["category_id"]) > 0 {
					categoryID = q["category_id"][0]
				}
				series := c.convertM3UToSeries(backupPlaylist, categoryID, usernameStr)
				ctx.JSON(http.StatusOK, series)
				return
			case "get_short_epg", "get_simple_data_table":
				ctx.JSON(http.StatusOK, gin.H{})
				return
			default:
				// Per altre azioni, restituisci risposta vuota
				ctx.JSON(http.StatusOK, gin.H{})
				return
			}
		}
	}

	client, err := xtreamapi.New(c.XtreamUser.String(), c.XtreamPassword.String(), c.XtreamBaseURL, ctx.Request.UserAgent())
	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	resp, httpcode, err := client.Action(c.ProxyConfig, action, q)
	if err != nil {
		ctx.AbortWithError(httpcode, err) // nolint: errcheck
		return
	}

	log.Printf("[iptv-proxy] %v | %s |Action\t%s\n", time.Now().Format("2006/01/02 - 15:04:05"), ctx.ClientIP(), action)

	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	ctx.JSON(http.StatusOK, resp)
}

func (c *Config) xtreamXMLTV(ctx *gin.Context) {
	client, err := xtreamapi.New(c.XtreamUser.String(), c.XtreamPassword.String(), c.XtreamBaseURL, ctx.Request.UserAgent())
	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	resp, err := client.GetXMLTV()
	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	ctx.Data(http.StatusOK, "application/xml", resp)
}

// selectXtreamServer seleziona un server Xtream disponibile dalla lista usando round-robin
func (c *Config) selectXtreamServer() string {
	if len(c.XtreamBaseURLs) == 0 {
		return c.XtreamBaseURL
	}
	
	xtreamServerCounterLock.Lock()
	serverIndex := int(xtreamServerCounter % int64(len(c.XtreamBaseURLs)))
	xtreamServerCounter++
	xtreamServerCounterLock.Unlock()
	
	return c.XtreamBaseURLs[serverIndex]
}

// hasCredentialsInURL controlla se l'URL contiene già username/password nel path
func hasCredentialsInURL(baseURL string) bool {
	parsed, err := url.Parse(baseURL)
	if err != nil {
		return false
	}
	// Se il path ha più di 2 segmenti (es: /username/password), contiene credenziali
	parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	return len(parts) >= 2
}

func (c *Config) xtreamStreamHandler(ctx *gin.Context) {
	id := ctx.Param("id")
	baseURL := c.selectXtreamServer()
	
	// Se l'URL base contiene già username/password (per redirect mode con account multipli)
	// usa direttamente quell'URL, altrimenti costruiscilo
	var rpURL *url.URL
	var err error
	if hasCredentialsInURL(baseURL) {
		// URL base contiene già credenziali
		rpURL, err = url.Parse(fmt.Sprintf("%s/%s", baseURL, id))
	} else {
		// Costruisci URL con credenziali
		rpURL, err = url.Parse(fmt.Sprintf("%s/%s/%s/%s", baseURL, c.XtreamUser, c.XtreamPassword, id))
	}
	
	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	if c.RedirectMode {
		ctx.Redirect(http.StatusFound, rpURL.String())
		return
	}

	c.xtreamStream(ctx, rpURL)
}

// Handler per route backup che restituiscono errore (streaming non disponibile per account backup)
func (c *Config) xtreamStreamHandlerBackup(ctx *gin.Context) {
	id := ctx.Param("id")
	streamID, err := strconv.Atoi(id)
	if err != nil {
		ctx.AbortWithError(http.StatusBadRequest, err) // nolint: errcheck
		return
	}

	// Carica il backup.m3u e trova lo stream corrispondente
	backupPlaylist, err := c.loadBackupM3U()
	if err != nil {
		log.Printf("[iptv-proxy] Error loading backup.m3u: %v", err)
		ctx.AbortWithStatus(http.StatusInternalServerError)
		return
	}

	// Usa la cache per trovare il direct_source
	backupStreamIDCacheLock.RLock()
	directSource, exists := backupStreamIDCache[streamID]
	cacheTime := backupStreamIDCacheTime
	backupStreamIDCacheLock.RUnlock()

	// Se la cache non esiste o è scaduta, ricostruiscila
	if !exists || time.Since(cacheTime) >= backupM3uCacheDuration {
		// Converti in live streams per costruire la cache
		streams := c.convertM3UToLiveStreams(backupPlaylist, "", "amici_backup")
		
		// Aggiorna la cache
		backupStreamIDCacheLock.Lock()
		backupStreamIDCache = make(map[int]string)
		for i, stream := range streams {
			if ds, ok := stream["direct_source"].(string); ok && ds != "" {
				backupStreamIDCache[i+1] = ds // streamID inizia da 1
			}
		}
		backupStreamIDCacheTime = time.Now()
		backupStreamIDCacheLock.Unlock()
		
		// Riprova a leggere dalla cache
		backupStreamIDCacheLock.RLock()
		directSource, exists = backupStreamIDCache[streamID]
		backupStreamIDCacheLock.RUnlock()
	}

	if !exists || directSource == "" {
		ctx.AbortWithStatus(http.StatusNotFound)
		return
	}

	// Fai redirect diretto all'URL originale (come REDIRECT_MODE per account normale)
	rpURL, err := url.Parse(directSource)
	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	// Redirect diretto all'URL originale, senza passare dal proxy
	ctx.Redirect(http.StatusFound, rpURL.String())
}

func (c *Config) xtreamStreamLiveBackup(ctx *gin.Context) {
	c.xtreamStreamHandlerBackup(ctx)
}

func (c *Config) xtreamStreamTimeshiftBackup(ctx *gin.Context) {
	c.xtreamStreamHandlerBackup(ctx)
}

func (c *Config) xtreamStreamMovieBackup(ctx *gin.Context) {
	c.xtreamStreamHandlerBackup(ctx)
}

func (c *Config) xtreamStreamSeriesBackup(ctx *gin.Context) {
	c.xtreamStreamHandlerBackup(ctx)
}

func (c *Config) xtreamHlsrStreamBackup(ctx *gin.Context) {
	c.xtreamStreamHandlerBackup(ctx)
}

// loadBackupM3U carica e parsa il file backup.m3u con cache
func (c *Config) loadBackupM3U() (*m3u.Playlist, error) {
	backupPath := "/root/iptv/backup.m3u"
	
	// Controlla la cache
	backupM3uCacheLock.RLock()
	if backupM3uCache != nil && time.Since(backupM3uCacheTime) < backupM3uCacheDuration {
		// Verifica che il file non sia stato modificato
		fileInfo, err := os.Stat(backupPath)
		if err == nil {
			// Se il file è stato modificato dopo la cache, ricarica
			if fileInfo.ModTime().After(backupM3uCacheTime) {
				backupM3uCacheLock.RUnlock()
				// Ricarica il file
			} else {
				// Usa la cache
				playlist := *backupM3uCache
				backupM3uCacheLock.RUnlock()
				return &playlist, nil
			}
		} else {
			backupM3uCacheLock.RUnlock()
		}
	} else {
		backupM3uCacheLock.RUnlock()
	}
	
	// Parsa il file
	backupM3uCacheLock.Lock()
	defer backupM3uCacheLock.Unlock()
	
	// Double-check dopo aver acquisito il lock
	if backupM3uCache != nil && time.Since(backupM3uCacheTime) < backupM3uCacheDuration {
		playlist := *backupM3uCache
		return &playlist, nil
	}
	
	log.Printf("[iptv-proxy] Loading backup.m3u file...")
	playlist, err := m3u.Parse(backupPath)
	if err != nil {
		return nil, err
	}
	
	// Aggiorna la cache
	backupM3uCache = &playlist
	backupM3uCacheTime = time.Now()
	log.Printf("[iptv-proxy] Backup.m3u loaded and cached (%d tracks)", len(playlist.Tracks))
	
	return &playlist, nil
}

// extractCategoriesFromM3U estrae le categorie uniche dal file M3U basandosi su group-title
// Restituisce sia la lista delle categorie che una mappa category_id -> category_name per lookup veloce
func (c *Config) extractCategoriesFromM3U(playlist *m3u.Playlist) ([]gin.H, map[string]string) {
	categoryMap := make(map[string]bool)
	categoryIDMap := make(map[string]string) // category_id -> category_name
	categories := []gin.H{}

	for _, track := range playlist.Tracks {
		groupTitle := ""
		for _, tag := range track.Tags {
			if tag.Name == "group-title" {
				groupTitle = tag.Value
				break
			}
		}
		if groupTitle != "" && !categoryMap[groupTitle] {
			categoryMap[groupTitle] = true
			categoryID := fmt.Sprintf("%d", len(categories)+1)
			categoryIDMap[categoryID] = groupTitle
			categories = append(categories, gin.H{
				"category_id":   categoryID,
				"category_name": groupTitle,
				"parent_id":     0,
			})
		}
	}

	return categories, categoryIDMap
}

// convertM3UToLiveStreams converte i tracks M3U in formato Xtream API per live streams
func (c *Config) convertM3UToLiveStreams(playlist *m3u.Playlist, categoryID string, username string) []gin.H {
	streams := []gin.H{}
	streamID := 1

	// Se non c'è categoryID, limita i risultati per evitare risposte troppo grandi
	const maxStreamsWithoutCategory = 1000
	streamCount := 0

	// Carica le categorie una sola volta e crea mappa per lookup veloce
	var targetCategory string
	if categoryID != "" {
		_, categoryIDMap := c.extractCategoriesFromM3U(playlist)
		if catName, exists := categoryIDMap[categoryID]; exists {
			targetCategory = catName
		}
	}

	for _, track := range playlist.Tracks {
		// Estrai group-title per filtrare per categoria
		groupTitle := ""
		for _, tag := range track.Tags {
			if tag.Name == "group-title" {
				groupTitle = tag.Value
				break
			}
		}

		// Se categoryID è specificato, filtra per quella categoria
		if categoryID != "" && groupTitle != targetCategory {
			continue
		}

		// Filtra solo live streams (escludi serie/film VOD)
		// 1. Escludi URL che contengono /movie/ o /series/ (sono VOD, non live)
		trackURILower := strings.ToLower(track.URI)
		if strings.Contains(trackURILower, "/movie/") || strings.Contains(trackURILower, "/series/") {
			// Salta film/serie VOD - verranno gestiti da get_series/get_vod_streams
			continue
		}
		
		// 2. Escludi serie/film che hanno pattern specifici nel nome (es. "S01 E01")
		trackNameLower := strings.ToLower(track.Name)
		if strings.Contains(trackNameLower, " s0") || strings.Contains(trackNameLower, " e0") || 
		   strings.Contains(trackNameLower, " season") || strings.Contains(trackNameLower, " episode") ||
		   (strings.Contains(trackNameLower, " s") && strings.Contains(trackNameLower, " e")) {
			// Salta serie/film - verranno gestiti da get_series/get_vod_streams
			continue
		}
		
		// 3. Escludi categorie VOD specifiche (ma mantieni canali live come "Sky Cinema", "Rai Movie")
		// Le categorie VOD hanno pattern "◈ Film" seguito da altro testo
		if strings.HasPrefix(groupTitle, "◈ Film") || 
		   (strings.Contains(groupTitle, "◈") && (strings.Contains(groupTitle, "Film Netflix") || 
		    strings.Contains(groupTitle, "Film Amazon") || strings.Contains(groupTitle, "Film Thriller") ||
		    strings.Contains(groupTitle, "Film Romantici") || strings.Contains(groupTitle, "Film Azione"))) {
			// Salta categorie VOD specifiche
			continue
		}

		// Estrai altri tag
		tvgID := ""
		tvgName := track.Name
		tvgLogo := ""
		for _, tag := range track.Tags {
			switch tag.Name {
			case "tvg-id":
				tvgID = tag.Value
			case "tvg-name":
				tvgName = tag.Value
			case "tvg-logo":
				tvgLogo = tag.Value
			}
		}

		// Costruisci URL proxy per lo streaming (usato nel campo direct_source)
		stream := gin.H{
			"num":            streamID,
			"name":           tvgName,
			"stream_type":    "live",
			"stream_id":      streamID,
			"stream_icon":    tvgLogo,
			"epg_channel_id": tvgID,
			"added":          "0",
			"category_id":   categoryID,
			"category_name": groupTitle,
			"container_extension": "m3u8",
			"custom_sid":     "",
			"direct_source":  track.URI,
			"tv_archive":     0,
			"tv_archive_duration": 0,
			"stream_url": fmt.Sprintf("http://%s:%d/live/%s/%s/%d", 
				c.HostConfig.Hostname, 
				c.AdvertisedPort, 
				username, 
				c.ProxyConfig.Password.String(), 
				streamID),
		}

		streams = append(streams, stream)
		streamID++
		streamCount++

		// Limita i risultati se non c'è categoryID
		if categoryID == "" && streamCount >= maxStreamsWithoutCategory {
			break
		}
	}

	return streams
}

// convertM3UToVODStreams converte i tracks M3U in formato Xtream API per VOD streams
func (c *Config) convertM3UToVODStreams(playlist *m3u.Playlist, categoryID string, username string) []gin.H {
	// Per ora restituiamo array vuoto, VOD richiede logica diversa
	return []gin.H{}
}

// convertM3UToSeries converte i tracks M3U in formato Xtream API per series
func (c *Config) convertM3UToSeries(playlist *m3u.Playlist, categoryID string, username string) []gin.H {
	// Per ora restituiamo array vuoto, series richiede logica diversa
	return []gin.H{}
}

func (c *Config) xtreamStreamLive(ctx *gin.Context) {
	id := ctx.Param("id")
	baseURL := c.selectXtreamServer()
	
	var rpURL *url.URL
	var err error
	if hasCredentialsInURL(baseURL) {
		// URL base contiene già credenziali
		rpURL, err = url.Parse(fmt.Sprintf("%s/live/%s", baseURL, id))
	} else {
		// Costruisci URL con credenziali
		rpURL, err = url.Parse(fmt.Sprintf("%s/live/%s/%s/%s", baseURL, c.XtreamUser, c.XtreamPassword, id))
	}
	
	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	if c.RedirectMode {
		ctx.Redirect(http.StatusFound, rpURL.String())
		return
	}

	c.xtreamStream(ctx, rpURL)
}

func (c *Config) xtreamStreamPlay(ctx *gin.Context) {
	token := ctx.Param("token")
	t := ctx.Param("type")
	rpURL, err := url.Parse(fmt.Sprintf("%s/play/%s/%s", c.XtreamBaseURL, token, t))
	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	c.xtreamStream(ctx, rpURL)
}

func (c *Config) xtreamStreamTimeshift(ctx *gin.Context) {
	baseURL := c.selectXtreamServer()
	duration := ctx.Param("duration")
	start := ctx.Param("start")
	id := ctx.Param("id")
	
	var rpURL *url.URL
	var err error
	if hasCredentialsInURL(baseURL) {
		// URL base contiene già credenziali
		rpURL, err = url.Parse(fmt.Sprintf("%s/timeshift/%s/%s/%s", baseURL, duration, start, id))
	} else {
		// Costruisci URL con credenziali
		rpURL, err = url.Parse(fmt.Sprintf("%s/timeshift/%s/%s/%s/%s/%s", baseURL, c.XtreamUser, c.XtreamPassword, duration, start, id))
	}
	
	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	if c.RedirectMode {
		ctx.Redirect(http.StatusFound, rpURL.String())
		return
	}

	c.stream(ctx, rpURL)
}

func (c *Config) xtreamStreamMovie(ctx *gin.Context) {
	id := ctx.Param("id")
	baseURL := c.selectXtreamServer()
	
	var rpURL *url.URL
	var err error
	if hasCredentialsInURL(baseURL) {
		// URL base contiene già credenziali
		rpURL, err = url.Parse(fmt.Sprintf("%s/movie/%s", baseURL, id))
	} else {
		// Costruisci URL con credenziali
		rpURL, err = url.Parse(fmt.Sprintf("%s/movie/%s/%s/%s", baseURL, c.XtreamUser, c.XtreamPassword, id))
	}
	
	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	if c.RedirectMode {
		ctx.Redirect(http.StatusFound, rpURL.String())
		return
	}

	c.xtreamStream(ctx, rpURL)
}

func (c *Config) xtreamStreamSeries(ctx *gin.Context) {
	id := ctx.Param("id")
	baseURL := c.selectXtreamServer()
	
	var rpURL *url.URL
	var err error
	if hasCredentialsInURL(baseURL) {
		// URL base contiene già credenziali
		rpURL, err = url.Parse(fmt.Sprintf("%s/series/%s", baseURL, id))
	} else {
		// Costruisci URL con credenziali
		rpURL, err = url.Parse(fmt.Sprintf("%s/series/%s/%s/%s", baseURL, c.XtreamUser, c.XtreamPassword, id))
	}
	
	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	if c.RedirectMode {
		ctx.Redirect(http.StatusFound, rpURL.String())
		return
	}

	c.xtreamStream(ctx, rpURL)
}

func (c *Config) xtreamHlsStream(ctx *gin.Context) {
	chunk := ctx.Param("chunk")
	s := strings.Split(chunk, "_")
	if len(s) != 2 {
		ctx.AbortWithError( // nolint: errcheck
			http.StatusInternalServerError,
			errors.New("HSL malformed chunk"),
		)
		return
	}
	channel := s[0]

	url, err := getHlsRedirectURL(channel)
	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	req, err := url.Parse(
		fmt.Sprintf(
			"%s://%s/hls/%s/%s",
			url.Scheme,
			url.Host,
			ctx.Param("token"),
			ctx.Param("chunk"),
		),
	)

	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	c.xtreamStream(ctx, req)
}

func (c *Config) xtreamHlsrStream(ctx *gin.Context) {
	channel := ctx.Param("channel")

	url, err := getHlsRedirectURL(channel)
	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	req, err := url.Parse(
		fmt.Sprintf(
			"%s://%s/hlsr/%s/%s/%s/%s/%s/%s",
			url.Scheme,
			url.Host,
			ctx.Param("token"),
			c.XtreamUser,
			c.XtreamPassword,
			ctx.Param("channel"),
			ctx.Param("hash"),
			ctx.Param("chunk"),
		),
	)

	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	c.xtreamStream(ctx, req)
}

func getHlsRedirectURL(channel string) (*url.URL, error) {
	hlsChannelsRedirectURLLock.RLock()
	defer hlsChannelsRedirectURLLock.RUnlock()

	url, ok := hlsChannelsRedirectURL[channel+".m3u8"]
	if !ok {
		return nil, errors.New("HSL redirect url not found")
	}

	return &url, nil
}

func (c *Config) hlsXtreamStream(ctx *gin.Context, oriURL *url.URL) {
	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	req, err := http.NewRequest("GET", oriURL.String(), nil)
	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}

	mergeHttpHeader(req.Header, ctx.Request.Header)

	resp, err := client.Do(req)
	if err != nil {
		ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusFound {
		location, err := resp.Location()
		if err != nil {
			ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
			return
		}
		id := ctx.Param("id")
		if strings.Contains(location.String(), id) {
			hlsChannelsRedirectURLLock.Lock()
			hlsChannelsRedirectURL[id] = *location
			hlsChannelsRedirectURLLock.Unlock()

			hlsReq, err := http.NewRequest("GET", location.String(), nil)
			if err != nil {
				ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
				return
			}

			mergeHttpHeader(hlsReq.Header, ctx.Request.Header)

			hlsResp, err := client.Do(hlsReq)
			if err != nil {
				ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
				return
			}
			defer hlsResp.Body.Close()

			b, err := ioutil.ReadAll(hlsResp.Body)
			if err != nil {
				ctx.AbortWithError(http.StatusInternalServerError, err) // nolint: errcheck
				return
			}
			body := string(b)
			body = strings.ReplaceAll(body, "/"+c.XtreamUser.String()+"/"+c.XtreamPassword.String()+"/", "/"+c.User.String()+"/"+c.Password.String()+"/")

			mergeHttpHeader(ctx.Writer.Header(), hlsResp.Header)

			ctx.Data(http.StatusOK, hlsResp.Header.Get("Content-Type"), []byte(body))
			return
		}
		ctx.AbortWithError(http.StatusInternalServerError, errors.New("Unable to HLS stream")) // nolint: errcheck
		return
	}

	ctx.Status(resp.StatusCode)
}
