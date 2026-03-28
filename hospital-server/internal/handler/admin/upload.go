package admin

import (
	"fmt"
	"net/http"
	"path/filepath"
	"time"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/pkg/storage"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UploadHandler struct {
	storage *storage.Storage
}

func NewUploadHandler(storage *storage.Storage) *UploadHandler {
	return &UploadHandler{storage: storage}
}

func (h *UploadHandler) Upload(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "no file provided"))
		return
	}
	defer file.Close()

	ext := filepath.Ext(header.Filename)
	objectName := fmt.Sprintf("%s/%s%s", time.Now().Format("2006/01/02"), uuid.New().String(), ext)
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	if err := h.storage.Upload(c.Request.Context(), objectName, file, header.Size, contentType); err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "upload failed"))
		return
	}

	// Generate presigned URL for access
	url, err := h.storage.PresignedURL(c.Request.Context(), objectName, 7*24*time.Hour)
	if err != nil {
		url = objectName // fallback to object name
	}

	c.JSON(http.StatusOK, dto.OK(gin.H{
		"file_name":   header.Filename,
		"file_url":    objectName,
		"file_size":   header.Size,
		"file_type":   contentType,
		"preview_url": url,
	}))
}

func (h *UploadHandler) GetFile(c *gin.Context) {
	objectName := c.Param("id") // using object path as ID
	url, err := h.storage.PresignedURL(c.Request.Context(), objectName, time.Hour)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail(404, "file not found"))
		return
	}
	c.Redirect(http.StatusTemporaryRedirect, url)
}
